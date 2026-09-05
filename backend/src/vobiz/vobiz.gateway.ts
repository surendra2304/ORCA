import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, WebSocket } from 'ws';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { KbService } from '../kb/kb.service';
import { VobizGeminiSession } from './vobiz-gemini-session';
import { IncomingMessage } from 'http';
import { AudioConverter } from './audio-converter';

/**
 * Boosts the volume of 16-bit linear PCM audio with clipping prevention.
 * Balances Gemini's lower baseline audio level with standard telephony speech levels.
 */
function boostPcmVolume(pcmBase64: string, gain: number = 2.4): string {
  if (!pcmBase64 || gain === 1) return pcmBase64;
  const inBuf = Buffer.from(pcmBase64, 'base64');
  const sampleCount = Math.floor(inBuf.length / 2);
  const outBuf = Buffer.allocUnsafe(inBuf.length);

  for (let i = 0; i < sampleCount; i++) {
    const sample = inBuf.readInt16LE(i * 2);
    // Apply gain multiplier and clamp within 16-bit signed PCM range [-32768, 32767]
    const boosted = Math.max(-32768, Math.min(32767, Math.round(sample * gain)));
    outBuf.writeInt16LE(boosted, i * 2);
  }

  return outBuf.toString('base64');
}

@WebSocketGateway({ path: '/vobiz-stream' })
export class VobizGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(VobizGateway.name);
  private sessions: Map<WebSocket, VobizGeminiSession> = new Map();
  private mediaCount: Map<WebSocket, number> = new Map();
  
  // Call state tracking
  private callStartTimes: Map<WebSocket, number> = new Map();
  private callTranscripts: Map<WebSocket, { role: string; content: string }[]> = new Map();
  private callDeepgramSockets: Map<WebSocket, any> = new Map();
  private callAgentDeepgramSockets: Map<WebSocket, any> = new Map();
  private isAgentSpeaking: Map<WebSocket, boolean> = new Map();
  private agentTurnGeneration: Map<WebSocket, number> = new Map();
  private callMetadata: Map<
    WebSocket,
    {
      streamId: string;
      workspaceId: string;
      agentId: string;
      direction: string;
      leadId?: string;
      leadName?: string;
      campaignId?: string;
      customPrompt?: string;
    }
  > = new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly kbService: KbService,
  ) {}

  handleConnection(client: WebSocket, req: IncomingMessage) {
    this.logger.log('Vobiz stream client connected');

    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const params = {
      workspaceId: url.searchParams.get('workspaceId') || '',
      agentId: url.searchParams.get('agentId') || '',
      callSid: url.searchParams.get('callSid') || '',
      direction: url.searchParams.get('direction') || 'inbound',
      leadId: url.searchParams.get('leadId') || '',
      leadName: url.searchParams.get('leadName') || '',
      campaignId: url.searchParams.get('campaignId') || '',
      customPrompt: url.searchParams.get('customPrompt') || '',
    };

    const signature = url.searchParams.get('signature');
    const paramsString = new URLSearchParams(params).toString();
    const secret = this.configService.get<string>('JWT_ACCESS_SECRET') || 'default_secret';
    const expectedSignature = require('crypto').createHmac('sha256', secret).update(paramsString).digest('hex');

    if (!signature || signature !== expectedSignature) {
      this.logger.error('Invalid signature on websocket connection, rejecting');
      client.close(1008, 'Unauthorized');
      return;
    }

    this.logger.log(
      `Connection params: workspaceId=${params.workspaceId}, agentId=${params.agentId}, callSid=${params.callSid}, direction=${params.direction}, leadId=${params.leadId}, campaignId=${params.campaignId}`,
    );
    this.mediaCount.set(client, 0);

    client.on('message', async (data: any) => {
      let msg: any;
      try {
        msg = JSON.parse(data.toString());
      } catch (e) {
        return;
      }

      try {
        if (msg.event === 'start') {
          await this.handleStart(client, msg, params);
        } else if (msg.event === 'media') {
          this.handleMedia(client, msg);
        } else if (msg.event === 'stop') {
          this.handleStop(client, msg);
        }
      } catch (err: any) {
        this.logger.error(`Error in event dispatch for ${msg?.event}: ${err.message}`);
        client.close(1011, 'Internal Error');
      }
    });
  }

  handleDisconnect(client: WebSocket) {
    this.logger.log('Vobiz stream client disconnected');
    this.mediaCount.delete(client);
    this.processEndOfCall(client);
    this.cleanupSession(client);
  }

  private async handleStart(
    client: WebSocket,
    msg: any,
    params: {
      workspaceId: string;
      agentId: string;
      callSid: string;
      direction: string;
      leadId?: string;
      leadName?: string;
      campaignId?: string;
      customPrompt?: string;
    },
  ) {
    const streamId = msg.start?.streamId || msg.start?.callId || msg.streamSid;
    const resolvedSid = params.callSid || streamId;
    const mediaFormat = msg.start?.mediaFormat || {};
    const inputSampleRate = 16000;
    
    this.logger.log(
      `Starting Vobiz stream streamId=${streamId}, resolvedSid=${resolvedSid}, direction=${params.direction}`,
    );

    this.callStartTimes.set(client, Date.now());
    this.callTranscripts.set(client, []);
    this.callMetadata.set(client, {
      streamId: resolvedSid,
      workspaceId: params.workspaceId,
      agentId: params.agentId,
      direction: params.direction,
      leadId: params.leadId,
      leadName: params.leadName,
      campaignId: params.campaignId,
      customPrompt: params.customPrompt,
    });

    const apiKey = this.configService.get<string>('GEMINI_API_KEY') || '';
    const voiceModel = this.configService.get<string>('VOICE_MODEL') || 'gemini-2.5-flash-native-audio-preview-09-2025';

    let systemInstruction = "You are a helpful phone assistant. Be extremely concise.";
    let voiceName = 'Kore';
    let resolvedLeadName = params.leadName || '';
    let initialTriggerText = 'The customer has answered the phone call. Please speak your greeting now.';

    if (params.workspaceId && params.agentId) {
      const agent = await this.prisma.agent.findFirst({
        where: { id: params.agentId, workspaceId: params.workspaceId },
      });
      const workspace = await this.prisma.workspace.findUnique({
        where: { id: params.workspaceId },
      });
      
      let leadInfoText = '';
      if (params.leadId) {
        const lead = await this.prisma.lead.findFirst({
          where: { id: params.leadId, workspaceId: params.workspaceId },
        });
        if (lead) {
          resolvedLeadName = lead.name || resolvedLeadName;
          leadInfoText = `Lead Name: ${lead.name || 'Customer'}. Lead Email: ${lead.email || 'None'}. Previous Notes: ${lead.aiNote || 'None'}.`;
        }
      }

      if (agent && workspace) {
        const vName = (agent.voiceName || '').toLowerCase();
        if (vName === 'aria') voiceName = 'Aoede';
        else if (vName === 'ravi') voiceName = 'Charon';

        const agentName = agent.name || 'Sales Agent';
        const companyName = workspace.name || 'our company';
        const leadName = resolvedLeadName || 'there';

        if (params.direction === 'outbound') {
          const reasonForCalling = params.customPrompt || agent.goal || 'introduce our services and see how we can assist';

          systemInstruction = `You are ${agentName}, an AI sales representative for ${companyName}. 
You called ${leadName} on a live outbound phone call.
Reason for calling: ${reasonForCalling}.
${leadInfoText}

CRITICAL PHONE RULES (STRICT):
1. ONE SHORT SENTENCE: Speak ONLY 1 short sentence per turn (maximum 12 to 15 words). Never give long speeches or multiple paragraphs.
2. DIRECT RELEVANCE: Directly address what the customer just said. If they ask about a specific service, speak ONLY about that specific topic.
3. NEVER RAMBLE: Never list all company services at once. Never ask more than one simple question per turn.
4. NO INBOUND PHRASES: This is an OUTBOUND call. Never say "thanks for calling me" or "how can I help you".
5. NO REPETITION: Never repeat a sentence or phrase.
6. NO MARKDOWN: Never use asterisks, markdown, bullet points, or lists.
7. Only use query_knowledge_base if specific technical documentation or company policy details are explicitly requested.`;

          initialTriggerText = `The customer (${leadName}) has answered the call. Speak your opening greeting now: "Hi ${leadName}, this is ${agentName} calling from ${companyName}. I'm reaching out to quickly connect with you about our services. Do you have a quick moment?"`;
        } else {
          systemInstruction = `You are ${agentName}, a ${agent.persona || 'Friendly'} assistant for ${companyName}. 
You are speaking with a customer on an INBOUND phone call.
Goal: ${agent.goal || 'qualify leads and assist callers'}.
${agent.greeting ? `Greeting: "${agent.greeting}"` : ''}

CRITICAL RULES (STRICT):
- Speak ONLY 1 short sentence per turn (maximum 12 to 15 words).
- Never repeat sentences or ask multiple questions at once.
- Tone: warm, concise, professional.
- No markdown or lists.`;

          initialTriggerText = `A caller has connected to ${companyName}. Speak your opening greeting now: ${agent.greeting ? `"${agent.greeting}"` : `"Hello, thank you for calling ${companyName}. My name is ${agentName}, how can I help you today?"`}`;
        }
      }
    }

    const session = new VobizGeminiSession(
      apiKey,
      voiceModel,
      this.kbService,
      params.workspaceId,
      systemInstruction,
      voiceName,
      inputSampleRate,
      initialTriggerText,
    );
    this.sessions.set(client, session);

    // Initialize Deepgram Live STT
    const deepgramKey = this.configService.get<string>('DEEPGRAM_API_KEY') || '';
    if (deepgramKey) {
      try {
        const { DeepgramClient } = require('@deepgram/sdk');
        const deepgram = new DeepgramClient({ apiKey: deepgramKey });
        
        const connectDeepgram = async (sampleRate: number, role: 'visitor' | 'agent') => {
          const dgSocket = await deepgram.listen.v1.createConnection({
            model: 'nova-3', language: 'en', encoding: 'linear16', sample_rate: sampleRate,
          });

          dgSocket.on('message', (data: any) => {
            if (data.type === 'Results' && data.channel?.alternatives?.[0]) {
              const transcriptText = (data.channel.alternatives[0].transcript || '').trim();
              if (!transcriptText) return;

              if (role === 'visitor') {
                const currentlySpeaking = this.isAgentSpeaking.get(client);
                if (currentlySpeaking) {
                  this.logger.log(`[Barge-In] User interrupted agent with: "${transcriptText}" -> Sending clearAudio to Vobiz`);
                  this.isAgentSpeaking.set(client, false);
                  
                  const nextGen = (this.agentTurnGeneration.get(client) || 0) + 1;
                  this.agentTurnGeneration.set(client, nextGen);

                  try {
                    client.send(JSON.stringify({ event: 'clearAudio', streamId: streamId }));
                  } catch (e: any) {
                    this.logger.error(`Failed to send clearAudio: ${e.message}`);
                  }
                }
              }

              if (data.is_final) {
                const transcript = this.callTranscripts.get(client);
                if (transcript) {
                  transcript.push({ role, content: transcriptText });
                  this.logger.log(`Deepgram STT (${role}): ${transcriptText}`);
                }
              }
            }
          });

          dgSocket.on('error', (err: any) => this.logger.error(`Deepgram STT Error (${role}): ${err?.message || err}`));
          dgSocket.on('close', () => this.logger.log(`Deepgram STT connection closed (${role})`));

          dgSocket.connect();
          await dgSocket.waitForOpen();
          return dgSocket;
        };

        const dgSocket = await connectDeepgram(16000, 'visitor');
        this.callDeepgramSockets.set(client, dgSocket);
      } catch (err: any) {
        this.logger.error(`Failed to initialize Deepgram: ${err.message}`);
      }
    }

    let audioOutCount = 0;

    // When Gemini outputs audio, stream to Vobiz in 40ms slices with barge-in cancellation
    session.onAudioOutput((pcmBase64) => {
      audioOutCount++;
      const currentGen = this.agentTurnGeneration.get(client) || 0;
      this.isAgentSpeaking.set(client, true);

      // Boost Gemini audio volume by 2.4x so that the AI voice matches the caller's volume
      const boostedPcm = boostPcmVolume(pcmBase64, 2.4);

      if (audioOutCount <= 3 || audioOutCount % 50 === 0) {
        this.logger.log(`Sending audio chunk #${audioOutCount} to Vobiz (${boostedPcm.length} chars base64, 24kHz, boosted 2.4x)`);
      }

      // Slicing into 40ms sub-chunks (1920 bytes of 24kHz 16-bit PCM = 2560 chars base64)
      const rawBuf = Buffer.from(boostedPcm, 'base64');
      const chunkSize = 1920; // 40ms slices for instant barge-in response

      for (let offset = 0; offset < rawBuf.length; offset += chunkSize) {
        // If barge-in occurred, drop remaining sub-chunks immediately
        if ((this.agentTurnGeneration.get(client) || 0) !== currentGen) {
          this.logger.log('[Barge-In] Cancelled remaining sub-chunks for interrupted turn');
          break;
        }

        const subBuf = rawBuf.subarray(offset, Math.min(offset + chunkSize, rawBuf.length));
        client.send(
          JSON.stringify({
            event: 'playAudio',
            streamId: streamId,
            media: {
              contentType: 'audio/x-l16',
              sampleRate: 24000,
              payload: subBuf.toString('base64'),
            },
          }),
        );
      }
    });

    session.onTextOutput((text) => {
      const cleaned = text.replace(/\*\*.*?\*\*/g, '').trim();
      if (cleaned) {
        const transcript = this.callTranscripts.get(client);
        if (transcript) {
          transcript.push({ role: 'agent', content: cleaned });
          this.logger.log(`Agent dialogue captured: "${cleaned.substring(0, 60)}..."`);
        }
      }
    });

    session.onEnd(() => {
      this.processEndOfCall(client);
      this.cleanupSession(client);
    });

    await session.connect();
  }

  private handleMedia(client: WebSocket, msg: any) {
    const count = (this.mediaCount.get(client) || 0) + 1;
    this.mediaCount.set(client, count);
    if (count === 1 || count % 200 === 0) {
      this.logger.log(`Received ${count} media events so far`);
    }

    const payloadBase64 = msg.media?.payload;
    if (payloadBase64) {
      const muLawBuffer = Buffer.from(payloadBase64, 'base64');
      const pcmBuffer = AudioConverter.convert8kHzMuLawTo16kHzPcm(muLawBuffer);

      const session = this.sessions.get(client);
      if (session) {
        session.sendAudioChunk(pcmBuffer.toString('base64'));
      }

      const dgSocket = this.callDeepgramSockets.get(client);
      if (dgSocket) {
        try {
          dgSocket.sendMedia(pcmBuffer);
        } catch (e) {}
      }
    }
  }

  private handleStop(client: WebSocket, msg: any) {
    this.logger.log(`Vobiz stream stop received streamId=${msg.streamId || msg.streamSid}`);
    this.processEndOfCall(client);
    this.cleanupSession(client);
  }

  private cleanupSession(client: WebSocket) {
    const session = this.sessions.get(client);
    if (session) {
      session.close();
      this.sessions.delete(client);
    }
    
    const dgSocket = this.callDeepgramSockets.get(client);
    if (dgSocket) {
      try { dgSocket.close(); } catch (e) {}
      this.callDeepgramSockets.delete(client);
    }
    
    const agentDgSocket = this.callAgentDeepgramSockets.get(client);
    if (agentDgSocket) {
      try { agentDgSocket.close(); } catch (e) {}
      this.callAgentDeepgramSockets.delete(client);
    }

    this.isAgentSpeaking.delete(client);
    this.agentTurnGeneration.delete(client);
    this.mediaCount.delete(client);
    this.callStartTimes.delete(client);
    this.callTranscripts.delete(client);
    this.callMetadata.delete(client);
  }

  private async processEndOfCall(client: WebSocket) {
    const startTime = this.callStartTimes.get(client);
    const meta = this.callMetadata.get(client);
    
    if (!startTime || !meta) return;

    this.callStartTimes.delete(client);

    const durationSec = Math.floor((Date.now() - startTime) / 1000);
    const transcript = this.callTranscripts.get(client) || [];
    
    this.logger.log(`Call stream ended (${meta.direction || 'inbound'}). Duration: ${durationSec}s. Processing asynchronously...`);

    this.saveCallDataAsync(meta, durationSec, transcript).catch((e) => {
      this.logger.error(`Error saving call data: ${e.message}`);
    });
  }

  private async saveCallDataAsync(
    meta: {
      streamId: string;
      workspaceId: string;
      agentId: string;
      direction: string;
      leadId?: string;
      leadName?: string;
      campaignId?: string;
      customPrompt?: string;
    },
    durationSec: number,
    transcript: { role: string; content: string }[],
  ) {
    const finalTranscript = [...transcript];
    const activeCallSid = meta.streamId;

    let call = await this.prisma.call.findFirst({
      where: { callSid: activeCallSid },
      orderBy: { createdAt: 'desc' },
    });

    const callData = {
      status: 'completed',
      outcome: 'completed',
      disposition: 'completed',
      durationSec,
      direction: (meta.direction || call?.direction || 'inbound') as string,
      ...(meta.leadId && { leadId: meta.leadId }),
      ...(meta.campaignId && { campaignId: meta.campaignId }),
      ...(meta.customPrompt && { customContext: { prompt: meta.customPrompt } }),
    };

    if (call) {
      await this.prisma.call.update({
        where: { id: call.id },
        data: callData,
      });
    } else {
      call = await this.prisma.call.create({
        data: {
          workspaceId: meta.workspaceId,
          agentId: meta.agentId || '00000000-0000-0000-0000-000000000000',
          callSid: activeCallSid,
          fromNumber: 'Unknown',
          ...callData,
        },
      });
    }

    // Find or create conversation for this call
    let conversation = await this.prisma.conversation.findFirst({
      where: {
        OR: [{ callSid: call.callSid }, { callSid: activeCallSid }],
        workspaceId: meta.workspaceId,
      },
    });

    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          workspaceId: meta.workspaceId,
          agentId: meta.agentId || null,
          channel: 'phone',
          callSid: call.callSid,
          visitorLabel: meta.leadName || (meta.direction === 'outbound' ? 'Lead' : 'Caller'),
          durationSec,
          messageCount: finalTranscript.length,
          startedAt: new Date(Date.now() - durationSec * 1000),
          endedAt: new Date(),
          score: 'Warm',
        },
      });
    } else {
      await this.prisma.conversation.update({
        where: { id: conversation.id },
        data: { 
          durationSec, 
          messageCount: finalTranscript.length,
          endedAt: new Date(),
        },
      });
    }

    // Insert conversation messages
    if (finalTranscript.length > 0) {
      await this.prisma.$transaction([
        this.prisma.message.deleteMany({
          where: { conversationId: conversation.id },
        }),
        this.prisma.message.createMany({
          data: finalTranscript.map((m) => ({
            workspaceId: meta.workspaceId,
            conversationId: conversation!.id,
            role: m.role,
            content: m.content,
          })),
        }),
      ]);
    }

    // If part of an outbound campaign queue, update queue status and campaign metrics
    if (meta.campaignId || meta.leadId) {
      try {
        const queueItem = await this.prisma.outboundQueueItem.findFirst({
          where: {
            OR: [
              { callSid: activeCallSid, campaign: { workspaceId: meta.workspaceId } },
              ...(meta.campaignId && meta.leadId ? [{ campaignId: meta.campaignId, leadId: meta.leadId }] : []),
            ],
          },
        });

        if (queueItem) {
          const isSuccess = durationSec >= 10;
          await this.prisma.outboundQueueItem.update({
            where: { id: queueItem.id },
            data: {
              status: isSuccess ? 'answered' : 'completed',
              callSid: activeCallSid,
            },
          });

          await this.prisma.outboundCampaign.update({
            where: { id: queueItem.campaignId },
            data: {
              completedLeads: { increment: 1 },
              ...(isSuccess && { successfulLeads: { increment: 1 } }),
            },
          });
        }
      } catch (e: any) {
        this.logger.warn(`Failed to update outbound queue item status: ${e.message}`);
      }
    }
    
    this.logger.log(`Saved call data for ${call.callSid}: duration ${durationSec}s, ${finalTranscript.length} messages.`);
  }
}
