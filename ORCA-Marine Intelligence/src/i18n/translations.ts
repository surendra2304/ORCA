export type LanguageCode = 
  | 'en' // English
  | 'te' // Telugu
  | 'hi' // Hindi
  | 'ta' // Tamil
  | 'ml' // Malayalam
  | 'bn' // Bengali
  | 'or' // Odia
  | 'kn' // Kannada
  | 'pa'; // Punjabi

export interface LanguageOption {
  code: LanguageCode;
  name: string;
  nativeName: string;
  region: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English', region: 'Global' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', region: 'Andhra Pradesh & Telangana' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', region: 'National' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', region: 'Tamil Nadu' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', region: 'Kerala' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', region: 'West Bengal' },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', region: 'Odisha' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', region: 'Karnataka' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', region: 'Northern Coastal Units' },
];

export interface TranslationDictionary {
  // Brand & Welcome
  appName: string;
  appSubtitle: string;
  welcomeHeading: string;
  welcomeSubtitle: string;
  getStarted: string;
  languageSelectionTitle: string;
  languageSelectionSubtitle: string;
  continueBtn: string;
  selectLanguagePrompt: string;

  // Onboarding Page 3
  userDetailsTitle: string;
  userDetailsSubtitle: string;
  fullNameLabel: string;
  fullNamePlaceholder: string;
  selectRoleLabel: string;
  roleFisherman: string;
  roleFishermanDesc: string;
  roleOthers: string;
  roleOthersDesc: string;
  startExperienceBtn: string;

  // Navigation
  navHome: string;
  navFishing: string;
  navProductivity: string;
  navAnalysis: string;
  navDisasters: string;
  navRiskPrediction: string;
  roleBadgeFisherman: string;
  roleBadgeOthers: string;

  // Page 4: Role-Based Home
  voiceAssistantTitle: string;
  voiceAssistantGreeting: string;
  voiceListening: string;
  voiceTapToSpeak: string;
  voiceSwitchToManual: string;
  voiceQuestionRegion: string;
  voiceQuestionDate: string;
  voiceQuestionTime: string;
  voiceQuestionPurpose: string;
  voiceDonePrompt: string;
  voiceListeningStatus: string;

  manualInputTitle: string;
  manualInputSubtitle: string;
  regionLabel: string;
  dateLabel: string;
  timeLabel: string;
  purposeLabel: string;
  analyzeBtn: string;

  // Purposes
  purposeCommercial: string;
  purposeDeepSea: string;
  purposeCoastal: string;
  purposeTuna: string;
  purposeSardine: string;

  // Others Dashboard Elements (Page 4)
  dashboardOverviewTitle: string;
  currentLocationLabel: string;
  topRiskZonesTitle: string;
  highProductivityZonesTitle: string;
  marineIntelligenceHub: string;
  viewDetails: string;
  nationalContext: string;

  // Page 5: Recommendations
  bestFishingZoneTitle: string;
  recommendedBestZone: string;
  distanceFromUser: string;
  bestTimeToGo: string;
  riskLevel: string;
  weatherCondition: string;
  productivityLevel: string;
  aiRecommendationTitle: string;
  aiInsightFishingZone: string;
  allActiveZones: string;
  todayBestZones: string;
  navigateZone: string;
  safetyConfirmed: string;

  // Risk Levels
  riskLow: string;
  riskModerate: string;
  riskHigh: string;
  riskSevere: string;

  // Productivity Levels
  prodHigh: string;
  prodModerate: string;
  prodLow: string;

  // Page 6: Productivity Analysis
  productivityAnalysisTitle: string;
  todayProductivityScore: string;
  productivityTrendTitle: string;
  topProductivityZonesIndia: string;
  aiProductivityInsight: string;
  hourlyProductivity: string;
  catchForecast: string;
  speciesAggregation: string;

  // Page 7-11: Marine Analysis
  marineAnalysisTitle: string;
  categorySST: string;
  categoryWeather: string;
  categoryOcean: string;
  categoryChlorophyll: string;
  categorySpatial: string;

  sstTitle: string;
  sstDesc: string;
  weatherTitle: string;
  weatherDesc: string;
  oceanTitle: string;
  oceanDesc: string;
  chlorophyllTitle: string;
  chlorophyllDesc: string;
  spatialTitle: string;
  spatialDesc: string;

  windSpeed: string;
  seaTemperature: string;
  waveHeight: string;
  tideVelocity: string;
  chlorophyllDensity: string;
  eezBoundary: string;
  bathymetryDepth: string;

  // Page 12: Historical Disaster Analysis
  disasterAnalysisTitle: string;
  selectDisasterPeriod: string;
  selectRegionDisaster: string;
  topDisastersIdentified: string;
  disasterType: string;
  damageLevel: string;
  impactAssessment: string;
  affectedMarineAreas: string;
  analyticalTrends: string;
  aiDisasterInsights: string;
  vesselsAffected: string;
  portClosures: string;
  cycloneMichaung: string;
  cycloneAsani: string;
  cycloneGulab: string;
  tsunami2004: string;
  superCyclone1999: string;

  // Page 13: Risk Prediction
  riskPredictionTitle: string;
  aiPredictionModel: string;
  riskStatusLive: string;
  automatedModelActive: string;
  nextRefreshIn: string;
  secondsSuffix: string;
  lastUpdatedNow: string;
  aiPredictionInsights: string;
  topHazardZones: string;
  safetyNotice: string;
  maritimeAdvisory: string;

  // Common UI
  kmUnit: string;
  celsiusUnit: string;
  knotsUnit: string;
  metersUnit: string;
  coordinatesLabel: string;
  liveStatus: string;
  activeStatus: string;
  close: string;
}

