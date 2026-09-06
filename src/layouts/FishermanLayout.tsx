import React from 'react';
import { Outlet } from 'react-router-dom';

/**
 * FishermanLayout:
 * STRICT ARCHITECTURAL CONSTRAINT:
 * - NO task bar
 * - NO menu bar
 * - NO navigation bar
 * - NO sidebar
 * - NO hamburger menu
 * - NO dashboard navigation
 * - NO Home, Fishing, Productivity, Analysis, Disasters, Risk menus
 * - NO profile navigation
 * 
 * Contains ONLY the minimal Fisherman application shell.
 */
export const FishermanLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-white text-slate-800 flex flex-col antialiased select-none">
      {/* Ultra-minimal Fisherman top identity bar - NO menus or navigation */}
      <div className="w-full bg-white border-b border-slate-100 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-full overflow-hidden bg-white border border-slate-200 flex items-center justify-center shadow-xs">
            <img src="/orca-logo.jpg" alt="ORCA" className="w-full h-full object-contain" />
          </div>
          <div>
            <span className="text-sm font-bold text-slate-900 tracking-tight">ORCA</span>
            <span className="text-[10px] text-[#20B2AA] font-semibold ml-2 px-2 py-0.5 rounded-full bg-[#e0f5f4]">
              Fisherman Voice & Safety
            </span>
          </div>
        </div>

        <div className="text-xs text-slate-400 font-medium">
          INCOIS Satellite Marine Stream
        </div>
      </div>

      {/* Main Content Area: ONLY the 3 Fisherman Pages */}
      <main className="flex-1 w-full">
        <Outlet />
      </main>
    </div>
  );
};
