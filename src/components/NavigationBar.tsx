import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { 
  Compass, 
  Fish, 
  TrendingUp, 
  Activity, 
  CloudRain, 
  ShieldAlert 
} from 'lucide-react';

export const NavigationBar: React.FC = () => {
  const { t, userRole } = useApp();
  const location = useLocation();

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
    <nav className="w-full bg-ocean-card border-b border-ocean-sub px-4 sm:px-8 sticky top-[57px] z-30 shadow-xs">
      <div className="w-full flex items-center justify-between overflow-x-auto scrollbar-none py-1.5 gap-1 sm:gap-2">
        <div className="flex items-center space-x-1 sm:space-x-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-ocean-primary hover:bg-ocean-hover text-white shadow-xs'
                    : 'text-ocean-text hover:text-ocean-header hover:bg-ocean-sub/50'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>

        {/* Operational Status indicator */}
        <div className="hidden lg:flex items-center space-x-2 text-xs text-ocean-text/70 pl-4 border-l border-ocean-sub">
          <span className="w-2 h-2 rounded-full bg-ocean-primary animate-pulse"></span>
          <span className="font-medium text-ocean-text">INCOIS / ISRO Satellite Synced</span>
        </div>
      </div>
    </nav>
  );
};
