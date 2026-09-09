import React from 'react';
import { useApp } from '../context/AppContext';
import { MarineMap } from '../components/MarineMap';
import { 
  ShieldAlert, 
  RefreshCw, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  Cpu, 
  Clock, 
  Compass, 
  ArrowUpRight, 
  ArrowDownRight,
  Minus
} from 'lucide-react';

export const Page13RiskPrediction: React.FC = () => {
  const { 
    t, 
    riskPrediction, 
    refreshCountdown, 
    triggerManualRiskRefresh,
    selectedRegion 
  } = useApp();

  const getStatusBadge = () => {
    switch (riskPrediction.overallStatus) {
      case 'severe':
        return { label: t.riskSevere, bg: 'bg-red-100 text-red-700 border-red-200' };
      case 'high':
        return { label: t.riskHigh, bg: 'bg-orange-100 text-orange-700 border-orange-200' };
      case 'moderate':
        return { label: t.riskModerate, bg: 'bg-amber-100 text-amber-700 border-amber-200' };
      default:
        return { label: t.riskLow, bg: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
    }
  };

  const statusBadge = getStatusBadge();

  return (
    <div className="w-full px-4 py-5 sm:px-8 space-y-6 select-none">
      
      {/* Page Header with Automated 30s Status */}
      <div className="bg-ocean-card p-5 rounded-2xl border border-ocean-sub shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-5 h-5 text-red-600" />
            <h1 className="text-xl sm:text-2xl font-bold text-ocean-text tracking-tight">
              {t.riskPredictionTitle}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-ocean-text/70 mt-1">
            {t.aiPredictionModel} • {t.automatedModelActive}
          </p>
        </div>

        {/* 30-Second Countdown & Manual Trigger Pill */}
        <div className="flex items-center space-x-3 self-start md:self-auto bg-ocean-sub/40 p-2.5 rounded-xl border border-ocean-sub">
          <div className="flex items-center space-x-2">
            <div className="relative flex items-center justify-center">
              <span className="w-3 h-3 rounded-full bg-[#2a8a89] animate-ping opacity-75"></span>
              <span className="relative w-2.5 h-2.5 rounded-full bg-[#2a8a89]"></span>
            </div>
            <div className="text-xs font-semibold text-ocean-text/90">
              {t.nextRefreshIn} <span className="font-mono font-bold text-[#2a8a89]">{refreshCountdown}</span> {t.secondsSuffix}
            </div>
          </div>

          <button
            onClick={triggerManualRiskRefresh}
            className="p-1.5 rounded-lg text-ocean-text/70 hover:text-[#2a8a89] hover:bg-ocean-card transition-colors"
            title="Recalculate now"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Live Status Indicators Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Current Risk Status */}
        <div className="bg-ocean-card p-4 rounded-2xl border border-ocean-sub shadow-xs">
          <div className="text-[11px] font-bold text-ocean-text/70 uppercase tracking-wider mb-1">
            {t.riskStatusLive}
          </div>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${statusBadge.bg}`}>
              {statusBadge.label}
            </span>
            <span className="text-xs font-mono font-semibold text-ocean-text/80">
              Index: {riskPrediction.globalRiskIndex}/100
            </span>
          </div>
        </div>

        {/* Prediction Timestamp */}
        <div className="bg-ocean-card p-4 rounded-2xl border border-ocean-sub shadow-xs">
          <div className="text-[11px] font-bold text-ocean-text/70 uppercase tracking-wider mb-1 flex items-center space-x-1">
            <Clock className="w-3.5 h-3.5 text-[#2a8a89]" />
            <span>Telemetry Timestamp</span>
          </div>
          <div className="text-sm font-bold text-ocean-text font-mono">
            {riskPrediction.timestamp} UTC+05:30
          </div>
          <div className="text-[10px] text-emerald-600 font-medium mt-0.5">
            ● {t.lastUpdatedNow}
          </div>
        </div>

        {/* AI Confidence */}
        <div className="bg-ocean-card p-4 rounded-2xl border border-ocean-sub shadow-xs">
          <div className="text-[11px] font-bold text-ocean-text/70 uppercase tracking-wider mb-1 flex items-center space-x-1">
            <Cpu className="w-3.5 h-3.5 text-[#2a8a89]" />
            <span>Ensemble Confidence</span>
          </div>
          <div className="text-sm font-bold text-ocean-text">
            {riskPrediction.modelConfidence}% Reliability
          </div>
          <div className="text-[10px] text-ocean-text/50 mt-0.5">
            Multi-satellite SAR verified
          </div>
        </div>

        {/* Safe Corridor Heading */}
        <div className="bg-ocean-card p-4 rounded-2xl border border-ocean-sub shadow-xs">
          <div className="text-[11px] font-bold text-ocean-text/70 uppercase tracking-wider mb-1 flex items-center space-x-1">
            <Compass className="w-3.5 h-3.5 text-[#2a8a89]" />
            <span>Recommended Safe Heading</span>
          </div>
          <div className="text-sm font-bold text-[#2a8a89]">
            {riskPrediction.safeCorridorBearing}
          </div>
          <div className="text-[10px] text-ocean-text/50 mt-0.5">
            Safe passage corridor clear
          </div>
        </div>
      </div>

      {/* Main Grid: Interactive Map & Risk Zones Ranking */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left 7 Cols: Interactive Map with Risk Visualization Overlay */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-ocean-text uppercase tracking-wider">
              Maritime Risk Zones & Eddy Vortices ({selectedRegion.name})
            </span>
            <span className="text-[11px] text-red-600 font-semibold flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-red-600 animate-ping"></span>
              <span>Live Hazard Rings</span>
            </span>
          </div>

          <MarineMap
            activeLayer="standard"
            customHeight="h-[480px] sm:h-[540px] lg:h-[600px]"
          />
        </div>

        {/* Right 5 Cols: Top Risk Zones Ranking & AI Insights */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Top Hazard Zones Ranked */}
          <div className="bg-ocean-card p-4 rounded-2xl border border-ocean-sub shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-ocean-sub/60 pb-2">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-ocean-text uppercase">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span>{t.topHazardZones}</span>
              </div>
              <span className="text-[10px] text-ocean-text/50">Ranked by Score</span>
            </div>

            <div className="space-y-2.5">
              {riskPrediction.riskZones.map((rz, idx) => (
                <div
                  key={rz.id}
                  className="p-3 rounded-xl bg-ocean-sub/40 border border-ocean-sub/60 text-xs transition-all hover:border-red-200"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-2 font-bold text-ocean-text">
                      <span className="w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center text-[10px]">
                        {idx + 1}
                      </span>
                      <span className="truncate max-w-[190px]">{rz.name}</span>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      {rz.currentTrend === 'increasing' ? (
                        <ArrowUpRight className="w-3.5 h-3.5 text-red-600" />
                      ) : rz.currentTrend === 'decreasing' ? (
                        <ArrowDownRight className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Minus className="w-3.5 h-3.5 text-ocean-text/50" />
                      )}
                      <span className="font-extrabold text-red-600 text-xs">
                        {rz.riskScore}/100
                      </span>
                    </div>
                  </div>

                  <div className="text-[11px] text-ocean-text/80 pl-7">
                    {rz.hazardType}
                  </div>

                  <div className="text-[10px] text-red-700 bg-red-50/60 p-1.5 rounded mt-1.5 pl-2 border border-red-100">
                    <strong>Advisory:</strong> {rz.advisory}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Prediction Insights */}
          <div className="bg-[#c8dcdb] p-4 rounded-2xl border border-[#2a8a89]/20 text-xs space-y-2">
            <div className="flex items-center space-x-2 text-[#2a8a89] font-bold">
              <Sparkles className="w-4 h-4" />
              <span>{t.aiPredictionInsights}</span>
            </div>
            <p className="text-ocean-text/90 text-[11px] leading-relaxed">
              {riskPrediction.insight}
            </p>
            <div className="text-[10px] text-[#2a8a89] font-medium pt-1 border-t border-[#2a8a89]/20">
              {t.maritimeAdvisory}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

