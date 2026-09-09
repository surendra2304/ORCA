import React from 'react';
import { useApp } from '../../context/AppContext';
import { MarineMap } from '../../components/MarineMap';
import { COASTAL_REGIONS } from '../../services/marineData';
import { 
  Fish, 
  MapPin, 
  Clock, 
  Anchor, 
  TrendingUp, 
  ShieldAlert, 
  CheckCircle2, 
  Wind,
  Thermometer
} from 'lucide-react';

export const OthersFishingZonesPage: React.FC = () => {
  const { t, selectedRegion, setSelectedRegion, fishingZones } = useApp();

  return (
    <div className="w-full px-4 py-5 sm:px-8 space-y-6 select-none">
      
      {/* Header with Region Selector */}
      <div className="bg-ocean-card p-5 rounded-2xl border border-ocean-sub shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Fish className="w-5 h-5 text-ocean-primary" />
            <h1 className="text-xl sm:text-2xl font-bold text-ocean-text tracking-tight">
              {t.navFishing} — {t.allActiveZones}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-ocean-text/70 mt-1">
            {selectedRegion.name} • {selectedRegion.state}
          </p>
        </div>

        {/* Region Selector */}
        <div className="flex items-center space-x-2 self-start sm:self-auto bg-ocean-sub/50 p-1.5 rounded-xl border border-ocean-sub">
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

      {/* Main Grid: Relevant Fishing Zones List & Interactive Map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left 5 Cols: Today's Best Fishing Zones List */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-ocean-card p-4 sm:p-5 rounded-2xl border border-ocean-sub shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-ocean-sub pb-2.5">
              <h3 className="text-xs font-bold text-ocean-text uppercase tracking-wider">
                {t.todayBestZones}
              </h3>
              <span className="text-[11px] text-ocean-primary font-semibold">
                {fishingZones.length} Active Zones
              </span>
            </div>

            <div className="space-y-3">
              {fishingZones.map(zone => (
                <div
                  key={zone.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    zone.isRecommendedBest
                      ? 'border-ocean-primary bg-ocean-sub/60 ring-1 ring-ocean-primary/30'
                      : 'border-ocean-sub bg-ocean-sub/30 hover:border-ocean-primary/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-ocean-text">{zone.code} — {zone.name}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      zone.productivityScore > 80 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {zone.productivityScore}% Potential
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-ocean-text/80 mb-2">
                    <div><strong>{t.distanceFromUser}:</strong> {zone.distanceKm} {t.kmUnit}</div>
                    <div><strong>{t.bestTimeToGo}:</strong> {zone.bestTime}</div>
                    <div><strong>{t.seaTemperature}:</strong> {zone.sstCelsius}{t.celsiusUnit}</div>
                    <div><strong>{t.riskLevel}:</strong> {zone.riskLevel}</div>
                  </div>

                  <div className="text-[10px] text-ocean-text/70 italic bg-ocean-card/70 p-2 rounded border border-ocean-sub">
                    {zone.notes}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 7 Cols: Map Containing Relevant Fishing Zones in Selected Region */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-ocean-text uppercase tracking-wider">
              {selectedRegion.name} — Offshore Fishing Map
            </span>
            <span className="text-[11px] text-ocean-primary font-semibold">
              Tap any zone marker to view details
            </span>
          </div>

          <MarineMap
            showOnlyRecommended={false}
            customHeight="h-[500px] sm:h-[560px] lg:h-[620px]"
          />
        </div>

      </div>

    </div>
  );
};
