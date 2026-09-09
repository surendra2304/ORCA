export interface MarineCoordinate {
  lat: number;
  lng: number;
}

export interface CoastalRegion {
  id: string;
  name: string;
  state: string;
  center: MarineCoordinate;
  userBase: MarineCoordinate;
  zoom: number;
}

export interface FishingZone {
  id: string;
  code: string;
  name: string;
  regionId: string;
  coordinates: MarineCoordinate;
  distanceKm: number;
  bestTime: string;
  riskLevel: 'low' | 'moderate' | 'high' | 'severe';
  riskScore: number; // 0-100
  productivity: 'high' | 'moderate' | 'low';
  productivityScore: number; // 0-100
  sstCelsius: number;
  chlorophyllDensity: number; // mg/m3
  waveHeightMeters: number;
  windSpeedKnots: number;
  isRecommendedBest: boolean;
  species: string[];
  notes: string;
}

export interface RiskZone {
  id: string;
  name: string;
  regionId: string;
  coordinates: MarineCoordinate;
  radiusKm: number;
  riskScore: number;
  severity: 'moderate' | 'high' | 'severe';
  hazardType: string;
  currentTrend: 'increasing' | 'stable' | 'decreasing';
  advisory: string;
  detectedAt: string;
}

export interface HistoricalDisaster {
  id: string;
  name: string;
  year: number;
  period: string;
  type: string;
  center: MarineCoordinate;
  intensityCategory: string;
  maxWindKmph: number;
  maxSurgeMeters: number;
  damageLevel: string;
  vesselsAffectedCount: number;
  portsSuspended: string[];
  impactSummary: string;
  affectedCoordinates: MarineCoordinate[];
  trendData: { time: string; wind: number; surge: number }[];
}

export const COASTAL_REGIONS: CoastalRegion[] = [
  {
    id: 'andhra-coast',
    name: 'Andhra Coast (Machilipatnam / Kakinada)',
    state: 'Andhra Pradesh',
    center: { lat: 16.28, lng: 81.65 },
    userBase: { lat: 16.18, lng: 81.16 }, // Coastal port of Machilipatnam
    zoom: 9
  },
  {
    id: 'tamilnadu-coast',
    name: 'Coromandel Coast (Chennai / Nagapattinam)',
    state: 'Tamil Nadu',
    center: { lat: 12.90, lng: 80.45 },
    userBase: { lat: 13.08, lng: 80.29 }, // Chennai Harbor
    zoom: 9
  },
  {
    id: 'kerala-coast',
    name: 'Malabar Coast (Kochi / Kollam)',
    state: 'Kerala',
    center: { lat: 9.85, lng: 75.95 },
    userBase: { lat: 9.96, lng: 76.24 }, // Kochi Fisheries Harbor
    zoom: 9
  },
  {
    id: 'odisha-coast',
    name: 'Odisha Bay (Puri / Paradip)',
    state: 'Odisha',
    center: { lat: 19.85, lng: 86.20 },
    userBase: { lat: 19.79, lng: 85.82 }, // Puri Coastal Base
    zoom: 9
  },
  {
    id: 'gujarat-coast',
    name: 'Saurashtra Coast (Veraval / Porbandar)',
    state: 'Gujarat',
    center: { lat: 20.70, lng: 70.25 },
    userBase: { lat: 20.90, lng: 70.37 }, // Veraval Commercial Port
    zoom: 9
  }
];

