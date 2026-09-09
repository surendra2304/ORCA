import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { 
  Globe, 
  User, 
  Menu, 
  Bell, 
  CloudSun, 
  ChevronDown, 
  Check, 
  AlertTriangle,
  Wind,
  Waves
} from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '../i18n/translations';

interface HeaderProps {
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { t, language, setLanguage, userName, userRole, selectedRegion, riskZones } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  // Close language dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(event.target as Node)) {
        setIsLangMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Hide header on onboarding screens
  if (location.pathname === '/' || location.pathname === '/language') {
    return null;
  }

  const currentLangObj = SUPPORTED_LANGUAGES.find(l => l.code === language) || SUPPORTED_LANGUAGES[0];
  const activeRegionRisks = riskZones.filter(rz => rz.regionId === selectedRegion.id);

  return (
    <header className="w-full bg-ocean-card border-b border-ocean-sub sticky top-0 z-40 px-4 py-2 sm:px-8 shadow-xs text-ocean-text">
      <div className="w-full flex items-center justify-between gap-3">
        
        {/* Left: 3-line Hamburger Menu + Brand Logo & Title */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* 3-line Hamburger Menu Button */}
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-xl text-ocean-text hover:bg-ocean-sub transition-colors cursor-pointer"
            title="Open Navigation Menu"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5 text-ocean-text" />
          </button>

          {/* ORCA Branding */}
          <div 
            onClick={() => navigate('/others/home')}
            className="flex items-center space-x-2.5 cursor-pointer select-none group"
          >
            <img 
              src="/orca-logo.jpg" 
              alt="ORCA Logo" 
              className="h-8 w-auto object-contain transition-transform group-hover:scale-105"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm sm:text-base font-bold text-ocean-text tracking-tight">{t.appName}</span>
                <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-[#2a8a89] text-white">
                  {t.liveStatus}
                </span>
              </div>
              <p className="text-[11px] text-ocean-text/60 hidden sm:block">
                {t.appSubtitle}
              </p>
            </div>
          </div>
        </div>

        {/* Top-Right Controls */}
        <div className="flex items-center space-x-2 sm:space-x-2.5">
          
          {/* Live Weather & Tide Widget */}
          <div 
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-cyan-50/90 border border-cyan-200/90 text-ocean-text shadow-2xs"
            title={`Live Marine Weather: ${selectedRegion.name}`}
          >
            <CloudSun className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <div className="flex items-center space-x-1 text-[11px] font-bold text-ocean-text leading-none">
              <span>28°C</span>
              <span className="text-ocean-text/40">|</span>
              <span className="flex items-center space-x-0.5 text-[10px] text-teal-700 font-semibold">
                <Wind className="w-2.5 h-2.5" />
                <span>12 kts</span>
              </span>
            </div>
          </div>

          {/* Red Alerts: red alert icon with warning notification */}
          <div className="relative">
            <button
              onClick={() => setShowAlertModal(!showAlertModal)}
              className="relative p-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-600 transition-all flex items-center justify-center cursor-pointer"
              title="Marine Hazard Alerts"
            >
              <Bell className="w-4 h-4 text-red-600" />
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600"></span>
              </span>
            </button>

            {/* Alert dropdown */}
            {showAlertModal && (
              <div className="absolute right-0 mt-1.5 w-72 bg-white border border-red-200 rounded-xl shadow-xl p-3 z-50 space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between pb-2 border-b border-red-100">
                  <div className="flex items-center space-x-1.5 text-red-600 font-bold text-xs">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Coastal Hazard Alerts</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-red-100 text-red-700 font-bold">
                    {activeRegionRisks.length || 1} Active
                  </span>
                </div>
                <div className="text-[11px] text-ocean-text space-y-1.5">
                  <div className="p-2 rounded-lg bg-red-50 border border-red-100">
                    <p className="font-bold text-red-800 text-[11px]">
                      {activeRegionRisks[0]?.name || `${selectedRegion.name} Offshore advisory`}
                    </p>
                    <p className="text-[10px] text-red-600 mt-0.5">
                      {activeRegionRisks[0]?.advisory || 'Swell waves of 1.5m - 2.2m observed offshore. Maintain radio watch on VHF Ch-16.'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Globe + Language: dropdown */}
          <div className="relative" ref={langRef}>
            <button
              onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
              title={t.languageSelectionTitle}
              className="flex items-center space-x-1 px-2.5 py-1.5 text-xs font-semibold text-ocean-text bg-ocean-sub/40 hover:bg-ocean-sub border border-ocean-sub hover:border-[#2a8a89]/40 rounded-xl transition-all cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5 text-[#2a8a89]" />
              <span className="text-[11px] font-bold tracking-wide uppercase">{currentLangObj.code}</span>
              <ChevronDown className="w-3 h-3 text-ocean-text/60" />
            </button>

            {/* Language dropdown */}
            {isLangMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-48 bg-white border border-ocean-sub rounded-xl shadow-lg py-1.5 z-50 max-h-60 overflow-y-auto animate-in fade-in">
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-ocean-text/50 border-b border-ocean-sub/40">
                  Select Language
                </div>
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setLanguage(lang.code);
                      setIsLangMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-ocean-sub/30 transition-colors ${
                      language === lang.code ? 'font-bold text-[#2a8a89] bg-ocean-sub/20' : 'text-ocean-text'
                    }`}
                  >
                    <div>
                      <span className="font-medium">{lang.name}</span>
                      <span className="text-[10px] text-ocean-text/50 ml-1.5">({lang.nativeName})</span>
                    </div>
                    {language === lang.code && <Check className="w-3.5 h-3.5 text-[#2a8a89]" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Profile */}
          <div 
            onClick={() => navigate('/language')}
            className="flex items-center space-x-2 pl-1 cursor-pointer group"
            title={`Profile: ${userName || 'Captain Prasad'}`}
          >
            <div className="relative w-8 h-8 flex items-center justify-center text-[#2a8a89] bg-[#2a8a89]/10 rounded-full border border-[#2a8a89]/30 shadow-2xs group-hover:bg-[#2a8a89] group-hover:text-white transition-all">
              <User className="w-4 h-4" />
            </div>
            
            <div className="hidden lg:block text-left">
              <div className="text-xs font-bold text-ocean-text leading-tight group-hover:text-[#2a8a89] transition-colors">
                {userName || 'Captain Prasad'}
              </div>
              <div className="text-[10px] font-medium text-ocean-text/60">
                Maritime Analyst
              </div>
            </div>
          </div>

        </div>
      </div>
    </header>
  );
};

