import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessActionEngineService } from '../business-actions/business-action.service';
import { LlmService } from '../llm/llm.service';
import { AppCacheService } from '../common/cache/cache.service';
import { GoogleGenAI, Modality } from '@google/genai';

@Injectable()
export class VoiceService {
  constructor(
    private prisma: PrismaService,
    private businessActions: BusinessActionEngineService,
    private configService: ConfigService,
    private llmService: LlmService,
    private cacheService: AppCacheService,
  ) {}

  async createToken(workspaceId: string, agentId: string, resumptionHandle?: string) {
    const [agent, workspace] = await Promise.all([
      this.prisma.agent.findFirst({ where: { id: agentId, workspaceId } }),
      this.prisma.workspace.findUnique({ where: { id: workspaceId } })
    ]);
    if (!agent || !workspace) throw new NotFoundException('Agent or workspace not found');

    const apiKey = this.configService.get<string>('GEMINI_API_KEY') || '';
    const voiceModel = this.configService.get<string>('VOICE_MODEL') || 'gemini-3.1-flash-live-preview';

    const vName = (agent.voiceName || '').toLowerCase();
    const mappedVoice = vName === 'aria' ? 'Aoede' : vName === 'ravi' ? 'Charon' : 'Kore';

    const captureFields = Array.isArray(agent.captureFields) ? agent.captureFields : ['name', 'email'];

    const composedSystemInstruction = `
You are ${agent.name}, a ${agent.persona || 'Friendly'} assistant for ${workspace.name}.
Respond IMMEDIATELY with ultra-concise, direct sentences (1-2 sentences max per turn). Begin speaking instantly without filler phrases or introductory delay.
Use the query_knowledge_base tool ONLY when the user asks specific questions about company policies, products, or FAQs. For general greetings or chat, reply directly. Never make up facts.
Goal: ${agent.goal || 'qualify'}. When the user shows interest, collect: ${captureFields.join(', ')}.
Keep responses brief (under 25 words per turn). Speak fast and naturally. No markdown formatting.
`.trim();

    const tools = [{ functionDeclarations: [{ name: 'query_knowledge_base', description: "Query the company's knowledge base for policies, terms of service, shipping information, FAQs, and general customer guidelines.", parameters: { type: 'OBJECT' as any, properties: { query: { type: 'STRING' as any, description: "The customer's question or search query" } }, required: ['query'] } }] }];

    const client = new GoogleGenAI({ apiKey, httpOptions: { apiVersion: 'v1alpha' } });
    const now = Date.now();
    const expireTime = new Date(now + 30 * 60 * 1000).toISOString();
    
    const tokenResponse = await client.authTokens.create({
      config: {
        uses: 1,
        expireTime,
        newSessionExpireTime: new Date(now + 60 * 1000).toISOString(),
        liveConnectConstraints: {
          model: voiceModel,
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: mappedVoice } } },
            systemInstruction: { parts: [{ text: composedSystemInstruction }] },
            tools,
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            ...(resumptionHandle && { sessionResumption: { handle: resumptionHandle } })
          }
        }
      }
    });

    return { token: tokenResponse.name, expireTime, model: voiceModel };
  }

  async finalize(workspaceId: string, body: { agentId: string; conversationId?: string; transcript: { role: string; content: string }[]; visitorMeta?: any; }) {
    const { agentId, conversationId, transcript, visitorMeta } = body;

    let convo = conversationId ? await this.prisma.conversation.findFirst({ where: { id: conversationId, workspaceId } }) : null;

    if (!convo) {
      convo = await this.prisma.conversation.create({ data: { workspaceId, agentId, channel: 'voice', visitorMeta: visitorMeta || {}, startedAt: new Date(), endedAt: new Date() } });
    } else {
      convo = await this.prisma.conversation.update({ where: { id: convo.id }, data: { endedAt: new Date(), ...(visitorMeta && { visitorMeta }) } });
    }

    const mappedHistory = transcript.map(msg => ({
      role: (msg.role === 'user' || msg.role === 'visitor') ? 'visitor' : 'agent',
      content: msg.content,
    }));

    if (mappedHistory.length) {
      await this.prisma.message.createMany({
        data: mappedHistory.map(m => ({ workspaceId, conversationId: convo.id, role: m.role, content: m.content }))
      });
    }

    const scoringResult = await this.llmService.scoreConversation(mappedHistory);
    let { email, phone, name } = scoringResult;

    const userText = mappedHistory.filter(m => m.role === 'visitor').map(m => m.content).join(' ');
    if (!email) email = userText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)?.[0];
    if (!phone) phone = userText.match(/\+?[0-9]{1,4}?[-.\s]?\(?[0-9]{1,3}?\)?[-.\s]?[0-9]{1,4}[-.\s]?[0-9]{1,4}[-.\s]?[0-9]{1,9}/)?.[0];

    const isCaptured = !!(email || phone || name);
    let finalScore = scoringResult.score || convo.score || 'Cold';
    if (isCaptured && finalScore === 'Cold') finalScore = 'Warm';

    const capturedFieldsList: string[] = [];
    if (isCaptured) {
      let lead = email ? await this.prisma.lead.findFirst({ where: { workspaceId, email } }) : null;
      if (!lead) lead = await this.prisma.lead.findFirst({ where: { workspaceId, conversationId: convo.id } });

      const leadData: any = { workspaceId, conversationId: convo.id, score: finalScore, intent: scoringResult.intent || 'Interested in voice follow-up', aiNote: scoringResult.aiNote || 'Captured details from voice conversation', source: convo.channel, ...(email && { email }), ...(phone && { phone }), ...(name && { name }) };
      
      lead = lead ? await this.prisma.lead.update({ where: { id: lead.id }, data: leadData }) : await this.prisma.lead.create({ data: leadData });
      
      if (lead.name) capturedFieldsList.push('name');
      if (lead.email) capturedFieldsList.push('email');
      if (lead.phone) capturedFieldsList.push('phone');
    }

    await this.prisma.conversation.update({
      where: { id: convo.id },
      data: {
        messageCount: convo.messageCount + transcript.length,
        captured: convo.captured || isCaptured,
        score: finalScore,
        visitorLabel: name || convo.visitorLabel || email?.split('@')[0],
      },
    });

    this.cacheService.deletePrefix(`dashboard:metrics:${workspaceId}`);

    return { conversationId: convo.id, captured: isCaptured ? { fields: capturedFieldsList } : undefined, score: finalScore };
  }
}