// All fishing zones have strictly verified OFFSHORE OCEAN WATER coordinates
export const ALL_FISHING_ZONES: FishingZone[] = [
  // --- Andhra Pradesh Coast (Offshore Bay of Bengal) ---
  {
    id: 'fz-01',
    code: 'PFZ-18',
    name: 'Machilipatnam Offshore Deep Confluence',
    regionId: 'andhra-coast',
    // 18.4 km South-East of Machilipatnam Coast into deep Bay of Bengal water
    coordinates: { lat: 16.08, lng: 81.30 },
    distanceKm: 18.4,
    bestTime: '04:30 AM - 08:30 AM',
    riskLevel: 'low',
    riskScore: 18,
    productivity: 'high',
    productivityScore: 94,
    sstCelsius: 27.8,
    chlorophyllDensity: 2.85,
    waveHeightMeters: 0.9,
    windSpeedKnots: 11,
    isRecommendedBest: true,
    species: ['Yellowfin Tuna', 'Indian Mackerel', 'Threadfin Bream'],
    notes: 'Thermal confluence front 18.4 km offshore in open ocean. High zooplankton aggregation.'
  },
  {
    id: 'fz-02',
    code: 'PFZ-29',
    name: 'Narsapur Mid-Continental Edge',
    regionId: 'andhra-coast',
    // Offshore south of Narsapur / Antarvedi in open ocean
    coordinates: { lat: 16.16, lng: 81.88 },
    distanceKm: 26.8,
    bestTime: '05:00 AM - 09:00 AM',
    riskLevel: 'moderate',
    riskScore: 48,
    productivity: 'moderate',
    productivityScore: 68,
    sstCelsius: 28.5,
    chlorophyllDensity: 1.95,
    waveHeightMeters: 1.4,
    windSpeedKnots: 16,
    isRecommendedBest: false,
    species: ['Kingfish', 'Sardines', 'Tiger Prawns'],
    notes: 'Secondary chlorophyll boundary; moderate cross-swell present.'
  },
  {
    id: 'fz-03',
    code: 'PFZ-41',
    name: 'Yanam-Kakinada Bay Outer Basin',
    regionId: 'andhra-coast',
    // Offshore east of Kakinada / Hope Island in deep water
    coordinates: { lat: 16.82, lng: 82.46 },
    distanceKm: 34.2,
    bestTime: '06:00 AM - 10:30 AM',
    riskLevel: 'low',
    riskScore: 22,
    productivity: 'high',
    productivityScore: 89,
    sstCelsius: 27.5,
    chlorophyllDensity: 2.60,
    waveHeightMeters: 1.1,
    windSpeedKnots: 12,
    isRecommendedBest: false,
    species: ['Seer Fish', 'Squid', 'Snapper'],
    notes: 'Active pelagic aggregation near Godavari plume boundary in open water.'
  },

  // --- Tamil Nadu Coast (Offshore Bay of Bengal) ---
  {
    id: 'fz-tn-01',
    code: 'PFZ-TN08',
    name: 'Chennai Outer Continental Edge',
    regionId: 'tamilnadu-coast',
    coordinates: { lat: 13.05, lng: 80.52 }, // 25 km east in water
    distanceKm: 25.2,
    bestTime: '04:00 AM - 08:00 AM',
    riskLevel: 'low',
    riskScore: 16,
    productivity: 'high',
    productivityScore: 92,
    sstCelsius: 28.1,
    chlorophyllDensity: 2.70,
    waveHeightMeters: 0.8,
    windSpeedKnots: 10,
    isRecommendedBest: true,
    species: ['Skipjack Tuna', 'Barracuda', 'Sailfish'],
    notes: 'Strong thermal gradient 25 km east of Chennai harbor.'
  },
  {
    id: 'fz-tn-02',
    code: 'PFZ-TN15',
    name: 'Mahabalipuram Offshore Shelf',
    regionId: 'tamilnadu-coast',
    coordinates: { lat: 12.65, lng: 80.40 }, // In water east of coast
    distanceKm: 22.0,
    bestTime: '05:30 AM - 09:30 AM',
    riskLevel: 'low',
    riskScore: 20,
    productivity: 'high',
    productivityScore: 87,
    sstCelsius: 28.3,
    chlorophyllDensity: 2.45,
    waveHeightMeters: 1.0,
    windSpeedKnots: 12,
    isRecommendedBest: false,
    species: ['Seer Fish', 'Mackerel', 'Anchovy'],
    notes: 'Rocky reef boundary supporting pelagic aggregations.'
  },

  // --- Kerala Coast (Offshore Arabian Sea) ---
  {
    id: 'fz-kl-01',
    code: 'PFZ-KL04',
    name: 'Kochi Offshore Wadge Extension',
    regionId: 'kerala-coast',
    coordinates: { lat: 9.92, lng: 75.96 }, // 30 km west into Arabian Sea water
    distanceKm: 31.0,
    bestTime: '04:30 AM - 08:30 AM',
    riskLevel: 'low',
    riskScore: 19,
    productivity: 'high',
    productivityScore: 95,
    sstCelsius: 27.6,
    chlorophyllDensity: 3.10,
    waveHeightMeters: 1.1,
    windSpeedKnots: 13,
    isRecommendedBest: true,
    species: ['Oil Sardine', 'Indian Mackerel', 'Tuna'],
    notes: 'Intense coastal upwelling and phytoplankton bloom in open Arabian Sea.'
  },
  {
    id: 'fz-kl-02',
    code: 'PFZ-KL11',
    name: 'Alappuzha Deep Mudbank Corridor',
    regionId: 'kerala-coast',
    coordinates: { lat: 9.50, lng: 76.05 }, // In water west of Alappuzha
    distanceKm: 24.5,
    bestTime: '05:00 AM - 09:00 AM',
    riskLevel: 'moderate',
    riskScore: 35,
    productivity: 'moderate',
    productivityScore: 78,
    sstCelsius: 28.0,
    chlorophyllDensity: 2.30,
    waveHeightMeters: 1.3,
    windSpeedKnots: 15,
    isRecommendedBest: false,
    species: ['Prawns', 'Sole Fish', 'Pomfret'],
    notes: 'Traditional coastal mudbank zone with high nutrient richness.'
  },

  // --- Odisha Coast (Offshore Bay of Bengal) ---
  {
    id: 'fz-od-01',
    code: 'PFZ-OD03',
    name: 'Puri South-East Convergence',
    regionId: 'odisha-coast',
    coordinates: { lat: 19.62, lng: 86.06 }, // In open water south-east of Puri
    distanceKm: 28.4,
    bestTime: '04:00 AM - 08:00 AM',
    riskLevel: 'low',
    riskScore: 21,
    productivity: 'high',
    productivityScore: 91,
    sstCelsius: 27.4,
    chlorophyllDensity: 2.80,
    waveHeightMeters: 1.0,
    windSpeedKnots: 12,
    isRecommendedBest: true,
    species: ['Hilsa', 'Pomfret', 'Threadfin'],
    notes: 'Nutrient-rich outflow boundary from Chilika lake mouth.'
  },

  // --- Gujarat Coast (Offshore Arabian Sea) ---
  {
    id: 'fz-gj-01',
    code: 'PFZ-GJ07',
    name: 'Veraval Deep Pelagic Corridor',
    regionId: 'gujarat-coast',
    coordinates: { lat: 20.65, lng: 70.22 }, // In open Arabian Sea south-west of Veraval
    distanceKm: 29.5,
    bestTime: '05:00 AM - 09:30 AM',
    riskLevel: 'low',
    riskScore: 18,
    productivity: 'high',
    productivityScore: 93,
    sstCelsius: 26.9,
    chlorophyllDensity: 2.95,
    waveHeightMeters: 1.0,
    windSpeedKnots: 14,
    isRecommendedBest: true,
    species: ['Silver Pomfret', 'Ribbon Fish', 'Croaker'],
    notes: 'Saurashtra shelf upwelling zone with dense pelagic schools.'
  }
];

