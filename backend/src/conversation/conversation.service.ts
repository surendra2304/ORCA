import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessActionEngineService } from '../business-actions/business-action.service';
import { LlmService } from '../llm/llm.service';
import { KbService } from '../kb/kb.service';
import { BillingService } from '../billing/billing.service';
import { z } from 'zod';
import { AppCacheService } from '../common/cache/cache.service';
import { DashboardService } from '../dashboard/dashboard.service';
import { isConversationalMessage, extractContactWithZod } from '../common/utils/text.utils';



@Injectable()
export class ConversationService {
  constructor(
    private businessActions: BusinessActionEngineService,
    private prisma: PrismaService,
    private llmService: LlmService,
    private kbService: KbService,
    private billingService: BillingService,
    private cacheService: AppCacheService,
    private dashboardService: DashboardService,
  ) {}

  async findMany(workspaceId: string, tab?: string, agentId?: string) {
    const where: any = { workspaceId };
    if (agentId) {
      where.agentId = agentId;
    }

    if (tab === 'captured') {
      where.captured = true;
    } else if (tab === 'hot') {
      where.score = 'Hot';
    } else if (tab === 'unread') {
      // For simplicity, let's treat conversations with messageCount > 0 as active
      // or we can just filter by score in ('Hot', 'Warm')
      where.score = { in: ['Hot', 'Warm'] };
    }

    const conversations = await this.prisma.conversation.findMany({
      where,
      orderBy: { startedAt: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1, // Get the last message for the snippet
        },
      },
    });

