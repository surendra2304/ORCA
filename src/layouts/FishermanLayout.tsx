import React, { useState, useRef, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { SUPPORTED_LANGUAGES } from '../i18n/translations';
import { 
  User, 
  Globe, 
  Bell, 
  CloudSun, 
  ChevronDown, 
  Check, 
  AlertTriangle,
  Wind,
  Waves
} from 'lucide-react';

/**
 * FishermanLayout:
 * Top identity bar with required controls:
 * Profile -> Globe + Language Toggle -> Red Alerts -> Live Weather
 */
export const FishermanLayout: React.FC = () => {
  const { 
    userName, 
    language, 
    setLanguage, 
    selectedRegion, 
    riskZones 
  } = useApp();

  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  // Close language dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(event.target as Node)) {
        setIsLangMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeRegionRisks = riskZones.filter(rz => rz.regionId === selectedRegion.id);
  const currentLangObj = SUPPORTED_LANGUAGES.find(l => l.code === language) || SUPPORTED_LANGUAGES[0];

  return (
    <div className="min-h-screen w-full bg-ocean-bg text-ocean-text flex flex-col antialiased select-none">
      {/* Top identity & controls bar */}
      <div className="w-full bg-ocean-card border-b border-ocean-sub px-4 sm:px-8 py-2.5 flex items-center justify-between gap-3 sticky top-0 z-50 shadow-xs">
        {/* Left: Brand Identity */}
        <div className="flex items-center space-x-2.5">
          <img src="/orca-logo.jpg" alt="ORCA" className="h-8 w-auto object-contain" />
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="text-sm font-bold text-ocean-text tracking-tight">ORCA</span>
              <span className="text-[10px] text-ocean-header font-semibold px-2 py-0.5 rounded-full bg-ocean-sub border border-ocean-header/20">
                Fisherman Voice & Safety
              </span>
            </div>
          </div>
        </div>

        {/* Right Controls in exact order: Profile -> Globe + Language -> Red Alerts -> Live Weather */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          
          {/* 1. Profile: simple profile/avatar icon */}
          <div 
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-ocean-sub/40 border border-ocean-sub text-xs font-semibold text-ocean-text hover:bg-ocean-sub/70 transition-colors cursor-default"
            title={`Logged in as ${userName || 'Captain'}`}
          >
            <div className="w-6 h-6 rounded-full bg-ocean-primary/20 text-ocean-primary flex items-center justify-center font-bold text-xs">
              <User className="w-3.5 h-3.5" />
            </div>
            <span className="hidden sm:inline-block max-w-[90px] truncate text-[12px] font-bold text-ocean-text/90">
              {userName || 'Captain'}
            </span>
          </div>

          {/* 2. Globe + Language Toggle */}
          <div className="relative" ref={langRef}>
            <button
              onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-ocean-sub/40 hover:bg-ocean-sub border border-ocean-sub hover:border-ocean-primary/40 text-xs font-semibold text-ocean-text transition-all"
              title="Change Language"
            >
              <Globe className="w-3.5 h-3.5 text-ocean-primary" />
              <span className="text-[11px] font-bold tracking-wide uppercase">{currentLangObj.code}</span>
              <ChevronDown className="w-3 h-3 text-ocean-text/60" />
            </button>

            {/* Language Dropdown */}
            {isLangMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-48 bg-white border border-ocean-sub rounded-xl shadow-lg py-1.5 z-50 max-h-60 overflow-y-auto">
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
                      language === lang.code ? 'font-bold text-ocean-primary bg-ocean-sub/20' : 'text-ocean-text'
                    }`}
                  >
                    <div>
                      <span className="font-medium">{lang.name}</span>
                      <span className="text-[10px] text-ocean-text/50 ml-1.5">({lang.nativeName})</span>
                    </div>
                    {language === lang.code && <Check className="w-3.5 h-3.5 text-ocean-primary" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 3. Red Alerts: red alert/notification icon */}
          <div className="relative">
            <button
              onClick={() => setShowAlertModal(!showAlertModal)}
              className="relative p-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-600 transition-all flex items-center justify-center"
              title="Marine Hazard Alerts"
            >
              <Bell className="w-4 h-4 text-red-600" />
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600"></span>
              </span>
            </button>

            {/* Alert dropdown / popup */}
            {showAlertModal && (
              <div className="absolute right-0 mt-1.5 w-72 bg-white border border-red-200 rounded-xl shadow-xl p-3 z-50 space-y-2">
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

          {/* 4. Live Weather: compact live weather widget */}
          <div 
            className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-cyan-50/80 border border-cyan-200/80 text-ocean-text shadow-2xs"
            title={`Live Weather for ${selectedRegion.name}`}
          >
            <CloudSun className="w-4 h-4 text-amber-500 shrink-0" />
            <div className="flex flex-col text-left leading-none">
              <div className="flex items-center space-x-1">
                <span className="text-[12px] font-extrabold text-ocean-text">28°C</span>
                <span className="text-[10px] font-semibold text-ocean-text/60 hidden sm:inline">Partly Sunny</span>
              </div>
              <div className="flex items-center space-x-1 text-[9px] text-ocean-text/70 mt-0.5">
                <span className="flex items-center space-x-0.5 font-medium">
                  <Wind className="w-2.5 h-2.5 text-teal-600" />
                  <span>14 km/h</span>
                </span>
                <span>•</span>
                <span className="flex items-center space-x-0.5 font-medium">
                  <Waves className="w-2.5 h-2.5 text-blue-600" />
                  <span>1.2m</span>
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Main Content Area: ONLY the 3 Fisherman Pages */}
      <main className="flex-1 w-full">
        <Outlet />
      </main>
    </div>
  );
};
