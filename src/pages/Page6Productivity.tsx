import React from 'react';
import { useApp } from '../context/AppContext';
import { MarineMap } from '../components/MarineMap';
import { TOP_NATIONAL_PRODUCTIVITY_ZONES } from '../services/marineData';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from 'recharts';
import { 
  TrendingUp, 
  Sparkles, 
  Fish, 
  MapPin, 
  Award, 
  Activity, 
  Compass 
} from 'lucide-react';

const HOURLY_PRODUCTIVITY_DATA = [
  { hour: '02:00', productivity: 45, chlorophyll: 1.8 },
  { hour: '04:00', productivity: 82, chlorophyll: 2.4 },
  { hour: '06:00', productivity: 94, chlorophyll: 2.85 },
  { hour: '08:00', productivity: 88, chlorophyll: 2.6 },
  { hour: '10:00', productivity: 64, chlorophyll: 2.1 },
  { hour: '12:00', productivity: 42, chlorophyll: 1.6 },
  { hour: '14:00', productivity: 38, chlorophyll: 1.5 },
  { hour: '16:00', productivity: 58, chlorophyll: 2.0 },
  { hour: '18:00', productivity: 78, chlorophyll: 2.5 },
  { hour: '20:00', productivity: 72, chlorophyll: 2.3 },
  { hour: '22:00', productivity: 50, chlorophyll: 1.9 },
];

export const Page6Productivity: React.FC = () => {
  const { t, selectedRegion } = useApp();

  return (
    <div className="max-w-7xl mx-auto px-4 py-5 sm:px-6 space-y-6 select-none">
      {/* Page Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {t.productivityAnalysisTitle}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
              National Biomass Index
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Satellite Chlorophyll-A & Sea Surface Temperature Pelagic Aggregation Modeling
          </p>
        </div>

        {/* Overall Score Badge */}
        <div className="bg-[#e0f5f4] p-3.5 rounded-xl border border-[#20B2AA]/30 flex items-center space-x-3 self-start md:self-auto">
          <div className="w-10 h-10 rounded-full bg-[#20B2AA] text-white flex items-center justify-center font-extrabold text-sm">
            89
          </div>
          <div>
            <div className="text-[11px] text-[#20B2AA] font-bold uppercase tracking-wider">
              {t.todayProductivityScore}
            </div>
            <div className="text-xs font-bold text-slate-800">
              Optimal Upwelling Confluence
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Chart & AI Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left 7 Cols: Productivity Line/Area Chart */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-[#20B2AA]" />
              <h3 className="text-sm font-bold text-slate-900">
                {t.productivityTrendTitle}
              </h3>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              {t.hourlyProductivity} (02:00 - 22:00)
            </span>
          </div>

          {/* Recharts Area Chart */}
          <div className="w-full h-64 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={HOURLY_PRODUCTIVITY_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="prodColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#20B2AA" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#20B2AA" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="hour" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  formatter={(val: any) => [`${val}% Potential`, 'Productivity']}
                />
                <Area 
                  type="monotone" 
                  dataKey="productivity" 
                  stroke="#20B2AA" 
                  strokeWidth={2.5} 
                  fillOpacity={1} 
                  fill="url(#prodColor)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* AI Productivity Insight Box */}
          <div className="p-3.5 rounded-xl bg-[#e0f5f4] border border-[#20B2AA]/20 text-xs flex items-start space-x-3">
            <Sparkles className="w-5 h-5 text-[#20B2AA] shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-[#20B2AA] block mb-0.5">
                AI Oceanographic Biomass Insight
              </span>
              <p className="text-slate-700 text-[11px] leading-relaxed">
                {t.aiProductivityInsight}
              </p>
            </div>
          </div>
        </div>

        {/* Right 5 Cols: Top 5 Productivity Zones in India */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <Award className="w-4 h-4 text-[#20B2AA]" />
              <h3 className="text-sm font-bold text-slate-900">
                {t.topProductivityZonesIndia}
              </h3>
            </div>
            <span className="text-[11px] text-[#20B2AA] font-semibold">Ranked #1 to #5</span>
          </div>

          <div className="space-y-2.5">
            {TOP_NATIONAL_PRODUCTIVITY_ZONES.map(item => (
              <div
                key={item.rank}
                className="p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-[#20B2AA]/40 hover:bg-[#e0f5f4]/30 transition-all text-xs"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-2 font-bold text-slate-900">
                    <span className="w-5 h-5 rounded-full bg-[#20B2AA] text-white flex items-center justify-center text-[10px]">
                      {item.rank}
                    </span>
                    <span className="truncate max-w-[180px]">{item.name}</span>
                  </div>
                  <span className="font-extrabold text-[#20B2AA] text-xs">
                    {item.score}%
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-500 mt-1 pl-7">
                  <div><strong>Region:</strong> {item.region}</div>
                  <div><strong>{t.catchForecast}:</strong> {item.catchForecast}</div>
                </div>

                <div className="text-[10px] text-slate-600 pl-7 mt-1">
                  <strong>Species:</strong> {item.dominantSpecies}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Map Section: Top 5 Productivity Zones across India */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-[#20B2AA]" />
            <h3 className="text-sm font-bold text-slate-900">
              Interactive Marine Productivity Map
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Thermal Upwelling & Chlorophyll Zones
          </span>
        </div>

        <MarineMap
          activeLayer="chlorophyll"
          customHeight="h-[460px]"
        />
      </div>
    </div>
  );
};