    return conversations.map((c) => {
      const lastMsg = c.messages[0];
      return {
        id: c.id,
        visitorLabel: c.visitorLabel || 'Visitor',
        snippet: lastMsg ? lastMsg.content : 'No messages yet',
        score: c.score || 'Cold',
        captured: c.captured,
        messageCount: c.messageCount,
        startedAt: c.startedAt,
      };
    });
  }

  async findOne(workspaceId: string, id: string) {
    const convo = await this.prisma.conversation.findFirst({
      where: { id, workspaceId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
        leads: {
          take: 1,
        },
      },
    });

    if (!convo) {
      throw new NotFoundException(`Conversation with ID ${id} not found`);
    }

    return {
      ...convo,
      lead: convo.leads[0] || null,
    };
  }

  /**
   * Public chat turn endpoint
   */
  async handlePublicChatTurn(
    workspaceId: string,
    body: {
      agentId?: string;
      conversationId?: string;
      message: string;
      visitorMeta?: any;
    },
  ) {
    const { agentId, conversationId, message, visitorMeta } = body;

    // 1. Resolve agent
    let agent: any = null;
    if (agentId) {
      agent = await this.prisma.agent.findFirst({
        where: { id: agentId, workspaceId },
      });
    }

    if (!agent) {
      // Find live chat agent
      agent = await this.prisma.agent.findFirst({
        where: { workspaceId, kind: 'chat', status: 'live' },
      });
    }

    if (!agent) {
      // Find any chat agent
      agent = await this.prisma.agent.findFirst({
        where: { workspaceId, kind: 'chat' },
      });
    }

    // Default configuration if no agent exists
    const agentName = agent?.name || 'AI Assistant';
    const persona = agent?.persona || 'Friendly';
    const goal = agent?.goal || 'qualify';
    const captureFields = (agent?.captureFields as string[]) || [
      'name',
      'email',
    ];

    // 2. Resolve or create conversation
    let convo: any = null;
    if (conversationId) {
      convo = await this.prisma.conversation.findFirst({
        where: { id: conversationId, workspaceId },
      });
      if (!convo) {
        throw new NotFoundException('Conversation not found');
      }
    } else {
      convo = await this.prisma.conversation.create({
        data: {
          workspaceId,
          agentId: agent?.id || null,
          channel: 'web',
          visitorLabel: visitorMeta?.ip
            ? `Visitor (${visitorMeta.ip})`
            : 'Visitor',
          visitorMeta: visitorMeta || {},
          messageCount: 0,
        },
      });
    }

    // Get workspace name
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { name: true },
    });
    const workspaceName = workspace?.name || 'KaliGan Corp';

    // 3. RAG retrieve context (Bypass KB retrieval for greetings and small talk)
    const isConversational = isConversationalMessage(message);

    let ragResult = { chunks: [] as any[], context: '', grounded: false };
    if (!isConversational) {
      let documentIds: string[] | undefined = undefined;
      if (agent) {
        if (
          Array.isArray(agent.connectedKbDocumentIds) &&
          agent.connectedKbDocumentIds.length > 0
        ) {
          documentIds = agent.connectedKbDocumentIds as string[];
        } else {
          documentIds = [];
        }
      }
      ragResult = await this.kbService.queryKb(
        workspaceId,
        message,
        3,
        0.55,
        documentIds,
      );
    }

    console.log(
      `[RAG] Chunks: ${ragResult.chunks.length} | Docs: ${ragResult.chunks.map((c: any) => c.documentId).join(',')} | Scores: ${ragResult.chunks.map((c: any) => c.score.toFixed(3)).join(',')}`,
    );

    // 4. Retrieve message history
    const existingMessages = await this.prisma.message.findMany({
      where: { conversationId: convo.id, workspaceId },
      orderBy: { createdAt: 'asc' },
    });

    const history = existingMessages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // 5. Generate reply via Gemini
    const reply = await this.llmService.generateChatReply(
      agentName,
      persona,
      goal,
      captureFields,
      workspaceName,
      ragResult.context,
      history,
      message,
    );

    // Save visitor message and agent message immediately in transaction or sequence
    const savedVisitorMsg = await this.prisma.message.create({
      data: {
        workspaceId,
        conversationId: convo.id,
        role: 'visitor',
        content: message,
      },
    });

    const savedAgentMsg = await this.prisma.message.create({
      data: {
        workspaceId,
        conversationId: convo.id,
        role: 'agent',
        content: reply,
      },
    });

    // Update history for scoring
    const fullHistoryForScoring = [
      ...history,
      { role: 'visitor', content: message },
      { role: 'agent', content: reply },
    ];

    // 6. Asynchronous / synchronous LLM Lead Intent Scoring
    const scoringResult = await this.llmService.scoreConversation(
      fullHistoryForScoring,
    );

    // Zod-validated contact fallback/enhancement
    const contactFallback = extractContactWithZod(message);

    const email = scoringResult.email || contactFallback.email;
    const phone = scoringResult.phone || contactFallback.phone;
    const name = scoringResult.name;

    // Check if we captured anything
    const isCaptured = !!(email || phone || name);

    let finalScore = scoringResult.score || convo.score || 'Cold';
    // If contact info is captured, raise score to Warm or Hot
    if (isCaptured && finalScore === 'Cold') {
      finalScore = 'Warm';
    }

    let leadId: string | null = null;
    const capturedFieldsList: string[] = [];
    if (isCaptured) {
      // Try to match lead by email or conversation id
      let lead: any = null;
      if (email) {
        lead = await this.prisma.lead.findFirst({
          where: { workspaceId, email },
        });
      }

      if (!lead) {
        lead = await this.prisma.lead.findFirst({
          where: { workspaceId, conversationId: convo.id },
        });
      }

      const leadData: any = {
        workspaceId,
        conversationId: convo.id,
        score: finalScore,
        intent: scoringResult.intent || 'Interested in product information',
        aiNote: scoringResult.aiNote || 'Captured details from conversation',
        source: convo.channel,
      };

      if (email) leadData.email = email;
      if (phone) leadData.phone = phone;
      if (name) leadData.name = name;

      if (lead) {
        lead = await this.prisma.lead.update({
          where: { id: lead.id },
          data: leadData,
        });
      } else {
        lead = await this.prisma.lead.create({
          data: leadData,
        });
      }

      leadId = lead.id;

      if (agentId) {
        this.businessActions.executeWorkflow(workspaceId, agentId, 'LEAD_CAPTURED', lead).catch((e: any) => console.error(e));
      }
      if (lead.name) capturedFieldsList.push('name');
      if (lead.email) capturedFieldsList.push('email');
      if (lead.phone) capturedFieldsList.push('phone');
    }

    // Update conversation record
    const updatedCount = convo.messageCount + 2;
    await this.prisma.conversation.update({
      where: { id: convo.id },
      data: {
        messageCount: updatedCount,
        captured: convo.captured || isCaptured,
        score: finalScore,
        visitorLabel:
          name ||
          convo.visitorLabel ||
          (email ? email.split('@')[0] : undefined),
      },
    });

    // Invalidate dashboard metrics cache on new activity
    this.dashboardService.invalidateMetrics(workspaceId);

    // Record billing usage event
    await this.billingService.recordUsageEvent(
      workspaceId,
      'chat_message',
      1,
      agent?.id || null,
    );

    return {
      conversationId: convo.id,
      reply,
      captured: isCaptured ? { fields: capturedFieldsList } : undefined,
      score: finalScore,
    };
  }

  /**
   * Authenticated preview chat endpoint (ephemeral)
   */
  async handlePreviewChatTurn(
    workspaceId: string,
    body: {
      agentId?: string;
      message: string;
      history?: { role: string; content: string }[];
    },
  ) {
    const { agentId, message, history = [] } = body;

    // Load agent config
    let agent: any = null;
    if (agentId) {
      agent = await this.prisma.agent.findFirst({
        where: { id: agentId, workspaceId },
      });
    }

    if (!agent) {
      agent = await this.prisma.agent.findFirst({
        where: { workspaceId, kind: 'chat' },
      });
    }

    const agentName = agent?.name || 'AI Assistant';
    const persona = agent?.persona || 'Friendly';
    const goal = agent?.goal || 'qualify';
    const captureFields = (agent?.captureFields as string[]) || [
      'name',
      'email',
    ];

    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { name: true },
    });
    const workspaceName = workspace?.name || 'KaliGan Corp';

    // RAG retrieve context
    let documentIds: string[] | undefined = undefined;
    if (agent) {
      if (
        Array.isArray(agent.connectedKbDocumentIds) &&
        agent.connectedKbDocumentIds.length > 0
      ) {
        documentIds = agent.connectedKbDocumentIds as string[];
      } else {
        documentIds = [];
      }
    }
    const ragResult = await this.kbService.queryKb(
      workspaceId,
      message,
      3,
      0.55,
      documentIds,
    );

    console.log(
      `[RAG] Chunks: ${ragResult.chunks.length} | Docs: ${ragResult.chunks.map((c: any) => c.documentId).join(',')} | Scores: ${ragResult.chunks.map((c: any) => c.score.toFixed(3)).join(',')}`,
    );

    // Call Gemini
    const reply = await this.llmService.generateChatReply(
      agentName,
      persona,
      goal,
      captureFields,
      workspaceName,
      ragResult.context,
      history,
      message,
    );

    return {
      reply,
    };
  }
}
