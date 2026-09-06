import React from 'react';
import { useApp } from '../context/AppContext';
import { MarineMap } from '../components/MarineMap';
import { 
  Fish, 
  MapPin, 
  Clock, 
  ShieldAlert, 
  Wind, 
  TrendingUp, 
  Sparkles, 
  CheckCircle2, 
  Navigation,
  Thermometer,
  Eye
} from 'lucide-react';

export const Page5Recommendation: React.FC = () => {
  const { t, userRole, recommendedZone, fishingZones, selectedRegion } = useApp();

  return (
    <div className="max-w-7xl mx-auto px-4 py-5 sm:px-6 space-y-6 select-none">
      {/* Page Title & Subtitle */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {t.bestFishingZoneTitle}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
              {userRole === 'fisherman' ? 'Direct Recommendation' : 'Regional Overview'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {selectedRegion.name} • {selectedRegion.state}
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 self-start sm:self-auto">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span className="font-semibold">{t.safetyConfirmed}</span>
        </div>
      </div>

      {/* ================= FISHERMAN FLOW: ONLY RECOMMENDED BEST ZONE ================= */}
      {userRole === 'fisherman' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left: Recommended Zone Card & Details */}
          <div className="lg:col-span-5 space-y-4">
            {/* Primary Highlight Card */}
            <div className="bg-white rounded-2xl p-5 border-2 border-[#20B2AA] shadow-md space-y-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-[#20B2AA] text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-bl-xl">
                ★ {t.recommendedBestZone}
              </div>

              <div>
                <span className="text-xs font-bold text-[#20B2AA] tracking-wider uppercase">
                  {recommendedZone.code}
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                  {recommendedZone.name}
                </h3>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                {/* Distance */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center space-x-1.5 text-slate-500 text-[11px] font-semibold">
                    <MapPin className="w-3.5 h-3.5 text-[#20B2AA]" />
                    <span>{t.distanceFromUser}</span>
                  </div>
                  <div className="text-base font-extrabold text-slate-900 mt-1">
                    {recommendedZone.distanceKm} {t.kmUnit}
                  </div>
                </div>

                {/* Best Time To Go */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center space-x-1.5 text-slate-500 text-[11px] font-semibold">
                    <Clock className="w-3.5 h-3.5 text-[#20B2AA]" />
                    <span>{t.bestTimeToGo}</span>
                  </div>
                  <div className="text-xs font-bold text-slate-900 mt-1 truncate">
                    {recommendedZone.bestTime}
                  </div>
                </div>

                {/* Risk Level */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center space-x-1.5 text-slate-500 text-[11px] font-semibold">
                    <ShieldAlert className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{t.riskLevel}</span>
                  </div>
                  <div className="text-xs font-bold text-emerald-700 mt-1">
                    {t.riskLow} ({recommendedZone.riskScore}/100)
                  </div>
                </div>

                {/* Productivity Level */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center space-x-1.5 text-slate-500 text-[11px] font-semibold">
                    <TrendingUp className="w-3.5 h-3.5 text-[#20B2AA]" />
                    <span>{t.productivityLevel}</span>
                  </div>
                  <div className="text-xs font-bold text-[#20B2AA] mt-1">
                    {recommendedZone.productivityScore}% ({t.prodHigh.split(' ')[0]})
                  </div>
                </div>
              </div>

              {/* Weather Condition */}
              <div className="p-3 rounded-xl bg-sky-50/60 border border-sky-100 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <Wind className="w-4 h-4 text-[#20B2AA]" />
                  <div>
                    <div className="font-bold text-slate-900">{t.weatherCondition}</div>
                    <div className="text-[11px] text-slate-500">
                      {recommendedZone.windSpeedKnots} {t.knotsUnit} SE • {recommendedZone.waveHeightMeters}{t.metersUnit} swell • {recommendedZone.sstCelsius}{t.celsiusUnit}
                    </div>
                  </div>
                </div>
                <Thermometer className="w-4 h-4 text-[#20B2AA]" />
              </div>

              {/* AI Recommendation / Insight */}
              <div className="p-3.5 rounded-xl bg-[#e0f5f4] border border-[#20B2AA]/20 text-xs">
                <div className="flex items-center space-x-1.5 text-[#20B2AA] font-bold mb-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{t.aiRecommendationTitle}</span>
                </div>
                <p className="text-slate-700 text-[11px] leading-relaxed">
                  {t.aiInsightFishingZone}
                </p>
                <div className="mt-2 text-[10px] text-slate-500 font-medium">
                  Target species: {recommendedZone.species.join(', ')}
                </div>
              </div>

              {/* Navigate Action */}
              <button
                onClick={() => alert(`Course set to ${recommendedZone.name}. Bearing: 112° SE. Distance: ${recommendedZone.distanceKm} km.`)}
                className="w-full flex items-center justify-center space-x-2 py-3 bg-[#20B2AA] hover:bg-[#1a9e97] text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-98"
              >
                <Navigation className="w-4 h-4" />
                <span>{t.navigateZone}</span>
              </button>
            </div>
          </div>

          {/* Right: Map showing ONLY User Location & Recommended Best Zone */}
          <div className="lg:col-span-7 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600 px-1">
              <span>{t.recommendedBestZone} (Isolated Maritime View)</span>
              <span className="text-slate-400">All non-optimal zones hidden</span>
            </div>

            {/* Interactive Leaflet Map with showOnlyRecommended=true */}
            <MarineMap
              showOnlyRecommended={true}
              customHeight="h-[460px] lg:h-[540px]"
            />
          </div>

        </div>
      ) : (
        /* ================= OTHERS FLOW: ALL RELEVANT FISHING ZONES ================= */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left: All Fishing Zones List */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
                {t.todayBestZones} ({selectedRegion.name})
              </h3>

              <div className="space-y-3">
                {fishingZones.map(zone => (
                  <div
                    key={zone.id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      zone.isRecommendedBest
                        ? 'border-[#20B2AA] bg-[#e0f5f4]/50 ring-1 ring-[#20B2AA]/30'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-slate-900">{zone.code} — {zone.name}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        zone.productivityScore > 80 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {zone.productivityScore}%
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 mb-2">
                      <div><strong>{t.distanceFromUser}:</strong> {zone.distanceKm} {t.kmUnit}</div>
                      <div><strong>{t.bestTimeToGo}:</strong> {zone.bestTime}</div>
                      <div><strong>{t.seaTemperature}:</strong> {zone.sstCelsius}{t.celsiusUnit}</div>
                      <div><strong>{t.riskLevel}:</strong> {zone.riskLevel}</div>
                    </div>

                    <p className="text-[10px] text-slate-500 italic bg-slate-50 p-2 rounded">
                      {zone.notes}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Map showing ALL active zones */}
          <div className="lg:col-span-7 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600 px-1">
              <span>{t.allActiveZones}</span>
              <span className="text-[#20B2AA]">{selectedRegion.name}</span>
            </div>

            <MarineMap
              showOnlyRecommended={false}
              customHeight="h-[460px] lg:h-[540px]"
            />
          </div>

        </div>
      )}
    </div>
  );
};
