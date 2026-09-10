import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Send,
  Sparkles,
  ShieldCheck,
  Volume2,
  VolumeX,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Activity,
  Wind,
  User,
  Cloud,
  Navigation,
  Globe,
  Star,
  PhoneOff,
  History,
  ChevronDown,
  ChevronUp,
  Sun,
  RefreshCw,
  CloudRain,
  CloudLightning,
  Thermometer,
  Droplets,
  Waves,
  Compass,
} from 'lucide-react';
import { useOrcaQuery } from '../hooks/useOrcaQuery';
import type { VerdictData, OrcaTraceStep } from '../hooks/useOrcaQuery';
import { sendQuerySync, fetchBriefing } from '../services/orcaApi';
import type { AgentOutputs, BriefingResponse } from '../services/orcaApi';
import { translations, SupportedLanguage } from '../i18n/translations';
import { useLocation } from '../context/LocationContext';

// SpeechRecognition types for browsers that support it
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

// ─── Types ───────────────────────────────────────────────────────────────────
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date | string;
  verdict?: VerdictData;
  agentData?: AgentOutputs;
  trace?: OrcaTraceStep[];
  isStreaming?: boolean;
}

interface HomeScreenProps {
  currentLanguage?: SupportedLanguage;
  onLanguageChange?: (lang: SupportedLanguage) => void;
}

// ─── Verdict Badge ────────────────────────────────────────────────────────────
const VERDICT_STYLES: Record<string, { bg: string; text: string; border: string; icon: React.ReactNode; glow: string }> = {
  GO: {
    bg: 'bg-gradient-to-r from-green-50 to-emerald-50',
    text: 'text-green-700',
    border: 'border-green-300',
    glow: 'shadow-green-200',
    icon: <CheckCircle2 className="w-5 h-5" />,
  },
  CAUTION: {
    bg: 'bg-gradient-to-r from-amber-50 to-yellow-50',
    text: 'text-amber-700',
    border: 'border-amber-300',
    glow: 'shadow-amber-200',
    icon: <AlertCircle className="w-5 h-5" />,
  },
  NO_GO: {
    bg: 'bg-gradient-to-r from-red-50 to-rose-50',
    text: 'text-red-700',
    border: 'border-red-300',
    glow: 'shadow-red-200',
    icon: <AlertCircle className="w-5 h-5" />,
  },
  UNKNOWN: {
    bg: 'bg-gradient-to-r from-gray-50 to-slate-50',
    text: 'text-gray-600',
    border: 'border-gray-300',
    glow: 'shadow-gray-200',
    icon: <Activity className="w-5 h-5" />,
  },
};

