import React, { useState } from 'react';
import {
  Calendar,
  Download,
  ChevronDown,
  ArrowUp,
  CheckCircle,
} from 'lucide-react';
import {
  catchOverTimeData,
  catchByFishTypeData,
  catchByPFZAreaData,
  initialMetrics,
} from '../data/mockData';

export const AnalyticsScreen: React.FC = () => {
  const [timeframe, setTimeframe] = useState<'This Week' | 'Last Week' | 'This Month' | 'Season 2025'>('This Week');
  const [hoveredPoint, setHoveredPoint] = useState<{ date: string; kg: number } | null>(null);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const handleExport = () => {
    setExportNotice('Report exported successfully! (ORCA_Catch_Report_May2025.csv)');
    setTimeout(() => {
      setExportNotice(null);
    }, 3500);
  };

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto w-full">
      {/* Export Toast Notice */}
      {exportNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2 shadow-sm animate-fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>{exportNotice}</span>
        </div>
      )}

      {/* Filter Controls Bar */}
      <section
        className="flex flex-wrap items-center justify-between gap-4"
        data-purpose="filter-bar"
      >
        <div className="flex flex-wrap items-center gap-3">
          {/* Timeframe Dropdown */}
          <div className="relative">
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value as any)}
              className="appearance-none flex items-center gap-2.5 px-4 py-2 bg-white border border-slate-200/90 rounded-xl text-xs font-semibold text-slate-800 shadow-2xs hover:border-slate-300 transition-all cursor-pointer pr-9 focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              <option value="This Week">This Week</option>
              <option value="Last Week">Last Week</option>
              <option value="This Month">This Month</option>
              <option value="Season 2025">Season 2025</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-2.5 pointer-events-none stroke-[2.5]" />
          </div>

          {/* Date Range Display */}
          <div className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200/90 rounded-xl text-xs font-semibold text-slate-700 shadow-2xs">
            <span>28 Apr - 04 May 2025</span>
            <Calendar className="w-4 h-4 text-slate-400 ml-1" />
          </div>
        </div>

        {/* Export Report Button */}
        <button
          type="button"
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-[#0d6efd] hover:bg-blue-100/80 border border-blue-200/60 rounded-xl text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer"
        >
          <Download className="w-4 h-4 text-[#0d6efd] stroke-[2.2]" />
          <span>Export Report</span>
        </button>
      </section>

      {/* 2x2 Primary Charts Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6" data-purpose="charts-grid">
        {/* Card 1: Catch Over Time (Line Chart) */}
        <div
          className="bg-white border border-[#eef2f7] rounded-[20px] p-6 shadow-xs flex flex-col justify-between"
          data-purpose="catch-over-time-chart"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-900">
              Catch Over Time <span className="font-medium text-slate-400">(kg)</span>
            </h2>
            {hoveredPoint && (
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full">
                {hoveredPoint.date}: {hoveredPoint.kg} kg
              </span>
            )}
          </div>

          {/* SVG Smooth Line Graph */}
          <div className="relative w-full h-56 flex flex-col justify-end pt-2">
            <svg
              className="w-full h-full overflow-visible"
              preserveAspectRatio="none"
              viewBox="0 0 460 200"
            >
              {/* Horizontal Grid Lines & Y-axis Labels */}
              <g className="text-[11px] fill-slate-400 font-medium">
                {/* 200 line */}
                <line x1="32" y1="20" x2="450" y2="20" stroke="#f1f5f9" strokeWidth="1.2" />
                <text x="5" y="24">200</text>
                {/* 150 line */}
                <line x1="32" y1="65" x2="450" y2="65" stroke="#f1f5f9" strokeWidth="1.2" />
                <text x="5" y="69">150</text>
                {/* 100 line */}
                <line x1="32" y1="110" x2="450" y2="110" stroke="#f1f5f9" strokeWidth="1.2" />
                <text x="5" y="114">100</text>
                {/* 50 line */}
                <line x1="32" y1="155" x2="450" y2="155" stroke="#f1f5f9" strokeWidth="1.2" />
                <text x="12" y="159">50</text>
                {/* 0 line */}
                <line x1="32" y1="190" x2="450" y2="190" stroke="#e2e8f0" strokeWidth="1.2" />
                <text x="18" y="193">0</text>
              </g>

              {/* Chart Gradient Background */}
              <defs>
                <linearGradient id="blueLineGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0d6efd" stopOpacity="0.16" />
                  <stop offset="100%" stopColor="#0d6efd" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Line Chart Shading */}
              <path
                d="M 45,120 C 65,120 75,70 105,70 C 135,70 145,115 170,115 C 195,115 210,135 235,135 C 265,135 285,75 330,70 C 375,65 400,68 440,68 L 440,190 L 45,190 Z"
                fill="url(#blueLineGrad)"
              />

              {/* Smooth Spline Path */}
              <path
                d="M 45,120 C 65,120 75,70 105,70 C 135,70 145,115 170,115 C 195,115 210,135 235,135 C 265,135 285,75 330,70 C 375,65 400,68 440,68"
                fill="none"
                stroke="#0d6efd"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Interactive Data Point Markers */}
              <circle
                cx="45"
                cy="120"
                r="5"
                fill="#0d6efd"
                className="cursor-pointer transition-all hover:scale-150 hover:fill-blue-700"
                onMouseEnter={() => setHoveredPoint({ date: '28 Apr', kg: 90 })}
                onMouseLeave={() => setHoveredPoint(null)}
              />
              <circle
                cx="105"
                cy="70"
                r="5"
                fill="#0d6efd"
                className="cursor-pointer transition-all hover:scale-150 hover:fill-blue-700"
                onMouseEnter={() => setHoveredPoint({ date: '29 Apr', kg: 150 })}
                onMouseLeave={() => setHoveredPoint(null)}
              />
              <circle
                cx="170"
                cy="115"
                r="5"
                fill="#0d6efd"
                className="cursor-pointer transition-all hover:scale-150 hover:fill-blue-700"
                onMouseEnter={() => setHoveredPoint({ date: '30 Apr', kg: 100 })}
                onMouseLeave={() => setHoveredPoint(null)}
              />
              <circle
                cx="235"
                cy="135"
                r="5"
                fill="#0d6efd"
                className="cursor-pointer transition-all hover:scale-150 hover:fill-blue-700"
                onMouseEnter={() => setHoveredPoint({ date: '01 May', kg: 75 })}
                onMouseLeave={() => setHoveredPoint(null)}
              />
              <circle
                cx="330"
                cy="70"
                r="5"
                fill="#0d6efd"
                className="cursor-pointer transition-all hover:scale-150 hover:fill-blue-700"
                onMouseEnter={() => setHoveredPoint({ date: '02 May', kg: 150 })}
                onMouseLeave={() => setHoveredPoint(null)}
              />
              <circle
                cx="440"
                cy="68"
                r="5"
                fill="#0d6efd"
                className="cursor-pointer transition-all hover:scale-150 hover:fill-blue-700"
                onMouseEnter={() => setHoveredPoint({ date: '04 May', kg: 155 })}
                onMouseLeave={() => setHoveredPoint(null)}
              />
            </svg>
          </div>

          {/* X-Axis Labels */}
          <div className="grid grid-cols-7 text-[10px] font-semibold text-slate-400 mt-3 pt-2 pl-7 text-center">
            {catchOverTimeData.map((d, i) => (
              <span key={i}>{d.date}</span>
            ))}
          </div>
        </div>

        {/* Card 2: Catch by Fish Type (Donut Chart) */}
        <div
          className="bg-white border border-[#eef2f7] rounded-[20px] p-6 shadow-xs flex flex-col justify-between"
          data-purpose="catch-by-fish-type-chart"
        >
          <div>
            <h2 className="text-sm font-bold text-slate-900 mb-6">Catch by Fish Type</h2>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-around gap-6 my-auto">
            {/* SVG Donut */}
            <div className="relative w-44 h-44 shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 42 42">
                {/* Track */}
                <circle
                  cx="21"
                  cy="21"
                  r="15.91549430918954"
                  fill="transparent"
                  stroke="#f1f5f9"
                  strokeWidth="6.5"
                />
                {/* Sardine: 40% (Blue #0d6efd) */}
                <circle
                  cx="21"
                  cy="21"
                  r="15.91549430918954"
                  fill="transparent"
                  stroke="#0d6efd"
                  strokeWidth="6.5"
                  strokeDasharray="40 60"
                  strokeDashoffset="0"
                />
                {/* Mackerel: 30% (Orange #f59e0b) */}
                <circle
                  cx="21"
                  cy="21"
                  r="15.91549430918954"
                  fill="transparent"
                  stroke="#f59e0b"
                  strokeWidth="6.5"
                  strokeDasharray="30 70"
                  strokeDashoffset="-40"
                />
                {/* Tuna: 20% (Emerald #10b981) */}
                <circle
                  cx="21"
                  cy="21"
                  r="15.91549430918954"
                  fill="transparent"
                  stroke="#10b981"
                  strokeWidth="6.5"
                  strokeDasharray="20 80"
                  strokeDashoffset="-70"
                />
                {/* Others: 10% (Navy #1e3a8a) */}
                <circle
                  cx="21"
                  cy="21"
                  r="15.91549430918954"
                  fill="transparent"
                  stroke="#1e3a8a"
                  strokeWidth="6.5"
                  strokeDasharray="10 90"
                  strokeDashoffset="-90"
                />
              </svg>
            </div>

            {/* Legend List */}
            <div className="space-y-3 w-full sm:w-48">
              {catchByFishTypeData.map((f, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: f.color }}
                    />
                    <span className="font-semibold text-slate-700">{f.name}</span>
                  </div>
                  <span className="font-bold text-slate-900">{f.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Card 3: Catch by PFZ Area (Donut Chart) */}
        <div
          className="bg-white border border-[#eef2f7] rounded-[20px] p-6 shadow-xs flex flex-col justify-between"
          data-purpose="catch-by-pfz-area-chart"
        >
          <div>
            <h2 className="text-sm font-bold text-slate-900 mb-6">Catch by PFZ Area</h2>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-around gap-6 my-auto">
            {/* SVG Donut */}
            <div className="relative w-44 h-44 shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 42 42">
                <circle
                  cx="21"
                  cy="21"
                  r="15.91549430918954"
                  fill="transparent"
                  stroke="#f1f5f9"
                  strokeWidth="6.5"
                />
                {/* PFZ-03: 45% (Teal #059669) */}
                <circle
                  cx="21"
                  cy="21"
                  r="15.91549430918954"
                  fill="transparent"
                  stroke="#059669"
                  strokeWidth="6.5"
                  strokeDasharray="45 55"
                  strokeDashoffset="0"
                />
                {/* PFZ-07: 30% (Orange #f97316) */}
                <circle
                  cx="21"
                  cy="21"
                  r="15.91549430918954"
                  fill="transparent"
                  stroke="#f97316"
                  strokeWidth="6.5"
                  strokeDasharray="30 70"
                  strokeDashoffset="-45"
                />
                {/* PFZ-11: 15% (Red #ef4444) */}
                <circle
                  cx="21"
                  cy="21"
                  r="15.91549430918954"
                  fill="transparent"
                  stroke="#ef4444"
                  strokeWidth="6.5"
                  strokeDasharray="15 85"
                  strokeDashoffset="-75"
                />
                {/* Others: 10% (Blue #0d6efd) */}
                <circle
                  cx="21"
                  cy="21"
                  r="15.91549430918954"
                  fill="transparent"
                  stroke="#0d6efd"
                  strokeWidth="6.5"
                  strokeDasharray="10 90"
                  strokeDashoffset="-90"
                />
              </svg>
            </div>

            {/* Legend List */}
            <div className="space-y-3 w-full sm:w-48">
              {catchByPFZAreaData.map((p, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: p.color }}
                    />
                    <span className="font-semibold text-slate-700">{p.name}</span>
                  </div>
                  <span className="font-bold text-slate-900">{p.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Card 4: Total Catch with Wave Sparkline */}
        <div
          className="bg-white border border-[#eef2f7] rounded-[20px] p-6 shadow-xs flex flex-col justify-between"
          data-purpose="total-catch-card"
        >
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Catch
            </h2>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-extrabold text-slate-900">
                {initialMetrics.totalCatchKg}
              </span>
              <span className="text-base font-bold text-slate-700">kg</span>
            </div>
            <div className="flex items-center gap-1 mt-1.5 text-xs font-bold text-emerald-600">
              <ArrowUp className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{initialMetrics.catchChange}</span>
            </div>
          </div>

          {/* Bottom Wave Curve Graph */}
          <div className="w-full h-28 mt-4">
            <svg
              className="w-full h-full overflow-visible"
              preserveAspectRatio="none"
              viewBox="0 0 400 90"
            >
              <defs>
                <linearGradient id="waveFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0d6efd" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#0d6efd" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path
                d="M 0,70 C 50,70 90,45 140,50 C 190,55 220,30 270,35 C 320,40 350,15 400,10 L 400,90 L 0,90 Z"
                fill="url(#waveFill)"
              />
              <path
                d="M 0,70 C 50,70 90,45 140,50 C 190,55 220,30 270,35 C 320,40 350,15 400,10"
                fill="none"
                stroke="#0d6efd"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <circle cx="2" cy="70" r="3.5" fill="#0d6efd" />
              <circle cx="400" cy="10" r="4.5" fill="#0d6efd" />
            </svg>
          </div>
        </div>
      </section>

      {/* Bottom Metric Cards Row */}
      <section
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 pt-1"
        data-purpose="metric-summary-row"
      >
        {/* Metric 1: Total Trips */}
        <div className="bg-white border border-[#eef2f7] rounded-[20px] p-5 sm:p-6 shadow-xs">
          <p className="text-xs font-semibold text-slate-500">Total Trips</p>
          <p className="text-2xl font-extrabold text-slate-900 mt-2">
            {initialMetrics.totalTrips}
          </p>
          <div className="flex items-center gap-1 mt-2.5 text-xs font-bold text-emerald-600">
            <ArrowUp className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>{initialMetrics.tripsChange}</span>
          </div>
        </div>

        {/* Metric 2: Avg. Catch / Trip */}
        <div className="bg-white border border-[#eef2f7] rounded-[20px] p-5 sm:p-6 shadow-xs">
          <p className="text-xs font-semibold text-slate-500">Avg. Catch / Trip</p>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-2xl font-extrabold text-slate-900">
              {initialMetrics.avgCatchKg}
            </span>
            <span className="text-xs font-bold text-slate-600">kg</span>
          </div>
          <div className="flex items-center gap-1 mt-2.5 text-xs font-bold text-emerald-600">
            <ArrowUp className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>{initialMetrics.avgCatchChange}</span>
          </div>
        </div>

        {/* Metric 3: Total Distance */}
        <div className="bg-white border border-[#eef2f7] rounded-[20px] p-5 sm:p-6 shadow-xs">
          <p className="text-xs font-semibold text-slate-500">Total Distance</p>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-2xl font-extrabold text-slate-900">
              {initialMetrics.totalDistanceKm}
            </span>
            <span className="text-xs font-bold text-slate-600">km</span>
          </div>
          <div className="flex items-center gap-1 mt-2.5 text-xs font-bold text-emerald-600">
            <ArrowUp className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>{initialMetrics.distanceChange}</span>
          </div>
        </div>

        {/* Metric 4: Est. Earnings */}
        <div className="bg-white border border-[#eef2f7] rounded-[20px] p-5 sm:p-6 shadow-xs">
          <p className="text-xs font-semibold text-slate-500">Est. Earnings</p>
          <div className="mt-2">
            <span className="text-2xl font-extrabold text-slate-900">
              ₹{initialMetrics.estEarningsInr.toLocaleString('en-IN')}
            </span>
          </div>
          <div className="flex items-center gap-1 mt-2.5 text-xs font-bold text-emerald-600">
            <ArrowUp className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>{initialMetrics.earningsChange}</span>
          </div>
        </div>
      </section>
    </div>
  );
};
