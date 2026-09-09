import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { COASTAL_REGIONS } from '../../services/marineData';
import { Mic, MicOff, X, ArrowRight, CheckCircle2 } from 'lucide-react';

export const FishermanVoicePage: React.FC = () => {
  const { t, language, selectedRegion, setSelectedRegion, voyageParams, setVoyageParams } = useApp();
  const navigate = useNavigate();

  // 4 Sequential steps: 0: Region, 1: Date, 2: Time, 3: Purpose, 4: Done
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isListening, setIsListening] = useState<boolean>(true);
  const [speechPrompt, setSpeechPrompt] = useState<string>('');

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

  return (
    <div className="min-h-[calc(100vh-57px)] bg-white flex flex-col items-center justify-between p-6 sm:p-10 select-none">
      
      {/* Minimal Top Header with ORCA Logo & Close (X) button */}
      <div className="w-full max-w-xl flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-white border border-slate-200 flex items-center justify-center shadow-xs">
            <img src="/orca-logo.jpg" alt="ORCA" className="w-full h-full object-contain" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">{t.voiceAssistantTitle}</h2>
            <p className="text-[11px] text-[#20B2AA] font-semibold">{t.voiceListeningStatus}</p>
          </div>
        </div>

        {/* X / Close Button to switch to Manual Input */}
        <button
          onClick={handleCloseToManual}
          className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          title={t.voiceSwitchToManual}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Voice Interaction Area */}
      <div className="w-full max-w-xl my-auto py-6 flex flex-col items-center text-center">
        
        {/* Animated Microphone Graphic */}
        <div className="relative inline-flex items-center justify-center my-4">
          {isListening && (
            <>
              <span className="absolute w-28 h-28 rounded-full bg-[#20B2AA]/15 animate-ping"></span>
              <span className="absolute w-24 h-24 rounded-full bg-[#20B2AA]/25 animate-pulse"></span>
            </>
          )}
          <button
            onClick={() => setIsListening(!isListening)}
            className="relative z-10 w-20 h-20 rounded-full bg-[#20B2AA] text-white flex items-center justify-center shadow-xl hover:bg-[#1a9e97] transition-all"
          >
            {isListening ? <Mic className="w-9 h-9 animate-bounce" /> : <MicOff className="w-9 h-9" />}
          </button>
        </div>

        {/* Dynamic Voice Waveform Bars */}
        <div className="flex items-center justify-center space-x-1.5 h-6 mb-5">
          {[40, 80, 100, 65, 95, 50, 85, 55, 75, 45].map((h, idx) => (
            <span
              key={idx}
              className="w-1 bg-[#20B2AA] rounded-full transition-all duration-300"
              style={{
                height: isListening ? `${Math.max(6, (h * (idx % 2 === 0 ? 0.9 : 0.6)) / 3)}px` : '4px',
                opacity: isListening ? 0.85 : 0.25
              }}
            />
          ))}
        </div>

        {/* Current Question / Prompt in Selected Language */}
        <div className="min-h-[64px] flex items-center justify-center mb-6 px-4">
          <p className="text-lg sm:text-xl font-bold text-slate-800 leading-snug">
            {speechPrompt}
          </p>
        </div>

        {/* Interactive Response Options in Selected Language */}
        <div className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-200 text-left mb-5 shadow-xs">
          {currentStep === 0 && (
            <div>
              <div className="text-xs font-bold text-slate-600 mb-2 uppercase tracking-wider">
                {t.regionLabel}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {COASTAL_REGIONS.map(reg => (
                  <button
                    key={reg.id}
                    onClick={() => handleSelectRegion(reg.id)}
                    className="px-3 py-2.5 text-xs font-semibold text-slate-800 bg-white hover:bg-[#e0f5f4] hover:text-[#20B2AA] hover:border-[#20B2AA] rounded-xl border border-slate-200 transition-all text-left shadow-2xs"
                  >
                    {reg.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div>
              <div className="text-xs font-bold text-slate-600 mb-2 uppercase tracking-wider">
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
                    className="px-3.5 py-2.5 text-xs font-semibold text-slate-800 bg-white hover:bg-[#e0f5f4] hover:text-[#20B2AA] hover:border-[#20B2AA] rounded-xl border border-slate-200 transition-all shadow-2xs"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div>
              <div className="text-xs font-bold text-slate-600 mb-2 uppercase tracking-wider">
                {t.timeLabel}
              </div>
              <div className="flex flex-wrap gap-2">
                {['04:00 AM', '05:30 AM', '07:00 AM', '16:00 PM'].map(tm => (
                  <button
                    key={tm}
                    onClick={() => handleSelectTime(tm)}
                    className="px-4 py-2.5 text-xs font-semibold text-slate-800 bg-white hover:bg-[#e0f5f4] hover:text-[#20B2AA] hover:border-[#20B2AA] rounded-xl border border-slate-200 transition-all shadow-2xs"
                  >
                    {tm}
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div>
              <div className="text-xs font-bold text-slate-600 mb-2 uppercase tracking-wider">
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
                    className="px-3.5 py-2.5 text-xs font-semibold text-slate-800 bg-white hover:bg-[#e0f5f4] hover:text-[#20B2AA] hover:border-[#20B2AA] rounded-xl border border-slate-200 transition-all text-left shadow-2xs"
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
              <h4 className="text-sm font-bold text-slate-900">{t.voiceDonePrompt}</h4>
              <div className="text-xs text-slate-500 mt-1">
                {selectedRegion.name} • {voyageParams.date} • {voyageParams.time}
              </div>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="w-full flex items-center justify-between pt-2">
          <button
            onClick={handleCloseToManual}
            className="text-xs text-slate-500 hover:text-slate-800 font-semibold underline underline-offset-4"
          >
            {t.voiceSwitchToManual}
          </button>

          {currentStep === 4 ? (
            <button
              onClick={handleProceedToRecommendation}
              className="flex items-center space-x-2 px-6 py-3 bg-[#20B2AA] hover:bg-[#1a9e97] text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95"
            >
              <span>{t.analyzeBtn}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => setCurrentStep(prev => Math.min(questions.length, prev + 1))}
              className="text-xs font-semibold text-[#20B2AA] hover:underline"
            >
              Skip →
            </button>
          )}
        </div>

      </div>

      {/* Footer Minimalist Notice */}
      <div className="text-center text-xs text-slate-400">
        ORCA AI Voice Assistant • Page 1 of 3 (Fisherman Flow)
      </div>
    </div>
  );
};
