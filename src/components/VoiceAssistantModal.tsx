import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { COASTAL_REGIONS } from '../services/marineData';
import { Mic, MicOff, X, Volume2, CheckCircle2, ArrowRight } from 'lucide-react';

interface VoiceAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export const VoiceAssistantModal: React.FC<VoiceAssistantModalProps> = ({
  isOpen,
  onClose,
  onComplete
}) => {
  const { t, language, selectedRegion, setSelectedRegion, voyageParams, setVoyageParams } = useApp();

  // 4 Sequential steps: 0: Region, 1: Date, 2: Time, 3: Purpose, 4: Done
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isListening, setIsListening] = useState<boolean>(true);
  const [speechFeedback, setSpeechFeedback] = useState<string>('');

  const questions = [
    { id: 'region', text: t.voiceQuestionRegion },
    { id: 'date', text: t.voiceQuestionDate },
    { id: 'time', text: t.voiceQuestionTime },
    { id: 'purpose', text: t.voiceQuestionPurpose }
  ];

  // Text-to-speech prompt when question changes
  useEffect(() => {
    if (!isOpen) return;

    if (currentStep < questions.length) {
      const qText = questions[currentStep].text;
      setSpeechFeedback(qText);

      // Attempt SpeechSynthesis if available
      if ('speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(qText);
          // Set lang tag if available
          utterance.lang = language === 'en' ? 'en-US' : `${language}-IN`;
          utterance.rate = 0.95;
          window.speechSynthesis.speak(utterance);
        } catch (e) {
          // Graceful fallback
        }
      }
    } else {
      setSpeechFeedback(t.voiceDonePrompt);
    }
  }, [currentStep, isOpen, language]);

  if (!isOpen) return null;

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

  const handleCompleteAndAnalyze = () => {
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
        
        {/* Header with Close / X to switch to manual input */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-white border border-slate-200 flex items-center justify-center">
              <img src="/orca-logo.jpg" alt="ORCA" className="w-full h-full object-contain" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">{t.voiceAssistantTitle}</h3>
              <p className="text-[11px] text-[#20B2AA] font-medium">{t.voiceListeningStatus}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title={t.voiceSwitchToManual}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Voice Assistant Core Interaction */}
        <div className="p-6 text-center">
          {/* Animated Microphone Graphic */}
          <div className="relative inline-flex items-center justify-center my-3">
            {isListening && (
              <>
                <span className="absolute w-24 h-24 rounded-full bg-[#20B2AA]/15 animate-ping"></span>
                <span className="absolute w-20 h-20 rounded-full bg-[#20B2AA]/25 animate-pulse"></span>
              </>
            )}
            <button
              onClick={() => setIsListening(!isListening)}
              className="relative z-10 w-16 h-16 rounded-full bg-[#20B2AA] text-white flex items-center justify-center shadow-lg hover:bg-[#1a9e97] transition-all"
            >
              {isListening ? <Mic className="w-8 h-8 animate-bounce" /> : <MicOff className="w-8 h-8" />}
            </button>
          </div>

          {/* Sound Wave Bars Graphic */}
          <div className="flex items-center justify-center space-x-1.5 h-6 mb-4">
            {[40, 75, 100, 60, 90, 45, 80, 50].map((h, idx) => (
              <span
                key={idx}
                className="w-1 bg-[#20B2AA] rounded-full transition-all duration-300"
                style={{
                  height: isListening ? `${Math.max(6, (h * (idx % 2 === 0 ? 0.9 : 0.6)) / 3)}px` : '4px',
                  opacity: isListening ? 0.85 : 0.3
                }}
              />
            ))}
          </div>

          {/* Prompt Question */}
          <div className="min-h-[56px] flex items-center justify-center mb-6">
            <p className="text-base sm:text-lg font-semibold text-slate-800 leading-snug">
              {speechFeedback}
            </p>
          </div>

          {/* Sequential Step Interactive Answer Chips */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-4 text-left">
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
                      className="px-3 py-2 text-xs font-medium text-slate-800 bg-white hover:bg-[#e0f5f4] hover:text-[#20B2AA] hover:border-[#20B2AA] rounded-lg border border-slate-200 transition-colors text-left"
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
                      className="px-3 py-2 text-xs font-medium text-slate-800 bg-white hover:bg-[#e0f5f4] hover:text-[#20B2AA] hover:border-[#20B2AA] rounded-lg border border-slate-200 transition-colors"
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
                      className="px-3 py-2 text-xs font-medium text-slate-800 bg-white hover:bg-[#e0f5f4] hover:text-[#20B2AA] hover:border-[#20B2AA] rounded-lg border border-slate-200 transition-colors"
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
                      className="px-3 py-2 text-xs font-medium text-slate-800 bg-white hover:bg-[#e0f5f4] hover:text-[#20B2AA] hover:border-[#20B2AA] rounded-lg border border-slate-200 transition-colors text-left"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="text-center py-2">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 mb-2">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-900">{t.voiceDonePrompt}</h4>
                <div className="text-xs text-slate-500 mt-1">
                  {selectedRegion.name} • {voyageParams.date} • {voyageParams.time}
                </div>
              </div>
            )}
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={onClose}
              className="text-xs text-slate-500 hover:text-slate-800 font-medium underline underline-offset-4"
            >
              {t.voiceSwitchToManual}
            </button>

            {currentStep === 4 ? (
              <button
                onClick={handleCompleteAndAnalyze}
                className="flex items-center space-x-2 px-5 py-2.5 bg-[#20B2AA] hover:bg-[#1a9e97] text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95"
              >
                <span>{t.analyzeBtn}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => setCurrentStep(prev => Math.min(questions.length, prev + 1))}
                className="text-xs font-semibold text-[#20B2AA] hover:underline"
              >
                Skip Question →
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
