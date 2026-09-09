import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from '../components/Header';
import { NavigationBar } from '../components/NavigationBar';

/**
 * OthersLayout:
 * Full Marine Intelligence Dashboard Experience:
 * - Persistent Global Header with ORCA logo and Profile
 * - Persistent Navigation/Task Bar (Home, Fishing Zones, Productivity, Analysis, Disasters, Risk Prediction)
 */
export const OthersLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-white text-slate-800 flex flex-col antialiased">
      {/* Top Global Header with Logo & Shell Profile */}
      <Header />

      {/* Persistent Navigation / Task Bar for Others */}
      <NavigationBar />

      {/* Main Others Dashboard Content Area */}
      <main className="flex-1 w-full">
        <Outlet />
      </main>
    </div>
  );
};
