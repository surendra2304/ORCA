import { z } from 'zod';

export const COMMON_GREETING_RESPONSES: Record<string, string> = {
  hi: 'Hello! How can I help you today?',
  hello: 'Hello! How can I help you today?',
  hey: 'Hello! How can I help you today?',
  heyy: 'Hello! How can I help you today?',
  hlo: 'Hello! How can I help you today?',
  greetings: 'Hello! How can I help you today?',
  howdy: 'Hello! How can I help you today?',
  sup: 'Hello! How can I help you today?',
  yo: 'Hello! How can I help you today?',
  'good morning': 'Good morning! How can I assist you today?',
  'good afternoon': 'Good afternoon! How can I assist you today?',
  'good evening': 'Good evening! How can I assist you today?',
  'hi there': 'Hello! How can I help you today?',
  'hey there': 'Hello! How can I help you today?',
  'hello there': 'Hello! How can I help you today?',
  'thank you': "You're very welcome! Let me know if there's anything else I can help with.",
  thanks: "You're very welcome! Let me know if there's anything else I can help with.",
  thx: "You're very welcome! Let me know if there's anything else I can help with.",
  bye: 'Goodbye! Have a wonderful day!',
  goodbye: 'Goodbye! Have a wonderful day!',
  cya: 'Goodbye! Have a wonderful day!',
  'how are you': "I'm doing great, thank you! How can I assist you today?",
  'how are you doing': "I'm doing great, thank you! How can I assist you today?",
  'nice to meet you': 'Nice to meet you too! How can I help you today?',
  'pleasure to meet you': 'Pleasure to meet you too! How can I help you today?',
};

const CONVERSATIONAL_PHRASES = new Set(Object.keys(COMMON_GREETING_RESPONSES));

export function isConversationalMessage(message: string): boolean {
  if (!message) return false;
  const normalized = message
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
  return CONVERSATIONAL_PHRASES.has(normalized);
}

export function getCommonGreetingReply(message: string): string | null {
  if (!message) return null;
  const normalized = message
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
  return COMMON_GREETING_RESPONSES[normalized] || null;
}

const EmailSchema = z.string().email();

export function extractContactWithZod(message: string): {
  email?: string;
  phone?: string;
} {
  if (!message) return {};
  const words = message.split(/\s+/);
  let email: string | undefined;
  let phone: string | undefined;

  for (const word of words) {
    const cleanWord = word.replace(/^[<([{'"]+|[>)\],.'"}]+$/g, '');
    if (!email) {
      const parsed = EmailSchema.safeParse(cleanWord);
      if (parsed.success) {
        email = parsed.data;
      }
    }
  }

  const digitSequence = message.replace(/[^\d+]/g, '');
  if (digitSequence.length >= 7 && digitSequence.length <= 15) {
    phone = digitSequence;
  }

  return { email, phone };
}

export function extractVisitorName(
  history: { role: string; content: string }[],
): string | undefined {
  for (const msg of history) {
    if (msg.role === 'visitor') {
      const text = msg.content.trim();
      const lower = text.toLowerCase();
      if (lower.startsWith('my name is ')) {
        const name = text.slice(11).trim();
        if (name && name.length <= 40) return name;
      } else if (lower.startsWith('i am ')) {
        const name = text.slice(5).trim();
        if (name && name.length <= 40) return name;
      } else if (lower.startsWith("i'm ")) {
        const name = text.slice(4).trim();
        if (name && name.length <= 40) return name;
      }
    }
  }
  return undefined;
}
