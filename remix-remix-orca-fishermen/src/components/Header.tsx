import React, { useState } from 'react';
import { AppScreen, UserProfile } from '../types';
import {
  MapPin,
  Bell,
  Menu,
  Settings as SettingsIcon,
  LogOut,
  Globe,
  Check,
  LocateFixed,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import { translations, SupportedLanguage } from '../i18n/translations';
import { useLocation } from '../context/LocationContext';

interface HeaderProps {
  currentScreen: AppScreen;
  userProfile: UserProfile;
  unreadAlertCount: number;
  currentLanguage?: SupportedLanguage;
  onLanguageChange?: (lang: SupportedLanguage) => void;
  onOpenNotifications: () => void;
  onOpenMobileMenu: () => void;
  onNavigate: (screen: AppScreen) => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentScreen,
  userProfile,
  unreadAlertCount,
  currentLanguage = 'en',
  onLanguageChange,
  onOpenNotifications,
  onOpenMobileMenu,
  onNavigate,
  onLogout,
}) => {
  const {
    location,
    loading: locationLoading,
    permission,
    requestLocation,
    selectPort,
    availablePorts,
  } = useLocation();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [locationDropdownOpen, setLocationDropdownOpen] = useState(false);

  const t = translations[currentLanguage] || translations.en;

  const languages: Array<{ code: SupportedLanguage; label: string; native: string }> = [
    { code: 'en', label: 'English', native: 'English' },
    { code: 'te', label: 'Telugu', native: 'తెలుగు' },
    { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
    { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
  ];

  const currentLangObj = languages.find((l) => l.code === currentLanguage) || languages[0];

  const getScreenDetails = () => {
    switch (currentScreen) {
      case 'home':
        return {
          title: `${t.header.goodMorning}, ${userProfile.name}!`,
          emoji: '☀️',
          subtitle: t.header.homeSubtitle,
        };
      case 'dashboard':
        return {
          title: t.header.dashboardTitle,
          subtitle: t.header.dashboardSubtitle,
        };
      case 'analytics':
        return {
          title: t.header.analyticsTitle,
          subtitle: t.header.analyticsSubtitle,
        };
      case 'pfz-areas':
        return {
          title: t.header.pfzTitle,
          subtitle: t.header.pfzSubtitle,
        };
      case 'settings':
        return {
          title: t.header.settingsTitle,
          subtitle: t.header.settingsSubtitle,
        };
      default:
        return {
          title: t.common.appName,
          subtitle: t.common.tagline,
        };
    }
  };

  const details = getScreenDetails();

  return (
    <header className="px-4 sm:px-8 py-4 sm:py-5 flex items-center justify-between border-b border-slate-100 bg-white/80 backdrop-blur-xs sticky top-0 z-30">
      {/* Title & Subtitle */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 -ml-2 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[18px] sm:text-[22px] font-bold text-[#0b2545] tracking-tight">
              {details.title}
            </h1>
            {details.emoji && (
              <span className="text-xl leading-none" role="img" aria-label="Sun">
                {details.emoji}
              </span>
            )}
          </div>
          <p className="text-[12px] sm:text-[13px] text-[#64748b] font-medium mt-0.5 sm:mt-1 hidden sm:block">
            {details.subtitle}
          </p>
        </div>
      </div>

      {/* Right Utilities */}
      <div className="flex items-center gap-2.5 sm:gap-4">
        {/* Language Switcher Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setLangDropdownOpen(!langDropdownOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50/80 hover:bg-blue-100/80 border border-blue-200/80 rounded-full text-blue-900 font-bold text-[12px] sm:text-[13px] shadow-2xs transition-colors cursor-pointer"
            title="Change Language"
            aria-label="Change Language"
          >
            <Globe className="w-3.5 h-3.5 text-blue-600" />
            <span>{currentLangObj.native}</span>
          </button>

          {langDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setLangDropdownOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-44 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-40 text-xs font-semibold overflow-hidden">
                <div className="px-3 py-1.5 border-b border-slate-100 text-[10.5px] uppercase tracking-wider text-slate-400 font-bold">
                  {t.header.language}
                </div>
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => {
                      if (onLanguageChange) onLanguageChange(lang.code);
                      setLangDropdownOpen(false);
                    }}
                    className={`w-full px-3.5 py-2 text-left flex items-center justify-between transition-colors cursor-pointer ${
                      currentLanguage === lang.code
                        ? 'bg-blue-50 text-blue-700 font-bold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <p className="text-[13px]">{lang.native}</p>
                      <p className="text-[10px] text-slate-400">{lang.label}</p>
                    </div>
                    {currentLanguage === lang.code && (
                      <Check className="w-4 h-4 text-blue-600" />
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Live GPS / Location Selector */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setLocationDropdownOpen(!locationDropdownOpen)}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full border text-[12px] sm:text-[13px] font-semibold transition-all shadow-2xs cursor-pointer ${
              location.isGPS
                ? 'bg-emerald-50/90 border-emerald-300/80 text-emerald-950 hover:bg-emerald-100/80'
                : 'bg-slate-50 hover:bg-slate-100 border-slate-200/90 text-[#0b2545]'
            }`}
            title="Click to view or change port / GPS location"
            aria-label="Location options"
          >
            {locationLoading ? (
              <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin" />
            ) : location.isGPS ? (
              <span className="relative flex h-2 w-2 mr-0.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            ) : (
              <MapPin className="w-3.5 h-3.5 text-[#0d6efd] fill-[#0d6efd]/20" />
            )}

            <span className="truncate max-w-[85px] sm:max-w-[150px] font-bold">
              {location.name}
            </span>

            {location.isGPS && (
              <span className="hidden sm:inline-block px-1.5 py-0.2 rounded text-[9.5px] uppercase font-extrabold bg-emerald-200/90 text-emerald-900">
                GPS
              </span>
            )}
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 opacity-70" />
          </button>

          {/* Location Picker Dropdown */}
          {locationDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setLocationDropdownOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-40 text-xs font-semibold overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/40">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                      Active Coordinates
                    </p>
                    <p className="text-[13px] font-bold text-slate-900">{location.name}</p>
                    <p className="text-[10.5px] text-slate-500 font-medium">
                      {location.lat.toFixed(4)}° N, {location.lon.toFixed(4)}° E
                      {location.accuracy ? ` (±${location.accuracy}m)` : ''}
                    </p>
                  </div>
                  {location.isGPS ? (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                      Live GPS
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200">
                      Selected Port
                    </span>
                  )}
                </div>

                {/* GPS Refresh button */}
                <div className="p-2 border-b border-slate-100 bg-slate-50/60">
                  <button
                    type="button"
                    onClick={async () => {
                      await requestLocation();
                      setLocationDropdownOpen(false);
                    }}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-[#0d6efd] hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-xs cursor-pointer text-xs"
                  >
                    <LocateFixed className="w-3.5 h-3.5" />
                    <span>Detect My Exact GPS Location</span>
                  </button>
                  {permission === 'denied' && (
                    <p className="text-[10.5px] text-amber-700 mt-1.5 text-center font-normal">
                      GPS permission blocked in browser. Select a port below.
                    </p>
                  )}
                </div>

                {/* Coastal Ports List */}
                <div className="px-3.5 py-1.5 text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                  Major Coastal Fishing Hubs
                </div>
                <div className="max-h-60 overflow-y-auto px-1">
                  {availablePorts.map((port) => {
                    const isSelected =
                      Math.abs(port.lat - location.lat) < 0.01 &&
                      Math.abs(port.lon - location.lon) < 0.01;
                    return (
                      <button
                        key={port.id}
                        type="button"
                        onClick={() => {
                          selectPort(port);
                          setLocationDropdownOpen(false);
                        }}
                        className={`w-full px-3 py-2 rounded-xl text-left flex items-center justify-between transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50 text-blue-700 font-bold'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div>
                          <p className="text-[12.5px] font-semibold">{port.name}</p>
                          <p className="text-[10.5px] text-slate-400 font-normal">
                            {port.region} • {port.lat.toFixed(2)}°N, {port.lon.toFixed(2)}°E
                          </p>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Notification Bell with Badge */}
        <button
          type="button"
          onClick={onOpenNotifications}
          className="relative p-2 text-[#0b2545] hover:text-[#0d6efd] hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          title="Notifications"
          aria-label="Open notifications"
        >
          <Bell className="w-5 h-5 sm:w-6 sm:h-6 stroke-[1.8]" />
          {unreadAlertCount > 0 && (
            <span className="absolute top-1 right-1 bg-[#e53e3e] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white leading-none shadow-xs">
              {unreadAlertCount}
            </span>
          )}
        </button>

        {/* User Profile Avatar with Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            className="flex items-center gap-2 focus:outline-none cursor-pointer rounded-full ring-2 ring-transparent hover:ring-[#0d6efd]/30 transition-all"
            aria-label="User profile menu"
          >
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCE6632MBi--pTIZA1aiyfGjwgUGH4CZ9zTqvOrDoLWpgIomj49m_1prLT_UZUyfRZjdE2mjxYnzMrhMdKjq95FiFa1wB4C0t_1udrWezHba0VE4bSQjZPetkr6Ru3bdvAL9TWnTq166HOIPhVBSoLt_Z4FQ5mOkE-JVzqo0EenGq9Lt2ghuIXYCFIyRsiai2kWush8CZwIz36BFdf54uvUKG7CqGUSjjAsojga4BeCvGIVsEfTf7FMrmtsg9bYZaO0TyE"
              alt={`${userProfile.name} Profile`}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover object-top border border-slate-200 shadow-xs"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </button>

          {/* Profile Dropdown Menu */}
          {profileDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setProfileDropdownOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-40 text-xs font-semibold">
                <div className="px-4 py-2.5 border-b border-slate-100">
                  <p className="font-bold text-slate-900 text-sm">{userProfile.name}</p>
                  <p className="text-slate-500 text-[11px] font-normal">{userProfile.boatName}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                    {t.nav.activeVessel}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setProfileDropdownOpen(false);
                    onNavigate('settings');
                  }}
                  className="w-full px-4 py-2.5 text-left text-slate-700 hover:bg-slate-50 hover:text-blue-600 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <SettingsIcon className="w-4 h-4 text-slate-500" />
                  {t.header.accountSettings}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setProfileDropdownOpen(false);
                    onLogout();
                  }}
                  className="w-full px-4 py-2.5 text-left text-red-600 hover:bg-red-50 flex items-center gap-2.5 transition-colors cursor-pointer border-t border-slate-50"
                >
                  <LogOut className="w-4 h-4 text-red-500" />
                  {t.header.logout}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
