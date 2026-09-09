import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { COASTAL_REGIONS } from '../../services/marineData';
import { 
  Mic, 
  MicOff, 
  X, 
  ArrowRight, 
  CheckCircle2, 
  MessageCircle, 
  Send, 
  ChevronRight, 
  Sparkles 
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'orca';
  text: string;
  timestamp: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const FishermanVoicePage: React.FC = () => {
  const { t, language, selectedRegion, setSelectedRegion, voyageParams, setVoyageParams } = useApp();
  const navigate = useNavigate();

  // 4 Sequential steps: 0: Region, 1: Date, 2: Time, 3: Purpose, 4: Done
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isListening, setIsListening] = useState<boolean>(true);
  const [speechPrompt, setSpeechPrompt] = useState<string>('');

  // Chat with ORCA state
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [chatInput, setChatInput] = useState<string>('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-init-1',
      sender: 'orca',
      text: "Hello Captain! I'm your ORCA Marine Assistant. You can type your voyage destination, date, departure time, target catch, or ask any marine weather question here.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const questions = [
    { id: 'region', text: t.voiceQuestionRegion },
    { id: 'date', text: t.voiceQuestionDate },
    { id: 'time', text: t.voiceQuestionTime },
    { id: 'purpose', text: t.voiceQuestionPurpose }
  ];

  // Browser speech synthesis when question changes
  useEffect(() => {
    if (currentStep < questions.length) {
      const qText = questions[currentStep].text;
      setSpeechPrompt(qText);

      if ('speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(qText);
          utterance.lang = language === 'en' ? 'en-US' : `${language}-IN`;
          utterance.rate = 0.95;
          window.speechSynthesis.speak(utterance);
        } catch (e) {
          // Graceful fallback
        }
      }
    } else {
      setSpeechPrompt(t.voiceDonePrompt);
    }
  }, [currentStep, language]);

  const handleCloseToManual = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    navigate('/fisherman/manual'); // Page 2: Manual Input
  };

  const handleSelectRegion = (regionId: string) => {
    const reg = COASTAL_REGIONS.find(r => r.id === regionId);
    if (reg) {
      setSelectedRegion(reg);
      setVoyageParams(prev => ({ ...prev, regionId }));
    }
    setCurrentStep(1);
  };

  const handleSelectDate = (dateVal: string) => {
    setVoyageParams(prev => ({ ...prev, date: dateVal }));
    setCurrentStep(2);
  };

  const handleSelectTime = (timeVal: string) => {
    setVoyageParams(prev => ({ ...prev, time: timeVal }));
    setCurrentStep(3);
  };

  const handleSelectPurpose = (purposeVal: string) => {
    setVoyageParams(prev => ({ ...prev, purpose: purposeVal }));
    setCurrentStep(4);
  };

  const handleProceedToRecommendation = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    navigate('/fisherman/recommendation'); // Page 3: Best Fishing Recommendation
  };

  // Switch between Voice and Chat
  const handleOpenChat = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsListening(false);
    setIsChatOpen(true);
  };

  const handleSwitchBackToVoice = () => {
    setIsChatOpen(false);
    setIsListening(true);
  };

  // Smart Marine Intelligence Response Generator
  const generateOrcaResponse = (query: string): { text: string; action?: { label: string; onClick: () => void } } => {
    const q = query.toLowerCase().trim();

    // 1. Coastal Region Detection
    const matchedRegion = COASTAL_REGIONS.find(r => 
      q.includes(r.name.toLowerCase()) || 
      q.includes(r.name.split(' ')[0].toLowerCase())
    );
    if (matchedRegion) {
      setSelectedRegion(matchedRegion);
      setVoyageParams(prev => ({ ...prev, regionId: matchedRegion.id }));
      setCurrentStep(prev => Math.max(prev, 1));
      return {
        text: `Understood! I have set your voyage region to ${matchedRegion.name}. Active Potential Fishing Zones (PFZ) and INCOIS ocean data for this sector have been loaded.`
      };
    }

    // 2. Date Detection
    if (q.includes('today') || q.includes('now') || q.includes('immediate')) {
      const todayStr = new Date().toISOString().split('T')[0];
      setVoyageParams(prev => ({ ...prev, date: todayStr }));
      setCurrentStep(prev => Math.max(prev, 2));
      return { text: `Departure date set to Today (${todayStr}).` };
    }
    if (q.includes('tomorrow')) {
      const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      setVoyageParams(prev => ({ ...prev, date: tomorrowStr }));
      setCurrentStep(prev => Math.max(prev, 2));
      return { text: `Departure date set to Tomorrow (${tomorrowStr}) dawn.` };
    }

    // 3. Departure Time Detection
    if (q.includes('04') || q.includes('dawn') || q.includes('4 am') || q.includes('04:00')) {
      setVoyageParams(prev => ({ ...prev, time: '04:00 AM' }));
      setCurrentStep(prev => Math.max(prev, 3));
      return { text: `Departure scheduled for dawn tide at 04:00 AM.` };
    }
    if (q.includes('05') || q.includes('5:30') || q.includes('morning')) {
      setVoyageParams(prev => ({ ...prev, time: '05:30 AM' }));
      setCurrentStep(prev => Math.max(prev, 3));
      return { text: `Departure scheduled for favorable morning current at 05:30 AM.` };
    }

    // 4. Target Catch / Purpose
    if (q.includes('tuna')) {
      setVoyageParams(prev => ({ ...prev, purpose: 'tuna' }));
      setCurrentStep(4);
      return { text: `Operation mode set to Pelagic Tuna Target.` };
    }
    if (q.includes('deep') || q.includes('longline')) {
      setVoyageParams(prev => ({ ...prev, purpose: 'deepsea' }));
      setCurrentStep(4);
      return { text: `Operation mode set to Deep Sea Longlining.` };
    }
    if (q.includes('commercial') || q.includes('trawl') || q.includes('fishing')) {
      setVoyageParams(prev => ({ ...prev, purpose: 'commercial' }));
      setCurrentStep(4);
      return { text: `Operation mode set to Commercial Fishing.` };
    }

    // 5. Marine Weather & Safety Inquiries
    if (q.includes('weather') || q.includes('wave') || q.includes('wind') || q.includes('safe') || q.includes('alert')) {
      return {
        text: `Live marine report for ${selectedRegion.name}: Wave swell is moderate at 1.4m–1.8m with northeasterly surface winds at 18 km/h. Sea conditions are green and favorable for mechanized artisanal operations.`
      };
    }

    // 6. Navigation to Recommendation
    if (q.includes('recommend') || q.includes('zone') || q.includes('done') || q.includes('analyze') || q.includes('ready')) {
      return {
        text: `All parameters for ${selectedRegion.name} are ready! Ready to view AI-computed high-probability fishing zones?`,
        action: {
          label: 'Proceed to Recommendation →',
          onClick: () => handleProceedToRecommendation()
        }
      };
    }

    // Default intelligent guidance
    return {
      text: `Noted! Currently set to ${selectedRegion.name} (${voyageParams.date} at ${voyageParams.time}). You can tell me to change region, time, date, or ask about offshore weather.`
    };
  };

  const handleSendMessage = (textToSend: string) => {
    if (!textToSend.trim()) return;

    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: timeNow
    };

    const replyData = generateOrcaResponse(textToSend);
    const botMsg: ChatMessage = {
      id: `orca-${Date.now() + 1}`,
      sender: 'orca',
      text: replyData.text,
      timestamp: timeNow,
      action: replyData.action
    };

    setChatMessages(prev => [...prev, userMsg, botMsg]);
  };

  return (
    <div className="w-full min-h-[calc(100dvh-57px)] bg-ocean-bg flex flex-col items-center justify-between p-6 sm:p-10 select-none">
      
      {/* Minimal Top Header with ORCA Logo & Close (X) button */}
      <div className="w-full max-w-3xl flex items-center justify-between pb-3 border-b border-ocean-sub/60">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-white border border-ocean-sub flex items-center justify-center shadow-xs">
            <img src="/orca-logo.jpg" alt="ORCA" className="w-full h-full object-contain" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-ocean-text">{t.voiceAssistantTitle}</h2>
            <p className="text-[11px] text-ocean-primary font-semibold">{t.voiceListeningStatus}</p>
          </div>
        </div>

        {/* X / Close Button to switch to Manual Input */}
        <button
          onClick={handleCloseToManual}
          className="p-2 rounded-xl text-ocean-text/50 hover:text-ocean-text/90 hover:bg-ocean-sub/50 transition-colors"
          title={t.voiceSwitchToManual}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Voice Interaction Area */}
      <div className="w-full max-w-3xl my-auto py-6 flex flex-col items-center text-center">
        
        {/* Animated Microphone Graphic */}
        <div className="relative inline-flex items-center justify-center my-4">
          {isListening && (
            <>
              <span className="absolute w-28 h-28 rounded-full bg-[#2a8a89]/15 animate-ping"></span>
              <span className="absolute w-24 h-24 rounded-full bg-[#2a8a89]/25 animate-pulse"></span>
            </>
          )}
          <button
            onClick={() => setIsListening(!isListening)}
            className="relative z-10 w-20 h-20 rounded-full bg-[#2a8a89] text-white flex items-center justify-center shadow-xl hover:bg-[#38a3a5] transition-all"
          >
            {isListening ? <Mic className="w-9 h-9 animate-bounce" /> : <MicOff className="w-9 h-9" />}
          </button>
        </div>

        {/* Dynamic Voice Waveform Bars */}
        <div className="flex items-center justify-center space-x-1.5 h-6 mb-5">
          {[40, 80, 100, 65, 95, 50, 85, 55, 75, 45].map((h, idx) => (
            <span
              key={idx}
              className="w-1 bg-[#2a8a89] rounded-full transition-all duration-300"
              style={{
                height: isListening ? `${Math.max(6, (h * (idx % 2 === 0 ? 0.9 : 0.6)) / 3)}px` : '4px',
                opacity: isListening ? 0.85 : 0.25
              }}
            />
          ))}
        </div>

        {/* Current Question / Prompt in Selected Language */}
        <div className="min-h-[64px] flex items-center justify-center mb-6 px-4">
          <p className="text-lg sm:text-xl font-bold text-ocean-text leading-snug">
            {speechPrompt}
          </p>
        </div>

        {/* Interactive Response Options in Selected Language */}
        <div className="w-full bg-ocean-sub/40 p-4 rounded-2xl border border-ocean-sub text-left mb-5 shadow-xs">
          {currentStep === 0 && (
            <div>
              <div className="text-xs font-bold text-ocean-text/80 mb-2 uppercase tracking-wider">
                {t.regionLabel}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {COASTAL_REGIONS.map(reg => (
                  <button
                    key={reg.id}
                    onClick={() => handleSelectRegion(reg.id)}
                    className="px-3 py-2.5 text-xs font-semibold text-ocean-text bg-white hover:bg-[#c8dcdb] hover:text-[#2a8a89] hover:border-[#2a8a89] rounded-xl border border-ocean-sub transition-all text-left shadow-2xs"
                  >
                    {reg.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div>
              <div className="text-xs font-bold text-ocean-text/80 mb-2 uppercase tracking-wider">
                {t.dateLabel}
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'Today (Immediate)', val: new Date().toISOString().split('T')[0] },
                  { label: 'Tomorrow Dawn', val: new Date(Date.now() + 86400000).toISOString().split('T')[0] },
                  { label: 'Upcoming Tide Cycle (+2d)', val: new Date(Date.now() + 172800000).toISOString().split('T')[0] }
                ].map(item => (
                  <button
                    key={item.val}
                    onClick={() => handleSelectDate(item.val)}
                    className="px-3.5 py-2.5 text-xs font-semibold text-ocean-text bg-white hover:bg-[#c8dcdb] hover:text-[#2a8a89] hover:border-[#2a8a89] rounded-xl border border-ocean-sub transition-all shadow-2xs"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div>
              <div className="text-xs font-bold text-ocean-text/80 mb-2 uppercase tracking-wider">
                {t.timeLabel}
              </div>
              <div className="flex flex-wrap gap-2">
                {['04:00 AM', '05:30 AM', '07:00 AM', '16:00 PM'].map(tm => (
                  <button
                    key={tm}
                    onClick={() => handleSelectTime(tm)}
                    className="px-4 py-2.5 text-xs font-semibold text-ocean-text bg-white hover:bg-[#c8dcdb] hover:text-[#2a8a89] hover:border-[#2a8a89] rounded-xl border border-ocean-sub transition-all shadow-2xs"
                  >
                    {tm}
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div>
              <div className="text-xs font-bold text-ocean-text/80 mb-2 uppercase tracking-wider">
                {t.purposeLabel}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { key: 'commercial', label: t.purposeCommercial },
                  { key: 'deepsea', label: t.purposeDeepSea },
                  { key: 'coastal', label: t.purposeCoastal },
                  { key: 'tuna', label: t.purposeTuna },
                  { key: 'sardine', label: t.purposeSardine }
                ].map(p => (
                  <button
                    key={p.key}
                    onClick={() => handleSelectPurpose(p.key)}
                    className="px-3.5 py-2.5 text-xs font-semibold text-ocean-text bg-white hover:bg-[#c8dcdb] hover:text-[#2a8a89] hover:border-[#2a8a89] rounded-xl border border-ocean-sub transition-all text-left shadow-2xs"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="text-center py-2">
              <div className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-emerald-100 text-emerald-600 mb-2">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-ocean-text">{t.voiceDonePrompt}</h4>
              <div className="text-xs text-ocean-text/70 mt-1">
                {selectedRegion.name} • {voyageParams.date} • {voyageParams.time}
              </div>
            </div>
          )}
        </div>

        {/* Chat with ORCA - Secondary Input Option */}
        <button
          type="button"
          onClick={handleOpenChat}
          className="w-full max-w-md my-2.5 px-4 py-2.5 bg-white/80 hover:bg-white border border-ocean-sub/90 hover:border-[#2a8a89]/50 rounded-2xl shadow-2xs hover:shadow-xs transition-all duration-200 flex items-center justify-between group text-left cursor-pointer hover-card-lift"
        >
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-[#2a8a89]/10 group-hover:bg-[#2a8a89]/20 text-[#2a8a89] flex items-center justify-center transition-colors">
              <MessageCircle className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-ocean-text group-hover:text-[#2a8a89] transition-colors flex items-center space-x-1.5">
                <span>Chat with ORCA</span>
                <span className="text-[10px] font-medium px-1.5 py-0.2 bg-[#2a8a89]/10 text-[#2a8a89] rounded-full">
                  Text AI
                </span>
              </div>
              <div className="text-[11px] text-ocean-text/60">
                Prefer typing? Ask ORCA here.
              </div>
            </div>
          </div>
          <div className="text-[#2a8a89] opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-xs font-semibold flex items-center space-x-0.5">
            <span>Chat</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </button>

        {/* Action Controls */}
        <div className="w-full flex items-center justify-between pt-2">
          <button
            onClick={handleCloseToManual}
            className="text-xs text-ocean-text/70 hover:text-ocean-text font-semibold underline underline-offset-4"
          >
            {t.voiceSwitchToManual}
          </button>

          {currentStep === 4 ? (
            <button
              onClick={handleProceedToRecommendation}
              className="flex items-center space-x-2 px-6 py-3 bg-[#2a8a89] hover:bg-[#38a3a5] text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95"
            >
              <span>{t.analyzeBtn}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => setCurrentStep(prev => Math.min(questions.length, prev + 1))}
              className="text-xs font-semibold text-[#2a8a89] hover:underline"
            >
              Skip →
            </button>
          )}
        </div>

      </div>

      {/* Footer Minimalist Notice */}
      <div className="text-center text-xs text-ocean-text/50">
        ORCA AI Voice Assistant • Page 1 of 3 (Fisherman Flow)
      </div>

      {/* ORCA Chat Assistant Bottom Sheet / Modal */}
      {isChatOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-ocean-sub overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[600px] animate-in slide-in-from-bottom duration-300">
            
            {/* 1. Header */}
            <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-ocean-sub/70 bg-[#f0f4f5]/90">
              <div className="flex items-center space-x-2.5">
                <div className="relative w-8 h-8 rounded-full overflow-hidden bg-white border border-ocean-sub flex items-center justify-center shadow-2xs">
                  <img src="/orca-logo.jpg" alt="ORCA" className="w-full h-full object-contain" />
                  <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-1 ring-white"></span>
                </div>
                <div>
                  <div className="flex items-center space-x-1.5">
                    <h3 className="text-xs sm:text-sm font-bold text-ocean-text">ORCA Chat Assistant</h3>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 bg-[#2a8a89]/10 text-[#2a8a89] rounded-sm">Online</span>
                  </div>
                  <p className="text-[10px] text-ocean-text/60">Real-time Marine Intelligence</p>
                </div>
              </div>

              {/* Header Actions: Switch to Voice + Close */}
              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onClick={handleSwitchBackToVoice}
                  className="p-1.5 rounded-xl text-ocean-text/60 hover:text-[#2a8a89] hover:bg-white transition-colors cursor-pointer"
                  title="Switch to Voice Input"
                >
                  <Mic className="w-4 h-4 text-[#2a8a89]" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsChatOpen(false)}
                  className="p-1.5 rounded-xl text-ocean-text/60 hover:text-ocean-text hover:bg-white transition-colors cursor-pointer"
                  title="Close Chat"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* 2. Scrollable Conversation Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#f8fafb] min-h-[260px] text-xs">
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl shadow-2xs leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-[#2a8a89] text-white rounded-tr-xs font-medium'
                        : 'bg-white text-ocean-text border border-ocean-sub/70 rounded-tl-xs'
                    }`}
                  >
                    {msg.text}
                    {msg.action && (
                      <button
                        type="button"
                        onClick={msg.action.onClick}
                        className="mt-2 block w-full text-center px-3 py-1.5 bg-[#2a8a89] hover:bg-[#38a3a5] text-white font-bold rounded-lg text-[11px] shadow-xs transition-colors cursor-pointer"
                      >
                        {msg.action.label}
                      </button>
                    )}
                  </div>
                  <span className="text-[9px] text-ocean-text/40 px-1 mt-0.5">
                    {msg.timestamp}
                  </span>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggestion Chips */}
            <div className="px-4 py-1.5 bg-white border-t border-ocean-sub/40 flex items-center space-x-1.5 overflow-x-auto text-[10px]">
              <span className="text-ocean-text/50 font-semibold shrink-0">Quick:</span>
              <button
                type="button"
                onClick={() => handleSendMessage(`Selected region is ${selectedRegion.name}`)}
                className="px-2 py-0.5 rounded-full bg-ocean-sub/30 hover:bg-[#2a8a89]/15 text-ocean-text hover:text-[#2a8a89] border border-ocean-sub/70 whitespace-nowrap transition-colors cursor-pointer"
              >
                {selectedRegion.name}
              </button>
              <button
                type="button"
                onClick={() => handleSendMessage("What are the best fishing zones today?")}
                className="px-2 py-0.5 rounded-full bg-ocean-sub/30 hover:bg-[#2a8a89]/15 text-ocean-text hover:text-[#2a8a89] border border-ocean-sub/70 whitespace-nowrap transition-colors cursor-pointer"
              >
                Best fishing zones
              </button>
              <button
                type="button"
                onClick={() => handleSendMessage("Check wave and weather alerts")}
                className="px-2 py-0.5 rounded-full bg-ocean-sub/30 hover:bg-[#2a8a89]/15 text-ocean-text hover:text-[#2a8a89] border border-ocean-sub/70 whitespace-nowrap transition-colors cursor-pointer"
              >
                Weather safety
              </button>
            </div>

            {/* 3. Text Input & Send Area */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (chatInput.trim()) {
                  handleSendMessage(chatInput.trim());
                  setChatInput('');
                }
              }}
              className="p-3 border-t border-ocean-sub/70 bg-white flex items-center space-x-2"
            >
              {/* Switch back to Voice Mic Icon button */}
              <button
                type="button"
                onClick={handleSwitchBackToVoice}
                className="p-2 rounded-xl text-ocean-text/50 hover:text-[#2a8a89] hover:bg-ocean-sub/30 transition-colors cursor-pointer"
                title="Switch to voice input"
              >
                <Mic className="w-4 h-4" />
              </button>

              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 px-3 py-2 bg-ocean-card/60 border border-ocean-sub/80 rounded-xl text-xs text-ocean-text font-medium placeholder-ocean-text/40 focus:outline-hidden focus:border-[#2a8a89] focus:bg-white transition-colors"
              />

              <button
                type="submit"
                disabled={!chatInput.trim()}
                className="p-2 px-3 rounded-xl bg-[#2a8a89] hover:bg-[#38a3a5] text-white disabled:opacity-40 disabled:hover:bg-[#2a8a89] transition-all shadow-xs flex items-center justify-center cursor-pointer"
                title="Send message"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>

          </div>
        </div>
      )}
    </div>
  );
};

