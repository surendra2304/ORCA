import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { KbService } from '../kb/kb.service';
import { LlmService } from '../llm/llm.service';

@Injectable()
export class VapiService {
  private readonly logger = new Logger(VapiService.name);

  constructor(
    private prisma: PrismaService,
    private kbService: KbService,
    private llmService: LlmService,
  ) {}

  async handleWebhook(body: any) {
    const type = body.message?.type;
    if (type === 'tool-calls') return this.handleToolCall(body.message);
    if (type === 'end-of-call-report') { await this.handleEndOfCall(body.message); return { success: true }; }
    return {};
  }

  private async handleToolCall(message: any) {
    const results: any[] = [];
    for (const toolCall of message.toolCalls || []) {
      if (toolCall.function?.name === 'query_knowledge_base') {
        let args = toolCall.function.arguments || {};
        if (typeof args === 'string') {
          try { args = JSON.parse(args); } catch (e) { this.logger.error('Failed to parse query_knowledge_base arguments JSON'); args = {}; }
        }
        const workspaceId = message.call?.metadata?.workspaceId || message.assistant?.metadata?.workspaceId;
        let resultContext = 'No relevant information found.';
        if (workspaceId && args.query) {
          try {
            const kbResult = await this.kbService.queryKb(workspaceId, args.query, 3, 0.35);
            if (kbResult.grounded) resultContext = kbResult.context;
          } catch (err) {
            this.logger.error(`Error querying KB: ${err}`);
            resultContext = 'An error occurred while querying the knowledge base.';
          }
        }
        results.push({ toolCallId: toolCall.id, result: resultContext });
      } else {
        results.push({ toolCallId: toolCall.id, result: "Tool not recognized." });
      }
    }
    return { results };
  }

  private async handleEndOfCall(message: any) {
    const callData = message.call;
    const metadata = callData?.metadata || {};
    const workspaceId = metadata.workspaceId;
    const agentId = metadata.agentId;
    
    if (!workspaceId || !agentId) return this.logger.warn('End of call report missing workspaceId or agentId in metadata.');
    const callSid = callData?.id || callData?.sipUri;
    if (!callSid) return this.logger.warn('End of call report missing call id or sipUri.');
    if (await this.prisma.conversation.findFirst({ where: { callSid } })) return this.logger.warn(`End of call report received for already processed callSid: ${callSid}`);

    const transcript = message.transcript || [];
    const callDurationSec = message.durationSeconds || (message.durationMs ? Math.round(message.durationMs / 1000) : 0) || message.duration || 0;
    
    // 1. Create conversation
    const convo = await this.prisma.conversation.create({
      data: {
        workspaceId,
        agentId,
        channel: 'voice_vapi',
        callSid,
        startedAt: callData?.createdAt ? new Date(callData.createdAt) : new Date(),
        endedAt: callData?.endedAt ? new Date(callData.endedAt) : new Date(),
        messageCount: 0, // will update later
        durationSec: callDurationSec,
        visitorLabel: callData?.customer?.number || 'Vapi Caller',
      },
    });

    // 2. Save messages
    const mappedHistory: any[] = [];
    for (const msg of transcript) {
      const content = msg.content || msg.text || '';
      if (content) {
        const dbRole = msg.role === 'assistant' ? 'agent' : 'visitor';
        await this.prisma.message.create({ data: { workspaceId, conversationId: convo.id, role: dbRole, content } });
        mappedHistory.push({ role: dbRole, content });
      }
    }
    await this.prisma.conversation.update({ where: { id: convo.id }, data: { messageCount: mappedHistory.length } });

    // 3. Score conversation
    if (mappedHistory.length > 0) {
      try {
        const scoringResult = await this.llmService.scoreConversation(mappedHistory);
        
        let email = scoringResult.email;
        let phone = scoringResult.phone || callData?.customer?.number;
        let name = scoringResult.name;

        // Fallback regex extraction from user messages
        for (const msg of mappedHistory.filter(m => m.role === 'visitor')) {
          const regexEmail = msg.content.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
          const regexPhone = msg.content.match(/\+?[0-9]{1,4}?[-.\s]?\(?[0-9]{1,3}?\)?[-.\s]?[0-9]{1,4}[-.\s]?[0-9]{1,4}[-.\s]?[0-9]{1,9}/);
          if (!email && regexEmail) email = regexEmail[0];
          if (!phone && regexPhone && regexPhone[0].length >= 10) phone = regexPhone[0];
        }

        const isCaptured = !!(email || phone || name);
        const finalScore = (isCaptured && (scoringResult.score || 'Cold') === 'Cold') ? 'Warm' : (scoringResult.score || 'Cold');

        if (isCaptured) {
          let lead = email ? await this.prisma.lead.findFirst({ where: { workspaceId, email } }) : null;
          if (!lead) lead = await this.prisma.lead.findFirst({ where: { workspaceId, conversationId: convo.id } });
          
          const leadData: any = { workspaceId, conversationId: convo.id, score: finalScore, intent: scoringResult.intent || 'Voice call via Vapi', aiNote: scoringResult.aiNote || 'Captured details from Vapi voice call', source: 'voice_vapi', ...(email && {email}), ...(phone && {phone}), ...(name && {name}) };
          if (lead) await this.prisma.lead.update({ where: { id: lead.id }, data: leadData });
          else await this.prisma.lead.create({ data: leadData });
        }

        await this.prisma.conversation.update({
          where: { id: convo.id },
          data: { captured: isCaptured, score: finalScore, visitorLabel: name || convo.visitorLabel || (email ? email.split('@')[0] : undefined) },
        });
      } catch (err) {
        this.logger.error(`Error scoring conversation: ${err}`);
      }
    }

    if (!(await this.prisma.call.findFirst({ where: { callSid } }))) {
      await this.prisma.call.create({ data: { workspaceId, agentId, callSid, fromNumber: callData?.customer?.number || 'Caller', durationSec: callDurationSec, outcome: mappedHistory.length > 2 ? 'Lead qualified' : 'Short call' } });
    }
  }
}
