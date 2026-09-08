import React, { useState } from 'react';
import { AppScreen, UserProfile } from '../types';
import { MapPin, Bell, Menu, User, Settings as SettingsIcon, LogOut } from 'lucide-react';

interface HeaderProps {
  currentScreen: AppScreen;
  userProfile: UserProfile;
  unreadAlertCount: number;
  onOpenNotifications: () => void;
  onOpenMobileMenu: () => void;
  onNavigate: (screen: AppScreen) => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentScreen,
  userProfile,
  unreadAlertCount,
  onOpenNotifications,
  onOpenMobileMenu,
  onNavigate,
  onLogout,
}) => {
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const getScreenDetails = () => {
    switch (currentScreen) {
      case 'home':
        return {
          title: `Good Morning, ${userProfile.name}!`,
          emoji: '☀️',
          subtitle: 'Your smart companion for safe and successful fishing.',
        };
      case 'dashboard':
        return {
          title: 'Dashboard',
          subtitle: 'Overview of your fishing activities and conditions.',
        };
      case 'analytics':
        return {
          title: 'Analytics',
          subtitle: 'Track your performance and catch insights.',
        };
      case 'pfz-areas':
        return {
          title: 'PFZ Areas',
          subtitle: 'Potential Fishing Zone information and suitability.',
        };
      case 'settings':
        return {
          title: 'Settings',
          subtitle: 'Manage your profile, preferences and app settings.',
        };
      default:
        return {
          title: 'ORCA Fishermen',
          subtitle: 'Marine intelligence platform.',
        };
    }
  };

  const details = getScreenDetails();

  return (
    <header className="px-6 sm:px-8 py-5 sm:py-6 flex items-center justify-between border-b border-slate-100 bg-white/80 backdrop-blur-xs sticky top-0 z-30">
      {/* Title & Subtitle */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 -ml-2 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[20px] sm:text-[23px] font-bold text-[#0b2545] tracking-tight">
              {details.title}
            </h1>
            {details.emoji && (
              <span className="text-xl leading-none" role="img" aria-label="Sun">
                {details.emoji}
              </span>
            )}
          </div>
          <p className="text-[12.5px] sm:text-[13px] text-[#64748b] font-medium mt-0.5 sm:mt-1 hidden sm:block">
            {details.subtitle}
          </p>
        </div>
      </div>

      {/* Right Utilities */}
      <div className="flex items-center gap-3.5 sm:gap-6">
        {/* Location Indicator */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200/80 rounded-full text-[#0b2545] font-semibold text-[12.5px] sm:text-[13.5px] shadow-2xs">
          <MapPin className="w-3.5 h-3.5 text-[#0d6efd] fill-[#0d6efd]/20" />
          <span className="truncate max-w-[110px] sm:max-w-none">{userProfile.location}</span>
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
            {/* Ramesh Avatar using the hotlinked profile image from HTML */}
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCE6632MBi--pTIZA1aiyfGjwgUGH4CZ9zTqvOrDoLWpgIomj49m_1prLT_UZUyfRZjdE2mjxYnzMrhMdKjq95FiFa1wB4C0t_1udrWezHba0VE4bSQjZPetkr6Ru3bdvAL9TWnTq166HOIPhVBSoLt_Z4FQ5mOkE-JVzqo0EenGq9Lt2ghuIXYCFIyRsiai2kWush8CZwIz36BFdf54uvUKG7CqGUSjjAsojga4BeCvGIVsEfTf7FMrmtsg9bYZaO0TyE"
              alt={`${userProfile.name} Profile`}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover object-top border border-slate-200 shadow-xs"
              onError={(e) => {
                // Fallback if image fails
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
                    Active Vessel
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
                  Account Settings
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
                  Logout
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
