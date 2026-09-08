import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VobizService } from './vobiz.service';

export interface DialSingleLeadDto {
  agentId: string;
  phone: string;
  recipientName?: string;
  leadId?: string;
  customPrompt?: string;
  fromNumber?: string;
  host: string;
}

export interface CreateCampaignDto {
  agentId: string;
  name: string;
  fromNumber?: string;
  customPrompt?: string;
  scheduledAt?: string;
  leads: {
    phone: string;
    name?: string;
    leadId?: string;
    customData?: Record<string, any>;
  }[];
  host: string;
}

@Injectable()
export class OutboundService {
  private readonly logger = new Logger(OutboundService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly vobizService: VobizService,
  ) {}

  /**
   * Dials a single lead or phone number immediately.
   */
  async dialSingleLead(workspaceId: string, { agentId, phone, recipientName, leadId, customPrompt, fromNumber, host }: DialSingleLeadDto) {
    if (!phone) throw new BadRequestException('Recipient phone number is required');
    const agent = await this.prisma.agent.findFirst({ where: { id: agentId, workspaceId } });
    if (!agent) throw new NotFoundException('Voice agent not found');

    let callerId = fromNumber;
    if (!callerId) {
      const pRec = await this.prisma.phoneNumber.findFirst({ where: { workspaceId, agentId, status: 'connected' } });
      if (!(callerId = pRec?.e164 || process.env.VOBIZ_DEFAULT_CALLER_ID)) throw new BadRequestException('No caller ID available.');
    }

    let resolvedLeadName = recipientName;
    if (leadId && !resolvedLeadName) {
      const lead = await this.prisma.lead.findFirst({ where: { id: leadId, workspaceId } });
      if (lead?.name) resolvedLeadName = lead.name;
    }

    this.logger.log(`Dialing single outbound call: Workspace=${workspaceId}, Agent=${agent.name}, To=${phone}, LeadName=${resolvedLeadName || 'Unknown'}`);
    const result = await this.vobizService.initiateOutboundCall({ agentId, workspaceId, to: phone, from: callerId, host, direction: 'outbound', leadId, leadName: resolvedLeadName, customPrompt });
    const finalCallSid = result.call_sid || result.id || result.request_uuid || result.api_id || result.CallSid;
    return { success: true, callSid: finalCallSid, to: phone, from: callerId, recipientName: resolvedLeadName, status: 'initiated' };
  }

  /**
   * Creates a new outbound calling campaign and starts processing its queue.
   */
  async createCampaign(workspaceId: string, { agentId, name, fromNumber, customPrompt, scheduledAt, leads, host }: CreateCampaignDto) {
    if (!name || !agentId || !leads?.length) throw new BadRequestException('Agent ID, campaign name, and at least one lead are required');
    if (!(await this.prisma.agent.findFirst({ where: { id: agentId, workspaceId } }))) throw new NotFoundException('Voice agent not found');

    let callerId = fromNumber;
    if (!callerId) {
      const phoneRecord = await this.prisma.phoneNumber.findFirst({ where: { workspaceId, agentId, status: 'connected' } });
      callerId = phoneRecord?.e164 || process.env.VOBIZ_DEFAULT_CALLER_ID || '+18005550199';
    }

    const scheduledDate = scheduledAt ? new Date(scheduledAt) : null;
    const isImmediate = !scheduledDate || scheduledDate.getTime() <= Date.now() + 60000;

    const campaign = await this.prisma.outboundCampaign.create({
      data: {
        workspaceId, agentId, name, fromNumber: callerId, customPrompt, status: isImmediate ? 'running' : 'draft', totalLeads: leads.length, scheduledAt: scheduledDate,
        queueItems: { create: leads.map(l => ({ phone: l.phone, recipientName: l.name || null, leadId: l.leadId || null, customData: l.customData || {}, status: 'pending' })) }
      },
      include: { queueItems: true },
    });

    this.logger.log(`Created outbound campaign "${campaign.name}" with ${campaign.queueItems.length} leads.`);
    if (isImmediate) this.processCampaignQueue(campaign.id, host).catch(e => this.logger.error(`Error executing campaign queue for ${campaign.id}:`, e));
    return campaign;
  }

  /**
   * Returns list of campaigns for a workspace.
   */
  async getCampaigns(workspaceId: string) {
    return this.prisma.outboundCampaign.findMany({ where: { workspaceId }, include: { agent: { select: { id: true, name: true, voiceName: true } }, _count: { select: { queueItems: true, calls: true } } }, orderBy: { createdAt: 'desc' } });
  }

  async getCampaignDetails(workspaceId: string, campaignId: string) {
    const campaign = await this.prisma.outboundCampaign.findFirst({ where: { id: campaignId, workspaceId }, include: { agent: { select: { id: true, name: true, voiceName: true, goal: true } }, queueItems: { include: { lead: { select: { id: true, name: true, email: true, score: true, status: true } } }, orderBy: { createdAt: 'asc' }, take: 50 }, calls: { orderBy: { createdAt: 'desc' }, take: 50 } } });
    if (!campaign) throw new NotFoundException('Campaign not found');
    return campaign;
  }

  /**
   * Pauses an active campaign.
   */
  async pauseCampaign(workspaceId: string, campaignId: string) {
    if (!(await this.prisma.outboundCampaign.findFirst({ where: { id: campaignId, workspaceId } }))) throw new NotFoundException('Campaign not found');
    return this.prisma.outboundCampaign.update({ where: { id: campaignId }, data: { status: 'paused' } });
  }

