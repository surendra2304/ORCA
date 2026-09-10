import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  Thermometer,
  Wind,
  Waves,
  Compass,
  ArrowUp,
  Eye,
  Maximize2,
  Clock,
  AlertTriangle,
  Flame,
  Layers,
  Crosshair,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { SeaConditionsData, MetricSummary } from '../types';
import { harborCoords, pfzZones } from '../data/mockData';
import { useOrcaSyncQuery } from '../hooks/useOrcaQuery';
import { useLocation } from '../context/LocationContext';
import { fetchBriefing } from '../services/orcaApi';
import type { BriefingResponse } from '../services/orcaApi';

interface DashboardScreenProps {
  seaConditions: SeaConditionsData;
  metrics: MetricSummary;
  onOpenAlertsModal: () => void;
  onSelectZone: (zoneId: string) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  seaConditions: fallbackConditions,
  metrics,
  onOpenAlertsModal,
  onSelectZone,
}) => {
  const { location } = useLocation();

  // ── Instant live Open-Meteo marine & weather briefing ──────────────────────
  const [briefing, setBriefing] = useState<BriefingResponse | null>(null);

  useEffect(() => {
    let active = true;
    const update = (force: boolean = false) => {
      fetchBriefing(location.lat, location.lon, 'small_fishing_boat', 'real', force)
        .then((data) => {
          if (active) setBriefing(data);
        })
        .catch((err) => console.warn('Dashboard briefing error:', err));
    };

    update();
    const interval = setInterval(() => update(false), 180000); // 3 minutes auto-refresh

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') update(false);
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      active = false;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [location.lat, location.lon]);

  // ── Optional full multi-agent sync query for deep assessment ──────────────
  const { loading: liveLoading, result: liveResult, fetch: fetchLive } = useOrcaSyncQuery();

  // Fetch real conditions on mount and whenever active location changes
  useEffect(() => {
    fetchLive(
      `What are the current sea conditions, wave height, wind speed, SST and safety status near ${location.name}? Include ocean and weather data.`,
      'en',
      { lat: location.lat, lon: location.lon, name: location.name }
    );
  }, [fetchLive, location.lat, location.lon, location.name]);

  // Merge real data over fallback when available
  const ocean = liveResult?.agent_outputs?.ocean || briefing?.ocean;
  const weather = liveResult?.agent_outputs?.weather || briefing?.weather;
  const verdict = liveResult?.verdict || briefing?.verdict;

  const windKt = weather?.wind_knots ?? weather?.wind_speed_kt;
  const windSpeedKmH = windKt != null ? Math.round(windKt * 1.852) : fallbackConditions.windSpeed;
  const sst = ocean?.sst_c ?? fallbackConditions.seaTemp;

  const seaConditions: SeaConditionsData = {
    seaTemp: sst != null ? Number(sst.toFixed(1)) : fallbackConditions.seaTemp,
    tempStatus: ocean ? (sst > 29 ? 'Warm Front' : sst < 26 ? 'Cool Upwelling' : 'Normal Front') : fallbackConditions.tempStatus,
    heatStress: ocean ? (sst > 30 ? 'High' : sst > 28 ? 'Moderate' : 'Low') : fallbackConditions.heatStress,
    windSpeed: windSpeedKmH,
    waveHeight: ocean?.wave_height_m != null ? Number(ocean.wave_height_m.toFixed(1)) : fallbackConditions.waveHeight,
    seaState: ocean?.wave_height_m != null
      ? ocean.wave_height_m < 0.5 ? 'Calm' : ocean.wave_height_m < 1.25 ? 'Slight' : ocean.wave_height_m < 2.5 ? 'Moderate' : 'Rough'
      : fallbackConditions.seaState,
    tide: ocean?.tide_m ?? fallbackConditions.tide,
    tideDirection: (ocean?.tide_m ?? 1) > 0 ? 'rising' : 'falling',
    visibility: fallbackConditions.visibility,
    visibilityRating: fallbackConditions.visibilityRating,
    thermalFrontStatus: verdict
      ? verdict.label === 'GO' ? 'Optimal' : verdict.label === 'CAUTION' ? 'Marginal' : 'Unfavorable'
      : fallbackConditions.thermalFrontStatus,
    thermalFrontNote: liveResult?.final_answer
      ? liveResult.final_answer.slice(0, 120) + '...'
      : (weather?.weather_desc ? `${weather.weather_desc}, wind ${windKt != null ? Math.round(windKt) : '--'} kn` : fallbackConditions.thermalFrontNote),
  };
  // ── End live data ──────────────────────────────────────────────────────────

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const thermalLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const [isThermalActive, setIsThermalActive] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const mapWrapperRef = useRef<HTMLDivElement>(null);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return; // already initialized

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
      center: [16.92, 82.35],
      zoom: 11,
      minZoom: 8,
      maxZoom: 18,
    });

    mapInstanceRef.current = map;

    // CartoDB Voyager Tile layer
    const voyagerLayer = L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      {
        subdomains: 'abcd',
        maxZoom: 19,
      }
    );
    voyagerLayer.addTo(map);

    // Thermal Layers Group
    const thermalGroup = L.layerGroup();
    thermalLayerGroupRef.current = thermalGroup;

    // 1. Cool Upwelling (Teal / Cyan)
    const coolCoords: [number, number] = [17.02, 82.45];
    L.circle(coolCoords, {
      color: '#0284c7',
      fillColor: '#06b6d4',
      fillOpacity: 0.28,
      weight: 1.5,
      dashArray: '3, 4',
      radius: 4600,
    }).addTo(thermalGroup);

    L.circle(coolCoords, {
      color: '#0369a1',
      fillColor: '#0284c7',
      fillOpacity: 0.45,
      weight: 2,
      radius: 2400,
    }).addTo(thermalGroup);

    // Label: Cool Upwelling
    const coolIcon = L.divIcon({
      className: '',
      html: `
        <div class="bg-cyan-900/90 text-cyan-200 border border-cyan-400/60 shadow-lg px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 backdrop-blur -translate-x-1/2 -translate-y-1/2 whitespace-nowrap">
          <span class="w-2 h-2 rounded-full bg-cyan-400"></span>
          <span>Cool Upwelling (24.8°C)</span>
        </div>
      `,
      iconSize: [140, 20],
      iconAnchor: [70, 10],
    });
    L.marker([17.02, 82.45], { icon: coolIcon }).addTo(thermalGroup);

    // 2. Optimal Front PFZ-03 (Emerald)
    const pfz03Coords: [number, number] = [16.95, 82.35];
    L.circle(pfz03Coords, {
      color: '#059669',
      fillColor: '#10b981',
      fillOpacity: 0.28,
      weight: 2,
      radius: 4200,
    }).addTo(thermalGroup);

    L.circle(pfz03Coords, {
      color: '#10b981',
      fillColor: '#34d399',
      fillOpacity: 0.38,
      weight: 1.5,
      radius: 2000,
    }).addTo(thermalGroup);

    const optimalIcon = L.divIcon({
      className: '',
      html: `
        <div class="bg-emerald-900/90 text-emerald-200 border border-emerald-400/80 shadow-lg px-2.5 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 backdrop-blur -translate-x-1/2 -translate-y-1/2 whitespace-nowrap">
          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Optimal Front (27.4°C)</span>
        </div>
      `,
      iconSize: [136, 20],
      iconAnchor: [68, 26],
    });
    L.marker([16.925, 82.35], { icon: optimalIcon }).addTo(thermalGroup);

    // 3. Warm Pool PFZ-07 (Amber)
    const pfz07Coords: [number, number] = [16.82, 82.4];
    L.circle(pfz07Coords, {
      color: '#d97706',
      fillColor: '#f59e0b',
      fillOpacity: 0.3,
      weight: 1.5,
      radius: 4000,
    }).addTo(thermalGroup);

    const warmIcon = L.divIcon({
      className: '',
      html: `
        <div class="bg-amber-950/90 text-amber-200 border border-amber-400/70 shadow-lg px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 backdrop-blur -translate-x-1/2 -translate-y-1/2 whitespace-nowrap">
          <span class="w-2 h-2 rounded-full bg-amber-400"></span>
          <span>Warm Pool (29.0°C)</span>
        </div>
      `,
      iconSize: [120, 20],
      iconAnchor: [60, 24],
    });
    L.marker([16.79, 82.4], { icon: warmIcon }).addTo(thermalGroup);

    // 4. Heat Stress Hazard PFZ-11 (Red)
    const pfz11Coords: [number, number] = [16.7, 82.48];
    L.circle(pfz11Coords, {
      color: '#dc2626',
      fillColor: '#ef4444',
      fillOpacity: 0.35,
      weight: 2,
      dashArray: '5, 5',
      radius: 4500,
    }).addTo(thermalGroup);

    const heatStressIcon = L.divIcon({
      className: '',
      html: `
        <div class="thermal-heat-stress bg-rose-950/95 text-rose-200 border-2 border-rose-500 shadow-xl px-2.5 py-1 rounded-full text-[10px] font-extrabold flex items-center gap-1.5 backdrop-blur -translate-x-1/2 -translate-y-1/2 whitespace-nowrap">
          <span class="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
          <span>Thermal Heat Stress Zone (30.8°C)</span>
        </div>
      `,
      iconSize: [180, 22],
      iconAnchor: [90, 26],
    });
    L.marker([16.66, 82.48], { icon: heatStressIcon }).addTo(thermalGroup);

    // Restricted Naval polygon (Purple)
    const restrictedCoords: [number, number] = [17.06, 82.39];
    L.circle(restrictedCoords, {
      color: '#9333ea',
      fillColor: '#c084fc',
      fillOpacity: 0.2,
      weight: 1.5,
      dashArray: '4, 5',
      radius: 3600,
    }).addTo(map);

    thermalGroup.addTo(map);

    // Trajectory navigation line from Harbor to PFZ-03
    const currentHarborCoords: [number, number] = [location.lat, location.lon];
    L.polyline([currentHarborCoords, pfz03Coords], {
      color: '#2563eb',
      weight: 2.5,
      opacity: 0.85,
      dashArray: '6, 7',
      lineCap: 'round',
    }).addTo(map);

    // Midpoint Distance Badge
    const midLat = (currentHarborCoords[0] + pfz03Coords[0]) / 2;
    const midLng = (currentHarborCoords[1] + pfz03Coords[1]) / 2;
    const distanceBadgeIcon = L.divIcon({
      className: '',
      html: `
        <div class="bg-blue-600/90 text-white font-bold text-[10px] px-2 py-0.5 rounded-full shadow-md backdrop-blur border border-white/50 whitespace-nowrap flex items-center gap-1 -translate-x-1/2 -translate-y-1/2">
          <span>⛵</span> 18.4 km
        </div>
      `,
      iconSize: [64, 20],
      iconAnchor: [32, 10],
    });
    L.marker([midLat, midLng], { icon: distanceBadgeIcon }).addTo(map);

    // Harbor Marker
    const harborIcon = L.divIcon({
      className: '',
      html: `
        <div class="relative w-8 h-8 flex items-center justify-center">
          <div class="absolute inset-0 bg-blue-500 rounded-full opacity-35 animate-ping"></div>
          <div class="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg border-2 border-white">
            <svg class="w-3.5 h-3.5 fill-white" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="m9.69 18.933.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 0 0 .281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 1 0 3 9c0 3.492 1.698 5.988 3.355 7.588a13.9 13.9 0 0 0 3.032 2.198l.018.008.006.003.002.001.003.001.001.001ZM10 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" clip-rule="evenodd"></path>
            </svg>
          </div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
    const harborMarker = L.marker(currentHarborCoords, { icon: harborIcon }).addTo(map);
    harborMarker.bindPopup(
      `
      <div class="p-1 text-xs">
        <p class="font-bold text-slate-900">${location.name}</p>
        <p class="text-[11px] text-slate-500 mt-0.5">Base departure port • Radar active</p>
      </div>
    `,
      { className: 'custom-leaflet-popup' }
    );

    // PFZ-03 Interactive Marker
    const pfz03Icon = L.divIcon({
      className: '',
      html: `
        <div class="relative w-9 h-9 flex items-center justify-center cursor-pointer">
          <div class="marker-pulse-ring bg-emerald-500/40"></div>
          <div class="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg border-2 border-white ring-2 ring-emerald-400/50">
            <svg class="w-4 h-4 fill-white" viewBox="0 0 24 24">
              <path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm-1-10.5a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Z"></path>
            </svg>
          </div>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });
    const pfz03Marker = L.marker(pfz03Coords, { icon: pfz03Icon }).addTo(map);
    pfz03Marker.bindPopup(
      `
      <div class="w-[230px] text-xs">
        <div class="flex items-center justify-between pb-1.5 mb-2 border-b border-slate-100">
          <span class="font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10px] tracking-wider uppercase">PFZ-03</span>
          <span class="text-[11px] font-semibold text-slate-500">18.4 km away</span>
        </div>
        <p class="font-bold text-slate-900 text-sm leading-snug">Optimal Fishing Front (27.4°C)</p>
        <p class="text-[11px] text-slate-600 mt-1.5"><span class="font-semibold text-slate-800">Target Species:</span> Sardine, Yellowfin Tuna, Mackerel</p>
        <p class="text-[11px] text-emerald-600 font-semibold mt-1.5 flex items-center gap-1">
          <span>✓</span> Chlorophyll & SST Front aligned
        </p>
      </div>
    `,
      { className: 'custom-leaflet-popup', closeButton: true }
    );
    pfz03Marker.openPopup();

    // Map refresh bounds
    setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Toggle Thermal Overlay
  const handleToggleThermal = () => {
    if (!mapInstanceRef.current || !thermalLayerGroupRef.current) return;
    if (isThermalActive) {
      mapInstanceRef.current.removeLayer(thermalLayerGroupRef.current);
      setIsThermalActive(false);
    } else {
      mapInstanceRef.current.addLayer(thermalLayerGroupRef.current);
      setIsThermalActive(true);
    }
  };

  const handleRecenter = () => {
    mapInstanceRef.current?.flyTo([16.92, 82.35], 11, { duration: 0.8 });
  };

  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();

  const handleToggleFullscreen = () => {
    if (!mapWrapperRef.current) return;
    if (!document.fullscreenElement) {
      mapWrapperRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
    setTimeout(() => mapInstanceRef.current?.invalidateSize(), 300);
  };

  return (
    <div className="space-y-6 pb-12" data-purpose="dashboard-overview">
      {/* 1. Top Metrics KPI Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5" data-purpose="kpi-metrics">
        {/* KPI 1: Total Trips */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-100 shadow-2xs flex flex-col justify-between h-36">
          <span className="text-xs font-semibold text-slate-500">Total Trips</span>
          <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {metrics.totalTrips}
          </div>
          <div className="flex items-center gap-1 text-emerald-600 text-xs font-bold">
            <span className="text-sm font-black leading-none">↑</span>
            <span>
              {metrics.tripsChange.split(' ')[0]}{' '}
              <span className="font-medium text-slate-400 ml-0.5">vs last week</span>
            </span>
          </div>
        </div>

        {/* KPI 2: Total Catch */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-100 shadow-2xs flex flex-col justify-between h-36">
          <span className="text-xs font-semibold text-slate-500">Total Catch</span>
          <div className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-baseline gap-1.5">
            {metrics.totalCatchKg} <span className="text-base font-bold text-slate-700">kg</span>
          </div>
          <div className="flex items-center gap-1 text-emerald-600 text-xs font-bold">
            <span className="text-sm font-black leading-none">↑</span>
            <span>
              {metrics.catchChange.split(' ')[0]}{' '}
              <span className="font-medium text-slate-400 ml-0.5">vs last week</span>
            </span>
          </div>
        </div>

        {/* KPI 3: Avg. Catch / Trip */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-100 shadow-2xs flex flex-col justify-between h-36">
          <span className="text-xs font-semibold text-slate-500">Avg. Catch / Trip</span>
          <div className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-baseline gap-1.5">
            {metrics.avgCatchKg} <span className="text-base font-bold text-slate-700">kg</span>
          </div>
          <div className="flex items-center gap-1 text-emerald-600 text-xs font-bold">
            <span className="text-sm font-black leading-none">↑</span>
            <span>
              {metrics.avgCatchChange.split(' ')[0]}{' '}
              <span className="font-medium text-slate-400 ml-0.5">vs last week</span>
            </span>
          </div>
        </div>

        {/* KPI 4: Best Fishing Zone */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-100 shadow-2xs flex flex-col justify-between h-36">
          <span className="text-xs font-semibold text-slate-500">Best Fishing Zone</span>
          <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {metrics.bestZone}
          </div>
          <div className="text-emerald-600 text-xs font-bold">
            {metrics.bestZoneActivity}
          </div>
        </div>
      </section>

      {/* 2. Sea & Map Section (12 cols grid: 4 cols left, 8 cols right) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5" data-purpose="marine-and-sea-status">
        {/* Left Column: Live Sea Conditions (4 cols) */}
        <div
          className="lg:col-span-4 bg-white rounded-2xl p-5 sm:p-6 border border-slate-100 shadow-2xs flex flex-col justify-between"
          data-purpose="sea-conditions"
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-slate-900">Live Sea Conditions</h3>
            {liveLoading && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                <Loader2 className="w-3 h-3 animate-spin" /> Fetching
              </span>
            )}
            {!liveLoading && liveResult && (
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                Live Data
              </span>
            )}
          </div>

          <div className="divide-y divide-slate-100 flex-1 flex flex-col justify-between">
            {/* Row 1: Sea Temp with Thermal Heat Status & Mini Gauge */}
            <div className="py-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-[#0d6efd]">
                    <Thermometer className="w-4 h-4 stroke-[2]" />
                  </span>
                  <div>
                    <span className="text-xs font-semibold text-slate-600 block leading-tight">
                      Sea Temp (SST)
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded mt-0.5">
                      {seaConditions.tempStatus}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-900">
                    {seaConditions.seaTemp} °C
                  </span>
                  <p className="text-[10px] text-slate-400 font-medium leading-none mt-0.5">
                    Heat Stress: {seaConditions.heatStress}
                  </p>
                </div>
              </div>

              {/* Mini Thermal Gauge */}
              <div className="mt-2 bg-slate-100 rounded-full h-1.5 w-full overflow-hidden flex">
                <div className="bg-blue-500 h-full w-[25%]" />
                <div className="bg-emerald-500 h-full w-[35%]" />
                <div className="bg-amber-400 h-full w-[25%]" />
                <div className="bg-rose-500 h-full w-[15%]" />
              </div>
              <div className="flex justify-between items-center text-[9px] text-slate-400 font-medium mt-1">
                <span>Cool (24°C)</span>
                <span className="text-emerald-600 font-bold">▲ 27.6°C (Optimal)</span>
                <span>Hot (31°C+)</span>
              </div>
            </div>

            {/* Row 2: Wind Speed */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center text-slate-700">
                  <Wind className="w-4 h-4 stroke-[1.8]" />
                </span>
                <span className="text-xs font-semibold text-slate-600">Wind Speed</span>
              </div>
              <span className="text-xs font-bold text-slate-900">
                {seaConditions.windSpeed} km/h
              </span>
            </div>

            {/* Row 3: Wave Height */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center text-slate-700">
                  <Waves className="w-4 h-4 stroke-[1.8]" />
                </span>
                <span className="text-xs font-semibold text-slate-600">Wave Height</span>
              </div>
              <span className="text-xs font-bold text-slate-900">
                {seaConditions.waveHeight} m
              </span>
            </div>

            {/* Row 4: Sea State */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center text-slate-700">
                  <Compass className="w-4 h-4 stroke-[1.8]" />
                </span>
                <span className="text-xs font-semibold text-slate-600">Sea State</span>
              </div>
              <span className="text-xs font-bold text-slate-900">
                {seaConditions.seaState}
              </span>
            </div>

            {/* Row 5: Tide */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center text-slate-700">
                  <ArrowUp className="w-4 h-4 stroke-[2] text-[#0d6efd]" />
                </span>
                <span className="text-xs font-semibold text-slate-600">Tide</span>
              </div>
              <span className="text-xs font-bold text-slate-900 flex items-center gap-0.5">
                <span className="text-[#0d6efd] font-extrabold">↑</span> {seaConditions.tide} m
              </span>
            </div>

            {/* Row 6: Visibility & Notice */}
            <div className="pt-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center text-slate-700">
                    <Eye className="w-4 h-4 stroke-[1.8]" />
                  </span>
                  <span className="text-xs font-semibold text-slate-600">Visibility</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-900">
                    {seaConditions.visibility} km
                  </span>
                  <p className="text-[10px] text-slate-500 font-medium leading-tight">
                    {seaConditions.visibilityRating}
                  </p>
                </div>
              </div>

              {/* Thermal Water Front Notice */}
              <div className="mt-2.5 p-2 bg-blue-50/70 border border-blue-200/50 rounded-xl text-[11px] flex items-start gap-2">
                <span className="text-sm leading-none mt-0.5">🌊</span>
                <div>
                  <span className="font-bold text-[#0d6efd] block leading-tight">
                    Thermal Front: {seaConditions.thermalFrontStatus}
                  </span>
                  <p className="text-slate-600 text-[10px] leading-snug mt-0.5">
                    {seaConditions.thermalFrontNote}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Marine Map (8 cols) */}
        <div
          className="lg:col-span-8 bg-white rounded-2xl p-5 sm:p-6 border border-slate-100 shadow-2xs flex flex-col justify-between"
          data-purpose="live-map-card"
        >
          {/* Map Card Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <h3 className="text-sm font-bold text-slate-900">Live Marine Map</h3>
              <span className="text-[11px] font-medium text-slate-400">• INCOIS Feed Active</span>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleToggleThermal}
                className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-lg border transition-all cursor-pointer shadow-2xs active:scale-95 ${
                  isThermalActive
                    ? 'text-rose-700 bg-rose-50 border-rose-200 hover:bg-rose-100'
                    : 'text-slate-600 bg-slate-50 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Flame className={`w-3.5 h-3.5 ${isThermalActive ? 'text-rose-500' : 'text-slate-400'}`} />
                <span>Heat Overlay {isThermalActive ? '[Active]' : '[Off]'}</span>
              </button>

              <button
                type="button"
                onClick={handleToggleFullscreen}
                className="flex items-center gap-1.5 text-xs font-semibold text-[#0d6efd] hover:text-blue-700 transition-colors bg-blue-50/80 px-3 py-1 rounded-lg border border-blue-200/50 cursor-pointer"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>View Fullscreen</span>
              </button>
            </div>
          </div>

          {/* Interactive Leaflet Map Wrapper */}
          <div
            ref={mapWrapperRef}
            className="relative w-full h-[380px] rounded-xl overflow-hidden shadow-inner border border-slate-200/80 bg-slate-100 select-none"
          >
            {/* Map Canvas */}
            <div ref={mapContainerRef} className="w-full h-full z-0" />

            {/* Top Right Floating Map Controls */}
            <div className="absolute right-3 top-3 flex flex-col gap-1.5 z-[400]">
              <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-md border border-slate-200/80 overflow-hidden flex flex-col">
                <button
                  type="button"
                  onClick={handleZoomIn}
                  className="w-8 h-8 flex items-center justify-center text-slate-700 hover:text-blue-600 hover:bg-slate-50 border-b border-slate-100 transition-colors font-bold text-base cursor-pointer"
                  title="Zoom In"
                  aria-label="Zoom in"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={handleZoomOut}
                  className="w-8 h-8 flex items-center justify-center text-slate-700 hover:text-blue-600 hover:bg-slate-50 transition-colors font-bold text-base cursor-pointer"
                  title="Zoom Out"
                  aria-label="Zoom out"
                >
                  −
                </button>
              </div>

              <button
                type="button"
                onClick={handleRecenter}
                className="w-8 h-8 rounded-xl bg-white/95 backdrop-blur-md shadow-md border border-slate-200/80 flex items-center justify-center text-slate-700 hover:text-blue-600 hover:bg-slate-50 transition-colors cursor-pointer"
                title="Recenter Map"
                aria-label="Recenter location"
              >
                <Crosshair className="w-4 h-4" />
              </button>
            </div>

            {/* Top Left Floating Telemetry Badge */}
            <div className="absolute left-3 top-3 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-lg shadow-2xs border border-slate-200/80 flex items-center gap-2 z-[400] text-[11px] font-semibold text-slate-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Bay of Bengal</span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-500 font-mono text-[10px]">16.98° N, 82.24° E</span>
            </div>

            {/* Floating Frosted Glass Legend */}
            <div className="absolute bottom-3 left-3 right-3 bg-white/95 backdrop-blur-md px-4 py-2.5 rounded-xl shadow-lg border border-slate-200/80 flex flex-col gap-2 z-[400]">
              {/* Zone Categories */}
              <div className="flex flex-wrap items-center justify-between text-xs font-semibold text-slate-700 border-b border-slate-100 pb-1.5 gap-2">
                <button
                  type="button"
                  onClick={() => onSelectZone('pfz-03')}
                  className="flex items-center gap-1.5 hover:opacity-80 transition-opacity cursor-pointer"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-200" />
                  <span>PFZ (High)</span>
                </button>

                <button
                  type="button"
                  onClick={() => onSelectZone('pfz-07')}
                  className="flex items-center gap-1.5 hover:opacity-80 transition-opacity cursor-pointer"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-amber-200" />
                  <span>PFZ (Medium)</span>
                </button>

                <button
                  type="button"
                  onClick={() => onSelectZone('pfz-11')}
                  className="flex items-center gap-1.5 hover:opacity-80 transition-opacity cursor-pointer"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-rose-200" />
                  <span>Hazard Zone</span>
                </button>

                <div className="flex items-center gap-1.5 text-purple-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-600 ring-2 ring-purple-200" />
                  <span>Restricted</span>
                </div>
              </div>

              {/* SST Thermal Heat Gradient Scale */}
              <div className="flex flex-wrap items-center justify-between gap-3 text-[11px]">
                <div className="flex items-center gap-1 text-slate-600 font-semibold shrink-0">
                  <span>🌡️ SST Heat Scale:</span>
                </div>

                <div className="flex-1 min-w-[200px] flex flex-col justify-center">
                  <div
                    className="h-2 rounded-full w-full shadow-inner"
                    style={{
                      background:
                        'linear-gradient(to right, #0284c7, #06b6d4, #10b981, #f59e0b, #ef4444, #991b1b)',
                    }}
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-bold mt-0.5 leading-none">
                    <span className="text-sky-600">24.5°C (Cool)</span>
                    <span className="text-emerald-600">27.4°C (Optimal)</span>
                    <span className="text-amber-600">29°C (Warm)</span>
                    <span className="text-rose-600">30.8°C+ (Extreme)</span>
                  </div>
                </div>

                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 shrink-0">
                  INCOIS SST Data Active
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Bottom Info Cards (2 cards) */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-5" data-purpose="alerts-and-fishing-window">
        {/* Left Card: Fishing Window */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-slate-800 flex items-center justify-center text-slate-800 shrink-0">
            <Clock className="w-6 h-6 stroke-[2]" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">Today's Fishing Window</h4>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">Best time to go fishing</p>
            <p className="text-base font-extrabold text-slate-900 mt-1 tracking-tight">
              06:00 AM - 11:00 AM
            </p>
          </div>
        </div>

        {/* Right Card: Recent Alerts */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-2xs flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full border-2 border-slate-800 flex items-center justify-center text-slate-800 shrink-0">
              <AlertTriangle className="w-6 h-6 stroke-[2]" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">Recent Alerts</h4>
              <p className="text-xs font-bold text-slate-700 mt-0.5">No active alerts</p>
              <p className="text-[11px] text-slate-500 font-medium">Sea conditions are safe.</p>
            </div>
          </div>

          {/* View All Action */}
          <button
            type="button"
            onClick={onOpenAlertsModal}
            className="text-xs font-bold text-[#0d6efd] hover:text-blue-700 transition-colors shrink-0 cursor-pointer"
          >
            View All
          </button>
        </div>
      </section>
    </div>
  );
};
