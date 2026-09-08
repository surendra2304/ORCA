import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import {
  Maximize,
  Compass,
  Crosshair,
  Flame,
  Layers,
  Info,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { PFZZone, SuitabilityLevel } from '../types';
import { pfzZones, harborCoords } from '../data/mockData';

interface PFZAreasScreenProps {
  selectedZoneId: string;
  onSelectZone: (zoneId: string) => void;
  onOpenZoneModal: (zone: PFZZone) => void;
}

export const PFZAreasScreen: React.FC<PFZAreasScreenProps> = ({
  selectedZoneId,
  onSelectZone,
  onOpenZoneModal,
}) => {
  const [filter, setFilter] = useState<'all' | SuitabilityLevel>('all');
  const [isSSTActive, setIsSSTActive] = useState(true);
  const [radarCoords, setRadarCoords] = useState('17.11° N, 82.71° E');

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const sstLayersRef = useRef<L.Layer[]>([]);
  const markersRef = useRef<Record<string, L.Marker>>({});
  const trajectoryLineRef = useRef<L.Polyline | null>(null);

  const activeZone = pfzZones[selectedZoneId] || pfzZones['pfz-03'];

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
      center: [16.92, 82.35],
      zoom: 10,
      minZoom: 8,
      maxZoom: 18,
    });

    mapInstanceRef.current = map;

    // OpenStreetMap tile layer (reliable CartoDB voyager with fallback)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    // ==========================================
    // SST HEAT CONTOURS & OVERLAYS
    // ==========================================
    const sstLayers: L.Layer[] = [];

    // 1. Background Shelf Gradient Polygon
    const bgPolygon = L.polygon(
      [
        [17.3, 82.15],
        [17.3, 82.75],
        [16.45, 82.75],
        [16.45, 82.15],
      ],
      {
        fillColor: '#0284c7',
        fillOpacity: 0.08,
        stroke: false,
      }
    ).addTo(map);
    sstLayers.push(bgPolygon);

    // 2. Cool Upwelling Current (PFZ-15 / North)
    const coolOuter = L.circle([17.08, 82.42], {
      color: '#06b6d4',
      fillColor: '#06b6d4',
      fillOpacity: 0.25,
      weight: 1.5,
      dashArray: '4, 6',
      radius: 9500,
    }).addTo(map);
    sstLayers.push(coolOuter);

    const coolCore = L.circle([17.08, 82.42], {
      color: '#0284c7',
      fillColor: '#38bdf8',
      fillOpacity: 0.35,
      weight: 2,
      radius: 5200,
    }).addTo(map);
    sstLayers.push(coolCore);

    // Cool Upwelling label
    const coolLabel = L.marker([17.15, 82.46], {
      icon: L.divIcon({
        className: 'sst-contour-label bg-cyan-900/80 text-cyan-200 border-cyan-400/40',
        html: '❄️ Cool Upwelling Current · 25.4°C',
        iconAnchor: [60, 10],
      }),
    }).addTo(map);
    sstLayers.push(coolLabel);

    // 3. Optimal Fishing Thermal Front Band (PFZ-03)
    const optimalBand = L.polygon(
      [
        [17.18, 82.36],
        [17.14, 82.52],
        [16.92, 82.45],
        [16.9, 82.26],
        [17.02, 82.24],
      ],
      {
        color: '#10b981',
        fillColor: '#10b981',
        fillOpacity: 0.22,
        weight: 2,
        dashArray: '6, 6',
      }
    ).addTo(map);
    sstLayers.push(optimalBand);

    const optimalCore = L.circle([16.95, 82.35], {
      color: '#059669',
      fillColor: '#34d399',
      fillOpacity: 0.32,
      weight: 1.5,
      radius: 7800,
    }).addTo(map);
    sstLayers.push(optimalCore);

    const optimalLabel = L.marker([17.0, 82.29], {
      icon: L.divIcon({
        className: 'sst-contour-label bg-emerald-950/80 text-emerald-200 border-emerald-400/40',
        html: '🟢 Optimal SST Front · 27.4°C',
        iconAnchor: [50, 10],
      }),
    }).addTo(map);
    sstLayers.push(optimalLabel);

    // 4. Moderate Heat Pool (PFZ-07)
    const warmHalo = L.circle([16.82, 82.4], {
      color: '#f59e0b',
      fillColor: '#fbbf24',
      fillOpacity: 0.26,
      weight: 2,
      radius: 7000,
    }).addTo(map);
    sstLayers.push(warmHalo);

    const warmCore = L.circle([16.82, 82.4], {
      color: '#d97706',
      fillColor: '#f59e0b',
      fillOpacity: 0.35,
      weight: 1.5,
      radius: 3800,
    }).addTo(map);
    sstLayers.push(warmCore);

    const warmLabel = L.marker([16.85, 82.41], {
      icon: L.divIcon({
        className: 'sst-contour-label bg-amber-950/80 text-amber-200 border-amber-400/40',
        html: '🟡 Moderate Heat · 28.1°C',
        iconAnchor: [50, 10],
      }),
    }).addTo(map);
    sstLayers.push(warmLabel);

    // 5. Severe Heat Stress Warning Pool (PFZ-11)
    const hotHalo = L.circle([16.7, 82.48], {
      color: '#ef4444',
      fillColor: '#f87171',
      fillOpacity: 0.28,
      weight: 2.5,
      dashArray: '5, 5',
      radius: 8200,
    }).addTo(map);
    sstLayers.push(hotHalo);

    const hotCore = L.circle([16.7, 82.48], {
      color: '#b91c1c',
      fillColor: '#dc2626',
      fillOpacity: 0.42,
      weight: 2,
      radius: 4600,
    }).addTo(map);
    sstLayers.push(hotCore);

    const hotLabel = L.marker([16.63, 82.42], {
      icon: L.divIcon({
        className: 'sst-contour-label bg-red-950/85 text-red-200 border-red-500/60',
        html: '🔥 Severe Heat Stress · 30.8°C',
        iconAnchor: [65, 10],
      }),
    }).addTo(map);
    sstLayers.push(hotLabel);

    sstLayersRef.current = sstLayers;

    // ==========================================
    // HARBOR MARKER & TRAJECTORY LINE
    // ==========================================
    const harborIcon = L.divIcon({
      className: '',
      html: `
        <div class="relative flex items-center justify-center">
          <div class="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg border-2 border-white ring-2 ring-blue-400/50">
            <svg class="w-4 h-4 fill-none stroke-current" stroke-width="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9"></circle>
              <path d="M3.6 9h16.8M3.6 15h16.8M12 3a15.3 15.3 0 014 9 15.3 15.3 0 01-4 9 15.3 15.3 0 01-4-9 15.3 15.3 0 014-9z"></path>
            </svg>
          </div>
          <span class="absolute -bottom-5 bg-white/95 px-1.5 py-0.5 rounded text-[9.5px] font-bold text-slate-800 shadow whitespace-nowrap border border-slate-200">
            Kakinada Port
          </span>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
    L.marker(harborCoords, { icon: harborIcon }).addTo(map);

    // Initial Trajectory Line
    trajectoryLineRef.current = L.polyline([harborCoords, [pfzZones['pfz-03'].lat, pfzZones['pfz-03'].lng]], {
      color: '#0284c7',
      weight: 2.5,
      opacity: 0.85,
      dashArray: '6, 8',
      lineCap: 'round',
    }).addTo(map);

    // Add Zone Markers
    const markers: Record<string, L.Marker> = {};
    Object.values(pfzZones).forEach((zone) => {
      const isHigh = zone.suitability === 'high';
      const isMed = zone.suitability === 'medium';
      const isLow = zone.suitability === 'low';

      const iconBg = isHigh ? 'bg-emerald-500' : isMed ? 'bg-amber-500' : 'bg-red-500';
      const pulseHtml = isHigh
        ? '<span class="pulse-ring absolute -inset-1"></span>'
        : isLow
        ? '<span class="pulse-ring-danger absolute -inset-1"></span>'
        : '';

      const markerIcon = L.divIcon({
        className: '',
        html: `
          <div class="relative flex items-center justify-center cursor-pointer group">
            ${pulseHtml}
            <div class="relative w-8 h-8 rounded-full ${iconBg} text-white flex items-center justify-center shadow-lg border-2 border-white font-bold text-[11px] transition-transform group-hover:scale-110">
              ${zone.number}
            </div>
            <div class="absolute -bottom-5 bg-white/95 px-1.5 py-0.5 rounded shadow text-[9.5px] font-bold text-slate-700 whitespace-nowrap border border-slate-200">
              ${zone.name}
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([zone.lat, zone.lng], { icon: markerIcon }).addTo(map);

      marker.bindPopup(`
        <div class="p-1 min-w-[185px]">
          <div class="flex items-center justify-between gap-2 border-b border-slate-100 pb-1 mb-1">
            <span class="font-bold text-xs text-slate-900">${zone.name}</span>
            <span class="text-[10px] font-semibold px-1.5 py-0.5 rounded ${zone.heatBadgeClass}">
              ${zone.suitabilityLabel}
            </span>
          </div>
          <div class="text-[11px] text-slate-600 space-y-0.5">
            <div class="flex justify-between"><span>SST Temp:</span><span class="font-bold text-slate-900">${zone.seaTemp}</span></div>
            <div class="flex justify-between"><span>Depth:</span><span class="font-semibold text-blue-600">${zone.depth}</span></div>
            <div class="flex justify-between"><span>Expected Catch:</span><span class="font-semibold text-emerald-600">${zone.expectedCatch}</span></div>
          </div>
        </div>
      `);

      marker.on('click', () => {
        onSelectZone(zone.id);
      });

      markers[zone.id] = marker;
    });

    markersRef.current = markers;

    // Update telemetry coordinates on mouse move
    map.on('mousemove', (e) => {
      setRadarCoords(`${e.latlng.lat.toFixed(2)}° N, ${e.latlng.lng.toFixed(2)}° E`);
    });

    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update map focus and trajectory whenever active zone changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const targetZone = pfzZones[selectedZoneId];
    if (!targetZone) return;

    mapInstanceRef.current.flyTo([targetZone.lat, targetZone.lng], 11, {
      duration: 0.8,
    });

    if (trajectoryLineRef.current) {
      trajectoryLineRef.current.setLatLngs([harborCoords, [targetZone.lat, targetZone.lng]]);
    }

    const marker = markersRef.current[selectedZoneId];
    if (marker) {
      marker.openPopup();
    }
  }, [selectedZoneId]);

  // Toggle SST Heat layer
  const toggleSSTHeat = () => {
    if (!mapInstanceRef.current) return;
    if (isSSTActive) {
      sstLayersRef.current.forEach((layer) => mapInstanceRef.current?.removeLayer(layer));
      setIsSSTActive(false);
    } else {
      sstLayersRef.current.forEach((layer) => mapInstanceRef.current?.addLayer(layer));
      setIsSSTActive(true);
    }
  };

  const handleFitAll = () => {
    if (!mapInstanceRef.current) return;
    const allCoords = [harborCoords, ...Object.values(pfzZones).map((z) => [z.lat, z.lng] as [number, number])];
    const bounds = L.latLngBounds(allCoords);
    mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40] });
  };

  const filteredZones = Object.values(pfzZones).filter((zone) => {
    if (filter === 'all') return true;
    return zone.suitability === filter;
  });

  return (
    <div className="space-y-5 pb-12">
      {/* Tabs Navigation Bar */}
      <div className="border-b border-slate-200/80 mb-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <nav className="flex gap-6 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`pb-3 border-b-2 transition-colors cursor-pointer ${
                filter === 'all'
                  ? 'border-blue-600 text-blue-600 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              All Zones
            </button>
            <button
              type="button"
              onClick={() => setFilter('high')}
              className={`pb-3 border-b-2 transition-colors cursor-pointer ${
                filter === 'high'
                  ? 'border-blue-600 text-blue-600 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              High Suitability
            </button>
            <button
              type="button"
              onClick={() => setFilter('medium')}
              className={`pb-3 border-b-2 transition-colors cursor-pointer ${
                filter === 'medium'
                  ? 'border-blue-600 text-blue-600 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Medium Suitability
            </button>
            <button
              type="button"
              onClick={() => setFilter('low')}
              className={`pb-3 border-b-2 transition-colors cursor-pointer ${
                filter === 'low'
                  ? 'border-blue-600 text-blue-600 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Low Suitability
            </button>
          </nav>

          <div className="flex items-center gap-2 pb-2.5">
            <button
              type="button"
              onClick={toggleSSTHeat}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-semibold transition cursor-pointer shadow-2xs ${
                isSSTActive
                  ? 'bg-gradient-to-r from-blue-50 via-emerald-50 to-red-50 text-slate-800 border-slate-300'
                  : 'bg-slate-50 text-slate-600 border-slate-200'
              }`}
            >
              <span className="text-sm">🌡️</span>
              <span>Thermal Heat Map (SST)</span>
              <span
                className={`px-1.5 py-0.5 text-[10px] font-bold rounded leading-tight text-white ${
                  isSSTActive ? 'bg-emerald-500' : 'bg-slate-400'
                }`}
              >
                {isSSTActive ? 'ACTIVE' : 'OFF'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Grid: Left List (col-span-4) & Right Map/Details (col-span-8) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Zone Cards List */}
        <section className="lg:col-span-4 flex flex-col gap-3" data-purpose="zone-list">
          {filteredZones.map((zone) => {
            const isSelected = zone.id === selectedZoneId;
            const isHigh = zone.suitability === 'high';
            const isMed = zone.suitability === 'medium';

            return (
              <div
                key={zone.id}
                onClick={() => onSelectZone(zone.id)}
                className={`rounded-xl p-3.5 shadow-2xs flex items-center justify-between transition cursor-pointer ${
                  isSelected
                    ? isHigh
                      ? 'bg-emerald-50/30 border-2 border-emerald-500'
                      : isMed
                      ? 'bg-amber-50/30 border-2 border-amber-500'
                      : 'bg-red-50/30 border-2 border-red-500'
                    : 'bg-white border border-slate-200/80 hover:border-blue-300'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-bold ${
                        isHigh
                          ? 'text-emerald-600'
                          : isMed
                          ? 'text-slate-800'
                          : 'text-red-500'
                      }`}
                    >
                      {zone.name}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${zone.heatBadgeClass}`}
                    >
                      {zone.seaTemp} · {zone.heatCondition.split('(')[0]}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {zone.distance} away • {zone.heatAdvice.split('(')[0]}
                  </div>

                  <div
                    className={`text-xs font-semibold mt-1 ${
                      isHigh
                        ? 'text-emerald-600'
                        : isMed
                        ? 'text-amber-500'
                        : 'text-red-500'
                    }`}
                  >
                    {zone.suitabilityLabel}
                  </div>
                </div>

                <div
                  className={`w-7 h-7 rounded-full border flex items-center justify-center ${
                    isHigh
                      ? 'border-emerald-500/30 text-emerald-600 bg-emerald-50/50'
                      : isMed
                      ? 'border-amber-400/30 text-amber-500 bg-amber-50/50'
                      : 'border-red-400/30 text-red-500 bg-red-50/50'
                  }`}
                >
                  {isHigh ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : isMed ? (
                    <Compass className="w-4 h-4" />
                  ) : (
                    <AlertTriangle className="w-4 h-4" />
                  )}
                </div>
              </div>
            );
          })}

          <button
            type="button"
            onClick={handleFitAll}
            className="w-full mt-2 bg-[#0d6efd] hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-xl text-xs transition duration-150 shadow-sm shadow-blue-500/30 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
          >
            <Maximize className="w-4 h-4" />
            <span>View on Map (Fit All)</span>
          </button>
        </section>

        {/* Right Column: Interactive Map & Selected Zone Details */}
        <section
          className="lg:col-span-8 flex flex-col gap-4"
          data-purpose="interactive-map-and-details"
        >
          {/* Real Leaflet Map Canvas */}
          <div className="relative w-full h-[385px] rounded-2xl overflow-hidden border border-slate-200 shadow-2xs select-none bg-[#091e3a]">
            <div ref={mapContainerRef} className="w-full h-full z-0" />

            {/* Thermal Layer Quick Toggle HUD (Top Left) */}
            <div className="absolute top-3 left-3 z-[400]">
              <button
                type="button"
                onClick={toggleSSTHeat}
                className="flex items-center gap-2 bg-slate-900/85 hover:bg-slate-900 backdrop-blur-md text-white px-3 py-1.5 rounded-xl border border-white/20 shadow-lg text-xs font-semibold transition cursor-pointer"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="flex items-center gap-1">🌡️ SST Heat Layer</span>
                <span
                  className={`text-[10px] uppercase font-bold px-1.5 py-0.2 rounded text-white ${
                    isSSTActive ? 'bg-emerald-500/80' : 'bg-slate-600'
                  }`}
                >
                  {isSSTActive ? 'Visible' : 'Hidden'}
                </span>
              </button>
            </div>

            {/* Custom Map Floating Controls (Top Right) */}
            <div className="absolute top-3 right-3 flex flex-col gap-1.5 z-[400]">
              <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-md border border-slate-200/80 overflow-hidden flex flex-col">
                <button
                  type="button"
                  onClick={() => mapInstanceRef.current?.zoomIn()}
                  className="w-8 h-8 flex items-center justify-center text-slate-700 hover:bg-slate-100 transition-colors border-b border-slate-100 font-bold"
                  aria-label="Zoom in"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() => mapInstanceRef.current?.zoomOut()}
                  className="w-8 h-8 flex items-center justify-center text-slate-700 hover:bg-slate-100 transition-colors font-bold"
                  aria-label="Zoom out"
                >
                  −
                </button>
              </div>

              <button
                type="button"
                onClick={() =>
                  mapInstanceRef.current?.flyTo(harborCoords, 11, { duration: 0.8 })
                }
                className="w-8 h-8 bg-white/95 backdrop-blur-md rounded-xl shadow-md border border-slate-200/80 flex items-center justify-center text-slate-700 hover:text-blue-600 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Center on Kakinada Harbor"
                aria-label="Center on harbor"
              >
                <Crosshair className="w-4 h-4" />
              </button>
            </div>

            {/* Live Telemetry Badge (Bottom Left) */}
            <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-200/90 shadow-md flex items-center gap-2.5 text-[11px] font-medium text-slate-700 z-[400]">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-semibold text-slate-800">Live Radar</span>
              </div>
              <span className="text-slate-300">|</span>
              <span className="text-slate-600 font-mono text-[10.5px]">{radarCoords}</span>
              <span className="text-slate-300">|</span>
              <span className="text-blue-600 font-semibold">Bay of Bengal</span>
            </div>

            {/* Visual Sea Heat Map Legend (Bottom Right) */}
            <div className="absolute bottom-3 right-3 bg-slate-900/90 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-white/20 shadow-xl text-[11px] text-white font-medium flex flex-col gap-1.5 z-[400]">
              <div className="flex items-center justify-between gap-4">
                <span className="font-bold text-white flex items-center gap-1.5 text-xs">
                  <span className="text-sm">🌡️</span> Sea Surface Temp (SST)
                </span>
                <span className="text-[9px] text-sky-300 uppercase font-mono tracking-wider font-semibold">
                  Live INCOIS Sat
                </span>
              </div>
              <div className="h-2.5 w-60 rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 via-emerald-400 via-amber-400 to-rose-600 border border-white/20 shadow-inner" />
              <div className="flex items-center justify-between text-[9px] font-bold text-slate-200 px-0.5">
                <span className="text-cyan-300">Cool: 24°C</span>
                <span className="text-emerald-300">Optimal: 27°C</span>
                <span className="text-amber-300">Warm: 29°C</span>
                <span className="text-rose-300">Extreme: 31°C+</span>
              </div>
            </div>
          </div>

          {/* Selected Zone Detailed Stats Card */}
          <div
            className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs"
            data-purpose="zone-detail-panel"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  {activeZone.name}
                </h2>
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                    activeZone.suitability === 'high'
                      ? 'bg-emerald-50 text-emerald-700'
                      : activeZone.suitability === 'medium'
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-red-50 text-red-700'
                  }`}
                >
                  {activeZone.suitabilityLabel}
                </span>
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-md border flex items-center gap-1 ${activeZone.heatBadgeClass}`}
                >
                  <span>🌡️</span>
                  <span>{activeZone.heatCondition}</span>
                </span>
              </div>

              <div className="text-right text-[11px] text-slate-500">
                <span className="font-semibold text-slate-700">Thermocline Depth: </span>
                <span className="font-mono font-bold text-blue-600">{activeZone.depth}</span>
              </div>
            </div>

            {/* 5 Stats Columns */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pb-4 border-b border-slate-100">
              <div className="pr-2 border-r border-slate-100">
                <div className="text-[11px] font-medium text-slate-400">Distance</div>
                <div className="text-sm font-bold text-slate-900 mt-1">{activeZone.distance}</div>
              </div>
              <div className="px-2 border-r border-slate-100">
                <div className="text-[11px] font-medium text-slate-400">Sea Temp (SST)</div>
                <div className="text-sm font-bold text-slate-900 mt-1 flex items-center gap-1">
                  <span>{activeZone.seaTemp}</span>
                  <span className={`w-2 h-2 rounded-full ${activeZone.heatDotColor}`} />
                </div>
              </div>
              <div className="px-2 border-r border-slate-100">
                <div className="text-[11px] font-medium text-slate-400">Wave Height</div>
                <div className="text-sm font-bold text-slate-900 mt-1">
                  {activeZone.waveHeight}
                </div>
              </div>
              <div className="px-2 border-r border-slate-100">
                <div className="text-[11px] font-medium text-slate-400">Wind Speed</div>
                <div className="text-sm font-bold text-slate-900 mt-1">{activeZone.windSpeed}</div>
              </div>
              <div className="pl-2">
                <div className="text-[11px] font-medium text-slate-400">Expected Catch</div>
                <div className="text-sm font-bold text-slate-900 mt-1">
                  {activeZone.expectedCatch}
                </div>
              </div>
            </div>

            {/* Additional Details & View Zone Details Action */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-6 sm:gap-8 text-xs">
                <div>
                  <span className="text-[11px] text-slate-400 block font-medium">
                    Best Fishing Window
                  </span>
                  <span className="font-bold text-slate-900 mt-0.5 block">
                    {activeZone.bestTime}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block font-medium">
                    Target Species (Optimal at this SST)
                  </span>
                  <span className="font-bold text-slate-900 mt-0.5 block">
                    {activeZone.species}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block font-medium">
                    Heat Impact on Fish Depth
                  </span>
                  <span className="font-semibold text-slate-700 mt-0.5 block">
                    {activeZone.heatAdvice}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onOpenZoneModal(activeZone)}
                className="bg-[#0d6efd] hover:bg-blue-700 text-white text-xs font-semibold py-2.5 px-5 rounded-xl transition duration-150 shadow-sm shadow-blue-500/20 cursor-pointer active:scale-95"
              >
                View Zone Details
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
