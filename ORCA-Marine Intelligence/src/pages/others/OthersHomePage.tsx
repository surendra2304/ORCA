import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { MarineMap } from '../../components/MarineMap';
import { COASTAL_REGIONS, TOP_NATIONAL_PRODUCTIVITY_ZONES } from '../../services/marineData';
import { 
  Compass, 
  AlertTriangle, 
  TrendingUp, 
  Sparkles, 
  MapPin, 
  Anchor, 
  ArrowRight, 
  ShieldCheck 
} from 'lucide-react';

export const OthersHomePage: React.FC = () => {
  const { 
    t, 
    selectedRegion, 
    setSelectedRegion, 
    riskZones, 
    fishingZones 
  } = useApp();

  const navigate = useNavigate();

  return (
    <div className="max-w-7xl mx-auto px-4 py-5 sm:px-6 space-y-6 select-none">
      
      {/* Top Welcome / Dashboard Status Header */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {t.dashboardOverviewTitle}
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#e0f5f4] text-[#20B2AA] border border-[#20B2AA]/20">
              {t.roleBadgeOthers}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {t.nationalContext}
          </p>
        </div>

        {/* Region Quick Switcher */}
        <div className="flex items-center space-x-2 self-start md:self-auto bg-slate-50 p-1.5 rounded-xl border border-slate-200">
          <Anchor className="w-4 h-4 text-[#20B2AA]" />
          <select
            value={selectedRegion.id}
            onChange={(e) => {
              const reg = COASTAL_REGIONS.find(r => r.id === e.target.value);
              if (reg) setSelectedRegion(reg);
            }}
            className="px-2.5 py-1 text-xs font-bold text-slate-700 bg-transparent border-none focus:outline-hidden"
          >
            {COASTAL_REGIONS.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Grid: Indian Marine Map & Dashboard Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left 8 Cols: Main Marine Map */}
        <div className="lg:col-span-8 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Compass className="w-4 h-4 text-[#20B2AA]" />
              <span className="text-sm font-bold text-slate-900">
                {selectedRegion.name} — Maritime Map & Offshore Zones
              </span>
            </div>
            <div className="flex items-center space-x-1.5 text-xs text-emerald-600 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>All Zones Offshore</span>
            </div>
          </div>

          <MarineMap
            showOnlyRecommended={false}
            customHeight="h-[460px] sm:h-[500px]"
          />
        </div>

        {/* Right 4 Cols: Top Risk Zones, High Productivity & ORCA Assistant */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* ORCA AI Assistant Overview Card */}
          <div className="bg-[#e0f5f4] p-4 rounded-2xl border border-[#20B2AA]/20 text-xs space-y-2">
            <div className="flex items-center space-x-2 text-[#20B2AA] font-bold">
              <Sparkles className="w-4 h-4" />
              <span>{t.marineIntelligenceHub}</span>
            </div>
            <p className="text-slate-700 text-[11px] leading-relaxed">
              Real-time multi-satellite assimilation active across 5 coastal zones. Thermal upwelling off {selectedRegion.name} is stable with minimal oceanic vortex hazards for authorized crafts.
            </p>
          </div>

          {/* Top Risk Zones in India */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center space-x-2 text-red-600 font-bold text-xs uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4" />
                <span>{t.topRiskZonesTitle}</span>
              </div>
              <button
                onClick={() => navigate('/others/risk-prediction')}
                className="text-[11px] text-[#20B2AA] font-semibold hover:underline"
              >
                {t.viewDetails} →
              </button>
            </div>

            <div className="space-y-2.5">
              {riskZones.slice(0, 3).map((rz) => (
                <div key={rz.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-900 truncate max-w-[180px]">{rz.name}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700">
                      {rz.riskScore}/100
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

          {/* High Productivity Zones in India */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center space-x-2 text-emerald-700 font-bold text-xs uppercase tracking-wider">
                <TrendingUp className="w-4 h-4" />
                <span>{t.highProductivityZonesTitle}</span>
              </div>
              <button
                onClick={() => navigate('/others/productivity')}
                className="text-[11px] text-[#20B2AA] font-semibold hover:underline"
              >
                {t.viewDetails} →
              </button>
            </div>

            <div className="space-y-2">
              {TOP_NATIONAL_PRODUCTIVITY_ZONES.slice(0, 3).map(zone => (
                <div key={zone.rank} className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-50/50 border border-emerald-100 text-xs">
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
  );
};
