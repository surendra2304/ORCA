import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Search, 
  ChevronDown, 
  Wind, 
  Waves, 
  Bell, 
  AlertTriangle, 
  ShieldAlert, 
  Calendar, 
  MapPin,
  Umbrella,
  LifeBuoy
} from 'lucide-react';

interface HistoricalEvent {
  id: string;
  name: string;
  location: string;
  date: string;
  year: number;
  category: string;
  windSpeed: number; // km/h
  surgeMeters: number; // m
  vesselsRescued: number;
  suspendedPorts: number;
  damagePercentage: number;
  damageColor: string;
  vesselsColor: string;
}

interface LiveAlertItem {
  id: string;
  type: string;
  severity: 'Critical' | 'Moderate' | 'Watch';
  location: string;
  details: string;
}

const ALL_HISTORICAL_EVENTS: HistoricalEvent[] = [
  // ================= 2026 (CURRENT YEAR) =================
  {
    id: 'bob-depression-2026',
    name: 'Bay of Bengal Deep Depression',
    location: 'Andhra / Odisha Coast',
    date: 'February 2026',
    year: 2026,
    category: 'Deep Depression',
    windSpeed: 68,
    surgeMeters: 1.6,
    vesselsRescued: 48,
    suspendedPorts: 2,
    damagePercentage: 28,
    damageColor: '#10b981',
    vesselsColor: 'text-emerald-700 font-bold'
  },
  {
    id: 'arabian-surge-2026',
    name: 'Arabian Sea Swell Surge 2026',
    location: 'Kerala / South Goa',
    date: 'April 2026',
    year: 2026,
    category: 'Severe Swell Surge',
    windSpeed: 74,
    surgeMeters: 2.2,
    vesselsRescued: 88,
    suspendedPorts: 3,
    damagePercentage: 36,
    damageColor: '#10b981',
    vesselsColor: 'text-emerald-700 font-bold'
  },
  {
    id: 'machilipatnam-wave-2026',
    name: 'Machilipatnam High Wave Surge',
    location: 'Andhra Coast',
    date: 'June 2026',
    year: 2026,
    category: 'Coastal Swell Alert',
    windSpeed: 58,
    surgeMeters: 1.9,
    vesselsRescued: 114,
    suspendedPorts: 2,
    damagePercentage: 32,
    damageColor: '#10b981',
    vesselsColor: 'text-emerald-700 font-bold'
  },
  {
    id: 'gopalpur-surge-2026',
    name: 'Gopalpur Tidal Inundation',
    location: 'Odisha Coast',
    date: 'August 2026',
    year: 2026,
    category: 'Tidal Inundation',
    windSpeed: 62,
    surgeMeters: 2.0,
    vesselsRescued: 64,
    suspendedPorts: 2,
    damagePercentage: 30,
    damageColor: '#10b981',
    vesselsColor: 'text-emerald-700 font-bold'
  },

  // ================= 2025 =================
  {
    id: 'fengal-2025',
    name: 'Cyclone Fengal',
    location: 'Puducherry/Andhra',
    date: 'September 2025',
    year: 2025,
    category: 'Cycloner 7',
    windSpeed: 110,
    surgeMeters: 3.2,
    vesselsRescued: 218,
    suspendedPorts: 4,
    damagePercentage: 78,
    damageColor: '#10b981',
    vesselsColor: 'text-emerald-700 font-bold'
  },
  {
    id: 'shakhti-2025',
    name: 'Cyclone Shakhti',
    location: 'West Coast',
    date: '16-Sept 2025',
    year: 2025,
    category: 'Cyclone',
    windSpeed: 110,
    surgeMeters: 2.8,
    vesselsRescued: 218,
    suspendedPorts: 4,
    damagePercentage: 65,
    damageColor: '#eab308',
    vesselsColor: 'text-amber-700 font-bold'
  },
  {
    id: 'ditwah-2025',
    name: 'CycloneDitwah',
    location: 'Tamil Nadu',
    date: '27-Sept 2025',
    year: 2025,
    category: 'Sevier',
    windSpeed: 110,
    surgeMeters: 4.5,
    vesselsRescued: 218,
    suspendedPorts: 4,
    damagePercentage: 82,
    damageColor: '#ef4444',
    vesselsColor: 'text-red-700 font-bold'
  },
  {
    id: 'montha-2025',
    name: 'Cyclone Montha',
    location: 'Yanam Coast',
    date: '03-Nov. 2025',
    year: 2025,
    category: 'Sevier',
    windSpeed: 110,
    surgeMeters: 3.6,
    vesselsRescued: 217,
    suspendedPorts: 4,
    damagePercentage: 71,
    damageColor: '#eab308',
    vesselsColor: 'text-amber-700 font-bold'
  },

  // ================= 2024 =================
  {
    id: 'dana-2024',
    name: 'Cyclone Dana',
    location: 'Odisha / Bengal',
    date: 'October 2024',
    year: 2024,
    category: 'Severe Cyclone',
    windSpeed: 120,
    surgeMeters: 2.5,
    vesselsRescued: 312,
    suspendedPorts: 5,
    damagePercentage: 54,
    damageColor: '#10b981',
    vesselsColor: 'text-emerald-700 font-bold'
  },
  {
    id: 'remal-2024',
    name: 'Cyclone Remal',
    location: 'West Bengal / Sundarbans',
    date: 'May 2024',
    year: 2024,
    category: 'Severe Cyclone',
    windSpeed: 135,
    surgeMeters: 3.8,
    vesselsRescued: 420,
    suspendedPorts: 6,
    damagePercentage: 86,
    damageColor: '#ef4444',
    vesselsColor: 'text-red-700 font-bold'
  },
  {
    id: 'asna-2024',
    name: 'Cyclone Asna',
    location: 'Gujarat Coast',
    date: 'August 2024',
    year: 2024,
    category: 'Cyclonic Storm',
    windSpeed: 85,
    surgeMeters: 2.1,
    vesselsRescued: 145,
    suspendedPorts: 3,
    damagePercentage: 48,
    damageColor: '#10b981',
    vesselsColor: 'text-emerald-700 font-bold'
  },

  // ================= 2023 =================
  {
    id: 'michaung-2023',
    name: 'Cyclone Michaung',
    location: 'Andhra Pradesh / Chennai',
    date: 'December 2023',
    year: 2023,
    category: 'Super Severe',
    windSpeed: 110,
    surgeMeters: 3.5,
    vesselsRescued: 530,
    suspendedPorts: 6,
    damagePercentage: 88,
    damageColor: '#ef4444',
    vesselsColor: 'text-red-700 font-bold'
  },
  {
    id: 'biparjoy-2023',
    name: 'Cyclone Biparjoy',
    location: 'Gujarat / Saurashtra',
    date: 'June 2023',
    year: 2023,
    category: 'Extremely Severe',
    windSpeed: 165,
    surgeMeters: 4.2,
    vesselsRescued: 680,
    suspendedPorts: 8,
    damagePercentage: 92,
    damageColor: '#ef4444',
    vesselsColor: 'text-red-700 font-bold'
  },

  // ================= 2022 =================
  {
    id: 'mandous-2022',
    name: 'Cyclone Mandous',
    location: 'Tamil Nadu Coast',
    date: 'December 2022',
    year: 2022,
    category: 'Severe Cyclone',
    windSpeed: 105,
    surgeMeters: 2.8,
    vesselsRescued: 245,
    suspendedPorts: 4,
    damagePercentage: 62,
    damageColor: '#eab308',
    vesselsColor: 'text-amber-700 font-bold'
  },
  {
    id: 'asani-2022',
    name: 'Cyclone Asani',
    location: 'Andhra Coast',
    date: 'May 2022',
    year: 2022,
    category: 'Severe Cyclone',
    windSpeed: 120,
    surgeMeters: 2.8,
    vesselsRescued: 310,
    suspendedPorts: 5,
    damagePercentage: 70,
    damageColor: '#eab308',
    vesselsColor: 'text-amber-700 font-bold'
  },

  // ================= 2021 =================
  {
    id: 'tauktae-2021',
    name: 'Cyclone Tauktae',
    location: 'Gujarat / Maharashtra / Goa',
    date: 'May 2021',
    year: 2021,
    category: 'Extremely Severe',
    windSpeed: 185,
    surgeMeters: 4.8,
    vesselsRescued: 780,
    suspendedPorts: 10,
    damagePercentage: 94,
    damageColor: '#ef4444',
    vesselsColor: 'text-red-700 font-bold'
  },
  {
    id: 'yaas-2021',
    name: 'Cyclone Yaas',
    location: 'Odisha / West Bengal',
    date: 'May 2021',
    year: 2021,
    category: 'Very Severe',
    windSpeed: 140,
    surgeMeters: 4.2,
    vesselsRescued: 650,
    suspendedPorts: 8,
    damagePercentage: 90,
    damageColor: '#ef4444',
    vesselsColor: 'text-red-700 font-bold'
  },
  {
    id: 'gulab-2021',
    name: 'Cyclone Gulab',
    location: 'Andhra / Odisha',
    date: 'September 2021',
    year: 2021,
    category: 'Cyclonic Storm',
    windSpeed: 95,
    surgeMeters: 1.9,
    vesselsRescued: 89,
    suspendedPorts: 3,
    damagePercentage: 58,
    damageColor: '#eab308',
    vesselsColor: 'text-amber-700 font-bold'
  },

  // ================= 2020 =================
  {
    id: 'amphan-2020',
    name: 'Super Cyclone Amphan',
    location: 'West Bengal / Odisha',
    date: 'May 2020',
    year: 2020,
    category: 'Super Cyclone',
    windSpeed: 240,
    surgeMeters: 5.5,
    vesselsRescued: 920,
    suspendedPorts: 12,
    damagePercentage: 98,
    damageColor: '#ef4444',
    vesselsColor: 'text-red-700 font-bold'
  },
  {
    id: 'nisarga-2020',
    name: 'Cyclone Nisarga',
    location: 'Maharashtra Coast',
    date: 'June 2020',
    year: 2020,
    category: 'Severe Cyclone',
    windSpeed: 120,
    surgeMeters: 2.6,
    vesselsRescued: 340,
    suspendedPorts: 5,
    damagePercentage: 76,
    damageColor: '#eab308',
    vesselsColor: 'text-amber-700 font-bold'
  },

  // ================= 2000 =================
  {
    id: 'bob-2000',
    name: '2000 Central Bay Cyclone',
    location: 'Tamil Nadu / Andhra',
    date: 'November 2000',
    year: 2000,
    category: 'Very Severe',
    windSpeed: 155,
    surgeMeters: 3.8,
    vesselsRescued: 460,
    suspendedPorts: 6,
    damagePercentage: 85,
    damageColor: '#ef4444',
    vesselsColor: 'text-red-700 font-bold'
  }
];

