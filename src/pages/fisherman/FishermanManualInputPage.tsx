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

  // Populate default inputs when Trip Planner is opened:
  // Region: Current/Present Region, Date: Current date, Time: Current time, Purpose: Fishing
  React.useEffect(() => {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const currentDate = now.toISOString().split('T')[0];
    setVoyageParams(prev => ({
      regionId: selectedRegion?.id || prev.regionId,
      date: currentDate,
      time: currentTime,
      purpose: prev.purpose || 'fishing'
    }));
  }, [selectedRegion?.id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate('/fisherman/recommendation'); // Go to Fisherman Page 3
  };

  return (
    <div className="w-full px-4 py-6 sm:px-8 space-y-6 select-none">
      
      {/* Page Header (Minimal, No menus or taskbar) */}
      <div className="bg-ocean-card p-4 sm:p-5 rounded-2xl border border-ocean-sub shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-bold text-ocean-text tracking-tight">
              Trip Planner
            </h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-ocean-sub text-ocean-primary border border-ocean-primary/20">
              Page 2 of 3
            </span>
          </div>
          <p className="text-xs sm:text-sm text-ocean-text/70 mt-1">
            {t.manualInputSubtitle}
          </p>
        </div>

        {/* Option to return to Voice mode if desired */}
        <button
          onClick={() => navigate('/fisherman/voice')}
          className="flex items-center space-x-1.5 px-3.5 py-2 bg-ocean-sub/40 hover:bg-ocean-sub text-ocean-primary border border-ocean-sub hover:border-ocean-primary text-xs font-semibold rounded-xl transition-all self-start sm:self-auto"
        >
          <Mic className="w-3.5 h-3.5 animate-pulse" />
          <span>{t.voiceAssistantTitle}</span>
        </button>
      </div>

      {/* Main Grid: Form on Left, Regional Offshore Marine Map on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full">
        
        {/* Left 5 Cols: Dedicated Trip Planner Form & AI Insights */}
        <div className="lg:col-span-5 bg-ocean-card p-5 rounded-2xl border border-ocean-sub shadow-xs space-y-4">
          <div className="flex items-center space-x-2 border-b border-ocean-sub/60 pb-3">
            <SlidersHorizontal className="w-4 h-4 text-[#2a8a89]" />
            <h3 className="text-sm font-bold text-ocean-text">Trip Planner</h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* 2x2 Grid of Parameters in Equal-sized Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              
              {/* 1. Coastal Region */}
              <div className="bg-white/80 p-3.5 rounded-xl border border-ocean-sub flex flex-col justify-between space-y-2 hover:border-[#2a8a89]/50 transition-all shadow-2xs">
                <label className="text-[11px] font-bold text-ocean-text/90 uppercase tracking-wider flex items-center space-x-1.5">
                  <Anchor className="w-3.5 h-3.5 text-[#2a8a89]" />
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
                  className="w-full px-2.5 py-2 bg-ocean-card/60 border border-ocean-sub/80 rounded-lg text-xs font-semibold text-ocean-text focus:outline-hidden focus:border-[#2a8a89] focus:ring-1 focus:ring-[#2a8a89]/20"
                >
                  {COASTAL_REGIONS.map(reg => (
                    <option key={reg.id} value={reg.id}>
                      {reg.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Voyage Date */}
              <div className="bg-white/80 p-3.5 rounded-xl border border-ocean-sub flex flex-col justify-between space-y-2 hover:border-[#2a8a89]/50 transition-all shadow-2xs">
                <label className="text-[11px] font-bold text-ocean-text/90 uppercase tracking-wider flex items-center space-x-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#2a8a89]" />
                  <span>{t.dateLabel}</span>
                </label>
                <input
                  type="date"
                  required
                  value={voyageParams.date}
                  onChange={(e) => setVoyageParams(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-2.5 py-1.5 bg-ocean-card/60 border border-ocean-sub/80 rounded-lg text-xs font-semibold text-ocean-text focus:outline-hidden focus:border-[#2a8a89]"
                />
              </div>

              {/* 3. Departure Time */}
              <div className="bg-white/80 p-3.5 rounded-xl border border-ocean-sub flex flex-col justify-between space-y-2 hover:border-[#2a8a89]/50 transition-all shadow-2xs">
                <label className="text-[11px] font-bold text-ocean-text/90 uppercase tracking-wider flex items-center space-x-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#2a8a89]" />
                  <span>{t.timeLabel}</span>
                </label>
                <input
                  type="time"
                  required
                  value={voyageParams.time}
                  onChange={(e) => setVoyageParams(prev => ({ ...prev, time: e.target.value }))}
                  className="w-full px-2.5 py-1.5 bg-ocean-card/60 border border-ocean-sub/80 rounded-lg text-xs font-semibold text-ocean-text focus:outline-hidden focus:border-[#2a8a89]"
                />
              </div>

              {/* 4. Operation Purpose */}
              <div className="bg-white/80 p-3.5 rounded-xl border border-ocean-sub flex flex-col justify-between space-y-2 hover:border-[#2a8a89]/50 transition-all shadow-2xs">
                <label className="text-[11px] font-bold text-ocean-text/90 uppercase tracking-wider flex items-center space-x-1.5">
                  <Target className="w-3.5 h-3.5 text-[#2a8a89]" />
                  <span>{t.purposeLabel}</span>
                </label>
                <select
                  value={voyageParams.purpose}
                  onChange={(e) => setVoyageParams(prev => ({ ...prev, purpose: e.target.value }))}
                  className="w-full px-2.5 py-2 bg-ocean-card/60 border border-ocean-sub/80 rounded-lg text-xs font-semibold text-ocean-text focus:outline-hidden focus:border-[#2a8a89]"
                >
                  <option value="fishing">Fishing</option>
                  <option value="commercial">{t.purposeCommercial}</option>
                  <option value="deepsea">{t.purposeDeepSea}</option>
                  <option value="coastal">{t.purposeCoastal}</option>
                  <option value="tuna">{t.purposeTuna}</option>
                  <option value="sardine">{t.purposeSardine}</option>
                </select>
              </div>

            </div>

            {/* AI Insights Card (Clean & Compact) */}
            <div className="bg-gradient-to-br from-[#c8dcdb]/70 to-[#e2f1f0]/70 p-4 rounded-xl border border-[#2a8a89]/30 text-xs space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5 text-[#2a8a89] font-bold">
                  <Sparkles className="w-4 h-4 text-[#2a8a89]" />
                  <span className="tracking-wide">AI Marine Insights</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#2a8a89]/15 text-[#2a8a89] border border-[#2a8a89]/30">
                  Optimal Condition
                </span>
              </div>

              <p className="text-ocean-text/85 text-[11px] leading-relaxed">
                Departure at <span className="font-bold text-[#2a8a89]">{voyageParams.time || '05:00'}</span> aligns with favorable tidal currents off <span className="font-bold text-ocean-text">{selectedRegion.name}</span>. Favorable sea surface temperature (28.4°C) with low wave turbulence expected.
              </p>

              <div className="grid grid-cols-3 gap-2 pt-1 border-t border-[#2a8a89]/20 text-[10px]">
                <div className="bg-white/60 p-1.5 rounded-lg text-center">
                  <div className="text-ocean-text/60">Catch Forecast</div>
                  <div className="font-bold text-[#2a8a89]">High Potential</div>
                </div>
                <div className="bg-white/60 p-1.5 rounded-lg text-center">
                  <div className="text-ocean-text/60">Fuel Efficiency</div>
                  <div className="font-bold text-teal-700">+18% Eco</div>
                </div>
                <div className="bg-white/60 p-1.5 rounded-lg text-center">
                  <div className="text-ocean-text/60">Risk Index</div>
                  <div className="font-bold text-emerald-600">Low (92% Safe)</div>
                </div>
              </div>
            </div>

            {/* ANALYZE BUTTON */}
            <button
              type="submit"
              className="w-full flex items-center justify-center space-x-2 py-3.5 bg-[#2a8a89] hover:bg-[#38a3a5] text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition-all active:scale-98 cursor-pointer"
            >
              <span>{t.analyzeBtn}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Right 7 Cols: Offshore Fishing Zones Map */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-ocean-text/90 uppercase tracking-wider">
              {selectedRegion.name} — {t.allActiveZones}
            </span>
            <span className="text-[11px] text-[#2a8a89] font-semibold">
              All zones verified in offshore waters
            </span>
          </div>

          {/* Interactive Leaflet Map showing user base & regional offshore zones */}
          <MarineMap
            showOnlyRecommended={false}
            customHeight="h-[500px] sm:h-[560px] lg:h-[620px]"
          />
        </div>

      </div>

    </div>
  );
};