export const INITIAL_FISHING_ZONES: FishingZone[] = ALL_FISHING_ZONES.filter(z => z.regionId === 'andhra-coast');

// Active Hazard & Risk Zones in actual offshore ocean waters
export const INITIAL_RISK_ZONES: RiskZone[] = [
  {
    id: 'rz-01',
    name: 'Krishna-Godavari Deep Oceanic Vortex',
    regionId: 'andhra-coast',
    // In deep water offshore southeast of Machilipatnam
    coordinates: { lat: 16.12, lng: 81.65 },
    radiusKm: 14.5,
    riskScore: 86,
    severity: 'severe',
    hazardType: 'Cyclonic Eddies & Undercurrent Vortices',
    currentTrend: 'increasing',
    advisory: 'Steer at least 12 NM clear. Sudden wind gusts exceeding 28 knots and cross-waves.',
    detectedAt: 'Real-time Sentinel-3 SAR + Altimeter'
  },
  {
    id: 'rz-02',
    name: 'Palk Strait Shallow Shoal Surge',
    regionId: 'tamilnadu-coast',
    coordinates: { lat: 10.05, lng: 80.05 },
    radiusKm: 10.0,
    riskScore: 74,
    severity: 'high',
    hazardType: 'Tidal Rip Currents',
    currentTrend: 'stable',
    advisory: 'Dangerous bottom turbulence during tide change.',
    detectedAt: 'Ocean State Forecast Model'
  },
  {
    id: 'rz-03',
    name: 'Wadge Bank Outer Swell Crest',
    regionId: 'kerala-coast',
    coordinates: { lat: 8.80, lng: 75.80 },
    radiusKm: 18.0,
    riskScore: 68,
    severity: 'moderate',
    hazardType: 'Monsoonal Swell',
    currentTrend: 'decreasing',
    advisory: 'High swell waves between 2.2m and 2.8m expected.',
    detectedAt: 'INCOIS Marine Buoy Array'
  },
  {
    id: 'rz-04',
    name: 'Dhamra Deep Submarine Canyon',
    regionId: 'odisha-coast',
    coordinates: { lat: 20.30, lng: 87.10 },
    radiusKm: 12.0,
    riskScore: 79,
    severity: 'high',
    hazardType: 'Submerged Current Shear',
    currentTrend: 'increasing',
    advisory: 'Violent tide rips and sudden bathymetric drop-offs.',
    detectedAt: 'MODIS Satellite Bathymetry'
  }
];

