export const PERSONAS = ["Friendly", "Professional", "Concise", "Enthusiastic"];

export const GOALS = [
  { id: "qualify", label: "Qualify leads", sub: "capture & score", iconName: "Users" },
  { id: "support", label: "Support", sub: "help & resolve", iconName: "Chat" },
  { id: "sales", label: "Sales", sub: "close deals", iconName: "Chat" },
  { id: "book", label: "Book a call", sub: "schedule", iconName: "Chat" },
  { id: "answer", label: "Answer questions", sub: "support", iconName: "Chat" },
  { id: "general", label: "General", sub: "general purpose", iconName: "Chat" },
];

export const VOICES = [
  { id: "vani", name: "Vani", desc: "warm, friendly", g: "♀" },
  { id: "vedant", name: "Vedant", desc: "calm, professional", g: "♂" },
  { id: "medha", name: "Medha", desc: "upbeat, energetic", g: "♀" },
  { id: "anvay", name: "Anvay", desc: "sharp, consultative", g: "♂" },
  { id: "aarya", name: "Aarya", desc: "clear, supportive", g: "♀" },
];

export const CAPTURE_FIELDS = ["name", "email", "phone"];

export const DEFAULT_MODEL = "gemini-1.5-pro";

export const LLM_MODELS = [
  { label: "Gemini 1.5 Pro (Recommended)", value: "gemini-1.5-pro", description: "Deep reasoning, 1M context, best for sales" },
  { label: "Gemini 1.5 Flash", value: "gemini-1.5-flash", description: "Ultra-fast response latency, sub-300ms speech" },
  { label: "GPT-4o (OpenAI)", value: "gpt-4o", description: "High natural language fluency" },
  { label: "Claude 3.5 Sonnet", value: "claude-3-5-sonnet", description: "Nuanced technical documentation & coding" },
];

export const LANGUAGES = [
  { label: "English (United States)", value: "en-US" },
  { label: "English (India)", value: "en-IN" },
  { label: "Hindi", value: "hi-IN" },
  { label: "Telugu", value: "te-IN" },
  { label: "Spanish (Español)", value: "es-ES" },
  { label: "French (Français)", value: "fr-FR" },
  { label: "German (Deutsch)", value: "de-DE" },
];

export const SPEAKING_SPEEDS = [
  { label: "Natural Pace", value: "natural" },
  { label: "Calm & Deliberate", value: "calm" },
  { label: "Slightly Slower", value: "slow" },
  { label: "Brisk & Energetic", value: "fast" },
];

export const TIME_RANGES = [
  { id: "24h", label: "24 Hours" },
  { id: "7d", label: "7 Days" },
  { id: "30d", label: "30 Days" },
  { id: "90d", label: "90 Days" },
];
