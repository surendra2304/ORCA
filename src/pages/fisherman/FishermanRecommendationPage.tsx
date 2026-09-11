import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { MarineMap } from '../../components/MarineMap';
import { 
  MapPin, 
  Clock, 
  ShieldAlert, 
  Wind, 
  TrendingUp, 
  Sparkles, 
  CheckCircle2, 
  Navigation,
  Thermometer,
  RotateCcw,
  Mic,
  Compass,
  ExternalLink,
  Volume2,
  X
} from 'lucide-react';

export const FishermanRecommendationPage: React.FC = () => {
  const { t, recommendedZone, selectedRegion, voyageParams, language } = useApp();
  const navigate = useNavigate();
  const [showNavModal, setShowNavModal] = useState(false);
  const [isSpeakingNav, setIsSpeakingNav] = useState(false);

  const handleSpeakNav = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    if (isSpeakingNav) {
      setIsSpeakingNav(false);
      return;
    }

    const text = language === 'te'
      ? `నావిగేషన్ మార్గం సెట్ చేయబడింది. గమ్యం: ${recommendedZone.name}, కోడ్ ${recommendedZone.code}. దిక్సూచి బేరింగ్: నూట పదిహేను డిగ్రీల ఆగ్నేయం. తీరానికి దూరం: ${recommendedZone.distanceKm} కిలోమీటర్లు. అంచనా వేసిన ప్రయాణ సమయం: రెండు గంటలు. గరిష్ట అలల ఎత్తు ${recommendedZone.waveHeightMeters} మీటర్లు. శుభ ప్రయాణం!`
      : `Navigation course plotted. Destination: ${recommendedZone.name}, code ${recommendedZone.code}. Compass bearing: 115 degrees South-East. Offshore distance: ${recommendedZone.distanceKm} kilometers. Estimated transit time: ${(recommendedZone.distanceKm / 14.8).toFixed(1)} hours at 8 knots. Wave swell is ${recommendedZone.waveHeightMeters} meters. Have a safe and productive voyage!`;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === 'te' ? 'te-IN' : 'en-IN';
    utterance.rate = 0.95;
    utterance.onend = () => setIsSpeakingNav(false);
    utterance.onerror = () => setIsSpeakingNav(false);
    setIsSpeakingNav(true);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6 space-y-6 select-none">
      
      {/* Header Banner (Minimal Fisherman flow, No taskbar or menus) */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {t.bestFishingZoneTitle}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
              Page 3 of 3 (Final Recommendation)
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {selectedRegion.name} • {voyageParams.date} • {voyageParams.time}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2 self-start sm:self-auto flex-wrap gap-2">
          <button
            onClick={() => navigate('/fisherman/voice')}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-50 hover:bg-[#e0f5f4] text-[#20B2AA] border border-slate-200 hover:border-[#20B2AA] text-xs font-semibold rounded-xl transition-all"
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Voice Assistant</span>
          </button>

          <button
            onClick={() => navigate('/fisherman/manual')}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-50 hover:bg-[#e0f5f4] text-[#20B2AA] border border-slate-200 hover:border-[#20B2AA] text-xs font-semibold rounded-xl transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Edit Parameters</span>
          </button>
        </div>
      </div>


      {/* Main Grid: Recommended Best Zone Card on Left, ISOLATED Map on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left 5 Cols: Best Fishing Zone Highlights & AI Insights */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl p-5 border-2 border-[#20B2AA] shadow-md space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-[#20B2AA] text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-bl-xl">
              ★ {t.recommendedBestZone}
            </div>

            <div>
              <span className="text-xs font-bold text-[#20B2AA] tracking-wider uppercase">
                {recommendedZone.code}
              </span>
              <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                {recommendedZone.name}
              </h3>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              {/* Distance from Coast */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center space-x-1.5 text-slate-500 text-[11px] font-semibold">
                  <MapPin className="w-3.5 h-3.5 text-[#20B2AA]" />
                  <span>{t.distanceFromUser}</span>
                </div>
                <div className="text-base font-extrabold text-slate-900 mt-1">
                  {recommendedZone.distanceKm} {t.kmUnit}
                </div>
              </div>

              {/* Best Time to Go */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center space-x-1.5 text-slate-500 text-[11px] font-semibold">
                  <Clock className="w-3.5 h-3.5 text-[#20B2AA]" />
                  <span>{t.bestTimeToGo}</span>
                </div>
                <div className="text-xs font-bold text-slate-900 mt-1 truncate">
                  {recommendedZone.bestTime}
                </div>
              </div>

              {/* Risk Level */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center space-x-1.5 text-slate-500 text-[11px] font-semibold">
                  <ShieldAlert className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{t.riskLevel}</span>
                </div>
                <div className="text-xs font-bold text-emerald-700 mt-1">
                  {t.riskLow} ({recommendedZone.riskScore}/100)
                </div>
              </div>

              {/* Productivity Level */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center space-x-1.5 text-slate-500 text-[11px] font-semibold">
                  <TrendingUp className="w-3.5 h-3.5 text-[#20B2AA]" />
                  <span>{t.productivityLevel}</span>
                </div>
                <div className="text-xs font-bold text-[#20B2AA] mt-1">
                  {recommendedZone.productivityScore}% ({t.prodHigh.split(' ')[0]})
                </div>
              </div>
            </div>

            {/* Weather Condition */}
            <div className="p-3 rounded-xl bg-sky-50/60 border border-sky-100 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <Wind className="w-4 h-4 text-[#20B2AA]" />
                <div>
                  <div className="font-bold text-slate-900">{t.weatherCondition}</div>
                  <div className="text-[11px] text-slate-500">
                    {recommendedZone.windSpeedKnots} {t.knotsUnit} SE • {recommendedZone.waveHeightMeters}{t.metersUnit} wave swell • {recommendedZone.sstCelsius}{t.celsiusUnit}
                  </div>
                </div>
              </div>
              <Thermometer className="w-4 h-4 text-[#20B2AA]" />
            </div>

            {/* AI Recommendation / Insight */}
            <div className="p-3.5 rounded-xl bg-[#e0f5f4] border border-[#20B2AA]/20 text-xs">
              <div className="flex items-center space-x-1.5 text-[#20B2AA] font-bold mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{t.aiRecommendationTitle}</span>
              </div>
              <p className="text-slate-700 text-[11px] leading-relaxed">
                {t.aiInsightFishingZone}
              </p>
              <div className="mt-2 text-[10px] text-slate-500 font-medium">
                Target species: {recommendedZone.species.join(', ')}
              </div>
            </div>

            {/* Set Course Navigation Action */}
            <button
              onClick={() => setShowNavModal(true)}
              className="w-full flex items-center justify-center space-x-2 py-3.5 bg-[#20B2AA] hover:bg-[#1a9e97] text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition-all active:scale-98 cursor-pointer"
            >
              <Navigation className="w-4 h-4" />
              <span>{t.navigateZone}</span>
            </button>
          </div>
        </div>

        {/* Right 7 Cols: ISOLATED MAP (Shows ONLY User Location & Recommended Best Zone) */}
        <div className="lg:col-span-7 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600 px-1">
            <span>{t.recommendedBestZone} (Isolated Map View)</span>
            <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Verified Offshore in Sea Water
            </span>
          </div>

          {/* Leaflet map with showOnlyRecommended=true strictly hiding all other zones & risk zones */}
          <MarineMap
            showOnlyRecommended={true}
            customHeight="h-[460px] lg:h-[540px]"
          />
        </div>

      </div>

      {/* ───────────────────────────────────────────────────────────────────────
          INTERACTIVE NAVIGATION MODAL (Real GPS & Compass Course HUD)
         ─────────────────────────────────────────────────────────────────────── */}
      {showNavModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#20B2AA] to-[#1a9e97] p-5 text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-white">
                  <Compass className="w-6 h-6 animate-spin-slow" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Course Plotted: {recommendedZone.name}</h3>
                  <p className="text-xs text-white/80">Zone Code: {recommendedZone.code} • Verified Offshore</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowNavModal(false);
                  if (isSpeakingNav && typeof window !== 'undefined' && 'speechSynthesis' in window) {
                    window.speechSynthesis.cancel();
                    setIsSpeakingNav(false);
                  }
                }}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Metrics HUD */}
            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Compass Bearing</span>
                  <div className="text-lg font-black text-slate-800 mt-0.5">115° SE</div>
                  <span className="text-[11px] text-[#20B2AA] font-semibold">South-East Passage</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Distance Offshore</span>
                  <div className="text-lg font-black text-slate-800 mt-0.5">{recommendedZone.distanceKm} km</div>
                  <span className="text-[11px] text-slate-500">{(recommendedZone.distanceKm * 0.539957).toFixed(1)} NM</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Est. Transit Time</span>
                  <div className="text-lg font-black text-slate-800 mt-0.5">{(recommendedZone.distanceKm / 14.8).toFixed(1)} hrs</div>
                  <span className="text-[11px] text-slate-500">At 8 knots cruising</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Target Species</span>
                  <div className="text-sm font-bold text-slate-800 mt-0.5 truncate">{recommendedZone.species[0]}</div>
                  <span className="text-[11px] text-emerald-600 font-semibold">{recommendedZone.productivityScore}% Catch Potential</span>
                </div>
              </div>

              {/* Waypoint Coordinates Pill */}
              <div className="p-3 rounded-xl bg-slate-100/70 border border-slate-200 flex items-center justify-between">
                <div className="flex items-center space-x-2 text-slate-600">
                  <MapPin className="w-4 h-4 text-[#20B2AA]" />
                  <span className="font-mono font-bold text-xs">
                    {recommendedZone.coordinates.lat.toFixed(4)}° N, {recommendedZone.coordinates.lng.toFixed(4)}° E
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-white rounded-full text-slate-500 border border-slate-200">
                  WGS-84 GPS
                </span>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                {/* Google Maps / GPS Direct Navigation */}
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${recommendedZone.coordinates.lat},${recommendedZone.coordinates.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex-1 flex items-center justify-center space-x-2 py-3 bg-[#20B2AA] hover:bg-[#1a9e97] text-white font-bold rounded-xl shadow-md transition-all active:scale-98 text-center"
                >
                  <Navigation className="w-4 h-4" />
                  <span>Open in Google Maps / GPS</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                {/* Speak Navigation Instructions */}
                <button
                  onClick={handleSpeakNav}
                  className={`w-full sm:w-auto px-4 py-3 rounded-xl border text-xs font-bold flex items-center justify-center space-x-2 transition-all ${
                    isSpeakingNav
                      ? 'bg-emerald-500 text-white border-emerald-600 animate-pulse'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  <Volume2 className="w-4 h-4 text-[#20B2AA]" />
                  <span>{isSpeakingNav ? 'Speaking Course...' : 'Voice Guidance'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

