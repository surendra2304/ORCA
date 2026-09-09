import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { 
  Compass, 
  Fish, 
  TrendingUp, 
  Activity, 
  CloudRain, 
  ShieldAlert 
  , Menu, X
} from 'lucide-react';

export const NavigationBar: React.FC = () => {
  const { t, userRole } = useApp();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  // Hide navigation on onboarding screens (Page 1, 2, 3)
  const isExcluded = ['/', '/language', '/user-details'].includes(location.pathname);
  if (isExcluded) {
    return null;
  }

  const navItems = [
    { to: '/others/home', label: t.navHome, icon: Compass },
    { to: '/others/fishing', label: t.navFishing, icon: Fish },
    { to: '/others/productivity', label: t.navProductivity, icon: TrendingUp },
    { to: '/others/analysis', label: t.navAnalysis, icon: Activity },
    { to: '/others/disasters', label: t.navDisasters, icon: CloudRain },
    { to: '/others/risk-prediction', label: t.navRiskPrediction, icon: ShieldAlert },
  ];

  return (
    <nav className="bg-white border-b border-slate-200 px-4 sm:px-6 sticky top-[57px] z-30 shadow-xs">
      <div className="max-w-7xl mx-auto py-2 sm:py-1">
        <div className="flex items-center justify-between sm:hidden">
          <span className="text-xs font-bold text-slate-700">Marine tools</span>
          <button
            type="button"
            onClick={() => setIsOpen((open) => !open)}
            aria-expanded={isOpen}
            aria-controls="marine-navigation"
            className="flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-bold text-[#20B2AA]"
          >
            {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            <span>{isOpen ? 'Close' : 'Menu'}</span>
          </button>
        </div>
        <div id="marine-navigation" className={`${isOpen ? 'flex' : 'hidden'} sm:flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 sm:pt-0`}>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:space-x-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setIsOpen(false)}
                className={`flex min-h-11 items-center space-x-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-[#20B2AA] text-white shadow-xs'
                    : 'text-slate-600 hover:text-[#20B2AA] hover:bg-[#e0f5f4]'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
          </div>

        {/* Operational Status indicator */}
        <div className="hidden lg:flex items-center space-x-2 text-xs text-slate-500 pl-4 border-l border-slate-200">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="font-medium text-slate-700">INCOIS / ISRO Satellite Synced</span>
        </div>
        </div>
      </div>
    </nav>
  );
};
