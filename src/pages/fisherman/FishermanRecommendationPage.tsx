import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { MarineMap } from '../../components/MarineMap';
import { 
  MapPin, 
  Clock, 
  ShieldAlert, 
  Wind, 
  TrendingUp, 
  Sparkles, 
  CheckCircle2, 
  Navigation,
  Thermometer,
  RotateCcw
} from 'lucide-react';

export const FishermanRecommendationPage: React.FC = () => {
  const { t, recommendedZone, selectedRegion, voyageParams } = useApp();
  const navigate = useNavigate();

  return (
    <div className="w-full px-4 py-6 sm:px-8 space-y-6 select-none">
      
      {/* Header Banner (Minimal Fisherman flow, No taskbar or menus) */}
      <div className="bg-ocean-card p-4 sm:p-5 rounded-2xl border border-ocean-sub shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-bold text-ocean-text tracking-tight">
              {t.bestFishingZoneTitle}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
              Page 3 of 3 (Final Recommendation)
            </span>
          </div>
          <p className="text-xs sm:text-sm text-ocean-text/70 mt-1">
            {selectedRegion.name} • {voyageParams.date} • {voyageParams.time}
          </p>
        </div>

        {/* Recalculate / New Search Button */}
        <button
          onClick={() => navigate('/fisherman/manual')}
          className="flex items-center space-x-1.5 px-3.5 py-2 bg-ocean-sub/40 hover:bg-ocean-sub text-ocean-primary border border-ocean-sub hover:border-ocean-primary text-xs font-semibold rounded-xl transition-all self-start sm:self-auto"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Edit Parameters</span>
        </button>
      </div>

      {/* Main Grid: Recommended Best Zone Card on Left, ISOLATED Map on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full">
        
        {/* Left 5 Cols: Best Fishing Zone Highlights & AI Insights */}
        <div className="lg:col-span-5 space-y-4">
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
              {/* Distance from Coast */}
              <div className="p-3 rounded-xl bg-ocean-sub/40 border border-ocean-sub/60">
                <div className="flex items-center space-x-1.5 text-ocean-text/70 text-[11px] font-semibold">
                  <MapPin className="w-3.5 h-3.5 text-[#2a8a89]" />
                  <span>{t.distanceFromUser}</span>
                </div>
                <div className="text-base font-extrabold text-ocean-text mt-1">
                  {recommendedZone.distanceKm} {t.kmUnit}
                </div>
              </div>

              {/* Best Time to Go */}
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
                    {recommendedZone.windSpeedKnots} {t.knotsUnit} SE • {recommendedZone.waveHeightMeters}{t.metersUnit} wave swell • {recommendedZone.sstCelsius}{t.celsiusUnit}
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

            {/* Set Course Navigation Action */}
            <button
              onClick={() => alert(`Navigation bearing set: 115° SE to ${recommendedZone.name} (${recommendedZone.distanceKm} km offshore). Safe voyage!`)}
              className="w-full flex items-center justify-center space-x-2 py-3.5 bg-[#2a8a89] hover:bg-[#38a3a5] text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition-all active:scale-98"
            >
              <Navigation className="w-4 h-4" />
              <span>{t.navigateZone}</span>
            </button>
          </div>
        </div>

        {/* Right 7 Cols: ISOLATED MAP (Shows ONLY User Location & Recommended Best Zone) */}
        <div className="lg:col-span-7 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-ocean-text/80 px-1">
            <span>{t.recommendedBestZone} (Isolated Map View)</span>
            <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Verified Offshore in Sea Water
            </span>
          </div>

          {/* Leaflet map with showOnlyRecommended=true strictly hiding all other zones & risk zones */}
          <MarineMap
            showOnlyRecommended={true}
            customHeight="h-[500px] sm:h-[560px] lg:h-[620px]"
          />
        </div>

      </div>

    </div>
  );
};

