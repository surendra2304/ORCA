import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useLocation, CoastalPort } from '../../context/LocationContext';
import {
  Mic,
  MicOff,
  Send,
  ShieldCheck,
  Volume2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Activity,
  Wind,
  Waves,
  Compass,
  MapPin,
  RefreshCw,
  PhoneOff,
  MessageSquare,
  ArrowRight,
  X,
  ChevronDown,
} from 'lucide-react';
import { sendQuerySync, type VerdictData, type AgentOutputs } from '../../services/orcaApi';
import { AIService } from '../../services/aiService';
import { SUPPORTED_LANGUAGES, LanguageCode } from '../../i18n/translations';

// ─── Chat Message Model ───────────────────────────────────────────────────────
interface ChatTurn {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  verdict?: VerdictData | null;
  agentOutputs?: AgentOutputs | null;
  language?: string;
}

// ─── Verdict Badge Component ──────────────────────────────────────────────────
const VERDICT_STYLES: Record<string, { bg: string; text: string; border: string; icon: React.ReactNode }> = {
  GO: {
    bg: 'bg-gradient-to-r from-green-50 to-emerald-50',
    text: 'text-green-700',
    border: 'border-green-300',
    icon: <CheckCircle2 className="w-5 h-5 text-green-600" />,
  },
  CAUTION: {
    bg: 'bg-gradient-to-r from-amber-50 to-yellow-50',
    text: 'text-amber-700',
    border: 'border-amber-300',
    icon: <AlertCircle className="w-5 h-5 text-amber-600" />,
  },
  NO_GO: {
    bg: 'bg-gradient-to-r from-red-50 to-rose-50',
    text: 'text-red-700',
    border: 'border-red-300',
    icon: <AlertCircle className="w-5 h-5 text-red-600" />,
  },
  UNKNOWN: {
    bg: 'bg-gradient-to-r from-gray-50 to-slate-50',
    text: 'text-gray-600',
    border: 'border-gray-300',
    icon: <Activity className="w-5 h-5 text-gray-500" />,
  },
};

