import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { ArrowRight, CheckCircle2, Compass, Mic, Paperclip, Send, ShieldCheck, Waves, X } from 'lucide-react';

type Insight = 'conditions' | 'safety' | null;

export const FishermanChatPage: React.FC = () => {
  const { selectedRegion, t } = useApp();
  const navigate = useNavigate();
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [isListening, setIsListening] = useState(true);
  const [message, setMessage] = useState('');
  const [sentMessage, setSentMessage] = useState('');
  const [insight, setInsight] = useState<Insight>(null);

  const submitMessage = (event: React.FormEvent) => {
    event.preventDefault();
    if (!message.trim()) return;
    setSentMessage(message.trim());
    setInsight(null);
    setMessage('');
  };

  if (isVoiceOpen) {
    return (
      <div className="min-h-svh bg-white px-4 py-5 sm:px-8 sm:py-8">
        <div className="mx-auto flex min-h-[calc(100svh-40px)] max-w-xl flex-col">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e0f5f4] text-[#20B2AA]"><Waves className="h-4 w-4" /></span>{t.voiceAssistantTitle}</div>
            <button onClick={() => setIsVoiceOpen(false)} className="flex h-11 w-11 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100" aria-label={t.close}><X className="h-5 w-5" /></button>
          </div>
          <main className="my-auto text-center">
            <div className="relative mx-auto mb-7 flex h-28 w-28 items-center justify-center">
              {isListening && <><span className="absolute h-28 w-28 rounded-full bg-[#20B2AA]/10 animate-ping" /><span className="absolute h-24 w-24 rounded-full bg-[#20B2AA]/15" /></>}
              <button onClick={() => setIsListening((active) => !active)} className="relative flex h-20 w-20 items-center justify-center rounded-full bg-[#20B2AA] text-white shadow-lg active:scale-95" aria-label="Toggle microphone"><Mic className="h-8 w-8" /></button>
            </div>
            <div className="mb-6 flex h-6 items-center justify-center gap-1.5" aria-hidden="true">{[12, 22, 16, 28, 18, 24, 12].map((height, index) => <span key={index} className="w-1 rounded-full bg-[#20B2AA] transition-all" style={{ height: isListening ? height : 4 }} />)}</div>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">{isListening ? 'I’m listening' : 'Tap the microphone when ready'}</h1>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-slate-500">Tell ORCA where you are going, or ask about the sea and your safety.</p>
            <button onClick={() => navigate('/fisherman/manual')} className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-full bg-[#20B2AA] px-5 text-sm font-bold text-white">Plan a trip <ArrowRight className="h-4 w-4" /></button>
          </main>
          <button onClick={() => setIsVoiceOpen(false)} className="mx-auto min-h-11 px-4 text-sm font-semibold text-slate-500">Return to chat</button>
        </div>
      </div>
    );
  }

  const card = (icon: React.ReactNode, title: string, description: string, onClick: () => void) => (
    <button onClick={onClick} className="min-h-28 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-[#20B2AA]/50 hover:bg-[#e0f5f4]/40">
      <div className="mb-3 text-[#20B2AA]">{icon}</div><div className="text-sm font-bold text-slate-900">{title}</div><div className="mt-1 text-xs leading-relaxed text-slate-500">{description}</div>
    </button>
  );

  const responseTitle = insight === 'safety' ? 'Safety check' : insight === 'conditions' ? 'Sea conditions' : 'ORCA is ready to help';
  const responseText = insight === 'safety'
    ? 'Conditions are suitable for a planned trip. Confirm your departure details for a tailored safety recommendation.'
    : insight === 'conditions'
      ? `${selectedRegion.name} has calm offshore conditions in the current model. Plan your trip to see the best time and zone.`
      : `I can help with “${sentMessage}”. Start with a trip plan and I will prepare a clear recommendation.`;

  return (
    <div className="min-h-svh bg-white px-4 pb-28 pt-5 sm:px-8 sm:pb-32 sm:pt-8">
      <div className="mx-auto max-w-3xl">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2.5"><img src="/orca-logo.jpg" alt="ORCA" className="h-10 w-10 rounded-full border border-slate-100 object-contain" /><div><div className="text-sm font-bold text-slate-900">ORCA</div><div className="text-xs font-medium text-[#20B2AA]">Your sea companion</div></div></div>
          <button onClick={() => navigate('/fisherman/manual')} className="min-h-11 rounded-full border border-slate-200 px-4 text-xs font-bold text-slate-600 hover:bg-slate-50">Plan a trip</button>
        </header>
        <main className="pt-12 sm:pt-16">
          <div className="mb-7 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e0f5f4] text-[#20B2AA]"><Waves className="h-7 w-7" /></div>
          <h1 className="max-w-2xl text-3xl font-bold tracking-tight text-slate-900 sm:text-5xl">How can I help you at sea?</h1>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-slate-500">Ask ORCA about fishing zones, sea conditions, or safety before you leave.</p>
          <div className="mt-9 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {card(<Compass className="h-5 w-5" />, 'Find a fishing zone', 'Plan your trip and get one clear recommendation.', () => navigate('/fisherman/manual'))}
            {card(<Waves className="h-5 w-5" />, 'Check sea conditions', 'See a simple summary for your selected coast.', () => setInsight('conditions'))}
            {card(<ShieldCheck className="h-5 w-5" />, 'Safety & alerts', 'Check the essentials before heading offshore.', () => setInsight('safety'))}
            {card(<Mic className="h-5 w-5" />, 'Speak to ORCA', 'Ask by voice with no complicated controls.', () => setIsVoiceOpen(true))}
          </div>
          {(insight || sentMessage) && <section className="mt-6 rounded-2xl bg-[#e0f5f4] p-5 text-sm text-slate-700"><div className="flex items-start gap-3"><span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-[#20B2AA]"><CheckCircle2 className="h-4 w-4" /></span><div><div className="font-bold text-slate-900">{responseTitle}</div><p className="mt-1 leading-relaxed">{responseText}</p><button onClick={() => navigate('/fisherman/manual')} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#20B2AA] px-4 text-xs font-bold text-white">Plan my trip <ArrowRight className="h-3.5 w-3.5" /></button></div></div></section>}
        </main>
      </div>
      <form onSubmit={submitMessage} className="fixed inset-x-0 bottom-0 z-20 px-4 pb-4 sm:pb-6"><div className="mx-auto flex max-w-3xl items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_10px_35px_rgba(15,23,42,0.12)] sm:rounded-full sm:px-3"><button type="button" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100" aria-label="Add details"><Paperclip className="h-5 w-5" /></button><input value={message} onChange={(event) => setMessage(event.target.value)} className="min-w-0 flex-1 border-0 bg-transparent px-1 text-sm text-slate-800 outline-none placeholder:text-slate-400" placeholder="Ask ORCA anything…" /><button type="button" onClick={() => setIsVoiceOpen(true)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#20B2AA] hover:bg-[#e0f5f4]" aria-label="Use voice"><Mic className="h-5 w-5" /></button><button type="submit" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#20B2AA] text-white shadow-sm" aria-label="Send message"><Send className="h-4 w-4" /></button></div></form>
    </div>
  );
};
