import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { WebSocket, Server } from 'ws';
import { IncomingMessage } from 'http';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BillingService } from '../billing/billing.service';
import { KbService } from '../kb/kb.service';
import { ConfigService } from '@nestjs/config';

// G.711 mu-law decoding table
const MU_LAW_DECODE_TABLE = new Int16Array(256);
for (let i = 0; i < 256; i++) {
  const mu = ~i;
  const sign = mu & 0x80;
  const exponent = (mu >> 4) & 0x07;
  const mantissa = mu & 0x0F;
  let sample = ((mantissa << 3) + 33) << exponent;
  sample -= 33;
  MU_LAW_DECODE_TABLE[i] = sign ? -sample : sample;
}

// G.711 mu-law encoding function
function encodeMuLawSample(sample: number): number {
  const sign = sample < 0 ? 0x80 : 0x00;
  if (sample < 0) sample = -sample;
  if (sample > 32635) sample = 32635;
  sample += 84;
  let exponent = 7;
  for (let mask = 0x4000; (sample & mask) === 0 && exponent > 0; mask >>= 1) {
    exponent--;
  }
  const mantissa = (sample >> (exponent + 3)) & 0x0F;
  const mu = ~(sign | (exponent << 4) | mantissa);
  return mu & 0xFF;
}

// 8kHz mu-law -> 16kHz PCM16 upsampler (duplicate samples)
export function mulawToPcm16(mulawBuffer: Buffer): Buffer {
  const pcm16 = Buffer.alloc(mulawBuffer.length * 4);
  let writeOffset = 0;
  for (let i = 0; i < mulawBuffer.length; i++) {
    const sample = MU_LAW_DECODE_TABLE[mulawBuffer[i]];
    pcm16.writeInt16LE(sample, writeOffset);
    writeOffset += 2;
    pcm16.writeInt16LE(sample, writeOffset);
    writeOffset += 2;
  }
  return pcm16;
}

// 24kHz PCM16 -> 8kHz mu-law downsampler (take every 3rd sample)
export function pcm24ToMulaw(pcm24Buffer: Buffer): Buffer {
  const mulaw = Buffer.alloc(Math.floor(pcm24Buffer.length / 6));
  let writeOffset = 0;
  for (let i = 0; i < pcm24Buffer.length; i += 6) {
    if (i + 1 >= pcm24Buffer.length) break;
    const sample = pcm24Buffer.readInt16LE(i);
    mulaw[writeOffset++] = encodeMuLawSample(sample);
  }
  return mulaw;
}

// 16kHz PCM16 -> 8kHz mu-law downsampler (take every 2nd sample)
export function pcm16ToMulaw(pcm16Buffer: Buffer): Buffer {
  const mulaw = Buffer.alloc(Math.floor(pcm16Buffer.length / 4));
  let writeOffset = 0;
  for (let i = 0; i < pcm16Buffer.length; i += 4) {
    if (i + 1 >= pcm16Buffer.length) break;
    const sample = pcm16Buffer.readInt16LE(i);
    mulaw[writeOffset++] = encodeMuLawSample(sample);
  }
  return mulaw;
}

// Generate simple sine wave tone in mu-law
function generateTone(frequency: number, durationSec: number, sampleRate = 8000): Buffer {
  const numSamples = durationSec * sampleRate;
  const buffer = Buffer.alloc(numSamples);
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const sample = Math.sin(2 * Math.PI * frequency * t) * 12000;
    buffer[i] = encodeMuLawSample(sample);
  }
  return buffer;
}

