import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { MarineMap } from '../components/MarineMap';
import { VoiceAssistantModal } from '../components/VoiceAssistantModal';
import { COASTAL_REGIONS, TOP_NATIONAL_PRODUCTIVITY_ZONES } from '../services/marineData';
import { 
  Mic, 
  SlidersHorizontal, 
  ArrowRight, 
  AlertTriangle, 
  Sparkles, 
  Fish, 
  TrendingUp, 
  Anchor,
  Compass,
  Calendar,
  Clock,
  Target
} from 'lucide-react';

export const Page4Home: React.FC = () => {
  const { 
    t, 
    userRole, 
    userName, 
    selectedRegion, 
    setSelectedRegion,
    voyageParams, 
    setVoyageParams,
    fishingZones,
    riskZones,
    recommendedZone
  } = useApp();

  const navigate = useNavigate();

  // Fisherman flow: Voice assistant modal opens automatically initially
  const [isVoiceOpen, setIsVoiceOpen] = useState<boolean>(() => {
    // Open voice assistant automatically if fisherman
    return userRole === 'fisherman';
  });

  const handleVoiceComplete = () => {
    setIsVoiceOpen(false);
    navigate('/fishing'); // Continue to Page 5
  };

  const handleManualAnalyze = (e: React.FormEvent) => {
    e.preventDefault();
    navigate('/fishing'); // Continue to Page 5
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-5 sm:px-6 space-y-6 select-none">
      {/* Voice Assistant Modal (automatically shown for fisherman initially, or on trigger) */}
      <VoiceAssistantModal
        isOpen={isVoiceOpen}
        onClose={() => setIsVoiceOpen(false)}
        onComplete={handleVoiceComplete}
      />

      {/* Top Banner / Welcome Bar */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {userRole === 'fisherman' ? `${userName}` : t.dashboardOverviewTitle}
            </h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#e0f5f4] text-[#20B2AA] border border-[#20B2AA]/20">
              {userRole === 'fisherman' ? t.roleBadgeFisherman : t.roleBadgeOthers}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {userRole === 'fisherman' ? t.manualInputSubtitle : t.nationalContext}
          </p>
        </div>

        {/* Action button to reopen voice assistant if fisherman */}
        {userRole === 'fisherman' && (
          <button
            onClick={() => setIsVoiceOpen(true)}
            className="flex items-center space-x-2 px-4 py-2.5 bg-[#20B2AA] hover:bg-[#1a9e97] text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 shrink-0"
          >
            <Mic className="w-4 h-4 animate-pulse" />
            <span>{t.voiceAssistantTitle}</span>
          </button>
        )}
      </div>

      {/* ================= FISHERMAN FLOW ================= */}
      {userRole === 'fisherman' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Manual Voyage Input Form */}
          <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <SlidersHorizontal className="w-4 h-4 text-[#20B2AA]" />
                <h3 className="text-sm font-bold text-slate-900">{t.manualInputTitle}</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsVoiceOpen(true)}
                className="text-xs text-[#20B2AA] font-semibold flex items-center space-x-1 hover:underline"
              >
                <Mic className="w-3.5 h-3.5" />
                <span>Voice Mode</span>
              </button>
            </div>

            <form onSubmit={handleManualAnalyze} className="space-y-4">
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
                      setVoyageParams(prev => ({ ...prev, regionId: reg.id }));
                    }
                  }}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-hidden focus:border-[#20B2AA] focus:ring-2 focus:ring-[#20B2AA]/20"
                >
                  {COASTAL_REGIONS.map(reg => (
                    <option key={reg.id} value={reg.id}>
                      {reg.name} ({reg.state})
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Input */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center space-x-1">
                    <Calendar className="w-3.5 h-3.5 text-[#20B2AA]" />
                    <span>{t.dateLabel}</span>
                  </label>
                  <input
                    type="date"
                    value={voyageParams.date}
                    onChange={(e) => setVoyageParams(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-hidden focus:border-[#20B2AA]"
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
                    value={voyageParams.time}
                    onChange={(e) => setVoyageParams(prev => ({ ...prev, time: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-hidden focus:border-[#20B2AA]"
                  />
                </div>
              </div>

              {/* Purpose Selector */}
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

              {/* Quick Pre-Analysis Summary Card */}
              <div className="bg-[#e0f5f4]/60 p-3 rounded-xl border border-[#20B2AA]/20 text-xs">
                <div className="flex items-center space-x-2 text-[#20B2AA] font-bold mb-1">
                  <Sparkles className="w-4 h-4" />
                  <span>{t.aiRecommendationTitle}</span>
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  {selectedRegion.name}: 3 active potential fishing zones identified. Recommended zone is {recommendedZone.distanceKm} km offshore with {recommendedZone.productivityScore}% catch aggregation probability.
                </p>
              </div>

              {/* Primary Analyze Action Button */}
              <button
                type="submit"
                className="w-full flex items-center justify-center space-x-2 py-3 bg-[#20B2AA] hover:bg-[#1a9e97] text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-98"
              >
                <span>{t.analyzeBtn}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Right Column: Regional Marine Map matching reference */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                {selectedRegion.name} — {t.allActiveZones}
              </span>
              <span className="text-[11px] text-[#20B2AA] font-semibold">
                Tap any zone on map to inspect
              </span>
            </div>

            {/* Interactive Marine Map */}
            <MarineMap
              showOnlyRecommended={false}
              customHeight="h-[440px] sm:h-[480px]"
            />
          </div>

        </div>
      ) : (
        /* ================= OTHERS FLOW (National Marine Hub) ================= */
        <div className="space-y-6">
          {/* National Map & Top Risk Banner */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Marine Map Container */}
            <div className="lg:col-span-8 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Compass className="w-4 h-4 text-[#20B2AA]" />
                  <span className="text-sm font-bold text-slate-900">
                    Indian EEZ & Coastal Maritime Map
                  </span>
                </div>
                <select
                  value={selectedRegion.id}
                  onChange={(e) => {
                    const reg = COASTAL_REGIONS.find(r => r.id === e.target.value);
                    if (reg) setSelectedRegion(reg);
                  }}
                  className="px-2.5 py-1 text-xs font-semibold bg-white border border-slate-200 rounded-lg text-slate-700"
                >
                  {COASTAL_REGIONS.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              <MarineMap
                showOnlyRecommended={false}
                customHeight="h-[460px]"
              />
            </div>

            {/* Right Column: Top Risk Zones & National Highlights */}
            <div className="lg:col-span-4 space-y-4">
              
              {/* Top Risk Zones in India */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center space-x-2 text-red-600 font-bold text-xs uppercase tracking-wider">
                    <AlertTriangle className="w-4 h-4" />
                    <span>{t.topRiskZonesTitle}</span>
                  </div>
                  <button
                    onClick={() => navigate('/risk-prediction')}
                    className="text-[11px] text-[#20B2AA] font-semibold hover:underline"
                  >
                    {t.viewDetails} →
                  </button>
                </div>

                <div className="space-y-2.5">
                  {riskZones.slice(0, 3).map((rz, idx) => (
                    <div key={rz.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-slate-900 truncate max-w-[180px]">{rz.name}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700">
                          Risk {rz.riskScore}/100
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">{rz.hazardType}</div>
                      <div className="text-[10px] text-red-700 mt-1 font-medium italic">
                        {rz.advisory}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* High Productivity Zones Preview */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center space-x-2 text-emerald-700 font-bold text-xs uppercase tracking-wider">
                    <TrendingUp className="w-4 h-4" />
                    <span>{t.highProductivityZonesTitle}</span>
                  </div>
                  <button
                    onClick={() => navigate('/productivity')}
                    className="text-[11px] text-[#20B2AA] font-semibold hover:underline"
                  >
                    {t.viewDetails} →
                  </button>
                </div>

                <div className="space-y-2">
                  {TOP_NATIONAL_PRODUCTIVITY_ZONES.slice(0, 3).map(zone => (
                    <div key={zone.rank} className="flex items-center justify-between p-2 rounded-lg bg-emerald-50/50 border border-emerald-100 text-xs">
                      <div>
                        <div className="font-bold text-slate-800">#{zone.rank} {zone.name}</div>
                        <div className="text-[10px] text-slate-500">{zone.region} • {zone.catchForecast}</div>
                      </div>
                      <div className="text-emerald-700 font-bold text-xs">
                        {zone.score}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};
