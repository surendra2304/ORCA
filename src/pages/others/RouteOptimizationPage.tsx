import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import L from 'leaflet';
import { 
  Navigation, 
  Compass, 
  Clock, 
  Gauge, 
  ShieldCheck, 
  ArrowRight, 
  ArrowLeftRight, 
  Anchor, 
  Fuel, 
  AlertTriangle, 
  Fish, 
  Sparkles, 
  Layers, 
  Check, 
  Waves, 
  Thermometer, 
  Wind, 
  Eye, 
  Zap, 
  RefreshCw,
  MapPin
} from 'lucide-react';

interface PortOption {
  id: string;
  name: string;
  state: string;
  coords: [number, number];
}

const INDIAN_PORTS: PortOption[] = [
  { id: 'vizag', name: 'Visakhapatnam Port', state: 'Andhra Pradesh', coords: [17.6868, 83.2185] },
  { id: 'kakinada', name: 'Kakinada Deepwater Port', state: 'Andhra Pradesh', coords: [16.9891, 82.2475] },
  { id: 'chennai', name: 'Chennai Marine Port', state: 'Tamil Nadu', coords: [13.0827, 80.2707] },
  { id: 'paradeep', name: 'Paradeep Port', state: 'Odisha', coords: [20.2644, 86.6083] },
  { id: 'kochi', name: 'Kochi Outer Port', state: 'Kerala', coords: [9.9312, 76.2673] },
  { id: 'mangalore', name: 'New Mangalore Port', state: 'Karnataka', coords: [12.9141, 74.8560] },
  { id: 'mumbai', name: 'Mumbai High Marine Base', state: 'Maharashtra', coords: [18.9400, 72.8350] },
  { id: 'portblair', name: 'Port Blair Harbor', state: 'Andaman & Nicobar', coords: [11.6234, 92.7265] },
];

