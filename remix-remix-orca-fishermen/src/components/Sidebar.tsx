import React from 'react';
import { AppScreen } from '../types';
import { OrcaLogo } from './OrcaLogo';
import {
  Home,
  LayoutGrid,
  TrendingUp,
  MapPin,
  Settings,
  Headset,
  Menu,
  X,
} from 'lucide-react';

interface SidebarProps {
  currentScreen: AppScreen;
  onNavigate: (screen: AppScreen) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onToggleCollapse?: () => void;
  onOpenHelpModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentScreen,
  onNavigate,
  isOpenMobile,
  onCloseMobile,
  onOpenHelpModal,
}) => {
  const navItems: { id: AppScreen; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp },
    { id: 'pfz-areas', label: 'PFZ Areas', icon: MapPin },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-[260px] bg-white border-r border-[#e6edf5] flex flex-col justify-between p-6 transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="space-y-8">
          {/* Top Brand Logo & Mobile Close */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="text-[#0b2545] hover:opacity-80 p-1.5 rounded-lg hover:bg-slate-100 transition-colors lg:block"
                title="Sidebar navigation"
                aria-label="Toggle menu"
              >
                <Menu className="w-5 h-5 text-[#0b2545]" />
              </button>
              <OrcaLogo size={36} textColor="#0b2545" />
            </div>

            {/* Mobile close icon */}
            <button
              type="button"
              className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
              onClick={onCloseMobile}
              aria-label="Close navigation"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1.5" aria-label="Main Navigation">
            {navItems.map((item) => {
              const isActive = currentScreen === item.id;
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onNavigate(item.id);
                    onCloseMobile();
                  }}
                  className={`w-full relative flex items-center gap-3.5 px-4 py-3 rounded-xl font-semibold text-[15px] transition-all cursor-pointer text-left ${
                    isActive
                      ? 'bg-[#e9f2fe] text-[#0d6efd] font-bold shadow-2xs'
                      : 'text-[#0b2545] hover:bg-slate-50 hover:text-[#0d6efd]'
                  }`}
                >
                  {/* Active Indicator Left Bar */}
                  {isActive && (
                    <span className="absolute left-0 top-2 bottom-2 w-1.5 bg-[#0d6efd] rounded-r-full" />
                  )}

                  <Icon
                    className={`w-5 h-5 shrink-0 ${
                      isActive ? 'text-[#0d6efd]' : 'text-[#0b2545]'
                    }`}
                  />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Need Help Support Card */}
        <div
          onClick={onOpenHelpModal}
          className="border border-[#e2e8f0] rounded-2xl p-4 flex items-center gap-3.5 bg-white hover:bg-slate-50 hover:border-blue-200 transition-all cursor-pointer shadow-2xs group"
          role="button"
          tabIndex={0}
        >
          <div className="w-10 h-10 rounded-xl bg-slate-50 group-hover:bg-blue-50 flex items-center justify-center text-[#0b2545] group-hover:text-[#0d6efd] transition-colors shrink-0">
            <Headset className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-[14px] font-bold text-[#0b2545] leading-snug">Need Help?</h4>
            <p className="text-[12px] text-[#64748b] font-medium leading-none mt-0.5">
              24/7 Support
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};