function VerdictBadge({ verdict }: { verdict: VerdictData }) {
  const style = VERDICT_STYLES[verdict.label] || VERDICT_STYLES.UNKNOWN;
  return (
    <div className={`flex items-start gap-3 p-3.5 rounded-2xl border-2 ${style.bg} ${style.border} shadow-sm my-2`}>
      <span className="mt-0.5 shrink-0">{style.icon}</span>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className={`text-base font-bold ${style.text}`}>{verdict.label}</span>
          <span className="text-[11px] px-2 py-0.5 bg-white/70 rounded-full text-slate-600 font-medium border border-slate-200/60">
            {verdict.vessel_class}
          </span>
        </div>
        <p className="text-xs sm:text-sm text-slate-700 mt-1 leading-relaxed">{verdict.summary}</p>
        {verdict.triggered_rules && verdict.triggered_rules.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {verdict.triggered_rules.map((rule, i) => (
              <span key={i} className="text-[10px] px-2 py-0.5 bg-white/90 rounded-full text-slate-600 border border-slate-200 font-medium">
                {rule}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Language Detection ───────────────────────────────────────────────────────
const detectTextLanguage = (text: string, defaultLang: string = 'en'): string => {
  if (/[\u0C00-\u0C7F]/.test(text)) return 'te'; // Telugu
  if (/[\u0900-\u097F]/.test(text)) return 'hi'; // Hindi
  if (/[\u0B80-\u0BFF]/.test(text)) return 'ta'; // Tamil
  return defaultLang;
};

// ─── Female Voice Selector (STRICTLY FEMALE) ──────────────────────────────────
const MALE_VOICE_PATTERNS = [
  'male', 'david', 'george', 'mark', 'ravi', 'mohan', 'hemant', 'stefan',
  'richard', 'sean', 'james', 'john', 'paul', 'alex', 'fred', 'daniel',
  'oliver', 'guy', 'alva', 'sam', 'bruce', 'junior', 'ralph', 'zarvox',
  'trinoids', 'deranged', 'tom', 'lee', 'pradeep', 'anand', 'amit', 'suresh',
  'microsoft mohan', 'microsoft ravi', 'microsoft david',
];

const isMaleVoice = (v: SpeechSynthesisVoice): boolean => {
  const name = v.name.toLowerCase();
  return MALE_VOICE_PATTERNS.some((m) => name.includes(m));
};

const getFemaleVoice = (lang: string = 'en', voicesList?: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  const allVoices = voicesList && voicesList.length > 0 ? voicesList : window.speechSynthesis.getVoices();
  if (!allVoices || allVoices.length === 0) return null;

  const femaleVoices = allVoices.filter((v) => !isMaleVoice(v));
  const pool = femaleVoices.length > 0 ? femaleVoices : allVoices;
  const langLower = lang.toLowerCase();

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
  }

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

  const anyFemale = pool.find(
    (v) =>
      v.name.toLowerCase().includes('female') ||
      v.name.toLowerCase().includes('zira') ||
      v.name.toLowerCase().includes('samantha')
  );
  return anyFemale || pool[0] || null;
};

// ─── Main Component ───────────────────────────────────────────────────────────
export const FishermanChatPage: React.FC = () => {
  const { language, setLanguage, t } = useApp();
  const { location, selectPort, requestLocation, availablePorts } = useLocation();
  const navigate = useNavigate();

  // Voice & Chat State
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [liveSpeechText, setLiveSpeechText] = useState('');
  const [inputText, setInputText] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatTurn[]>([]);
  const [currentTurn, setCurrentTurn] = useState<ChatTurn | null>(null);
  const [showPortSelector, setShowPortSelector] = useState(false);
  const [showLangSelector, setShowLangSelector] = useState(false);

  // Audio & Voice Refs
  const recognitionRef = useRef<any>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const silenceTimerRef = useRef<any>(null);
  const accumulatedSpeechRef = useRef<string>('');
  const sessionIdRef = useRef<string>(`session-${Date.now()}`);
  const isSpeakingRef = useRef(false);
  const isProcessingRef = useRef(false);
  const isVoiceOpenRef = useRef(false);
  const startSpeechRecognitionRef = useRef<() => void>(() => {});
  const executeQueryRef = useRef<(q: string, speak?: boolean) => Promise<void>>(async () => {});
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);


  isVoiceOpenRef.current = isVoiceOpen;
  isSpeakingRef.current = isSpeaking;
  isProcessingRef.current = isProcessing;

  // Load available browser voices
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const loadVoices = () => {
      const v = window.speechSynthesis.getVoices();
      if (v.length > 0) setAvailableVoices(v);
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  // Stop all speech synthesis and audio instantly
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

  // Browser speech synthesis fallback
  const speakWithBrowser = useCallback(
    (text: string, lang: string, onFinish?: () => void) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        if (onFinish) onFinish();
        return;
      }
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.95;
        utterance.pitch = 1.05;

        const voice = getFemaleVoice(lang, availableVoices);
        if (voice) {
          utterance.voice = voice;
          utterance.lang = voice.lang;
        } else {
          utterance.lang = lang === 'te' ? 'te-IN' : lang === 'hi' ? 'hi-IN' : 'en-IN';
        }

        utterance.onstart = () => {
          setIsSpeaking(true);
          isSpeakingRef.current = true;
        };
        utterance.onend = () => {
          setIsSpeaking(false);
          isSpeakingRef.current = false;
          if (onFinish) onFinish();
        };
        utterance.onerror = () => {
          setIsSpeaking(false);
          isSpeakingRef.current = false;
          if (onFinish) onFinish();
        };

        window.speechSynthesis.speak(utterance);
      } catch {
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        if (onFinish) onFinish();
      }
    },
    [availableVoices]
  );

  // Play audio aloud in female neural voice
  const playAudioAloud = useCallback(
    (text: string, langCode: string, onFinish?: () => void) => {
      stopAllAudio();
      const cleanText = text
        .replace(/[*#_`~\[\]()]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      if (!cleanText) {
        if (onFinish) onFinish();
        return;
      }

      const effectiveLang = langCode || detectTextLanguage(cleanText, language);

      // Instant browser synthesis for English / Hindi if female voice available
      const femaleVoice = getFemaleVoice(effectiveLang, availableVoices);
      const isInstantBrowserVoice =
        femaleVoice &&
        ((effectiveLang === 'en' && femaleVoice.lang.toLowerCase().startsWith('en')) ||
          (effectiveLang === 'hi' && femaleVoice.lang.toLowerCase().startsWith('hi')));

      if (isInstantBrowserVoice) {
        speakWithBrowser(cleanText, effectiveLang, onFinish);
        return;
      }

      // For Telugu and regional languages, stream neural audio via /api/tts
      try {
        const ttsUrl = `/api/tts?text=${encodeURIComponent(cleanText)}&language=${encodeURIComponent(effectiveLang)}`;
        const audio = new Audio();
        audio.preload = 'auto';
        currentAudioRef.current = audio;

        let hasStarted = false;
        const fallbackTimer = setTimeout(() => {
          if (!hasStarted) {
            if (currentAudioRef.current === audio) {
              try { audio.pause(); } catch {}
              currentAudioRef.current = null;
            }
            speakWithBrowser(cleanText, effectiveLang, onFinish);
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

        audio.onerror = () => {
          clearTimeout(fallbackTimer);
          if (!hasStarted) {
            currentAudioRef.current = null;
            speakWithBrowser(cleanText, effectiveLang, onFinish);
          }
        };

        audio.src = ttsUrl;
        audio.play().catch(() => {
          clearTimeout(fallbackTimer);
          if (!hasStarted) {
            currentAudioRef.current = null;
            speakWithBrowser(cleanText, effectiveLang, onFinish);
          }
        });
      } catch {
        speakWithBrowser(cleanText, effectiveLang, onFinish);
      }
    },
    [language, availableVoices, speakWithBrowser, stopAllAudio]
  );

  // ─── Execute Multi-Agent Query ───────────────────────────────────────────────
  const executeQuery = useCallback(
    async (queryText: string, shouldSpeak: boolean = true) => {
      const trimmed = queryText.trim();
      if (!trimmed) return;

      // 1. Abort any previous active query immediately
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      // 2. Stop audio & mic immediately to avoid bleeding
      stopAllAudio();
      try {
        recognitionRef.current?.stop();
      } catch {}
      setIsListening(false);
      setLiveSpeechText('');
      accumulatedSpeechRef.current = '';

      const detectedLang = detectTextLanguage(trimmed, language);
      const userTurn: ChatTurn = {
        id: `u-${Date.now()}`,
        role: 'user',
        text: trimmed,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        language: detectedLang,
      };

      setCurrentTurn(userTurn);
      setIsProcessing(true);
      isProcessingRef.current = true;

      try {
        const resp = await sendQuerySync(
          {
            text: trimmed,
            language: detectedLang,
            session_id: sessionIdRef.current,
            mode: 'real',
            lat: location.lat,
            lon: location.lon,
            location_name: location.name,
          },
          controller.signal
        );

        if (controller.signal.aborted) return;

        if (resp.session_id) {
          sessionIdRef.current = resp.session_id;
        }

        const answerText = resp.final_answer || 'Safety assessment complete.';
        const respLang = resp.language || detectedLang;

        const assistantTurn: ChatTurn = {
          id: `a-${Date.now()}`,
          role: 'assistant',
          text: answerText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          verdict: resp.verdict,
          agentOutputs: resp.agent_outputs,
          language: respLang,
        };

        setCurrentTurn(assistantTurn);
        setChatHistory((prev) => [...prev, userTurn, assistantTurn]);
        setIsProcessing(false);
        isProcessingRef.current = false;

        // Speak aloud
        if (shouldSpeak) {
          playAudioAloud(answerText, respLang, () => {
            if (isVoiceOpenRef.current && !isProcessingRef.current) {
              setTimeout(() => {
                if (isVoiceOpenRef.current && !isProcessingRef.current && !isSpeakingRef.current) {
                  startSpeechRecognitionRef.current();
                }
              }, 400);
            }
          });
        }
      } catch (err: any) {
        if (err?.name === 'AbortError' || controller.signal.aborted) return;
        console.warn('Backend query error or offline. Using client marine intelligence:', err);
        const fallbackResp = AIService.generateMarineAdvisoryResponse(
          trimmed,
          location,
          detectedLang
        );
        const assistantTurn: ChatTurn = {
          id: `a-${Date.now()}`,
          role: 'assistant',
          text: fallbackResp.final_answer,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          verdict: fallbackResp.verdict,
          agentOutputs: fallbackResp.agent_outputs,
          language: fallbackResp.language,
        };

        setCurrentTurn(assistantTurn);
        setChatHistory((prev) => [...prev, userTurn, assistantTurn]);
        setIsProcessing(false);
        isProcessingRef.current = false;

        if (shouldSpeak) {
          playAudioAloud(fallbackResp.final_answer, fallbackResp.language, () => {
            if (isVoiceOpenRef.current && !isProcessingRef.current) {
              setTimeout(() => {
                if (isVoiceOpenRef.current && !isProcessingRef.current && !isSpeakingRef.current) {
                  startSpeechRecognitionRef.current();
                }
              }, 400);
            }
          });
        }
      }
    },
    [location, language, playAudioAloud, stopAllAudio]
  );



  // ─── Speech Recognition Engine ──────────────────────────────────────────────
  const startSpeechRecognition = useCallback(() => {
    stopAllAudio();

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('Speech recognition not supported in this browser');
      return;
    }

    try {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
        recognitionRef.current = null;
      }

      const rec = new SpeechRecognition();
      recognitionRef.current = rec;
      rec.lang = language === 'te' ? 'te-IN' : language === 'hi' ? 'hi-IN' : 'en-IN';
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 1;

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onresult = (event: any) => {
        if (isSpeakingRef.current || isProcessingRef.current) return;

        let transcript = '';
        let isFinal = false;
        for (let i = 0; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript + ' ';
          if (event.results[i].isFinal) isFinal = true;
        }
        transcript = transcript.trim();

        if (transcript) {
          setLiveSpeechText(transcript);
          accumulatedSpeechRef.current = transcript;

          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

          const delay = isFinal ? 750 : 1300;
          silenceTimerRef.current = setTimeout(() => {
            const q = accumulatedSpeechRef.current.trim();
            if (!q || isSpeakingRef.current || isProcessingRef.current) return;
            if (q.length >= 2) {
              executeQueryRef.current(q, true);
            }
          }, delay);
        }
      };

      rec.onerror = (err: any) => {
        if (err.error !== 'no-speech') {
          console.warn('Speech recognition error:', err);
        }
      };

      rec.onend = () => {
        setIsListening(false);
        if (isVoiceOpenRef.current && !isSpeakingRef.current && !isProcessingRef.current) {
          setTimeout(() => {
            if (isVoiceOpenRef.current && !isSpeakingRef.current && !isProcessingRef.current) {
              try { rec.start(); } catch {}
            }
          }, 250);
        }
      };

      rec.start();
    } catch (e) {
      console.warn('Failed to start speech recognition:', e);
    }
  }, [language, stopAllAudio]);

  startSpeechRecognitionRef.current = startSpeechRecognition;
  executeQueryRef.current = executeQuery;


  // Toggle Microphone (Instant responsive stop & restart)
  const handleMicToggle = () => {
    // If speaking or processing, tapping mic CANCELS speech and immediately listens
    if (isSpeaking || isProcessing) {
      stopAllAudio();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setIsProcessing(false);
      isProcessingRef.current = false;
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      setLiveSpeechText('');
      accumulatedSpeechRef.current = '';

      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
      }
      setIsListening(false);

      setTimeout(() => {
        startSpeechRecognition();
      }, 100);
      return;
    }

    if (!isListening) {
      setIsVoiceOpen(true);
      startSpeechRecognition();
    } else {
      const text = accumulatedSpeechRef.current.trim();
      if (text.length >= 2) {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        executeQuery(text, true);
      } else {
        try { recognitionRef.current?.stop(); } catch {}
        setIsListening(false);
      }
    }
  };

  const handleEndVoiceSession = () => {
    stopAllAudio();
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
    }
    setIsListening(false);
    setIsVoiceOpen(false);
    setLiveSpeechText('');
    accumulatedSpeechRef.current = '';
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    const q = inputText.trim();
    setInputText('');
    executeQuery(q, true);
  };

  // Quick action queries
  const quickQueries = [
    {
      title: language === 'te' ? 'ఈ రోజు చేపల వేటకు వెళ్ళవచ్చా?' : 'Can I go fishing today?',
      desc: language === 'te' ? 'సముద్ర భద్రతా తనిఖీ' : 'Check safety verdict & sea conditions',
      query: language === 'te' ? 'నేను ఈ రోజు చేపల వేటకు వెళ్ళవచ్చా? సముద్రం భద్రంగా ఉందా?' : 'Can I go fishing today? Is it safe?',
      icon: <ShieldCheck className="h-5 w-5" />,
    },
    {
      title: language === 'te' ? 'సముద్ర అలలు మరియు వాతావరణం' : 'Waves & Weather forecast',
      desc: language === 'te' ? 'అలల ఎత్తు, గాలుల వేగం' : 'Current wave height & wind speed',
      query: language === 'te' ? 'ప్రస్తుత సముద్ర అలల ఎత్తు మరియు గాలి వేగం ఎంత?' : 'What is the current wave height, wind speed and weather forecast?',
      icon: <Waves className="h-5 w-5" />,
    },
    {
      title: language === 'te' ? 'చేపల లభ్యత మండలాలు (PFZ)' : 'Find nearest fishing zones',
      desc: language === 'te' ? 'ఉపగ్రహ సిఫార్సులు' : 'High productivity PFZ coordinates',
      query: language === 'te' ? 'నా స్థానానికి సమీపంలో ఉన్న అత్యుత్తమ చేపల లభ్యత మండలాలు ఎక్కడ ఉన్నాయి?' : 'Where are the nearest high productivity fishing zones to my location?',
      icon: <Compass className="h-5 w-5" />,
    },
  ];

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: VOICE MODE OVERLAY (When user is talking)
  // ─────────────────────────────────────────────────────────────────────────────
  if (isVoiceOpen) {
    return (
      <div className="min-h-svh bg-slate-900 text-white px-4 py-5 sm:px-8 sm:py-8 flex flex-col justify-between select-none">
        {/* Top bar in voice mode */}
        <div className="max-w-xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#20B2AA]/20 text-[#20B2AA]">
              <Waves className="h-4 w-4" />
            </span>
            <span>{t.voiceAssistantTitle || 'ORCA Voice AI'}</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Language toggle in voice mode */}
            <button
              onClick={() => {
                const popular: LanguageCode[] = ['te', 'en', 'hi', 'ta', 'bn'];
                const curIdx = popular.indexOf(language as any);
                const nextLang = popular[(curIdx + 1) % popular.length] || 'en';
                setLanguage(nextLang);
              }}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-[#20B2AA] rounded-full border border-slate-700 transition-colors"
              title="Cycle language"
            >
              {SUPPORTED_LANGUAGES.find(l => l.code === language)?.nativeName || 'English'}
            </button>



            <button
              onClick={handleEndVoiceSession}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300"
              aria-label="Close voice mode"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Center Microphone & Wave Animation */}
        <div className="max-w-xl mx-auto w-full my-auto text-center py-6">
          <div className="relative mx-auto mb-8 flex h-36 w-36 items-center justify-center">
            {isListening && (
              <>
                <span className="absolute h-36 w-36 rounded-full bg-[#20B2AA]/20 animate-ping" />
                <span className="absolute h-32 w-32 rounded-full bg-[#20B2AA]/30 animate-pulse" />
              </>
            )}
            {isSpeaking && (
              <span className="absolute h-36 w-36 rounded-full bg-emerald-500/30 animate-pulse" />
            )}
            <button
              onClick={handleMicToggle}
              className={`relative flex h-24 w-24 items-center justify-center rounded-full shadow-2xl transition-all active:scale-95 ${
                isSpeaking
                  ? 'bg-emerald-500 text-white'
                  : isListening
                  ? 'bg-[#20B2AA] text-white'
                  : 'bg-slate-800 text-slate-300 border-2 border-slate-700'
              }`}
              aria-label="Microphone button"
            >
              {isProcessing ? (
                <Loader2 className="h-10 w-10 animate-spin" />
              ) : isSpeaking ? (
                <Volume2 className="h-10 w-10 animate-pulse" />
              ) : (
                <Mic className="h-10 w-10" />
              )}
            </button>
          </div>

          {/* Animated Waveform */}
          <div className="mb-6 flex h-8 items-center justify-center gap-1.5" aria-hidden="true">
            {[10, 24, 16, 32, 20, 28, 14, 22, 10].map((h, i) => (
              <span
                key={i}
                className={`w-1 rounded-full transition-all duration-150 ${
                  isSpeaking ? 'bg-emerald-400' : isListening ? 'bg-[#20B2AA]' : 'bg-slate-700'
                }`}
                style={{ height: isListening || isSpeaking ? h : 4 }}
              />
            ))}
          </div>

          {/* Live Status Header */}
          <h1 className="text-2xl font-bold text-white sm:text-3xl tracking-tight">
            {isProcessing
              ? language === 'te' ? 'ఆలోచిస్తోంది...' : 'Thinking...'
              : isSpeaking
              ? language === 'te' ? 'సమాధానం చెబుతోంది...' : 'Speaking...'
              : isListening
              ? language === 'te' ? 'వింటున్నాను... మాట్లాడండి' : 'I’m listening... speak freely'
              : language === 'te' ? 'మైక్ నొక్కండి' : 'Tap the microphone to speak'}
          </h1>

          {/* Live Transcription Display */}
          {liveSpeechText && (
            <p className="mt-4 text-base font-semibold text-[#20B2AA] bg-slate-800/80 px-4 py-2 rounded-xl inline-block max-w-md border border-[#20B2AA]/30">
              “{liveSpeechText}”
            </p>
          )}

          {/* Current Turn Answer & Verdict */}
          {currentTurn && currentTurn.role === 'assistant' && (
            <div className="mt-6 text-left bg-slate-800/90 border border-slate-700 p-4 rounded-2xl max-w-lg mx-auto shadow-lg">
              {currentTurn.verdict && <VerdictBadge verdict={currentTurn.verdict} />}
              <p className="text-sm text-slate-200 mt-2 leading-relaxed whitespace-pre-wrap">
                {currentTurn.text}
              </p>
            </div>
          )}

          <p className="mx-auto mt-6 max-w-sm text-xs leading-relaxed text-slate-400">
            {language === 'te'
              ? 'మీరు ఎక్కడికి వెళ్తున్నారో చెప్పండి లేదా సముద్ర పరిస్థితులను అడగండి.'
              : 'Tell ORCA where you are heading, or ask about sea conditions and safety.'}
          </p>
        </div>

        {/* Bottom controls in voice mode */}
        <div className="max-w-xl mx-auto w-full flex items-center justify-between pt-4 border-t border-slate-800">
          <button
            onClick={handleEndVoiceSession}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs font-bold border border-red-500/30"
          >
            <PhoneOff className="w-4 h-4" />
            <span>{language === 'te' ? 'కాల్ ముగించండి' : 'End Voice Session'}</span>
          </button>

          <button
            onClick={() => {
              handleEndVoiceSession();
              navigate('/fisherman/manual');
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#20B2AA] hover:bg-[#1ca19a] text-white text-xs font-bold"
          >
            <span>{language === 'te' ? 'యాత్ర ప్రణాళిక' : 'Plan a trip'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: STANDARD MAIN CHAT VIEW (Latest UI Design)
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-svh bg-[#f8fafc] px-4 pb-32 pt-4 sm:px-8 sm:pb-36 sm:pt-6">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Top Header Bar */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-3">
            <img
              src="/orca-logo.jpg"
              alt="ORCA"
              className="h-10 w-10 rounded-full border border-slate-200 object-contain shadow-xs"
            />
            <div>
              <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <span>ORCA</span>
                <span className="text-[10px] px-2 py-0.5 bg-[#e0f5f4] text-[#20B2AA] rounded-full font-semibold">
                  Voice & Safety
                </span>
              </div>
              <div className="text-xs text-slate-500">
                {language === 'te' ? 'మీ సముద్ర రక్షణ సహచరుడు' : 'Your sea companion'}
              </div>
            </div>
          </div>

          {/* Location Badge + Language Switcher */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Location Pill */}
            <div className="relative">
              <button
                onClick={() => setShowPortSelector(!showPortSelector)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 border border-slate-200 transition-all"
              >
                <MapPin className="w-3.5 h-3.5 text-[#20B2AA]" />
                <span className="max-w-[140px] truncate">{location.name}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {/* Port Selector Dropdown */}
              {showPortSelector && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl border border-slate-200 shadow-xl p-2 z-50">
                  <div className="flex items-center justify-between px-2 py-1.5 border-b border-slate-100 mb-1">
                    <span className="text-xs font-bold text-slate-700">Select Port / Region</span>
                    <button
                      onClick={() => {
                        requestLocation();
                        setShowPortSelector(false);
                      }}
                      className="text-[11px] font-bold text-[#20B2AA] flex items-center gap-1 hover:underline"
                    >
                      <RefreshCw className="w-3 h-3" /> GPS
                    </button>
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-0.5">
                    {availablePorts.map((p: CoastalPort) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          selectPort(p);
                          setShowPortSelector(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between hover:bg-slate-50 transition-all ${
                          location.name === p.name ? 'bg-[#e0f5f4] text-[#20B2AA] font-bold' : 'text-slate-700'
                        }`}
                      >
                        <span>{p.name}</span>
                        <span className="text-[10px] text-slate-400">{p.region}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 9-Language Switcher Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowLangSelector(!showLangSelector);
                  setShowPortSelector(false);
                }}
                className="px-3 py-1.5 rounded-full bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 border border-slate-200 transition-colors flex items-center gap-1.5"
              >
                <span>{SUPPORTED_LANGUAGES.find(l => l.code === language)?.nativeName || 'English'}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {showLangSelector && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl border border-slate-200 shadow-xl p-2 z-50">
                  <div className="px-2 py-1.5 border-b border-slate-100 mb-1 text-xs font-bold text-slate-700">
                    Select Language
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-0.5">
                    {SUPPORTED_LANGUAGES.map((l) => (
                      <button
                        key={l.code}
                        onClick={() => {
                          setLanguage(l.code);
                          setShowLangSelector(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between hover:bg-slate-50 transition-all ${
                          language === l.code ? 'bg-[#e0f5f4] text-[#20B2AA] font-bold' : 'text-slate-700'
                        }`}
                      >
                        <div>
                          <div className="font-bold">{l.nativeName}</div>
                          <div className="text-[10px] text-slate-400">{l.name}</div>
                        </div>
                        {language === l.code && <CheckCircle2 className="w-3.5 h-3.5 text-[#20B2AA]" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Plan a trip */}
            <button
              onClick={() => navigate('/fisherman/manual')}
              className="px-3.5 py-1.5 rounded-full bg-[#20B2AA] hover:bg-[#1ca19a] text-xs font-bold text-white transition-all shadow-xs"
            >
              {language === 'te' ? 'యాత్ర ప్రణాళిక' : 'Plan a trip'}
            </button>

            {/* Officer Dashboard Switcher */}
            <button
              onClick={() => navigate('/others/home')}
              className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-full bg-slate-50 hover:bg-[#e0f5f4] text-xs font-semibold text-slate-600 hover:text-[#20B2AA] border border-slate-200 transition-all"
              title="Switch to Maritime Officer Dashboard"
            >
              <Compass className="w-3.5 h-3.5 text-[#20B2AA]" />
              <span>Officer Hub</span>
            </button>
          </div>
        </header>


        {/* Main Section */}
        {chatHistory.length === 0 ? (
          <main className="pt-6 sm:pt-10">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e0f5f4] text-[#20B2AA] shadow-xs">
              <Waves className="h-7 w-7" />
            </div>
            <h1 className="max-w-2xl text-2xl sm:text-4xl font-bold tracking-tight text-slate-900">
              {language === 'te' ? 'సముద్రంలో నేను మీకు ఎలా సహాయపడగలను?' : 'How can I help you at sea?'}
            </h1>
            <p className="mt-2 max-w-xl text-sm sm:text-base leading-relaxed text-slate-500">
              {language === 'te'
                ? 'సముద్ర పరిస్థితులు, భద్రతా హెచ్చరికలు లేదా చేపల వేట మండలాల గురించి ORCA ని అడగండి.'
                : 'Ask ORCA about fishing zones, sea conditions, or safety before you leave.'}
            </p>

            {/* Quick Action Prompt Cards */}
            <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {quickQueries.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => executeQuery(item.query, true)}
                  className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-xs transition-all hover:border-[#20B2AA]/50 hover:bg-[#e0f5f4]/30 active:scale-[0.99]"
                >
                  <div className="mb-3 text-[#20B2AA]">{item.icon}</div>
                  <div className="text-sm font-bold text-slate-900">{item.title}</div>
                  <div className="mt-1 text-xs leading-relaxed text-slate-500">{item.desc}</div>
                </button>
              ))}

              {/* Speak to ORCA Card */}
              <button
                onClick={() => {
                  setIsVoiceOpen(true);
                  startSpeechRecognition();
                }}
                className="rounded-2xl border border-[#20B2AA]/40 bg-gradient-to-br from-[#e0f5f4]/50 to-white p-4 text-left shadow-xs transition-all hover:border-[#20B2AA] active:scale-[0.99]"
              >
                <div className="mb-3 text-[#20B2AA]">
                  <Mic className="h-5 w-5 animate-pulse" />
                </div>
                <div className="text-sm font-bold text-slate-900">
                  {language === 'te' ? 'ORCA తో మాట్లాడండి' : 'Speak to ORCA'}
                </div>
                <div className="mt-1 text-xs leading-relaxed text-slate-500">
                  {language === 'te' ? 'వాయిస్ ద్వారా సులభంగా అడగండి' : 'Natural voice conversation in Telugu or English.'}
                </div>
              </button>
            </div>
          </main>
        ) : (
          /* Chat Conversation Stream */
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" />
                {language === 'te' ? 'సంభాషణ చరిత్ర' : 'Chat Conversation'}
              </span>
              <button
                onClick={() => {
                  stopAllAudio();
                  setChatHistory([]);
                  setCurrentTurn(null);
                }}
                className="text-[11px] font-semibold text-slate-400 hover:text-red-500"
              >
                {language === 'te' ? 'చరిత్ర తొలగించు' : 'Clear Chat'}
              </button>
            </div>

            {chatHistory.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[88%] sm:max-w-[78%] rounded-2xl p-4 shadow-xs ${
                    msg.role === 'user'
                      ? 'bg-[#20B2AA] text-white rounded-br-none'
                      : 'bg-white text-slate-800 border border-slate-200/90 rounded-bl-none'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4 mb-1">
                    <span className={`text-[10px] font-bold ${msg.role === 'user' ? 'text-white/80' : 'text-[#20B2AA]'}`}>
                      {msg.role === 'user' ? (language === 'te' ? 'మీరు' : 'You') : 'ORCA Intelligence'}
                    </span>
                    <span className={`text-[10px] ${msg.role === 'user' ? 'text-white/70' : 'text-slate-400'}`}>
                      {msg.timestamp}
                    </span>
                  </div>

                  {/* Verdict badge on assistant response */}
                  {msg.verdict && <VerdictBadge verdict={msg.verdict} />}

                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>

                  {/* Speaker Replay Button for Assistant */}
                  {msg.role === 'assistant' && (
                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                      <button
                        onClick={() => playAudioAloud(msg.text, msg.language || language)}
                        className="flex items-center gap-1 text-[11px] font-bold text-[#20B2AA] hover:underline"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>{language === 'te' ? 'వాయిస్ వినండి' : 'Listen aloud'}</span>
                      </button>

                      {msg.agentOutputs?.weather && (
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Wind className="w-3 h-3 text-slate-400" />
                          {msg.agentOutputs.weather.wind_knots} kts • Wave {msg.agentOutputs.ocean?.wave_height_m ?? 1.2}m
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isProcessing && (
              <div className="flex items-center gap-2 p-3 bg-white rounded-2xl border border-slate-200 max-w-xs shadow-xs">
                <Loader2 className="w-4 h-4 text-[#20B2AA] animate-spin" />
                <span className="text-xs font-semibold text-slate-600">
                  {language === 'te' ? 'ORCA సముద్ర విశ్లేషణ చేస్తోంది...' : 'ORCA agents reasoning...'}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────
          BOTTOM FIXED INPUT & MIC DOCK
         ───────────────────────────────────────────────────────────────────────── */}
      <div className="fixed inset-x-0 bottom-0 z-30 px-4 pb-4 sm:pb-6 bg-gradient-to-t from-[#f8fafc] via-[#f8fafc]/95 to-transparent pt-4">
        <form
          onSubmit={handleTextSubmit}
          className="mx-auto flex max-w-3xl items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl sm:rounded-full sm:px-3"
        >
          {/* Quick Voice Mode Launcher */}
          <button
            type="button"
            onClick={handleMicToggle}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-all active:scale-95 ${
              isListening
                ? 'bg-red-500 text-white animate-pulse'
                : 'bg-[#e0f5f4] text-[#20B2AA] hover:bg-[#20B2AA] hover:text-white'
            }`}
            aria-label="Toggle voice"
          >
            {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>

          {/* Text input */}
          <input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="min-w-0 flex-1 border-0 bg-transparent px-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 font-medium"
            placeholder={
              language === 'te'
                ? 'ORCA ను ఏదైనా అడగండి లేదా మాట్లాడండి...'
                : 'Ask ORCA anything about sea, weather, or zones...'
            }
          />

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!inputText.trim() || isProcessing}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#20B2AA] text-white shadow-xs hover:bg-[#1ca19a] disabled:opacity-40 transition-all active:scale-95"
            aria-label="Send message"
          >
            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </form>
      </div>
    </div>
  );
};
