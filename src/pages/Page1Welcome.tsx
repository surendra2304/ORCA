import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Fish, Compass, ArrowRight } from 'lucide-react';

export const Page1Welcome: React.FC = () => {
  const { t, setUserRole } = useApp();
  const navigate = useNavigate();

  const handleSelectRole = (role: 'fisherman' | 'others') => {
    setUserRole(role);
    navigate('/language');
  };

  return (
    <div 
      className="relative w-full min-h-[100dvh] bg-cover bg-center bg-no-repeat flex flex-col justify-between p-6 sm:p-8 md:p-10 select-none overflow-hidden"
      style={{ backgroundImage: "url('/ocean-landing-bg.png')" }}
    >
      {/* Top Left Branding */}
      <div className="w-full flex justify-start pt-1 sm:pt-2 z-10">
        <div className="inline-flex items-center space-x-2 text-[11px] sm:text-xs text-white/95 font-bold tracking-wider uppercase bg-black/30 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/20 shadow-md">
          <span className="w-2 h-2 rounded-full bg-[#20B2AA] animate-pulse"></span>
          <span>SIH - SMART INDIA HACKATHON</span>
        </div>
      </div>

      {/* Main Center Content Hero */}
      <div className="w-full max-w-2xl mx-auto flex flex-col items-center text-center my-auto z-10 animate-in fade-in zoom-in-95 duration-500 py-4">
        
        {/* ORCA Logo */}
        <div className="relative mb-5 flex items-center justify-center">
          {/* Ambient synchronized soft glow */}
          <div className="absolute w-52 h-52 sm:w-64 sm:h-64 rounded-full bg-[#14b8a6]/30 blur-3xl pointer-events-none animate-orca-glow"></div>
          
          <img
            src="/orca-welcome-logo.png"
            alt="ORCA Marine Intelligence"
            className="relative w-32 h-32 sm:w-40 sm:h-40 md:w-44 md:h-44 animate-orca-float"
            draggable={false}
          />
        </div>

        {/* Main Title */}
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight mb-8 drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]">
          {t.welcomeHeading || 'ORCA Marine Intelligence'}
        </h1>

        {/* Role Cards (Fisherman vs Others) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-xl text-left">
          {/* Fisherman Role Card */}
          <div
            onClick={() => handleSelectRole('fisherman')}
            className="relative p-5 rounded-2xl border-2 border-white/20 bg-white/95 backdrop-blur-md hover:border-[#2a8a89] hover:bg-white cursor-pointer transition-all duration-300 shadow-xl hover:shadow-2xl hover:-translate-y-0.5 group"
          >
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#2a8a89] text-white shadow-sm transition-transform group-hover:scale-105">
                <Fish className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-ocean-text group-hover:text-[#2a8a89] transition-colors">{t.roleFisherman}</h3>
                <span className="text-[10px] uppercase font-bold text-[#2a8a89] tracking-wider">Voice Assisted</span>
              </div>
            </div>
            <p className="text-xs text-ocean-text/80 leading-relaxed mb-3">
              {t.roleFishermanDesc}
            </p>
            <div className="flex items-center text-[11px] font-bold text-[#2a8a89] group-hover:translate-x-1 transition-transform">
              <span>Select Fisherman</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </div>
          </div>

          {/* Others / Maritime Officers Role Card */}
          <div
            onClick={() => handleSelectRole('others')}
            className="relative p-5 rounded-2xl border-2 border-white/20 bg-white/95 backdrop-blur-md hover:border-[#2a8a89] hover:bg-white cursor-pointer transition-all duration-300 shadow-xl hover:shadow-2xl hover:-translate-y-0.5 group"
          >
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#2a8a89] text-white shadow-sm transition-transform group-hover:scale-105">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-ocean-text group-hover:text-[#2a8a89] transition-colors">{t.roleOthers}</h3>
                <span className="text-[10px] uppercase font-bold text-[#2a8a89] tracking-wider">Full Analytics</span>
              </div>
            </div>
            <p className="text-xs text-ocean-text/80 leading-relaxed mb-3">
              {t.roleOthersDesc}
            </p>
            <div className="flex items-center text-[11px] font-bold text-[#2a8a89] group-hover:translate-x-1 transition-transform">
              <span>Select Full Analytics</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </div>
          </div>
        </div>

      </div>

      {/* Footer Bottom Tagline */}
      <div className="w-full max-w-2xl mx-auto text-center px-4 pb-2 z-10">
        <p className="text-xs sm:text-sm text-white/85 font-normal leading-relaxed drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)]">
          Safeguarding Indian seas, supporting coastal lives—turning complex marine data into simple, life-saving decisions.
        </p>
      </div>
    </div>
  );
};