export const TOP_NATIONAL_PRODUCTIVITY_ZONES = [
  { rank: 1, name: 'Machilipatnam Offshore PFZ-18', region: 'Andhra Pradesh', lat: 16.08, lng: 81.30, score: 94, catchForecast: '4.8 - 6.2 Tons', dominantSpecies: 'Yellowfin Tuna, Ribbonfish' },
  { rank: 2, name: 'Wadge Bank Bio-Core PFZ-06', region: 'Kanyakumari / Kerala', lat: 7.70, lng: 77.45, score: 92, catchForecast: '4.5 - 5.8 Tons', dominantSpecies: 'Skipjack Tuna, Seer Fish' },
  { rank: 3, name: 'Jakhau Pelagic Upwelling', region: 'Gujarat (Gulf of Kutch)', lat: 23.05, lng: 68.20, score: 89, catchForecast: '4.0 - 5.3 Tons', dominantSpecies: 'Pomfret, Croaker' },
  { rank: 4, name: 'Kakinada Outer Plume PFZ-41', region: 'Andhra Pradesh', lat: 16.82, lng: 82.46, score: 89, catchForecast: '3.9 - 5.0 Tons', dominantSpecies: 'Tiger Prawn, Mackerel' },
  { rank: 5, name: 'Paradip Deep Shelf', region: 'Odisha Coast', lat: 20.10, lng: 86.88, score: 87, catchForecast: '3.6 - 4.7 Tons', dominantSpecies: 'Hilsa, Sardine' }
];

