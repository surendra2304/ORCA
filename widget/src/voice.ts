import { GoogleGenAI, LiveServerMessage } from '@google/genai';

export const ConnectionState = {
  DISCONNECTED: 'DISCONNECTED',
  CONNECTING: 'CONNECTING',
  CONNECTED: 'CONNECTED',
  ERROR: 'ERROR',
} as const;

export type ConnectionState = typeof ConnectionState[keyof typeof ConnectionState];

export interface VoiceMessage {
  role: 'user' | 'model';
  content: string;
}

const WORKLET_CODE = `
class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 512;
    this.buffer = new Float32Array(this.bufferSize);
    this.index = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || input.length === 0) return true;
    const channel = input[0];

    for (let i = 0; i < channel.length; i++) {
      this.buffer[this.index++] = channel[i];
      if (this.index >= this.bufferSize) {
        this.port.postMessage({ type: 'audio', data: this.buffer });
        this.buffer = new Float32Array(this.bufferSize);
        this.index = 0;
      }
    }
    return true;
  }
}
registerProcessor('pcm-processor', PCMProcessor);
`;

export class VoiceSession {
  private session: any = null;
  private connectionState: ConnectionState = ConnectionState.DISCONNECTED;
  private inputAudioContext: AudioContext | null = null;
  private playbackAudioContext: AudioContext | null = null;
  private inputWorkletNode: AudioWorkletNode | null = null;
  private mediaStream: MediaStream | null = null;
  private nextPlayTime = 0;

  private transcript: VoiceMessage[] = [];
  private currentInputTx = '';
  private currentOutputTx = '';

  private onStateChange: (state: ConnectionState) => void;
  private onTranscriptUpdate: (transcript: VoiceMessage[]) => void;
  private onEnd: (transcript: VoiceMessage[]) => void;
  private apiBaseUrl: string;

  private refreshTimeout: any = null;
  private isReconnecting = false;
  private kbCache = new Map<string, string>();
  private activeAudioNodes: AudioBufferSourceNode[] = [];

  constructor(options: {
    apiBaseUrl: string;
    onStateChange: (state: ConnectionState) => void;
    onTranscriptUpdate: (transcript: VoiceMessage[]) => void;
    onEnd: (transcript: VoiceMessage[]) => void;
  }) {
    this.apiBaseUrl = options.apiBaseUrl;
    this.onStateChange = options.onStateChange;
    this.onTranscriptUpdate = options.onTranscriptUpdate;
    this.onEnd = options.onEnd;
  }

  private updateState(state: ConnectionState) {
    this.connectionState = state;
    this.onStateChange(state);
  }

  private updateMessage(role: 'user' | 'model', content: string, isFinal: boolean) {
    if (isFinal && content.trim()) {
      this.transcript.push({ role, content });
      this.onTranscriptUpdate([...this.transcript]);
    } else if (!isFinal) {
      this.onTranscriptUpdate([...this.transcript, { role, content }]);
    }
  }

