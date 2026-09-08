import React from 'react';
import { X, Navigation, Waves, Wind, Thermometer, Fish, AlertTriangle } from 'lucide-react';
import { PFZZone } from '../types';

interface ZoneDetailsModalProps {
  zone: PFZZone | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ZoneDetailsModal: React.FC<ZoneDetailsModalProps> = ({
  zone,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !zone) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <span className="text-xl font-black text-slate-900">{zone.name}</span>
            <span
              className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${zone.heatBadgeClass}`}
            >
              {zone.suitabilityLabel}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[460px] overflow-y-auto">
          {/* Coordinates & Depth */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider block">
                GPS Position
              </span>
              <p className="text-xs font-bold font-mono text-slate-800 mt-1">
                {zone.lat.toFixed(3)}° N, {zone.lng.toFixed(3)}° E
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider block">
                Thermocline Depth
              </span>
              <p className="text-xs font-bold font-mono text-[#0d6efd] mt-1">
                {zone.depth}
              </p>
            </div>
          </div>

          {/* Environmental Metrics */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
              <Thermometer className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
              <span className="text-[10px] text-slate-400 block font-medium">Sea Temp</span>
              <span className="text-xs font-bold text-slate-900">{zone.seaTemp}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
              <Waves className="w-4 h-4 text-blue-600 mx-auto mb-1" />
              <span className="text-[10px] text-slate-400 block font-medium">Wave Height</span>
              <span className="text-xs font-bold text-slate-900">{zone.waveHeight}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
              <Wind className="w-4 h-4 text-slate-600 mx-auto mb-1" />
              <span className="text-[10px] text-slate-400 block font-medium">Wind Speed</span>
              <span className="text-xs font-bold text-slate-900">{zone.windSpeed}</span>
            </div>
          </div>

          {/* Biological Oceanography */}
          <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 space-y-2 text-xs">
            <div className="flex items-center gap-2 text-blue-900 font-bold">
              <Fish className="w-4 h-4 text-[#0d6efd]" />
              <span>Target Commercial Species</span>
            </div>
            <p className="text-slate-700 font-semibold">{zone.species}</p>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              <strong className="text-slate-800">Feeding Behaviour: </strong>
              {zone.heatAdvice}
            </p>
          </div>

          {/* Satellite Telemetry Attributes */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500">Chlorophyll-a Index:</span>
              <span className="font-bold text-slate-900">{zone.chlorophyllIndex || '0.42 mg/m³'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Salinity:</span>
              <span className="font-bold text-slate-900">{zone.salinity || '32.8 PSU'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Current Velocity:</span>
              <span className="font-bold text-slate-900">{zone.currentVelocity || '0.6 knots SW'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Optimum Harvest Window:</span>
              <span className="font-bold text-emerald-700">{zone.bestTime}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-[#0d6efd] hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
