import React, { createContext, useContext, useState, useEffect } from 'react';
import { LanguageCode, TranslationDictionary, translations } from '../i18n/translations';
import { 
  CoastalRegion, 
  COASTAL_REGIONS, 
  FishingZone, 
  ALL_FISHING_ZONES, 
  RiskZone, 
  INITIAL_RISK_ZONES 
} from '../services/marineData';
import { AIService, AIRiskPrediction } from '../services/aiService';

interface VoyageParameters {
  regionId: string;
  date: string;
  time: string;
  purpose: string;
}

interface AppContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: TranslationDictionary;
  
  userName: string;
  setUserName: (name: string) => void;
  
  userRole: 'fisherman' | 'others';
  setUserRole: (role: 'fisherman' | 'others') => void;
  
  selectedRegion: CoastalRegion;
  setSelectedRegion: (region: CoastalRegion) => void;
  
  fishingZones: FishingZone[];
  recommendedZone: FishingZone;
  setRecommendedZone: (zone: FishingZone) => void;
  
  riskZones: RiskZone[];
  
  voyageParams: VoyageParameters;
  setVoyageParams: React.Dispatch<React.SetStateAction<VoyageParameters>>;
  
  isVoiceActive: boolean;
  setIsVoiceActive: (active: boolean) => void;

  // Automated 30-sec Risk Prediction Engine
  riskPrediction: AIRiskPrediction;
  refreshCountdown: number;
  triggerManualRiskRefresh: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Persist language in localStorage
  const [language, setLanguageState] = useState<LanguageCode>(() => {
    const saved = localStorage.getItem('orca_lang');
    return (saved as LanguageCode) || 'en';
  });

  const setLanguage = (lang: LanguageCode) => {
    setLanguageState(lang);
    localStorage.setItem('orca_lang', lang);
  };

  const t = translations[language] || translations.en;

  // User Profile
  const [userName, setUserName] = useState<string>(() => {
    return localStorage.getItem('orca_user_name') || 'Captain Prasad';
  });

  const [userRole, setUserRoleState] = useState<'fisherman' | 'others'>(() => {
    const saved = localStorage.getItem('orca_user_role');
    return (saved as 'fisherman' | 'others') || 'fisherman';
  });

  const setUserRole = (role: 'fisherman' | 'others') => {
    setUserRoleState(role);
    localStorage.setItem('orca_user_role', role);
  };

  // Region and Marine Data
  const [selectedRegion, setSelectedRegionState] = useState<CoastalRegion>(COASTAL_REGIONS[0]);
  
  const getRegionalZones = (regionId: string) => {
    const matched = ALL_FISHING_ZONES.filter(z => z.regionId === regionId);
    return matched.length > 0 ? matched : ALL_FISHING_ZONES.slice(0, 3);
  };

  const [fishingZones, setFishingZones] = useState<FishingZone[]>(() => getRegionalZones(COASTAL_REGIONS[0].id));
  const [recommendedZone, setRecommendedZone] = useState<FishingZone>(() => getRegionalZones(COASTAL_REGIONS[0].id)[0]);
  const [riskZones, setRiskZones] = useState<RiskZone[]>(INITIAL_RISK_ZONES);

  const setSelectedRegion = (reg: CoastalRegion) => {
    setSelectedRegionState(reg);
    const updatedZones = getRegionalZones(reg.id);
    setFishingZones(updatedZones);
    setVoyageParams(prev => ({ ...prev, regionId: reg.id }));
  };

  // Voyage parameters
  const [voyageParams, setVoyageParams] = useState<VoyageParameters>({
    regionId: 'andhra-coast',
    date: new Date().toISOString().split('T')[0],
    time: '05:00',
    purpose: 'commercial'
  });

  // Voice assistant toggle
  const [isVoiceActive, setIsVoiceActive] = useState<boolean>(false);

  // Automated 30-Second Risk Prediction Engine
  const [riskIteration, setRiskIteration] = useState<number>(0);
  const [refreshCountdown, setRefreshCountdown] = useState<number>(30);
  const [riskPrediction, setRiskPrediction] = useState<AIRiskPrediction>(() => 
    AIService.generateLiveRiskPrediction(INITIAL_RISK_ZONES, 0)
  );

  const triggerManualRiskRefresh = () => {
    setRiskIteration(prev => prev + 1);
    setRefreshCountdown(30);
  };

  // Automated 30-second interval ticker without full page reloads
  useEffect(() => {
    const timer = setInterval(() => {
      setRefreshCountdown(prev => {
        if (prev <= 1) {
          setRiskIteration(i => i + 1);
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Recalculate predictions smoothly when riskIteration updates
  useEffect(() => {
    const updated = AIService.generateLiveRiskPrediction(riskZones, riskIteration);
    setRiskPrediction(updated);
    setRiskZones(updated.riskZones);
  }, [riskIteration]);

  // Recalculate recommendation when voyageParams, fishingZones, or language changes
  useEffect(() => {
    const currentRegionalZones = getRegionalZones(voyageParams.regionId);
    const rec = AIService.calculateRecommendation(
      {
        regionId: voyageParams.regionId,
        date: voyageParams.date,
        time: voyageParams.time,
        purpose: voyageParams.purpose,
        language
      },
      currentRegionalZones
    );
    setRecommendedZone(rec);
  }, [voyageParams, language]);

  return (
    <AppContext.Provider
      value={{
        language,
        setLanguage,
        t,
        userName,
        setUserName,
        userRole,
        setUserRole,
        selectedRegion,
        setSelectedRegion,
        fishingZones,
        recommendedZone,
        setRecommendedZone,
        riskZones,
        voyageParams,
        setVoyageParams,
        isVoiceActive,
        setIsVoiceActive,
        riskPrediction,
        refreshCountdown,
        triggerManualRiskRefresh
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