export const RouteOptimizationPage: React.FC = () => {
  const { selectedRegion } = useApp();

  // Route Parameters
  const [departurePort, setDeparturePort] = useState<string>('vizag');
  const [destinationPort, setDestinationPort] = useState<string>('chennai');
  
  // Strategy Toggles
  const [minimizeFuel, setMinimizeFuel] = useState<boolean>(true);
  const [minimizeTime, setMinimizeTime] = useState<boolean>(false);
  const [avoidWeather, setAvoidWeather] = useState<boolean>(true);
  const [maximizePFZ, setMaximizePFZ] = useState<boolean>(true);
  const [vesselSpeed, setVesselSpeed] = useState<number>(13); // knots

  // Environmental Overlays
  const [overlaySST, setOverlaySST] = useState<boolean>(true);
  const [overlayChlorophyll, setOverlayChlorophyll] = useState<boolean>(true);
  const [overlaySeaState, setOverlaySeaState] = useState<boolean>(true);
  const [overlayCurrents, setOverlayCurrents] = useState<boolean>(true);

  // Calculation State
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [calculatedMetrics, setCalculatedMetrics] = useState({
    distanceNM: 218.4,
    distanceKm: 404.5,
    etaHours: 16.8,
    fuelSavedPct: 15.2,
    timeSavedPct: 8.5,
    riskScore: 94,
    co2SavedTons: 1.4
  });

  // Map Refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const routeLayersRef = useRef<L.LayerGroup | null>(null);

  // Swap ports
  const handleSwapPorts = () => {
    const temp = departurePort;
    setDeparturePort(destinationPort);
    setDestinationPort(temp);
  };

  // Recalculate route
  const handleCalculateRoute = () => {
    setIsCalculating(true);
    setTimeout(() => {
      setIsCalculating(false);
      // Dynamically simulate optimized adjustments based on toggles & speed
      const baseDist = departurePort === destinationPort ? 85 : 218.4;
      const speedFactor = vesselSpeed / 13;
      const fuelPct = minimizeFuel ? (14 + Math.random() * 3).toFixed(1) : (6 + Math.random() * 2).toFixed(1);
      const timePct = minimizeTime ? (12 + Math.random() * 4).toFixed(1) : (7 + Math.random() * 2).toFixed(1);
      
      setCalculatedMetrics({
        distanceNM: baseDist,
        distanceKm: Math.round(baseDist * 1.852),
        etaHours: parseFloat((baseDist / vesselSpeed).toFixed(1)),
        fuelSavedPct: parseFloat(fuelPct),
        timeSavedPct: parseFloat(timePct),
        riskScore: avoidWeather ? 95 : 72,
        co2SavedTons: parseFloat((baseDist * 0.0065).toFixed(1))
      });
    }, 600);
  };

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [15.8, 82.5],
        zoom: 6,
        zoomControl: false,
        attributionControl: false
      });

      // CartoDB Voyager Tile Layer
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 18,
        subdomains: 'abcd'
      }).addTo(map);

      const routeLayerGroup = L.layerGroup().addTo(map);
      routeLayersRef.current = routeLayerGroup;
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Render Routes and Environmental Overlays
  useEffect(() => {
    if (!mapInstanceRef.current || !routeLayersRef.current) return;

    const layerGroup = routeLayersRef.current;
    layerGroup.clearLayers();

    const dep = INDIAN_PORTS.find(p => p.id === departurePort) || INDIAN_PORTS[0];
    const dest = INDIAN_PORTS.find(p => p.id === destinationPort) || INDIAN_PORTS[2];

    // 1. Extreme Weather / High Swell Hazard Zone (Red Circle Overlay)
    const hazardCenter: [number, number] = [
      (dep.coords[0] + dest.coords[0]) / 2 - 0.2,
      (dep.coords[1] + dest.coords[1]) / 2 - 0.6
    ];

    if (avoidWeather) {
      const hazardCircle = L.circle(hazardCenter, {
        radius: 48000,
        color: '#ef4444',
        fillColor: '#fee2e2',
        fillOpacity: 0.45,
        weight: 2,
        dashArray: '4, 4'
      });

      hazardCircle.bindTooltip(
        `<div class="p-1 text-xs">
          <div class="font-bold text-red-700 flex items-center gap-1">
            <span>🚨 Extreme Swell Warning</span>
          </div>
          <div class="text-[10px] text-red-900 mt-0.5">Swell 3.8m • High Risk Zone (Avoided)</div>
        </div>`,
        { permanent: false, direction: 'top' }
      );
      layerGroup.addLayer(hazardCircle);
    }

    // 2. High Current Zone (Orange Overlay)
    if (overlayCurrents) {
      const currentCenter: [number, number] = [
        (dep.coords[0] + dest.coords[0]) / 2 + 0.9,
        (dep.coords[1] + dest.coords[1]) / 2 + 0.8
      ];
      const currentCircle = L.circle(currentCenter, {
        radius: 38000,
        color: '#f97316',
        fillColor: '#ffedd5',
        fillOpacity: 0.35,
        weight: 1.5,
        dashArray: '3, 3'
      });
      currentCircle.bindTooltip(
        `<div class="p-1 text-xs font-bold text-amber-800">
          🌊 Strong Current Vector: 2.4 kts (Favorable Drift)
        </div>`,
        { permanent: false, direction: 'bottom' }
      );
      layerGroup.addLayer(currentCircle);
    }

    // 3. PFZ (Potential Fishing Zone) overlay
    if (maximizePFZ) {
      const pfzCenter: [number, number] = [
        (dep.coords[0] + dest.coords[0]) / 2 + 0.3,
        (dep.coords[1] + dest.coords[1]) / 2 + 0.5
      ];
      const pfzPolygon = L.polygon([
        [pfzCenter[0] + 0.3, pfzCenter[1] - 0.2],
        [pfzCenter[0] + 0.1, pfzCenter[1] + 0.4],
        [pfzCenter[0] - 0.3, pfzCenter[1] + 0.2],
        [pfzCenter[0] - 0.2, pfzCenter[1] - 0.3]
      ], {
        color: '#10b981',
        fillColor: '#d1fae5',
        fillOpacity: 0.4,
        weight: 2
      });
      pfzPolygon.bindTooltip(
        `<div class="p-1 text-xs font-bold text-emerald-800">
          🐟 High PFZ Corridor (Chlorophyll: 1.8 mg/m³)
        </div>`,
        { permanent: false, direction: 'center' }
      );
      layerGroup.addLayer(pfzPolygon);
    }

    // 4. Safe / Optimal Route Polyline (Green Solid)
    // Waypoints that smartly divert around hazard zone
    const waypoints: [number, number][] = [
      dep.coords,
      [dep.coords[0] * 0.75 + dest.coords[0] * 0.25, dep.coords[1] * 0.75 + dest.coords[1] * 0.25 + 0.5],
      [(dep.coords[0] + dest.coords[0]) / 2 + 0.3, (dep.coords[1] + dest.coords[1]) / 2 + 0.5], // PFZ bypass
      [dep.coords[0] * 0.25 + dest.coords[0] * 0.75, dep.coords[1] * 0.25 + dest.coords[1] * 0.75 + 0.3],
      dest.coords
    ];

    const safePolyline = L.polyline(waypoints, {
      color: '#059669',
      weight: 4.5,
      opacity: 0.9,
      lineCap: 'round',
      lineJoin: 'round'
    });
    safePolyline.bindTooltip(
      `<div class="p-1 font-bold text-emerald-800 text-xs">
        ✅ Optimal Safe Route (${calculatedMetrics.fuelSavedPct}% Fuel Saved)
      </div>`,
      { permanent: false, direction: 'top' }
    );
    layerGroup.addLayer(safePolyline);

    // 5. Direct Danger Line (Red Dashed showing what was avoided)
    const directDangerPolyline = L.polyline([dep.coords, hazardCenter, dest.coords], {
      color: '#ef4444',
      weight: 2,
      opacity: 0.5,
      dashArray: '6, 6'
    });
    directDangerPolyline.bindTooltip(
      `<div class="p-1 font-semibold text-red-700 text-xs">
        ⚠️ Direct Path (High Swell & Hazard Risk)
      </div>`,
      { permanent: false, direction: 'center' }
    );
    layerGroup.addLayer(directDangerPolyline);

    // 6. Departure Port Marker
    const depMarker = L.circleMarker(dep.coords, {
      radius: 8,
      color: '#2a8a89',
      fillColor: '#ffffff',
      fillOpacity: 1,
      weight: 3
    }).addTo(layerGroup);
    depMarker.bindPopup(`<b>Departure:</b> ${dep.name}<br/><span class="text-xs text-gray-500">${dep.state}</span>`);

    // 7. Destination Port Marker
    const destMarker = L.circleMarker(dest.coords, {
      radius: 8,
      color: '#059669',
      fillColor: '#10b981',
      fillOpacity: 1,
      weight: 3
    }).addTo(layerGroup);
    destMarker.bindPopup(`<b>Destination:</b> ${dest.name}<br/><span class="text-xs text-gray-500">${dest.state}</span>`);

    // Fit map bounds to show full route
    const bounds = L.latLngBounds(waypoints);
    mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });

  }, [departurePort, destinationPort, avoidWeather, maximizePFZ, overlayCurrents, calculatedMetrics.fuelSavedPct]);

  return (
    <div className="w-full min-h-screen bg-[#f0f4f5] text-ocean-text p-4 sm:p-6 lg:p-8 space-y-6 select-none font-sans">
      
      {/* Top Banner: Page Title & Route Metrics */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-ocean-sub/80 shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#2a8a89]/10 text-[#2a8a89] flex items-center justify-center border border-[#2a8a89]/20 shadow-2xs">
              <Navigation className="w-5 h-5 text-[#2a8a89]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-ocean-text tracking-tight">
                Route Optimization & Voyage Planning
              </h1>
              <p className="text-xs sm:text-sm text-ocean-text/70 mt-0.5">
                Autonomous multi-parameter oceanic routing balancing fuel economy, tidal currents, wave dynamics, and hazard zones.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Route Key Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 self-stretch lg:self-auto">
          <div className="bg-[#f0f4f5] p-2.5 rounded-xl border border-ocean-sub/60 text-center">
            <div className="flex items-center justify-center space-x-1 text-[11px] text-ocean-text/60 font-medium">
              <Compass className="w-3.5 h-3.5 text-[#2a8a89]" />
              <span>Total Distance</span>
            </div>
            <div className="text-xs sm:text-sm font-extrabold text-ocean-text mt-0.5">
              {calculatedMetrics.distanceNM} NM
            </div>
            <div className="text-[10px] text-ocean-text/50">({calculatedMetrics.distanceKm} km)</div>
          </div>

          <div className="bg-[#f0f4f5] p-2.5 rounded-xl border border-ocean-sub/60 text-center">
            <div className="flex items-center justify-center space-x-1 text-[11px] text-ocean-text/60 font-medium">
              <Clock className="w-3.5 h-3.5 text-[#2a8a89]" />
              <span>Estimated ETA</span>
            </div>
            <div className="text-xs sm:text-sm font-extrabold text-ocean-text mt-0.5">
              {calculatedMetrics.etaHours} hrs
            </div>
            <div className="text-[10px] text-emerald-600 font-bold">-{calculatedMetrics.timeSavedPct}% fast</div>
          </div>

          <div className="bg-[#f0f4f5] p-2.5 rounded-xl border border-ocean-sub/60 text-center">
            <div className="flex items-center justify-center space-x-1 text-[11px] text-ocean-text/60 font-medium">
              <Gauge className="w-3.5 h-3.5 text-[#2a8a89]" />
              <span>Cruising Speed</span>
            </div>
            <div className="text-xs sm:text-sm font-extrabold text-[#2a8a89] mt-0.5">
              {vesselSpeed} Knots
            </div>
            <div className="text-[10px] text-ocean-text/50">Eco Cruising</div>
          </div>

          <div className="bg-[#f0f4f5] p-2.5 rounded-xl border border-ocean-sub/60 text-center">
            <div className="flex items-center justify-center space-x-1 text-[11px] text-ocean-text/60 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Weather Clearance</span>
            </div>
            <div className="text-xs sm:text-sm font-extrabold text-emerald-700 mt-0.5">
              Favorable
            </div>
            <div className="text-[10px] text-emerald-600 font-semibold">Sea State 2</div>
          </div>
        </div>
      </div>

      {/* Main Grid: Interactive Map (Left 8 Cols) + Route Parameters Sidebar Card (Right 4 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left 8 Cols: Interactive Ocean Map View */}
        <div className="lg:col-span-8 space-y-3">
          
          {/* Map Header Status & Overlays Legend */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-white px-4 py-2.5 rounded-xl border border-ocean-sub shadow-2xs">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-bold text-ocean-text">
                Live Route Simulation: <span className="text-[#2a8a89]">{INDIAN_PORTS.find(p => p.id === departurePort)?.name}</span> → <span className="text-emerald-700">{INDIAN_PORTS.find(p => p.id === destinationPort)?.name}</span>
              </span>
            </div>

            {/* Route Map Legend */}
            <div className="flex items-center space-x-3 text-[11px] font-semibold text-ocean-text/80">
              <span className="flex items-center space-x-1">
                <span className="w-3 h-1 bg-emerald-600 rounded-full inline-block"></span>
                <span>Optimal Route</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-3 h-1 bg-red-500 rounded-full inline-block border-dashed"></span>
                <span>Hazard Bypass</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 bg-emerald-100 border border-emerald-500 rounded-xs inline-block"></span>
                <span>PFZ Zone</span>
              </span>
            </div>
          </div>

          {/* Interactive Map Container */}
          <div className="relative rounded-2xl overflow-hidden border border-ocean-sub shadow-md bg-white">
            <div 
              ref={mapContainerRef} 
              className="w-full h-[480px] sm:h-[540px] lg:h-[600px] z-10"
            />

            {/* Floating Summary Card over the Map */}
            <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:max-w-md z-20 bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-ocean-sub shadow-xl animate-in fade-in">
              <div className="flex items-center justify-between border-b border-ocean-sub/60 pb-2 mb-2.5">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-ocean-text">
                  <Sparkles className="w-4 h-4 text-[#2a8a89]" />
                  <span>AI Optimization Performance</span>
                </div>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Optimal Match
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-[#f0f4f5] p-2 rounded-xl border border-ocean-sub/50">
                  <div className="flex items-center justify-center space-x-1 text-[10px] text-ocean-text/60 font-medium">
                    <Fuel className="w-3 h-3 text-emerald-600" />
                    <span>Fuel Saved</span>
                  </div>
                  <div className="text-sm font-extrabold text-emerald-700 mt-0.5">
                    +{calculatedMetrics.fuelSavedPct}%
                  </div>
                </div>

                <div className="bg-[#f0f4f5] p-2 rounded-xl border border-ocean-sub/50">
                  <div className="flex items-center justify-center space-x-1 text-[10px] text-ocean-text/60 font-medium">
                    <Clock className="w-3 h-3 text-[#2a8a89]" />
                    <span>Time Saved</span>
                  </div>
                  <div className="text-sm font-extrabold text-[#2a8a89] mt-0.5">
                    +{calculatedMetrics.timeSavedPct}%
                  </div>
                </div>

                <div className="bg-[#f0f4f5] p-2 rounded-xl border border-ocean-sub/50">
                  <div className="flex items-center justify-center space-x-1 text-[10px] text-ocean-text/60 font-medium">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    <span>Risk Index</span>
                  </div>
                  <div className="text-sm font-extrabold text-emerald-600 mt-0.5">
                    Low (Green)
                  </div>
                </div>
              </div>

              <div className="mt-2.5 flex items-center justify-between text-[11px] text-ocean-text/70 pt-2 border-t border-ocean-sub/40">
                <span>Carbon Reduction: <b>~{calculatedMetrics.co2SavedTons} Tons CO₂</b></span>
                <span className="text-emerald-700 font-semibold">94% Safety Cleared</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right 4 Cols: Route Parameters & Optimization Control Panel */}
        <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-ocean-sub shadow-xs space-y-5">
          
          <div className="flex items-center space-x-2 border-b border-ocean-sub/60 pb-3">
            <Layers className="w-4 h-4 text-[#2a8a89]" />
            <h3 className="text-sm font-bold text-ocean-text">Route Strategy Parameters</h3>
          </div>

          {/* Port Selection Controls */}
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-ocean-text/80 uppercase tracking-wider mb-1.5 flex items-center space-x-1">
                <Anchor className="w-3.5 h-3.5 text-[#2a8a89]" />
                <span>Departure Port</span>
              </label>
              <select
                value={departurePort}
                onChange={(e) => setDeparturePort(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#f0f4f5] border border-ocean-sub rounded-xl text-xs sm:text-sm font-semibold text-ocean-text focus:outline-hidden focus:border-[#2a8a89]"
              >
                {INDIAN_PORTS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.state})
                  </option>
                ))}
              </select>
            </div>

            {/* Swap Button */}
            <div className="flex justify-center -my-1">
              <button
                type="button"
                onClick={handleSwapPorts}
                className="p-1.5 rounded-full bg-white border border-ocean-sub hover:bg-[#f0f4f5] text-[#2a8a89] shadow-xs transition-transform active:rotate-180 cursor-pointer"
                title="Swap Departure and Destination Ports"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-ocean-text/80 uppercase tracking-wider mb-1.5 flex items-center space-x-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                <span>Destination Port / Offshore Zone</span>
              </label>
              <select
                value={destinationPort}
                onChange={(e) => setDestinationPort(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#f0f4f5] border border-ocean-sub rounded-xl text-xs sm:text-sm font-semibold text-ocean-text focus:outline-hidden focus:border-[#2a8a89]"
              >
                {INDIAN_PORTS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.state})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Cruising Speed Slider */}
          <div className="bg-[#f0f4f5] p-3.5 rounded-xl border border-ocean-sub/80 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-ocean-text">
              <span className="flex items-center space-x-1">
                <Gauge className="w-3.5 h-3.5 text-[#2a8a89]" />
                <span>Cruising Speed Target</span>
              </span>
              <span className="text-[#2a8a89] font-extrabold">{vesselSpeed} Knots</span>
            </div>
            <input
              type="range"
              min="10"
              max="22"
              step="1"
              value={vesselSpeed}
              onChange={(e) => setVesselSpeed(parseInt(e.target.value))}
              className="w-full accent-[#2a8a89] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-ocean-text/50 font-medium">
              <span>10 kts (Eco)</span>
              <span>16 kts (Standard)</span>
              <span>22 kts (Fast)</span>
            </div>
          </div>

          {/* Optimization Strategy Controls (Toggle Switches) */}
          <div className="space-y-2.5">
            <div className="text-[11px] font-bold text-ocean-text/80 uppercase tracking-wider">
              Optimization Objectives
            </div>

            {/* Toggle 1: Minimize Fuel Consumption */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#f0f4f5] border border-ocean-sub/60">
              <div className="flex items-center space-x-2">
                <Fuel className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-ocean-text">Minimize Fuel Consumption</span>
              </div>
              <button
                type="button"
                onClick={() => setMinimizeFuel(!minimizeFuel)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  minimizeFuel ? 'bg-[#2a8a89]' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    minimizeFuel ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Toggle 2: Minimize Travel Time */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#f0f4f5] border border-ocean-sub/60">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-[#2a8a89]" />
                <span className="text-xs font-bold text-ocean-text">Minimize Travel Time</span>
              </div>
              <button
                type="button"
                onClick={() => setMinimizeTime(!minimizeTime)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  minimizeTime ? 'bg-[#2a8a89]' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    minimizeTime ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Toggle 3: Avoid Extreme Weather / High Risk Zones */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#f0f4f5] border border-ocean-sub/60">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span className="text-xs font-bold text-ocean-text">Avoid Extreme Weather Zones</span>
              </div>
              <button
                type="button"
                onClick={() => setAvoidWeather(!avoidWeather)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  avoidWeather ? 'bg-[#2a8a89]' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    avoidWeather ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Toggle 4: Maximize PFZ Overlay */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#f0f4f5] border border-ocean-sub/60">
              <div className="flex items-center space-x-2">
                <Fish className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-ocean-text">Maximize Fishing Zone (PFZ)</span>
              </div>
              <button
                type="button"
                onClick={() => setMaximizePFZ(!maximizePFZ)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  maximizePFZ ? 'bg-[#2a8a89]' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    maximizePFZ ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Environmental Overlay Checkboxes */}
          <div className="space-y-2 pt-2 border-t border-ocean-sub/60">
            <div className="text-[11px] font-bold text-ocean-text/80 uppercase tracking-wider mb-1">
              Environmental Overlays
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <label className="flex items-center space-x-2 p-2 rounded-lg bg-[#f0f4f5] hover:bg-ocean-sub/40 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={overlaySST}
                  onChange={(e) => setOverlaySST(e.target.checked)}
                  className="rounded text-[#2a8a89] focus:ring-[#2a8a89]"
                />
                <span className="text-[11px] text-ocean-text">SST (28.4°C)</span>
              </label>

              <label className="flex items-center space-x-2 p-2 rounded-lg bg-[#f0f4f5] hover:bg-ocean-sub/40 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={overlayChlorophyll}
                  onChange={(e) => setOverlayChlorophyll(e.target.checked)}
                  className="rounded text-[#2a8a89] focus:ring-[#2a8a89]"
                />
                <span className="text-[11px] text-ocean-text">Chlorophyll Density</span>
              </label>

              <label className="flex items-center space-x-2 p-2 rounded-lg bg-[#f0f4f5] hover:bg-ocean-sub/40 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={overlaySeaState}
                  onChange={(e) => setOverlaySeaState(e.target.checked)}
                  className="rounded text-[#2a8a89] focus:ring-[#2a8a89]"
                />
                <span className="text-[11px] text-ocean-text">Sea State (1.4m)</span>
              </label>

              <label className="flex items-center space-x-2 p-2 rounded-lg bg-[#f0f4f5] hover:bg-ocean-sub/40 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={overlayCurrents}
                  onChange={(e) => setOverlayCurrents(e.target.checked)}
                  className="rounded text-[#2a8a89] focus:ring-[#2a8a89]"
                />
                <span className="text-[11px] text-ocean-text">Current Velocity</span>
              </label>
            </div>
          </div>

          {/* Action Button: Calculate & Optimize Route */}
          <button
            type="button"
            onClick={handleCalculateRoute}
            disabled={isCalculating}
            className="w-full flex items-center justify-center space-x-2 py-3.5 bg-[#2a8a89] hover:bg-[#38a3a5] text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition-all active:scale-98 cursor-pointer disabled:opacity-75"
          >
            {isCalculating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Simulating Multi-Vector Route...</span>
              </>
            ) : (
              <>
                <span>Calculate & Optimize Route</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

        </div>

      </div>

    </div>
  );
};
