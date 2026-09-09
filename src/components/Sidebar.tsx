import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { 
  Compass, 
  Fish, 
  Navigation, 
  TrendingUp, 
  Activity, 
  AlertTriangle, 
  Mic, 
  Settings, 
  X
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenVoiceAgent: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  onOpenVoiceAgent
}) => {
  const { t, userName } = useApp();
  const location = useLocation();
  const navigate = useNavigate();

  // STRICT ORDER:
  // 1. Home
  // 2. Fishing
  // 3. Route Optimization
  // 4. Productivity
  // 5. Analysis
  // 6. Disasters & Alerts
  // 7. ORCA Agent
  // 8. Settings

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 transition-opacity duration-300 animate-in fade-in"
        />
      )}

      {/* Left Slide-out Sidebar Drawer */}
      <aside
        className={`fixed top-0 left-0 bottom-0 w-72 max-w-[85vw] bg-ocean-card border-r border-ocean-sub z-50 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out select-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-ocean-sub flex items-center justify-between bg-ocean-sub/30">
          <div className="flex items-center space-x-2.5">
            <img src="/orca-logo.jpg" alt="ORCA Logo" className="h-8 w-auto object-contain" />
            <div>
              <span className="text-sm font-bold text-ocean-text tracking-tight">ORCA</span>
              <span className="text-[10px] text-[#2a8a89] font-semibold ml-2 px-1.5 py-0.5 rounded-full bg-[#2a8a89]/10 border border-[#2a8a89]/20">
                Maritime Hub
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-ocean-text/60 hover:text-ocean-text hover:bg-ocean-sub transition-colors"
            title="Close Menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sidebar Navigation Items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {/* 1. Home */}
          <NavLink
            to="/others/home"
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                location.pathname === '/others/home'
                  ? 'bg-[#2a8a89] text-white shadow-xs font-bold'
                  : 'text-ocean-text hover:text-ocean-text hover:bg-ocean-sub/60'
              }`
            }
          >
            <Compass className="w-4 h-4 shrink-0" />
            <span>Home</span>
          </NavLink>

          {/* 2. Fishing */}
          <NavLink
            to="/others/fishing"
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                location.pathname === '/others/fishing'
                  ? 'bg-[#2a8a89] text-white shadow-xs font-bold'
                  : 'text-ocean-text hover:text-ocean-text hover:bg-ocean-sub/60'
              }`
            }
          >
            <Fish className="w-4 h-4 shrink-0" />
            <span>Fishing</span>
          </NavLink>

          {/* 3. Route Optimization */}
          <NavLink
            to="/others/route-optimization"
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                location.pathname.startsWith('/others/route-optimization')
                  ? 'bg-[#2a8a89] text-white shadow-xs font-bold'
                  : 'text-ocean-text hover:text-ocean-text hover:bg-ocean-sub/60'
              }`
            }
          >
            <Navigation className="w-4 h-4 shrink-0" />
            <span>Route Optimization</span>
          </NavLink>

          {/* 4. Productivity */}
          <NavLink
            to="/others/productivity"
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                location.pathname.startsWith('/others/productivity')
                  ? 'bg-[#2a8a89] text-white shadow-xs font-bold'
                  : 'text-ocean-text hover:text-ocean-text hover:bg-ocean-sub/60'
              }`
            }
          >
            <TrendingUp className="w-4 h-4 shrink-0" />
            <span>Productivity</span>
          </NavLink>

          {/* 5. Analysis */}
          <NavLink
            to="/others/analysis"
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                location.pathname.startsWith('/others/analysis')
                  ? 'bg-[#2a8a89] text-white shadow-xs font-bold'
                  : 'text-ocean-text hover:text-ocean-text hover:bg-ocean-sub/60'
              }`
            }
          >
            <Activity className="w-4 h-4 shrink-0" />
            <span>Analysis</span>
          </NavLink>

          {/* 6. Disasters & Alerts */}
          <NavLink
            to="/others/disasters"
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                location.pathname.startsWith('/others/disasters') || location.pathname.startsWith('/others/risk-prediction')
                  ? 'bg-[#2a8a89] text-white shadow-xs font-bold'
                  : 'text-ocean-text hover:text-ocean-text hover:bg-ocean-sub/60'
              }`
            }
          >
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
            <span>Disasters & Alerts</span>
          </NavLink>

          {/* 7. ORCA Agent (Preserves Voice Assistant feature) */}
          <button
            onClick={() => {
              onClose();
              onOpenVoiceAgent();
            }}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-ocean-text hover:bg-[#2a8a89]/15 border border-[#2a8a89]/30 transition-all text-left bg-white/60 shadow-2xs group"
          >
            <div className="flex items-center space-x-3">
              <Mic className="w-4 h-4 shrink-0 text-[#2a8a89] group-hover:animate-pulse" />
              <span>ORCA Agent</span>
            </div>
            <span className="text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded bg-[#2a8a89] text-white">
              Voice
            </span>
          </button>

          {/* 8. Settings */}
          <NavLink
            to="/others/settings"
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                location.pathname.startsWith('/others/settings')
                  ? 'bg-[#2a8a89] text-white shadow-xs font-bold'
                  : 'text-ocean-text hover:text-ocean-text hover:bg-ocean-sub/60'
              }`
            }
          >
            <Settings className="w-4 h-4 shrink-0" />
            <span>Settings</span>
          </NavLink>
        </div>

        {/* Sidebar Footer */}
        <div className="p-3.5 border-t border-ocean-sub bg-ocean-sub/20">
          <div className="flex items-center space-x-2.5 px-2 py-1.5 rounded-xl bg-white/70 border border-ocean-sub">
            <div className="w-7 h-7 rounded-full bg-[#2a8a89]/20 text-[#2a8a89] flex items-center justify-center font-bold text-xs">
              P
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-ocean-text truncate">Captain Prasad</div>
              <div className="text-[10px] text-[#2a8a89] font-medium">Maritime Analyst</div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
