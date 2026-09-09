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
    <div className="w-full px-4 py-5 sm:px-8 space-y-6 select-none">
      
      {/* Top Welcome / Dashboard Status Header */}
      <div className="bg-ocean-card rounded-2xl p-5 border border-ocean-sub shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-bold text-ocean-text tracking-tight">
              {t.dashboardOverviewTitle}
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-ocean-sub text-ocean-header border border-ocean-header/20">
              {t.roleBadgeOthers}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-ocean-text/70 mt-1">
            {t.nationalContext}
          </p>
        </div>

        {/* Region Quick Switcher */}
        <div className="flex items-center space-x-2 self-start md:self-auto bg-ocean-sub/50 p-1.5 rounded-xl border border-ocean-sub">
          <Anchor className="w-4 h-4 text-ocean-primary" />
          <select
            value={selectedRegion.id}
            onChange={(e) => {
              const reg = COASTAL_REGIONS.find(r => r.id === e.target.value);
              if (reg) setSelectedRegion(reg);
            }}
            className="px-2.5 py-1 text-xs font-bold text-ocean-text bg-transparent border-none focus:outline-hidden"
          >
            {COASTAL_REGIONS.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Grid: Indian Marine Map & Dashboard Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left 8 Cols: Main Marine Map & AI Insights */}
        <div className="lg:col-span-8 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Compass className="w-4 h-4 text-ocean-primary" />
              <span className="text-sm font-bold text-ocean-text">
                {selectedRegion.name} — Maritime Map & Offshore Zones
              </span>
            </div>
            <div className="flex items-center space-x-1.5 text-xs text-emerald-700 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>All Zones Offshore</span>
            </div>
          </div>

          <MarineMap
            showOnlyRecommended={false}
            customHeight="h-[460px] sm:h-[500px] lg:h-[540px]"
          />

          {/* AI Insights Section (Below the Map) */}
          <div className="bg-gradient-to-br from-[#c8dcdb]/60 to-[#e2f1f0]/60 p-4 rounded-2xl border border-[#2a8a89]/30 text-xs space-y-2 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 text-[#2a8a89] font-bold">
                <Sparkles className="w-4 h-4 text-[#2a8a89]" />
                <span className="tracking-wide">AI Marine Insights — {selectedRegion.name}</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#2a8a89]/15 text-[#2a8a89] border border-[#2a8a89]/30">
                Live Analysis
              </span>
            </div>

            <p className="text-ocean-text/85 text-[11px] leading-relaxed">
              Multi-satellite thermal synthesis indicates stable chlorophyll aggregation across offshore corridors in {selectedRegion.name}. Surface wave turbulence is within safe navigation thresholds with 92% maritime transit reliability.
            </p>

            <div className="grid grid-cols-3 gap-2 pt-1 border-t border-[#2a8a89]/20 text-[10px]">
              <div className="bg-white/70 p-2 rounded-xl text-center border border-ocean-sub/60">
                <div className="text-ocean-text/60 font-medium">Oceanic Stability</div>
                <div className="font-bold text-[#2a8a89] text-xs">High (89%)</div>
              </div>
              <div className="bg-white/70 p-2 rounded-xl text-center border border-ocean-sub/60">
                <div className="text-ocean-text/60 font-medium">Navigational Risk</div>
                <div className="font-bold text-emerald-700 text-xs">Low (0.8m Swell)</div>
              </div>
              <div className="bg-white/70 p-2 rounded-xl text-center border border-ocean-sub/60">
                <div className="text-ocean-text/60 font-medium">Aggregated Zones</div>
                <div className="font-bold text-[#2a8a89] text-xs">{fishingZones.length} Monitored</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right 4 Cols: Top Risk Zones & High Productivity */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Top Risk Zones in India */}
          <div className="bg-ocean-card p-4 rounded-2xl border border-ocean-sub shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-ocean-sub pb-2">
              <div className="flex items-center space-x-2 text-red-600 font-bold text-xs uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4" />
                <span>{t.topRiskZonesTitle}</span>
              </div>
              <button
                onClick={() => navigate('/others/risk-prediction')}
                className="text-[11px] text-ocean-primary font-semibold hover:text-ocean-hover hover:underline cursor-pointer"
              >
                {t.viewDetails} →
              </button>
            </div>

            <div className="space-y-2.5">
              {riskZones.slice(0, 3).map((rz) => (
                <div key={rz.id} className="p-2.5 rounded-xl bg-ocean-sub/40 border border-ocean-sub text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-ocean-text truncate max-w-[180px]">{rz.name}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700">
                      {rz.riskScore}/100
                    </span>
                  </div>
                  <div className="text-[11px] text-ocean-text/70">{rz.hazardType}</div>
                  <div className="text-[10px] text-red-700 mt-1 font-medium italic">
                    {rz.advisory}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* High Productivity Zones in India */}
          <div className="bg-ocean-card p-4 rounded-2xl border border-ocean-sub shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-ocean-sub pb-2">
              <div className="flex items-center space-x-2 text-emerald-800 font-bold text-xs uppercase tracking-wider">
                <TrendingUp className="w-4 h-4 text-ocean-primary" />
                <span>{t.highProductivityZonesTitle}</span>
              </div>
              <button
                onClick={() => navigate('/others/productivity')}
                className="text-[11px] text-ocean-primary font-semibold hover:text-ocean-hover hover:underline cursor-pointer"
              >
                {t.viewDetails} →
              </button>
            </div>

            <div className="space-y-2">
              {TOP_NATIONAL_PRODUCTIVITY_ZONES.slice(0, 3).map(zone => (
                <div key={zone.rank} className="flex items-center justify-between p-2.5 rounded-lg bg-ocean-sub/40 border border-ocean-sub text-xs">
                  <div>
                    <div className="font-bold text-ocean-text">#{zone.rank} {zone.name}</div>
                    <div className="text-[10px] text-ocean-text/70">{zone.region} • {zone.catchForecast}</div>
                  </div>
                  <div className="text-emerald-800 font-bold text-xs">
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