  async start(agentId: string, workspacePublicKey: string) {
    if (this.connectionState === ConnectionState.CONNECTING || this.connectionState === ConnectionState.CONNECTED) {
      return;
    }

    try {
      this.updateState(ConnectionState.CONNECTING);
      this.transcript = [];
      this.currentInputTx = '';
      this.currentOutputTx = '';
      this.nextPlayTime = 0;
      this.activeAudioNodes = [];
      this.kbCache.clear();

      // 1. Fetch public voice token
      const res = await fetch(`${this.apiBaseUrl}/public/voice/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, workspacePublicKey }),
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch public voice token: ${res.statusText}`);
      }

      const { token, model } = await res.json();

      // 2. Initialize Web Audio Contexts
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.inputAudioContext = new AudioContextClass({ sampleRate: 16000 });
      this.playbackAudioContext = new AudioContextClass();

      // Pre-warm playback audio context immediately
      if (this.playbackAudioContext.state === 'suspended') {
        this.playbackAudioContext.resume().catch(() => {});
      }

      // 3. Load AudioWorklet from blob
      const blob = new Blob([WORKLET_CODE], { type: 'application/javascript' });
      const workletUrl = URL.createObjectURL(blob);
      await this.inputAudioContext.audioWorklet.addModule(workletUrl);

      // 4. Request mic permission
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // 5. Connect to Google GenAI Live Socket
      const ai = new GoogleGenAI({
        apiKey: token,
        httpOptions: { apiVersion: 'v1alpha' }
      });

      this.session = await ai.live.connect({
        model,
        callbacks: {
          onopen: () => {
            console.log('[VoiceSession] Live connection established');
            this.updateState(ConnectionState.CONNECTED);

            if (this.playbackAudioContext && this.playbackAudioContext.state === 'suspended') {
              this.playbackAudioContext.resume().catch(() => {});
            }

            // Connect microphone to AudioWorklet
            if (this.inputAudioContext && this.mediaStream) {
              const source = this.inputAudioContext.createMediaStreamSource(this.mediaStream);
              this.inputWorkletNode = new AudioWorkletNode(this.inputAudioContext, 'pcm-processor');

              this.inputWorkletNode.port.onmessage = (e) => {
                if (this.connectionState !== ConnectionState.CONNECTED || !this.session) return;

                const message = e.data;
                if (message.type === 'audio') {
                  const inputData = message.data as Float32Array;
                  const pcmBlob = this.createPcmBlob(inputData);
                  try {
                    this.session.sendRealtimeInput({ media: pcmBlob });
                  } catch (err) {
                    console.warn('[VoiceSession] Error sending audio:', err);
                  }
                }
              };

              source.connect(this.inputWorkletNode);
              this.inputWorkletNode.connect(this.inputAudioContext.destination);
            }
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle Barge-in / Interruption
            if (message.serverContent?.interrupted) {
              this.currentOutputTx = '';
              
              // Stop all currently playing audio nodes instantly
              this.activeAudioNodes.forEach(node => {
                try { node.stop(); } catch (e) {}
              });
              this.activeAudioNodes = [];
              
              // Reset queue time to now so new speech starts immediately
              if (this.playbackAudioContext) {
                this.nextPlayTime = this.playbackAudioContext.currentTime;
              }
            }

            // Handle tool callbacks (RAG) with fast caching & timeout
            if (message.toolCall?.functionCalls) {
              for (const functionCall of message.toolCall.functionCalls) {
                const { name, args } = functionCall;
                if (name === 'query_knowledge_base') {
                  const query = (args as any).query;
                  let responseText = 'No specific information was found.';

                  if (this.kbCache.has(query)) {
                    responseText = this.kbCache.get(query)!;
                  } else {
                    try {
                      const controller = new AbortController();
                      const timeoutId = setTimeout(() => controller.abort(), 3000);
                      const kbRes = await fetch(`${this.apiBaseUrl}/kb/public/query`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ q: query, workspacePublicKey }),
                        signal: controller.signal,
                      });
                      clearTimeout(timeoutId);
                      if (kbRes.ok) {
                        const kbData = await kbRes.json();
                        if (kbData && kbData.context) {
                          responseText = kbData.context;
                          this.kbCache.set(query, responseText);
                        }
                      }
                    } catch (err) {
                      console.error('[VoiceSession] KB query error or timeout:', err);
                    }
                  }

                  try {
                    await this.session.sendToolResponse({
                      functionResponses: [{
                        id: functionCall.id,
                        name: name,
                        response: { result: responseText }
                      }]
                    });
                  } catch (err) {
                    console.error('[VoiceSession] Send tool response error:', err);
                  }
                }
              }
            }

            // Handle Audio Playback
            if (message.serverContent?.modelTurn?.parts) {
              for (const part of message.serverContent.modelTurn.parts) {
                if (part.inlineData && part.inlineData.mimeType?.startsWith('audio/pcm')) {
                  const pcmData = part.inlineData.data;
                  if (pcmData) {
                    this.playPCMChunk(pcmData);
                  }
                }
              }
            }

            // Handle transcripts
            const inputTx = message.serverContent?.inputTranscription;
            if (inputTx?.text) {
              this.currentInputTx += inputTx.text;
              this.updateMessage('user', this.currentInputTx, false);
            }

            const outputTx = message.serverContent?.outputTranscription;
            if (outputTx?.text) {
              const textChunk = outputTx.text.replace(/[\*\[\]]/g, '');
              this.currentOutputTx += textChunk;
              this.updateMessage('model', this.currentOutputTx, false);
            }

            if (message.serverContent?.turnComplete) {
              if (this.currentInputTx) {
                this.updateMessage('user', this.currentInputTx, true);
                this.currentInputTx = '';
              }
              if (this.currentOutputTx) {
                this.updateMessage('model', this.currentOutputTx, true);
                this.currentOutputTx = '';
              }
            }
          },
          onclose: () => {
            console.log('[VoiceSession] Socket closed');
            this.teardown();
          },
          onerror: (err) => {
            console.error('[VoiceSession] Socket error:', err);
            this.updateState(ConnectionState.ERROR);
            this.teardown();
          }
        }
      });
    } catch (err: any) {
      console.error('[VoiceSession] Start failed:', err);
      this.updateState(ConnectionState.ERROR);
      this.teardown();
    }
  }

  stop() {
    this.teardown();
  }

  private teardown() {
    try { this.inputWorkletNode?.disconnect(); } catch (e) {}
    this.inputWorkletNode = null;

    this.mediaStream?.getTracks().forEach((track) => track.stop());
    this.mediaStream = null;

    if (this.inputAudioContext?.state !== 'closed') this.inputAudioContext?.close().catch(() => {});
    this.inputAudioContext = null;

    if (this.playbackAudioContext?.state !== 'closed') this.playbackAudioContext?.close().catch(() => {});
    this.playbackAudioContext = null;

    try { this.session?.close(); } catch (e) {}
    this.session = null;

    this.updateState(ConnectionState.DISCONNECTED);
    this.onEnd([...this.transcript]);
  }

  private createPcmBlob(data: Float32Array) {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      const s = Math.max(-1, Math.min(1, data[i]));
      int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return {
      data: this.base64Encode(new Uint8Array(int16.buffer)),
      mimeType: 'audio/pcm;rate=16000',
    };
  }

  private async playPCMChunk(base64PCM: string) {
    try {
      const bytes = this.base64Decode(base64PCM);
      const int16Data = new Int16Array(bytes.buffer);
      const float32Data = new Float32Array(int16Data.length);
      for (let i = 0; i < int16Data.length; i++) {
        float32Data[i] = int16Data[i] / 32768.0;
      }

      let ctx = this.playbackAudioContext;
      if (!ctx || ctx.state === 'closed') return;

      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const buffer = ctx.createBuffer(1, float32Data.length, 24000);
      buffer.getChannelData(0).set(float32Data);

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);

      source.onended = () => {
        this.activeAudioNodes = this.activeAudioNodes.filter(n => n !== source);
      };
      this.activeAudioNodes.push(source);

      const now = ctx.currentTime;
      if (this.nextPlayTime < now) {
        this.nextPlayTime = now;
      }
      source.start(this.nextPlayTime);
      this.nextPlayTime += buffer.duration;
    } catch (e) {
      console.error('[VoiceSession] Playback error:', e);
    }
  }

  private base64Encode(bytes: Uint8Array): string {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64Decode(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }
}
