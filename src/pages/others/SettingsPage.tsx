import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { SUPPORTED_LANGUAGES, LanguageCode } from '../../i18n/translations';
import { COASTAL_REGIONS, CoastalRegion } from '../../services/marineData';
import { 
  Sliders, 
  Globe, 
  Bell, 
  CloudSun, 
  ShieldCheck, 
  Eye, 
  User, 
  Save, 
  RotateCcw, 
  Check, 
  AlertTriangle, 
  Lock, 
  LogOut, 
  Moon, 
  Sun, 
  Monitor, 
  MapPin, 
  Volume2, 
  Wifi, 
  Edit3, 
  Radio,
  FileCheck
} from 'lucide-react';

interface SettingsState {
  // General
  appearance: 'light' | 'dark' | 'system';
  units: 'metric' | 'imperial';
  mapDisplay: 'standard' | 'satellite';
  autoRefresh: boolean;
  audioChimes: boolean;

  // Language & Region
  timeZone: string;

  // Notifications
  criticalAlerts: boolean;
  weatherAlerts: boolean;
  cycloneWarnings: boolean;
  highWaveAlerts: boolean;
  routeSafetyAlerts: boolean;
  pushNotifications: boolean;
  emailNotifications: boolean;

  // Weather & Marine Data
  liveWeather: boolean;
  marineConditions: boolean;
  windData: boolean;
  waveSwellData: boolean;
  refreshInterval: '5' | '10' | '15' | '30';

  // Privacy & Security
  locationAccess: boolean;
  dataSharing: boolean;
  activityHistory: boolean;

  // Accessibility
  textSize: 'small' | 'medium' | 'large';
  highContrast: boolean;
  reducedMotion: boolean;
  screenReader: boolean;

  // Account
  email: string;
}

const DEFAULT_SETTINGS: SettingsState = {
  appearance: 'light',
  units: 'metric',
  mapDisplay: 'standard',
  autoRefresh: true,
  audioChimes: true,
  timeZone: 'India Standard Time (IST, UTC+5:30)',
  criticalAlerts: true,
  weatherAlerts: true,
  cycloneWarnings: true,
  highWaveAlerts: true,
  routeSafetyAlerts: true,
  pushNotifications: true,
  emailNotifications: false,
  liveWeather: true,
  marineConditions: true,
  windData: true,
  waveSwellData: true,
  refreshInterval: '10',
  locationAccess: true,
  dataSharing: false,
  activityHistory: true,
  textSize: 'medium',
  highContrast: false,
  reducedMotion: false,
  screenReader: false,
  email: 'captain.prasad@orca.gov.in',
};

