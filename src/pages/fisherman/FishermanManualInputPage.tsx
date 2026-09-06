import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { MarineMap } from '../../components/MarineMap';
import { COASTAL_REGIONS } from '../../services/marineData';
import { 
  SlidersHorizontal, 
  ArrowRight, 
  Anchor, 
  Calendar, 
  Clock, 
  Target, 
  Mic,
  Sparkles
} from 'lucide-react';

export const FishermanManualInputPage: React.FC = () => {
  const { 
    t, 
    selectedRegion, 
    setSelectedRegion, 
    voyageParams, 
    setVoyageParams, 
    recommendedZone 
  } = useApp();

  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate('/fisherman/recommendation'); // Go to Fisherman Page 3
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6 space-y-6 select-none">
      
      {/* Page Header (Minimal, No menus or taskbar) */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {t.manualInputTitle}
            </h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#e0f5f4] text-[#20B2AA]">
              Page 2 of 3
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {t.manualInputSubtitle}
          </p>
        </div>

        {/* Option to return to Voice mode if desired */}
        <button
          onClick={() => navigate('/fisherman/voice')}
          className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-50 hover:bg-[#e0f5f4] text-[#20B2AA] border border-slate-200 hover:border-[#20B2AA] text-xs font-semibold rounded-xl transition-all self-start sm:self-auto"
        >
          <Mic className="w-3.5 h-3.5 animate-pulse" />
          <span>{t.voiceAssistantTitle}</span>
        </button>
      </div>

      {/* Main Grid: Form on Left, Regional Offshore Marine Map on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left 5 Cols: Dedicated Manual Inputs Form */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <SlidersHorizontal className="w-4 h-4 text-[#20B2AA]" />
            <h3 className="text-sm font-bold text-slate-900">{t.manualInputTitle}</h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Region Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center space-x-1">
                <Anchor className="w-3.5 h-3.5 text-[#20B2AA]" />
                <span>{t.regionLabel}</span>
              </label>
              <select
                value={selectedRegion.id}
                onChange={(e) => {
                  const reg = COASTAL_REGIONS.find(r => r.id === e.target.value);
                  if (reg) {
                    setSelectedRegion(reg);
                  }
                }}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-hidden focus:border-[#20B2AA] focus:ring-2 focus:ring-[#20B2AA]/20"
              >
                {COASTAL_REGIONS.map(reg => (
                  <option key={reg.id} value={reg.id}>
                    {reg.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5 text-[#20B2AA]" />
                <span>{t.dateLabel}</span>
              </label>
              <input
                type="date"
                required
                value={voyageParams.date}
                onChange={(e) => setVoyageParams(prev => ({ ...prev, date: e.target.value }))}
                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-hidden focus:border-[#20B2AA]"
              />
            </div>

            {/* Time Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5 text-[#20B2AA]" />
                <span>{t.timeLabel}</span>
              </label>
              <input
                type="time"
                required
                value={voyageParams.time}
                onChange={(e) => setVoyageParams(prev => ({ ...prev, time: e.target.value }))}
                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-hidden focus:border-[#20B2AA]"
              />
            </div>

            {/* Purpose Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center space-x-1">
                <Target className="w-3.5 h-3.5 text-[#20B2AA]" />
                <span>{t.purposeLabel}</span>
              </label>
              <select
                value={voyageParams.purpose}
                onChange={(e) => setVoyageParams(prev => ({ ...prev, purpose: e.target.value }))}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-hidden focus:border-[#20B2AA]"
              >
                <option value="commercial">{t.purposeCommercial}</option>
                <option value="deepsea">{t.purposeDeepSea}</option>
                <option value="coastal">{t.purposeCoastal}</option>
                <option value="tuna">{t.purposeTuna}</option>
                <option value="sardine">{t.purposeSardine}</option>
              </select>
            </div>

            {/* Subtle Summary Note */}
            <div className="bg-[#e0f5f4]/60 p-3 rounded-xl border border-[#20B2AA]/20 text-xs">
              <div className="flex items-center space-x-1.5 text-[#20B2AA] font-bold mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{selectedRegion.name}</span>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                All mock fishing zones are located strictly in offshore ocean waters. Tap "Analyze" to isolate the best recommended fishing zone.
              </p>
            </div>

            {/* ANALYZE BUTTON */}
            <button
              type="submit"
              className="w-full flex items-center justify-center space-x-2 py-3.5 bg-[#20B2AA] hover:bg-[#1a9e97] text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition-all active:scale-98"
            >
              <span>{t.analyzeBtn}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Right 7 Cols: Offshore Fishing Zones Map */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              {selectedRegion.name} — {t.allActiveZones}
            </span>
            <span className="text-[11px] text-[#20B2AA] font-semibold">
              All zones verified in offshore waters
            </span>
          </div>

          {/* Interactive Leaflet Map showing user base & regional offshore zones */}
          <MarineMap
            showOnlyRecommended={false}
            customHeight="h-[460px] sm:h-[500px]"
          />
        </div>

      </div>

    </div>
  );
};