const LIVE_ALERTS_DATA: LiveAlertItem[] = [
  {
    id: 'la-1',
    type: 'High Waves (Swell Surge)',
    severity: 'Critical',
    location: 'Machilipatnam',
    details: 'Real-time coastal alert for I...'
  },
  {
    id: 'la-2',
    type: 'Wind Shear',
    severity: 'Moderate',
    location: 'Kakinada Zone',
    details: 'Coastal alert in monitoring...'
  },
  {
    id: 'la-3',
    type: 'Cyclone Warning',
    severity: 'Moderate',
    location: 'Bay of Bengal',
    details: 'Biv coastal alert in with modify'
  },
  {
    id: 'la-4',
    type: 'Cyclone Warning',
    severity: 'Watch',
    location: 'Bay of Bengal',
    details: 'High waves alert im with moons liad...'
  },
  {
    id: 'la-5',
    type: 'Cyclone Warning',
    severity: 'Watch',
    location: 'Bay of Bengal',
    details: 'High waves alert im with moons liad...'
  },
  {
    id: 'la-6',
    type: 'Cyclone Warning',
    severity: 'Watch',
    location: 'Bay of Bengal',
    details: 'High waves alert...'
  }
];

// SVG Circular Damage Ring Component
const CircularDamageRing: React.FC<{ percentage: number; strokeColor: string }> = ({ percentage, strokeColor }) => {
  const radius = 17;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative w-11 h-11 flex items-center justify-center">
        <svg className="w-11 h-11 -rotate-90" viewBox="0 0 42 42">
          <circle
            cx="21"
            cy="21"
            r={radius}
            className="stroke-slate-200"
            strokeWidth="3"
            fill="transparent"
          />
          <circle
            cx="21"
            cy="21"
            r={radius}
            stroke={strokeColor}
            strokeWidth="3.5"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-500 ease-out"
          />
        </svg>
        <span className="absolute text-[11px] font-extrabold text-ocean-text">
          {percentage}%
        </span>
      </div>
      <span className="text-[9px] text-ocean-text/60 font-semibold mt-0.5 whitespace-nowrap">
        Damage: {percentage}%
      </span>
    </div>
  );
};