export const HISTORICAL_DISASTERS: HistoricalDisaster[] = [
  {
    id: 'cyclone-michaung',
    name: 'Cyclone Michaung',
    year: 2023,
    period: 'December 2023',
    type: 'Super Cyclonic Storm / Marine Surge',
    center: { lat: 15.50, lng: 80.30 },
    intensityCategory: 'Category 3 Severe',
    maxWindKmph: 110,
    maxSurgeMeters: 3.5,
    damageLevel: 'Severe (Coastal Surge & Inundation)',
    vesselsAffectedCount: 218,
    portsSuspended: ['Chennai Port', 'Ennore Port', 'Machilipatnam Port', 'Krishnapatnam'],
    impactSummary: 'Extensive damage to coastal fishing crafts. Wave heights reached 5.2 meters in Bay of Bengal with prolonged tidal surges.',
    affectedCoordinates: [
      { lat: 13.08, lng: 80.27 },
      { lat: 14.44, lng: 80.00 },
      { lat: 15.80, lng: 80.50 },
      { lat: 16.18, lng: 81.16 }
    ],
    trendData: [
      { time: 'Day -3', wind: 45, surge: 0.8 },
      { time: 'Day -2', wind: 75, surge: 1.4 },
      { time: 'Landfall', wind: 110, surge: 3.5 },
      { time: 'Day +1', wind: 80, surge: 2.1 },
      { time: 'Day +2', wind: 40, surge: 1.0 }
    ]
  },
  {
    id: 'cyclone-asani',
    name: 'Cyclone Asani',
    year: 2022,
    period: 'May 2022',
    type: 'Severe Cyclonic Storm',
    center: { lat: 16.10, lng: 82.50 },
    intensityCategory: 'Severe Cyclonic Storm',
    maxWindKmph: 120,
    maxSurgeMeters: 2.8,
    damageLevel: 'Moderate to High',
    vesselsAffectedCount: 142,
    portsSuspended: ['Kakinada Port', 'Visakhapatnam Harbor'],
    impactSummary: 'Curved off the Andhra coastline bringing gale winds and heavy marine swells, disrupting artisanal fishing for 6 days.',
    affectedCoordinates: [
      { lat: 16.18, lng: 81.16 },
      { lat: 16.98, lng: 82.24 },
      { lat: 17.70, lng: 83.30 }
    ],
    trendData: [
      { time: 'Day -3', wind: 50, surge: 0.9 },
      { time: 'Day -2', wind: 90, surge: 1.8 },
      { time: 'Peak Surge', wind: 120, surge: 2.8 },
      { time: 'Day +1', wind: 65, surge: 1.5 },
      { time: 'Day +2', wind: 35, surge: 0.7 }
    ]
  },
  {
    id: 'cyclone-gulab',
    name: 'Cyclone Gulab',
    year: 2021,
    period: 'September 2021',
    type: 'Tropical Cyclone',
    center: { lat: 18.40, lng: 84.40 },
    intensityCategory: 'Cyclonic Storm',
    maxWindKmph: 95,
    maxSurgeMeters: 1.9,
    damageLevel: 'Moderate',
    vesselsAffectedCount: 89,
    portsSuspended: ['Kalingapatnam', 'Gopalpur'],
    impactSummary: 'Crossed North Andhra - South Odisha coast near Kalingapatnam with localized storm surge and estuarine flooding.',
    affectedCoordinates: [
      { lat: 17.50, lng: 83.00 },
      { lat: 18.30, lng: 84.10 },
      { lat: 19.10, lng: 84.80 }
    ],
    trendData: [
      { time: 'Day -3', wind: 38, surge: 0.5 },
      { time: 'Day -2', wind: 65, surge: 1.1 },
      { time: 'Landfall', wind: 95, surge: 1.9 },
      { time: 'Day +1', wind: 50, surge: 1.0 },
      { time: 'Day +2', wind: 30, surge: 0.4 }
    ]
  },
  {
    id: 'tsunami-2004',
    name: 'Indian Ocean Tsunami',
    year: 2004,
    period: 'December 2004',
    type: 'Megathrust Seismic Ocean Tsunami',
    center: { lat: 11.00, lng: 82.00 },
    intensityCategory: 'Magnitude 9.1 Induced Megatsunami',
    maxWindKmph: 60,
    maxSurgeMeters: 9.8,
    damageLevel: 'Catastrophic (Coastline Reshaped)',
    vesselsAffectedCount: 3850,
    portsSuspended: ['Nagapattinam', 'Chennai', 'Cuddalore', 'Kollam', 'Machilipatnam'],
    impactSummary: 'Catastrophic waves inundated up to 2 km inland along Tamil Nadu, Andhra Pradesh, and Kerala coasts, destroying port infrastructure and thousands of crafts.',
    affectedCoordinates: [
      { lat: 8.08, lng: 77.55 },
      { lat: 10.76, lng: 79.84 },
      { lat: 13.08, lng: 80.27 },
      { lat: 16.18, lng: 81.16 }
    ],
    trendData: [
      { time: '08:00 AM', wind: 15, surge: 0.2 },
      { time: '09:15 AM Wave 1', wind: 25, surge: 4.5 },
      { time: '09:45 AM Peak', wind: 40, surge: 9.8 },
      { time: '11:00 AM Wave 3', wind: 30, surge: 5.2 },
      { time: '02:00 PM', wind: 18, surge: 1.8 }
    ]
  },
  {
    id: 'super-cyclone-1999',
    name: 'Odisha Super Cyclone (05B)',
    year: 1999,
    period: 'October 1999',
    type: 'Super Cyclonic Storm (T7.0 Category 5)',
    center: { lat: 19.90, lng: 86.60 },
    intensityCategory: 'Category 5 Super Cyclone',
    maxWindKmph: 260,
    maxSurgeMeters: 7.0,
    damageLevel: 'Catastrophic Maritime Destruction',
    vesselsAffectedCount: 1920,
    portsSuspended: ['Paradip Port', 'Puri Fishery Harbor', 'Gopalpur Port'],
    impactSummary: 'Strongest recorded tropical cyclone in North Indian Ocean history. Massive 7m storm surge penetrated 35 km inland from Paradip.',
    affectedCoordinates: [
      { lat: 19.81, lng: 85.83 },
      { lat: 20.27, lng: 86.67 },
      { lat: 20.80, lng: 87.20 }
    ],
    trendData: [
      { time: 'Day -3', wind: 80, surge: 1.5 },
      { time: 'Day -2', wind: 170, surge: 3.8 },
      { time: 'Landfall', wind: 260, surge: 7.0 },
      { time: 'Day +1', wind: 140, surge: 4.2 },
      { time: 'Day +2', wind: 60, surge: 1.8 }
    ]
  }
];