function VerdictBadge({ verdict }: { verdict: VerdictData }) {
  const style = VERDICT_STYLES[verdict.label] || VERDICT_STYLES.UNKNOWN;
  return (
    <div className={`flex items-start gap-3 p-4 rounded-2xl border-2 ${style.bg} ${style.border} shadow-lg ${style.glow}`}>
      <span className={`${style.text} mt-0.5 shrink-0`}>{style.icon}</span>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className={`text-lg font-bold ${style.text}`}>{verdict.label}</span>
          <span className="text-xs px-2 py-0.5 bg-white/60 rounded-full text-slate-600">{verdict.vessel_class}</span>
        </div>
        <p className="text-sm text-slate-700 mt-1">{verdict.summary}</p>
        {verdict.triggered_rules && verdict.triggered_rules.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {verdict.triggered_rules.map((rule, i) => (
              <span key={i} className="text-xs px-2 py-0.5 bg-white/80 rounded-full text-slate-500 border border-slate-200">
                {rule}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Streaming Trace Panel ────────────────────────────────────────────────────
function TracePanel({ steps, streaming }: { steps: OrcaTraceStep[]; streaming: boolean }) {
  if (steps.length === 0 && !streaming) return null;
  return (
    <div className="mt-2 space-y-1 border border-blue-100 rounded-xl bg-blue-50/40 p-3 max-h-[140px] overflow-y-auto">
      {steps.map((step, i) => (
        <p key={i} className="text-[11.5px] text-blue-800 leading-tight">
          {step.label}
          {step.detail ? <span className="text-blue-500 ml-1">— {step.detail.slice(0, 80)}</span> : null}
        </p>
      ))}
      {streaming && (
        <p className="text-[11.5px] text-blue-400 animate-pulse flex items-center gap-1">
          <Loader2 className="w-3 h-3 animate-spin" /> Processing...
        </p>
      )}
    </div>
  );
}

// ─── Language Detector Helper ────────────────────────────────────────────────
const detectTextLanguage = (text: string, defaultLang: SupportedLanguage = 'en'): SupportedLanguage => {
  if (/[\u0C00-\u0C7F]/.test(text)) return 'te';
  if (/[\u0900-\u097F]/.test(text)) return 'hi';
  if (/[\u0B80-\u0BFF]/.test(text)) return 'ta';
  return defaultLang;
};

// ─── Female Voice Selector (STRICTLY NO MALE VOICES) ─────────────────────────
const MALE_VOICE_PATTERNS = [
  'male',
  'david',
  'george',
  'mark',
  'ravi',
  'mohan',
  'hemant',
  'stefan',
  'richard',
  'sean',
  'james',
  'john',
  'paul',
  'alex',
  'fred',
  'daniel',
  'oliver',
  'guy',
  'alva',
  'sam',
  'bruce',
  'junior',
  'ralph',
  'zarvox',
  'trinoids',
  'deranged',
  'tom',
  'lee',
  'pradeep',
  'anand',
  'amit',
  'suresh',
  'microsoft mohan',
  'microsoft ravi',
  'microsoft david',
  'microsoft george',
  'microsoft mark',
];

const isMaleVoice = (v: SpeechSynthesisVoice): boolean => {
  const name = v.name.toLowerCase();
  return MALE_VOICE_PATTERNS.some((m) => name.includes(m));
};

const getFemaleVoice = (lang: string = 'en', voicesList?: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  const allVoices = voicesList && voicesList.length > 0 ? voicesList : window.speechSynthesis.getVoices();
  if (!allVoices || allVoices.length === 0) return null;

  // Filter out ANY male voice unconditionally
  const femaleVoices = allVoices.filter((v) => !isMaleVoice(v));
  const pool = femaleVoices.length > 0 ? femaleVoices : allVoices;

  const langLower = lang.toLowerCase();

  // 1. Language-matched female voice (Telugu, Hindi, Tamil, Bengali)
  if (langLower === 'te') {
    const teluguVoice = pool.find(
      (v) => v.lang.toLowerCase().startsWith('te') || v.name.toLowerCase().includes('telugu')
    );
    if (teluguVoice) return teluguVoice;
  } else if (langLower === 'hi') {
    const hindiVoice = pool.find(
      (v) =>
        v.lang.toLowerCase().startsWith('hi') ||
        v.name.toLowerCase().includes('hindi') ||
        v.name.toLowerCase().includes('swara')
    );
    if (hindiVoice) return hindiVoice;
  } else if (langLower === 'ta') {
    const tamilVoice = pool.find(
      (v) => v.lang.toLowerCase().startsWith('ta') || v.name.toLowerCase().includes('tamil')
    );
    if (tamilVoice) return tamilVoice;
  } else if (langLower === 'bn') {
    const bengaliVoice = pool.find(
      (v) =>
        v.lang.toLowerCase().startsWith('bn') ||
        v.name.toLowerCase().includes('bengali') ||
        v.name.toLowerCase().includes('bangla')
    );
    if (bengaliVoice) return bengaliVoice;
  }

  // 2. High-quality Indian female voice (Microsoft Heera, Google हिन्दी, Microsoft Swara, Microsoft Kalpana)
  const indianFemale = pool.find(
    (v) =>
      (v.lang.includes('IN') || v.name.toLowerCase().includes('india')) &&
      (v.name.toLowerCase().includes('heera') ||
        v.name.toLowerCase().includes('swara') ||
        v.name.toLowerCase().includes('veena') ||
        v.name.toLowerCase().includes('kalpana') ||
        v.name.toLowerCase().includes('google') ||
        v.name.toLowerCase().includes('female') ||
        v.name.toLowerCase().includes('neerja'))
  );
  if (indianFemale) return indianFemale;

  // 3. Premier natural English female voice (Microsoft Jenny, Microsoft Aria, Google UK Female, Microsoft Zira)
  const premierFemale = pool.find((v) => {
    const n = v.name.toLowerCase();
    return (
      n.includes('jenny') ||
      n.includes('aria') ||
      n.includes('heera') ||
      n.includes('zira') ||
      (v.lang.includes('en') && n.includes('female')) ||
      n.includes('samantha') ||
      n.includes('karen') ||
      n.includes('serena')
    );
  });
  if (premierFemale) return premierFemale;

  // 4. Any female voice from pool
  const anyFemale = pool.find((v) => !isMaleVoice(v) && (v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('natural') || !v.name.toLowerCase().includes('male')));
  return anyFemale && !isMaleVoice(anyFemale) ? anyFemale : null;
};

// ─── HomeScreen Component ─────────────────────────────────────────────────────
export const HomeScreen: React.FC<HomeScreenProps> = ({
  currentLanguage = 'en',
  onLanguageChange,
}) => {
  const t = translations[currentLanguage] || translations.en;
  const { location } = useLocation();

  // ── Separate Query Hook for Text Chat Bot ─────────────────────────────────
  const chatSessionIdRef = useRef<string | null>(null);
  const orcaChat = useOrcaQuery(chatSessionIdRef);

  // ── Dedicated Query Hook for Voice Bot ────────────────────────────────────
  // ── Dedicated Query Session Ref for Voice Bot ────────────────────────────
  const voiceSessionIdRef = useRef<string | null>(null);

  // ── Pre-loaded Voices for Instant, Natural Female Speech ─────────────────
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const syncVoices = () => {
      const v = window.speechSynthesis.getVoices();
      if (v && v.length > 0) setAvailableVoices(v);
    };
    syncVoices();
    window.speechSynthesis.onvoiceschanged = syncVoices;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // ── Voice Bot State (Direct & Mode-free) ──────────────────────────────────
  const [voiceSessionActive, setVoiceSessionActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceProcessing, setVoiceProcessing] = useState(false);
  const [liveSpeechText, setLiveSpeechText] = useState<string>('');

  // Current active turn (ONLY this question & response is visible)
  const [currentTurn, setCurrentTurn] = useState<{
    question: string;
    answer: string | null;
    verdict?: VerdictData | null;
    language?: SupportedLanguage;
  } | null>(null);

  // Voice session history (shown when "View Chat History" is opened)
  const [voiceHistory, setVoiceHistory] = useState<
    Array<{
      id: string;
      question: string;
      answer: string;
      verdict?: VerdictData | null;
      timestamp: string;
      language?: SupportedLanguage;
    }>
  >([]);
  const [showHistory, setShowHistory] = useState(false);

  // ── Live Open-Meteo Marine & Weather Briefing ─────────────────────────────
  const [briefing, setBriefing] = useState<BriefingResponse | null>(null);
  const [briefingLoading, setBriefingLoading] = useState<boolean>(false);
  const [lastBriefingTime, setLastBriefingTime] = useState<Date | null>(null);

  const loadBriefing = useCallback((forceRefresh: boolean = false) => {
    setBriefingLoading(true);
    fetchBriefing(location.lat, location.lon, 'small_fishing_boat', 'real', forceRefresh)
      .then((data) => {
        setBriefing(data);
        setLastBriefingTime(new Date());
      })
      .catch((err) => console.warn('Home briefing fetch error:', err))
      .finally(() => {
        setBriefingLoading(false);
      });
  }, [location.lat, location.lon]);

  useEffect(() => {
    loadBriefing(false);

    // Auto-update every 3 minutes (180,000 ms) automatically
    const intervalId = setInterval(() => {
      loadBriefing(false);
    }, 180000);

    // Auto-update when tab gains focus / visibility
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadBriefing(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [loadBriefing]);

  // Refs for speech recognition & silence detection
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const accumulatedSpeechRef = useRef<string>('');
  const voiceSessionActiveRef = useRef<boolean>(false);
  voiceSessionActiveRef.current = voiceSessionActive;
  const isSpeakingRef = useRef<boolean>(false);
  isSpeakingRef.current = isSpeaking;
  const voiceProcessingRef = useRef<boolean>(false);
  voiceProcessingRef.current = voiceProcessing;

  // Dedicated reference to active HTMLAudioElement for instant cutoff & speech control
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  // Dedicated AbortController to cancel in-flight queries when user taps mic to interrupt / re-record
  const voiceAbortControllerRef = useRef<AbortController | null>(null);

  // ── Stop all audio immediately (Neural audio + SpeechSynthesis) ───────────
  const stopAllAudio = useCallback(() => {
    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
      } catch {}
      currentAudioRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    setIsSpeaking(false);
    isSpeakingRef.current = false;
  }, []);

  // ── Chat Bot State ────────────────────────────────────────────────────────
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const pendingBotMsgIdRef = useRef<string | null>(null);

  // ── Automatic recognition language tag (supports Telugu, Hindi, Tamil, English) ──
  const getRecognitionLangTag = useCallback((): string => {
    switch (currentLanguage) {
      case 'te':
        return 'te-IN';
      case 'hi':
        return 'hi-IN';
      case 'ta':
        return 'ta-IN';
      case 'bn':
        return 'bn-IN';
      case 'en':
      default:
        return 'en-IN';
    }
  }, [currentLanguage]);

  // ── Fallback speech using browser Web Speech API with Female voice ────────
  const speakWithBrowserSynthesis = useCallback(
    (cleanText: string, effectiveLang: SupportedLanguage, onFinish?: () => void) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        if (onFinish) onFinish();
        return;
      }
      try {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(cleanText);
        utter.rate = 0.98;
        utter.pitch = 1.0;
        utter.lang =
          effectiveLang === 'te'
            ? 'te-IN'
            : effectiveLang === 'hi'
            ? 'hi-IN'
            : effectiveLang === 'ta'
            ? 'ta-IN'
            : effectiveLang === 'bn'
            ? 'bn-IN'
            : effectiveLang === 'mr'
            ? 'mr-IN'
            : 'en-IN';

        const femaleVoice = getFemaleVoice(effectiveLang, availableVoices);
        if (femaleVoice) {
          utter.voice = femaleVoice;
        }

        setIsSpeaking(true);
        isSpeakingRef.current = true;

        utter.onend = () => {
          setIsSpeaking(false);
          isSpeakingRef.current = false;
          if (onFinish) onFinish();
        };
        utter.onerror = (e) => {
          console.warn('Speech synthesis note:', e);
          setIsSpeaking(false);
          isSpeakingRef.current = false;
          if (onFinish) onFinish();
        };

        setTimeout(() => {
          window.speechSynthesis.speak(utter);
        }, 50);
      } catch (err) {
        console.error('speakWithBrowserSynthesis error:', err);
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        if (onFinish) onFinish();
      }
    },
    [availableVoices]
  );

  // ── Speak text aloud with Broadcast-Grade Neural Female Voice ─────────────
  const speakText = useCallback(
    (text: string, langCode?: SupportedLanguage, onFinish?: () => void) => {
      // 1. Immediately cut off any ongoing speech
      stopAllAudio();

      // 2. Strip markdown symbols, asterisks, hashtags, urls for natural fluid speech
      const cleanText = text
        .replace(/[*#_`~[\]()]/g, '')
        .replace(/https?:\/\/\S+/g, '')
        .replace(/(\r\n|\n|\r)/gm, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (!cleanText) {
        if (onFinish) onFinish();
        return;
      }

      const effectiveLang = langCode || detectTextLanguage(cleanText, currentLanguage);

      // 3. Pause recognition so assistant does not transcribe its own audio
      try {
        recognitionRef.current?.stop();
      } catch {}
      setIsListening(false);

      // 4. Low-Latency Female Speech Strategy:
      // If the browser already has an installed female voice for English or Hindi,
      // speak instantly via Web Speech Synthesis (0ms network delay).
      const femaleVoice = getFemaleVoice(effectiveLang, availableVoices);
      const isInstantBrowserVoice = femaleVoice && (
        (effectiveLang === 'en' && femaleVoice.lang.toLowerCase().startsWith('en')) ||
        (effectiveLang === 'hi' && (femaleVoice.lang.toLowerCase().startsWith('hi') || femaleVoice.name.toLowerCase().includes('hindi')))
      );

      if (isInstantBrowserVoice) {
        speakWithBrowserSynthesis(cleanText, effectiveLang, onFinish);
        return;
      }

      // For Telugu, Tamil, and other regional languages without built-in browser voices:
      // Stream neural audio via /api/tts with an aggressive 2.2s fallback timer
      // so fishermen NEVER experience long uncomfortable dead silences.
      try {
        const ttsUrl = `/api/tts?text=${encodeURIComponent(cleanText)}&language=${encodeURIComponent(effectiveLang)}`;
        const audio = new Audio();
        audio.preload = 'auto';
        currentAudioRef.current = audio;

        let hasStarted = false;
        const fallbackTimer = setTimeout(() => {
          if (!hasStarted) {
            console.warn('Backend neural TTS latency fallback triggered');
            if (currentAudioRef.current === audio) {
              try { audio.pause(); } catch {}
              currentAudioRef.current = null;
            }
            speakWithBrowserSynthesis(cleanText, effectiveLang, onFinish);
          }
        }, 2200);

        audio.onplaying = () => {
          hasStarted = true;
          clearTimeout(fallbackTimer);
          setIsSpeaking(true);
          isSpeakingRef.current = true;
        };

        audio.onended = () => {
          clearTimeout(fallbackTimer);
          setIsSpeaking(false);
          isSpeakingRef.current = false;
          currentAudioRef.current = null;
          if (onFinish) onFinish();
        };

        audio.onerror = (e) => {
          clearTimeout(fallbackTimer);
          if (!hasStarted) {
            console.warn('Backend neural TTS error, falling back to Web Speech:', e);
            currentAudioRef.current = null;
            speakWithBrowserSynthesis(cleanText, effectiveLang, onFinish);
          }
        };

        audio.src = ttsUrl;
        audio.play().catch((err) => {
          clearTimeout(fallbackTimer);
          if (!hasStarted) {
            console.warn('Neural audio play prevented or failed, falling back to Web Speech:', err);
            currentAudioRef.current = null;
            speakWithBrowserSynthesis(cleanText, effectiveLang, onFinish);
          }
        });
      } catch (err) {
        console.warn('Audio construction error:', err);
        speakWithBrowserSynthesis(cleanText, effectiveLang, onFinish);
      }
    },
    [currentLanguage, stopAllAudio, speakWithBrowserSynthesis, availableVoices]
  );

  // ── Submit complete voice question to ORCA backend synchronously (sub-second) ──
  const submitVoiceQuery = useCallback(
    async (query: string) => {
      // 1. Abort any previous query in-flight
      if (voiceAbortControllerRef.current) {
        voiceAbortControllerRef.current.abort();
      }
      const controller = new AbortController();
      voiceAbortControllerRef.current = controller;

      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      try {
        recognitionRef.current?.stop();
      } catch {}

      setIsListening(false);
      setLiveSpeechText('');
      accumulatedSpeechRef.current = '';

      const detectedLang = detectTextLanguage(query, currentLanguage);
      if (detectedLang !== currentLanguage && onLanguageChange) {
        onLanguageChange(detectedLang);
      }

      setCurrentTurn({
        question: query,
        answer: null,
        verdict: null,
        language: detectedLang,
      });

      setVoiceProcessing(true);
      voiceProcessingRef.current = true;

      try {
        const resp = await sendQuerySync(
          {
            text: query,
            language: detectedLang,
            session_id: voiceSessionIdRef.current || undefined,
            mode: 'real',
            lat: location.lat,
            lon: location.lon,
            location_name: location.name,
          },
          controller.signal
        );

        // If cancelled/aborted while request was in-flight, exit cleanly
        if (controller.signal.aborted) {
          return;
        }

        if (resp.session_id) {
          voiceSessionIdRef.current = resp.session_id;
        }

        const ans = resp.final_answer;
        const verd = resp.verdict;
        const respLang = (resp.language as SupportedLanguage) || detectedLang;

        setCurrentTurn({
          question: query,
          answer: ans,
          verdict: verd,
          language: respLang,
        });

        setVoiceHistory((prev) => [
          ...prev,
          {
            id: `v-${Date.now()}`,
            question: query,
            answer: ans,
            verdict: verd,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            language: respLang,
          },
        ]);

        setVoiceProcessing(false);
        voiceProcessingRef.current = false;

        // Speak aloud in FEMALE voice instantly
        speakText(ans, respLang, () => {
          if (voiceSessionActiveRef.current) {
            setTimeout(() => {
              if (voiceSessionActiveRef.current && !voiceProcessingRef.current && !isSpeakingRef.current) {
                startListening();
              }
            }, 350);
          }
        });
      } catch (err: any) {
        // If aborted by user tapping mic, exit cleanly without updating error state
        if (err?.name === 'AbortError' || controller.signal.aborted) {
          return;
        }
        console.error('submitVoiceQuery error:', err);
        setVoiceProcessing(false);
        voiceProcessingRef.current = false;
      }
    },
    [currentLanguage, onLanguageChange, speakText, location]
  );

  // ── Start listening for the user's voice ──────────────────────────────────
  const startListening = useCallback(() => {
    // Stop any ongoing speech immediately so user can talk uninterrupted
    stopAllAudio();

    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: typeof window.SpeechRecognition })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: typeof window.SpeechRecognition })
        .webkitSpeechRecognition;

    if (!SpeechRecognition) return;

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
        recognitionRef.current = null;
      }

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.lang = getRecognitionLangTag();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        // Discard speech recognition events if assistant is speaking or query is processing
        if (isSpeakingRef.current || voiceProcessingRef.current) {
          return;
        }

        let transcript = '';
        let isFinalResult = false;
        for (let i = 0; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript + ' ';
          if (event.results[i].isFinal) {
            isFinalResult = true;
          }
        }
        transcript = transcript.trim();

        if (transcript) {
          setLiveSpeechText(transcript);
          accumulatedSpeechRef.current = transcript;

          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
          }

          // Adaptive silence threshold for ultra-low latency:
          // If browser finalized sentence, submit after 700ms.
          // If still streaming interim words, wait 1300ms.
          const silenceDelay = isFinalResult ? 700 : 1300;

          silenceTimerRef.current = setTimeout(() => {
            const finalQuery = accumulatedSpeechRef.current.trim();
            if (!finalQuery || isSpeakingRef.current || voiceProcessingRef.current) return;

            if (finalQuery.length >= 2) {
              submitVoiceQuery(finalQuery);
            }
          }, silenceDelay);
        }
      };

      recognition.onerror = (err: any) => {
        if (err.error !== 'no-speech') {
          console.warn('Speech recognition warning:', err);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        if (
          voiceSessionActiveRef.current &&
          !isSpeakingRef.current &&
          !voiceProcessingRef.current
        ) {
          setTimeout(() => {
            if (voiceSessionActiveRef.current && !isSpeakingRef.current && !voiceProcessingRef.current) {
              try {
                recognition.start();
              } catch {}
            }
          }, 200);
        }
      };

      try {
        recognition.start();
      } catch (startErr) {
        console.warn('Speech recognition start retry:', startErr);
        setTimeout(() => {
          if (voiceSessionActiveRef.current && !isSpeakingRef.current && !voiceProcessingRef.current) {
            try {
              recognition.start();
            } catch {}
          }
        }, 120);
      }
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setIsListening(false);
    }
  }, [getRecognitionLangTag, stopAllAudio, submitVoiceQuery]);

  // ── Start / Toggle / Interrupt Voice Chat Session ──────────────────────────
  const handleStartVoiceChat = useCallback(() => {
    // 1. If currently PROCESSING, SPEAKING, or PLAYING:
    // The user wants to STOP the agent and RE-RECORD immediately!
    const isBusy =
      voiceProcessingRef.current ||
      isSpeakingRef.current ||
      currentAudioRef.current !== null ||
      (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.speaking);

    if (isBusy) {
      // Abort active HTTP query in flight
      if (voiceAbortControllerRef.current) {
        voiceAbortControllerRef.current.abort();
        voiceAbortControllerRef.current = null;
      }

      // Reset processing and audio states
      setVoiceProcessing(false);
      voiceProcessingRef.current = false;
      stopAllAudio();

      // Clear any pending timers and speech buffers
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      setLiveSpeechText('');
      accumulatedSpeechRef.current = '';

      // Reset active turn
      setCurrentTurn(null);

      // Cleanly abort previous recognition instance
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
        recognitionRef.current = null;
      }
      setIsListening(false);

      // Ensure voice session remains active
      setVoiceSessionActive(true);
      voiceSessionActiveRef.current = true;

      // Restart mic after 100ms hardware release window
      setTimeout(() => {
        if (voiceSessionActiveRef.current && !voiceProcessingRef.current && !isSpeakingRef.current) {
          startListening();
        }
      }, 100);
      return;
    }

    if (!voiceSessionActive) {
      setVoiceSessionActive(true);
      voiceSessionActiveRef.current = true;
      startListening();
    } else {
      if (isListening) {
        // If user already spoke text, clicking mic submits IMMEDIATELY!
        const speech = accumulatedSpeechRef.current.trim();
        if (speech.length >= 2) {
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
          submitVoiceQuery(speech);
          return;
        }
        // If no speech accumulated, cancel listening
        try {
          recognitionRef.current?.stop();
        } catch {}
        setIsListening(false);
      } else {
        startListening();
      }
    }
  }, [voiceSessionActive, isListening, startListening, stopAllAudio, submitVoiceQuery]);

  // ── End Voice Chat Session ────────────────────────────────────────────────
  const handleEndVoiceChat = useCallback(() => {
    if (voiceAbortControllerRef.current) {
      voiceAbortControllerRef.current.abort();
      voiceAbortControllerRef.current = null;
    }
    setVoiceProcessing(false);
    voiceProcessingRef.current = false;
    setVoiceSessionActive(false);
    voiceSessionActiveRef.current = false;
    setIsListening(false);
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    try {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    } catch {}
    stopAllAudio();
    setLiveSpeechText('');
    accumulatedSpeechRef.current = '';
    setShowHistory(true);
  }, [stopAllAudio]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (voiceAbortControllerRef.current) {
        voiceAbortControllerRef.current.abort();
      }
      stopAllAudio();
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      try {
        recognitionRef.current?.stop();
      } catch {}
    };
  }, [stopAllAudio]);

  // ── Update Text Chat messages when orcaChat streams ───────────────────────
  useEffect(() => {
    if (orcaChat.finalAnswer && pendingBotMsgIdRef.current) {
      const msgId = pendingBotMsgIdRef.current;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId ? { ...m, text: orcaChat.finalAnswer! } : m
        )
      );
    }
    if (orcaChat.error && pendingBotMsgIdRef.current) {
      const msgId = pendingBotMsgIdRef.current;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId ? { ...m, text: `⚠️ ${orcaChat.error}` } : m
        )
      );
      pendingBotMsgIdRef.current = null;
    }
    if (orcaChat.done && pendingBotMsgIdRef.current) {
      pendingBotMsgIdRef.current = null;
    }
  }, [orcaChat.finalAnswer, orcaChat.done, orcaChat.error]);

  // ── Scroll to bottom on new chat messages ────────────────────────────────
  useEffect(() => {
    if (messages.length > 0) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // ── Send a text chat message → ORCA API ──────────────────────────────────
  const handleSendMessage = useCallback(
    (textToSend?: string) => {
      const text = (textToSend || inputText).trim();
      if (!text) return;

      const userMsg: ChatMessage = {
        id: `usr-${Date.now()}`,
        role: 'user',
        text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      const botMsgId = `orca-${Date.now()}`;
      pendingBotMsgIdRef.current = botMsgId;
      const botMsg: ChatMessage = {
        id: botMsgId,
        role: 'assistant',
        text: '…',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, userMsg, botMsg]);
      if (!textToSend) setInputText('');

      const targetLang = detectTextLanguage(text, currentLanguage);
      orcaChat.ask(text, targetLang);
    },
    [inputText, currentLanguage, orcaChat]
  );

  // ── Evaluation criteria (uses live briefing or latest data from voice/chat) ─────────────
  const activeAgentOutputs = orcaChat.agentOutputs;
  const weatherOut = activeAgentOutputs?.weather || briefing?.weather;
  const oceanOut = activeAgentOutputs?.ocean || briefing?.ocean;
  const verdict = currentTurn?.verdict || orcaChat.verdict || briefing?.verdict;

  const waveH = oceanOut?.wave_height_m;
  const sstC = oceanOut?.sst_c;
  const seaConditionLabel = oceanOut
    ? `${t.metrics.waveHeight} ${waveH != null ? waveH.toFixed(1) : '--'}${t.metrics.meters}, SST ${sstC != null ? sstC.toFixed(1) : '--'}${t.metrics.celsius}${oceanOut.current_knots != null ? `, ${oceanOut.current_knots.toFixed(1)} kn` : ''}`
    : (briefingLoading ? t.common.loading : t.common.loading);

  const safetyLabel = verdict
    ? `${verdict.label}: ${verdict.summary || (verdict as any).reason || (verdict.label === 'GO' ? t.metrics.safeToSail : verdict.label === 'CAUTION' ? t.metrics.cautionAdvised : t.metrics.dangerStayPort)}`
    : (briefingLoading ? t.voice.processingDesc : t.voice.processingDesc);

  const curTemp = weatherOut?.temp_c ?? weatherOut?.forecast_hours?.[0]?.temp_c;
  const curDesc = weatherOut?.weather_desc ?? weatherOut?.forecast_hours?.[0]?.condition;
  const windKt = weatherOut?.wind_knots ?? weatherOut?.wind_speed_kt ?? weatherOut?.forecast_hours?.[0]?.wind_knots;
  const weatherLabel = weatherOut
    ? `${curTemp != null ? `${curTemp.toFixed(0)}°C, ` : ''}${curDesc ? `${curDesc}, ` : ''}${t.metrics.windSpeed} ${windKt != null ? windKt.toFixed(0) : '--'} ${t.metrics.knots}${weatherOut.gusts_knots != null ? ` (gusts ${weatherOut.gusts_knots.toFixed(0)} kn)` : ''}${weatherOut.lightning_risk ? `, ${weatherOut.lightning_risk} lightning` : ''}`
    : (briefingLoading ? t.common.loading : t.common.loading);

  return (
    <div className="space-y-6 pb-12" data-purpose="cards-content">
      {/* 1. Voice Bot Card */}
      <section
        className="bg-white rounded-[22px] border border-[#e5ecf4] p-6 sm:p-7 shadow-xs relative overflow-hidden"
        data-purpose="voice-bot-section"
      >
        {/* Header bar of Voice Bot Card */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-[17px] font-bold text-[#0b2545]">{t.voice.title}</h2>
            <span className="flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
              <Sparkles className="w-3 h-3 text-blue-600" />
              {t.voice.badge}
            </span>
            <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 bg-slate-100/90 border border-slate-200/80 px-2.5 py-0.5 rounded-full">
              <span className={`w-1.5 h-1.5 rounded-full ${location.isGPS ? 'bg-emerald-500 animate-ping' : 'bg-blue-500'}`} />
              📍 {location.name}
            </span>
            {voiceSessionActive && (
              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                Live
              </span>
            )}
          </div>

          {/* Right Status Controls */}
          <div className="flex items-center gap-2">
            {isSpeaking && (
              <span className="flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full animate-pulse">
                <Volume2 className="w-3.5 h-3.5" />
                {t.voice.speaking}
              </span>
            )}
            {voiceProcessing && (
              <span className="flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {t.voice.processing}
              </span>
            )}
            {voiceSessionActive && (
              <button
                type="button"
                onClick={handleEndVoiceChat}
                className="flex items-center gap-1.5 px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-full text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95"
              >
                <PhoneOff className="w-3.5 h-3.5" />
                {t.voice.stopBtn}
              </button>
            )}
          </div>
        </div>

        {/* Central Mic & Waveform Area */}
        <div className="py-4 flex flex-col items-center justify-center">
          <div className="flex items-center justify-center gap-6 sm:gap-12 w-full max-w-[620px]">
            {/* Left waveform */}
            <div aria-hidden="true" className="flex items-center gap-1 sm:gap-1.5 h-14">
              {[7, 10, 14, 12, 9, 6, 4].map((h, i) => (
                <span
                  key={i}
                  className={`w-1 sm:w-1.5 bg-[#1a6ff8] rounded-full transition-all duration-300 ${
                    isListening || isSpeaking || voiceProcessing
                      ? 'animate-pulse'
                      : ''
                  }`}
                  style={{
                    height:
                      isListening || isSpeaking || voiceProcessing
                        ? `${h * 3.5}px`
                        : `${Math.max(4, h - 2) * 2.5}px`,
                  }}
                />
              ))}
            </div>

            {/* Mic / Interrupt button */}
            <button
              type="button"
              onClick={handleStartVoiceChat}
              aria-label={
                voiceProcessing
                  ? 'Click to cancel and re-record question'
                  : isSpeaking
                  ? 'Click to stop talking and ask another question'
                  : voiceSessionActive
                  ? isListening
                    ? t.voice.listening
                    : t.voice.startBtn
                  : t.voice.startBtn
              }
              title={
                voiceProcessing
                  ? 'Click mic to cancel and re-record'
                  : isSpeaking
                  ? 'Click to stop voice & ask another question'
                  : undefined
              }
              className="relative group focus:outline-none flex items-center justify-center cursor-pointer transition-transform active:scale-95"
            >
              <div
                className={`w-[115px] h-[115px] sm:w-[124px] sm:h-[124px] rounded-full flex items-center justify-center transition-all duration-300 ${
                  isListening
                    ? 'bg-blue-100 ring-4 ring-blue-300 scale-105 animate-pulse'
                    : isSpeaking
                    ? 'bg-amber-100 ring-4 ring-amber-300 scale-105 animate-pulse'
                    : voiceProcessing
                    ? 'bg-indigo-100 ring-4 ring-indigo-300 scale-105 animate-pulse'
                    : voiceSessionActive
                    ? 'bg-emerald-100 ring-4 ring-emerald-200'
                    : 'bg-[#e3eefd] group-hover:scale-105'
                }`}
              >
                <div className="w-[90px] h-[90px] sm:w-[98px] sm:h-[98px] rounded-full bg-[#c9dffc] flex items-center justify-center">
                  <div
                    className={`w-[70px] h-[70px] sm:w-[74px] sm:h-[74px] rounded-full text-white flex items-center justify-center shadow-md shadow-blue-500/25 transition-colors ${
                      isListening
                        ? 'bg-red-500 animate-pulse'
                        : isSpeaking
                        ? 'bg-amber-500 hover:bg-amber-600'
                        : voiceProcessing
                        ? 'bg-indigo-600 hover:bg-indigo-700 animate-pulse'
                        : voiceSessionActive
                        ? 'bg-emerald-600'
                        : 'bg-[#0d6efd]'
                    }`}
                  >
                    {isSpeaking ? (
                      <VolumeX className="w-8 h-8 text-white stroke-[2]" />
                    ) : voiceProcessing ? (
                      <Loader2 className="w-8 h-8 text-white stroke-[2] animate-spin" />
                    ) : (
                      <Mic className="w-8 h-8 text-white stroke-[2]" />
                    )}
                  </div>
                </div>
              </div>
            </button>

            {/* Right waveform */}
            <div aria-hidden="true" className="flex items-center gap-1 sm:gap-1.5 h-14">
              {[4, 7, 11, 14, 9, 6, 3].map((h, i) => (
                <span
                  key={i}
                  className={`w-1 sm:w-1.5 bg-[#1a6ff8] rounded-full transition-all duration-300 ${
                    isListening || isSpeaking || voiceProcessing
                      ? 'animate-pulse'
                      : ''
                  }`}
                  style={{
                    height:
                      isListening || isSpeaking || voiceProcessing
                        ? `${h * 3.5}px`
                        : `${Math.max(4, h - 2) * 2.5}px`,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Status Label & Live Speech Preview */}
          <div className="text-center mt-4 max-w-lg">
            <p className="text-[17px] font-bold text-[#0d6efd]">
              {isListening
                ? t.voice.listening
                : voiceProcessing
                ? `${t.voice.processing} (Click mic to re-record)`
                : isSpeaking
                ? `${t.voice.speaking} (Click mic to stop & ask)`
                : voiceSessionActive
                ? t.voice.askAnother
                : t.voice.startBtn}
            </p>
            <p className="text-[13px] text-[#64748b] font-medium mt-1 leading-normal">
              {liveSpeechText ? (
                <span className="text-blue-700 font-semibold bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100 inline-block">
                  "{liveSpeechText}"
                </span>
              ) : currentTurn && !currentTurn.answer ? (
                <span className="text-slate-700 italic">"{currentTurn.question}"</span>
              ) : voiceSessionActive ? (
                t.voice.listeningDesc
              ) : (
                t.voice.hint
              )}
            </p>
          </div>

          {/* Current Turn Only: Displays the Current Question & Answer below Voice Bot */}
          {currentTurn && currentTurn.answer && (
            <div className="mt-5 w-full max-w-xl bg-gradient-to-br from-blue-50/90 to-sky-50/70 border border-blue-200/80 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3.5">
              {/* Question */}
              <div className="flex items-start gap-2.5">
                <span className="p-1.5 bg-blue-100 text-blue-700 rounded-full shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5" />
                </span>
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    {t.voice.yourQuestion}
                  </span>
                  <p className="text-[14px] font-semibold text-slate-900">{currentTurn.question}</p>
                </div>
              </div>

              {/* Answer */}
              <div className="border-t border-blue-200/60 pt-3 flex items-start gap-2.5">
                <span className="p-1.5 bg-blue-600 text-white rounded-full shrink-0 mt-0.5 shadow-2xs">
                  <Sparkles className="w-3.5 h-3.5" />
                </span>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">
                      {t.voice.orcaResponse}
                    </span>
                    <button
                      type="button"
                      onClick={() => speakText(currentTurn.answer || '', currentTurn.language)}
                      className="px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-white border border-blue-200 rounded-full hover:bg-blue-100/60 cursor-pointer shadow-2xs flex items-center gap-1"
                    >
                      <Volume2 className="w-3.5 h-3.5" /> {t.voice.replayVoice}
                    </button>
                  </div>
                  <p className="text-slate-800 leading-relaxed text-[13.5px] font-medium">
                    {currentTurn.answer}
                  </p>
                  {currentTurn.verdict && <VerdictBadge verdict={currentTurn.verdict} />}
                </div>
              </div>
            </div>
          )}

          {/* View Chat History (Available ONLY after conversation is ended) */}
          {!voiceSessionActive && voiceHistory.length > 0 && (
            <div className="mt-5 w-full max-w-xl">
              <div className="mb-2 text-center text-xs font-semibold text-slate-500 bg-slate-100/70 py-1.5 px-3 rounded-lg border border-slate-200/60">
                {t.voice.historyNotice}
              </div>
              <button
                type="button"
                onClick={() => setShowHistory((prev) => !prev)}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition-colors cursor-pointer shadow-2xs"
              >
                <span className="flex items-center gap-2">
                  <History className="w-4 h-4 text-blue-600" />
                  {showHistory ? t.voice.hideHistory : t.voice.viewHistory} ({voiceHistory.length}{' '}
                  {voiceHistory.length === 1 ? t.voice.turn : t.voice.turns})
                </span>
                {showHistory ? (
                  <ChevronUp className="w-4 h-4 text-slate-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                )}
              </button>

              {showHistory && (
                <div className="mt-2.5 p-4 bg-white border border-slate-200 rounded-2xl max-h-[340px] overflow-y-auto space-y-3 shadow-sm">
                  {voiceHistory.map((turn, index) => (
                    <div
                      key={turn.id || index}
                      className="space-y-2 pb-3 border-b border-slate-100 last:border-b-0 last:pb-0"
                    >
                      <div className="flex items-center justify-between text-[10.5px] text-slate-400">
                        <span className="font-bold text-blue-600 uppercase tracking-wider">
                          {t.voice.turn} {index + 1}
                        </span>
                        <span>{turn.timestamp}</span>
                      </div>
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="font-bold text-slate-600 text-[10.5px] block uppercase">
                          {t.voice.yourQuestion}
                        </span>
                        <p className="text-slate-800 font-semibold text-xs mt-0.5">{turn.question}</p>
                      </div>
                      <div className="p-2.5 bg-blue-50/70 rounded-xl border border-blue-100">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-blue-700 text-[10.5px] uppercase">
                            {t.voice.orcaResponse}
                          </span>
                          <button
                            type="button"
                            onClick={() => speakText(turn.answer, turn.language)}
                            className="text-[10px] text-blue-600 hover:text-blue-800 flex items-center gap-1 font-semibold cursor-pointer"
                          >
                            <Volume2 className="w-3 h-3" /> {t.voice.replayVoice}
                          </button>
                        </div>
                        <p className="text-slate-800 text-xs leading-relaxed">{turn.answer}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* 2. Chat Bot Card */}
      <section
        className="bg-white rounded-[22px] border border-[#e5ecf4] p-6 sm:p-7 shadow-xs space-y-4"
        data-purpose="chat-bot-section"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[17px] font-bold text-[#0b2545] flex items-center gap-2 flex-wrap">
              <span>{t.chat.title}</span>
              <span className="text-[11px] font-normal text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                ● Live AI
              </span>
              <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 bg-slate-100/90 border border-slate-200/80 px-2.5 py-0.5 rounded-full">
                <span className={`w-1.5 h-1.5 rounded-full ${location.isGPS ? 'bg-emerald-500 animate-ping' : 'bg-blue-500'}`} />
                📍 {location.name}
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">{t.chat.subtitle}</p>
          </div>
          {messages.length > 0 && (
            <button
              type="button"
              onClick={() => setMessages([])}
              className="text-xs font-semibold text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
            >
              {t.chat.clear}
            </button>
          )}
        </div>

        {/* Suggestion Chips */}
        <div className="space-y-2">
          <span className="block text-[12.5px] font-semibold text-[#0b2545]">
            {t.chat.suggestionsTitle}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {t.chat.suggestions.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(chip)}
                disabled={orcaChat.loading || orcaChat.streaming}
                className="px-3.5 py-1.5 text-[12px] font-medium text-[#0b2545] bg-white border border-[#d2deeb] rounded-full hover:bg-slate-50 hover:border-blue-300 hover:text-blue-600 transition-all cursor-pointer shadow-2xs active:scale-95 text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>

        {/* Error banner */}
        {orcaChat.error && (
          <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-[12px] text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {orcaChat.error}
          </div>
        )}

        {/* Conversation Thread */}
        {messages.length === 0 ? (
          <div className="border border-[#e1eaf3] rounded-2xl py-8 px-6 flex flex-col items-center justify-center text-center bg-white shadow-2xs">
            <div className="text-[#0d6efd] mb-2.5">
              <Sparkles className="w-6 h-6 fill-current" />
            </div>
            <h3 className="text-[13.5px] font-bold text-[#0b2545]">
              {t.chat.emptyNotice}
            </h3>
          </div>
        ) : (
          <div className="border border-[#e1eaf3] rounded-2xl p-4 sm:p-5 max-h-[360px] overflow-y-auto space-y-3.5 bg-slate-50/40">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[13.5px] leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#0d6efd] text-white rounded-br-xs shadow-xs'
                      : 'bg-white border border-[#e2ecf6] text-[#0b2545] rounded-bl-xs shadow-2xs'
                  }`}
                >
                  {msg.text === '…' ? (
                    <span className="flex items-center gap-1.5 text-[#64748b]">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      {t.chat.thinking}
                    </span>
                  ) : (
                    <p className="font-normal">{msg.text}</p>
                  )}
                  {/* Show verdict under ORCA messages when done */}
                  {msg.role === 'assistant' &&
                    orcaChat.done &&
                    orcaChat.verdict &&
                    msg.id === messages[messages.length - 1]?.id && (
                      <VerdictBadge verdict={orcaChat.verdict} />
                    )}
                </div>
                <span className="text-[10px] text-slate-400 mt-1 px-1">
                  {typeof msg.timestamp === 'string'
                    ? msg.timestamp
                    : msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
            {/* Live trace panel */}
            {(orcaChat.loading || orcaChat.streaming) && orcaChat.traceSteps.length > 0 && (
              <TracePanel steps={orcaChat.traceSteps} streaming={orcaChat.streaming} />
            )}
            <div ref={chatBottomRef} />
          </div>
        )}

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-3 pt-1"
        >
          <div className="relative flex-1">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={t.chat.inputPlaceholder}
              disabled={orcaChat.loading || orcaChat.streaming}
              className="w-full bg-white border border-[#d5e0ec] rounded-xl px-4 py-2.5 text-[13.5px] placeholder-[#8c9bb0] text-[#0b2545] focus:outline-none focus:border-[#0d6efd] focus:ring-1 focus:ring-[#0d6efd] shadow-2xs disabled:opacity-60"
            />
          </div>
          <button
            type="submit"
            disabled={orcaChat.loading || orcaChat.streaming || !inputText.trim()}
            className="bg-[#0d6efd] hover:bg-[#0b5ed7] text-white px-5 py-2.5 rounded-xl font-bold text-[13.5px] flex items-center gap-2 transition-all cursor-pointer shrink-0 shadow-sm shadow-blue-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {orcaChat.loading || orcaChat.streaming ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4 fill-current -rotate-45 -translate-y-0.5" />
            )}
            <span>{orcaChat.loading || orcaChat.streaming ? t.common.loading : t.chat.send}</span>
          </button>
        </form>
      </section>

      {/* 3. Live Conditions Card */}
      <section
        className="bg-white rounded-[22px] border border-[#e5ecf4] p-6 sm:p-7 shadow-xs"
        data-purpose="evaluation-criteria-section"
      >
        <h2 className="text-[16px] font-bold text-[#0d6efd] mb-4">
          {t.metrics.seaConditions}
          {activeAgentOutputs && (
            <span className="ml-2 text-[11px] font-normal text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
              ● Live Data
            </span>
          )}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-12">
          <div className="flex items-start gap-3.5">
            <div className="w-8 h-8 rounded-lg text-[#16a34a] flex items-center justify-center shrink-0">
              <Sun className="w-6 h-6 stroke-[1.9]" />
            </div>
            <div>
              <p className="text-[13.5px] font-bold text-[#0b2545] leading-snug">
                {t.metrics.seaConditions}
              </p>
              <p className="text-[12px] text-[#64748b] font-medium leading-tight mt-0.5">
                {seaConditionLabel}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                verdict?.label === 'GO'
                  ? 'text-green-600'
                  : verdict?.label === 'CAUTION'
                  ? 'text-amber-500'
                  : verdict?.label === 'NO_GO'
                  ? 'text-red-500'
                  : 'text-[#16a34a]'
              }`}
            >
              <ShieldCheck className="w-6 h-6 stroke-[1.9]" />
            </div>
            <div>
              <p className="text-[13.5px] font-bold text-[#0b2545] leading-snug">
                {t.metrics.safetyVerdict}
              </p>
              <p className="text-[12px] text-[#64748b] font-medium leading-tight mt-0.5">
                {safetyLabel}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="w-8 h-8 rounded-lg text-[#16a34a] flex items-center justify-center shrink-0">
              <Cloud className="w-6 h-6 stroke-[1.9]" />
            </div>
            <div>
              <p className="text-[13.5px] font-bold text-[#0b2545] leading-snug">
                {t.chat.title}
              </p>
              <p className="text-[12px] text-[#64748b] font-medium leading-tight mt-0.5">
                {weatherLabel}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="w-8 h-8 rounded-lg text-[#16a34a] flex items-center justify-center shrink-0">
              <Navigation className="w-6 h-6 stroke-[1.9]" />
            </div>
            <div>
              <p className="text-[13.5px] font-bold text-[#0b2545] leading-snug">Navigation</p>
              <p className="text-[12px] text-[#64748b] font-medium leading-tight mt-0.5">
                {activeAgentOutputs?.geospatial
                  ? `${activeAgentOutputs.geospatial.nearest_port_name} — ${activeAgentOutputs.geospatial.nearest_port_km.toFixed(0)}${t.metrics.km}`
                  : `${location.name} (${location.lat.toFixed(4)}° N, ${location.lon.toFixed(4)}° E)`}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="w-8 h-8 rounded-lg text-[#16a34a] flex items-center justify-center shrink-0">
              <Globe className="w-6 h-6 stroke-[1.9]" />
            </div>
            <div>
              <p className="text-[13.5px] font-bold text-[#0b2545] leading-snug">
                {t.nav.pfzAreas}
              </p>
              <p className="text-[12px] text-[#64748b] font-medium leading-tight mt-0.5">
                {activeAgentOutputs?.pfz
                  ? `${activeAgentOutputs.pfz.zones.length} active PFZ zones`
                  : 'PFZ Advisory (INCOIS Coastal Andhra)'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="w-8 h-8 rounded-lg text-[#16a34a] flex items-center justify-center shrink-0">
              <Star className="w-6 h-6 stroke-[1.9] fill-[#16a34a]/20" />
            </div>
            <div>
              <p className="text-[13.5px] font-bold text-[#0b2545] leading-snug">Overall Status</p>
              <p
                className={`text-[12px] font-bold leading-tight mt-0.5 ${
                  verdict?.label === 'GO'
                    ? 'text-green-600'
                    : verdict?.label === 'CAUTION'
                    ? 'text-amber-500'
                    : verdict?.label === 'NO_GO'
                    ? 'text-red-500'
                    : 'text-emerald-600'
                }`}
              >
                {verdict?.label === 'GO'
                  ? t.metrics.safeToSail
                  : verdict?.label === 'CAUTION'
                  ? t.metrics.cautionAdvised
                  : verdict?.label === 'NO_GO'
                  ? t.metrics.dangerStayPort
                  : t.metrics.safeToSail}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Open-Meteo Hourly Forecast & Marine Telemetry Card */}
      {weatherOut?.forecast_hours && weatherOut.forecast_hours.length > 0 && (
        <section
          className="bg-white rounded-[22px] border border-[#e5ecf4] p-6 sm:p-7 shadow-xs space-y-4"
          data-purpose="open-meteo-hourly-section"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Cloud className="w-5 h-5 stroke-[2]" />
              </span>
              <div>
                <h3 className="text-[15px] font-bold text-[#0b2545]">
                  {t.weatherCard.title}
                </h3>
                <p className="text-[11.5px] text-[#64748b]">
                  {location.name} • {t.weatherCard.predictions}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {t.weatherCard.liveApi}
              </span>
              <span className="text-[10.5px] text-slate-400">
                {lastBriefingTime
                  ? `${t.weatherCard.updated} ${lastBriefingTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                  : weatherOut.fetched_at
                  ? `${t.weatherCard.updated} ${new Date(weatherOut.fetched_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                  : t.weatherCard.realtime}
              </span>
              <button
                onClick={() => loadBriefing(true)}
                disabled={briefingLoading}
                title={t.weatherCard.forceRefresh}
                className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all disabled:opacity-40"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${briefingLoading ? 'animate-spin text-blue-600' : ''}`} />
              </button>
            </div>
          </div>

          {/* Quick Marine Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100">
              <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-semibold mb-1">
                <Thermometer className="w-3.5 h-3.5 text-amber-500" /> {t.weatherCard.airTemp}
              </div>
              <div className="text-[16px] font-bold text-slate-900">
                {weatherOut.temp_c != null ? `${weatherOut.temp_c.toFixed(1)}°C` : '--'}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {weatherOut.weather_desc || t.weatherCard.fair}
              </div>
            </div>

            <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100">
              <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-semibold mb-1">
                <Wind className="w-3.5 h-3.5 text-blue-500" /> {t.weatherCard.windGusts}
              </div>
              <div className="text-[16px] font-bold text-slate-900">
                {windKt != null ? `${windKt.toFixed(0)} kn` : '--'}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {t.weatherCard.gusts}: {weatherOut.gusts_knots != null ? `${weatherOut.gusts_knots.toFixed(0)} kn` : '--'}
              </div>
            </div>

            <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100">
              <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-semibold mb-1">
                <Waves className="w-3.5 h-3.5 text-cyan-600" /> {t.weatherCard.wavesSwell}
              </div>
              <div className="text-[16px] font-bold text-slate-900">
                {waveH != null ? `${waveH.toFixed(1)} m` : '--'}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {t.weatherCard.swell}: {oceanOut?.swell_height_m != null ? `${oceanOut.swell_height_m.toFixed(1)} m` : '--'}
              </div>
            </div>

            <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100">
              <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-semibold mb-1">
                <Droplets className="w-3.5 h-3.5 text-indigo-500" /> {t.weatherCard.rainSst}
              </div>
              <div className="text-[16px] font-bold text-slate-900">
                {weatherOut.rain_mm != null ? `${weatherOut.rain_mm.toFixed(1)} mm` : '0 mm'}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {t.weatherCard.sst}: {sstC != null ? `${sstC.toFixed(1)}°C` : '--'}
              </div>
            </div>
          </div>

          {/* 24-Hour Hourly Timeline */}
          <div>
            <div className="text-[12px] font-bold text-slate-700 mb-2 flex items-center justify-between">
              <span>{t.weatherCard.hourlyTimeline}</span>
              <span className="text-[11px] text-slate-400 font-normal">{t.weatherCard.scrollHorizontal}</span>
            </div>
            <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-thin">
              {weatherOut.forecast_hours.map((h, i) => {
                const hourFormatted = `${h.hour % 12 === 0 ? 12 : h.hour % 12} ${h.hour >= 12 ? 'PM' : 'AM'}`;
                const isRainy = (h.rain_mm || 0) > 0.2;
                const isWindy = (h.wind_knots || 0) >= 15;
                return (
                  <div
                    key={i}
                    className={`min-w-[84px] rounded-xl p-2.5 border text-center flex flex-col items-center justify-between shrink-0 transition-all ${
                      isWindy
                        ? 'bg-amber-50/60 border-amber-200'
                        : isRainy
                        ? 'bg-blue-50/60 border-blue-200'
                        : 'bg-slate-50/50 border-slate-100'
                    }`}
                  >
                    <span className="text-[11px] font-bold text-slate-600 mb-1">{hourFormatted}</span>
                    <div className="my-1">
                      {h.condition?.toLowerCase().includes('thunder') ? (
                        <CloudLightning className="w-5 h-5 text-amber-500" />
                      ) : isRainy ? (
                        <CloudRain className="w-5 h-5 text-blue-500" />
                      ) : (
                        <Sun className="w-5 h-5 text-amber-400" />
                      )}
                    </div>
                    <span className="text-[12px] font-extrabold text-slate-900 mt-0.5">
                      {h.temp_c != null ? `${Math.round(h.temp_c)}°` : '--'}
                    </span>
                    <div className="text-[10px] text-slate-500 font-semibold mt-1">
                      💨 {Math.round(h.wind_knots || 0)} kn
                    </div>
                    {isRainy && (
                      <div className="text-[9.5px] font-bold text-blue-600 mt-0.5">
                        💧 {h.rain_mm.toFixed(1)}mm
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