export const SettingsPage: React.FC = () => {
  const { 
    language, 
    setLanguage, 
    selectedRegion, 
    setSelectedRegion, 
    userName, 
    setUserName, 
    userRole 
  } = useApp();

  const [activeTab, setActiveTab] = useState<
    'general' | 'language-region' | 'notifications' | 'weather-marine' | 'privacy' | 'accessibility' | 'account'
  >('general');

  const [settings, setSettings] = useState<SettingsState>(() => {
    const saved = localStorage.getItem('orca_user_settings');
    if (saved) {
      try {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      } catch (e) {
        return DEFAULT_SETTINGS;
      }
    }
    return DEFAULT_SETTINGS;
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState<boolean>(false);
  const [tempUserName, setTempUserName] = useState<string>(userName || 'Captain Prasad');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  const handleSave = () => {
    localStorage.setItem('orca_user_settings', JSON.stringify(settings));
    showToast('Settings saved successfully.');
  };

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
    setLanguage('en');
    setSelectedRegion(COASTAL_REGIONS[0]);
    localStorage.removeItem('orca_user_settings');
    showToast('Settings restored to default values.');
  };

  const categories = [
    { id: 'general', label: 'General', icon: Sliders },
    { id: 'language-region', label: 'Language & Region', icon: Globe },
    { id: 'notifications', label: 'Notifications & Alerts', icon: Bell },
    { id: 'weather-marine', label: 'Weather & Marine Data', icon: CloudSun },
    { id: 'privacy', label: 'Privacy & Security', icon: ShieldCheck },
    { id: 'accessibility', label: 'Accessibility', icon: Eye },
    { id: 'account', label: 'Account', icon: User },
  ] as const;

  return (
    <div className="w-full min-h-screen bg-[#f0f4f5] text-ocean-text p-4 sm:p-6 lg:p-8 space-y-6 select-none font-sans">
      
      {/* Toast Confirmation */}
      {toastMessage && (
        <div className="fixed top-20 right-8 z-50 bg-white border border-emerald-300 text-emerald-800 px-4 py-3 rounded-2xl shadow-xl flex items-center space-x-2 animate-in fade-in slide-in-from-top-4">
          <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
            <Check className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs sm:text-sm font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-ocean-sub/80 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-ocean-text tracking-tight flex items-center space-x-2">
            <span>Settings</span>
          </h1>
          <p className="text-xs sm:text-sm text-ocean-text/70 mt-0.5">
            Manage your ORCA experience, alerts, language, location and account preferences.
          </p>
        </div>

        {/* Global Save / Reset Quick Action Bar */}
        <div className="flex items-center space-x-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center space-x-1.5 px-3 py-2 bg-[#f0f4f5] hover:bg-slate-200 border border-ocean-sub text-ocean-text/80 text-xs font-semibold rounded-xl transition-all active:scale-95 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-ocean-text/60" />
            <span>Reset to Default</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center space-x-1.5 px-4 py-2 bg-[#2a8a89] hover:bg-[#38a3a5] text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Changes</span>
          </button>
        </div>
      </div>

      {/* Main Settings 2-Column Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Navigation Column (4 Cols) */}
        <div className="lg:col-span-4 bg-white p-3 rounded-2xl border border-ocean-sub shadow-xs space-y-1">
          <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-ocean-text/50">
            Settings Categories
          </div>

          {categories.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeTab === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveTab(cat.id)}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all text-left cursor-pointer ${
                  isActive
                    ? 'bg-[#2a8a89] text-white font-bold shadow-xs'
                    : 'text-ocean-text hover:bg-[#f0f4f5] hover:text-ocean-text'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-[#2a8a89]'}`} />
                  <span>{cat.label}</span>
                </div>
                {isActive && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
              </button>
            );
          })}
        </div>

        {/* Right Settings Content Area (8 Cols) */}
        <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-ocean-sub shadow-xs min-h-[500px]">
          
          {/* ================= 1. GENERAL ================= */}
          {activeTab === 'general' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="border-b border-ocean-sub/60 pb-3">
                <h2 className="text-base font-bold text-ocean-text">General Preferences</h2>
                <p className="text-xs text-ocean-text/70 mt-0.5">
                  Configure default interface appearance, measuring units, and map rendering.
                </p>
              </div>

              {/* Appearance */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-ocean-text/90 uppercase tracking-wider">
                  Appearance Theme
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'light', label: 'Light', icon: Sun },
                    { id: 'dark', label: 'Dark', icon: Moon },
                    { id: 'system', label: 'System', icon: Monitor },
                  ].map((theme) => {
                    const Icon = theme.icon;
                    const isSelected = settings.appearance === theme.id;
                    return (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => setSettings(s => ({ ...s, appearance: theme.id as any }))}
                        className={`p-3.5 rounded-xl border flex flex-col items-center justify-center space-y-1.5 text-xs font-semibold transition-all cursor-pointer ${
                          isSelected
                            ? 'border-[#2a8a89] bg-[#2a8a89]/10 text-[#2a8a89] ring-2 ring-[#2a8a89]/20 font-bold'
                            : 'border-ocean-sub bg-[#f0f4f5] text-ocean-text hover:bg-slate-200'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{theme.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Units */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-ocean-text/90 uppercase tracking-wider">
                  Measurement Units
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'metric', label: 'Metric', desc: 'km/h, meters, °C, NM' },
                    { id: 'imperial', label: 'Imperial', desc: 'knots, feet, °F, mi' },
                  ].map((u) => {
                    const isSelected = settings.units === u.id;
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => setSettings(s => ({ ...s, units: u.id as any }))}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-[#2a8a89] bg-[#2a8a89]/10 ring-2 ring-[#2a8a89]/20'
                            : 'border-ocean-sub bg-[#f0f4f5] hover:bg-slate-200'
                        }`}
                      >
                        <div className="text-xs font-bold text-ocean-text">{u.label}</div>
                        <div className="text-[10px] text-ocean-text/60 mt-0.5">{u.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Map Display */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-ocean-text/90 uppercase tracking-wider">
                  Default Map Display
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'standard', label: 'Standard Marine Chart', desc: 'Voyager High-Contrast Maritime Basemap' },
                    { id: 'satellite', label: 'Satellite Bathymetry', desc: 'Synthetic Aperture Radar & Ocean Relief' },
                  ].map((m) => {
                    const isSelected = settings.mapDisplay === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSettings(s => ({ ...s, mapDisplay: m.id as any }))}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-[#2a8a89] bg-[#2a8a89]/10 ring-2 ring-[#2a8a89]/20'
                            : 'border-ocean-sub bg-[#f0f4f5] hover:bg-slate-200'
                        }`}
                      >
                        <div className="text-xs font-bold text-ocean-text">{m.label}</div>
                        <div className="text-[10px] text-ocean-text/60 mt-0.5">{m.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Auto Refresh Toggle */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#f0f4f5] border border-ocean-sub">
                <div>
                  <div className="text-xs font-bold text-ocean-text">Auto Refresh</div>
                  <div className="text-[11px] text-ocean-text/70 mt-0.5">
                    Automatically refresh marine intelligence, satellite telemetry, and live hazard data.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSettings(s => ({ ...s, autoRefresh: !s.autoRefresh }))}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    settings.autoRefresh ? 'bg-[#2a8a89]' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      settings.autoRefresh ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {/* ================= 2. LANGUAGE & REGION ================= */}
          {activeTab === 'language-region' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="border-b border-ocean-sub/60 pb-3">
                <h2 className="text-base font-bold text-ocean-text">Language & Region</h2>
                <p className="text-xs text-ocean-text/70 mt-0.5">
                  Select your localized primary language and coastal operational zone.
                </p>
              </div>

              {/* Language Selection */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-ocean-text/90 uppercase tracking-wider">
                  Application Language
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {SUPPORTED_LANGUAGES.map((l) => {
                    const isSelected = language === l.code;
                    return (
                      <button
                        key={l.code}
                        type="button"
                        onClick={() => setLanguage(l.code)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-[#2a8a89] bg-[#2a8a89]/10 text-[#2a8a89] ring-2 ring-[#2a8a89]/20 font-bold'
                            : 'border-ocean-sub bg-[#f0f4f5] text-ocean-text hover:bg-slate-200'
                        }`}
                      >
                        <div className="text-xs font-bold">{l.name}</div>
                        <div className="text-[10px] opacity-70 mt-0.5">{l.nativeName}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Region Selection */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-ocean-text/90 uppercase tracking-wider">
                  Coastal Region
                </label>
                <select
                  value={selectedRegion.id}
                  onChange={(e) => {
                    const reg = COASTAL_REGIONS.find(r => r.id === e.target.value);
                    if (reg) setSelectedRegion(reg);
                  }}
                  className="w-full px-3.5 py-2.5 bg-[#f0f4f5] border border-ocean-sub rounded-xl text-xs sm:text-sm font-semibold text-ocean-text focus:outline-hidden focus:border-[#2a8a89]"
                >
                  {COASTAL_REGIONS.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.state})
                    </option>
                  ))}
                </select>
              </div>

              {/* Time Zone */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-ocean-text/90 uppercase tracking-wider">
                  Time Zone
                </label>
                <input
                  type="text"
                  readOnly
                  value={settings.timeZone}
                  className="w-full px-3.5 py-2.5 bg-[#f0f4f5] border border-ocean-sub rounded-xl text-xs sm:text-sm font-semibold text-ocean-text/80 cursor-default"
                />
              </div>
            </div>
          )}

          {/* ================= 3. NOTIFICATIONS & ALERTS ================= */}
          {activeTab === 'notifications' && (
            <div className="space-y-5 animate-in fade-in">
              <div className="border-b border-ocean-sub/60 pb-3">
                <h2 className="text-base font-bold text-ocean-text">Notification Preferences</h2>
                <p className="text-xs text-ocean-text/70 mt-0.5">
                  Configure alerts and warning thresholds for extreme ocean conditions.
                </p>
              </div>

              <div className="space-y-2.5">
                {[
                  {
                    key: 'criticalAlerts',
                    label: 'Critical Maritime Alerts',
                    desc: 'Emergency tsunami, severe cyclone, and vessel distress notifications.',
                    highlight: true,
                  },
                  {
                    key: 'weatherAlerts',
                    label: 'Weather Alerts',
                    desc: 'High wind speed, fog, and precipitation forecasts.',
                  },
                  {
                    key: 'cycloneWarnings',
                    label: 'Cyclone Warnings',
                    desc: 'Early cyclonic depression track prediction and coastal landfall alerts.',
                  },
                  {
                    key: 'highWaveAlerts',
                    label: 'High Wave / Swell Alerts',
                    desc: 'Dangerous sea surface surge and oceanic swell height anomalies.',
                  },
                  {
                    key: 'routeSafetyAlerts',
                    label: 'Route Safety Alerts',
                    desc: 'Live notices when plotted route enters designated marine risk corridors.',
                  },
                  {
                    key: 'pushNotifications',
                    label: 'Push Notifications',
                    desc: 'Deliver instant desktop notifications even when tab is backgrounded.',
                  },
                  {
                    key: 'emailNotifications',
                    label: 'Email Notifications',
                    desc: 'Send daily marine intelligence briefings to registered email.',
                  },
                ].map((item) => {
                  const isChecked = (settings as any)[item.key];
                  return (
                    <div
                      key={item.key}
                      className={`flex items-center justify-between p-3.5 rounded-xl border ${
                        item.highlight
                          ? 'bg-red-50/70 border-red-200'
                          : 'bg-[#f0f4f5] border-ocean-sub'
                      }`}
                    >
                      <div>
                        <div className={`text-xs font-bold ${item.highlight ? 'text-red-800' : 'text-ocean-text'}`}>
                          {item.label}
                        </div>
                        <div className="text-[11px] text-ocean-text/70 mt-0.5">{item.desc}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setSettings(s => ({ ...s, [item.key]: !isChecked }))
                        }
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                          isChecked ? (item.highlight ? 'bg-red-600' : 'bg-[#2a8a89]') : 'bg-slate-300'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                            isChecked ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ================= 4. WEATHER & MARINE DATA ================= */}
          {activeTab === 'weather-marine' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="border-b border-ocean-sub/60 pb-3">
                <h2 className="text-base font-bold text-ocean-text">Weather & Marine Data</h2>
                <p className="text-xs text-ocean-text/70 mt-0.5">
                  Manage live oceanic telemetry feeds, sensor sync intervals, and marine overlays.
                </p>
              </div>

              <div className="space-y-2.5">
                {[
                  { key: 'liveWeather', label: 'Live Weather', desc: 'Real-time coastal weather telemetry from INCOIS stations.' },
                  { key: 'marineConditions', label: 'Marine Conditions', desc: 'Sea state, oceanic clarity, and chlorophyll density.' },
                  { key: 'windData', label: 'Wind Data', desc: 'High-resolution wind vector speed and direction.' },
                  { key: 'waveSwellData', label: 'Wave & Swell Data', desc: 'Swell period, significant wave height, and breaker zones.' },
                ].map((item) => {
                  const isChecked = (settings as any)[item.key];
                  return (
                    <div
                      key={item.key}
                      className="flex items-center justify-between p-3.5 rounded-xl bg-[#f0f4f5] border border-ocean-sub"
                    >
                      <div>
                        <div className="text-xs font-bold text-ocean-text">{item.label}</div>
                        <div className="text-[11px] text-ocean-text/70 mt-0.5">{item.desc}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setSettings(s => ({ ...s, [item.key]: !isChecked }))
                        }
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                          isChecked ? 'bg-[#2a8a89]' : 'bg-slate-300'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                            isChecked ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Data Refresh Interval */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-ocean-text/90 uppercase tracking-wider">
                  Data Refresh Interval
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {['5', '10', '15', '30'].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setSettings(s => ({ ...s, refreshInterval: val as any }))}
                      className={`p-2.5 rounded-xl border text-center text-xs font-bold transition-all cursor-pointer ${
                        settings.refreshInterval === val
                          ? 'border-[#2a8a89] bg-[#2a8a89]/10 text-[#2a8a89] ring-2 ring-[#2a8a89]/20'
                          : 'border-ocean-sub bg-[#f0f4f5] text-ocean-text hover:bg-slate-200'
                      }`}
                    >
                      {val} mins
                    </button>
                  ))}
                </div>
              </div>

              {/* Preferred Coastal Region */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-ocean-text/90 uppercase tracking-wider">
                  Preferred Coastal Region
                </label>
                <div className="p-3.5 rounded-xl bg-[#f0f4f5] border border-ocean-sub flex items-center justify-between text-xs font-semibold text-ocean-text">
                  <span>{selectedRegion.name} ({selectedRegion.state})</span>
                  <span className="text-[#2a8a89] font-bold">Active Stream</span>
                </div>
              </div>
            </div>
          )}

          {/* ================= 5. PRIVACY & SECURITY ================= */}
          {activeTab === 'privacy' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="border-b border-ocean-sub/60 pb-3">
                <h2 className="text-base font-bold text-ocean-text">Privacy & Security</h2>
                <p className="text-xs text-ocean-text/70 mt-0.5">
                  Manage telemetry sharing, device permissions, and security sessions.
                </p>
              </div>

              <div className="space-y-2.5">
                {[
                  {
                    key: 'locationAccess',
                    label: 'Location Access',
                    desc: 'Allow ORCA to use your location for relevant marine and route information.',
                  },
                  {
                    key: 'dataSharing',
                    label: 'Data Sharing',
                    desc: 'Share anonymous route statistics to assist Indian maritime safety algorithms.',
                  },
                  {
                    key: 'activityHistory',
                    label: 'Activity History',
                    desc: 'Save voyage search records and route optimization calculations locally.',
                  },
                ].map((item) => {
                  const isChecked = (settings as any)[item.key];
                  return (
                    <div
                      key={item.key}
                      className="flex items-center justify-between p-3.5 rounded-xl bg-[#f0f4f5] border border-ocean-sub"
                    >
                      <div>
                        <div className="text-xs font-bold text-ocean-text">{item.label}</div>
                        <div className="text-[11px] text-ocean-text/70 mt-0.5">{item.desc}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setSettings(s => ({ ...s, [item.key]: !isChecked }))
                        }
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                          isChecked ? 'bg-[#2a8a89]' : 'bg-slate-300'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                            isChecked ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Session Security */}
              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <ShieldCheck className="w-5 h-5 text-emerald-700" />
                  <div>
                    <div className="text-xs font-bold text-emerald-900">Session Security</div>
                    <div className="text-[11px] text-emerald-800">
                      Active NavIC Encrypted Session — Verified 256-bit AES
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-800">
                  Protected
                </span>
              </div>

              {/* Sign Out Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Are you sure you want to sign out of your ORCA session?')) {
                      window.location.href = '/';
                    }
                  }}
                  className="flex items-center space-x-2 px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}

          {/* ================= 6. ACCESSIBILITY ================= */}
          {activeTab === 'accessibility' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="border-b border-ocean-sub/60 pb-3">
                <h2 className="text-base font-bold text-ocean-text">Accessibility</h2>
                <p className="text-xs text-ocean-text/70 mt-0.5">
                  Customize text scaling, visual contrast, and assistive reading tools.
                </p>
              </div>

              {/* Text Size */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-ocean-text/90 uppercase tracking-wider">
                  Text Size
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'small', label: 'Small', desc: 'Compact UI' },
                    { id: 'medium', label: 'Medium', desc: 'Standard Default' },
                    { id: 'large', label: 'Large', desc: 'High Legibility' },
                  ].map((t) => {
                    const isSelected = settings.textSize === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setSettings(s => ({ ...s, textSize: t.id as any }))}
                        className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'border-[#2a8a89] bg-[#2a8a89]/10 text-[#2a8a89] ring-2 ring-[#2a8a89]/20 font-bold'
                            : 'border-ocean-sub bg-[#f0f4f5] text-ocean-text hover:bg-slate-200'
                        }`}
                      >
                        <div className="text-xs font-bold">{t.label}</div>
                        <div className="text-[10px] opacity-70 mt-0.5">{t.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-2.5">
                {[
                  {
                    key: 'highContrast',
                    label: 'High Contrast Mode',
                    desc: 'Enhance visibility of map borders, text typography, and metric cards.',
                  },
                  {
                    key: 'reducedMotion',
                    label: 'Reduced Motion',
                    desc: 'Minimize pulsing radar effects and complex screen transitions.',
                  },
                  {
                    key: 'screenReader',
                    label: 'Screen Reader Support',
                    desc: 'Optimize ARIA labels and structure for assistive screen reader devices.',
                  },
                ].map((item) => {
                  const isChecked = (settings as any)[item.key];
                  return (
                    <div
                      key={item.key}
                      className="flex items-center justify-between p-3.5 rounded-xl bg-[#f0f4f5] border border-ocean-sub"
                    >
                      <div>
                        <div className="text-xs font-bold text-ocean-text">{item.label}</div>
                        <div className="text-[11px] text-ocean-text/70 mt-0.5">{item.desc}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setSettings(s => ({ ...s, [item.key]: !isChecked }))
                        }
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                          isChecked ? 'bg-[#2a8a89]' : 'bg-slate-300'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                            isChecked ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ================= 7. ACCOUNT ================= */}
          {activeTab === 'account' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="border-b border-ocean-sub/60 pb-3">
                <h2 className="text-base font-bold text-ocean-text">Account Information</h2>
                <p className="text-xs text-ocean-text/70 mt-0.5">
                  View and manage your active analyst profile and maritime credentials.
                </p>
              </div>

              {/* Profile Card */}
              <div className="p-4 rounded-xl bg-[#f0f4f5] border border-ocean-sub flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-3.5">
                  <div className="w-12 h-12 rounded-full bg-[#2a8a89]/20 text-[#2a8a89] flex items-center justify-center font-extrabold text-lg border border-[#2a8a89]/30 shadow-2xs">
                    {userName ? userName.charAt(0) : 'P'}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-ocean-text">{userName || 'Captain Prasad'}</div>
                    <div className="text-xs font-semibold text-[#2a8a89]">Maritime Analyst</div>
                    <div className="text-[11px] text-ocean-text/60 mt-0.5">
                      Division: Coast Guard Operational Maritime Command
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setTempUserName(userName || 'Captain Prasad');
                    setIsEditProfileOpen(true);
                  }}
                  className="flex items-center space-x-1.5 px-3 py-2 bg-white hover:bg-[#2a8a89]/10 text-[#2a8a89] border border-[#2a8a89]/30 text-xs font-bold rounded-xl transition-all shadow-2xs cursor-pointer self-start sm:self-auto"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Profile</span>
                </button>
              </div>

              {/* Account Details Form */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-ocean-text/80 uppercase tracking-wider mb-1">
                    Official Email
                  </label>
                  <input
                    type="email"
                    readOnly
                    value={settings.email}
                    className="w-full px-3.5 py-2.5 bg-[#f0f4f5] border border-ocean-sub rounded-xl font-medium text-ocean-text cursor-default"
                  />
                </div>

                <div>
                  <label className="block font-bold text-ocean-text/80 uppercase tracking-wider mb-1">
                    Account Type
                  </label>
                  <input
                    type="text"
                    readOnly
                    value="Maritime Analyst (Full Analytics Suite)"
                    className="w-full px-3.5 py-2.5 bg-[#f0f4f5] border border-ocean-sub rounded-xl font-medium text-ocean-text cursor-default"
                  />
                </div>

                <div>
                  <label className="block font-bold text-ocean-text/80 uppercase tracking-wider mb-1">
                    Station Location
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={`${selectedRegion.name} Offshore Hub`}
                    className="w-full px-3.5 py-2.5 bg-[#f0f4f5] border border-ocean-sub rounded-xl font-medium text-ocean-text cursor-default"
                  />
                </div>

                <div>
                  <label className="block font-bold text-ocean-text/80 uppercase tracking-wider mb-1">
                    Telemetry Key
                  </label>
                  <input
                    type="text"
                    readOnly
                    value="ORCA-INCOIS-AUTH-8829-X"
                    className="w-full px-3.5 py-2.5 bg-[#f0f4f5] border border-ocean-sub rounded-xl font-mono text-ocean-text/70 cursor-default"
                  />
                </div>
              </div>

              {/* Inline Edit Profile Modal */}
              {isEditProfileOpen && (
                <div className="p-4 rounded-xl bg-white border border-[#2a8a89]/40 shadow-lg space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between border-b border-ocean-sub/60 pb-2">
                    <span className="text-xs font-bold text-ocean-text">Edit Display Name</span>
                    <button
                      type="button"
                      onClick={() => setIsEditProfileOpen(false)}
                      className="text-xs text-ocean-text/60 hover:text-ocean-text"
                    >
                      Cancel
                    </button>
                  </div>
                  <div>
                    <input
                      type="text"
                      value={tempUserName}
                      onChange={(e) => setTempUserName(e.target.value)}
                      className="w-full px-3 py-2 bg-[#f0f4f5] border border-ocean-sub rounded-xl text-xs font-bold text-ocean-text focus:outline-hidden focus:border-[#2a8a89]"
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        setUserName(tempUserName);
                        localStorage.setItem('orca_user_name', tempUserName);
                        setIsEditProfileOpen(false);
                        showToast('Profile updated successfully.');
                      }}
                      className="px-3 py-1.5 bg-[#2a8a89] hover:bg-[#38a3a5] text-white text-xs font-bold rounded-lg cursor-pointer shadow-xs"
                    >
                      Save Profile
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
