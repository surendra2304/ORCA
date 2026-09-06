import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { SUPPORTED_LANGUAGES, LanguageCode } from '../i18n/translations';
import { Check, ArrowRight, Globe } from 'lucide-react';

export const Page2Language: React.FC = () => {
  const { t, language, setLanguage } = useApp();
  const navigate = useNavigate();
  const [selectedLang, setSelectedLang] = useState<LanguageCode>(language);

  const handleSelectLanguage = (code: LanguageCode) => {
    setSelectedLang(code);
    setLanguage(code); // Immediately switch global language
  };

  const handleContinue = () => {
    navigate('/user-details'); // Continue to Page 3
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-between p-6 sm:p-10 select-none">
      {/* Top Header with ORCA Logo */}
      <div className="w-full max-w-2xl flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center space-x-3">
          <div className="w-11 h-11 rounded-full overflow-hidden bg-white border border-slate-200 flex items-center justify-center shadow-xs">
            <img src="/orca-logo.jpg" alt="ORCA Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">{t.appName}</h2>
            <p className="text-xs text-slate-500">Step 1 of 2: Language Setup</p>
          </div>
        </div>

        <div className="flex items-center space-x-1 text-xs text-[#20B2AA] font-semibold">
          <Globe className="w-4 h-4" />
          <span>9 Indian Languages</span>
        </div>
      </div>

      {/* Main Language Selection Section */}
      <div className="w-full max-w-2xl my-auto py-6">
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mb-2">
            {t.languageSelectionTitle}
          </h1>
          <p className="text-sm text-slate-600">
            {t.languageSelectionSubtitle}
          </p>
        </div>

        {/* 9 Supported Language Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
          {SUPPORTED_LANGUAGES.map((item) => {
            const isSelected = selectedLang === item.code;
            return (
              <button
                key={item.code}
                onClick={() => handleSelectLanguage(item.code)}
                className={`relative flex items-center justify-between p-4 rounded-xl border text-left transition-all duration-200 active:scale-98 ${
                  isSelected
                    ? 'border-[#20B2AA] bg-[#e0f5f4] shadow-sm ring-2 ring-[#20B2AA]/20'
                    : 'border-slate-200 bg-white hover:border-[#20B2AA]/50 hover:bg-slate-50/80'
                }`}
              >
                <div>
                  <div className={`text-base font-bold ${isSelected ? 'text-[#20B2AA]' : 'text-slate-900'}`}>
                    {item.nativeName}
                  </div>
                  <div className="text-xs text-slate-500 font-medium">
                    {item.name}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    {item.region}
                  </div>
                </div>

                <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                  isSelected ? 'bg-[#20B2AA] text-white' : 'border border-slate-200 bg-white text-transparent'
                }`}>
                  <Check className="w-3.5 h-3.5" />
                </div>
              </button>
            );
          })}
        </div>

        {/* Continue Action */}
        <div className="flex justify-center">
          <button
            onClick={handleContinue}
            className="w-full sm:w-auto min-w-[200px] flex items-center justify-center space-x-2 px-8 py-3.5 bg-[#20B2AA] hover:bg-[#1a9e97] text-white text-sm font-bold rounded-xl shadow-md transition-all active:scale-95 group"
          >
            <span>{t.continueBtn}</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </div>

      {/* Footer Notice */}
      <div className="text-center text-xs text-slate-400">
        {t.selectLanguagePrompt}
      </div>
    </div>
  );
};
