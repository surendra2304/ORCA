import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { MarineMap } from '../components/MarineMap';
import { COASTAL_REGIONS } from '../services/marineData';
import { AIService } from '../services/aiService';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from 'recharts';
import { 
  Thermometer, 
  Wind, 
  Waves, 
  Leaf, 
  Map, 
  Sparkles, 
  AlertTriangle, 
  Anchor,
  Activity
} from 'lucide-react';

type AnalysisCategory = 'SST' | 'Weather' | 'Ocean' | 'Chlorophyll' | 'Spatial';

// Specialized Analytical datasets for each of the 5 categories
const SST_CHART_DATA = [
  { time: '00:00', temp: 27.2, depthTemp: 24.1 },
  { time: '04:00', temp: 26.8, depthTemp: 23.9 },
  { time: '08:00', temp: 27.4, depthTemp: 24.3 },
  { time: '12:00', temp: 28.6, depthTemp: 24.8 },
  { time: '16:00', temp: 28.9, depthTemp: 25.0 },
  { time: '20:00', temp: 27.9, depthTemp: 24.5 },
];

const WEATHER_CHART_DATA = [
  { time: '00:00', windKnots: 9.5, pressure: 1013, gust: 12.0 },
  { time: '04:00', windKnots: 11.2, pressure: 1012, gust: 14.8 },
  { time: '08:00', windKnots: 13.5, pressure: 1012, gust: 17.1 },
  { time: '12:00', windKnots: 15.0, pressure: 1011, gust: 19.4 },
  { time: '16:00', windKnots: 12.8, pressure: 1012, gust: 16.0 },
  { time: '20:00', windKnots: 10.4, pressure: 1013, gust: 13.2 },
];

const OCEAN_CHART_DATA = [
  { time: '00:00', waveHeight: 0.8, tideSurge: 0.4 },
  { time: '04:00', waveHeight: 1.0, tideSurge: 0.9 },
  { time: '08:00', waveHeight: 1.2, tideSurge: 1.4 },
  { time: '12:00', waveHeight: 0.9, tideSurge: 0.8 },
  { time: '16:00', waveHeight: 1.1, tideSurge: 1.3 },
  { time: '20:00', waveHeight: 0.7, tideSurge: 0.5 },
];

const CHLOROPHYLL_CHART_DATA = [
  { zone: '0-5 km', density: 1.2, planktonIndex: 40 },
  { zone: '5-12 km', density: 2.1, planktonIndex: 68 },
  { zone: '12-20 km (PFZ)', density: 2.85, planktonIndex: 94 },
  { zone: '20-30 km', density: 1.8, planktonIndex: 58 },
  { zone: '30+ km Deep', density: 0.9, planktonIndex: 32 },
];

const SPATIAL_CHART_DATA = [
  { distKm: '5 km', depthMeters: 18, safeCorridor: 100 },
  { distKm: '12 km', depthMeters: 32, safeCorridor: 95 },
  { distKm: '18 km (Shelf)', depthMeters: 55, safeCorridor: 90 },
  { distKm: '25 km', depthMeters: 85, safeCorridor: 85 },
  { distKm: '40 km Basin', depthMeters: 240, safeCorridor: 75 },
];

