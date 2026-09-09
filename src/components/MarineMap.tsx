import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { useApp } from '../context/AppContext';
import { FishingZone, RiskZone } from '../services/marineData';
import { Plus, Minus, Crosshair, Layers, Check } from 'lucide-react';

interface MarineMapProps {
  showOnlyRecommended?: boolean;
  activeLayer?: 'standard' | 'sst' | 'weather' | 'ocean' | 'chlorophyll' | 'spatial';
  customHeight?: string;
  onZoneSelect?: (zone: FishingZone) => void;
  selectedZoneId?: string;
}

export const MarineMap: React.FC<MarineMapProps> = ({
  showOnlyRecommended = false,
  activeLayer: controlledLayer,
  customHeight = 'h-[500px] lg:h-[620px]',
  onZoneSelect,
  selectedZoneId
}) => {
  const { t, selectedRegion, fishingZones, recommendedZone, riskZones } = useApp();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const gradientOverlayLayerRef = useRef<L.LayerGroup | null>(null);

  const [currentLayer, setCurrentLayer] = useState<'standard' | 'sst' | 'weather' | 'ocean' | 'chlorophyll' | 'spatial'>(
    controlledLayer || 'standard'
  );
  const [showLayerMenu, setShowLayerMenu] = useState(false);

  // Sync controlled layer when prop updates
  useEffect(() => {
    if (controlledLayer) {
      setCurrentLayer(controlledLayer);
    }
  }, [controlledLayer]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [selectedRegion.center.lat, selectedRegion.center.lng],
        zoom: selectedRegion.zoom,
        zoomControl: false, // We render custom minimal controls matching reference
        attributionControl: false
      });

      // Crisp OpenStreetMap / Carto Light Tiles
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 18,
        subdomains: 'abcd',
      }).addTo(map);

      const markersGroup = L.layerGroup().addTo(map);
      const gradientGroup = L.layerGroup().addTo(map);

      markersLayerGroupRef.current = markersGroup;
      gradientOverlayLayerRef.current = gradientGroup;
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update center when region changes
  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView(
        [selectedRegion.center.lat, selectedRegion.center.lng],
        selectedRegion.zoom,
        { animate: true }
      );
    }
  }, [selectedRegion]);

  // Render Overlays & Custom Markers (Matching User Reference media_1788704780380.jpg)
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerGroupRef.current || !gradientOverlayLayerRef.current) return;

    const markersGroup = markersLayerGroupRef.current;
    const gradientGroup = gradientOverlayLayerRef.current;

    markersGroup.clearLayers();
    gradientGroup.clearLayers();

    // 1. Render Marine Environmental Visualizer Overlays
    renderLayerOverlays(gradientGroup, currentLayer, selectedRegion.center);

    // 2. User Location Pin Marker (Blue pinpoint at coast e.g. Machilipatnam)
    const userPinHtml = `
      <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-full cursor-pointer group">
        <div class="custom-user-pin"></div>
        <span class="absolute -bottom-5 bg-white text-slate-800 text-[10px] font-bold px-1.5 py-0.5 rounded shadow border border-slate-200 whitespace-nowrap">
          ${t.currentLocationLabel}
        </span>
      </div>
    `;

    const userIcon = L.divIcon({
      className: 'custom-user-marker',
      html: userPinHtml,
      iconSize: [28, 28],
      iconAnchor: [14, 28]
    });

    const userMarker = L.marker([selectedRegion.userBase.lat, selectedRegion.userBase.lng], { icon: userIcon });
    userMarker.bindPopup(`
      <div class="text-xs p-1">
        <div class="font-bold text-slate-900">${t.currentLocationLabel}</div>
        <div class="text-slate-500">${selectedRegion.name}</div>
        <div class="text-[11px] text-[#20B2AA] font-semibold mt-1">Lat: ${selectedRegion.userBase.lat.toFixed(2)}, Lng: ${selectedRegion.userBase.lng.toFixed(2)}</div>
      </div>
    `);
    markersGroup.addLayer(userMarker);

    // 3. Filter Fishing Zones based on mode (Show Only Recommended in Fisherman Page 5)
    const activeZonesToRender = showOnlyRecommended 
      ? [recommendedZone] 
      : fishingZones;

    // 4. Render Fishing Zones with badges & fish icon
    activeZonesToRender.forEach((zone) => {
      const isBest = zone.isRecommendedBest || zone.id === recommendedZone.id;
      const colorClass = isBest ? 'green' : zone.productivity === 'high' ? 'green' : 'orange';

      // SVG Fish Icon inside the circular badge
      const fishSvg = `
        <svg viewBox="0 0 24 24" width="22" height="22" fill="white" stroke="white" stroke-width="1.2">
          <path d="M6.5 12c.94-3.46 4.94-6 8.5-6 3.56 0 6.5 2.54 6.5 6s-2.94 6-6.5 6c-3.56 0-7.56-2.54-8.5-6z"/>
          <path d="M6.5 12L2 8v8l4.5-4z"/>
          <circle cx="16" cy="10.5" r="1" fill="#20B2AA"/>
        </svg>
      `;

      const zoneIconHtml = `
        <div class="zone-marker-wrapper cursor-pointer select-none">
          <div class="zone-circle ${colorClass}">
            ${fishSvg}
          </div>
        </div>
      `;

      const zoneIcon = L.divIcon({
        className: 'custom-zone-marker',
        html: zoneIconHtml,
        iconSize: [48, 48],
        iconAnchor: [24, 24]
      });

      const zoneMarker = L.marker([zone.coordinates.lat, zone.coordinates.lng], { icon: zoneIcon });
      
      zoneMarker.on('click', () => {
        if (onZoneSelect) onZoneSelect(zone);
      });

      // Rich compact tooltip/popup
      zoneMarker.bindPopup(`
        <div class="p-2 min-w-[200px] text-xs font-sans">
          <div class="flex items-center justify-between border-b pb-1 mb-1.5">
            <span class="font-bold text-slate-900">${zone.code}</span>
            <span class="text-[10px] font-bold px-1.5 py-0.5 rounded ${
              zone.productivityScore > 80 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
            }">
              ${zone.productivityScore}% ${t.prodHigh.split(' ')[0]}
            </span>
          </div>
          <div class="text-slate-800 font-medium">${zone.name}</div>
          <div class="mt-1 text-slate-600 grid grid-cols-2 gap-1 text-[11px]">
            <div><strong>${t.distanceFromUser}:</strong> ${zone.distanceKm} ${t.kmUnit}</div>
            <div><strong>${t.seaTemperature}:</strong> ${zone.sstCelsius}${t.celsiusUnit}</div>
            <div><strong>${t.waveHeight}:</strong> ${zone.waveHeightMeters}${t.metersUnit}</div>
            <div><strong>${t.windSpeed}:</strong> ${zone.windSpeedKnots} ${t.knotsUnit}</div>
          </div>
          <div class="mt-2 text-[10px] text-slate-500 italic bg-slate-50 p-1.5 rounded border border-slate-100">
            ${zone.notes}
          </div>
        </div>
      `);

      markersGroup.addLayer(zoneMarker);

      // Trajectory connection line with Distance Badge (18.4 km reference!)
      if (isBest) {
        const polyline = L.polyline(
          [
            [selectedRegion.userBase.lat, selectedRegion.userBase.lng],
            [zone.coordinates.lat, zone.coordinates.lng]
          ],
          {
            color: '#38bdf8',
            weight: 2.5,
            dashArray: '5, 8',
            opacity: 0.95
          }
        );
        markersGroup.addLayer(polyline);

        // Midpoint badge "18.4 km"
        const midLat = (selectedRegion.userBase.lat + zone.coordinates.lat) / 2;
        const midLng = (selectedRegion.userBase.lng + zone.coordinates.lng) / 2;

        const distanceBadgeIcon = L.divIcon({
          className: 'distance-badge-wrapper',
          html: `<div class="distance-badge">${zone.distanceKm} ${t.kmUnit}</div>`,
          iconSize: [60, 20],
          iconAnchor: [30, 10]
        });

        const distanceMarker = L.marker([midLat, midLng], { icon: distanceBadgeIcon });
        markersGroup.addLayer(distanceMarker);
      }
    });

    // 5. Render Risk / Hazard Vortex Zone (Matching red warning circle in reference image!)
    if (!showOnlyRecommended && riskZones.length > 0) {
      riskZones.forEach(risk => {
        if (risk.regionId === selectedRegion.id) {
          const warningSvg = `
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
          `;

          const riskIconHtml = `
            <div class="zone-marker-wrapper cursor-pointer select-none">
              <div class="zone-circle red">
                ${warningSvg}
              </div>
            </div>
          `;

          const riskIcon = L.divIcon({
            className: 'custom-risk-marker',
            html: riskIconHtml,
            iconSize: [48, 48],
            iconAnchor: [24, 24]
          });

          const riskMarker = L.marker([risk.coordinates.lat, risk.coordinates.lng], { icon: riskIcon });
          
          riskMarker.bindPopup(`
            <div class="p-2 min-w-[210px] text-xs font-sans">
              <div class="flex items-center justify-between border-b pb-1 mb-1 text-red-600 font-bold">
                <span>${t.riskSevere}</span>
                <span class="text-[10px] bg-red-100 px-1.5 py-0.5 rounded">${risk.riskScore}/100</span>
              </div>
              <div class="font-bold text-slate-900">${risk.name}</div>
              <div class="text-slate-600 mt-1 text-[11px]">${risk.hazardType}</div>
              <div class="mt-2 text-[11px] text-red-800 bg-red-50 p-1.5 rounded border border-red-200">
                <strong>${t.safetyNotice}:</strong> ${risk.advisory}
              </div>
            </div>
          `);

          markersGroup.addLayer(riskMarker);

          // Danger boundary ring
          const dangerCircle = L.circle([risk.coordinates.lat, risk.coordinates.lng], {
            radius: risk.radiusKm * 1000,
            color: '#ef4444',
            weight: 1.5,
            dashArray: '6, 6',
            fillColor: '#ef4444',
            fillOpacity: 0.12
          });
          markersGroup.addLayer(dangerCircle);
        }
      });
    }

  }, [fishingZones, recommendedZone, riskZones, selectedRegion, showOnlyRecommended, currentLayer, t]);

  // Layer Overlays (Thermal SST, Weather, Ocean current waves, Chlorophyll)
  const renderLayerOverlays = (
    group: L.LayerGroup, 
    layer: 'standard' | 'sst' | 'weather' | 'ocean' | 'chlorophyll' | 'spatial', 
    center: { lat: number; lng: number }
  ) => {
    // 1. Thermal SST Gradient Overlay (Matches reference image heat vortex from teal to orange/red)
    if (layer === 'sst' || layer === 'standard') {
      const gradientRings = [
        { lat: center.lat - 0.1, lng: center.lng + 0.15, radius: 45000, color: '#0ea5e9', opacity: 0.18 },
        { lat: center.lat - 0.1, lng: center.lng + 0.15, radius: 32000, color: '#22c55e', opacity: 0.22 },
        { lat: center.lat - 0.1, lng: center.lng + 0.15, radius: 22000, color: '#eab308', opacity: 0.25 },
        { lat: center.lat - 0.1, lng: center.lng + 0.15, radius: 14000, color: '#f97316', opacity: 0.32 },
        { lat: center.lat - 0.1, lng: center.lng + 0.15, radius: 8000, color: '#ef4444', opacity: 0.38 }
      ];

      gradientRings.forEach(ring => {
        const circle = L.circle([ring.lat, ring.lng], {
          radius: ring.radius,
          color: ring.color,
          weight: 0,
          fillColor: ring.color,
          fillOpacity: ring.opacity,
          interactive: false
        });
        group.addLayer(circle);
      });
    }

    // 2. Weather & Wind Overlay (Animated arrows / wind vector lines)
    if (layer === 'weather') {
      const windVectors = [
        { lat: center.lat + 0.2, lng: center.lng - 0.2, angle: 45 },
        { lat: center.lat + 0.1, lng: center.lng, angle: 50 },
        { lat: center.lat, lng: center.lng + 0.2, angle: 55 },
        { lat: center.lat - 0.2, lng: center.lng - 0.1, angle: 40 },
        { lat: center.lat - 0.3, lng: center.lng + 0.1, angle: 48 },
      ];

      windVectors.forEach(v => {
        const arrowHtml = `
          <div style="transform: rotate(${v.angle}deg); color: #0284c7;" class="opacity-80 flex items-center">
            <svg width="32" height="16" viewBox="0 0 32 16" fill="currentColor">
              <path d="M0 7h24v2H0zM22 1l10 7-10 7V1z"/>
            </svg>
            <span class="text-[9px] font-bold ml-1 text-sky-800">12kt</span>
          </div>
        `;
        const icon = L.divIcon({ className: '', html: arrowHtml, iconSize: [40, 20] });
        group.addLayer(L.marker([v.lat, v.lng], { icon, interactive: false }));
      });
    }

    // 3. Ocean Waves & Tides Overlay
    if (layer === 'ocean') {
      const wavePoints = [
        { lat: center.lat + 0.15, lng: center.lng - 0.1 },
        { lat: center.lat, lng: center.lng + 0.1 },
        { lat: center.lat - 0.2, lng: center.lng - 0.2 },
        { lat: center.lat - 0.15, lng: center.lng + 0.25 }
      ];

      wavePoints.forEach(p => {
        const waveSvg = `
          <div class="animate-pulse text-indigo-500 opacity-75">
            <svg width="40" height="20" viewBox="0 0 40 20" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M0 10 Q10 2 20 10 T40 10"/>
            </svg>
            <span class="text-[9px] font-bold text-indigo-700">0.9m | 7s</span>
          </div>
        `;
        const icon = L.divIcon({ className: '', html: waveSvg, iconSize: [45, 25] });
        group.addLayer(L.marker([p.lat, p.lng], { icon, interactive: false }));
      });
    }

    // 4. Chlorophyll Concentration Overlay
    if (layer === 'chlorophyll') {
      const greenBlooms = [
        { lat: center.lat - 0.05, lng: center.lng - 0.05, radius: 26000, opacity: 0.35 },
        { lat: center.lat + 0.2, lng: center.lng + 0.1, radius: 30000, opacity: 0.28 }
      ];

      greenBlooms.forEach(b => {
        const circle = L.circle([b.lat, b.lng], {
          radius: b.radius,
          color: '#15803d',
          weight: 1,
          dashArray: '3, 4',
          fillColor: '#22c55e',
          fillOpacity: b.opacity,
          interactive: false
        });
        group.addLayer(circle);
      });
    }

    // 5. Spatial Bathymetry Depth Lines
    if (layer === 'spatial') {
      // 20m, 50m, 100m depth contour isobaths
      const isobaths = [
        { points: [[center.lat + 0.4, center.lng - 0.2], [center.lat, center.lng - 0.05], [center.lat - 0.4, center.lng + 0.1]], depth: '30m' },
        { points: [[center.lat + 0.4, center.lng - 0.05], [center.lat, center.lng + 0.1], [center.lat - 0.4, center.lng + 0.25]], depth: '60m' },
        { points: [[center.lat + 0.4, center.lng + 0.1], [center.lat, center.lng + 0.25], [center.lat - 0.4, center.lng + 0.4]], depth: '100m' },
      ];

      isobaths.forEach(iso => {
        const line = L.polyline(iso.points as L.LatLngExpression[], {
          color: '#0369a1',
          weight: 2,
          dashArray: '8, 6',
          opacity: 0.8
        });
        group.addLayer(line);
      });
    }
  };

  // Zoom and locate actions
  const handleZoomIn = () => {
    mapInstanceRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapInstanceRef.current?.zoomOut();
  };

  const handleReCenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView(
        [selectedRegion.center.lat, selectedRegion.center.lng],
        selectedRegion.zoom,
        { animate: true }
      );
    }
  };

  return (
    <div className={`relative w-full ${customHeight} bg-slate-100 rounded-xl overflow-hidden border border-slate-200 shadow-xs select-none`}>
      {/* Map DOM Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Reference Map Top-Right Custom Controls matching media_1788704780380.jpg */}
      <div className="absolute top-4 right-4 z-10 flex flex-col space-y-2">
        {/* Zoom In Button */}
        <button
          onClick={handleZoomIn}
          className="w-9 h-9 bg-white/95 hover:bg-white text-slate-700 hover:text-[#20B2AA] rounded-lg shadow-md border border-slate-200/80 flex items-center justify-center transition-all active:scale-95"
          title="Zoom In"
        >
          <Plus className="w-4 h-4" />
        </button>

        {/* Zoom Out Button */}
        <button
          onClick={handleZoomOut}
          className="w-9 h-9 bg-white/95 hover:bg-white text-slate-700 hover:text-[#20B2AA] rounded-lg shadow-md border border-slate-200/80 flex items-center justify-center transition-all active:scale-95"
          title="Zoom Out"
        >
          <Minus className="w-4 h-4" />
        </button>

        {/* Locate / Re-center Crosshair Button */}
        <button
          onClick={handleReCenter}
          className="w-9 h-9 bg-white/95 hover:bg-white text-slate-700 hover:text-[#20B2AA] rounded-lg shadow-md border border-slate-200/80 flex items-center justify-center transition-all active:scale-95"
          title="Center on Coast"
        >
          <Crosshair className="w-4 h-4" />
        </button>

        {/* Layer Stack Switcher Button */}
        <div className="relative">
          <button
            onClick={() => setShowLayerMenu(!showLayerMenu)}
            className={`w-9 h-9 ${
              showLayerMenu ? 'bg-[#20B2AA] text-white' : 'bg-white/95 hover:bg-white text-slate-700 hover:text-[#20B2AA]'
            } rounded-lg shadow-md border border-slate-200/80 flex items-center justify-center transition-all active:scale-95`}
            title="Layer Switcher"
          >
            <Layers className="w-4 h-4" />
          </button>

          {/* Layer Selection Dropdown */}
          {showLayerMenu && (
            <div className="absolute right-11 top-0 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-20 text-xs font-medium">
              <div className="px-3 py-1 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                {t.navAnalysis}
              </div>
              {[
                { id: 'standard', label: 'Marine Satellite Base' },
                { id: 'sst', label: t.sstTitle },
                { id: 'weather', label: t.weatherTitle },
                { id: 'ocean', label: t.oceanTitle },
                { id: 'chlorophyll', label: t.chlorophyllTitle },
                { id: 'spatial', label: t.spatialTitle },
              ].map(layer => (
                <button
                  key={layer.id}
                  onClick={() => {
                    setCurrentLayer(layer.id as any);
                    setShowLayerMenu(false);
                  }}
                  className={`w-full px-3 py-1.5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors ${
                    currentLayer === layer.id ? 'text-[#20B2AA] font-bold bg-[#e0f5f4]/50' : 'text-slate-700'
                  }`}
                >
                  <span className="truncate">{layer.label}</span>
                  {currentLayer === layer.id && <Check className="w-3.5 h-3.5 text-[#20B2AA] shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Map Status Bar */}
      <div className="absolute bottom-3 left-3 z-10 bg-white/95 backdrop-blur-xs px-3 py-1.5 rounded-lg shadow-xs border border-slate-200/90 text-xs flex items-center space-x-3">
        <div className="flex items-center space-x-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span className="font-semibold text-slate-800">{selectedRegion.name}</span>
        </div>
        <div className="text-slate-400">|</div>
        <div className="text-[11px] text-slate-600 font-medium">
          {showOnlyRecommended ? 1 : fishingZones.length} {t.allActiveZones.toLowerCase()}
        </div>
      </div>
    </div>
  );
};