@WebSocketGateway({ path: '/telephony/twilio/incoming' })
@Injectable()
export class MediaBridgeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(MediaBridgeGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private prisma: PrismaService,
    private billingService: BillingService,
    private kbService: KbService,
    private configService: ConfigService,
  ) {}

  async handleConnection(client: WebSocket, request: IncomingMessage) {
    const url = request.url || '';
    this.logger.log(`New media stream connection attempt: ${url}`);

    // Parse agent token from URL
    const match = url.match(/\/telephony\/twilio\/incoming\/([a-zA-Z0-9_-]+)/);
    const agentToken = match ? match[1] : null;

    if (!agentToken) {
      this.logger.warn('Connection rejected: missing agent token in path.');
      client.close(4001, 'Missing agent token');
      return;
    }

    // Resolve phone connection
    const phoneNum = await this.prisma.phoneNumber.findFirst({
      where: { agentToken },
      include: { agent: true, workspace: true },
    });

    if (!phoneNum) {
      this.logger.warn(`Connection rejected: invalid agent token ${agentToken}`);
      client.close(4002, 'Invalid agent token');
      return;
    }

    const { agent, workspace } = phoneNum;

    // Check plan constraints
    const isExceeded = await this.billingService.isLimitExceeded(workspace.id, 'byonAllowed');
    if (isExceeded) {
      this.logger.warn(`Connection rejected: BYON is not allowed on plan ${workspace.plan} for workspace ${workspace.id}`);
      client.close(4003, 'Plan BYON limit exceeded');
      return;
    }

    this.logger.log(`Connection authorized for Agent: ${agent.name}, Workspace: ${workspace.name}`);

    // Setup state variables for this call session
    let streamSid = '';
    let callSid = '';
    let conversation: any = null;
    let startTime = Date.now();
    let isMockMode = true;
    let geminiWs: WebSocket | null = null;

    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (apiKey && apiKey !== 'local_placeholder') {
      isMockMode = false;
    }

    // Process incoming WebSocket messages from Twilio
    client.on('message', async (data: string) => {
      try {
        const msg = JSON.parse(data);
        if (msg.event === 'start') {
          streamSid = msg.streamSid;
          callSid = msg.start.callSid;
          this.logger.log(`Call started: callSid=${callSid}, streamSid=${streamSid}`);

          // Create conversation in database
          conversation = await this.prisma.conversation.create({
            data: {
              workspaceId: workspace.id,
              agentId: agent.id,
              channel: 'phone',
              visitorLabel: msg.start.from || 'Caller',
              visitorMeta: msg.start,
              callSid,
              messageCount: 0,
            },
          });

          // Track phone connection status
          await this.prisma.phoneNumber.update({
            where: { id: phoneNum.id },
            data: { status: 'connected', connectedAt: new Date() },
          });

          if (!isMockMode) {
            // Setup real Gemini Live API WebSocket
            const model = this.configService.get<string>('VOICE_MODEL') || 'gemini-2.5-flash-native-audio-preview-09-2025';
            const geminiUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`;
            
            this.logger.log(`Connecting to Gemini Live API: ${model}`);
            geminiWs = new WebSocket(geminiUrl);

            geminiWs.on('open', () => {
              // Send setup configuration
              const setupMsg = {
                setup: {
                  model: `models/${model}`,
                  generationConfig: {
                    responseModalities: ['AUDIO'],
                    speechConfig: {
                      voiceConfig: {
                        prebuiltVoiceConfig: {
                          voiceName: agent.voiceName || 'Aoede',
                        },
                      },
                    },
                  },
                  systemInstruction: {
                    parts: [
                      {
                        text: `You are a voice agent representing ${workspace.name}. Your name is ${agent.name}. Persona: ${agent.persona}. Goal: ${agent.goal}. Speak concisely and naturally.`,
                      },
                    ],
                  },
                },
              };
              geminiWs?.send(JSON.stringify(setupMsg));
            });

            geminiWs.on('message', (geminiData: string) => {
              try {
                const response = JSON.parse(geminiData);
                
                // Handle audio output from Gemini
                if (response.serverContent?.modelTurn?.parts) {
                  for (const part of response.serverContent.modelTurn.parts) {
                    if (part.inlineData && part.inlineData.mimeType.startsWith('audio/pcm')) {
                      const pcm24 = Buffer.from(part.inlineData.data, 'base64');
                      const mulaw = pcm24ToMulaw(pcm24);
                      
                      // Send audio back to Twilio
                      client.send(
                        JSON.stringify({
                          event: 'media',
                          streamSid,
                          media: {
                            payload: mulaw.toString('base64'),
                          },
                        }),
                      );
                    }
                  }
                }
              } catch (e: any) {
                this.logger.error(`Error parsing Gemini Live payload: ${e.message}`);
              }
            });

            geminiWs.on('error', (err) => {
              this.logger.error(`Gemini Live connection error: ${err.message}`);
              this.logger.warn('Falling back to local mock voice session.');
              isMockMode = true;
            });
          }

          // Initial greeting trigger
          if (isMockMode) {
            // Play welcome beep and greeting
            const greetingText = agent.greeting || `Hello! Thank you for calling ${workspace.name}. I am ${agent.name}. How can I assist you today?`;
            
            // Log assistant speaking
            await this.prisma.message.create({
              data: {
                workspaceId: workspace.id,
                conversationId: conversation.id,
                role: 'agent',
                content: greetingText,
              },
            });

            // Stream welcome beep + simulated speech tone
            const welcomeTones = Buffer.concat([
              generateTone(523.25, 0.25), // C5 tone
              Buffer.alloc(800),            // short pause
              generateTone(659.25, 0.25), // E5 tone
              Buffer.alloc(800),
              generateTone(783.99, 0.4),  // G5 tone
            ]);

            client.send(
              JSON.stringify({
                event: 'media',
                streamSid,
                media: {
                  payload: welcomeTones.toString('base64'),
                },
              }),
            );
          }

        } else if (msg.event === 'media' && streamSid) {
          const mulawAudio = Buffer.from(msg.media.payload, 'base64');
          
          if (!isMockMode && geminiWs && geminiWs.readyState === WebSocket.OPEN) {
            // Transcode and send to Gemini Live
            const pcm16 = mulawToPcm16(mulawAudio);
            const inputChunk = {
              realtimeInput: {
                mediaChunks: [
                  {
                    mimeType: 'audio/pcm;rate=16000',
                    data: pcm16.toString('base64'),
                  },
                ],
              },
            };
            geminiWs.send(JSON.stringify(inputChunk));
          } else if (isMockMode) {
            // Local voice simulation processing
            // For testing: if they make a query, trigger a simulated RAG reply after a small window of voice frames
            // To prevent spamming, we respond mockingly once every 6 seconds of voice input
            const sessionKey = `voice_frames_${callSid}`;
            const frameCount = (client as any)[sessionKey] || 0;
            (client as any)[sessionKey] = frameCount + 1;

            if (frameCount === 30) { // roughly after 3-4 seconds of stream (each media packet is ~20ms-100ms)
              (client as any)[sessionKey] = 0; // reset
              
              // Run RAG query on knowledge base for mock reply grounding
              const query = 'founder refund policy'; // Simulate keyword extraction from voice
              let documentIds: string[] | undefined = undefined;
              if (agent.connectedKbDocumentIds && Array.isArray(agent.connectedKbDocumentIds)) {
                documentIds = agent.connectedKbDocumentIds as string[];
              }
              const ragResult = await this.kbService.queryKb(workspace.id, query, 3, 0.35, documentIds);
              
              // Simulate conversational response based on RAG
              let responseText = "I have reviewed your query but could not find specific details in my knowledge base. Can I take your email and name so our team can follow up?";
              if (ragResult.grounded) {
                if (ragResult.context.toLowerCase().includes('founder')) {
                  responseText = "The company was founded in 2026 by RamGanesh. Let me know if you need more details!";
                } else if (ragResult.context.toLowerCase().includes('refund')) {
                  responseText = "We offer a strict 14-day money-back guarantee. You can email support@kaligan.ai for a full refund.";
                }
              }

              this.logger.log(`Mock Voice output: "${responseText}"`);

              // Log caller query (mocked transcription) and agent response
              await this.prisma.message.create({
                data: {
                  workspaceId: workspace.id,
                  conversationId: conversation.id,
                  role: 'visitor',
                  content: '[Speech Query]',
                },
              });
              await this.prisma.message.create({
                data: {
                  workspaceId: workspace.id,
                  conversationId: conversation.id,
                  role: 'agent',
                  content: responseText,
                },
              });

              // Send synthesized reply tone back to caller
              const replyTones = Buffer.concat([
                generateTone(350, 0.15),
                generateTone(440, 0.15),
                generateTone(350, 0.2),
              ]);

              client.send(
                JSON.stringify({
                  event: 'media',
                  streamSid,
                  media: {
                    payload: replyTones.toString('base64'),
                  },
                }),
              );
            }
          }
        } else if (msg.event === 'stop') {
          this.logger.log(`Call stopped by client: callSid=${callSid}`);
          client.close();
        }
      } catch (err: any) {
        this.logger.error(`Error processing media stream socket payload: ${err.message}`);
      }
    });

    client.on('close', async () => {
      this.logger.log(`Media stream socket connection closed: callSid=${callSid}`);
      
      if (geminiWs) {
        geminiWs.close();
      }

      // Record call metrics and usage logs
      const durationSec = Math.max(1, Math.round((Date.now() - startTime) / 1000));
      const durationMin = Math.ceil(durationSec / 60);

      this.logger.log(`Recording call duration: ${durationSec} seconds (${durationMin} billing minutes)`);

      if (conversation) {
        // Record phone voice minutes usage
        await this.billingService.recordUsageEvent(workspace.id, 'voice_minute_phone', durationMin, agent.id);

        // Update conversation summary
        const messageCount = await this.prisma.message.count({
          where: { conversationId: conversation.id },
        });

        await this.prisma.conversation.update({
          where: { id: conversation.id },
          data: {
            endedAt: new Date(),
            messageCount,
            durationSec,
          },
        });

        // Insert Call metrics record
        await this.prisma.call.create({
          data: {
            workspaceId: workspace.id,
            agentId: agent.id,
            callSid,
            fromNumber: conversation.visitorLabel || 'Caller',
            durationSec,
            outcome: messageCount > 2 ? 'Lead qualified / scored' : 'No message exchange',
            latencyMs: 120, // simulated
            interruptions: 0,
          },
        });
      }
    });
  }

  handleDisconnect(client: WebSocket) {
    this.logger.log('WebSocket client disconnected from media bridge.');
  }
}
