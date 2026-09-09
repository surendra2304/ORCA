import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { SUPPORTED_LANGUAGES, LanguageCode } from '../i18n/translations';
import { Check, ArrowRight, User } from 'lucide-react';

export const Page2Language: React.FC = () => {
  const { t, language, setLanguage, userName, setUserName, userRole } = useApp();
  const navigate = useNavigate();
  const [selectedLang, setSelectedLang] = useState<LanguageCode>(language);
  const [nameInput, setNameInput] = useState(userName || '');

  const handleSelectLanguage = (code: LanguageCode) => {
    setSelectedLang(code);
    setLanguage(code); // Immediately switch global language
  };

  const handleContinue = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (nameInput.trim()) {
      setUserName(nameInput.trim());
    }
    // Direct navigation based on user's selected role
    if (userRole === 'fisherman') {
      navigate('/fisherman/voice');
    } else {
      navigate('/others/home');
    }
  };

  return (
    <div className="w-full min-h-[100dvh] bg-ocean-bg flex flex-col items-center justify-between p-6 sm:p-10 select-none">
      {/* Top Header with ORCA Logo */}
      <div className="w-full max-w-5xl flex items-center justify-between pb-4 border-b border-ocean-sub/60">
        <div className="flex items-center space-x-3">
          <div className="w-11 h-11 rounded-full overflow-hidden bg-white border border-ocean-sub flex items-center justify-center shadow-xs">
            <img src="/orca-logo.jpg" alt="ORCA Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-ocean-text">{t.appName}</h2>
            <p className="text-xs text-ocean-text/70">Language & Profile Setup</p>
          </div>
        </div>

        <button
          onClick={() => navigate('/')}
          className="text-xs text-ocean-primary font-semibold hover:text-ocean-hover hover:underline flex items-center space-x-1"
        >
          <span>Change Role ({userRole === 'fisherman' ? 'Fisherman' : 'Others'})</span>
        </button>
      </div>

      {/* Main Language & Profile Section */}
      <div className="w-full max-w-5xl my-auto py-6">
        
        {/* Full Name Input Field Placed Directly Above Select Language */}
        <div className="max-w-md mx-auto mb-8 text-left">
          <label className="block text-xs font-bold text-ocean-text/90 uppercase tracking-wider mb-2">
            {t.fullNameLabel}
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-ocean-text/50">
              <User className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder={t.fullNamePlaceholder}
              className="w-full pl-10 pr-4 py-3 bg-white border border-ocean-sub rounded-xl text-sm text-ocean-text placeholder:text-ocean-text/50 focus:outline-hidden focus:border-[#2a8a89] focus:ring-2 focus:ring-[#2a8a89]/20 transition-all shadow-2xs"
            />
          </div>
        </div>

        {/* Heading */}
        <div className="text-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-ocean-text tracking-tight mb-2">
            {t.languageSelectionTitle}
          </h1>
          <p className="text-sm text-ocean-text/80">
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
                    ? 'border-[#2a8a89] bg-[#c8dcdb] shadow-sm ring-2 ring-[#2a8a89]/20'
                    : 'border-ocean-sub bg-white hover:border-[#2a8a89]/50 hover:bg-ocean-sub/40'
                }`}
              >
                <div>
                  <div className={`text-base font-bold ${isSelected ? 'text-[#2a8a89]' : 'text-ocean-text'}`}>
                    {item.nativeName}
                  </div>
                  <div className="text-xs text-ocean-text/70 font-medium">
                    {item.name}
                  </div>
                  <div className="text-[10px] text-ocean-text/50 mt-1">
                    {item.region}
                  </div>
                </div>

                <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                  isSelected ? 'bg-[#2a8a89] text-white' : 'border border-ocean-sub bg-white text-transparent'
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
            onClick={() => handleContinue()}
            className="w-full sm:w-auto min-w-[220px] flex items-center justify-center space-x-2 px-8 py-3.5 bg-[#2a8a89] hover:bg-[#38a3a5] text-white text-sm font-bold rounded-xl shadow-md transition-all active:scale-95 group"
          >
            <span>{t.continueBtn}</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </div>

      {/* Footer Notice */}
      <div className="text-center text-xs text-ocean-text/50">
        {t.selectLanguagePrompt}
      </div>
    </div>
  );
};