export const translations: Record<LanguageCode, TranslationDictionary> = {
  en: {
    appName: "ORCA Marine Intelligence",
    appSubtitle: "AI-Powered Marine Intelligence & Fishing Assistance",
    welcomeHeading: "ORCA Marine Intelligence",
    welcomeSubtitle: "Real-Time Maritime Analytics, Oceanographic Intelligence & Fishing Zone Assistance",
    getStarted: "Get Started",
    languageSelectionTitle: "Select Language",
    languageSelectionSubtitle: "Choose your preferred language for complete application access",
    continueBtn: "Continue",
    selectLanguagePrompt: "Select one language to proceed",

    userDetailsTitle: "User Profile & Role",
    userDetailsSubtitle: "Provide your name and select your operational role",
    fullNameLabel: "Full Name",
    fullNamePlaceholder: "Enter your full name",
    selectRoleLabel: "Select Role",
    roleFisherman: "Fisherman",
    roleFishermanDesc: "Personalized voice assistant, direct fishing recommendations, hazard alerts",
    roleOthers: "Others / Maritime Officers",
    roleOthersDesc: "National intelligence, SST, weather, chlorophyll, disaster & spatial analytics",
    startExperienceBtn: "Launch ORCA Intelligence",

    navHome: "Home",
    navFishing: "Fishing",
    navProductivity: "Productivity",
    navAnalysis: "Analysis",
    navDisasters: "Disasters",
    navRiskPrediction: "Risk Prediction",
    roleBadgeFisherman: "Fisherman",
    roleBadgeOthers: "Maritime Analyst",

    voiceAssistantTitle: "ORCA Voice Assistant",
    voiceAssistantGreeting: "Hello! I am your ORCA Marine Assistant. Where would you like to fish?",
    voiceListening: "Listening... Speak clearly",
    voiceTapToSpeak: "Tap to Speak",
    voiceSwitchToManual: "Switch to Manual Input",
    voiceQuestionRegion: "Which coastal region or port are you departing from?",
    voiceQuestionDate: "What date are you planning your voyage?",
    voiceQuestionTime: "What departure time do you intend?",
    voiceQuestionPurpose: "What is your primary fishing or voyage purpose?",
    voiceDonePrompt: "All inputs captured! Tap Analyze to inspect optimal marine zones.",
    voiceListeningStatus: "Voice Assistant Active",

    manualInputTitle: "Voyage Parameters",
    manualInputSubtitle: "Specify departure parameters to calculate marine zones",
    regionLabel: "Coastal Region",
    dateLabel: "Voyage Date",
    timeLabel: "Departure Time",
    purposeLabel: "Operation Purpose",
    analyzeBtn: "Analyze Marine Zones",

    purposeCommercial: "Commercial Trawling",
    purposeDeepSea: "Deep Sea Pelagic",
    purposeCoastal: "Coastal Artisanal",
    purposeTuna: "Tuna Longline",
    purposeSardine: "Sardine & Mackerel",

    dashboardOverviewTitle: "National Marine Intelligence",
    currentLocationLabel: "Current Marine Base",
    topRiskZonesTitle: "Top Maritime Risk Zones (India)",
    highProductivityZonesTitle: "High Productivity Marine Zones",
    marineIntelligenceHub: "ORCA Intelligence Core",
    viewDetails: "View Details",
    nationalContext: "Default Context: Indian Coastline & EEZ",

    bestFishingZoneTitle: "Fishing Zone Recommendation",
    recommendedBestZone: "Recommended Best Fishing Zone",
    distanceFromUser: "Distance from Coast",
    bestTimeToGo: "Optimal Fishing Window",
    riskLevel: "Maritime Risk Level",
    weatherCondition: "Weather Condition",
    productivityLevel: "Fish Aggregation Potential",
    aiRecommendationTitle: "AI Marine Recommendation",
    aiInsightFishingZone: "Thermal front confluence detected 18.4 km offshore. Optimal chlorophyll gradient with calm sea swell.",
    allActiveZones: "Active Fishing Zones in Region",
    todayBestZones: "Today's Top Fishing Zones",
    navigateZone: "Set Course",
    safetyConfirmed: "Safe Marine Conditions",

    riskLow: "Low Risk",
    riskModerate: "Moderate Risk",
    riskHigh: "High Risk",
    riskSevere: "Severe Hazard",

    prodHigh: "High Productivity (94%)",
    prodModerate: "Moderate Productivity (68%)",
    prodLow: "Low Productivity (32%)",

    productivityAnalysisTitle: "Productivity Analysis",
    todayProductivityScore: "Today's Overall Productivity Score",
    productivityTrendTitle: "Marine Productivity & Biomass Curve",
    topProductivityZonesIndia: "Top Productivity Zones in India",
    aiProductivityInsight: "Chlorophyll-A upwelling off Andhra coast indicates 38% increase in pelagic school aggregation.",
    hourlyProductivity: "Hourly Productivity Probability",
    catchForecast: "Catch Forecast",
    speciesAggregation: "Dominant Species Aggregation",

    marineAnalysisTitle: "Marine Analysis Suite",
    categorySST: "SST",
    categoryWeather: "Weather",
    categoryOcean: "Ocean",
    categoryChlorophyll: "Chlorophyll",
    categorySpatial: "Spatial",

    sstTitle: "Sea Surface Temperature (SST)",
    sstDesc: "Thermal gradients and oceanic front detection",
    weatherTitle: "Marine Meteorology & Wind",
    weatherDesc: "Wind barbs, gust velocities and atmospheric pressure",
    oceanTitle: "Ocean Currents & Tides",
    oceanDesc: "Wave vector simulation, tidal surge and current velocities",
    chlorophyllTitle: "Chlorophyll-A Concentration",
    chlorophyllDesc: "Phytoplankton bloom detection and biological feeding corridors",
    spatialTitle: "Spatial Bathymetry & Maritime Boundaries",
    spatialDesc: "Depth contours, continental shelf lines and safe navigational channels",

    windSpeed: "Wind Speed",
    seaTemperature: "Sea Surface Temp",
    waveHeight: "Wave Height",
    tideVelocity: "Tidal Current",
    chlorophyllDensity: "Chlorophyll Density",
    eezBoundary: "EEZ Boundary Limit",
    bathymetryDepth: "Water Depth",

    disasterAnalysisTitle: "Disaster & Historical Period Analysis",
    selectDisasterPeriod: "Select Historical Cyclone / Event",
    selectRegionDisaster: "Filter Coastal Region",
    topDisastersIdentified: "Recorded Severe Disasters",
    disasterType: "Disaster Classification",
    damageLevel: "Severity & Damage Level",
    impactAssessment: "Maritime Impact Assessment",
    affectedMarineAreas: "Affected Maritime Areas",
    analyticalTrends: "Historical Storm Intensity & Wave Surge Trend",
    aiDisasterInsights: "AI Disaster Reconstruction & Vulnerability Matrix",
    vesselsAffected: "Vessels Stranded / Rescued",
    portClosures: "Port Operations Suspended",
    cycloneMichaung: "Cyclone Michaung (2023)",
    cycloneAsani: "Cyclone Asani (2022)",
    cycloneGulab: "Cyclone Gulab (2021)",
    tsunami2004: "Indian Ocean Tsunami (2004)",
    superCyclone1999: "Odisha Super Cyclone (1999)",

    riskPredictionTitle: "Automated Maritime Risk Prediction",
    aiPredictionModel: "Ensemble Marine Neural Risk Model v4.2",
    riskStatusLive: "Current Live Marine Risk Status",
    automatedModelActive: "Automated Real-Time Refresh Active",
    nextRefreshIn: "Auto-refreshing in",
    secondsSuffix: "seconds",
    lastUpdatedNow: "Predictions dynamically verified",
    aiPredictionInsights: "AI Risk Assessment & Anomaly Detection",
    topHazardZones: "Top Risk Zones Ranked by Hazard Score",
    safetyNotice: "Navigational Safety Advisory",
    maritimeAdvisory: "Vessels advised to steer 12 nautical miles clear of southern oceanic vortex.",

    kmUnit: "km",
    celsiusUnit: "°C",
    knotsUnit: "knots",
    metersUnit: "m",
    coordinatesLabel: "Coordinates",
    liveStatus: "LIVE",
    activeStatus: "ACTIVE",
    close: "Close"
  },

  te: {
    appName: "ఓర్కా మెరైన్ ఇంటెలిజెన్స్",
    appSubtitle: "ఏఐ ఆధారిత సముద్ర సమాచారం & మత్స్యకారుల సహాయక వేదిక",
    welcomeHeading: "ఓర్కా మెరైన్ ఇంటెలిజెన్స్",
    welcomeSubtitle: "నిజ-సమయ సముద్ర విశ్లేషణ, ఉపగ్రహ సమాచారం మరియు చేపల వేట జోన్ల సూచనలు",
    getStarted: "ప్రారంభించండి",
    languageSelectionTitle: "భాషను ఎంచుకోండి",
    languageSelectionSubtitle: "అప్లికేషన్ ఉపయోగించడానికి మీ ప్రాధాన్యత భాషను ఎంచుకోండి",
    continueBtn: "కొనసాగించండి",
    selectLanguagePrompt: "కొనసాగడానికి ఒక భాషను ఎంచుకోండి",

    userDetailsTitle: "వినియోగదారు వివరాలు & పాత్ర",
    userDetailsSubtitle: "మీ పేరు నమోదు చేసి మీ పాత్రను ఎంచుకోండి",
    fullNameLabel: "పూర్తి పేరు",
    fullNamePlaceholder: "మీ పూర్తి పేరు రాయండి",
    selectRoleLabel: "పాత్రను ఎంచుకోండి",
    roleFisherman: "మత్స్యకారుడు (Fisherman)",
    roleFishermanDesc: "వ్యక్తిగత వాయిస్ అసిస్టెంట్, నేరుగా చేపల జోన్లు, సముద్ర ప్రమాద హెచ్చరికలు",
    roleOthers: "ఇతరులు / సముద్ర అధికారులు",
    roleOthersDesc: "జాతీయ సముద్ర నిఘా, ఉష్ణోగ్రత, వాతావరణం, క్లోరోఫిల్, విపత్తు విశ్లేషణ",
    startExperienceBtn: "ఓర్కా ప్రారంభించండి",

    navHome: "హోమ్",
    navFishing: "చేపల వేట",
    navProductivity: "ఉత్పాదకత",
    navAnalysis: "సముద్ర విశ్లేషణ",
    navDisasters: "విపత్తులు",
    navRiskPrediction: "ప్రమాద అంచనా",
    roleBadgeFisherman: "మత్స్యకారుడు",
    roleBadgeOthers: "మెరైన్ అధికారి",

    voiceAssistantTitle: "ఓర్కా వాయిస్ అసిస్టెంట్",
    voiceAssistantGreeting: "నమస్కారం! నేను మీ ఓర్కా మెరైన్ అసిస్టెంట్. మీరు ఎక్కడ చేపల వేటకు వెళ్లాలనుకుంటున్నారు?",
    voiceListening: "వింటున్నాను... స్పష్టంగా మాట్లాడండి",
    voiceTapToSpeak: "మాట్లాడటానికి నొక్కండి",
    voiceSwitchToManual: "మాన్యువల్ ఎంపికకు మారండి",
    voiceQuestionRegion: "మీరు ఏ తీరప్రాంతం లేదా ఓడరేవు నుండి బయలుదేరుతున్నారు?",
    voiceQuestionDate: "మీ ప్రయాణ తేదీ ఏమిటి?",
    voiceQuestionTime: "మీరు బయలుదేరే సమయం ఏమిటి?",
    voiceQuestionPurpose: "మీ వేట యొక్క ముఖ్య ఉద్దేశ్యం ఏమిటి?",
    voiceDonePrompt: "అన్ని వివరాలు నమోదు చేయబడ్డాయి! విశ్లేషణ కోసం నొక్కండి.",
    voiceListeningStatus: "వాయిస్ అసిస్టెంట్ చురుకుగా ఉంది",

    manualInputTitle: "ప్రయాణ వివరాలు",
    manualInputSubtitle: "అనుకూల జోన్ల గుర్తింపు కోసం వివరాలు నమోదు చేయండి",
    regionLabel: "తీర ప్రాంతం",
    dateLabel: "ప్రయాణ తేదీ",
    timeLabel: "బయలుదేరే సమయం",
    purposeLabel: "వేట రకం",
    analyzeBtn: "సముద్ర జోన్లను విశ్లేషించండి",

    purposeCommercial: "వాణిజ్య ట్రాలింగ్",
    purposeDeepSea: "లోతైన సముద్ర వేట",
    purposeCoastal: "తీరప్రాంత సాంప్రదాయ వేట",
    purposeTuna: "టూనా చేపల వేట",
    purposeSardine: "కవ్వళ్ళు & మత్స్య సంపద",

    dashboardOverviewTitle: "జాతీయ సముద్ర నిఘా సమాచారం",
    currentLocationLabel: "ప్రస్తుత కేంద్రం",
    topRiskZonesTitle: "భారతదేశ అగ్ర ప్రమాదకర సముద్ర జోన్లు",
    highProductivityZonesTitle: "అధిక చేపల ఉత్పాదక జోన్లు",
    marineIntelligenceHub: "ఓర్కా ఇంటెలిజెన్స్ కేంద్రం",
    viewDetails: "వివరాలు చూడండి",
    nationalContext: "భారత తీర ప్రాంతం & ప్రత్యేక ఆర్థిక మండలి",

    bestFishingZoneTitle: "చేపల జోన్ సిఫార్సు",
    recommendedBestZone: "అత్యుత్తమ చేపల వేట జోన్",
    distanceFromUser: "తీరం నుండి దూరం",
    bestTimeToGo: "వేటకు సరైన సమయం",
    riskLevel: "ప్రమాద తీవ్రత",
    weatherCondition: "వాతావరణ పరిస్థితి",
    productivityLevel: "చేపల లభ్యత సంభావ్యత",
    aiRecommendationTitle: "ఏఐ సముద్ర సిఫార్సు",
    aiInsightFishingZone: "తీరానికి 18.4 కి.మీ దూరంలో ఉష్ణోగ్రత సమన్వయం ఉంది. క్లోరోఫిల్ అధికంగా ఉండటంతో చేపలు పుష్కలంగా లభిస్తాయి.",
    allActiveZones: "ప్రాంతంలోని క్రియాశీల జోన్లు",
    todayBestZones: "నేటి అగ్ర చేపల జోన్లు",
    navigateZone: "దిశను నిర్ణయించండి",
    safetyConfirmed: "సురక్షిత సముద్ర పరిస్థితులు",

    riskLow: "తక్కువ ప్రమాదం",
    riskModerate: "మధ్యస్థ ప్రమాదం",
    riskHigh: "అధిక ప్రమాదం",
    riskSevere: "తీవ్ర హెచ్చరిక",

    prodHigh: "అధిక ఉత్పాదకత (94%)",
    prodModerate: "మధ్యస్థ ఉత్పాదకత (68%)",
    prodLow: "తక్కువ ఉత్పాదకత (32%)",

    productivityAnalysisTitle: "ఉత్పాదకత విశ్లేషణ",
    todayProductivityScore: "నేటి సగటు ఉత్పాదకత స్కోరు",
    productivityTrendTitle: "సముద్ర ఉత్పాదకత ధోరణి",
    topProductivityZonesIndia: "భారతదేశ అగ్ర ఉత్పాదక జోన్లు",
    aiProductivityInsight: "ఆంధ్రప్రదేశ్ తీరంలో క్లోరోఫిల్ పెరగడం వల్ల చేపల గుంపులు 38% అధికంగా ఉండే అవకాశం ఉంది.",
    hourlyProductivity: "గంటల వారీ ఉత్పాదకత",
    catchForecast: "చేపల లభ్యత అంచనా",
    speciesAggregation: "ప్రధాన చేపల రకాలు",

    marineAnalysisTitle: "సముద్ర విశ్లేషణ సూట్",
    categorySST: "ఎస్.ఎస్.టి (ఉష్ణోగ్రత)",
    categoryWeather: "వాతావరణం",
    categoryOcean: "సముద్ర ప్రవాహం",
    categoryChlorophyll: "క్లోరోఫిల్",
    categorySpatial: "ప్రాదేశిక లోతు",

    sstTitle: "సముద్ర ఉపరితల ఉష్ణోగ్రత (SST)",
    sstDesc: "సముద్ర ఉష్ణ ప్రవాహాలు మరియు ఉష్ణోగ్రత సరిహద్దులు",
    weatherTitle: "సముద్ర వాతావరణం & గాలి",
    weatherDesc: "గాలి వేగం, దిశ మరియు వాతావరణ పీడనం",
    oceanTitle: "సముద్ర అలలు & పోటుపాటులు",
    oceanDesc: "అలల ఎత్తు, ప్రవాహ వేగం మరియు తరంగాల తీవ్రత",
    chlorophyllTitle: "క్లోరోఫిల్-ఎ సాంద్రత",
    chlorophyllDesc: "ప్లాంక్టన్ పుష్కలత మరియు చేపల ఆహార మండలాలు",
    spatialTitle: "సముద్ర లోతు & ప్రాదేశిక సరిహద్దులు",
    spatialDesc: "బాతిమెట్రీ లోతు మరియు సురక్షిత నావిగేషన్ మార్గాలు",

    windSpeed: "గాలి వేగం",
    seaTemperature: "సముద్ర ఉష్ణోగ్రత",
    waveHeight: "అలల ఎత్తు",
    tideVelocity: "ప్రవాహ వేగం",
    chlorophyllDensity: "క్లోరోఫిల్ సాంద్రత",
    eezBoundary: "సముద్ర ఆర్థిక సరిహద్దు",
    bathymetryDepth: "నీటి లోతు",

    disasterAnalysisTitle: "విపత్తు & చారిత్రక విశ్లేషణ",
    selectDisasterPeriod: "చారిత్రక తుఫాను ఎంచుకోండి",
    selectRegionDisaster: "తీర ప్రాంతాన్ని ఎంచుకోండి",
    topDisastersIdentified: "నమోదైన తీవ్ర విపత్తులు",
    disasterType: "విపత్తు వర్గీకరణ",
    damageLevel: "నష్టం తీవ్రత",
    impactAssessment: "సముద్ర ప్రభావ అంచనా",
    affectedMarineAreas: "ప్రభావిత సముద్ర ప్రాంతాలు",
    analyticalTrends: "తుఫాను తీవ్రత & అలల ఉధృతి గ్రాఫ్",
    aiDisasterInsights: "ఏఐ విపత్తు పునర్నిర్మాణ సమాచారం",
    vesselsAffected: "చిక్కుకున్న / రక్షించబడిన పడవలు",
    portClosures: "మూసివేసిన ఓడరేవులు",
    cycloneMichaung: "మిచౌంగ్ తుఫాను (2023)",
    cycloneAsani: "అసాని తుఫాను (2022)",
    cycloneGulab: "గులాబ్ తుఫాను (2021)",
    tsunami2004: "హిందూ మహాసముద్ర సునామీ (2004)",
    superCyclone1999: "ఒడిశా సూపర్ సైక్లోన్ (1999)",

    riskPredictionTitle: "స్వయంకలిత సముద్ర ప్రమాద అంచనా",
    aiPredictionModel: "ఏఐ మెరైన్ న్యూరల్ రిస్క్ మోడల్ v4.2",
    riskStatusLive: "ప్రస్తుత సజీవ ప్రమాద స్థితి",
    automatedModelActive: "స్వయంకలిత నిజ-సమయ అప్‌డేట్ యాక్టివ్",
    nextRefreshIn: "తదుపరి తాజాకరణ",
    secondsSuffix: "సెకన్లలో",
    lastUpdatedNow: "అంచనాలు ప్రత్యక్షంగా నవీకరించబడ్డాయి",
    aiPredictionInsights: "ఏఐ ప్రమాద విశ్లేషణ నివేదిక",
    topHazardZones: "అత్యంత ప్రమాదకర జోన్ల జాబితా",
    safetyNotice: "నావిగేషన్ భద్రతా హెచ్చరిక",
    maritimeAdvisory: "దక్షిణ సముద్ర సుడిగుండం నుండి పడవలు 12 నాటికల్ మైళ్ళ దూరం పాటించాలి.",

    kmUnit: "కి.మీ",
    celsiusUnit: "°C",
    knotsUnit: "నాట్స్",
    metersUnit: "మీటర్లు",
    coordinatesLabel: "అక్షాంశ రేఖాంశాలు",
    liveStatus: "లైవ్",
    activeStatus: "యాక్టివ్",
    close: "మూసివేయి"
  },

  hi: {
    appName: "ओर्का समुद्री खुफिया",
    appSubtitle: "एआई संचालित समुद्री विश्लेषण एवं मत्स्य पालन सहायता",
    welcomeHeading: "ओर्का मरीन इंटेलिजेंस",
    welcomeSubtitle: "वास्तविक समय समुद्री विश्लेषण, समुद्र विज्ञान और मछली पकड़ने के क्षेत्र की सहायता",
    getStarted: "प्रारंभ करें",
    languageSelectionTitle: "भाषा चुनें",
    languageSelectionSubtitle: "पूर्ण ऐप्लिकेशन उपयोग के लिए अपनी पसंदीदा भाषा चुनें",
    continueBtn: "जारी रखें",
    selectLanguagePrompt: "आगे बढ़ने के लिए एक भाषा चुनें",

    userDetailsTitle: "उपयोगकर्ता विवरण एवं भूमिका",
    userDetailsSubtitle: "अपना नाम दर्ज करें और अपनी परिचालन भूमिका चुनें",
    fullNameLabel: "पूरा नाम",
    fullNamePlaceholder: "अपना पूरा नाम लिखें",
    selectRoleLabel: "भूमिका चुनें",
    roleFisherman: "मछुआरा (Fisherman)",
    roleFishermanDesc: "व्यक्तिगत वॉयस सहायक, सर्वोत्तम मछली पकड़ने के क्षेत्र, खतरा चेतावनी",
    roleOthers: "अन्य / समुद्री अधिकारी",
    roleOthersDesc: "राष्ट्रीय समुद्री खुफिया, तापमान, मौसम, क्लोरोफिल, आपदा विश्लेषण",
    startExperienceBtn: "ओर्का शुरू करें",

    navHome: "होम",
    navFishing: "मत्स्य पालन",
    navProductivity: "उत्पादकता",
    navAnalysis: "समुद्री विश्लेषण",
    navDisasters: "आपदाएं",
    navRiskPrediction: "जोखिम भविष्यवाणी",
    roleBadgeFisherman: "मछुआरा",
    roleBadgeOthers: "समुद्री विश्लेषक",

    voiceAssistantTitle: "ओर्का वॉयस असिस्टेंट",
    voiceAssistantGreeting: "नमस्ते! मैं आपका ओर्का मरीन असिस्टेंट हूँ। आप कहाँ मछली पकड़ने जाना चाहते हैं?",
    voiceListening: "सुन रहा हूँ... स्पष्ट रूप से बोलें",
    voiceTapToSpeak: "बोलने के लिए दबाएं",
    voiceSwitchToManual: "मैनुअल इनपुट पर जाएं",
    voiceQuestionRegion: "आप किस तटीय क्षेत्र या बंदरगाह से रवाना हो रहे हैं?",
    voiceQuestionDate: "आपकी यात्रा की तिथि क्या है?",
    voiceQuestionTime: "आप किस समय रवाना होना चाहते हैं?",
    voiceQuestionPurpose: "आपकी मत्स्य यात्रा का मुख्य उद्देश्य क्या है?",
    voiceDonePrompt: "सभी विवरण दर्ज कर लिए गए हैं! विश्लेषण के लिए दबाएं।",
    voiceListeningStatus: "वॉयस असिस्टेंट सक्रिय है",

    manualInputTitle: "यात्रा पैरामीटर",
    manualInputSubtitle: "इष्टतम समुद्री क्षेत्र खोजने के लिए विवरण दर्ज करें",
    regionLabel: "तटीय क्षेत्र",
    dateLabel: "यात्रा तिथि",
    timeLabel: "प्रस्थान समय",
    purposeLabel: "मत्स्य उद्देश्य",
    analyzeBtn: "समुद्री क्षेत्रों का विश्लेषण करें",

    purposeCommercial: "व्यावसायिक ट्रॉलिंग",
    purposeDeepSea: "गहरे समुद्र में शिकार",
    purposeCoastal: "तटीय पारंपरिक मत्स्य",
    purposeTuna: "टूना मछली शिकार",
    purposeSardine: "सार्डिन एवं अन्य",

    dashboardOverviewTitle: "राष्ट्रीय समुद्री खुफिया जानकारी",
    currentLocationLabel: "वर्तमान समुद्री आधार",
    topRiskZonesTitle: "भारत के शीर्ष जोखिम समुद्री क्षेत्र",
    highProductivityZonesTitle: "उच्च उत्पादकता समुद्री क्षेत्र",
    marineIntelligenceHub: "ओर्का इंटेलिजेंस कोर",
    viewDetails: "विवरण देखें",
    nationalContext: "भारतीय तटरेखा एवं विशेष आर्थिक क्षेत्र",

    bestFishingZoneTitle: "मत्स्य क्षेत्र अनुशंसा",
    recommendedBestZone: "अनुशंसित सर्वोत्तम मत्स्य क्षेत्र",
    distanceFromUser: "तट से दूरी",
    bestTimeToGo: "सर्वोत्तम समय",
    riskLevel: "समुद्री जोखिम स्तर",
    weatherCondition: "मौसम की स्थिति",
    productivityLevel: "मछली मिलने की संभावना",
    aiRecommendationTitle: "एआई समुद्री अनुशंसा",
    aiInsightFishingZone: "तट से 18.4 किमी दूर थर्मल फ्रंट संगम पाया गया है। प्रचुर क्लोरोफिल और शांत समुद्र उपलब्ध है।",
    allActiveZones: "क्षेत्र के सभी सक्रिय मत्स्य क्षेत्र",
    todayBestZones: "आज के शीर्ष मत्स्य क्षेत्र",
    navigateZone: "दिशा निर्धारित करें",
    safetyConfirmed: "सुरक्षित समुद्री स्थिति",

    riskLow: "कम जोखिम",
    riskModerate: "मध्यम जोखिम",
    riskHigh: "उच्च जोखिम",
    riskSevere: "गंभीर चेतावनी",

    prodHigh: "उच्च उत्पादकता (94%)",
    prodModerate: "मध्यम उत्पादकता (68%)",
    prodLow: "कम उत्पादकता (32%)",

    productivityAnalysisTitle: "उत्पादकता विश्लेषण",
    todayProductivityScore: "आज का समग्र उत्पादकता स्कोर",
    productivityTrendTitle: "समुद्री उत्पादकता एवं बायोमास वक्र",
    topProductivityZonesIndia: "भारत के शीर्ष उत्पादक क्षेत्र",
    aiProductivityInsight: "तटीय उपवेलिंग के कारण पेलाजिक मछलियों के समूह में 38% की वृद्धि का अनुमान है।",
    hourlyProductivity: "प्रति घंटा उत्पादकता",
    catchForecast: "मछली पकड़ने का पूर्वानुमान",
    speciesAggregation: "प्रमुख मछली प्रजातियां",

    marineAnalysisTitle: "समुद्री विश्लेषण सूट",
    categorySST: "एसएसटी (तापमान)",
    categoryWeather: "मौसम",
    categoryOcean: "समुद्री धाराएं",
    categoryChlorophyll: "क्लोरोफिल",
    categorySpatial: "स्थानिक गहराई",

    sstTitle: "समुद्र की सतह का तापमान (SST)",
    sstDesc: "थर्मल ग्रेडिएंट और समुद्री धारा सीमाएं",
    weatherTitle: "समुद्री मौसम एवं हवा",
    weatherDesc: "हवा की गति, झोंके और वायुमंडलीय दबाव",
    oceanTitle: "समुद्री धाराएं और ज्वार-भाटा",
    oceanDesc: "लहरों की ऊंचाई, ज्वारीय गति और धारा प्रवाह",
    chlorophyllTitle: "क्लोरोफिल-ए सांद्रता",
    chlorophyllDesc: "पादप प्लवक प्रचुरता और मछलियों के भोजन क्षेत्र",
    spatialTitle: "स्थानिक गहराई और समुद्री सीमाएं",
    spatialDesc: "जल की गहराई और सुरक्षित नौवहन चैनल",

    windSpeed: "हवा की गति",
    seaTemperature: "समुद्र का तापमान",
    waveHeight: "लहर की ऊंचाई",
    tideVelocity: "ज्वारीय धारा",
    chlorophyllDensity: "क्लोरोफिल घनत्व",
    eezBoundary: "ईईजेड समुद्री सीमा",
    bathymetryDepth: "पानी की गहराई",

    disasterAnalysisTitle: "आपदा एवं ऐतिहासिक विश्लेषण",
    selectDisasterPeriod: "ऐतिहासिक चक्रवात चुनें",
    selectRegionDisaster: "तटीय क्षेत्र चुनें",
    topDisastersIdentified: "दर्ज की गई गंभीर आपदाएं",
    disasterType: "आपदा वर्गीकरण",
    damageLevel: "क्षति स्तर",
    impactAssessment: "समुद्री प्रभाव मूल्यांकन",
    affectedMarineAreas: "प्रभावित समुद्री क्षेत्र",
    analyticalTrends: "तूफान की तीव्रता एवं लहर वृद्धि का रुझान",
    aiDisasterInsights: "एआई आपदा पुनर्निर्माण जानकारी",
    vesselsAffected: "फंसी / बचाई गई नावें",
    portClosures: "बंद किए गए बंदरगाह",
    cycloneMichaung: "चक्रवात मिचौंग (2023)",
    cycloneAsani: "चक्रवात असानी (2022)",
    cycloneGulab: "चक्रवात गुलाब (2021)",
    tsunami2004: "हिंद महासागर सुनामी (2004)",
    superCyclone1999: "ओडिशा सुपर साइक्लोन (1999)",

    riskPredictionTitle: "स्वचालित समुद्री जोखिम भविष्यवाणी",
    aiPredictionModel: "एआई मरीन न्यूरल रिस्क मॉडल v4.2",
    riskStatusLive: "वर्तमान लाइव समुद्री जोखिम स्थिति",
    automatedModelActive: "स्वचालित वास्तविक समय अद्यतन सक्रिय",
    nextRefreshIn: "स्वतः रीफ्रेश",
    secondsSuffix: "सेकंड में",
    lastUpdatedNow: "भविष्यवाणियां लाइव अद्यतन की गईं",
    aiPredictionInsights: "एआई जोखिम विश्लेषण रिपोर्ट",
    topHazardZones: "शीर्ष जोखिम क्षेत्र रैंकिंग",
    safetyNotice: "नौवहन सुरक्षा सलाह",
    maritimeAdvisory: "जहाजों को दक्षिणी भंवर से 12 समुद्री मील दूर रहने की सलाह दी जाती है।",

    kmUnit: "किमी",
    celsiusUnit: "°C",
    knotsUnit: "नॉट्स",
    metersUnit: "मीटर",
    coordinatesLabel: "निर्देशांक",
    liveStatus: "लाइव",
    activeStatus: "सक्रिय",
    close: "बंद करें"
  },

  ta: {
    appName: "ஆர்கா கடல் புலனாய்வு",
    appSubtitle: "செயற்கை நுண்ணறிவு கடல்சார் ஆய்வு மற்றும் மீன்பிடி உதவி",
    welcomeHeading: "ஆர்கா கடல் புலனாய்வு",
    welcomeSubtitle: "நேரடி கடல்சார் பகுப்பாய்வு, பெருங்கடல் நுண்ணறிவு மற்றும் மீன்பிடி மண்டல உதவி",
    getStarted: "தொடங்குங்கள்",
    languageSelectionTitle: "மொழியைத் தேர்ந்தெடுக்கவும்",
    languageSelectionSubtitle: "முழு பயன்பாட்டிற்கும் உங்கள் விருப்ப மொழியைத் தேர்வுசெய்யவும்",
    continueBtn: "தொடரவும்",
    selectLanguagePrompt: "தொடர ஒரு மொழியைத் தேர்ந்தெடுக்கவும்",

    userDetailsTitle: "பயனர் விவரங்கள் மற்றும் பங்கு",
    userDetailsSubtitle: "உங்கள் பெயரை உள்ளிட்டு செயல்பாட்டுப் பங்கைத் தேர்ந்தெடுக்கவும்",
    fullNameLabel: "முழு பெயர்",
    fullNamePlaceholder: "உங்கள் முழு பெயரை உள்ளிடவும்",
    selectRoleLabel: "பங்கைத் தேர்ந்தெடுக்கவும்",
    roleFisherman: "மீனவர் (Fisherman)",
    roleFishermanDesc: "குரல் உதவியாளர், நேரடி மீன்பிடி மண்டலப் பரிந்துரை, ஆபத்து எச்சரிக்கைகள்",
    roleOthers: "மற்றவர்கள் / கடல்சார் அதிகாரிகள்",
    roleOthersDesc: "தேசிய கடல்சார் புலனாய்வு, வெப்பநிலை, வானிலை, பச்சையம், பேரிடர் ஆய்வு",
    startExperienceBtn: "ஆர்காவைத் தொடங்குங்கள்",

    navHome: "முகப்பு",
    navFishing: "மீன்பிடித்தல்",
    navProductivity: "உற்பத்தித்திறன்",
    navAnalysis: "கடல் பகுப்பாய்வு",
    navDisasters: "பேரிடர்கள்",
    navRiskPrediction: "ஆபத்து கணிப்பு",
    roleBadgeFisherman: "மீனவர்",
    roleBadgeOthers: "கடல்சார் ஆய்வாளர்",

    voiceAssistantTitle: "ஆர்கா குரல் உதவியாளர்",
    voiceAssistantGreeting: "வணக்கம்! நான் உங்கள் ஆர்கா கடல் உதவியாளர். நீங்கள் எங்கு மீன்பிடிக்கச் செல்ல விரும்புகிறீர்கள்?",
    voiceListening: "கேட்கிறது... தெளிவாகப் பேசுங்கள்",
    voiceTapToSpeak: "பேச அழுத்தவும்",
    voiceSwitchToManual: "கைமுறை பதிவுக்கு மாறவும்",
    voiceQuestionRegion: "நீங்கள் எந்தக் கடலோரப் பகுதி அல்லது துறைமுகத்திலிருந்து புறப்படுகிறீர்கள்?",
    voiceQuestionDate: "நீங்கள் திட்டமிடும் பயணத் தேதி என்ன?",
    voiceQuestionTime: "நீங்கள் புறப்படும் நேரம் என்ன?",
    voiceQuestionPurpose: "உங்கள் பயணத்தின் முக்கிய நோக்கம் என்ன?",
    voiceDonePrompt: "அனைத்து விவரங்களும் பெறப்பட்டன! பகுப்பாய்வு செய்ய அழுத்தவும்.",
    voiceListeningStatus: "குரல் உதவியாளர் செயலில் உள்ளது",

    manualInputTitle: "பயண அளவுருக்கள்",
    manualInputSubtitle: "மண்டலங்களைக் கண்டறிய விவரங்களைக் குறிப்பிடவும்",
    regionLabel: "கடலோரப் பகுதி",
    dateLabel: "பயணத் தேதி",
    timeLabel: "புறப்படும் நேரம்",
    purposeLabel: "மீன்பிடி நோக்கம்",
    analyzeBtn: "கடல் மண்டலங்களை ஆய்வு செய்க",

    purposeCommercial: "வணிக இழுவை மீன்பிடித்தல்",
    purposeDeepSea: "ஆழ்கடல் மீன்பிடித்தல்",
    purposeCoastal: "பாரம்பரியக் கடலோர மீன்பிடித்தல்",
    purposeTuna: "சூரை மீன் வேட்டை",
    purposeSardine: "சாளை மீன்பிடித்தல்",

    dashboardOverviewTitle: "தேசிய கடல்சார் புலனாய்வு",
    currentLocationLabel: "தற்போதைய கடல் தளம்",
    topRiskZonesTitle: "இந்தியாவின் அதிக ஆபத்துள்ள கடல் மண்டலங்கள்",
    highProductivityZonesTitle: "அதிக மீன் உற்பத்தி மண்டலங்கள்",
    marineIntelligenceHub: "ஆர்கா புலனாய்வு மையம்",
    viewDetails: "விவரங்களைக் காண்க",
    nationalContext: "இந்தியக் கடற்கரை மற்றும் பிரத்யேகப் பொருளாதார மண்டலம்",

    bestFishingZoneTitle: "மீன்பிடி மண்டலப் பரிந்துரை",
    recommendedBestZone: "பரிந்துரைக்கப்படும் சிறந்த மீன்பிடி மண்டலம்",
    distanceFromUser: "கரையில் இருந்து தூரம்",
    bestTimeToGo: "பயணத்திற்கான உகந்த நேரம்",
    riskLevel: "கடல்சார் ஆபத்து நிலை",
    weatherCondition: "வானிலை நிலை",
    productivityLevel: "மீன் திரள் சாத்தியக்கூறு",
    aiRecommendationTitle: "ஏஐ கடல்சார் பரிந்துரை",
    aiInsightFishingZone: "கரையிலிருந்து 18.4 கி.மீ தொலைவில் சாதகமான வெப்பநிலை மாற்றம் உள்ளது. அதிக பச்சையம் மற்றும் அமைதியான கடல் அலைகள் உள்ளன.",
    allActiveZones: "பகுதியில் உள்ள அனைத்து மீன்பிடி மண்டலங்கள்",
    todayBestZones: "இன்றைய சிறந்த மீன்பிடி மண்டலங்கள்",
    navigateZone: "திசையை அமைக்கவும்",
    safetyConfirmed: "பாதுகாப்பான கடல் சூழல்",

    riskLow: "குறைந்த ஆபத்து",
    riskModerate: "மிதமான ஆபத்து",
    riskHigh: "அதிக ஆபத்து",
    riskSevere: "கடுமையான எச்சரிக்கை",

    prodHigh: "அதிக உற்பத்தித்திறன் (94%)",
    prodModerate: "மிதமான உற்பத்தித்திறன் (68%)",
    prodLow: "குறைந்த உற்பத்தித்திறன் (32%)",

    productivityAnalysisTitle: "உற்பத்தித்திறன் பகுப்பாய்வு",
    todayProductivityScore: "இன்றைய ஒட்டுமொத்த உற்பத்தித்திறன்",
    productivityTrendTitle: "கடல் உற்பத்தித்திறன் போக்கு",
    topProductivityZonesIndia: "இந்தியாவின் சிறந்த உற்பத்தி மண்டலங்கள்",
    aiProductivityInsight: "கடலோரப் பச்சையம் அதிகரிப்பால் மீன் கூட்டம் 38% அதிகரிக்க வாய்ப்புள்ளது.",
    hourlyProductivity: "மணிநேர உற்பத்தித்திறன்",
    catchForecast: "மீன் பிடிப்பு முன்னறிவிப்பு",
    speciesAggregation: "முக்கிய மீன் இனங்கள்",

    marineAnalysisTitle: "கடல்சார் பகுப்பாய்வு தொகுப்பு",
    categorySST: "எஸ்.எஸ்.டி (வெப்பநிலை)",
    categoryWeather: "வானிலை",
    categoryOcean: "கடல் நீரோட்டம்",
    categoryChlorophyll: "பச்சையம்",
    categorySpatial: "ஆழமான பரப்பளவு",

    sstTitle: "கடல் மேற்பரப்பு வெப்பநிலை (SST)",
    sstDesc: "வெப்பநிலை மாற்றங்கள் மற்றும் கடல் எல்லைகள்",
    weatherTitle: "கடல்சார் வானிலை மற்றும் காற்று",
    weatherDesc: "காற்றின் வேகம், திசை மற்றும் வளிமண்டல அழுத்தம்",
    oceanTitle: "கடல் நீரோட்டங்கள் மற்றும் அலைகள்",
    oceanDesc: "அலையின் உயரம், நீரோட்ட வேகம் மற்றும் அலைவு",
    chlorophyllTitle: "பச்சையம்-ஏ அடர்த்தி",
    chlorophyllDesc: "நுண்ணுயிர் பெருக்கம் மற்றும் மீன் உணவு மண்டலங்கள்",
    spatialTitle: "ஆழக் குறிப்பு மற்றும் கடல் எல்லைகள்",
    spatialDesc: "கடல் ஆழம் மற்றும் பாதுகாப்பான கப்பல் வழித்தடங்கள்",

    windSpeed: "காற்றின் வேகம்",
    seaTemperature: "கடல் வெப்பநிலை",
    waveHeight: "அலையின் உயரம்",
    tideVelocity: "நீரோட்ட வேகம்",
    chlorophyllDensity: "பச்சைய அடர்த்தி",
    eezBoundary: "பொருளாதார எல்லை வரம்பு",
    bathymetryDepth: "நீரின் ஆழம்",

    disasterAnalysisTitle: "பேரிடர் மற்றும் வரலாற்று பகுப்பாய்வு",
    selectDisasterPeriod: "வரலாற்றுப் புயலைத் தேர்வுசெய்க",
    selectRegionDisaster: "கடலோரப் பகுதியைத் தேர்வுசெய்க",
    topDisastersIdentified: "பதிவு செய்யப்பட்ட தீவிரப் பேரிடர்கள்",
    disasterType: "பேரிடர் வகைப்பாடு",
    damageLevel: "சேத அளவு",
    impactAssessment: "கடல்சார் தாக்க மதிப்பீடு",
    affectedMarineAreas: "பாதிக்கப்பட்ட கடல் பகுதிகள்",
    analyticalTrends: "புயல் தீவிரம் மற்றும் அலை உயர்வு போக்கு",
    aiDisasterInsights: "ஏஐ பேரிடர் மீள் உருவாக்கம்",
    vesselsAffected: "சிக்கிய / மீட்கப்பட்ட படகுகள்",
    portClosures: "மூடப்பட்ட துறைமுகங்கள்",
    cycloneMichaung: "மிச்சாங் புயல் (2023)",
    cycloneAsani: "அசானி புயல் (2022)",
    cycloneGulab: "குலாப் புயல் (2021)",
    tsunami2004: "இந்தியப் பெருங்கடல் சுனாமி (2004)",
    superCyclone1999: "ஒடிசா சூப்பர் புயல் (1999)",

    riskPredictionTitle: "தானியங்கி கடல்சார் ஆபத்து கணிப்பு",
    aiPredictionModel: "ஏஐ கடல்சார் நரம்பியல் ஆபத்து மாதிரி v4.2",
    riskStatusLive: "தற்போதைய நேரடி ஆபத்து நிலை",
    automatedModelActive: "தானியங்கி நேரடிப் புதுப்பித்தல் செயலில் உள்ளது",
    nextRefreshIn: "அடுத்த புதுப்பிப்பு",
    secondsSuffix: "வினாடிகளில்",
    lastUpdatedNow: "கணிப்புகள் நேரடியாக சரிபார்க்கப்பட்டன",
    aiPredictionInsights: "ஏஐ ஆபத்து மதிப்பீட்டு அறிக்கை",
    topHazardZones: "அதிக ஆபத்துள்ள மண்டலங்களின் பட்டியல்",
    safetyNotice: "பாதுகாப்பு வழிகாட்டுதல்",
    maritimeAdvisory: "தெற்கு கடல் சுழலில் இருந்து படகுகள் 12 கடல் மைல் தூரம் விலகி இருக்க அறிவுறுத்தப்படுகிறது.",

    kmUnit: "கி.மீ",
    celsiusUnit: "°C",
    knotsUnit: "நாட்ஸ்",
    metersUnit: "மீட்டர்",
    coordinatesLabel: "ஆயத்தொலைவுகள்",
    liveStatus: "நேரலை",
    activeStatus: "செயலில்",
    close: "மூடு"
  },

  ml: {
    appName: "ഓർക്ക മറൈൻ ഇന്റലിജൻസ്",
    appSubtitle: "എഐ അധിഷ്ഠിത സമുദ്ര നിരീക്ഷണവും മത്സ്യബന്ധന സഹായവും",
    welcomeHeading: "ഓർക്ക മറൈൻ ഇന്റലിജൻസ്",
    welcomeSubtitle: "തത്സമയ സമുദ്ര വിശകലനം, ഉപഗ്രഹ വിവരങ്ങൾ, മത്സ്യബന്ധന മേഖലകളുടെ നിർദ്ദേശങ്ങൾ",
    getStarted: "തുടങ്ങുക",
    languageSelectionTitle: "ഭാഷ തിരഞ്ഞെടുക്കുക",
    languageSelectionSubtitle: "പൂർണ്ണ ആപ്പ് ഉപയോഗത്തിനായി നിങ്ങളുടെ ഭാഷ തിരഞ്ഞെടുക്കുക",
    continueBtn: "തുടരുക",
    selectLanguagePrompt: "തുടരുന്നതിന് ഒരു ഭാഷ തിരഞ്ഞെടുക്കുക",

    userDetailsTitle: "ഉപയോക്തൃ വിവരങ്ങളും പങ്കും",
    userDetailsSubtitle: "നിങ്ങളുടെ പേര് നൽകി പ്രവർത്തനം തിരഞ്ഞെടുക്കുക",
    fullNameLabel: "പൂർണ്ണമായ പേര്",
    fullNamePlaceholder: "നിങ്ങളുടെ പേര് എഴുതുക",
    selectRoleLabel: "പങ്ക് തിരഞ്ഞെടുക്കുക",
    roleFisherman: "മത്സ്യത്തൊഴിലാളി (Fisherman)",
    roleFishermanDesc: "വോയ്സ് അസിസ്റ്റന്റ്, മികച്ച മത്സ്യബന്ധന മേഖലകൾ, അപായ മുന്നറിയിപ്പുകൾ",
    roleOthers: "മറ്റുള്ളവർ / മറൈൻ ഉദ്യോഗസ്ഥർ",
    roleOthersDesc: "ദേശീയ സമുദ്ര നിരീക്ഷണം, താപനില, കാലാവസ്ഥ, ദുരന്ത വിശകലനം",
    startExperienceBtn: "ഓർക്ക ആരംഭിക്കുക",

    navHome: "ഹോം",
    navFishing: "മത്സ്യബന്ധനം",
    navProductivity: "ഉത്പാദനക്ഷമത",
    navAnalysis: "സമുദ്ര വിശകലനം",
    navDisasters: "ദുരന്തങ്ങൾ",
    navRiskPrediction: "അപകട സാധ്യത",
    roleBadgeFisherman: "മത്സ്യത്തൊഴിലാളി",
    roleBadgeOthers: "മറൈൻ അനലിസ്റ്റ്",

    voiceAssistantTitle: "ഓർക്ക വോയ്സ് അസിസ്റ്റന്റ്",
    voiceAssistantGreeting: "നമസ്കാരം! ഞാൻ നിങ്ങളുടെ ഓർക്ക അസിസ്റ്റന്റ് ആണ്. എവിടെയാണ് മത്സ്യബന്ധനത്തിന് പോകേണ്ടത്?",
    voiceListening: "ശ്രദ്ധിക്കുന്നു... വ്യക്തമായി സംസാരിക്കുക",
    voiceTapToSpeak: "സംസാരിക്കാൻ സ്പർശിക്കുക",
    voiceSwitchToManual: "മാനുവൽ നൽകലിലേക്ക് മാറുക",
    voiceQuestionRegion: "നിങ്ങൾ ഏത് തീരപ്രദേശത്തു നിന്നാണ് പുറപ്പെടുന്നത്?",
    voiceQuestionDate: "യാത്ര ഉദ്ദേശിക്കുന്ന തീയതി ഏതാണ്?",
    voiceQuestionTime: "പുറപ്പെടുന്ന സമയം ഏതാണ്?",
    voiceQuestionPurpose: "മത്സ്യബന്ധനത്തിന്റെ പ്രധാന ലക്ഷ്യം എന്താണ്?",
    voiceDonePrompt: "വിവരങ്ങൾ രേഖപ്പെടുത്തി! വിശകലനം ചെയ്യാൻ അമർത്തുക.",
    voiceListeningStatus: "വോയ്സ് അസിസ്റ്റന്റ് സജീവമാണ്",

    manualInputTitle: "യാത്രാ വിവരങ്ങൾ",
    manualInputSubtitle: "മേഖലകൾ കണ്ടെത്തുന്നതിന് വിവരങ്ങൾ നൽകുക",
    regionLabel: "തീരദേശ മേഖല",
    dateLabel: "യാത്രാ തീയതി",
    timeLabel: "പുറപ്പെടുന്ന സമയം",
    purposeLabel: "മത്സ്യബന്ധന തരം",
    analyzeBtn: "സമുദ്ര മേഖലകൾ വിശകലനം ചെയ്യുക",

    purposeCommercial: "വാണിജ്യ ട്രോളിംഗ്",
    purposeDeepSea: "ആഴക്കടൽ മത്സ്യബന്ധനം",
    purposeCoastal: "പരമ്പരാഗത തീരദേശ വേട്ട",
    purposeTuna: "ചൂര മീൻ വേട്ട",
    purposeSardine: "മത്തിയും അയലയും",

    dashboardOverviewTitle: "ദേശീയ സമുദ്ര വിവരങ്ങൾ",
    currentLocationLabel: "നിലവിലെ താവളം",
    topRiskZonesTitle: "ഇന്ത്യയിലെ അതീവ അപകടസാധ്യതയുള്ള സമുദ്ര മേഖലകൾ",
    highProductivityZonesTitle: "ഉയർന്ന മത്സ്യ ലഭ്യതയുള്ള മേഖലകൾ",
    marineIntelligenceHub: "ഓർക്ക ഇന്റലിജൻസ് കേന്ദ്രം",
    viewDetails: "വിശദാംശങ്ങൾ കാണുക",
    nationalContext: "ഇന്ത്യൻ തീരദേശവും പ്രത്യേക സാമ്പത്തിക മേഖലയും",

    bestFishingZoneTitle: "മത്സ്യബന്ധന മേഖല നിർദ്ദേശം",
    recommendedBestZone: "ഏറ്റവും അനുയോജ്യമായ മത്സ്യബന്ധന മേഖല",
    distanceFromUser: "തീരത്തുനിന്നുള്ള ദൂരം",
    bestTimeToGo: "അനുയോജ്യമായ സമയം",
    riskLevel: "അപകട സാധ്യത നില",
    weatherCondition: "കാലാവസ്ഥ നില",
    productivityLevel: "മത്സ്യ ലഭ്യത സാധ്യത",
    aiRecommendationTitle: "എഐ സമുദ്ര നിർദ്ദേശം",
    aiInsightFishingZone: "തീരത്തുനിന്ന് 18.4 കി.മീ അകലെ മികച്ച താപനില രേഖപ്പെടുത്തിയിട്ടുണ്ട്. ശാന്തമായ കടലും സമൃദ്ധമായ പ്ലാങ്ക്ടണും ഉണ്ട്.",
    allActiveZones: "മേഖലയിലെ സജീവ സോണുകൾ",
    todayBestZones: "ഇന്നത്തെ മുൻനിര മേഖലകൾ",
    navigateZone: "ദിശ നിശ്ചയിക്കുക",
    safetyConfirmed: "സുരക്ഷിതമായ സമുദ്രാവസ്ഥ",

    riskLow: "കുറഞ്ഞ അപകടസാധ്യത",
    riskModerate: "മിതമായ അപകടസാധ്യത",
    riskHigh: "കൂടിയ അപകടസാധ്യത",
    riskSevere: "ഗുരുതരമായ മുന്നറിയിപ്പ്",

    prodHigh: "ഉയർന്ന ഉത്പാദനക്ഷമത (94%)",
    prodModerate: "മിതമായ ഉത്പാദനക്ഷമത (68%)",
    prodLow: "കുറഞ്ഞ ഉത്പാദനക്ഷമത (32%)",

    productivityAnalysisTitle: "ഉത്പാദനക്ഷമത വിശകലനം",
    todayProductivityScore: "ഇന്നത്തെ ശരാശരി സ്കോർ",
    productivityTrendTitle: "സമുദ്ര ഉത്പാദനക്ഷമത നിരക്ക്",
    topProductivityZonesIndia: "ഇന്ത്യയിലെ മികച്ച മേഖലകൾ",
    aiProductivityInsight: "തീരദേശ പ്ലാങ്ക്ടൺ വർദ്ധനവ് കാരണം മത്സ്യക്കൂട്ടങ്ങൾ 38% വർദ്ധിക്കാൻ സാധ്യതയുണ്ട്.",
    hourlyProductivity: "മണിക്കൂർ തിരിച്ചുള്ള ഉത്പാദനം",
    catchForecast: "മത്സ്യ ലഭ്യത പ്രവചനം",
    speciesAggregation: "പ്രധാന മത്സ്യ ഇനങ്ങൾ",

    marineAnalysisTitle: "സമുദ്ര വിശകലന വിഭാഗം",
    categorySST: "എസ്.എസ്.ടി (താപനില)",
    categoryWeather: "കാലാവസ്ഥ",
    categoryOcean: "സമുദ്ര പ്രവാഹം",
    categoryChlorophyll: "ക്ലോറോഫിൽ",
    categorySpatial: "സമുദ്ര ആഴം",

    sstTitle: "സമുദ്രോപരിതല താപനില (SST)",
    sstDesc: "താപനില മാറ്റങ്ങളും സമുദ്ര അതിർത്തികളും",
    weatherTitle: "സമുദ്ര കാലാവസ്ഥയും കാറ്റും",
    weatherDesc: "കാറ്റിന്റെ വേഗത, ദിശ, അന്തരീക്ഷ മർദ്ദം",
    oceanTitle: "സമുദ്ര പ്രവാഹങ്ങളും വേലിയേറ്റങ്ങളും",
    oceanDesc: "തിരമാലയുടെ ഉയരം, പ്രവാഹ വേഗത, ശക്തി",
    chlorophyllTitle: "ക്ലോറോഫിൽ-എ സാന്ദ്രത",
    chlorophyllDesc: "സസ്യപ്ലവകങ്ങളുടെ സാന്നിധ്യവും മത്സ്യ തീറ്റ മേഖലകളും",
    spatialTitle: "സമുദ്ര ആഴവും അതിർത്തികളും",
    spatialDesc: "ജലത്തിന്റെ ആഴവും സുരക്ഷിത നാവിഗേഷൻ പാതകളും",

    windSpeed: "കാറ്റിന്റെ വേഗത",
    seaTemperature: "സമുദ്ര താപനില",
    waveHeight: "തിരമാല ഉയരം",
    tideVelocity: "പ്രവാഹ വേഗത",
    chlorophyllDensity: "ക്ലോറോഫിൽ സാന്ദ്രത",
    eezBoundary: "സാമ്പത്തിക സമുദ്ര അതിർത്തി",
    bathymetryDepth: "ജലത്തിന്റെ ആഴം",

    disasterAnalysisTitle: "ദുരന്തങ്ങളും ചരിത്ര വിശകലനവും",
    selectDisasterPeriod: "ചരിത്രപരമായ ചുഴലിക്കാറ്റ് തിരഞ്ഞെടുക്കുക",
    selectRegionDisaster: "തീരപ്രദേശം തിരഞ്ഞെടുക്കുക",
    topDisastersIdentified: "രേഖപ്പെടുത്തിയ തീവ്ര ദുരന്തങ്ങൾ",
    disasterType: "ദുരന്ത വർഗ്ഗീകരണം",
    damageLevel: "നാശനഷ്ടം",
    impactAssessment: "സമുദ്ര ആഘാത വിലയിരുത്തൽ",
    affectedMarineAreas: "ബാധിക്കപ്പെട്ട സമുദ്ര പ്രദേശങ്ങൾ",
    analyticalTrends: "കാറ്റിന്റെ വേഗതയും തിരമാല ഉയർച്ചയും",
    aiDisasterInsights: "എഐ ദുരന്ത പുനർനിർമ്മാണ റിപ്പോർട്ട്",
    vesselsAffected: "കുടുങ്ങിയ / രക്ഷപ്പെടുത്തിയ ബോട്ടുകൾ",
    portClosures: "അടച്ച തുറമുഖങ്ങൾ",
    cycloneMichaung: "മിഷോങ് ചുഴലിക്കാറ്റ് (2023)",
    cycloneAsani: "അസാനി ചുഴലിക്കാറ്റ് (2022)",
    cycloneGulab: "ഗുലാബ് ചുഴലിക്കാറ്റ് (2021)",
    tsunami2004: "ഇന്ത്യൻ സമുദ്ര സുനാമി (2004)",
    superCyclone1999: "ഒഡീഷ സൂപ്പർ സൈക്ലോൺ (1999)",

    riskPredictionTitle: "യാന്ത്രിക സമുദ്ര അപകട പ്രവചനം",
    aiPredictionModel: "എഐ മറൈൻ ന്യൂറൽ റിസ്ക് മോഡൽ v4.2",
    riskStatusLive: "നിലവിലെ തത്സമയ അപകട നില",
    automatedModelActive: "ഓട്ടോമേറ്റഡ് റിയൽ-ടൈം അപ്‌ഡേറ്റ് സജീവം",
    nextRefreshIn: "അടുത്ത പുതുക്കൽ",
    secondsSuffix: "സെക്കൻഡിൽ",
    lastUpdatedNow: "തത്സമയം സ്ഥിരീകരിച്ച പ്രവചനങ്ങൾ",
    aiPredictionInsights: "എഐ അപകട സാധ്യത റിപ്പോർട്ട്",
    topHazardZones: "അപകട മേഖലകളുടെ പട്ടിക",
    safetyNotice: "സുരക്ഷാ നിർദ്ദേശം",
    maritimeAdvisory: "തെക്കൻ സമുദ്രച്ചുഴിയിൽ നിന്ന് ബോട്ടുകൾ 12 നോട്ടിക്കൽ മൈൽ ദൂരം പാലിക്കണം.",

    kmUnit: "കി.മീ",
    celsiusUnit: "°C",
    knotsUnit: "നോട്ട്സ്",
    metersUnit: "മീറ്റർ",
    coordinatesLabel: "നിർദ്ദേശാങ്കങ്ങൾ",
    liveStatus: "തത്സമയം",
    activeStatus: "സജീവം",
    close: "അടയ്ക്കുക"
  },

  bn: {
    appName: "ওরকা সামুদ্রিক গোয়েন্দা",
    appSubtitle: "এআই চালিত সামুদ্রিক বিশ্লেষণ ও মৎস্যচাষ সহায়তা",
    welcomeHeading: "ওরকা মেরিন ইন্টেলিজেন্স",
    welcomeSubtitle: "রিয়েল-টাইম সমুদ্রবিদ্যা বিশ্লেষণ এবং মাছ ধরার অঞ্চলের সঠিক সহায়তা",
    getStarted: "শুরু করুন",
    languageSelectionTitle: "ভাষা নির্বাচন করুন",
    languageSelectionSubtitle: "সম্পূর্ণ অ্যাপ্লিকেশনের জন্য আপনার পছন্দের ভাষা চয়ন করুন",
    continueBtn: "এগিয়ে যান",
    selectLanguagePrompt: "এগিয়ে যেতে একটি ভাষা নির্বাচন করুন",

    userDetailsTitle: "ব্যবহারকারীর তথ্য ও ভূমিকা",
    userDetailsSubtitle: "আপনার নাম লিখুন এবং কর্মক্ষম ভূমিকা নির্বাচন করুন",
    fullNameLabel: "পুরো নাম",
    fullNamePlaceholder: "আপনার পুরো নাম লিখুন",
    selectRoleLabel: "ভূমিকা নির্বাচন করুন",
    roleFisherman: "মৎসজীবী (Fisherman)",
    roleFishermanDesc: "ভয়েস সহকারী, সেরা মাছ ধরার অঞ্চল, বিপদ সংকেত",
    roleOthers: "অন্যান্য / সামুদ্রিক কর্মকর্তা",
    roleOthersDesc: "জাতীয় সামুদ্রিক গোয়েন্দা, তাপমাত্রা, আবহাওয়া, ক্লোরোফিল বিশ্লেষণ",
    startExperienceBtn: "ওরকা চালু করুন",

    navHome: "হোম",
    navFishing: "মৎস্যচাষ",
    navProductivity: "উৎপাদনশীলতা",
    navAnalysis: "সামুদ্রিক বিশ্লেষণ",
    navDisasters: "দুর্যোগ",
    navRiskPrediction: "ঝুঁকি পূর্বাভাস",
    roleBadgeFisherman: "মৎসজীবী",
    roleBadgeOthers: "মেরিন বিশ্লেষক",

    voiceAssistantTitle: "ওরকা ভয়েস অ্যাসিস্ট্যান্ট",
    voiceAssistantGreeting: "নমস্কার! আমি আপনার ওরকা মেরিন অ্যাসিস্ট্যান্ট। আপনি কোথায় মাছ ধরতে যেতে চান?",
    voiceListening: "শুনছি... স্পষ্ট করে বলুন",
    voiceTapToSpeak: "কথা বলতে স্পর্শ করুন",
    voiceSwitchToManual: "ম্যানুয়াল ইনপুটে যান",
    voiceQuestionRegion: "আপনি কোন উপকূলীয় অঞ্চল বা বন্দর থেকে রওনা হচ্ছেন?",
    voiceQuestionDate: "আপনার যাত্রার নির্ধারিত তারিখ কী?",
    voiceQuestionTime: "আপনি কোন সময়ে রওনা হতে চান?",
    voiceQuestionPurpose: "আপনার মাছ ধরার প্রধান উদ্দেশ্য কী?",
    voiceDonePrompt: "সব তথ্য নথিভুক্ত হয়েছে! বিশ্লেষণের জন্য স্পর্শ করুন।",
    voiceListeningStatus: "ভয়েস সহকারী সক্রিয়",

    manualInputTitle: "যাত্রার বিবরণ",
    manualInputSubtitle: "উপযুক্ত অঞ্চল চিহ্নিত করতে বিবরণ দিন",
    regionLabel: "উপকূলীয় অঞ্চল",
    dateLabel: "যাত্রার তারিখ",
    timeLabel: "রওনা হওয়ার সময়",
    purposeLabel: "অভিযানের ধরন",
    analyzeBtn: "সামুদ্রিক অঞ্চল বিশ্লেষণ করুন",

    purposeCommercial: "বাণিজ্যিক ট্রলিং",
    purposeDeepSea: "গভীর সমুদ্র শিকার",
    purposeCoastal: "উপকূলীয় ঐতিহ্যবাহী",
    purposeTuna: "টুনা মাছ শিকার",
    purposeSardine: "সার্ডিন ও অন্যান্য",

    dashboardOverviewTitle: "জাতীয় সামুদ্রিক গোয়েন্দা তথ্য",
    currentLocationLabel: "বর্তমান সামুদ্রিক ঘাঁটি",
    topRiskZonesTitle: "ভারতের শীর্ষ ঝুঁকিপূর্ণ সামুদ্রিক অঞ্চল",
    highProductivityZonesTitle: "উচ্চ মাছ উৎপাদনশীল অঞ্চল",
    marineIntelligenceHub: "ওরকা ইন্টেলিজেন্স কেন্দ্র",
    viewDetails: "বিস্তারিত দেখুন",
    nationalContext: "ভারতের উপকূলরেখা ও অর্থনৈতিক অঞ্চল",

    bestFishingZoneTitle: "মাছ ধরার অঞ্চল সুপারিশ",
    recommendedBestZone: "সুপারিশকৃত সেরা মাছ ধরার অঞ্চল",
    distanceFromUser: "উপকূল থেকে দূরত্ব",
    bestTimeToGo: "উপযুক্ত সময়",
    riskLevel: "ঝুঁকির মাত্রা",
    weatherCondition: "আবহাওয়া পরিস্থিতি",
    productivityLevel: "মাছ পাওয়ার সম্ভাবনা",
    aiRecommendationTitle: "এআই সামুদ্রিক সুপারিশ",
    aiInsightFishingZone: "উপকূল থেকে ১৮.৪ কিমি দূরে তাপমাত্রা সঙ্গম রয়েছে। প্রচুর ক্লোরোফিল এবং শান্ত সমুদ্র বিদ্যমান।",
    allActiveZones: "অঞ্চলের সমস্ত সক্রিয় অঞ্চল",
    todayBestZones: "আজকের সেরা মাছ ধরার অঞ্চল",
    navigateZone: "দিক নির্ধারণ করুন",
    safetyConfirmed: "নিরাপদ সমুদ্র পরিস্থিতি",

    riskLow: "কম ঝুঁকি",
    riskModerate: "মাঝারি ঝুঁকি",
    riskHigh: "উচ্চ ঝুঁকি",
    riskSevere: "মারাত্মক বিপদ সংকেত",

    prodHigh: "উচ্চ উৎপাদনশীলতা (৯৪%)",
    prodModerate: "মাঝারি উৎপাদনশীলতা (৬৮%)",
    prodLow: "কম উৎপাদনশীলতা (৩২%)",

    productivityAnalysisTitle: "উৎপাদনশীলতা বিশ্লেষণ",
    todayProductivityScore: "আজকের সামগ্রিক উৎপাদনশীলতা স্কোর",
    productivityTrendTitle: "সামুদ্রিক বায়োমাস ধারা",
    topProductivityZonesIndia: "ভারতের শীর্ষ উৎপাদনশীল অঞ্চল",
    aiProductivityInsight: "উপকূলীয় পুষ্টি বৃদ্ধির ফলে পেলাজিক মাছের ঝাঁক ৩৮% বৃদ্ধি পাওয়ার সম্ভাবনা।",
    hourlyProductivity: "প্রতি ঘণ্টার উৎপাদনশীলতা",
    catchForecast: "মাছ ধরার পূর্বাভাস",
    speciesAggregation: "প্রধান মাছের প্রজাতি",

    marineAnalysisTitle: "সামুদ্রিক বিশ্লেষণ স্যুট",
    categorySST: "এসএসটি (তাপমাত্রা)",
    categoryWeather: "আবহাওয়া",
    categoryOcean: "সমুদ্র স্রোত",
    categoryChlorophyll: "ক্লোরোফিল",
    categorySpatial: "স্থানিক গভীরতা",

    sstTitle: "সমুদ্র পৃষ্ঠের তাপমাত্রা (SST)",
    sstDesc: "তাপমাত্রার গ্রেডিয়েন্ট এবং সমুদ্রের ফ্রন্ট",
    weatherTitle: "সামুদ্রিক আবহাওয়া ও বাতাস",
    weatherDesc: "বাতাসের গতি, দিক এবং বায়ুমণ্ডলীয় চাপ",
    oceanTitle: "সমুদ্রের স্রোত ও জোয়ার",
    oceanDesc: "ঢেউয়ের উচ্চতা, জোয়ারের গতি ও তরঙ্গের তীব্রতা",
    chlorophyllTitle: "ক্লোরোফিল-এ ঘনত্ব",
    chlorophyllDesc: "প্লাঙ্কটনের প্রাচুর্য এবং মাছের খাদ্য এলাকা",
    spatialTitle: "স্থানিক গভীরতা ও সমুদ্রসীমা",
    spatialDesc: "জলের গভীরতা এবং নিরাপদ ন্যাভিগেশন চ্যানেল",

    windSpeed: "বাতাসের গতি",
    seaTemperature: "সমুদ্রের তাপমাত্রা",
    waveHeight: "ঢেউয়ের উচ্চতা",
    tideVelocity: "জোয়ারের গতিবেগ",
    chlorophyllDensity: "ক্লোরোফিল ঘনত্ব",
    eezBoundary: "ইইজেড সমুদ্রসীমা",
    bathymetryDepth: "জলের গভীরতা",

    disasterAnalysisTitle: "দুর্যোগ ও ঐতিহাসিক বিশ্লেষণ",
    selectDisasterPeriod: "ঐতিহাসিক ঘূর্ণিঝড় নির্বাচন করুন",
    selectRegionDisaster: "উপকূলীয় অঞ্চল নির্বাচন করুন",
    topDisastersIdentified: "নথিভুক্ত মারাত্মক দুর্যোগ",
    disasterType: "দুর্যোগের ধরন",
    damageLevel: "ক্ষয়ক্ষতির মাত্রা",
    impactAssessment: "সামুদ্রিক প্রভাব মূল্যায়ন",
    affectedMarineAreas: "ক্ষতিগ্রস্ত সামুদ্রিক অঞ্চল",
    analyticalTrends: "ঝড়ের তীব্রতা ও জলোচ্ছ্বাসের প্রবণতা",
    aiDisasterInsights: "এআই দুর্যোগ পুনর্গঠন বিশ্লেষণ",
    vesselsAffected: "আটকে পড়া / উদ্ধারকৃত ট্রলার",
    portClosures: "বন্ধ বন্দর",
    cycloneMichaung: "ঘূর্ণিঝড় মিচাং (২০২৩)",
    cycloneAsani: "ঘূর্ণিঝড় অসনি (২০২২)",
    cycloneGulab: "ঘূর্ণিঝড় গুলাব (২০২১)",
    tsunami2004: "ভারত মহাসাগর সুনামি (২০০৪)",
    superCyclone1999: "ওড়িশা সুপার সাইক্লোন (১৯৯৯)",

    riskPredictionTitle: "স্বয়ংক্রিয় সামুদ্রিক ঝুঁকি পূর্বাভাস",
    aiPredictionModel: "এআই মেরিন নিউরাল রিস্ক মডেল v4.2",
    riskStatusLive: "বর্তমান লাইভ ঝুঁকি স্থিতি",
    automatedModelActive: "স্বয়ংক্রিয় রিয়েল-টাইম আপডেট সক্রিয়",
    nextRefreshIn: "পরবর্তী আপডেট",
    secondsSuffix: "সেকেন্ডে",
    lastUpdatedNow: "পূর্বাভাস লাইভ যাচাই করা হয়েছে",
    aiPredictionInsights: "এআই ঝুঁকি মূল্যায়ন রিপোর্ট",
    topHazardZones: "শীর্ষ ঝুঁকিপূর্ণ অঞ্চল তালিকা",
    safetyNotice: "নিরাপত্তা সতর্কতা",
    maritimeAdvisory: "জাহাজগুলিকে দক্ষিণ ঘূর্ণিবায়ু থেকে ১২ নটিক্যাল মাইল দূরে থাকার নির্দেশ দেওয়া হচ্ছে।",

    kmUnit: "কিমি",
    celsiusUnit: "°C",
    knotsUnit: "নট",
    metersUnit: "মিটার",
    coordinatesLabel: "স্থানাঙ্ক",
    liveStatus: "লাইভ",
    activeStatus: "সক্রিয়",
    close: "বন্ধ করুন"
  },

  or: {
    appName: "ଓର୍କା ସାମୁଦ୍ରିକ ଗୁଇନ୍ଦା",
    appSubtitle: "ଏଆଇ ଆଧାରିତ ସାମୁଦ୍ରିକ ବିଶ୍ଳେଷଣ ଓ ମତ୍ସ୍ୟଜୀବୀ ସହାୟତା",
    welcomeHeading: "ଓର୍କା ମେରାଇନ୍ ଇଣ୍ଟେଲିଜେନ୍ସ",
    welcomeSubtitle: "ସଠିକ୍ ସମୟ ସାମୁଦ୍ରିକ ତଥ୍ୟ, ସମୁଦ୍ର ବିଜ୍ଞାନ ଓ ମାଛ ଧରିବା ଅଞ୍ଚଳ ସୂଚନା",
    getStarted: "ଆରମ୍ଭ କରନ୍ତୁ",
    languageSelectionTitle: "ଭାଷା ଚୟନ କରନ୍ତୁ",
    languageSelectionSubtitle: "ସମ୍ପୂର୍ଣ୍ଣ ଆପ୍ଲିକେସନ୍ ପାଇଁ ଆପଣଙ୍କ ପସନ୍ଦର ଭାଷା ଚୟନ କରନ୍ତୁ",
    continueBtn: "ଆଗକୁ ବଢ଼ନ୍ତୁ",
    selectLanguagePrompt: "ଆଗକୁ ବଢ଼ିବା ପାଇଁ ଗୋଟିଏ ଭାଷା ଚୟନ କରନ୍ତୁ",

    userDetailsTitle: "ବ୍ୟବହାରକାରୀ ବିବରଣୀ ଓ ଭୂମିକା",
    userDetailsSubtitle: "ଆପଣଙ୍କ ନାମ ଲେଖନ୍ତୁ ଏବଂ କାର୍ଯ୍ୟକାରୀ ଭୂମିକା ଚୟନ କରନ୍ତୁ",
    fullNameLabel: "ପୂରା ନାମ",
    fullNamePlaceholder: "ଆପଣଙ୍କ ପୂରା ନାମ ଲେଖନ୍ତୁ",
    selectRoleLabel: "ଭୂମିକା ଚୟନ କରନ୍ତୁ",
    roleFisherman: "ମତ୍ସ୍ୟଜୀବୀ (Fisherman)",
    roleFishermanDesc: "ଭଏସ୍ ସହାୟକ, ସର୍ବୋତ୍ତମ ମାଛ ଧରିବା ଅଞ୍ଚଳ, ବିପଦ ସତର୍କତା",
    roleOthers: "ଅନ୍ୟମାନେ / ସାମୁଦ୍ରିକ ଅଧିକାରୀ",
    roleOthersDesc: "ଜାତୀୟ ସାମୁଦ୍ରିକ ଗୁଇନ୍ଦା, ତାପମାତ୍ରା, ପାଣିପାଗ, ବିପର୍ଯ୍ୟୟ ବିଶ୍ଳେଷଣ",
    startExperienceBtn: "ଓର୍କା ଆରମ୍ଭ କରନ୍ତୁ",

    navHome: "ମୁଖ୍ୟ ପୃଷ୍ଠା",
    navFishing: "ମତ୍ସ୍ୟଚାଷ",
    navProductivity: "ଉତ୍ପାଦନକ୍ଷମତା",
    navAnalysis: "ସାମୁଦ୍ରିକ ବିଶ୍ଳେଷଣ",
    navDisasters: "ବିପର୍ଯ୍ୟୟ",
    navRiskPrediction: "ବିପଦ ପୂର୍ବାନୁମାନ",
    roleBadgeFisherman: "ମତ୍ସ୍ୟଜୀବୀ",
    roleBadgeOthers: "ମେରାଇନ୍ ବିଶ୍ଳେଷକ",

    voiceAssistantTitle: "ଓର୍କା ଭଏସ୍ ଆସିଷ୍ଟାଣ୍ଟ",
    voiceAssistantGreeting: "ନମସ୍କାର! ମୁଁ ଆପଣଙ୍କ ଓର୍କା ମେରାଇନ୍ ଆସିଷ୍ଟାଣ୍ଟ। ଆପଣ କେଉଁଠାକୁ ମାଛ ଧରିବାକୁ ଯିବାକୁ ଚାହାଁନ୍ତି?",
    voiceListening: "ଶୁଣୁଛି... ସ୍ପଷ୍ଟ ଭାବେ କୁହନ୍ତୁ",
    voiceTapToSpeak: "କହିବା ପାଇଁ ଦବାନ୍ତୁ",
    voiceSwitchToManual: "ମାନୁଆଲ୍ ଇନପୁଟ୍ କରନ୍ତୁ",
    voiceQuestionRegion: "ଆପଣ କେଉଁ ଉପକୂଳ ଅଞ୍ଚଳ କିମ୍ବା ବନ୍ଦରରୁ ବାହାରୁଛନ୍ତି?",
    voiceQuestionDate: "ଆପଣଙ୍କ ଯାତ୍ରା ତାରିଖ କ'ଣ?",
    voiceQuestionTime: "ଆପଣ କେଉଁ ସମୟରେ ବାହାରିବାକୁ ଚାହାଁନ୍ତି?",
    voiceQuestionPurpose: "ଆପଣଙ୍କ ମାଛ ଧରିବାର ମୁଖ୍ୟ ଉଦ୍ଦେଶ୍ୟ କ'ଣ?",
    voiceDonePrompt: "ସମସ୍ତ ତଥ୍ୟ ପଞ୍ଜୀକୃତ ହୋଇଛି! ବିଶ୍ଳେଷଣ ପାଇଁ ଦବାନ୍ତୁ।",
    voiceListeningStatus: "ଭଏସ୍ ସହାୟକ ସକ୍ରିୟ",

    manualInputTitle: "ଯାତ୍ରା ବିବରଣୀ",
    manualInputSubtitle: "ଉପଯୁକ୍ତ ଅଞ୍ଚଳ ପାଇବା ପାଇଁ ବିବରଣୀ ପ୍ରଦାନ କରନ୍ତୁ",
    regionLabel: "ଉପକୂଳ ଅଞ୍ଚଳ",
    dateLabel: "ଯାତ୍ରା ତାରିଖ",
    timeLabel: "ବାହାରିବା ସମୟ",
    purposeLabel: "ଅପରେସନ୍ ଉଦ୍ଦେଶ୍ୟ",
    analyzeBtn: "ସାମୁଦ୍ରିକ ଅଞ୍ଚଳ ବିଶ୍ଳେଷଣ କରନ୍ତୁ",

    purposeCommercial: "ବାଣିଜ୍ୟିକ ଟ୍ରଲିଂ",
    purposeDeepSea: "ଗଭୀର ସମୁଦ୍ର ଶିକାର",
    purposeCoastal: "ଉପକୂଳ ପାରମ୍ପରିକ",
    purposeTuna: "ଟୁନା ମାଛ ଶିକାର",
    purposeSardine: "ସାର୍ଡିନ୍ ଓ ଅନ୍ୟାନ୍ୟ",

    dashboardOverviewTitle: "ଜାତୀୟ ସାମୁଦ୍ରିକ ସୂଚନା",
    currentLocationLabel: "ବର୍ତ୍ତମାନର ସାମୁଦ୍ରିକ ଘାଟି",
    topRiskZonesTitle: "ଭାରତର ସର୍ବାଧିକ ବିପଦପୂର୍ଣ୍ଣ ସାମୁଦ୍ରିକ କ୍ଷେତ୍ର",
    highProductivityZonesTitle: "ଉଚ୍ଚ ମାଛ ଉତ୍ପାଦନ କ୍ଷେତ୍ର",
    marineIntelligenceHub: "ଓର୍କା ଇଣ୍ଟେଲିଜେନ୍ସ କେନ୍ଦ୍ର",
    viewDetails: "ବିବରଣୀ ଦେଖନ୍ତୁ",
    nationalContext: "ଭାରତୀୟ ଉପକୂଳ ଏବଂ ଅର୍ଥନୈତିକ କ୍ଷେତ୍ର",

    bestFishingZoneTitle: "ମାଛ ଧରିବା ଅଞ୍ଚଳ ସୁପାରିଶ",
    recommendedBestZone: "ସୁପାରିଶ କରାଯାଇଥିବା ସର୍ବୋତ୍ତମ ମତ୍ସ୍ୟ କ୍ଷେତ୍ର",
    distanceFromUser: "ଉପକୂଳରୁ ଦୂରତା",
    bestTimeToGo: "ଉପଯୁକ୍ତ ସମୟ",
    riskLevel: "ବିପଦର ମାତ୍ରା",
    weatherCondition: "ପାଣିପାଗ ସ୍ଥିତି",
    productivityLevel: "ମାଛ ମିଳିବାର ସମ୍ଭାବନା",
    aiRecommendationTitle: "ଏଆଇ ସାମୁଦ୍ରିକ ସୁପାରିଶ",
    aiInsightFishingZone: "ଉପକୂଳରୁ ୧୮.୪ କିମି ଦୂରରେ ଉପଯୁକ୍ତ ତାପମାତ୍ରା ଅଛି। ପ୍ରଚୁର କ୍ଲୋରୋଫିଲ୍ ଏବଂ ଶାନ୍ତ ସମୁଦ୍ର ବିଦ୍ୟମାନ।",
    allActiveZones: "ସକ୍ରିୟ ମତ୍ସ୍ୟ କ୍ଷେତ୍ର ସମୂହ",
    todayBestZones: "ଆଜିର ଶ୍ରେଷ୍ଠ କ୍ଷେତ୍ର",
    navigateZone: "ଦିଗ ନିର୍ଣ୍ଣୟ କରନ୍ତୁ",
    safetyConfirmed: "ସୁରକ୍ଷିତ ସମୁଦ୍ର ପରିସ୍ଥିତି",

    riskLow: "କମ୍ ବିପଦ",
    riskModerate: "ମଧ୍ୟମ ବିପଦ",
    riskHigh: "ଅଧିକ ବିପଦ",
    riskSevere: "ଗମ୍ଭୀର ସତର୍କତା",

    prodHigh: "ଉଚ୍ଚ ଉତ୍ପାଦନକ୍ଷମତା (୯୪%)",
    prodModerate: "ମଧ୍ୟମ ଉତ୍ପାଦନକ୍ଷମତା (୬୮%)",
    prodLow: "କମ୍ ଉତ୍ପାଦନକ୍ଷମତା (୩୨%)",

    productivityAnalysisTitle: "ଉତ୍ପାଦନକ୍ଷମତା ବିଶ୍ଳେଷଣ",
    todayProductivityScore: "ଆଜିର ମୋଟ ସ୍କୋର",
    productivityTrendTitle: "ସାମୁଦ୍ରିକ ଉତ୍ପାଦନ ପ୍ରବୃତ୍ତି",
    topProductivityZonesIndia: "ଭାରତର ଶ୍ରେଷ୍ଠ ଉତ୍ପାଦକ କ୍ଷେତ୍ର",
    aiProductivityInsight: "ଉପକୂଳବର୍ତ୍ତୀ ପୁଷ୍ଟିକର ବୃଦ୍ଧି ହେତୁ ମାଛ ଦଳ ୩୮% ବୃଦ୍ଧି ପାଇବାର ସମ୍ଭାବନା।",
    hourlyProductivity: "ଘଣ୍ଟା ଅନୁସାରେ ଉତ୍ପାଦନ",
    catchForecast: "ମାଛ ଧରିବା ପୂର୍ବାନୁମାନ",
    speciesAggregation: "ପ୍ରମୁଖ ମାଛ ପ୍ରଜାତି",

    marineAnalysisTitle: "ସାମୁଦ୍ରିକ ବିଶ୍ଳେଷଣ ସୁଇଟ୍",
    categorySST: "ଏସଏସଟି (ତାପମାତ୍ରା)",
    categoryWeather: "ପାଣିପାଗ",
    categoryOcean: "ସମୁଦ୍ର ତରଙ୍ଗ",
    categoryChlorophyll: "କ୍ଲୋରୋଫିଲ୍",
    categorySpatial: "ସମୁଦ୍ର ଗଭୀରତା",

    sstTitle: "ସମୁଦ୍ର ପୃଷ୍ଠର ତାପମାତ୍ରା (SST)",
    sstDesc: "ତାପମାତ୍ରା ପ୍ରବାହ ଏବଂ ସାମୁଦ୍ରିକ ସୀମା",
    weatherTitle: "ସାମୁଦ୍ରିକ ପାଣିପାଗ ଓ ପବନ",
    weatherDesc: "ପବନର ବେଗ, ଦିଗ ଏବଂ ବାୟୁମଣ୍ଡଳୀୟ ଚାପ",
    oceanTitle: "ସାମୁଦ୍ରିକ ସ୍ରୋତ ଓ ଜୁଆର",
    oceanDesc: "ତରଙ୍ଗ ଉଚ୍ଚତା, ଜୁଆର ବେଗ ଓ ଗତିଶୀଳତା",
    chlorophyllTitle: "କ୍ଲୋରୋଫିଲ୍-ଏ ସାନ୍ଦ୍ରତା",
    chlorophyllDesc: "ପ୍ଲାଙ୍କଟନ୍ ଉପସ୍ଥିତି ଏବଂ ମାଛ ଖାଦ୍ୟ କ୍ଷେତ୍ର",
    spatialTitle: "ଗଭୀରତା ଓ ସାମୁଦ୍ରିକ ସୀମା",
    spatialDesc: "ଜଳର ଗଭୀରତା ଏବଂ ସୁରକ୍ଷିତ ନାଭିଗେସନ୍ ପଥ",

    windSpeed: "ପବନର ବେଗ",
    seaTemperature: "ସମୁଦ୍ର ତାପମାତ୍ରା",
    waveHeight: "ତରଙ୍ଗ ଉଚ୍ଚତା",
    tideVelocity: "ଜୁଆର ବେଗ",
    chlorophyllDensity: "କ୍ଲୋରୋଫିଲ୍ ସାନ୍ଦ୍ରତା",
    eezBoundary: "ଇଇଜେଡ୍ ସୀମା",
    bathymetryDepth: "ଜଳର ଗଭୀରତା",

    disasterAnalysisTitle: "ବିପର୍ଯ୍ୟୟ ଓ ଐତିହାସିକ ବିଶ୍ଳେଷଣ",
    selectDisasterPeriod: "ଐତିହାସିକ ବାତ୍ୟା ଚୟନ କରନ୍ତୁ",
    selectRegionDisaster: "ଉପକୂଳ ଅଞ୍ଚଳ ଚୟନ କରନ୍ତୁ",
    topDisastersIdentified: "ରେକର୍ଡ ହୋଇଥିବା ଗମ୍ଭୀର ବାତ୍ୟା",
    disasterType: "ବିପର୍ଯ୍ୟୟ ବର୍ଗୀକରଣ",
    damageLevel: "କ୍ଷତିର ମାତ୍ରା",
    impactAssessment: "ସାମୁଦ୍ରିକ ପ୍ରଭାବ ଆକଳନ",
    affectedMarineAreas: "ପ୍ରଭାବିତ ସାମୁଦ୍ରିକ କ୍ଷେତ୍ର",
    analyticalTrends: "ବାତ୍ୟା ତୀବ୍ରତା ଓ ତରଙ୍ଗ ବୃଦ୍ଧି ଟ୍ରେଣ୍ଡ",
    aiDisasterInsights: "ଏଆଇ ବିପର୍ଯ୍ୟୟ ପୁନର୍ନିର୍ମାଣ ବିଶ୍ଳେଷଣ",
    vesselsAffected: "ଫସି ରହିଥିବା / ଉଦ୍ଧାର ବୋଟ୍",
    portClosures: "ବନ୍ଦ ଥିବା ବନ୍ଦର",
    cycloneMichaung: "ବାତ୍ୟା ମିଚୌଙ୍ଗ (୨୦୨୩)",
    cycloneAsani: "ବାତ୍ୟା ଅସାନି (୨୦୨୨)",
    cycloneGulab: "ବାତ୍ୟା ଗୁଲାବ (୨୦୨୧)",
    tsunami2004: "ଭାରତ ମହାସାଗର ସୁନାମି (୨୦୦୪)",
    superCyclone1999: "ଓଡ଼ିଶା ମହାବାତ୍ୟା (୧୯୯୯)",

    riskPredictionTitle: "ସ୍ୱୟଂକ୍ରିୟ ସାମୁଦ୍ରିକ ବିପଦ ପୂର୍ବାନୁମାନ",
    aiPredictionModel: "ଏଆଇ ମେରାଇନ୍ ନ୍ୟୁରାଲ୍ ରିସ୍କ ମଡେଲ୍ v4.2",
    riskStatusLive: "ବର୍ତ୍ତମାନର ପ୍ରତ୍ୟକ୍ଷ ବିପଦ ସ୍ଥିତି",
    automatedModelActive: "ସ୍ୱୟଂକ୍ରିୟ ପ୍ରତ୍ୟକ୍ଷ ଅଦ୍ୟତନ ସକ୍ରିୟ",
    nextRefreshIn: "ପରବର୍ତ୍ତୀ ଅଦ୍ୟତନ",
    secondsSuffix: "ସେକେଣ୍ଡରେ",
    lastUpdatedNow: "ପୂର୍ବାନୁମାନ ସିଧାସଳଖ ଯାଞ୍ଚ ହୋଇଛି",
    aiPredictionInsights: "ଏଆଇ ବିପଦ ମୂଲ୍ୟାଙ୍କନ ରିପୋର୍ଟ",
    topHazardZones: "ସର୍ବାଧିକ ବିପଦପୂର୍ଣ୍ଣ କ୍ଷେତ୍ର ତାଲିକା",
    safetyNotice: "ସୁରକ୍ଷା ନିର୍ଦ୍ଦେଶାବଳୀ",
    maritimeAdvisory: "ଦକ୍ଷିଣ ସାମୁଦ୍ରିକ ଭଉଁରୀରୁ ୧୨ ନଟିକାଲ୍ ମାଇଲ୍ ଦୂରରେ ରହିବାକୁ ବୋଟ୍‌ଗୁଡ଼ିକୁ ପରାମର୍ଶ।",

    kmUnit: "କିମି",
    celsiusUnit: "°C",
    knotsUnit: "ନଟ୍",
    metersUnit: "ମିଟର",
    coordinatesLabel: "ସ୍ଥାନାଙ୍କ",
    liveStatus: "ଲାଇଭ୍",
    activeStatus: "ସକ୍ରିୟ",
    close: "ବନ୍ଦ କରନ୍ତୁ"
  },

  kn: {
    appName: "ಓರ್ಕಾ ಸಾಗರ ಗುಪ್ತಚರ",
    appSubtitle: "ಎಐ ಆಧಾರಿತ ಸಾಗರ ವಿಶ್ಲೇಷಣೆ ಮತ್ತು ಮೀನುಗಾರಿಕೆ ನೆರವು",
    welcomeHeading: "ಓರ್ಕಾ ಮರೀನ್ ಇಂಟೆಲಿಜೆನ್ಸ್",
    welcomeSubtitle: "ನೈಜ-ಸಮಯ ಸಾಗರ ವಿಶ್ಲೇಷಣೆ, ಸಾಗರಶಾಸ್ತ್ರೀಯ ಮಾಹಿತಿ ಮತ್ತು ಮೀನುಗಾರಿಕೆ ವಲಯ ಸಹಾಯ",
    getStarted: "ಪ್ರಾರಂಭಿಸಿ",
    languageSelectionTitle: "ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ",
    languageSelectionSubtitle: "ಸಂಪೂರ್ಣ ಅಪ್ಲಿಕೇಶನ್ ಬಳಕೆಗಾಗಿ ನಿಮ್ಮ ಭಾಷೆಯನ್ನು ಆರಿಸಿ",
    continueBtn: "ಮುಂದುವರಿಸಿ",
    selectLanguagePrompt: "ಮುಂದುವರಿಯಲು ಒಂದು ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ",

    userDetailsTitle: "ಬಳಕೆದಾರರ ವಿವರಗಳು ಮತ್ತು ಪಾತ್ರ",
    userDetailsSubtitle: "ನಿಮ್ಮ ಹೆಸರನ್ನು ನಮೂದಿಸಿ ಮತ್ತು ಕಾರ್ಯಕಾರಿ ಪಾತ್ರವನ್ನು ಆಯ್ಕೆಮಾಡಿ",
    fullNameLabel: "ಪೂರ್ಣ ಹೆಸರು",
    fullNamePlaceholder: "ನಿಮ್ಮ ಪೂರ್ಣ ಹೆಸರನ್ನು ಬರೆಯಿರಿ",
    selectRoleLabel: "ಪಾತ್ರವನ್ನು ಆಯ್ಕೆಮಾಡಿ",
    roleFisherman: "ಮೀನುಗಾರ (Fisherman)",
    roleFishermanDesc: "ಧ್ವನಿ ಸಹಾಯಕ, ಅತ್ಯುತ್ತಮ ಮೀನುಗಾರಿಕೆ ವಲಯ ಶಿಫಾರಸು, ಅಪಾಯ ಎಚ್ಚರಿಕೆ",
    roleOthers: "ಇತರರು / ಕಡಲ ಅಧಿಕಾರಿಗಳು",
    roleOthersDesc: "ರಾಷ್ಟ್ರೀಯ ಸಾಗರ ಮಾಹಿತಿ, ತಾಪಮಾನ, ಹವಾಮಾನ, ಕ್ಲೋರೊಫಿಲ್ ವಿಶ್ಲೇಷಣೆ",
    startExperienceBtn: "ಓರ್ಕಾ ಪ್ರಾರಂಭಿಸಿ",

    navHome: "ಮುಖಪುಟ",
    navFishing: "ಮೀನುಗಾರಿಕೆ",
    navProductivity: "ಉತ್ಪಾದಕತೆ",
    navAnalysis: "ಸಾಗರ ವಿಶ್ಲೇಷಣೆ",
    navDisasters: "ವಿಪತ್ತುಗಳು",
    navRiskPrediction: "ಅಪಾಯ ಮುನ್ಸೂಚನೆ",
    roleBadgeFisherman: "ಮೀನುಗಾರ",
    roleBadgeOthers: "ಮರೀನ್ ವಿಶ್ಲೇಷಕ",

    voiceAssistantTitle: "ಓರ್ಕಾ ವಾಯ್ಸ್ ಅಸಿಸ್ಟೆಂಟ್",
    voiceAssistantGreeting: "ನಮಸ್ಕಾರ! ನಾನು ನಿಮ್ಮ ಓರ್ಕಾ ಮರೀನ್ ಅಸಿಸ್ಟೆಂಟ್. ನೀವು ಎಲ್ಲಿ ಮೀನುಗಾರಿಕೆಗೆ ಹೋಗಲು ಬಯಸುತ್ತೀರಿ?",
    voiceListening: "ಕೇಳಿಸಿಕೊಳ್ಳುತ್ತಿದ್ದೇನೆ... ಸ್ಪಷ್ಟವಾಗಿ ಮಾತನಾಡಿ",
    voiceTapToSpeak: "ಮಾತನಾಡಲು ಒತ್ತಿ",
    voiceSwitchToManual: "ಮ್ಯಾನುಯಲ್ ಇನ್ಪುಟ್‌ಗೆ ಬದಲಾಯಿಸಿ",
    voiceQuestionRegion: "ನೀವು ಯಾವ ಕರಾವಳಿ ಪ್ರದೇಶ ಅಥವಾ ಬಂದರಿನಿಂದ ಹೊರಡುತ್ತಿದ್ದೀರಿ?",
    voiceQuestionDate: "ನಿಮ್ಮ ಪ್ರಯಾಣದ ದಿನಾಂಕ ಯಾವುದು?",
    voiceQuestionTime: "ಹೊರಡುವ ಸಮಯ ಯಾವುದು?",
    voiceQuestionPurpose: "ನಿಮ್ಮ ಮೀನುಗಾರಿಕೆಯ ಮುಖ್ಯ ಉದ್ದೇಶವೇನು?",
    voiceDonePrompt: "ಎಲ್ಲಾ ವಿವರಗಳನ್ನು ದಾಖಲಿಸಲಾಗಿದೆ! ವಿಶ್ಲೇಷಣೆಗಾಗಿ ಒತ್ತಿ.",
    voiceListeningStatus: "ಧ್ವನಿ ಸಹಾಯಕ ಸಕ್ರಿಯವಾಗಿದೆ",

    manualInputTitle: "ಪ್ರಯಾಣದ ನಿಯತಾಂಕಗಳು",
    manualInputSubtitle: "ವಲಯಗಳನ್ನು ಗುರುತಿಸಲು ವಿವರಗಳನ್ನು ಒದಗಿಸಿ",
    regionLabel: "ಕರಾವಳಿ ಪ್ರದೇಶ",
    dateLabel: "ಪ್ರಯಾಣ ದಿನಾಂಕ",
    timeLabel: "ಹೊರಡುವ ಸಮಯ",
    purposeLabel: "ಕಾರ್ಯಾಚರಣೆ ಉದ್ದೇಶ",
    analyzeBtn: "ಸಾಗರ ವಲಯಗಳನ್ನು ವಿಶ್ಲೇಷಿಸಿ",

    purposeCommercial: "ವಾಣಿಜ್ಯ ಟ್ರಾಲಿಂಗ್",
    purposeDeepSea: "ಆಳ ಸಮುದ್ರ ಬೇಟೆ",
    purposeCoastal: "ಕರಾವಳಿ ಸಾಂಪ್ರದಾಯಿಕ ಬೇಟೆ",
    purposeTuna: "ಟ್ಯೂನಾ ಮೀನು ಬೇಟೆ",
    purposeSardine: "ಸಾರ್ಡೀನ್ ಮತ್ತು ಇತರ",

    dashboardOverviewTitle: "ರಾಷ್ಟ್ರೀಯ ಸಾಗರ ಮಾಹಿತಿ",
    currentLocationLabel: "ಪ್ರಸ್ತುತ ಸಾಗರ ನೆಲೆ",
    topRiskZonesTitle: "ಭಾರತದ ಗರಿಷ್ಠ ಅಪಾಯದ ಸಾಗರ ವಲಯಗಳು",
    highProductivityZonesTitle: "ಹೆಚ್ಚಿನ ಮೀನು ಉತ್ಪಾದಕತೆಯ ವಲಯಗಳು",
    marineIntelligenceHub: "ಓರ್ಕಾ ಇಂಟೆಲಿಜೆನ್ಸ್ ಕೇಂದ್ರ",
    viewDetails: "ವಿವರಗಳನ್ನು ವೀಕ್ಷಿಸಿ",
    nationalContext: "ಭಾರತೀಯ ಕರಾವಳಿ ಮತ್ತು ವಿಶೇಷ ಆರ್ಥಿಕ ವಲಯ",

    bestFishingZoneTitle: "ಮೀನುಗಾರಿಕೆ ವಲಯ ಶಿಫಾರಸು",
    recommendedBestZone: "ಶಿಫಾರಸು ಮಾಡಲಾದ ಅತ್ಯುತ್ತಮ ಮೀನುಗಾರಿಕೆ ವಲಯ",
    distanceFromUser: "ದಡದಿಂದ ದೂರ",
    bestTimeToGo: "ಪ್ರಯಾಣಕ್ಕೆ ಸೂಕ್ತ ಸಮಯ",
    riskLevel: "ಸಾಗರ ಅಪಾಯದ ಮಟ್ಟ",
    weatherCondition: "ಹವಾಮಾನ ಸ್ಥಿತಿ",
    productivityLevel: "ಮೀನು ಲಭ್ಯತೆಯ ಸಂಭವನೀಯತೆ",
    aiRecommendationTitle: "ಎಐ ಸಾಗರ ಶಿಫಾರಸು",
    aiInsightFishingZone: "ದಡದಿಂದ 18.4 ಕಿ.ಮೀ ದೂರದಲ್ಲಿ ತಾಪಮಾನ ಸಂಗಮ ಪತ್ತೆಯಾಗಿದೆ. ಹೇರಳವಾದ ಕ್ಲೋರೊಫಿಲ್ ಮತ್ತು ಶಾಂತ ಸಾಗರವಿದೆ.",
    allActiveZones: "ಪ್ರದೇಶದಲ್ಲಿನ ಎಲ್ಲಾ ಸಕ್ರಿಯ ವಲಯಗಳು",
    todayBestZones: "ಇಂದಿನ ಪ್ರಮುಖ ವಲಯಗಳು",
    navigateZone: "ದಿಕ್ಕು ನಿರ್ಧರಿಸಿ",
    safetyConfirmed: "ಸುರಕ್ಷಿತ ಸಾಗರ ಪರಿಸ್ಥಿತಿ",

    riskLow: "ಕಡಿಮೆ ಅಪಾಯ",
    riskModerate: "ಮಧ್ಯಮ ಅಪಾಯ",
    riskHigh: "ಹೆಚ್ಚಿನ ಅಪಾಯ",
    riskSevere: "ತೀವ್ರ ಎಚ್ಚರಿಕೆ",

    prodHigh: "ಹೆಚ್ಚಿನ ಉತ್ಪಾದಕತೆ (94%)",
    prodModerate: "ಮಧ್ಯಮ ಉತ್ಪಾದಕತೆ (68%)",
    prodLow: "ಕಡಿಮೆ ಉತ್ಪಾದಕತೆ (32%)",

    productivityAnalysisTitle: "ಉತ್ಪಾದಕತೆ ವಿಶ್ಲೇಷಣೆ",
    todayProductivityScore: "ಇಂದಿನ ಒಟ್ಟು ಸ್ಕೋರ್",
    productivityTrendTitle: "ಸಾಗರ ಉತ್ಪಾದಕತೆಯ ಪ್ರವೃತ್ತಿ",
    topProductivityZonesIndia: "ಭಾರತದ ಪ್ರಮುಖ ಉತ್ಪಾದಕ ವಲಯಗಳು",
    aiProductivityInsight: "ಕರಾವಳಿ ಕ್ಲೋರೊಫಿಲ್ ಹೆಚ್ಚಳದಿಂದ ಮೀನುಗಳ ಸಮೂಹ 38% ಹೆಚ್ಚಾಗುವ ಸಾಧ್ಯತೆಯಿದೆ.",
    hourlyProductivity: "ಪ್ರತಿ ಗಂಟೆಯ ಉತ್ಪಾದಕತೆ",
    catchForecast: "ಮೀನು ಹಿಡಿಯುವ ಮುನ್ಸೂಚನೆ",
    speciesAggregation: "ಪ್ರಮುಖ ಮೀನು ಪ್ರಭೇದಗಳು",

    marineAnalysisTitle: "ಸಾಗರ ವಿಶ್ಲೇಷಣೆ ವಿಭಾಗ",
    categorySST: "ಎಸ್.ಎಸ್.ಟಿ (ತಾಪಮಾನ)",
    categoryWeather: "ಹವಾಮಾನ",
    categoryOcean: "ಸಮುದ್ರ ಪ್ರವಾಹ",
    categoryChlorophyll: "ಕ್ಲೋರೊಫಿಲ್",
    categorySpatial: "ಸಾಗರ ಆಳ",

    sstTitle: "ಸಮುದ್ರದ ಮೇಲ್ಮೈ ತಾಪಮಾನ (SST)",
    sstDesc: "ತಾಪಮಾನ ಪ್ರವಾಹಗಳು ಮತ್ತು ಸಾಗರ ಗಡಿಗಳು",
    weatherTitle: "ಸಾಗರ ಹವಾಮಾನ ಮತ್ತು ಗಾಳಿ",
    weatherDesc: "ಗಾಳಿಯ ವೇಗ, ದಿಕ್ಕು ಮತ್ತು ವಾತಾವರಣದ ಒತ್ತಡ",
    oceanTitle: "ಸಾಗರ ಪ್ರವಾಹಗಳು ಮತ್ತು ಉಬ್ಬರವಿಳಿತ",
    oceanDesc: "ಅಲೆಗಳ ಎತ್ತರ, ಪ್ರವಾಹದ ವೇಗ ಮತ್ತು ಚಲನೆ",
    chlorophyllTitle: "ಕ್ಲೋರೊಫಿಲ್-ಎ ಸಾಂದ್ರತೆ",
    chlorophyllDesc: "ಪ್ಲಾಂಕ್ಟನ್ ಲಭ್ಯತೆ ಮತ್ತು ಮೀನು ಆಹಾರ ವಲಯಗಳು",
    spatialTitle: "ಸಾಗರ ಆಳ ಮತ್ತು ಗಡಿಗಳು",
    spatialDesc: "ನೀರಿನ ಆಳ ಮತ್ತು ಸುರಕ್ಷಿತ ಸಂಚಾರ ಮಾರ್ಗಗಳು",

    windSpeed: "ಗಾಳಿಯ ವೇಗ",
    seaTemperature: "ಸಮುದ್ರ ತಾಪಮಾನ",
    waveHeight: "ಅಲೆಯ ಎತ್ತರ",
    tideVelocity: "ಪ್ರವಾಹದ ವೇಗ",
    chlorophyllDensity: "ಕ್ಲೋರೊಫಿಲ್ ಸಾಂದ್ರತೆ",
    eezBoundary: "ಆರ್ಥಿಕ ಸಾಗರ ಗಡಿ",
    bathymetryDepth: "ನೀರಿನ ಆಳ",

    disasterAnalysisTitle: "ವಿಪತ್ತು ಮತ್ತು ಐತಿಹಾಸಿಕ ವಿಶ್ಲೇಷಣೆ",
    selectDisasterPeriod: "ಐತಿಹಾಸಿಕ ಚಂಡಮಾರುತ ಆಯ್ಕೆಮಾಡಿ",
    selectRegionDisaster: "ಕರಾವಳಿ ಪ್ರದೇಶವನ್ನು ಆಯ್ಕೆಮಾಡಿ",
    topDisastersIdentified: "ದಾಖಲಾದ ತೀವ್ರ ವಿಪತ್ತುಗಳು",
    disasterType: "ವಿಪತ್ತು ವರ್ಗೀಕರಣ",
    damageLevel: "ಹಾನಿಯ ಮಟ್ಟ",
    impactAssessment: "ಸಾಗರ ಪರಿಣಾಮ ಮೌಲ್ಯಮಾಪನ",
    affectedMarineAreas: "ಬಾಧಿತ ಸಾಗರ ಪ್ರದೇಶಗಳು",
    analyticalTrends: "ಚಂಡಮಾರುತ ತೀವ್ರತೆ ಮತ್ತು ಅಲೆಗಳ ಹೆಚ್ಚಳ ಪ್ರವೃತ್ತಿ",
    aiDisasterInsights: "ಎಐ ವಿಪತ್ತು ಪುನರ್ನಿರ್ಮಾಣ ವಿಶ್ಲೇಷಣೆ",
    vesselsAffected: "ಸಿಲುಕಿಕೊಂಡ / ರಕ್ಷಿಸಲಾದ ಬೋಟ್‌ಗಳು",
    portClosures: "ಮುಚ್ಚಲಾದ ಬಂದರುಗಳು",
    cycloneMichaung: "ಮಿಚಾಂಗ್ ಚಂಡಮಾರುತ (2023)",
    cycloneAsani: "ಅಸಾನಿ ಚಂಡಮಾರುತ (2022)",
    cycloneGulab: "ಗುಲಾಬ್ ಚಂಡಮಾರುತ (2021)",
    tsunami2004: "ಹಿಂದೂ ಮಹಾಸಾಗರ ಸುನಾಮಿ (2004)",
    superCyclone1999: "ಒಡಿಶಾ ಸೂಪರ್ ಸೈಕ್ಲೋನ್ (1999)",

    riskPredictionTitle: "ಸ್ವಯಂಚಾಲಿತ ಸಾಗರ ಅಪಾಯ ಮುನ್ಸೂಚನೆ",
    aiPredictionModel: "ಎಐ ಮರೀನ್ ನ್ಯೂರಲ್ ರಿಸ್ಕ್ ಮಾಡೆಲ್ v4.2",
    riskStatusLive: "ಪ್ರಸ್ತುತ ಲೈವ್ ಅಪಾಯ ಸ್ಥಿತಿ",
    automatedModelActive: "ಸ್ವಯಂಚಾಲಿತ ನೈಜ-ಸಮಯ ನವೀಕರಣ ಸಕ್ರಿಯವಾಗಿದೆ",
    nextRefreshIn: "ಮುಂದಿನ ನವೀಕರಣ",
    secondsSuffix: "ಸೆಕೆಂಡುಗಳಲ್ಲಿ",
    lastUpdatedNow: "ಮುನ್ಸೂಚನೆಗಳನ್ನು ಲೈವ್ ಆಗಿ ಪರಿಶೀಲಿಸಲಾಗಿದೆ",
    aiPredictionInsights: "ಎಐ ಅಪಾಯ ಮೌಲ್ಯಮಾಪನ ವರದಿ",
    topHazardZones: "ಹೆಚ್ಚು ಅಪಾಯವಿರುವ ವಲಯಗಳ ಪಟ್ಟಿ",
    safetyNotice: "ಸುರಕ್ಷತಾ ಸಲಹೆ",
    maritimeAdvisory: "ದಕ್ಷಿಣ ಸಾಗರ ಸುಳಿಯಿಂದ ಬೋಟ್‌ಗಳು 12 ನಾಟಿಕಲ್ ಮೈಲಿ ದೂರವಿರಲು ಸೂಚಿಸಲಾಗಿದೆ.",

    kmUnit: "ಕಿ.ಮೀ",
    celsiusUnit: "°C",
    knotsUnit: "ನಾಟ್ಸ್",
    metersUnit: "ಮೀಟರ್",
    coordinatesLabel: "ನಿರ್ದೇಶಾಂಕಗಳು",
    liveStatus: "ಲೈವ್",
    activeStatus: "ಸಕ್ರಿಯ",
    close: "ಮುಚ್ಚಿ"
  },

  pa: {
    appName: "ਓਰਕਾ ਸਮੁੰਦਰੀ ਖੁਫੀਆ",
    appSubtitle: "ਏਆਈ ਸੰਚਾਲਿਤ ਸਮੁੰਦਰੀ ਵਿਸ਼ਲੇਸ਼ਣ ਅਤੇ ਮੱਛੀ ਪਾਲਣ ਸਹਾਇਤਾ",
    welcomeHeading: "ਓਰਕਾ ਮਰੀਨ ਇੰਟੈਲੀਜੈਂਸ",
    welcomeSubtitle: "ਰੀਅਲ-ਟਾਈਮ ਸਮੁੰਦਰੀ ਵਿਸ਼ਲੇਸ਼ਣ, ਸਮੁੰਦਰ ਵਿਗਿਆਨ ਅਤੇ ਮੱਛੀ ਫੜਨ ਦੇ ਖੇਤਰਾਂ ਦੀ ਸਹਾਇਤਾ",
    getStarted: "ਸ਼ੁਰੂ ਕਰੋ",
    languageSelectionTitle: "ਭਾਸ਼ਾ ਚੁਣੋ",
    languageSelectionSubtitle: "ਪੂਰੀ ਐਪਲੀਕੇਸ਼ਨ ਲਈ ਆਪਣੀ ਪਸੰਦੀਦਾ ਭਾਸ਼ਾ ਚੁਣੋ",
    continueBtn: "ਜਾਰੀ ਰੱਖੋ",
    selectLanguagePrompt: "ਅੱਗੇ ਵਧਣ ਲਈ ਇੱਕ ਭਾਸ਼ਾ ਚੁਣੋ",

    userDetailsTitle: "ਉਪਭੋਗਤਾ ਵੇਰਵੇ ਅਤੇ ਭੂਮਿਕਾ",
    userDetailsSubtitle: "ਆਪਣਾ ਨਾਮ ਦਰਜ ਕਰੋ ਅਤੇ ਆਪਣੀ ਕਾਰਜਸ਼ੀਲ ਭੂਮਿਕਾ ਚੁਣੋ",
    fullNameLabel: "ਪੂਰਾ ਨਾਮ",
    fullNamePlaceholder: "ਆਪਣਾ ਪੂਰਾ ਨਾਮ ਲਿਖੋ",
    selectRoleLabel: "ਭੂਮਿਕਾ ਚੁਣੋ",
    roleFisherman: "ਮਛੇਰਾ (Fisherman)",
    roleFishermanDesc: "ਨਿੱਜੀ ਵੌਇਸ ਸਹਾਇਕ, ਉੱਤਮ ਮੱਛੀ ਫੜਨ ਦੇ ਖੇਤਰ, ਖ਼ਤਰਾ ਚਿਤਾਵਨੀਆਂ",
    roleOthers: "ਹੋਰ / ਸਮੁੰਦਰੀ ਅਧਿਕਾਰੀ",
    roleOthersDesc: "ਰਾਸ਼ਟਰੀ ਸਮੁੰਦਰੀ ਖੁਫੀਆ, ਤਾਪਮਾਨ, ਮੌਸਮ, ਆਫ਼ਤ ਵਿਸ਼ਲੇਸ਼ਣ",
    startExperienceBtn: "ਓਰਕਾ ਸ਼ੁਰੂ ਕਰੋ",

    navHome: "ਮੁੱਖ ਪੰਨਾ",
    navFishing: "ਮੱਛੀ ਫੜਨਾ",
    navProductivity: "ਉਤਪਾਦਕਤਾ",
    navAnalysis: "ਸਮੁੰਦਰੀ ਵਿਸ਼ਲੇਸ਼ਣ",
    navDisasters: "ਆਫ਼ਤਾਂ",
    navRiskPrediction: "ਜੋਖਮ ਭਵਿੱਖਬਾਣੀ",
    roleBadgeFisherman: "ਮਛੇਰਾ",
    roleBadgeOthers: "ਸਮੁੰਦਰੀ ਵਿਸ਼ਲੇਸ਼ਕ",

    voiceAssistantTitle: "ਓਰਕਾ ਵੌਇਸ ਅਸਿਸਟੈਂਟ",
    voiceAssistantGreeting: "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ! ਮੈਂ ਤੁਹਾਡਾ ਓਰਕਾ ਮਰੀਨ ਅਸਿਸਟੈਂਟ ਹਾਂ। ਤੁਸੀਂ ਮੱਛੀ ਫੜਨ ਕਿੱਥੇ ਜਾਣਾ ਚਾਹੁੰਦੇ ਹੋ?",
    voiceListening: "ਸੁਣ ਰਿਹਾ ਹਾਂ... ਸਪਸ਼ਟ ਬੋਲੋ",
    voiceTapToSpeak: "ਬੋਲਣ ਲਈ ਦਬਾਓ",
    voiceSwitchToManual: "ਮੈਨੂਅਲ ਇਨਪੁਟ 'ਤੇ ਜਾਓ",
    voiceQuestionRegion: "ਤੁਸੀਂ ਕਿਸ ਤੱਟਵਰਤੀ ਖੇਤਰ ਜਾਂ ਬੰਦਰਗਾਹ ਤੋਂ ਰਵਾਨਾ ਹੋ ਰਹੇ ਹੋ?",
    voiceQuestionDate: "ਤੁਹਾਡੀ ਯਾਤਰਾ ਦੀ ਮਿਤੀ ਕੀ ਹੈ?",
    voiceQuestionTime: "ਤੁਸੀਂ ਕਿਸ ਸਮੇਂ ਰਵਾਨਾ ਹੋਣਾ ਚਾਹੁੰਦੇ ਹੋ?",
    voiceQuestionPurpose: "ਤੁਹਾਡੀ ਯਾਤਰਾ ਦਾ ਮੁੱਖ ਮਕਸਦ ਕੀ ਹੈ?",
    voiceDonePrompt: "ਸਾਰੇ ਵੇਰਵੇ ਦਰਜ ਹੋ ਗਏ ਹਨ! ਵਿਸ਼ਲੇਸ਼ਣ ਲਈ ਦਬਾਓ।",
    voiceListeningStatus: "ਵੌਇਸ ਅਸਿਸਟੈਂਟ ਸਰਗਰਮ ਹੈ",

    manualInputTitle: "ਯਾਤਰਾ ਵੇਰਵੇ",
    manualInputSubtitle: "ਅਨੁਕੂਲ ਸਮੁੰਦਰੀ ਖੇਤਰ ਲੱਭਣ ਲਈ ਵੇਰਵੇ ਦਿਓ",
    regionLabel: "ਤੱਟਵਰਤੀ ਖੇਤਰ",
    dateLabel: "ਯਾਤਰਾ ਮਿਤੀ",
    timeLabel: "ਰਵਾਨਗੀ ਸਮਾਂ",
    purposeLabel: "ਮੱਛੀ ਫੜਨ ਦਾ ਮਕਸਦ",
    analyzeBtn: "ਸਮੁੰਦਰੀ ਖੇਤਰਾਂ ਦਾ ਵਿਸ਼ਲੇਸ਼ਣ ਕਰੋ",

    purposeCommercial: "ਵਪਾਰਕ ਟ੍ਰਾਲਿੰਗ",
    purposeDeepSea: "ਡੂੰਘੇ ਸਮੁੰਦਰ ਵਿੱਚ ਸ਼ਿਕਾਰ",
    purposeCoastal: "ਤੱਟਵਰਤੀ ਰਵਾਇਤੀ ਸ਼ਿਕਾਰ",
    purposeTuna: "ਟੂਨਾ ਮੱਛੀ ਸ਼ਿਕਾਰ",
    purposeSardine: "ਸਾਰਡੀਨ ਅਤੇ ਹੋਰ",

    dashboardOverviewTitle: "ਰਾਸ਼ਟਰੀ ਸਮੁੰਦਰੀ ਜਾਣਕਾਰੀ",
    currentLocationLabel: "ਮੌਜੂਦਾ ਸਮੁੰਦਰੀ ਅੱਡਾ",
    topRiskZonesTitle: "ਭਾਰਤ ਦੇ ਸਭ ਤੋਂ ਵੱਧ ਜੋਖਮ ਵਾਲੇ ਸਮੁੰਦਰੀ ਖੇਤਰ",
    highProductivityZonesTitle: "ਉੱਚ ਮੱਛੀ ਉਤਪਾਦਕਤਾ ਖੇਤਰ",
    marineIntelligenceHub: "ਓਰਕਾ ਇੰਟੈਲੀਜੈਂਸ ਕੇਂਦਰ",
    viewDetails: "ਵੇਰਵੇ ਦੇਖੋ",
    nationalContext: "ਭਾਰਤੀ ਤੱਟਰੇਖਾ ਅਤੇ ਆਰਥਿਕ ਖੇਤਰ",

    bestFishingZoneTitle: "ਮੱਛੀ ਫੜਨ ਦੇ ਖੇਤਰ ਦੀ ਸਿਫ਼ਾਰਸ਼",
    recommendedBestZone: "ਸਿਫ਼ਾਰਸ਼ ਕੀਤਾ ਸਰਵੋਤਮ ਖੇਤਰ",
    distanceFromUser: "ਤੱਟ ਤੋਂ ਦੂਰੀ",
    bestTimeToGo: "ਸਭ ਤੋਂ ਵਧੀਆ ਸਮਾਂ",
    riskLevel: "ਸਮੁੰਦਰੀ ਜੋਖਮ ਪੱਧਰ",
    weatherCondition: "ਮੌਸਮ ਦੀ ਸਥਿਤੀ",
    productivityLevel: "ਮੱਛੀ ਮਿਲਣ ਦੀ ਸੰਭਾਵਨਾ",
    aiRecommendationTitle: "ਏਆਈ ਸਮੁੰਦਰੀ ਸਿਫ਼ਾਰਸ਼",
    aiInsightFishingZone: "ਤੱਟ ਤੋਂ 18.4 ਕਿਲੋਮੀਟਰ ਦੂਰ ਅਨੁਕੂਲ ਤਾਪਮਾਨ ਮਿਲਿਆ ਹੈ। ਸ਼ਾਂਤ ਸਮੁੰਦਰ ਅਤੇ ਭਰਪੂਰ ਕਲੋਰੋਫਿਲ ਮੌਜੂਦ ਹੈ।",
    allActiveZones: "ਖੇਤਰ ਦੇ ਸਾਰੇ ਸਰਗਰਮ ਖੇਤਰ",
    todayBestZones: "ਅੱਜ ਦੇ ਪ੍ਰਮੁੱਖ ਖੇਤਰ",
    navigateZone: "ਦਿਸ਼ਾ ਨਿਰਧਾਰਤ ਕਰੋ",
    safetyConfirmed: "ਸੁਰੱਖਿਅਤ ਸਮੁੰਦਰੀ ਹਾਲਾਤ",

    riskLow: "ਘੱਟ ਜੋਖਮ",
    riskModerate: "ਦਰਮਿਆਨਾ ਜੋਖਮ",
    riskHigh: "ਉੱਚ ਜੋਖਮ",
    riskSevere: "ਗੰਭੀਰ ਚਿਤਾਵਨੀ",

    prodHigh: "ਉੱਚ ਉਤਪਾਦਕਤਾ (94%)",
    prodModerate: "ਦਰਮਿਆਨੀ ਉਤਪਾਦਕਤਾ (68%)",
    prodLow: "ਘੱਟ ਉਤਪਾਦਕਤਾ (32%)",

    productivityAnalysisTitle: "ਉਤਪਾਦਕਤਾ ਵਿਸ਼ਲੇਸ਼ਣ",
    todayProductivityScore: "ਅੱਜ ਦਾ ਸਮੁੱਚਾ ਸਕੋਰ",
    productivityTrendTitle: "ਸਮੁੰਦਰੀ ਉਤਪਾਦਕਤਾ ਰੁਝਾਨ",
    topProductivityZonesIndia: "ਭਾਰਤ ਦੇ ਪ੍ਰਮੁੱਖ ਉਤਪਾਦਕ ਖੇਤਰ",
    aiProductivityInsight: "ਤੱਟਵਰਤੀ ਪੋਸ਼ਣ ਵਾਧੇ ਕਾਰਨ ਮੱਛੀਆਂ ਦੇ ਝੁੰਡ ਵਿੱਚ 38% ਵਾਧੇ ਦੀ ਸੰਭਾਵਨਾ।",
    hourlyProductivity: "ਪ੍ਰਤੀ ਘੰਟਾ ਉਤਪਾਦਕਤਾ",
    catchForecast: "ਮੱਛੀ ਫੜਨ ਦੀ ਭਵਿੱਖਬਾਣੀ",
    speciesAggregation: "ਮੁੱਖ ਮੱਛੀ ਪ੍ਰਜਾਤੀਆਂ",

    marineAnalysisTitle: "ਸਮੁੰਦਰੀ ਵਿਸ਼ਲੇਸ਼ਣ ਸੂਟ",
    categorySST: "ਐੱਸ.ਐੱਸ.ਟੀ (ਤਾਪਮਾਨ)",
    categoryWeather: "ਮੌਸਮ",
    categoryOcean: "ਸਮੁੰਦਰੀ ਧਾਰਾਵਾਂ",
    categoryChlorophyll: "ਕਲੋਰੋਫਿਲ",
    categorySpatial: "ਸਮੁੰਦਰੀ ਡੂੰਘਾਈ",

    sstTitle: "ਸਮੁੰਦਰ ਦੀ ਸਤ੍ਹਾ ਦਾ ਤਾਪਮਾਨ (SST)",
    sstDesc: "ਤਾਪਮਾਨ ਪ੍ਰਵਾਹ ਅਤੇ ਸਮੁੰਦਰੀ ਸੀਮਾਵਾਂ",
    weatherTitle: "ਸਮੁੰਦਰੀ ਮੌਸਮ ਅਤੇ ਹਵਾ",
    weatherDesc: "ਹਵਾ ਦੀ ਗਤੀ, ਦਿਸ਼ਾ ਅਤੇ ਵਾਯੂਮੰਡਲ ਦਾ ਦਬਾਅ",
    oceanTitle: "ਸਮੁੰਦਰੀ ਲਹਿਰਾਂ ਅਤੇ ਲਹਿਰਾਂ ਦੀ ਗਤੀ",
    oceanDesc: "ਲਹਿਰਾਂ ਦੀ ਉਚਾਈ, ਵਹਾਅ ਦੀ ਗਤੀ ਅਤੇ ਤੀਬਰਤਾ",
    chlorophyllTitle: "ਕਲੋਰੋਫਿਲ-ਏ ਘਣਤਾ",
    chlorophyllDesc: "ਪਲੈਂਕਟਨ ਭਰਪੂਰਤਾ ਅਤੇ ਮੱਛੀ ਖੁਰਾਕ ਖੇਤਰ",
    spatialTitle: "ਸਮੁੰਦਰੀ ਡੂੰਘਾਈ ਅਤੇ ਸੀਮਾਵਾਂ",
    spatialDesc: "ਪਾਣੀ ਦੀ ਡੂੰਘਾਈ ਅਤੇ ਸੁਰੱਖਿਅਤ ਨੇਵੀਗੇਸ਼ਨ ਰਸਤੇ",

    windSpeed: "ਹਵਾ ਦੀ ਗਤੀ",
    seaTemperature: "ਸਮੁੰਦਰ ਦਾ ਤਾਪਮਾਨ",
    waveHeight: "ਲਹਿਰ ਦੀ ਉਚਾਈ",
    tideVelocity: "ਧਾਰਾ ਦੀ ਗਤੀ",
    chlorophyllDensity: "ਕਲੋਰੋਫਿਲ ਘਣਤਾ",
    eezBoundary: "ਆਰਥਿਕ ਸਮੁੰਦਰੀ ਸੀਮਾ",
    bathymetryDepth: "ਪਾਣੀ ਦੀ ਡੂੰਘਾਈ",

    disasterAnalysisTitle: "ਆਫ਼ਤ ਅਤੇ ਇਤਿਹਾਸਕ ਵਿਸ਼ਲੇਸ਼ਣ",
    selectDisasterPeriod: "ਇਤਿਹਾਸਕ ਚੱਕਰਵਾਤ ਚੁਣੋ",
    selectRegionDisaster: "ਤੱਟਵਰਤੀ ਖੇਤਰ ਚੁਣੋ",
    topDisastersIdentified: "ਦਰਜ ਕੀਤੀਆਂ ਗੰਭੀਰ ਆਫ਼ਤਾਂ",
    disasterType: "ਆਫ਼ਤ ਵਰਗੀਕਰਨ",
    damageLevel: "ਨੁਕਸਾਨ ਦਾ ਪੱਧਰ",
    impactAssessment: "ਸਮੁੰਦਰੀ ਪ੍ਰਭਾਵ ਮੁਲਾਂਕਣ",
    affectedMarineAreas: "ਪ੍ਰਭਾਵਿਤ ਸਮੁੰਦਰੀ ਖੇਤਰ",
    analyticalTrends: "ਤੂਫ਼ਾਨ ਦੀ ਤੀਬਰਤਾ ਅਤੇ ਲਹਿਰਾਂ ਦੇ ਵਾਧੇ ਦਾ ਰੁਝਾਨ",
    aiDisasterInsights: "ਏਆਈ ਆਫ਼ਤ ਪੁਨਰ ਨਿਰਮਾਣ ਵਿਸ਼ਲੇਸ਼ਣ",
    vesselsAffected: "ਫਸੀਆਂ / ਬਚਾਈਆਂ ਗਈਆਂ ਕਿਸ਼ਤੀਆਂ",
    portClosures: "ਬੰਦ ਬੰਦਰਗਾਹਾਂ",
    cycloneMichaung: "ਚੱਕਰਵਾਤ ਮਿਚੌਂਗ (2023)",
    cycloneAsani: "ਚੱਕਰਵਾਤ ਅਸਾਨੀ (2022)",
    cycloneGulab: "ਚੱਕਰਵਾਤ ਗੁਲਾਬ (2021)",
    tsunami2004: "ਹਿੰਦ ਮਹਾਸਾਗਰ ਸੁਨਾਮੀ (2004)",
    superCyclone1999: "ਓਡੀਸ਼ਾ ਸੁਪਰ ਸਾਈਕਲੋਨ (1999)",

    riskPredictionTitle: "ਆਟੋਮੈਟਿਕ ਸਮੁੰਦਰੀ ਜੋਖਮ ਭਵਿੱਖਬਾਣੀ",
    aiPredictionModel: "ਏਆਈ ਮਰੀਨ ਨਿਊਰਲ ਰਿਸਕ ਮਾਡਲ v4.2",
    riskStatusLive: "ਮੌਜੂਦਾ ਲਾਈਵ ਜੋਖਮ ਸਥਿਤੀ",
    automatedModelActive: "ਆਟੋਮੈਟਿਕ ਰੀਅਲ-ਟਾਈਮ ਅਪਡੇਟ ਸਰਗਰਮ ਹੈ",
    nextRefreshIn: "ਅਗਲਾ ਅਪਡੇਟ",
    secondsSuffix: "ਸਕਿੰਟਾਂ ਵਿੱਚ",
    lastUpdatedNow: "ਭਵਿੱਖਬਾਣੀਆਂ ਲਾਈਵ ਪ੍ਰਮਾਣਿਤ ਕੀਤੀਆਂ ਗਈਆਂ",
    aiPredictionInsights: "ਏਆਈ ਜੋਖਮ ਮੁਲਾਂਕਣ ਰਿਪੋਰਟ",
    topHazardZones: "ਸਭ ਤੋਂ ਵੱਧ ਜੋਖਮ ਵਾਲੇ ਖੇਤਰਾਂ ਦੀ ਸੂਚੀ",
    safetyNotice: "ਨੇਵੀਗੇਸ਼ਨ ਸੁਰੱਖਿਆ ਸਲਾਹ",
    maritimeAdvisory: "ਦੱਖਣੀ ਸਮੁੰਦਰੀ ਵੌਰਟੈਕਸ ਤੋਂ ਕਿਸ਼ਤੀਆਂ ਨੂੰ 12 ਨੌਟੀਕਲ ਮੀਲ ਦੂਰ ਰਹਿਣ ਦੀ ਸਲਾਹ ਦਿੱਤੀ ਜਾਂਦੀ ਹੈ।",

    kmUnit: "ਕਿਮੀ",
    celsiusUnit: "°C",
    knotsUnit: "ਨੌਟਸ",
    metersUnit: "ਮੀਟਰ",
    coordinatesLabel: "ਨਿਰਦੇਸ਼ਾਂਕ",
    liveStatus: "ਲਾਈਵ",
    activeStatus: "ਸਰਗਰਮ",
    close: "ਬੰਦ ਕਰੋ"
  }
};
