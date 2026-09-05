import { Logger } from '@nestjs/common';
import { GoogleGenAI, LiveConnectConfig, Modality, Type } from '@google/genai';
import { KbService } from '../kb/kb.service';

export interface IGeminiLiveSession {
  sendClientContent(content: any): void;
  sendToolResponse(response: any): void;
  sendRealtimeInput(input: any): void;
  close(): void;
  conn?: any;
}

export class VobizGeminiSession {
  private readonly logger = new Logger(VobizGeminiSession.name);
  private session: IGeminiLiveSession | null = null;
  private onAudioOutputCb?: (pcmBase64: string) => void;
  private onTextOutputCb?: (text: string) => void;
  private onEndCb?: () => void;
  private closed = false;
  private messageCount = 0;

  constructor(
    private readonly apiKey: string,
    private readonly voiceModel: string,
    private readonly kbService: KbService,
    private readonly workspaceId: string,
    private readonly systemInstruction: string,
    private readonly voiceName: string,
    private readonly inputSampleRate: number = 16000,
    private readonly initialTriggerText?: string,
  ) {}

  onAudioOutput(cb: (pcmBase64: string) => void) {
    this.onAudioOutputCb = cb;
  }

  onTextOutput(cb: (text: string) => void) {
    this.onTextOutputCb = cb;
  }

  onEnd(cb: () => void) {
    this.onEndCb = cb;
  }

  sendUserTextTurn(text: string) {
    if (this.session && !this.closed && text?.trim()) {
      this.logger.log(`Prompting Gemini Live with finalized user turn: "${text}"`);
      try { this.session.sendClientContent({ turns: [{ role: 'user', parts: [{ text: text.trim() }] }], turnComplete: true }); }
      catch (e: any) { this.logger.error(`Error sending user turn: ${e.message}`); }
    }
  }

  async connect() {
    this.logger.log(`Connecting to Gemini Live... model=${this.voiceModel}, inputRate=${this.inputSampleRate}`);
    const client = new GoogleGenAI({ apiKey: this.apiKey, httpOptions: { apiVersion: 'v1alpha' } });

    this.session = await client.live.connect({
      model: this.voiceModel,
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: this.voiceName || 'Kore' } } },
        systemInstruction: { parts: [{ text: this.systemInstruction }] },
        tools: [{ functionDeclarations: [{ name: 'query_knowledge_base', description: "Query the company's knowledge base for policies, terms of service, shipping information, FAQs, and general customer guidelines.", parameters: { type: Type.OBJECT, properties: { query: { type: Type.STRING, description: "The customer's question or search query" } }, required: ['query'] } }] }],
      },
      callbacks: {
        onopen: () => this.logger.log('Gemini Live WebSocket opened'),
        onmessage: (m: any) => this.handleMessage(m),
        onerror: (e: any) => this.logger.error(`Gemini Live error: ${JSON.stringify(e)}`),
        onclose: (e: any) => {
          this.logger.log(`Gemini Live session closed: ${JSON.stringify(e)}`);
          if (this.onEndCb && !this.closed) this.onEndCb();
        },
      },
    });

    this.logger.log('Gemini Live session connected successfully');
    this.session.sendClientContent({ turns: [{ role: 'user', parts: [{ text: this.initialTriggerText || 'The user has just joined the phone call. Please speak your greeting now.' }] }] });
  }

  private async handleMessage(message: any) {
    this.messageCount++;
    try {
      if (this.messageCount <= 5) this.logger.log(`Gemini message #${this.messageCount}: keys=[${Object.keys(message || {}).join(',')}]`);

      for (const part of message.serverContent?.modelTurn?.parts || []) {
        if (part.text && this.onTextOutputCb) this.onTextOutputCb(part.text);
        if (part.inlineData?.data && this.onAudioOutputCb) this.onAudioOutputCb(part.inlineData.data);
      }

      const functionCalls = message.toolCall?.functionCalls || [];
      const responses: any[] = [];
      for (const call of functionCalls) {
        if (call.name === 'query_knowledge_base') {
          const query = call.args?.query;
          this.logger.log(`Executing tool: query_knowledge_base, query="${query}"`);
          let resultText = "No relevant information found.";
          if (query && this.workspaceId) {
            try {
              const kbResult = await this.kbService.queryKb(this.workspaceId, query, 3, 0.35);
              if (kbResult.grounded) resultText = kbResult.context;
            } catch (e) { this.logger.error('KB query error:', e); }
          }
          responses.push({ id: call.id, name: call.name, response: { result: resultText } });
        }
      }
      if (responses.length > 0 && this.session) this.session.sendToolResponse({ functionResponses: responses });
    } catch (e: any) { this.logger.error(`Error handling Gemini message: ${e.message}`); }
  }

  sendAudioChunk(pcmBase64: string) {
    if (!this.session || this.closed) return;
    let data = pcmBase64, rate = this.inputSampleRate;
    if (rate === 8000) {
      const buf = Buffer.from(pcmBase64, 'base64'), inLen = Math.floor(buf.length / 2);
      const up = Buffer.allocUnsafe(inLen * 4);
      for (let i = 0; i < inLen; i++) {
        const u16 = Math.max(-32768, Math.min(32767, Math.round(buf.readInt16LE(i * 2) * 1.4))) & 0xffff;
        up.writeInt32LE(u16 | (u16 << 16), i * 4);
      }
      data = up.toString('base64');
      rate = 16000;
    }
    this.session.sendRealtimeInput([{ mimeType: `audio/pcm;rate=${rate}`, data }]);
  }

  close() {
    this.closed = true;
    if (this.session) { try { this.session.close(); } catch {} this.session = null; }
  }
}
