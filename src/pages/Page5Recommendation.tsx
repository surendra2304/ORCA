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
    <div className="w-full px-4 py-5 sm:px-8 space-y-6 select-none">
      {/* Page Title & Subtitle */}
      <div className="bg-ocean-card p-5 rounded-2xl border border-ocean-sub shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-bold text-ocean-text tracking-tight">
              {t.bestFishingZoneTitle}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
              {userRole === 'fisherman' ? 'Direct Recommendation' : 'Regional Overview'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-ocean-text/70 mt-1">
            {selectedRegion.name} • {selectedRegion.state}
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs text-ocean-text/80 bg-ocean-sub/40 px-3 py-1.5 rounded-xl border border-ocean-sub self-start sm:self-auto">
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
            <div className="bg-ocean-card rounded-2xl p-5 border-2 border-[#2a8a89] shadow-md space-y-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-[#2a8a89] text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-bl-xl">
                ★ {t.recommendedBestZone}
              </div>

              <div>
                <span className="text-xs font-bold text-[#2a8a89] tracking-wider uppercase">
                  {recommendedZone.code}
                </span>
                <h3 className="text-lg font-bold text-ocean-text mt-0.5">
                  {recommendedZone.name}
                </h3>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                {/* Distance */}
                <div className="p-3 rounded-xl bg-ocean-sub/40 border border-ocean-sub/60">
                  <div className="flex items-center space-x-1.5 text-ocean-text/70 text-[11px] font-semibold">
                    <MapPin className="w-3.5 h-3.5 text-[#2a8a89]" />
                    <span>{t.distanceFromUser}</span>
                  </div>
                  <div className="text-base font-extrabold text-ocean-text mt-1">
                    {recommendedZone.distanceKm} {t.kmUnit}
                  </div>
                </div>

                {/* Best Time To Go */}
                <div className="p-3 rounded-xl bg-ocean-sub/40 border border-ocean-sub/60">
                  <div className="flex items-center space-x-1.5 text-ocean-text/70 text-[11px] font-semibold">
                    <Clock className="w-3.5 h-3.5 text-[#2a8a89]" />
                    <span>{t.bestTimeToGo}</span>
                  </div>
                  <div className="text-xs font-bold text-ocean-text mt-1 truncate">
                    {recommendedZone.bestTime}
                  </div>
                </div>

                {/* Risk Level */}
                <div className="p-3 rounded-xl bg-ocean-sub/40 border border-ocean-sub/60">
                  <div className="flex items-center space-x-1.5 text-ocean-text/70 text-[11px] font-semibold">
                    <ShieldAlert className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{t.riskLevel}</span>
                  </div>
                  <div className="text-xs font-bold text-emerald-700 mt-1">
                    {t.riskLow} ({recommendedZone.riskScore}/100)
                  </div>
                </div>

                {/* Productivity Level */}
                <div className="p-3 rounded-xl bg-ocean-sub/40 border border-ocean-sub/60">
                  <div className="flex items-center space-x-1.5 text-ocean-text/70 text-[11px] font-semibold">
                    <TrendingUp className="w-3.5 h-3.5 text-[#2a8a89]" />
                    <span>{t.productivityLevel}</span>
                  </div>
                  <div className="text-xs font-bold text-[#2a8a89] mt-1">
                    {recommendedZone.productivityScore}% ({t.prodHigh.split(' ')[0]})
                  </div>
                </div>
              </div>

              {/* Weather Condition */}
              <div className="p-3 rounded-xl bg-sky-50/60 border border-sky-100 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <Wind className="w-4 h-4 text-[#2a8a89]" />
                  <div>
                    <div className="font-bold text-ocean-text">{t.weatherCondition}</div>
                    <div className="text-[11px] text-ocean-text/70">
                      {recommendedZone.windSpeedKnots} {t.knotsUnit} SE • {recommendedZone.waveHeightMeters}{t.metersUnit} swell • {recommendedZone.sstCelsius}{t.celsiusUnit}
                    </div>
                  </div>
                </div>
                <Thermometer className="w-4 h-4 text-[#2a8a89]" />
              </div>

              {/* AI Recommendation / Insight */}
              <div className="p-3.5 rounded-xl bg-[#c8dcdb] border border-[#2a8a89]/20 text-xs">
                <div className="flex items-center space-x-1.5 text-[#2a8a89] font-bold mb-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{t.aiRecommendationTitle}</span>
                </div>
                <p className="text-ocean-text/90 text-[11px] leading-relaxed">
                  {t.aiInsightFishingZone}
                </p>
                <div className="mt-2 text-[10px] text-ocean-text/70 font-medium">
                  Target species: {recommendedZone.species.join(', ')}
                </div>
              </div>

              {/* Navigate Action */}
              <button
                onClick={() => alert(`Course set to ${recommendedZone.name}. Bearing: 112° SE. Distance: ${recommendedZone.distanceKm} km.`)}
                className="w-full flex items-center justify-center space-x-2 py-3 bg-[#2a8a89] hover:bg-[#38a3a5] text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-98"
              >
                <Navigation className="w-4 h-4" />
                <span>{t.navigateZone}</span>
              </button>
            </div>
          </div>

          {/* Right: Map showing ONLY User Location & Recommended Best Zone */}
          <div className="lg:col-span-7 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-ocean-text/80 px-1">
              <span>{t.recommendedBestZone} (Isolated Maritime View)</span>
              <span className="text-ocean-text/50">All non-optimal zones hidden</span>
            </div>

            {/* Interactive Leaflet Map with showOnlyRecommended=true */}
            <MarineMap
              showOnlyRecommended={true}
              customHeight="h-[500px] sm:h-[560px] lg:h-[620px]"
            />
          </div>

        </div>
      ) : (
        /* ================= OTHERS FLOW: ALL RELEVANT FISHING ZONES ================= */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left: All Fishing Zones List */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-ocean-card p-4 rounded-2xl border border-ocean-sub shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-ocean-text border-b border-ocean-sub/60 pb-2">
                {t.todayBestZones} ({selectedRegion.name})
              </h3>

              <div className="space-y-3">
                {fishingZones.map(zone => (
                  <div
                    key={zone.id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      zone.isRecommendedBest
                        ? 'border-[#2a8a89] bg-[#c8dcdb]/50 ring-1 ring-[#2a8a89]/30'
                        : 'border-ocean-sub bg-ocean-card hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-ocean-text">{zone.code} — {zone.name}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        zone.productivityScore > 80 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {zone.productivityScore}%
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-ocean-text/80 mb-2">
                      <div><strong>{t.distanceFromUser}:</strong> {zone.distanceKm} {t.kmUnit}</div>
                      <div><strong>{t.bestTimeToGo}:</strong> {zone.bestTime}</div>
                      <div><strong>{t.seaTemperature}:</strong> {zone.sstCelsius}{t.celsiusUnit}</div>
                      <div><strong>{t.riskLevel}:</strong> {zone.riskLevel}</div>
                    </div>

                    <p className="text-[10px] text-ocean-text/70 italic bg-ocean-sub/40 p-2 rounded">
                      {zone.notes}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Map showing ALL active zones */}
          <div className="lg:col-span-7 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-ocean-text/80 px-1">
              <span>{t.allActiveZones}</span>
              <span className="text-[#2a8a89]">{selectedRegion.name}</span>
            </div>

            <MarineMap
              showOnlyRecommended={false}
              customHeight="h-[500px] sm:h-[560px] lg:h-[620px]"
            />
          </div>

        </div>
      )}
    </div>
  );
};