export const Page7MarineAnalysis: React.FC = () => {
  const { t, language, selectedRegion, setSelectedRegion, riskZones } = useApp();
  const [activeCategory, setActiveCategory] = useState<AnalysisCategory>('SST');

  // Dynamic AI Insight generation based on category & region
  const aiInsight = AIService.getCategoryInsight(activeCategory, language, selectedRegion.name);

  // Map category to map visual layer
  const getMapLayer = () => {
    switch (activeCategory) {
      case 'SST': return 'sst';
      case 'Weather': return 'weather';
      case 'Ocean': return 'ocean';
      case 'Chlorophyll': return 'chlorophyll';
      case 'Spatial': return 'spatial';
    }
  };

  const categories: { id: AnalysisCategory; label: string; icon: React.FC<any>; desc: string }[] = [
    { id: 'SST', label: t.categorySST, icon: Thermometer, desc: t.sstTitle },
    { id: 'Weather', label: t.categoryWeather, icon: Wind, desc: t.weatherTitle },
    { id: 'Ocean', label: t.categoryOcean, icon: Waves, desc: t.oceanTitle },
    { id: 'Chlorophyll', label: t.categoryChlorophyll, icon: Leaf, desc: t.chlorophyllTitle },
    { id: 'Spatial', label: t.categorySpatial, icon: Map, desc: t.spatialTitle },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-5 sm:px-6 space-y-6 select-none">
      
      {/* Header & Category Tabs (Pages 7 to 11 Navigation) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-[#20B2AA]" />
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                {t.marineAnalysisTitle}
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Multi-Spectral Oceanographic Intelligence Suites (Pages 7 - 11)
            </p>
          </div>

          {/* Region Selector */}
          <div className="flex items-center space-x-2 self-start sm:self-auto">
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

        {/* 5 Distinct Category Selection Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 pt-2">
          {categories.map(cat => {
            const Icon = cat.icon;
            const isSelected = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center space-x-2 p-3 rounded-xl border text-xs font-bold transition-all ${
                  isSelected
                    ? 'bg-[#20B2AA] text-white border-[#20B2AA] shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-[#e0f5f4] hover:border-[#20B2AA]/40'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <div className="text-left truncate">
                  <div>{cat.label}</div>
                  <div className={`text-[10px] font-normal truncate ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>
                    {cat.desc.split('(')[0]}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Analysis Body: Consistent Architecture with Distinct Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left 7 Cols: Interactive Map with Specialized Category Layer */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              {activeCategory} Marine Visualizer Layer — {selectedRegion.name}
            </span>
            <span className="text-[11px] text-[#20B2AA] font-semibold">
              Live Satellite Overlay
            </span>
          </div>

          <MarineMap
            activeLayer={getMapLayer()}
            customHeight="h-[440px] sm:h-[480px]"
          />
        </div>

        {/* Right 5 Cols: Analysis Line/Chart, Metrics, Top Risk Zones & AI Insights */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Specialized Analytical Chart */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                {activeCategory} Trend & Analysis Chart
              </h3>
              <span className="text-[10px] text-slate-400">Sensor Telemetry</span>
            </div>

            {/* Render Category-Specific Chart */}
            <div className="w-full h-52">
              <ResponsiveContainer width="100%" height="100%">
                {activeCategory === 'SST' ? (
                  <LineChart data={SST_CHART_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                    <YAxis domain={[22, 30]} tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ fontSize: '11px' }} />
                    <Line type="monotone" dataKey="temp" stroke="#ef4444" strokeWidth={2} name="Surface (°C)" />
                    <Line type="monotone" dataKey="depthTemp" stroke="#20B2AA" strokeWidth={1.8} strokeDasharray="4 4" name="10m Depth (°C)" />
                  </LineChart>
                ) : activeCategory === 'Weather' ? (
                  <LineChart data={WEATHER_CHART_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 25]} tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ fontSize: '11px' }} />
                    <Line type="monotone" dataKey="windKnots" stroke="#0284c7" strokeWidth={2} name="Wind Speed (kt)" />
                    <Line type="monotone" dataKey="gust" stroke="#f59e0b" strokeWidth={1.8} name="Gust (kt)" />
                  </LineChart>
                ) : activeCategory === 'Ocean' ? (
                  <LineChart data={OCEAN_CHART_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 2.5]} tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ fontSize: '11px' }} />
                    <Line type="monotone" dataKey="waveHeight" stroke="#6366f1" strokeWidth={2} name="Wave Height (m)" />
                    <Line type="monotone" dataKey="tideSurge" stroke="#06b6d4" strokeWidth={1.8} strokeDasharray="4 4" name="Tide Surge (m)" />
                  </LineChart>
                ) : activeCategory === 'Chlorophyll' ? (
                  <BarChart data={CHLOROPHYLL_CHART_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="zone" tick={{ fontSize: 9 }} />
                    <YAxis domain={[0, 3.5]} tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="density" fill="#16a34a" radius={[4, 4, 0, 0]} name="Chlorophyll (mg/m³)" />
                  </BarChart>
                ) : (
                  <LineChart data={SPATIAL_CHART_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="distKm" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 260]} tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ fontSize: '11px' }} />
                    <Line type="monotone" dataKey="depthMeters" stroke="#0369a1" strokeWidth={2} name="Bathymetry Depth (m)" />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>

            {/* Key Metric Tags */}
            <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100">
              {Object.entries(aiInsight.metrics).map(([key, val]) => (
                <div key={key} className="p-2 bg-slate-50 rounded-lg text-center">
                  <div className="text-[10px] text-slate-500 truncate">{key}</div>
                  <div className="text-xs font-bold text-slate-800 mt-0.5">{val}</div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Insights Card */}
          <div className="bg-[#e0f5f4] p-4 rounded-2xl border border-[#20B2AA]/20 text-xs space-y-2">
            <div className="flex items-center space-x-2 text-[#20B2AA] font-bold">
              <Sparkles className="w-4 h-4" />
              <span>{aiInsight.title}</span>
            </div>
            <p className="text-slate-700 text-[11px] leading-relaxed">
              {aiInsight.summary}
            </p>
          </div>

          {/* Top Risk Zones List */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-red-600 uppercase">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{t.topRiskZonesTitle}</span>
              </div>
              <span className="text-[10px] text-slate-400">Hazard Matrix</span>
            </div>

            {riskZones.slice(0, 2).map(rz => (
              <div key={rz.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">{rz.name}</span>
                  <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                    {rz.riskScore}/100
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1 italic">
                  {rz.advisory}
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
};
