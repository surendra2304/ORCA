import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { getCommonGreetingReply, extractVisitorName, extractContactWithZod } from '../common/utils/text.utils';
import { buildChatReplyPrompt } from './chatReply.prompt';
/**
 * Lead scoring schema for structured validation of LLM outputs
 */
export const ConversationScoreSchema = z.object({
  score: z.enum(['Hot', 'Warm', 'Cold']).default('Cold'),
  intent: z.string().default('General browsing'),
  aiNote: z.string().default('Visitor engaged in conversation.'),
  name: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().min(7).max(25).nullable().optional(),
});

export type ConversationScoreResult = z.infer<typeof ConversationScoreSchema>;

/**
 * Sanitizes context by removing binary artifacts and normalizing whitespace
 * safely without complex/fragile regular expressions.
 */
export function cleanPromptContext(context: string): string {
  if (!context || !context.trim()) {
    return 'No relevant knowledge base information found.';
  }

  const clean = context
    .replace(/[\uFFFD\u0000-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F\uFEFF]/g, ' ')
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return !clean || clean === 'No relevant knowledge base information found.'
    ? 'No relevant knowledge base information found.'
    : clean;
}



@Injectable()
export class LlmService implements OnModuleInit {
  private readonly logger = new Logger(LlmService.name);
  private ai: GoogleGenAI | null = null;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey || apiKey === 'local_placeholder') {
      this.logger.warn('GEMINI_API_KEY is not configured or is a placeholder.');
    }
    this.ai = new GoogleGenAI({ apiKey: apiKey || '' });
  }

  private getClient(): GoogleGenAI {
    if (!this.ai) {
      const apiKey = this.configService.get<string>('GEMINI_API_KEY');
      this.ai = new GoogleGenAI({ apiKey: apiKey || '' });
    }
    return this.ai;
  }

  private resolveModelName(): string {
    let modelName = this.configService.get<string>('GEMINI_TEXT_MODEL') || 'gemini-3.6-flash';
    if (['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-1.5-flash'].includes(modelName)) {
      modelName = 'gemini-3.6-flash';
    }
    return modelName;
  }

  private handleLlmError(err: any): string {
    const status = err?.status || err?.statusCode;
    const code = err?.code;
    const errorMsg = err?.message || '';

    this.logger.error(`Gemini Error details:`, {
      status,
      code,
      message: errorMsg,
      stack: err?.stack,
      responseData: err?.response?.data,
    });

    if (status === 429) return "I'm currently receiving too many requests. Please try again in a moment.";
    if (status === 500 || status === 503) return 'My AI services are temporarily unavailable. Please try again later.';
    if (status === 401 || status === 403 || errorMsg.toLowerCase().includes('api key')) return 'I am not properly configured to respond at this time (Invalid API Key).';
    if (code === 'ETIMEDOUT' || code === 'ECONNABORTED' || errorMsg.toLowerCase().includes('timeout')) return 'My connection to the server timed out. Please try again.';
    if (code === 'ENOTFOUND' || code === 'ECONNREFUSED' || errorMsg.toLowerCase().includes('network') || errorMsg.toLowerCase().includes('fetch')) return "I'm having network connectivity issues. Please check your connection and try again.";
    if (errorMsg.toLowerCase().includes('parse') || errorMsg.toLowerCase().includes('json') || errorMsg.toLowerCase().includes('malformed')) return "I received an unexpected format and couldn't process your request.";
    
    return "I'm experiencing a technical issue and cannot respond right now. Please try again later.";
  }

  /**
   * Generates a grounded conversational reply based on workspace KB context and message history
   */
  async generateChatReply(
    agentName: string,
    persona: string,
    goal: string,
    captureFields: string[],
    workspaceName: string,
    context: string,
    history: { role: string; content: string }[],
    message: string,
    workspaceId?: string,
  ): Promise<string> {
    const greetingReply = getCommonGreetingReply(message);
    if (greetingReply) return greetingReply;

    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey || apiKey === 'local_placeholder') {
      return this.generateMockGroundedReply(
        message,
        context,
        agentName,
        history,
      );
    }

    const client = this.getClient();
    const modelName = this.resolveModelName();

    const apiKeyPrefix = (apiKey || '').substring(0, 8);
    const relevantContext = cleanPromptContext(context);

    this.logger.debug('Before calling Gemini:');
    this.logger.debug(`MODEL: ${modelName}`);
    this.logger.debug(`API KEY PREFIX: ${apiKeyPrefix}`);
    this.logger.debug('DOCUMENT IDS: N/A');
    this.logger.debug('TOP K: 3');
    this.logger.debug(`CONTEXT LENGTH: ${relevantContext.length}`);

    const contents = history.map((h) => ({
      role: h.role === 'visitor' ? 'user' : 'model',
      parts: [{ text: h.content }],
    }));
    contents.push({ role: 'user', parts: [{ text: message }] });

    const systemInstruction = buildChatReplyPrompt(
      agentName,
      persona,
      workspaceName,
      goal,
      captureFields,
      relevantContext
    );

    try {
      const startTime = Date.now();
      let response: any;
      try {
        response = await client.models.generateContent({
          model: modelName,
          contents,
          config: { systemInstruction, temperature: 0.2 },
        });
      } catch (genErr: any) {
        if (genErr?.status === 404 || genErr?.message?.includes('not found') || genErr?.message?.includes('no longer available')) {
          this.logger.warn(`Model ${modelName} unavailable, falling back to gemini-3.6-flash`);
          response = await client.models.generateContent({
            model: 'gemini-3.6-flash',
            contents,
            config: { systemInstruction, temperature: 0.2 },
          });
        } else {
          throw genErr;
        }
      }
      const latency = Date.now() - startTime;
      const responseText =
        response.text?.trim() || "I'm sorry, I couldn't process your request.";
      this.logger.debug(`[Gemini] Status: 200 | Latency: ${latency}ms`);
      return responseText;
    } catch (err: any) {
      const userFriendlyMsg = this.handleLlmError(err);

      const fallbackReply = this.generateMockGroundedReply(
        message,
        context,
        agentName,
        history,
      );

      if (fallbackReply.includes("I couldn't find that information")) {
        return userFriendlyMsg;
      }

      return fallbackReply;
    }
  }

  async scoreConversation(
    history: { role: string; content: string }[],
  ): Promise<{
    score: 'Hot' | 'Warm' | 'Cold';
    intent: string;
    aiNote: string;
    name?: string;
    email?: string;
    phone?: string;
  }> {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey || apiKey === 'local_placeholder') {
      return this.scoreMockConversation(history);
    }

    const client = this.getClient();
    const modelName = this.resolveModelName();
    const transcript = history
      .map((h) => `${h.role === 'visitor' ? 'Visitor' : 'AI'}: ${h.content}`)
      .join('\n');

    const prompt = `Analyze transcript and output JSON { "score": "Hot"|"Warm"|"Cold", "intent": string, "aiNote": string, "name": string|null, "email": string|null, "phone": string|null }:\n${transcript}`;

    try {
      const response = await client.models.generateContent({
        model: modelName,
        contents: prompt,
        config: { responseMimeType: 'application/json', temperature: 0.1 },
      });
      const parsedJson = JSON.parse(response.text || '{}');
      const validation = ConversationScoreSchema.safeParse(parsedJson);

      if (validation.success) {
        const result = validation.data;
        return {
          score: result.score,
          intent: result.intent,
          aiNote: result.aiNote,
          name: result.name || extractVisitorName(history),
          email: result.email || undefined,
          phone: result.phone || undefined,
        };
      }

      return this.scoreMockConversation(history);
    } catch {
      return this.scoreMockConversation(history);
    }
  }



  private generateMockGroundedReply(
    message: string,
    context: string,
    agentName: string,
    history: { role: string; content: string }[] = [],
  ): string {
    const lowerMsg = message.toLowerCase().trim();

    if (
      lowerMsg === 'what is my name' ||
      lowerMsg === "what's my name" ||
      lowerMsg === 'who am i'
    ) {
      const name = extractVisitorName(history);
      return name
        ? `Your name is ${name}!`
        : `You haven't mentioned your name yet! What is your name?`;
    }

    const greeting = getCommonGreetingReply(message);
    if (greeting) return greeting;

    const cleanContext = cleanPromptContext(context);

    if (
      !cleanContext ||
      cleanContext === 'No relevant knowledge base information found.'
    ) {
      return `I couldn't find that information in my knowledge base. If you'd like, please share your email or phone number and our team will get back to you.`;
    }

    // Clean summary from the top paragraphs of context
    const paragraphs = cleanContext
      .split('\n\n')
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    if (paragraphs.length === 0) {
      return `I couldn't find that information in my knowledge base. If you'd like, please share your email or phone number and our team will get back to you.`;
    }

    return paragraphs.slice(0, 3).join('\n\n');
  }

  private scoreMockConversation(
    history: { role: string; content: string }[],
  ): {
    score: 'Hot' | 'Warm' | 'Cold';
    intent: string;
    aiNote: string;
    name?: string;
    email?: string;
    phone?: string;
  } {
    let email: string | undefined;
    let phone: string | undefined;
    let name: string | undefined;

    const emailSchema = z.string().email();

    for (const msg of history) {
      if (msg.role === 'visitor') {
        const extractedContact = extractContactWithZod(msg.content);
        if (!email && extractedContact.email) email = extractedContact.email;
        if (!phone && extractedContact.phone) phone = extractedContact.phone;

        if (!name) {
          name = extractVisitorName([msg]);
        }
      }
    }

    const intentKeywords = ['price', 'pricing', 'trial', 'cost', 'demo', 'buy', 'sign up', 'agency'];
    const hasContact = !!(email || phone);
    const mentionsQualifiers = history.some(
      (m) =>
        m.role === 'visitor' &&
        intentKeywords.some((kw) => m.content.toLowerCase().includes(kw)),
    );

    let score: 'Hot' | 'Warm' | 'Cold' = 'Cold';
    let intent = 'Browsing / Saying hello';
    let aiNote = 'Visitor did not ask purchase queries or leave contact details.';

    if (hasContact) {
      score = 'Hot';
      intent = 'Requested direct contact / follow-up';
      aiNote = `Provided contact information (${email || phone}).`;
    } else if (mentionsQualifiers) {
      score = 'Warm';
      intent = 'Inquiring about pricing or trial features';
      aiNote = 'Asked product interest questions, but has not provided details yet.';
    }

    return {
      score,
      intent,
      aiNote,
      name,
      email,
      phone,
    };
  }
}
