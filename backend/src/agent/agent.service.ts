import { Injectable, NotFoundException, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BillingService } from '../billing/billing.service';
import { AppCacheService } from '../common/cache/cache.service';
type AgentKind = 'chat' | 'voice';

@Injectable()
export class AgentService {
  constructor(
    private prisma: PrismaService,
    private billingService: BillingService,
    private cacheService: AppCacheService,
  ) {}

  async findMany(workspaceId: string, kind?: string) {
    const cacheKey = `agents:${workspaceId}:list:${kind || 'all'}`;
    return this.cacheService.getOrSet(cacheKey, 120, async () => {
      return this.prisma.agent.findMany({
        where: {
          workspaceId,
          ...(kind ? { kind: kind as AgentKind } : {}),
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  }

  async findOne(workspaceId: string, id: string) {
    const agent = await this.prisma.agent.findFirst({
      where: { id, workspaceId },
      include: {
        phoneNumbers: true,
        employeeActions: true,
      },
    });
    if (!agent) {
      throw new NotFoundException(`Agent with ID ${id} not found`);
    }
    return agent;
  }

  async create(workspaceId: string, data: { kind: string; name: string; [key: string]: any }) {
    const exceeded = await this.billingService.isLimitExceeded(workspaceId, 'agents');
    if (exceeded) {
      throw new HttpException(
        'Agent limit exceeded. Please upgrade your plan.',
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    const agent = await this.prisma.agent.create({
      data: {
        workspaceId,
        kind: data.kind as AgentKind,
        name: data.name,
        persona: data.persona ?? 'Friendly',
        greeting: data.greeting ?? 'Hello! How can I help you today?',
        goal: data.goal ?? 'qualify',
        voiceName: data.voiceName,
        language: data.language ?? 'en-US',
        speakingSpeed: data.speakingSpeed ?? 'natural',
        channels: data.channels ?? { web: true, phone: false },
        captureFields: data.captureFields ?? ['name', 'email'],
        connectedKbDocumentIds: data.connectedKbDocumentIds ?? [],
        status: 'draft',
      },
    });

    this.cacheService.deletePrefix(`agents:${workspaceId}`);
    return agent;
  }

  async update(workspaceId: string, id: string, data: any) {
    // Check existence first
    await this.findOne(workspaceId, id);

    // Filter out read-only fields
    const { id: _, workspaceId: __, createdAt: ___, updatedAt: ____, ...updateData } = data;

    const updated = await this.prisma.agent.update({
      where: { id },
      data: updateData,
    });

    this.cacheService.deletePrefix(`agents:${workspaceId}`);
    return updated;
  }

  async publish(workspaceId: string, id: string, userId?: string) {
    const agent = await this.findOne(workspaceId, id);
    
    // Update status to live
    const updatedAgent = await this.prisma.agent.update({
      where: { id },
      data: { status: 'live' },
    });

    const configSnapshot = {
      name: agent.name,
      persona: agent.persona,
      greeting: agent.greeting,
      goal: agent.goal,
      voiceName: agent.voiceName,
      language: agent.language,
      speakingSpeed: agent.speakingSpeed,
      channels: agent.channels,
      captureFields: agent.captureFields,
      connectedKbDocumentIds: agent.connectedKbDocumentIds,
    };

    // Create configuration snapshot in AgentVersion
    await this.prisma.agentVersion.create({
      data: {
        agentId: id,
        workspaceId,
        configSnapshot,
        publishedBy: userId || null,
      },
    });

    this.cacheService.deletePrefix(`agents:${workspaceId}`);
    return updatedAgent;
  }

  async getVersions(workspaceId: string, id: string) {
    await this.findOne(workspaceId, id);
    return this.prisma.agentVersion.findMany({
      where: { agentId: id, workspaceId },
      orderBy: { publishedAt: 'desc' },
    });
  }

  async rollback(workspaceId: string, id: string, versionId: string) {
    await this.findOne(workspaceId, id);
    
    const version = await this.prisma.agentVersion.findFirst({
      where: { id: versionId, agentId: id, workspaceId },
    });
    if (!version) {
      throw new NotFoundException(`Agent version with ID ${versionId} not found`);
    }

    const updated = await this.prisma.agent.update({
      where: { id },
      data: version.configSnapshot as any,
    });

    this.cacheService.deletePrefix(`agents:${workspaceId}`);
    return updated;
  }

  async delete(workspaceId: string, id: string) {
    await this.findOne(workspaceId, id);
    const deleted = await this.prisma.agent.delete({
      where: { id },
    });
    this.cacheService.deletePrefix(`agents:${workspaceId}`);
    return deleted;
  }

  async toggleAction(workspaceId: string, agentId: string, integrationId: string, actionType: string, enabled: boolean, configuration?: any) {
    await this.findOne(workspaceId, agentId); // Ensure agent exists and belongs to workspace

    const existing = await this.prisma.employeeAction.findFirst({
      where: { agentId, integrationId, actionType },
    });

    if (existing) {
      return this.prisma.employeeAction.update({
        where: { id: existing.id },
        data: { 
          enabled,
          ...(configuration !== undefined && { configuration })
        },
      });
    }

    if (enabled) {
      return this.prisma.employeeAction.create({
        data: {
          agentId,
          integrationId,
          actionType,
          enabled,
          ...(configuration !== undefined && { configuration: configuration || {} })
        },
      });
    }

    return null;
  }

  async removeAction(workspaceId: string, agentId: string, actionId: string) {
    await this.findOne(workspaceId, agentId); // Ensure agent belongs to workspace
    return this.prisma.employeeAction.delete({
      where: { id: actionId },
    });
  }
}
