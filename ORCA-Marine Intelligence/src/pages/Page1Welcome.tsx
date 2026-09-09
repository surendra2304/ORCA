import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { ArrowRight, ShieldCheck, Waves } from 'lucide-react';

export const Page1Welcome: React.FC = () => {
  const { t } = useApp();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-between p-6 sm:p-10 select-none">
      {/* Top subtle badge */}
      <div className="w-full max-w-md flex justify-end">
        <div className="flex items-center space-x-1.5 text-xs text-[#20B2AA] font-semibold bg-[#e0f5f4] px-3 py-1 rounded-full border border-[#20B2AA]/20">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>INCOIS Maritime Data Certified</span>
        </div>
      </div>

      {/* Main Center Content */}
      <div className="flex flex-col items-center text-center max-w-md my-auto animate-in fade-in zoom-in-95 duration-500">
        {/* Prominently Centered ORCA Logo from User Reference */}
        <div className="relative mb-8 group">
          <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-full p-2 bg-white border border-slate-100 shadow-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
            <img 
              src="/orca-logo.jpg" 
              alt="ORCA Logo" 
              className="w-full h-full object-contain"
            />
          </div>
          <div className="absolute -bottom-2 inset-x-0 flex justify-center">
            <span className="w-8 h-1 bg-[#20B2AA] rounded-full"></span>
          </div>
        </div>

        {/* Heading & Subtitle */}
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-3">
          {t.welcomeHeading}
        </h1>

        <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-sm mb-8">
          {t.welcomeSubtitle}
        </p>

        {/* Primary Action Button */}
        <button
          onClick={() => navigate('/language')}
          className="w-full sm:w-auto min-w-[220px] flex items-center justify-center space-x-3 px-8 py-3.5 bg-[#20B2AA] hover:bg-[#1a9e97] text-white text-sm font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 active:scale-95 group"
        >
          <span>{t.getStarted}</span>
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </button>
      </div>

      {/* Footer Minimal Indicator */}
      <div className="text-center text-xs text-slate-400 flex items-center space-x-2">
        <Waves className="w-3.5 h-3.5 text-[#20B2AA]" />
        <span>ORCA • Oceanographic Research & Coastal Advisory</span>
      </div>
    </div>
  );
};