  async resumeCampaign(workspaceId: string, campaignId: string, host: string) {
    if (!(await this.prisma.outboundCampaign.findFirst({ where: { id: campaignId, workspaceId } }))) throw new NotFoundException('Campaign not found');
    const updated = await this.prisma.outboundCampaign.update({ where: { id: campaignId }, data: { status: 'running' } });
    this.processCampaignQueue(campaignId, host).catch(e => this.logger.error(`Error resuming campaign ${campaignId}:`, e));
    return updated;
  }

  async cancelCampaign(workspaceId: string, campaignId: string) {
    if (!(await this.prisma.outboundCampaign.findFirst({ where: { id: campaignId, workspaceId } }))) throw new NotFoundException('Campaign not found');
    return this.prisma.outboundCampaign.update({ where: { id: campaignId }, data: { status: 'cancelled' } });
  }

  /**
   * Processes queue items for a campaign with concurrency control.
   */
  async processCampaignQueue(campaignId: string, host: string) {
    try {
      while (true) {
        const campaign = await this.prisma.outboundCampaign.findUnique({
          where: { id: campaignId },
        });

        if (!campaign || campaign.status !== 'running') {
          this.logger.log(`Campaign ${campaignId} is no longer running (status: ${campaign?.status}). Stopping runner.`);
          break;
        }

        const inProgressCount = await this.prisma.outboundQueueItem.count({
          where: { campaignId, status: 'calling' },
        });

        const availableSlots = Math.max(0, 2 - inProgressCount);
        let pendingItems: any[] = [];

        if (availableSlots > 0) {
          pendingItems = await this.prisma.outboundQueueItem.findMany({
            where: { campaignId, status: 'pending' },
            take: availableSlots,
          });
        }

        if (pendingItems.length === 0) {
          break; // Stop running; updateQueueItemOnCallEnd will handle campaign completion
        }

        // Process batch concurrently
        await Promise.all(
          pendingItems.map(async (item) => {
            try {
              // Mark item as calling with atomic claim
              const claimResult = await this.prisma.outboundQueueItem.updateMany({
                where: { id: item.id, status: 'pending' },
                data: {
                  status: 'calling',
                  attempts: item.attempts + 1,
                  lastAttemptAt: new Date(),
                },
              });

              if (claimResult.count !== 1) {
                return;
              }

              // Dial via Vobiz
              const callResult = await this.vobizService.initiateOutboundCall({
                agentId: campaign.agentId,
                workspaceId: campaign.workspaceId,
                to: item.phone,
                from: campaign.fromNumber,
                host,
                direction: 'outbound',
                leadId: item.leadId || undefined,
                leadName: item.recipientName || undefined,
                campaignId: campaign.id,
                customPrompt: campaign.customPrompt || undefined,
              });

              const callSid = callResult.call_sid || callResult.id || callResult.request_uuid || callResult.api_id || callResult.CallSid;
              if (callSid) {
                await this.prisma.outboundQueueItem.update({
                  where: { id: item.id },
                  data: { callSid },
                });
              }
            } catch (err: any) {
              this.logger.error(`Failed to dial item ${item.id} (${item.phone}): ${err.message}`);
              const res = await this.prisma.outboundQueueItem.updateMany({
                where: { id: item.id, status: { in: ['pending', 'calling'] } },
                data: { status: 'failed' },
              });
              if (res.count === 1) {
                await this.prisma.outboundCampaign.update({
                  where: { id: campaignId },
                  data: { completedLeads: { increment: 1 } },
                });

                const remaining = await this.prisma.outboundQueueItem.count({
                  where: { campaignId, status: { in: ['pending', 'calling'] } },
                });
                if (remaining === 0) {
                  this.logger.log(`All queue items terminal for campaign ${campaignId}. Marking completed.`);
                  await this.prisma.outboundCampaign.update({
                    where: { id: campaignId },
                    data: { status: 'completed' },
                  });
                }
              }
            }
          }),
        );

        // Pause briefly between batches to avoid flooding
        await new Promise((r) => setTimeout(r, 4000));
      }
    } catch (err: any) {
      this.logger.error(`Campaign processor failed: ${err.message}`);
    }
  }

  /**
   * Updates queue item status when a call completes or fails.
   */
  async updateQueueItemOnCallEnd(callSid: string, disposition: string, durationSec: number) {
    const q = await this.prisma.outboundQueueItem.findFirst({ where: { callSid } });
    if (!q) return;

    const isSuccess = durationSec >= 15 || disposition === 'completed';
    const finalStatus = isSuccess ? 'answered' : disposition === 'busy' ? 'busy' : disposition === 'no-answer' ? 'no_answer' : 'failed';
    const res = await this.prisma.outboundQueueItem.updateMany({ where: { id: q.id, status: { in: ['pending', 'calling'] } }, data: { status: finalStatus } });

    if (res.count === 1) {
      await this.prisma.outboundCampaign.update({ where: { id: q.campaignId }, data: { completedLeads: { increment: 1 }, ...(isSuccess && { successfulLeads: { increment: 1 } }) } });
      if ((await this.prisma.outboundQueueItem.count({ where: { campaignId: q.campaignId, status: { in: ['pending', 'calling'] } } })) === 0) {
        this.logger.log(`All queue items terminal for campaign ${q.campaignId}. Marking completed.`);
        await this.prisma.outboundCampaign.update({ where: { id: q.campaignId }, data: { status: 'completed' } });
      }
    }
  }
}
