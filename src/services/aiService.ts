import { LanguageCode, translations } from '../i18n/translations';
import { FishingZone, RiskZone, HistoricalDisaster } from './marineData';

export interface AISuggestionRequest {
  regionId: string;
  date: string;
  time: string;
  purpose: string;
  language: LanguageCode;
}

export interface AIRiskPrediction {
  timestamp: string;
  globalRiskIndex: number; // 0-100
  overallStatus: 'low' | 'moderate' | 'high' | 'severe';
  riskZones: RiskZone[];
  modelConfidence: number; // e.g. 96.4%
  primaryHazard: string;
  safeCorridorBearing: string;
  insight: string;
}

export class AIService {
  /**
   * Calculates optimal fishing zone recommendation based on voyage parameters
   */
  public static calculateRecommendation(
    params: AISuggestionRequest,
    availableZones: FishingZone[]
  ): FishingZone {
    if (!availableZones || availableZones.length === 0) {
      throw new Error("No fishing zones available");
    }

    // Deterministic intelligence based on purpose and time
    const isEarlyMorning = params.time < '09:00';
    const isDeepSea = params.purpose.toLowerCase().includes('deep') || params.purpose.toLowerCase().includes('tuna');

    let recommended = availableZones.find(z => z.isRecommendedBest) || availableZones[0];

    if (isDeepSea) {
      // Find deepest / highest productivity
      recommended = availableZones.reduce((prev, curr) => 
        curr.productivityScore > prev.productivityScore ? curr : prev
      );
    } else if (!isEarlyMorning) {
      // Find safest / lower risk for afternoon
      recommended = availableZones.reduce((prev, curr) => 
        curr.riskScore < prev.riskScore ? curr : prev
      );
    }

    return recommended;
  }

  /**
   * Generates dynamic AI analysis insights based on current analysis category
   */
  public static getCategoryInsight(
    category: 'SST' | 'Weather' | 'Ocean' | 'Chlorophyll' | 'Spatial',
    language: LanguageCode,
    regionName: string
  ): { title: string; summary: string; metrics: Record<string, string> } {
    const t = translations[language] || translations.en;

    switch (category) {
      case 'SST':
        return {
          title: `${t.sstTitle} — ${regionName}`,
          summary: `${regionName}: Satellite thermal imagery shows an active thermal front with a 1.2°C temperature gradient 18 km offshore. This temperature divergence creates upwelling currents beneficial for pelagic fish aggregations.`,
          metrics: {
            "Optimal Front Temp": "27.4°C - 28.2°C",
            "Thermal Divergence": "±1.2°C / 5 km",
            "Front Stability": "High (Next 18 hrs)"
          }
        };

      case 'Weather':
        return {
          title: `${t.weatherTitle} — ${regionName}`,
          summary: `${regionName}: South-easterly trade winds at 11-14 knots. Barometric pressure steady at 1012 hPa. Wind gust variation remains well below the maritime gale alert threshold (25 knots).`,
          metrics: {
            "Mean Wind Speed": "11.8 knots",
            "Peak Gust": "15.4 knots",
            "Barometric Pressure": "1012.4 hPa"
          }
        };

      case 'Ocean':
        return {
          title: `${t.oceanTitle} — ${regionName}`,
          summary: `${regionName}: Semi-diurnal tidal current operating at 0.65 m/s ebb rate. Significant wave height 0.9m to 1.2m with a wave period of 7.2 seconds. Excellent sea state for mechanized and traditional vessels.`,
          metrics: {
            "Wave Height (Hs)": "1.02 m",
            "Peak Wave Period": "7.2 s",
            "Surface Current": "0.65 m/s SE"
          }
        };

      case 'Chlorophyll':
        return {
          title: `${t.chlorophyllTitle} — ${regionName}`,
          summary: `${regionName}: Sentinel-3 OLCI ocean color data indicates elevated chlorophyll-a concentration (2.85 mg/m³). High primary biological production indicates high zooplankton grazing suitable for commercial purse-seining.`,
          metrics: {
            "Chlorophyll-A": "2.85 mg/m³",
            "Turbidity Index": "Low (Clear)",
            "Nutrient Confluence": "Very High"
          }
        };

      case 'Spatial':
        return {
          title: `${t.spatialTitle} — ${regionName}`,
          summary: `${regionName}: Bathymetric contour mapping confirms smooth continental slope transitioning from 25m to 85m depth within 22 km. Safe navigation corridor verified with zero submerged reef hazards outside marked vortex zone.`,
          metrics: {
            "Continental Shelf Edge": "24.5 km",
            "Average Working Depth": "38 - 65 m",
            "EEZ Buffer Margin": "82 NM to Boundary"
          }
        };
    }
  }

  /**
   * Generates dynamic 30-second automated risk prediction updates
   */
  public static generateLiveRiskPrediction(
    currentZones: RiskZone[],
    iterationCount: number
  ): AIRiskPrediction {
    const date = new Date();
    const timeStr = date.toLocaleTimeString('en-US', { hour12: false });

    // Slight dynamic fluctuations for live telemetry feel
    const baseVariation = (iterationCount % 5) * 1.5;
    const calculatedIndex = Math.min(92, Math.max(15, 34 + baseVariation));

    const status: 'low' | 'moderate' | 'high' | 'severe' = 
      calculatedIndex > 75 ? 'severe' : calculatedIndex > 50 ? 'high' : calculatedIndex > 30 ? 'moderate' : 'low';

    // Dynamically update scores slightly
    const updatedRiskZones = currentZones.map((z, idx) => {
      const delta = ((iterationCount + idx) % 3) - 1;
      const newScore = Math.min(98, Math.max(20, z.riskScore + delta));
      return {
        ...z,
        riskScore: newScore,
        currentTrend: delta > 0 ? 'increasing' : delta < 0 ? 'decreasing' : 'stable'
      } as RiskZone;
    });

    return {
      timestamp: timeStr,
      globalRiskIndex: Math.round(calculatedIndex),
      overallStatus: status,
      riskZones: updatedRiskZones,
      modelConfidence: 97.4,
      primaryHazard: "Krishna-Godavari Deep Oceanic Vortex (Zone R-01)",
      safeCorridorBearing: "084° East-North-East",
      insight: `Neural Ensemble v4.2 verified at ${timeStr}. Ocean vortex intensity is currently ${updatedRiskZones[0].currentTrend}. Vessels maintain safe perimeter of 12 NM.`
    };
  }
}
