import React, { useState } from 'react';
import {
  ChevronDown,
  HelpCircle,
  FileText,
  Shield,
  LogOut,
  CheckCircle,
} from 'lucide-react';
import { UserProfile, UserPreferences } from '../types';
import { OrcaLogo } from './OrcaLogo';

import { translations, SupportedLanguage } from '../i18n/translations';

interface SettingsScreenProps {
  userProfile: UserProfile;
  preferences: UserPreferences;
  onUpdateProfile: (updated: UserProfile) => void;
  onUpdatePreferences: (updated: UserPreferences) => void;
  onLogout: () => void;
  onOpenHelpModal: () => void;
  onOpenLegalModal: (title: string, content: string) => void;
  currentLanguage?: SupportedLanguage;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  userProfile,
  preferences,
  onUpdateProfile,
  onUpdatePreferences,
  onLogout,
  onOpenHelpModal,
  onOpenLegalModal,
  currentLanguage = 'en',
}) => {
  const t = translations[currentLanguage] || translations.en;
  const [formData, setFormData] = useState<UserProfile>(userProfile);
  const [saveToast, setSaveToast] = useState(false);

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile(formData);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 3000);
  };

  return (
    <div className="space-y-6 pb-12 max-w-[1240px]">
      {saveToast && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl flex items-center gap-2 shadow-sm animate-fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>Profile updated successfully!</span>
        </div>
      )}

      {/* 3-Column Settings Grid */}
      <main className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* COLUMN 1: Profile Settings */}
        <section
          className="bg-white border border-[#edf2f9] rounded-[20px] p-6 shadow-xs flex flex-col justify-between"
          data-purpose="profile-settings-card"
        >
          <div>
            <h2 className="text-base font-bold text-slate-900 mb-5">Profile Settings</h2>
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              {/* Name Field */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5" htmlFor="input-name">
                  Name
                </label>
                <input
                  id="input-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full text-sm font-normal text-slate-800 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 focus:border-[#1a60eb] focus:ring-1 focus:ring-[#1a60eb] outline-none transition"
                />
              </div>

              {/* Phone Field */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5" htmlFor="input-phone">
                  Phone
                </label>
                <input
                  id="input-phone"
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full text-sm font-normal text-slate-800 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 focus:border-[#1a60eb] focus:ring-1 focus:ring-[#1a60eb] outline-none transition"
                />
              </div>

              {/* Boat Name Field */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5" htmlFor="input-boat">
                  Boat Name
                </label>
                <input
                  id="input-boat"
                  type="text"
                  value={formData.boatName}
                  onChange={(e) => setFormData({ ...formData, boatName: e.target.value })}
                  className="w-full text-sm font-normal text-slate-800 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 focus:border-[#1a60eb] focus:ring-1 focus:ring-[#1a60eb] outline-none transition"
                />
              </div>

              {/* Home Harbour Field */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5" htmlFor="input-harbour">
                  Home Harbour
                </label>
                <input
                  id="input-harbour"
                  type="text"
                  value={formData.homeHarbour}
                  onChange={(e) => setFormData({ ...formData, homeHarbour: e.target.value })}
                  className="w-full text-sm font-normal text-slate-800 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 focus:border-[#1a60eb] focus:ring-1 focus:ring-[#1a60eb] outline-none transition"
                />
              </div>

              <div className="mt-8 pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 bg-[#1a60eb] hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition shadow-sm cursor-pointer active:scale-98"
                >
                  Update Profile
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* COLUMN 2: Preferences */}
        <section
          className="bg-white border border-[#edf2f9] rounded-[20px] p-6 shadow-xs flex flex-col"
          data-purpose="preferences-card"
        >
          <h2 className="text-base font-bold text-slate-900 mb-5">Preferences</h2>
          <div className="space-y-5">
            {/* Distance Unit Dropdown */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">Distance Unit</span>
              <div className="relative w-44">
                <select
                  value={preferences.distanceUnit}
                  onChange={(e) =>
                    onUpdatePreferences({ ...preferences, distanceUnit: e.target.value as any })
                  }
                  className="w-full appearance-none bg-white border border-slate-200 text-xs font-normal text-slate-800 rounded-xl px-3 py-2 pr-8 focus:border-[#1a60eb] focus:ring-1 focus:ring-[#1a60eb] outline-none cursor-pointer"
                >
                  <option value="Kilometers (km)">Kilometers (km)</option>
                  <option value="Nautical Miles (NM)">Nautical Miles (NM)</option>
                  <option value="Miles (mi)">Miles (mi)</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
                  <ChevronDown className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
              </div>
            </div>

            {/* Temperature Unit Dropdown */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">Temperature Unit</span>
              <div className="relative w-44">
                <select
                  value={preferences.tempUnit}
                  onChange={(e) =>
                    onUpdatePreferences({ ...preferences, tempUnit: e.target.value as any })
                  }
                  className="w-full appearance-none bg-white border border-slate-200 text-xs font-normal text-slate-800 rounded-xl px-3 py-2 pr-8 focus:border-[#1a60eb] focus:ring-1 focus:ring-[#1a60eb] outline-none cursor-pointer"
                >
                  <option value="Celsius (°C)">Celsius (°C)</option>
                  <option value="Fahrenheit (°F)">Fahrenheit (°F)</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
                  <ChevronDown className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
              </div>
            </div>

            {/* Wind Unit Dropdown */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">Wind Unit</span>
              <div className="relative w-44">
                <select
                  value={preferences.windUnit}
                  onChange={(e) =>
                    onUpdatePreferences({ ...preferences, windUnit: e.target.value as any })
                  }
                  className="w-full appearance-none bg-white border border-slate-200 text-xs font-normal text-slate-800 rounded-xl px-3 py-2 pr-8 focus:border-[#1a60eb] focus:ring-1 focus:ring-[#1a60eb] outline-none cursor-pointer"
                >
                  <option value="km/h">km/h</option>
                  <option value="Knots (kn)">Knots (kn)</option>
                  <option value="m/s">m/s</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
                  <ChevronDown className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
              </div>
            </div>

            <div className="pt-2" />

            {/* Notifications Toggle */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs font-semibold text-slate-700">Notifications</span>
              <button
                type="button"
                onClick={() =>
                  onUpdatePreferences({
                    ...preferences,
                    notifications: !preferences.notifications,
                  })
                }
                className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out focus:outline-none flex items-center cursor-pointer ${
                  preferences.notifications
                    ? 'bg-[#1a60eb] justify-end'
                    : 'bg-slate-300 justify-start'
                }`}
                aria-label="Toggle notifications"
              >
                <div className="w-4 h-4 bg-white rounded-full shadow-xs" />
              </button>
            </div>

            {/* Dark Mode Toggle */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs font-semibold text-slate-700">Dark Mode</span>
              <button
                type="button"
                onClick={() =>
                  onUpdatePreferences({
                    ...preferences,
                    darkMode: !preferences.darkMode,
                  })
                }
                className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out focus:outline-none flex items-center cursor-pointer ${
                  preferences.darkMode
                    ? 'bg-[#1a60eb] justify-end'
                    : 'bg-slate-300 justify-start'
                }`}
                aria-label="Toggle dark mode"
              >
                <div className="w-4 h-4 bg-white rounded-full shadow-xs" />
              </button>
            </div>
          </div>
        </section>

        {/* COLUMN 3: About & Info Links */}
        <section
          className="bg-white border border-[#edf2f9] rounded-[20px] p-6 shadow-xs flex flex-col justify-between"
          data-purpose="about-card"
        >
          <div>
            <h2 className="text-base font-bold text-slate-900 mb-4">About</h2>

            {/* Center Brand Badge */}
            <div className="flex flex-col items-center text-center mt-2 mb-6">
              <OrcaLogo size={48} textColor="#0d254c" />
              <p className="text-xs text-slate-600 mt-3 max-w-[210px] leading-relaxed">
                Smart marine intelligence for safer and better fishing.
              </p>
              <span className="text-xs text-slate-400 mt-2 font-medium">Version 1.0.0</span>
            </div>

            {/* Action and Support Item List */}
            <div className="space-y-2.5">
              {/* Help & Support */}
              <button
                type="button"
                onClick={onOpenHelpModal}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition text-slate-700 text-xs font-medium cursor-pointer text-left"
              >
                <HelpCircle className="w-4 h-4 text-slate-600 stroke-[2]" />
                <span>Help & Support</span>
              </button>

              {/* Privacy Policy */}
              <button
                type="button"
                onClick={() =>
                  onOpenLegalModal(
                    'Privacy Policy',
                    'ORCA protects your location telemetry, catch records, and navigational logs. Data is encrypted using TLS and stored securely on cloud marine nodes. Satellite imagery and PFZ advisories are synchronized under official INCOIS marine licenses.'
                  )
                }
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition text-slate-700 text-xs font-medium cursor-pointer text-left"
              >
                <FileText className="w-4 h-4 text-slate-600 stroke-[2]" />
                <span>Privacy Policy</span>
              </button>

              {/* Terms of Use */}
              <button
                type="button"
                onClick={() =>
                  onOpenLegalModal(
                    'Terms of Use',
                    'By using ORCA Fishermen, you agree to adhere to maritime security rules, respect Indian Coast Guard restricted boundaries, and utilize sea surface temperature (SST) advisories as supplementary guidance alongside official port warnings.'
                  )
                }
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition text-slate-700 text-xs font-medium cursor-pointer text-left"
              >
                <Shield className="w-4 h-4 text-slate-600 stroke-[2]" />
                <span>Terms of Use</span>
              </button>
            </div>
          </div>

          {/* Logout Action Button */}
          <div className="mt-6">
            <button
              type="button"
              onClick={onLogout}
              className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-red-100 hover:bg-red-50 text-red-600 text-xs font-bold w-full justify-start transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4 stroke-[2.5]" />
              <span>Logout</span>
            </button>
          </div>
        </section>
      </main>
    </div>
  );
};
