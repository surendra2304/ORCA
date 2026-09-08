import * as crypto from 'crypto';
import {
  Controller,
  Post,
  Body,
  Headers,
  UnauthorizedException,
  UseGuards,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { VapiService } from './vapi.service';
import { Public } from '../common/decorators/public.decorator';
import { WorkspaceGuard } from '../common/guards/workspace.guard';
import { CurrentWorkspace } from '../common/decorators/current-workspace.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Controller('vapi')
export class VapiController {
  constructor(
    private vapiService: VapiService,
    private prisma: PrismaService,
  ) {}

  @Post('webhook')
  @Public()
  async handleWebhook(
    @Body() body: any,
    @Headers('x-vapi-secret') secret: string,
  ) {
    const agentId = body?.message?.call?.metadata?.agentId || body?.message?.assistant?.metadata?.agentId;
    if (!agentId) throw new UnauthorizedException('Missing agent context');
    const agent = await this.prisma.agent.findUnique({ where: { id: agentId }, select: { vapiServerUrlSecret: true } });
    if (!agent?.vapiServerUrlSecret) throw new UnauthorizedException('Agent not configured for Vapi');

    const storedBuf = Buffer.from(agent.vapiServerUrlSecret), providedBuf = Buffer.from(secret || '');
    if (storedBuf.length !== providedBuf.length || !crypto.timingSafeEqual(storedBuf, providedBuf)) throw new UnauthorizedException('Missing or invalid Vapi secret');

    return this.vapiService.handleWebhook(body);
  }

  @Post('provision')
  @UseGuards(WorkspaceGuard)
  async provisionVapiAssistant(
    @CurrentWorkspace() workspaceId: string,
    @Body() body: { agentId: string; serverUrl: string },
  ) {
    if (!body.agentId || !body.serverUrl) throw new BadRequestException('agentId and serverUrl are required');
    if (!process.env.VAPI_API_KEY) throw new BadRequestException('Server is not configured with a VAPI credential');

    const agent = await this.prisma.agent.findFirst({ where: { id: body.agentId, workspaceId } });
    if (!agent) throw new BadRequestException('Agent not found');
    const workspace = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });

    // Create a secure secret for webhooks
    const serverUrlSecret = crypto.randomBytes(32).toString('hex');

    const vName = (agent.voiceName || '').toLowerCase();
    const voiceId = vName === 'aria' ? 'nova' : vName === 'ravi' ? 'echo' : vName === 'maya' ? 'shimmer' : 'alloy';

    const systemPrompt = `You are ${agent.name}, a ${agent.persona || 'Friendly'} assistant for ${workspace?.name || 'our company'}. Goal: ${agent.goal || 'Qualify leads'}. Be extremely concise. Use the query_knowledge_base tool for specific company questions.`;

    // Make API call to Vapi to create assistant
    const response = await fetch('https://api.vapi.ai/assistant', {
      method: 'POST',
      signal: AbortSignal.timeout(10000),
      headers: {
        'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: `${agent.name}${process.env.VAPI_AGENT_NAME_SUFFIX ?? ' (Kaligan Test)'}`,
        model: {
          provider: process.env.VAPI_DEFAULT_MODEL_PROVIDER || 'openai',
          model: process.env.VAPI_DEFAULT_MODEL || 'gpt-4o-mini',
          messages: [{ role: 'system', content: systemPrompt }],
          tools: [
            {
              type: 'function',
              messages: [{
                type: 'request-start',
                content: 'Let me check our knowledge base for that.'
              }],
              function: {
                name: 'query_knowledge_base',
                description: "Query the company's knowledge base for policies, terms of service, shipping information, FAQs, and general customer guidelines.",
                parameters: {
                  type: 'object',
                  properties: {
                    query: {
                      type: 'string',
                      description: "The customer's question or search query"
                    }
                  },
                  required: ['query']
                }
              }
            }
          ]
        },
        voice: {
          provider: 'openai',
          voiceId: voiceId,
        },
        serverUrl: body.serverUrl,
        serverUrlSecret,
        metadata: { workspaceId, agentId: body.agentId },
      })
    });

    if (!response.ok) throw new BadRequestException(`Failed to create Vapi assistant: ${await response.text()}`);
    const vapiAssistant = await response.json();
    if (!vapiAssistant?.id || typeof vapiAssistant.id !== 'string') throw new BadRequestException('Invalid response format from Vapi API');

    await this.prisma.agent.update({ where: { id: body.agentId }, data: { vapiAssistantId: vapiAssistant.id, vapiServerUrlSecret: serverUrlSecret } });

    return {
      message: 'Vapi Assistant created successfully',
      assistantId: vapiAssistant.id,
      serverUrlSecret,
      instructions: `In your Vapi dashboard, assign a Twilio number to assistant ID: ${vapiAssistant.id}`
    };
  }
}
