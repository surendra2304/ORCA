import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { HISTORICAL_DISASTERS, COASTAL_REGIONS, HistoricalDisaster } from '../services/marineData';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Legend 
} from 'recharts';
import { 
  CloudRain, 
  AlertOctagon, 
  Anchor, 
  Calendar, 
  Ship, 
  Sparkles, 
  TrendingUp, 
  Wind, 
  Waves,
  MapPin
} from 'lucide-react';

export const Page12Disasters: React.FC = () => {
  const { t, selectedRegion, setSelectedRegion } = useApp();
  const [selectedDisasterId, setSelectedDisasterId] = useState<string>(HISTORICAL_DISASTERS[0].id);

  const activeDisaster: HistoricalDisaster = 
    HISTORICAL_DISASTERS.find(d => d.id === selectedDisasterId) || HISTORICAL_DISASTERS[0];

  return (
    <div className="max-w-7xl mx-auto px-4 py-5 sm:px-6 space-y-6 select-none">
      
      {/* Page Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <CloudRain className="w-5 h-5 text-amber-600" />
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {t.disasterAnalysisTitle}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Historical Cyclone Reconstruction, Surge Inundation & Marine Disaster Vulnerability
          </p>
        </div>

        {/* Region Filter */}
        <div className="flex items-center space-x-2 self-start md:self-auto">
          <Anchor className="w-4 h-4 text-[#20B2AA]" />
          <select
            value={selectedRegion.id}
            onChange={(e) => {
              const reg = COASTAL_REGIONS.find(r => r.id === e.target.value);
              if (reg) setSelectedRegion(reg);
            }}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
          >
            {COASTAL_REGIONS.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Historical Period / Disaster Selector Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
          <Calendar className="w-4 h-4 text-[#20B2AA]" />
          <span>{t.selectDisasterPeriod}</span>
        </label>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {HISTORICAL_DISASTERS.map(item => {
            const isSelected = selectedDisasterId === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setSelectedDisasterId(item.id)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'border-amber-600 bg-amber-50/70 shadow-xs ring-2 ring-amber-500/20'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="text-xs font-bold text-slate-900 truncate">
                  {item.name}
                </div>
                <div className="text-[10px] text-slate-500 font-semibold mt-0.5">
                  {item.period}
                </div>
                <div className="text-[10px] text-amber-700 font-medium truncate mt-1">
                  {item.intensityCategory}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Historical Disaster Information (Strictly isolated from current-event data) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left 7 Cols: Disaster Impact Details, Damage & Trend Chart */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Disaster Profile Banner */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3 gap-2">
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-600 tracking-wider bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  {activeDisaster.type}
                </span>
                <h2 className="text-lg font-bold text-slate-900 mt-1">
                  {activeDisaster.name} ({activeDisaster.year})
                </h2>
              </div>
              <div className="text-left sm:text-right">
                <span className="text-xs font-bold text-red-600 block">
                  {activeDisaster.damageLevel}
                </span>
                <span className="text-[10px] text-slate-400">Recorded Impact Severity</span>
              </div>
            </div>

            {/* Impact Metric Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="text-[10px] text-slate-500 font-semibold flex items-center space-x-1">
                  <Wind className="w-3.5 h-3.5 text-slate-400" />
                  <span>Peak Wind</span>
                </div>
                <div className="text-base font-extrabold text-slate-900 mt-0.5">
                  {activeDisaster.maxWindKmph} <span className="text-xs font-normal">km/h</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="text-[10px] text-slate-500 font-semibold flex items-center space-x-1">
                  <Waves className="w-3.5 h-3.5 text-slate-400" />
                  <span>Max Surge</span>
                </div>
                <div className="text-base font-extrabold text-slate-900 mt-0.5">
                  {activeDisaster.maxSurgeMeters} <span className="text-xs font-normal">meters</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="text-[10px] text-slate-500 font-semibold flex items-center space-x-1">
                  <Ship className="w-3.5 h-3.5 text-slate-400" />
                  <span>{t.vesselsAffected}</span>
                </div>
                <div className="text-base font-extrabold text-amber-700 mt-0.5">
                  {activeDisaster.vesselsAffectedCount}
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="text-[10px] text-slate-500 font-semibold flex items-center space-x-1">
                  <Anchor className="w-3.5 h-3.5 text-slate-400" />
                  <span>{t.portClosures}</span>
                </div>
                <div className="text-base font-extrabold text-slate-900 mt-0.5">
                  {activeDisaster.portsSuspended.length}
                </div>
              </div>
            </div>

            {/* Impact Narrative */}
            <div className="p-3.5 bg-amber-50/50 rounded-xl border border-amber-200/60 text-xs">
              <span className="font-bold text-amber-900 block mb-1">
                {t.impactAssessment}
              </span>
              <p className="text-slate-700 leading-relaxed text-[11px]">
                {activeDisaster.impactSummary}
              </p>
              <div className="mt-2 text-[10px] text-slate-500">
                <strong>Suspended Ports:</strong> {activeDisaster.portsSuspended.join(', ')}
              </div>
            </div>
          </div>

          {/* Historical Storm Intensity & Wave Surge Trend Chart */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                <TrendingUp className="w-4 h-4 text-[#20B2AA]" />
                <span>{t.analyticalTrends}</span>
              </h3>
              <span className="text-[10px] text-slate-400">{activeDisaster.name} Timeline</span>
            </div>

            <div className="w-full h-52">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={activeDisaster.trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 10 }} domain={[0, 300]} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} domain={[0, 12]} />
                  <Tooltip contentStyle={{ fontSize: '11px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Line yAxisId="left" type="monotone" dataKey="wind" stroke="#ea580c" strokeWidth={2} name="Wind Speed (km/h)" />
                  <Line yAxisId="right" type="monotone" dataKey="surge" stroke="#0284c7" strokeWidth={2} strokeDasharray="4 4" name="Storm Surge (m)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* Right 5 Cols: AI Insights & Impacted Coastal Zone Locations */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* AI Historical Disaster Reconstruction Insights */}
          <div className="bg-[#e0f5f4] p-5 rounded-2xl border border-[#20B2AA]/20 text-xs space-y-2">
            <div className="flex items-center space-x-2 text-[#20B2AA] font-bold">
              <Sparkles className="w-4 h-4" />
              <span>{t.aiDisasterInsights}</span>
            </div>
            <p className="text-slate-700 text-[11px] leading-relaxed">
              Historical hydrodynamic simulation of {activeDisaster.name} indicates that coastal shallowing near river deltas amplified storm surge height by up to 2.4x. Present early warning protocols developed in ORCA mandate a 72-hour lead time vessel harbor recall based on this historical vulnerability curve.
            </p>
          </div>

          {/* Affected Marine Areas & Coordinates */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5 border-b border-slate-100 pb-2">
              <MapPin className="w-4 h-4 text-red-600" />
              <span>{t.affectedMarineAreas}</span>
            </h3>

            <div className="space-y-2">
              {activeDisaster.affectedCoordinates.map((coord, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                  <div className="font-semibold text-slate-800">
                    Sector #{idx + 1} Coastal Arc
                  </div>
                  <div className="text-[11px] font-mono text-[#20B2AA]">
                    Lat: {coord.lat.toFixed(2)}°, Lng: {coord.lng.toFixed(2)}°
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-500 italic">
              Historical records isolated: Zero real-time current telemetry is mixed with historical cyclone reconstructions.
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
