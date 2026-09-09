import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Globe, User } from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '../i18n/translations';

export const Header: React.FC = () => {
  const { t, language, setLanguage, userName, userRole } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  // Hide header on Page 1 (Welcome) and Page 2 (Language Selection) for ultra-minimalist onboarding
  if (location.pathname === '/' || location.pathname === '/language') {
    return null;
  }

  const currentLangObj = SUPPORTED_LANGUAGES.find(l => l.code === language) || SUPPORTED_LANGUAGES[0];

  return (
    <header className="bg-white border-b border-slate-100 sticky top-0 z-40 px-4 py-2.5 sm:px-6">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand Logo & Title */}
        <div 
          onClick={() => navigate('/others/home')}
          className="flex items-center space-x-3 cursor-pointer select-none group"
        >
          <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center bg-white border border-slate-200 shadow-xs group-hover:border-[#20B2AA] transition-colors">
            <img 
              src="/orca-logo.jpg" 
              alt="ORCA Logo" 
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
              <span>{t.appName}</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-[#e0f5f4] text-[#20B2AA]">
                {t.liveStatus}
              </span>
            </h1>
            <p className="text-xs text-slate-500 hidden sm:block">
              {t.appSubtitle}
            </p>
          </div>
        </div>

        {/* Right Action Bar */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          {/* Quick Language Selector */}
          <div className="relative flex items-center">
            <button
              onClick={() => navigate('/language')}
              title={t.languageSelectionTitle}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-[#e0f5f4] hover:text-[#20B2AA] rounded-lg border border-slate-200 transition-colors"
            >
              <Globe className="w-3.5 h-3.5 text-[#20B2AA]" />
              <span className="font-semibold">{currentLangObj.nativeName}</span>
            </button>
          </div>

          {/* User Profile with Sea-Shell Shaped Visual Reference */}
          <div 
            onClick={() => navigate('/user-details')}
            className="flex items-center space-x-2 pl-2 border-l border-slate-200 cursor-pointer group"
            title="Profile & Operational Role"
          >
            {/* Sea-Shell Shaped Profile Icon */}
            <div className="relative w-9 h-9 flex items-center justify-center text-[#20B2AA] bg-[#e0f5f4] rounded-tl-2xl rounded-tr-2xl rounded-bl-lg rounded-br-2xl border border-[#20B2AA]/30 shadow-xs group-hover:shadow-md transition-all">
              <svg 
                viewBox="0 0 24 24" 
                className="w-5 h-5 fill-[#20B2AA]/20 stroke-[#20B2AA]" 
                strokeWidth="1.8" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                {/* Stylized Sea-shell ribs & silhouette */}
                <path d="M12 2C6.48 2 2 6.48 2 12c0 4.42 2.87 8.17 6.84 9.5.34.05.66.08 1 .08.38 0 .74-.03 1.1-.09C17.06 20.15 22 16.42 22 12c0-5.52-4.48-10-10-10z" />
                <path d="M12 2c0 7 0 11 0 19" />
                <path d="M12 2c-3 5-5 10-4 18" />
                <path d="M12 2c3 5 5 10 4 18" />
                <path d="M12 2c-5 6-7 11-7 16" />
                <path d="M12 2c5 6 7 11 7 16" />
              </svg>
            </div>
            
            <div className="hidden md:block text-left">
              <div className="text-xs font-semibold text-slate-800 leading-tight">
                {userName}
              </div>
              <div className="text-[11px] font-medium text-[#20B2AA]">
                {userRole === 'fisherman' ? t.roleBadgeFisherman : t.roleBadgeOthers}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