export const Page12Disasters: React.FC = () => {
  const { selectedRegion } = useApp();
  const currentYear = new Date().getFullYear(); // Dynamic current year (2026)
  
  const [regionSearch, setRegionSearch] = useState<string>('Andhra Coast');
  const [selectedYear, setSelectedYear] = useState<string>(currentYear.toString());
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState<boolean>(false);

  // Dynamic Year List containing current year and historical milestones
  const yearOptions = [
    currentYear.toString(),
    (currentYear - 1).toString(),
    (currentYear - 2).toString(),
    (currentYear - 3).toString(),
    (currentYear - 4).toString(),
    (currentYear - 5).toString(),
    '2020',
    '2000'
  ];

  // Filter historical disaster events by selected year and regionSearch
  const yearEvents = ALL_HISTORICAL_EVENTS.filter(e => e.year.toString() === selectedYear);
  const matchingRegionEvents = yearEvents.filter(e => {
    if (!regionSearch.trim()) return true;
    const term = regionSearch.toLowerCase().trim();
    return e.location.toLowerCase().includes(term) || e.name.toLowerCase().includes(term);
  });

  // Display matched events, or all events for the selected year if region filter has no matches
  const displayedEvents = matchingRegionEvents.length > 0 
    ? matchingRegionEvents 
    : (yearEvents.length > 0 ? yearEvents : ALL_HISTORICAL_EVENTS.slice(0, 4));

  return (
    <div className="w-full min-h-screen bg-[#f0f4f5] text-ocean-text p-4 sm:p-6 lg:p-8 space-y-5 select-none font-sans">
      
      {/* ================= PAGE HEADER ================= */}
      <div className="bg-[#e4eded]/80 rounded-2xl p-4 sm:p-5 border border-ocean-sub/80 shadow-2xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        
        {/* Left: Title & Subtitle */}
        <div className="space-y-0.5">
          <div className="flex items-center space-x-2">
            <span className="text-amber-600">
              <Umbrella className="w-5 h-5 text-amber-600" />
            </span>
            <h1 className="text-lg sm:text-xl font-bold text-ocean-text tracking-tight">
              Disaster & Historical Period Analysis
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-ocean-text/70 pl-7">
            India Coastal Event Search and Live Alerts
          </p>
        </div>

        {/* Right: Region Search & Period / Year */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 self-start md:self-auto">
          
          {/* 1. Region Search */}
          <div className="flex flex-col">
            <label className="text-[11px] font-bold text-ocean-text/80 mb-1">
              Region Search
            </label>
            <div className="relative">
              <input
                type="text"
                value={regionSearch}
                onChange={(e) => setRegionSearch(e.target.value)}
                placeholder="Region search..."
                className="w-40 sm:w-48 pl-3 pr-8 py-1.5 bg-white border border-ocean-sub rounded-lg text-xs font-semibold text-ocean-text shadow-2xs focus:outline-hidden focus:border-[#2a8a89]"
              />
              <Search className="w-3.5 h-3.5 text-ocean-text/40 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* 2. Period / Year Dropdown */}
          <div className="flex flex-col relative">
            <label className="text-[11px] font-bold text-ocean-text/80 mb-1">
              Period / Year
            </label>
            <button
              onClick={() => setIsYearDropdownOpen(!isYearDropdownOpen)}
              className="w-28 sm:w-32 px-3 py-1.5 bg-white border border-ocean-sub rounded-lg text-xs font-semibold text-ocean-text shadow-2xs flex items-center justify-between cursor-pointer focus:outline-hidden focus:border-[#2a8a89]"
            >
              <span>{selectedYear}</span>
              <ChevronDown className="w-3.5 h-3.5 text-ocean-text/50" />
            </button>

            {/* Year Dropdown Options */}
            {isYearDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-full bg-white border border-ocean-sub rounded-lg shadow-lg py-1 z-30 animate-in fade-in">
                {yearOptions.map((yr) => (
                  <button
                    key={yr}
                    onClick={() => {
                      setSelectedYear(yr);
                      setIsYearDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs font-medium hover:bg-[#2a8a89]/10 hover:text-[#2a8a89] transition-colors ${
                      selectedYear === yr ? 'bg-[#2a8a89] text-white font-bold hover:bg-[#2a8a89] hover:text-white' : 'text-ocean-text'
                    }`}
                  >
                    {yr}
                  </button>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* ================= MAIN CONTENT: 2-COLUMN LAYOUT ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* LEFT SIDE (8 COLS): Historical Disaster Table */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-ocean-sub shadow-xs p-4 sm:p-5 overflow-hidden">
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[620px]">
              <thead>
                <tr className="border-b border-ocean-sub/70 text-[11px] font-bold text-ocean-text/75 uppercase tracking-wider">
                  <th className="pb-3 pr-2">Disaster Name</th>
                  <th className="pb-3 px-2">Location</th>
                  <th className="pb-3 px-2">Date</th>
                  <th className="pb-3 px-2">Category</th>
                  <th className="pb-3 px-2">Wind (km/h)</th>
                  <th className="pb-3 px-2">Surge (m)</th>
                  <th className="pb-3 pl-2 text-center">Damage Indicator (%)</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-ocean-sub/50 text-xs">
                {displayedEvents.map((event) => (
                  <tr key={event.id} className="hover:bg-slate-50/60 transition-colors">
                    
                    {/* 1. Disaster Name */}
                    <td className="py-4 pr-2 font-bold text-ocean-text whitespace-nowrap">
                      {event.name}
                    </td>

                    {/* 2. Location */}
                    <td className="py-4 px-2 text-ocean-text/80 font-medium whitespace-nowrap">
                      {event.location}
                    </td>

                    {/* 3. Date */}
                    <td className="py-4 px-2 text-ocean-text/75 font-medium whitespace-nowrap">
                      {event.date}
                    </td>

                    {/* 4. Category */}
                    <td className="py-4 px-2 text-ocean-text/80 font-medium whitespace-nowrap">
                      {event.category}
                    </td>

                    {/* 5. Wind (km/h) */}
                    <td className="py-4 px-2 whitespace-nowrap">
                      <div className="flex items-center space-x-1 text-[10px] text-ocean-text/60">
                        <Wind className="w-3 h-3 text-ocean-text/40" />
                        <span>Wind (km/h)</span>
                      </div>
                      <div className="font-extrabold text-ocean-text text-xs mt-0.5">
                        {event.windSpeed} km/h
                      </div>
                    </td>

                    {/* 6. Surge (m) */}
                    <td className="py-4 px-2 whitespace-nowrap">
                      <div className="flex items-center space-x-1 text-[10px] text-ocean-text/60">
                        <Waves className="w-3 h-3 text-ocean-text/40" />
                        <span>Surge (m)</span>
                      </div>
                      <div className="text-[11px] text-ocean-text/70 font-semibold mt-0.5">
                        ({event.surgeMeters}m)
                      </div>
                    </td>

                    {/* 7. Damage Indicator (%) & Rescued Stats */}
                    <td className="py-4 pl-2 whitespace-nowrap">
                      <div className="flex items-center justify-end space-x-3">
                        <div className="text-right text-[10px] space-y-0.5">
                          <div className="text-ocean-text/60">Vessels Sounded / Rescued</div>
                          <div className={`text-xs ${event.vesselsColor}`}>
                            {event.vesselsRescued}
                          </div>
                          <div className="text-ocean-text/50">
                            Suspended Ports: {event.suspendedPorts}
                          </div>
                        </div>

                        {/* Circular Progress Ring */}
                        <CircularDamageRing 
                          percentage={event.damagePercentage} 
                          strokeColor={event.damageColor} 
                        />
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>

        {/* RIGHT SIDE (4 COLS): Live Alerts Panel */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-ocean-sub shadow-xs p-4 sm:p-5 space-y-3.5">
          
          {/* Live Alerts Header */}
          <div className="flex items-center space-x-1.5 pb-2 border-b border-ocean-sub/70">
            <Bell className="w-4 h-4 text-red-600" />
            <h2 className="text-sm font-bold text-ocean-text">
              Live Alerts
            </h2>
          </div>

          {/* Live Alerts Compact Table / List */}
          <div className="overflow-x-auto max-h-[460px] overflow-y-auto scrollbar-thin">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-ocean-sub/60 text-[10px] font-bold text-ocean-text/70 uppercase tracking-wider">
                  <th className="pb-2 pr-1.5">Type</th>
                  <th className="pb-2 px-1.5">Severity</th>
                  <th className="pb-2 px-1.5">Location</th>
                  <th className="pb-2 pl-1.5">Details</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-ocean-sub/40 text-[11px]">
                {LIVE_ALERTS_DATA.map((alert) => (
                  <tr key={alert.id} className="hover:bg-slate-50/70 transition-colors">
                    
                    {/* Type */}
                    <td className="py-2.5 pr-1.5 font-semibold text-ocean-text max-w-[90px] leading-tight">
                      {alert.type}
                    </td>

                    {/* Severity */}
                    <td className="py-2.5 px-1.5 whitespace-nowrap">
                      {alert.severity === 'Critical' && (
                        <span className="text-red-700 font-bold">
                          Critical
                        </span>
                      )}
                      {alert.severity === 'Moderate' && (
                        <span className="text-amber-700 font-bold">
                          Moderate
                        </span>
                      )}
                      {alert.severity === 'Watch' && (
                        <span className="text-teal-700 font-bold">
                          Watch
                        </span>
                      )}
                    </td>

                    {/* Location */}
                    <td className="py-2.5 px-1.5 text-ocean-text/80 font-medium whitespace-nowrap">
                      {alert.location}
                    </td>

                    {/* Details */}
                    <td className="py-2.5 pl-1.5 text-ocean-text/60 text-[10px] truncate max-w-[110px]" title={alert.details}>
                      {alert.details}
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>

      </div>

    </div>
  );
};


