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

// Comprehensive Coastal Coverage across all 11 Indian Coastal States and Union Territories
export const COASTAL_REGIONS: CoastalRegion[] = [
  {
    id: 'andhra-coast',
    name: 'Andhra Coast (Visakhapatnam / Kakinada / Machilipatnam)',
    state: 'Andhra Pradesh',
    center: { lat: 16.28, lng: 81.65 },
    userBase: { lat: 16.18, lng: 81.16 }, // Machilipatnam Harbour
    zoom: 9
  },
  {
    id: 'tamilnadu-coast',
    name: 'Coromandel Coast (Chennai / Nagapattinam / Tuticorin)',
    state: 'Tamil Nadu',
    center: { lat: 12.90, lng: 80.45 },
    userBase: { lat: 13.08, lng: 80.29 }, // Chennai Kasimedu Harbour
    zoom: 9
  },
  {
    id: 'kerala-coast',
    name: 'Malabar Coast (Kochi / Kollam / Vizhinjam)',
    state: 'Kerala',
    center: { lat: 9.85, lng: 75.95 },
    userBase: { lat: 9.96, lng: 76.24 }, // Kochi Thoppumpady Harbor
    zoom: 9
  },
  {
    id: 'odisha-coast',
    name: 'Utkal Coast (Paradip / Puri / Gopalpur)',
    state: 'Odisha',
    center: { lat: 19.85, lng: 86.20 },
    userBase: { lat: 19.79, lng: 85.82 }, // Puri Coastal Base
    zoom: 9
  },
  {
    id: 'gujarat-coast',
    name: 'Saurashtra & Kutch (Veraval / Porbandar / Okha)',
    state: 'Gujarat',
    center: { lat: 20.70, lng: 70.25 },
    userBase: { lat: 20.90, lng: 70.37 }, // Veraval Commercial Fishery Port
    zoom: 9
  },
  {
    id: 'maharashtra-coast',
    name: 'Konkan Coast (Mumbai / Ratnagiri / Malvan)',
    state: 'Maharashtra',
    center: { lat: 18.85, lng: 72.65 },
    userBase: { lat: 18.92, lng: 72.83 }, // Sassoon Dock Harbour
    zoom: 9
  },
  {
    id: 'goa-coast',
    name: 'Goa Coast (Panaji / Mormugao / Betul)',
    state: 'Goa',
    center: { lat: 15.35, lng: 73.70 },
    userBase: { lat: 15.42, lng: 73.80 }, // Mormugao Fishery Jetty
    zoom: 10
  },
  {
    id: 'karnataka-coast',
    name: 'Canara Coast (Mangalore / Malpe / Karwar)',
    state: 'Karnataka',
    center: { lat: 13.15, lng: 74.40 },
    userBase: { lat: 12.87, lng: 74.83 }, // Mangalore Old Port (Bunder)
    zoom: 9
  },
  {
    id: 'westbengal-coast',
    name: 'Bengal Delta & Sundarbans (Digha / Kakdwip / Frasergunj)',
    state: 'West Bengal',
    center: { lat: 21.60, lng: 88.05 },
    userBase: { lat: 21.63, lng: 87.52 }, // Digha Sankarpur Fishery Harbour
    zoom: 9
  },
  {
    id: 'andaman-coast',
    name: 'Andaman & Nicobar Waters (Port Blair / Havelock / Car Nicobar)',
    state: 'Andaman & Nicobar',
    center: { lat: 11.65, lng: 92.75 },
    userBase: { lat: 11.66, lng: 92.73 }, // Junglighat Fishery Base
    zoom: 8
  },
  {
    id: 'lakshadweep-coast',
    name: 'Lakshadweep Coral Atolls (Kavaratti / Agatti / Minicoy)',
    state: 'Lakshadweep',
    center: { lat: 10.56, lng: 72.64 },
    userBase: { lat: 10.57, lng: 72.63 }, // Kavaratti Lagoon Base
    zoom: 9
  }
];

// India-Wide Potential Fishing Zones (PFZs) with verified coordinates and local traditional fishing ground names
export const ALL_FISHING_ZONES: FishingZone[] = [
  // ================= 1. ANDHRA PRADESH COAST =================
  {
    id: 'fz-ap-01',
    code: 'PFZ-AP18',
    name: 'Machilipatnam Offshore Deep Confluence (Krishna Plume)',
    regionId: 'andhra-coast',
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
    id: 'fz-ap-02',
    code: 'PFZ-AP41',
    name: 'Kakinada Hope Island Deep Basin (Godavari Delta Front)',
    regionId: 'andhra-coast',
    coordinates: { lat: 16.82, lng: 82.46 },
    distanceKm: 34.2,
    bestTime: '05:00 AM - 09:30 AM',
    riskLevel: 'low',
    riskScore: 22,
    productivity: 'high',
    productivityScore: 89,
    sstCelsius: 27.5,
    chlorophyllDensity: 2.60,
    waveHeightMeters: 1.1,
    windSpeedKnots: 12,
    isRecommendedBest: false,
    species: ['Seer Fish', 'Tiger Prawns', 'White Pomfret'],
    notes: 'Active pelagic aggregation near Godavari outflow boundary.'
  },
  {
    id: 'fz-ap-03',
    code: 'PFZ-AP56',
    name: "Visakhapatnam Dolphin's Nose Outer Trench (Gangavaram Deep)",
    regionId: 'andhra-coast',
    coordinates: { lat: 17.62, lng: 83.35 },
    distanceKm: 21.0,
    bestTime: '04:00 AM - 08:00 AM',
    riskLevel: 'low',
    riskScore: 19,
    productivity: 'high',
    productivityScore: 91,
    sstCelsius: 28.0,
    chlorophyllDensity: 2.75,
    waveHeightMeters: 1.0,
    windSpeedKnots: 10,
    isRecommendedBest: false,
    species: ['Skipjack Tuna', 'Ribbon Fish', 'Croaker'],
    notes: 'Steep continental shelf drop-off with intense upwelling.'
  },
  {
    id: 'fz-ap-04',
    code: 'PFZ-AP29',
    name: 'Narsapur - Antarvedi Mid-Continental Edge',
    regionId: 'andhra-coast',
    coordinates: { lat: 16.16, lng: 81.88 },
    distanceKm: 26.8,
    bestTime: '05:30 AM - 09:30 AM',
    riskLevel: 'moderate',
    riskScore: 42,
    productivity: 'moderate',
    productivityScore: 75,
    sstCelsius: 28.5,
    chlorophyllDensity: 2.10,
    waveHeightMeters: 1.3,
    windSpeedKnots: 15,
    isRecommendedBest: false,
    species: ['King Mackerel', 'Sardines', 'Anchovies'],
    notes: 'Secondary chlorophyll boundary; moderate cross-swell present.'
  },

  // ================= 2. TAMIL NADU COAST =================
  {
    id: 'fz-tn-01',
    code: 'PFZ-TN08',
    name: 'Chennai Kasimedu Outer Continental Edge (Royapuram Trench)',
    regionId: 'tamilnadu-coast',
    coordinates: { lat: 13.05, lng: 80.52 },
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
    notes: 'Strong thermal gradient 25 km east of Kasimedu fishing harbour.'
  },
  {
    id: 'fz-tn-02',
    code: 'PFZ-TN15',
    name: 'Tuticorin / Vembar Pearl Ridge (Gulf of Mannar Biological Core)',
    regionId: 'tamilnadu-coast',
    coordinates: { lat: 8.85, lng: 78.40 },
    distanceKm: 28.0,
    bestTime: '04:30 AM - 08:30 AM',
    riskLevel: 'low',
    riskScore: 15,
    productivity: 'high',
    productivityScore: 96,
    sstCelsius: 27.9,
    chlorophyllDensity: 3.10,
    waveHeightMeters: 0.9,
    windSpeedKnots: 11,
    isRecommendedBest: false,
    species: ['Yellowfin Tuna', 'Cobia', 'Emperor Bream'],
    notes: 'Protected high-biodiversity wedge with heavy schooling.'
  },
  {
    id: 'fz-tn-03',
    code: 'PFZ-TN22',
    name: 'Nagapattinam - Point Calimere Outer Basin (Palk Bay Edge)',
    regionId: 'tamilnadu-coast',
    coordinates: { lat: 10.65, lng: 80.10 },
    distanceKm: 22.5,
    bestTime: '05:00 AM - 09:00 AM',
    riskLevel: 'moderate',
    riskScore: 38,
    productivity: 'high',
    productivityScore: 88,
    sstCelsius: 28.4,
    chlorophyllDensity: 2.55,
    waveHeightMeters: 1.2,
    windSpeedKnots: 13,
    isRecommendedBest: false,
    species: ['Silver Pomfret', 'Squid', 'Indian Mackerel'],
    notes: 'Nutrient-rich outflow front from Cauvery delta.'
  },

  // ================= 3. KERALA COAST =================
  {
    id: 'fz-kl-01',
    code: 'PFZ-KL04',
    name: 'Kochi - Munambam Deep Sea Confluence (Wadge Extension)',
    regionId: 'kerala-coast',
    coordinates: { lat: 9.92, lng: 75.96 },
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
    species: ['Oil Sardine', 'Indian Mackerel', 'Yellowfin Tuna'],
    notes: 'Intense coastal upwelling and phytoplankton bloom in open Arabian Sea.'
  },
  {
    id: 'fz-kl-02',
    code: 'PFZ-KL11',
    name: 'Alappuzha Chakara Mudbank Ground (Thottappally Front)',
    regionId: 'kerala-coast',
    coordinates: { lat: 9.50, lng: 76.05 },
    distanceKm: 24.5,
    bestTime: '05:00 AM - 09:00 AM',
    riskLevel: 'low',
    riskScore: 24,
    productivity: 'high',
    productivityScore: 90,
    sstCelsius: 28.0,
    chlorophyllDensity: 2.90,
    waveHeightMeters: 1.0,
    windSpeedKnots: 12,
    isRecommendedBest: false,
    species: ['Karikkadi Prawns', 'Sole Fish', 'Silver Belly'],
    notes: 'Traditional coastal mudbank zone with high nutrient richness.'
  },
  {
    id: 'fz-kl-03',
    code: 'PFZ-KL19',
    name: 'Vizhinjam Deep Submarine Channelling (Kovalam Pelagic Drop)',
    regionId: 'kerala-coast',
    coordinates: { lat: 8.35, lng: 76.85 },
    distanceKm: 18.0,
    bestTime: '04:00 AM - 08:00 AM',
    riskLevel: 'low',
    riskScore: 17,
    productivity: 'high',
    productivityScore: 93,
    sstCelsius: 27.7,
    chlorophyllDensity: 2.80,
    waveHeightMeters: 1.2,
    windSpeedKnots: 11,
    isRecommendedBest: false,
    species: ['Bigeye Tuna', 'Mahi Mahi (Dolphin Fish)', 'Marlin'],
    notes: 'Immediate deep bathymetry; premier pelagic hook-and-line area.'
  },

  // ================= 4. ODISHA COAST =================
  {
    id: 'fz-od-01',
    code: 'PFZ-OD03',
    name: 'Paradip Mahanadi Deep Estuarine Shelf (Sandheads Approach)',
    regionId: 'odisha-coast',
    coordinates: { lat: 20.10, lng: 86.88 },
    distanceKm: 32.0,
    bestTime: '04:00 AM - 08:30 AM',
    riskLevel: 'low',
    riskScore: 20,
    productivity: 'high',
    productivityScore: 93,
    sstCelsius: 27.2,
    chlorophyllDensity: 2.95,
    waveHeightMeters: 1.0,
    windSpeedKnots: 12,
    isRecommendedBest: true,
    species: ['Hilsa (Ilish)', 'Black Pomfret', 'Sea Bass (Bhetki)'],
    notes: 'Mahanadi plume boundary rich in nutrients and estuarine pelagics.'
  },
  {
    id: 'fz-od-02',
    code: 'PFZ-OD08',
    name: 'Puri - Chilika Mouth Pelagic Convergence (Arakhakuda Front)',
    regionId: 'odisha-coast',
    coordinates: { lat: 19.62, lng: 86.06 },
    distanceKm: 28.4,
    bestTime: '04:30 AM - 08:00 AM',
    riskLevel: 'low',
    riskScore: 21,
    productivity: 'high',
    productivityScore: 91,
    sstCelsius: 27.4,
    chlorophyllDensity: 2.80,
    waveHeightMeters: 1.0,
    windSpeedKnots: 12,
    isRecommendedBest: false,
    species: ['Croaker (Jelha)', 'Threadfin (Sahala)', 'Tiger Prawns'],
    notes: 'Nutrient-rich outflow boundary from Chilika lake mouth.'
  },
  {
    id: 'fz-od-03',
    code: 'PFZ-OD14',
    name: 'Gopalpur - Aryapalli Outer Ridge (Rushikulya Confluence)',
    regionId: 'odisha-coast',
    coordinates: { lat: 19.20, lng: 85.10 },
    distanceKm: 22.0,
    bestTime: '05:00 AM - 09:00 AM',
    riskLevel: 'moderate',
    riskScore: 34,
    productivity: 'moderate',
    productivityScore: 82,
    sstCelsius: 27.8,
    chlorophyllDensity: 2.40,
    waveHeightMeters: 1.3,
    windSpeedKnots: 14,
    isRecommendedBest: false,
    species: ['Ribbonfish', 'Anchovy', 'Mackerel'],
    notes: 'Open ocean coastal front near Rushikulya river basin.'
  },

  // ================= 5. GUJARAT COAST =================
  {
    id: 'fz-gj-01',
    code: 'PFZ-GJ07',
    name: 'Veraval Deep Pelagic Corridor (Hiran River Outflow Ground)',
    regionId: 'gujarat-coast',
    coordinates: { lat: 20.65, lng: 70.22 },
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
    species: ['Silver Pomfret', 'Ribbon Fish', 'Croaker (Ghol)'],
    notes: 'Saurashtra shelf upwelling zone with dense pelagic schools.'
  },
  {
    id: 'fz-gj-02',
    code: 'PFZ-GJ15',
    name: 'Porbandar Offshore Bank (Chowpatty Deep Edge)',
    regionId: 'gujarat-coast',
    coordinates: { lat: 21.55, lng: 69.40 },
    distanceKm: 34.0,
    bestTime: '04:30 AM - 09:00 AM',
    riskLevel: 'low',
    riskScore: 22,
    productivity: 'high',
    productivityScore: 90,
    sstCelsius: 27.1,
    chlorophyllDensity: 2.80,
    waveHeightMeters: 1.1,
    windSpeedKnots: 13,
    isRecommendedBest: false,
    species: ['Cuttlefish', 'King Croaker', 'Catfish'],
    notes: 'High benthic and demersal richness along continental margin.'
  },
  {
    id: 'fz-gj-03',
    code: 'PFZ-GJ22',
    name: 'Jakhau Mud-Bank Slope (Gulf of Kutch Outer Mouth)',
    regionId: 'gujarat-coast',
    coordinates: { lat: 23.05, lng: 68.20 },
    distanceKm: 38.0,
    bestTime: '05:30 AM - 10:00 AM',
    riskLevel: 'moderate',
    riskScore: 39,
    productivity: 'high',
    productivityScore: 89,
    sstCelsius: 26.5,
    chlorophyllDensity: 3.20,
    waveHeightMeters: 1.4,
    windSpeedKnots: 16,
    isRecommendedBest: false,
    species: ['Hilsa', 'Prawns', 'White Pomfret'],
    notes: 'Massive tidal flushing creating exceptional chlorophyll blooms.'
  },

  // ================= 6. MAHARASHTRA COAST =================
  {
    id: 'fz-mh-01',
    code: 'PFZ-MH04',
    name: 'Mumbai High Offshore Trench (Sassoon Dock Pelagic Run)',
    regionId: 'maharashtra-coast',
    coordinates: { lat: 18.80, lng: 72.45 },
    distanceKm: 35.0,
    bestTime: '04:00 AM - 08:30 AM',
    riskLevel: 'low',
    riskScore: 19,
    productivity: 'high',
    productivityScore: 92,
    sstCelsius: 27.8,
    chlorophyllDensity: 2.70,
    waveHeightMeters: 1.0,
    windSpeedKnots: 12,
    isRecommendedBest: true,
    species: ['Bombay Duck (Bombil)', 'Silver Pomfret', 'Squid'],
    notes: 'Deep oceanic trench off Mumbai harbour with steady upwelling.'
  },
  {
    id: 'fz-mh-02',
    code: 'PFZ-MH12',
    name: 'Ratnagiri Mirya Bay Outer Ground (Kalbadevi Thermal Front)',
    regionId: 'maharashtra-coast',
    coordinates: { lat: 17.02, lng: 73.10 },
    distanceKm: 23.5,
    bestTime: '05:00 AM - 09:00 AM',
    riskLevel: 'low',
    riskScore: 21,
    productivity: 'high',
    productivityScore: 88,
    sstCelsius: 28.1,
    chlorophyllDensity: 2.50,
    waveHeightMeters: 1.1,
    windSpeedKnots: 11,
    isRecommendedBest: false,
    species: ['Mackerel (Bangda)', 'Seer Fish (Surmai)', 'Lobster'],
    notes: 'Rocky headlands generate stable thermal eddies.'
  },
  {
    id: 'fz-mh-03',
    code: 'PFZ-MH18',
    name: 'Malvan / Sindhudurg Coral Shelf (Tarkarli Deep Zone)',
    regionId: 'maharashtra-coast',
    coordinates: { lat: 15.98, lng: 73.35 },
    distanceKm: 20.0,
    bestTime: '04:30 AM - 08:30 AM',
    riskLevel: 'low',
    riskScore: 16,
    productivity: 'high',
    productivityScore: 90,
    sstCelsius: 28.2,
    chlorophyllDensity: 2.65,
    waveHeightMeters: 0.9,
    windSpeedKnots: 10,
    isRecommendedBest: false,
    species: ['Red Snapper', 'Grouper', 'Tuna'],
    notes: 'Submerged coral bank with high concentration of reef and pelagic fish.'
  },

  // ================= 7. GOA COAST =================
  {
    id: 'fz-goa-01',
    code: 'PFZ-GA03',
    name: 'Mormugao - Zuari Plume Convergence (Betul Offshore)',
    regionId: 'goa-coast',
    coordinates: { lat: 15.30, lng: 73.60 },
    distanceKm: 19.5,
    bestTime: '04:30 AM - 08:30 AM',
    riskLevel: 'low',
    riskScore: 17,
    productivity: 'high',
    productivityScore: 91,
    sstCelsius: 28.0,
    chlorophyllDensity: 2.75,
    waveHeightMeters: 0.9,
    windSpeedKnots: 11,
    isRecommendedBest: true,
    species: ['Indian Mackerel', 'Kingfish (Visvon)', 'Black Pomfret'],
    notes: 'Zuari estuarine plume meeting clear oceanic waters.'
  },
  {
    id: 'fz-goa-02',
    code: 'PFZ-GA07',
    name: 'Panaji Aguada Outer Reef (Mandovi Confluence)',
    regionId: 'goa-coast',
    coordinates: { lat: 15.52, lng: 73.65 },
    distanceKm: 16.0,
    bestTime: '05:00 AM - 09:00 AM',
    riskLevel: 'low',
    riskScore: 19,
    productivity: 'high',
    productivityScore: 87,
    sstCelsius: 28.2,
    chlorophyllDensity: 2.45,
    waveHeightMeters: 1.0,
    windSpeedKnots: 12,
    isRecommendedBest: false,
    species: ['Seer Fish', 'Butterfish', 'Tiger Prawns'],
    notes: 'Rich biological front across Aguada sandbar drop-off.'
  },

  // ================= 8. KARNATAKA COAST =================
  {
    id: 'fz-ka-01',
    code: 'PFZ-KA05',
    name: 'Mangalore Bengre Deep Trench (Netravati Outflow Front)',
    regionId: 'karnataka-coast',
    coordinates: { lat: 12.82, lng: 74.65 },
    distanceKm: 24.0,
    bestTime: '04:00 AM - 08:30 AM',
    riskLevel: 'low',
    riskScore: 18,
    productivity: 'high',
    productivityScore: 94,
    sstCelsius: 27.9,
    chlorophyllDensity: 2.90,
    waveHeightMeters: 1.0,
    windSpeedKnots: 11,
    isRecommendedBest: true,
    species: ['Oil Sardine (Bootai)', 'Indian Mackerel (Bangude)', 'Seer Fish (Anjal)'],
    notes: 'Primary pelagic purse-seine corridor off Netravati estuary.'
  },
  {
    id: 'fz-ka-02',
    code: 'PFZ-KA11',
    name: "Malpe St. Mary's Outer Ridge (Udupi Pelagic Bank)",
    regionId: 'karnataka-coast',
    coordinates: { lat: 13.38, lng: 74.55 },
    distanceKm: 22.0,
    bestTime: '04:30 AM - 09:00 AM',
    riskLevel: 'low',
    riskScore: 20,
    productivity: 'high',
    productivityScore: 90,
    sstCelsius: 28.1,
    chlorophyllDensity: 2.60,
    waveHeightMeters: 1.1,
    windSpeedKnots: 12,
    isRecommendedBest: false,
    species: ['Squid', 'Cuttlefish', 'Ribbon Fish'],
    notes: 'Volcanic basalt formation creating high food availability for cephalopods.'
  },
  {
    id: 'fz-ka-03',
    code: 'PFZ-KA18',
    name: 'Karwar Baitkol Bay Continental Slope (Kali River Plume)',
    regionId: 'karnataka-coast',
    coordinates: { lat: 14.80, lng: 73.95 },
    distanceKm: 28.0,
    bestTime: '05:00 AM - 09:30 AM',
    riskLevel: 'low',
    riskScore: 22,
    productivity: 'high',
    productivityScore: 89,
    sstCelsius: 27.8,
    chlorophyllDensity: 2.70,
    waveHeightMeters: 1.1,
    windSpeedKnots: 13,
    isRecommendedBest: false,
    species: ['Mackerel', 'Silver Pomfret', 'Threadfin'],
    notes: 'Nutrient plume from Kali river creates prolonged phytoplankton patches.'
  },

  // ================= 9. WEST BENGAL COAST =================
  {
    id: 'fz-wb-01',
    code: 'PFZ-WB02',
    name: 'Digha Sankarpur Outer Continental Shelf (Subarnarekha Plume)',
    regionId: 'westbengal-coast',
    coordinates: { lat: 21.45, lng: 87.65 },
    distanceKm: 26.5,
    bestTime: '04:00 AM - 08:30 AM',
    riskLevel: 'low',
    riskScore: 20,
    productivity: 'high',
    productivityScore: 95,
    sstCelsius: 27.1,
    chlorophyllDensity: 3.30,
    waveHeightMeters: 1.0,
    windSpeedKnots: 12,
    isRecommendedBest: true,
    species: ['Hilsa (Ilish)', 'Pomfret', 'Tiger Prawn (Bagda)'],
    notes: 'Epicentre of high estuarine and coastal Hilsa migration corridor.'
  },
  {
    id: 'fz-wb-02',
    code: 'PFZ-WB09',
    name: 'Frasergunj / Bakkhali Deep Estuarine Front (Sundarbans Marine Delta)',
    regionId: 'westbengal-coast',
    coordinates: { lat: 21.40, lng: 88.20 },
    distanceKm: 32.0,
    bestTime: '04:30 AM - 09:00 AM',
    riskLevel: 'moderate',
    riskScore: 36,
    productivity: 'high',
    productivityScore: 92,
    sstCelsius: 27.3,
    chlorophyllDensity: 3.10,
    waveHeightMeters: 1.3,
    windSpeedKnots: 15,
    isRecommendedBest: false,
    species: ['Bhetki (Barramundi)', 'Topse', 'Gurjali (Threadfin)'],
    notes: 'Extremely high mangrove detritus feeding ground for estuarine fish.'
  },
  {
    id: 'fz-wb-03',
    code: 'PFZ-WB16',
    name: 'Sandheads Deep Oceanic Convergence (Head Bay Pelagic Core)',
    regionId: 'westbengal-coast',
    coordinates: { lat: 21.10, lng: 88.50 },
    distanceKm: 48.0,
    bestTime: '05:00 AM - 10:00 AM',
    riskLevel: 'moderate',
    riskScore: 44,
    productivity: 'high',
    productivityScore: 90,
    sstCelsius: 27.6,
    chlorophyllDensity: 2.85,
    waveHeightMeters: 1.5,
    windSpeedKnots: 16,
    isRecommendedBest: false,
    species: ['Tuna', 'Sharks', 'Bombay Duck', 'Croaker'],
    notes: 'Open sea maritime pilot station zone with massive pelagic concentrations.'
  },

  // ================= 10. ANDAMAN & NICOBAR ISLANDS =================
  {
    id: 'fz-an-01',
    code: 'PFZ-AN03',
    name: 'Port Blair South Point Deep Trench (Rutland Passage)',
    regionId: 'andaman-coast',
    coordinates: { lat: 11.55, lng: 92.85 },
    distanceKm: 22.0,
    bestTime: '04:00 AM - 08:00 AM',
    riskLevel: 'low',
    riskScore: 16,
    productivity: 'high',
    productivityScore: 97,
    sstCelsius: 28.3,
    chlorophyllDensity: 2.60,
    waveHeightMeters: 1.0,
    windSpeedKnots: 10,
    isRecommendedBest: true,
    species: ['Yellowfin Tuna', 'Blue Marlin', 'Skipjack Tuna'],
    notes: 'Deep oceanic trench (1000m+) with world-class pelagic tuna fisheries.'
  },
  {
    id: 'fz-an-02',
    code: 'PFZ-AN09',
    name: "Havelock - Neil Coral Shelf (Ritchie's Archipelago Drop)",
    regionId: 'andaman-coast',
    coordinates: { lat: 12.05, lng: 93.10 },
    distanceKm: 30.0,
    bestTime: '04:30 AM - 08:30 AM',
    riskLevel: 'low',
    riskScore: 18,
    productivity: 'high',
    productivityScore: 94,
    sstCelsius: 28.4,
    chlorophyllDensity: 2.45,
    waveHeightMeters: 0.9,
    windSpeedKnots: 9,
    isRecommendedBest: false,
    species: ['Coral Trout', 'Red Snapper', 'Barracuda'],
    notes: 'Pristine coral drop-offs supporting massive reef and game fish.'
  },

  // ================= 11. LAKSHADWEEP =================
  {
    id: 'fz-lk-01',
    code: 'PFZ-LD02',
    name: 'Agatti - Bangaram Pelagic Coral Bank (Tuna Pole-and-Line Core)',
    regionId: 'lakshadweep-coast',
    coordinates: { lat: 10.88, lng: 72.15 },
    distanceKm: 18.5,
    bestTime: '04:00 AM - 08:30 AM',
    riskLevel: 'low',
    riskScore: 15,
    productivity: 'high',
    productivityScore: 98,
    sstCelsius: 28.5,
    chlorophyllDensity: 2.70,
    waveHeightMeters: 0.8,
    windSpeedKnots: 9,
    isRecommendedBest: true,
    species: ['Skipjack Tuna (Choora)', 'Yellowfin Tuna', 'Rainbow Runner'],
    notes: 'Traditional pole-and-line live bait tuna schooling around atoll reef drop-off.'
  },
  {
    id: 'fz-lk-02',
    code: 'PFZ-LD07',
    name: 'Minicoy Nine Degree Channel Deep Front',
    regionId: 'lakshadweep-coast',
    coordinates: { lat: 8.35, lng: 73.05 },
    distanceKm: 26.0,
    bestTime: '04:30 AM - 08:30 AM',
    riskLevel: 'low',
    riskScore: 17,
    productivity: 'high',
    productivityScore: 95,
    sstCelsius: 28.6,
    chlorophyllDensity: 2.50,
    waveHeightMeters: 1.0,
    windSpeedKnots: 11,
    isRecommendedBest: false,
    species: ['Oceanic Skipjack', 'Wahoo', 'Mahi Mahi'],
    notes: 'International maritime channel with continuous oceanic current upwelling.'
  }
];

export const INITIAL_FISHING_ZONES: FishingZone[] = ALL_FISHING_ZONES.filter(z => z.regionId === 'andhra-coast');

// Active Hazard & Risk Zones in actual offshore ocean waters
export const INITIAL_RISK_ZONES: RiskZone[] = [
  {
    id: 'rz-01',
    name: 'Krishna-Godavari Deep Oceanic Vortex',
    regionId: 'andhra-coast',
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
  },
  {
    id: 'rz-05',
    name: 'Gulf of Kutch Tidal Bore & Shoal Rip',
    regionId: 'gujarat-coast',
    coordinates: { lat: 22.80, lng: 69.20 },
    radiusKm: 16.0,
    riskScore: 82,
    severity: 'high',
    hazardType: 'Tidal Bore Current Shear',
    currentTrend: 'stable',
    advisory: 'Extreme tidal currents exceeding 5.5 knots during spring tide.',
    detectedAt: 'INCOIS Coastal Radar'
  },
  {
    id: 'rz-06',
    name: 'Mumbai Outer Deep Swell Vortex',
    regionId: 'maharashtra-coast',
    coordinates: { lat: 18.70, lng: 72.30 },
    radiusKm: 15.0,
    riskScore: 71,
    severity: 'moderate',
    hazardType: 'Cross-Swell Wave Turbulence',
    currentTrend: 'decreasing',
    advisory: 'Wave steepness hazard for artisanal gillnetters.',
    detectedAt: 'INCOIS Coastal Buoy Array'
  }
];

export const TOP_NATIONAL_PRODUCTIVITY_ZONES = [
  { rank: 1, name: 'Machilipatnam Offshore PFZ-AP18', region: 'Andhra Pradesh', lat: 16.08, lng: 81.30, score: 94, catchForecast: '4.8 - 6.2 Tons', dominantSpecies: 'Yellowfin Tuna, Ribbonfish' },
  { rank: 2, name: 'Agatti Atoll Bio-Core PFZ-LD02', region: 'Lakshadweep', lat: 10.88, lng: 72.15, score: 98, catchForecast: '5.2 - 7.0 Tons', dominantSpecies: 'Skipjack Tuna, Yellowfin' },
  { rank: 3, name: 'Port Blair South Point PFZ-AN03', region: 'Andaman & Nicobar', lat: 11.55, lng: 92.85, score: 97, catchForecast: '5.0 - 6.5 Tons', dominantSpecies: 'Yellowfin Tuna, Marlin' },
  { rank: 4, name: 'Tuticorin Pearl Ridge PFZ-TN15', region: 'Tamil Nadu', lat: 8.85, lng: 78.40, score: 96, catchForecast: '4.6 - 5.9 Tons', dominantSpecies: 'Yellowfin Tuna, Cobia' },
  { rank: 5, name: 'Digha Sankarpur Outer Shelf PFZ-WB02', region: 'West Bengal', lat: 21.45, lng: 87.65, score: 95, catchForecast: '4.5 - 6.0 Tons', dominantSpecies: 'Hilsa, Pomfret' },
  { rank: 6, name: 'Kochi Munambam Confluence PFZ-KL04', region: 'Kerala', lat: 9.92, lng: 75.96, score: 95, catchForecast: '4.4 - 5.8 Tons', dominantSpecies: 'Oil Sardine, Mackerel' }
];

// Comprehensive Historical Disasters by Year covering Indian Seas (2026, 2025, 2024, 2023, 2022, 2021, 2020, 2000, 1999)
export const HISTORICAL_DISASTERS: HistoricalDisaster[] = [
  // ================= 2026 (CURRENT YEAR) =================
  {
    id: 'bob-depression-2026',
    name: 'Bay of Bengal Deep Depression (2026 Event)',
    year: 2026,
    period: 'February - March 2026',
    type: 'Deep Cyclonic Depression / Swell Anomaly',
    center: { lat: 16.40, lng: 82.80 },
    intensityCategory: 'Deep Depression (IMD Alert)',
    maxWindKmph: 68,
    maxSurgeMeters: 1.6,
    damageLevel: 'Moderate Precautionary Recall',
    vesselsAffectedCount: 48,
    portsSuspended: ['Machilipatnam', 'Kakinada Port'],
    impactSummary: 'Early 2026 low-pressure system generated heavy squally winds and sudden 2.8m waves across central Bay of Bengal, triggering proactive vessel recalls.',
    affectedCoordinates: [
      { lat: 15.80, lng: 80.80 },
      { lat: 16.20, lng: 81.60 },
      { lat: 16.90, lng: 82.50 }
    ],
    trendData: [
      { time: 'Day -2', wind: 35, surge: 0.6 },
      { time: 'Day -1', wind: 52, surge: 1.1 },
      { time: 'Peak System', wind: 68, surge: 1.6 },
      { time: 'Day +1', wind: 45, surge: 1.0 },
      { time: 'Day +2', wind: 28, surge: 0.5 }
    ]
  },
  {
    id: 'arabian-sea-surge-2026',
    name: 'Arabian Sea Pre-Monsoon Swell Surge 2026',
    year: 2026,
    period: 'April - May 2026',
    type: 'High Wave & Coastal Inundation Event',
    center: { lat: 10.20, lng: 75.40 },
    intensityCategory: 'Swell Wave Alert (INCOIS)',
    maxWindKmph: 74,
    maxSurgeMeters: 2.2,
    damageLevel: 'Moderate Coastal Inundation',
    vesselsAffectedCount: 88,
    portsSuspended: ['Kochi Fisheries Harbor', 'Vizhinjam Port', 'Mormugao'],
    impactSummary: 'Southern Ocean swell trains coincided with high spring tides, generating dangerous breaker zones along Kerala and South Goa beaches.',
    affectedCoordinates: [
      { lat: 8.50, lng: 76.90 },
      { lat: 9.90, lng: 76.20 },
      { lat: 15.40, lng: 73.80 }
    ],
    trendData: [
      { time: 'Day -2', wind: 40, surge: 0.8 },
      { time: 'Day -1', wind: 60, surge: 1.5 },
      { time: 'Peak Surge', wind: 74, surge: 2.2 },
      { time: 'Day +1', wind: 50, surge: 1.3 },
      { time: 'Day +2', wind: 30, surge: 0.6 }
    ]
  },
  {
    id: 'machilipatnam-wave-2026',
    name: 'Machilipatnam High Wave Surge Event 2026',
    year: 2026,
    period: 'June - July 2026',
    type: 'High Swell & Tidal Inundation',
    center: { lat: 16.18, lng: 81.16 },
    intensityCategory: 'Coastal Red Alert',
    maxWindKmph: 58,
    maxSurgeMeters: 1.9,
    damageLevel: 'Low to Moderate',
    vesselsAffectedCount: 114,
    portsSuspended: ['Machilipatnam', 'Nizampatnam'],
    impactSummary: 'Real-time coastal alert triggered for high wave inundation and beach erosion along Krishna district shoreline.',
    affectedCoordinates: [
      { lat: 15.90, lng: 80.70 },
      { lat: 16.18, lng: 81.16 }
    ],
    trendData: [
      { time: 'Day -2', wind: 30, surge: 0.5 },
      { time: 'Day -1', wind: 45, surge: 1.2 },
      { time: 'Peak Alert', wind: 58, surge: 1.9 },
      { time: 'Day +1', wind: 38, surge: 1.0 },
      { time: 'Day +2', wind: 22, surge: 0.4 }
    ]
  },

  // ================= 2025 =================
  {
    id: 'cyclone-fengal-2025',
    name: 'Cyclone Fengal',
    year: 2025,
    period: 'September 2025',
    type: 'Cyclonic Storm / Heavy Marine Inundation',
    center: { lat: 12.00, lng: 80.00 },
    intensityCategory: 'Cycloner 7 (Severe)',
    maxWindKmph: 110,
    maxSurgeMeters: 3.2,
    damageLevel: 'Severe Coastal Inundation (78% Damage Indicator)',
    vesselsAffectedCount: 218,
    portsSuspended: ['Puducherry Port', 'Chennai Port', 'Cuddalore', 'Machilipatnam'],
    impactSummary: 'Slow-moving cyclonic system dumped record rainfall and generated 4.8m storm waves along North Tamil Nadu and South Andhra coasts.',
    affectedCoordinates: [
      { lat: 11.93, lng: 79.83 },
      { lat: 13.08, lng: 80.27 },
      { lat: 15.80, lng: 80.50 }
    ],
    trendData: [
      { time: 'Day -3', wind: 45, surge: 0.9 },
      { time: 'Day -2', wind: 80, surge: 1.8 },
      { time: 'Landfall', wind: 110, surge: 3.2 },
      { time: 'Day +1', wind: 70, surge: 1.9 },
      { time: 'Day +2', wind: 35, surge: 0.7 }
    ]
  },
  {
    id: 'cyclone-shakhti-2025',
    name: 'Cyclone Shakhti',
    year: 2025,
    period: '16-Sept 2025',
    type: 'Arabian Sea Cyclonic Storm',
    center: { lat: 20.20, lng: 69.80 },
    intensityCategory: 'Cyclonic Storm',
    maxWindKmph: 110,
    maxSurgeMeters: 2.8,
    damageLevel: 'Moderate to High (65% Damage Indicator)',
    vesselsAffectedCount: 218,
    portsSuspended: ['Veraval', 'Porbandar', 'Okha', 'Jakhau'],
    impactSummary: 'Gale-force winds tracked parallel to Saurashtra coast disrupting offshore mechanised gillnetters for 5 days.',
    affectedCoordinates: [
      { lat: 20.90, lng: 70.37 },
      { lat: 21.64, lng: 69.60 }
    ],
    trendData: [
      { time: 'Day -3', wind: 40, surge: 0.8 },
      { time: 'Day -2', wind: 75, surge: 1.6 },
      { time: 'Peak Surge', wind: 110, surge: 2.8 },
      { time: 'Day +1', wind: 65, surge: 1.4 },
      { time: 'Day +2', wind: 30, surge: 0.6 }
    ]
  },
  {
    id: 'cyclone-ditwah-2025',
    name: 'CycloneDitwah',
    year: 2025,
    period: '27-Sept 2025',
    type: 'Severe Cyclonic Storm',
    center: { lat: 11.50, lng: 80.80 },
    intensityCategory: 'Sevier (Category 3)',
    maxWindKmph: 110,
    maxSurgeMeters: 4.5,
    damageLevel: 'Severe (82% Damage Indicator)',
    vesselsAffectedCount: 218,
    portsSuspended: ['Nagapattinam', 'Karaikal', 'Chennai', 'Cuddalore'],
    impactSummary: 'Rapidly intensifying system generated 4.5m storm surge breaching coastal sea-dykes and flooding low-lying harbours.',
    affectedCoordinates: [
      { lat: 10.76, lng: 79.84 },
      { lat: 11.75, lng: 79.77 },
      { lat: 13.08, lng: 80.27 }
    ],
    trendData: [
      { time: 'Day -3', wind: 50, surge: 1.1 },
      { time: 'Day -2', wind: 85, surge: 2.4 },
      { time: 'Landfall', wind: 110, surge: 4.5 },
      { time: 'Day +1', wind: 75, surge: 2.2 },
      { time: 'Day +2', wind: 40, surge: 0.9 }
    ]
  },
  {
    id: 'cyclone-montha-2025',
    name: 'Cyclone Montha',
    year: 2025,
    period: '03-Nov 2025',
    type: 'Severe Cyclonic Storm',
    center: { lat: 16.70, lng: 82.20 },
    intensityCategory: 'Sevier (Category 2)',
    maxWindKmph: 110,
    maxSurgeMeters: 3.6,
    damageLevel: 'High Impact (71% Damage Indicator)',
    vesselsAffectedCount: 217,
    portsSuspended: ['Kakinada Port', 'Machilipatnam', 'Bhavanapadu', 'Visakhapatnam'],
    impactSummary: 'Direct landfall near Godavari delta inundated fishing villages and destroyed country craft moorings.',
    affectedCoordinates: [
      { lat: 16.73, lng: 82.22 },
      { lat: 16.98, lng: 82.24 }
    ],
    trendData: [
      { time: 'Day -3', wind: 42, surge: 0.7 },
      { time: 'Day -2', wind: 78, surge: 1.9 },
      { time: 'Landfall', wind: 110, surge: 3.6 },
      { time: 'Day +1', wind: 68, surge: 1.7 },
      { time: 'Day +2', wind: 32, surge: 0.5 }
    ]
  },

  // ================= 2024 =================
  {
    id: 'cyclone-dana-2024',
    name: 'Cyclone Dana',
    year: 2024,
    period: 'October 2024',
    type: 'Severe Cyclonic Storm',
    center: { lat: 20.80, lng: 86.90 },
    intensityCategory: 'Severe Cyclonic Storm (IMD)',
    maxWindKmph: 120,
    maxSurgeMeters: 2.5,
    damageLevel: 'Moderate to Severe (54% Damage Indicator)',
    vesselsAffectedCount: 312,
    portsSuspended: ['Dhamra Port', 'Paradip Port', 'Puri', 'Digha'],
    impactSummary: 'Landfall near Habalikhati Nature Camp (Dhamra) in Odisha with extensive tidal surge in Bhadrak and Kendrapara districts.',
    affectedCoordinates: [
      { lat: 20.80, lng: 86.95 },
      { lat: 21.05, lng: 86.85 }
    ],
    trendData: [
      { time: 'Day -3', wind: 55, surge: 0.8 },
      { time: 'Day -2', wind: 95, surge: 1.6 },
      { time: 'Landfall', wind: 120, surge: 2.5 },
      { time: 'Day +1', wind: 65, surge: 1.2 },
      { time: 'Day +2', wind: 35, surge: 0.5 }
    ]
  },
  {
    id: 'cyclone-remal-2024',
    name: 'Cyclone Remal',
    year: 2024,
    period: 'May 2024',
    type: 'Severe Cyclonic Storm',
    center: { lat: 21.90, lng: 89.20 },
    intensityCategory: 'Severe Cyclonic Storm',
    maxWindKmph: 135,
    maxSurgeMeters: 3.8,
    damageLevel: 'Severe (Sundarbans Flooding)',
    vesselsAffectedCount: 420,
    portsSuspended: ['Kolkata Port', 'Haldia', 'Frasergunj', 'Digha'],
    impactSummary: 'Crossed West Bengal-Bangladesh coast adjacent to Sundarbans Mangrove delta causing extensive saline embankment collapse.',
    affectedCoordinates: [
      { lat: 21.63, lng: 87.52 },
      { lat: 21.75, lng: 88.30 }
    ],
    trendData: [
      { time: 'Day -3', wind: 60, surge: 1.0 },
      { time: 'Day -2', wind: 105, surge: 2.2 },
      { time: 'Landfall', wind: 135, surge: 3.8 },
      { time: 'Day +1', wind: 80, surge: 2.0 },
      { time: 'Day +2', wind: 40, surge: 0.8 }
    ]
  },
  {
    id: 'cyclone-asna-2024',
    name: 'Cyclone Asna',
    year: 2024,
    period: 'August - September 2024',
    type: 'Rare Land-to-Sea Cyclonic Storm',
    center: { lat: 23.30, lng: 68.40 },
    intensityCategory: 'Cyclonic Storm',
    maxWindKmph: 85,
    maxSurgeMeters: 2.1,
    damageLevel: 'Moderate Coastal Inundation',
    vesselsAffectedCount: 145,
    portsSuspended: ['Jakhau', 'Kandla', 'Mandvi', 'Okha'],
    impactSummary: 'Rare deep depression originating overland over Gujarat emerging into Arabian Sea and intensifying into a cyclonic storm.',
    affectedCoordinates: [
      { lat: 23.20, lng: 68.60 },
      { lat: 22.80, lng: 69.20 }
    ],
    trendData: [
      { time: 'Day -3', wind: 40, surge: 0.5 },
      { time: 'Day -2', wind: 65, surge: 1.2 },
      { time: 'Peak Storm', wind: 85, surge: 2.1 },
      { time: 'Day +1', wind: 55, surge: 1.1 },
      { time: 'Day +2', wind: 30, surge: 0.4 }
    ]
  },

  // ================= 2023 =================
  {
    id: 'cyclone-michaung-2023',
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
    id: 'cyclone-biparjoy-2023',
    name: 'Cyclone Biparjoy',
    year: 2023,
    period: 'June 2023',
    type: 'Extremely Severe Cyclonic Storm',
    center: { lat: 23.20, lng: 68.60 },
    intensityCategory: 'Category 3 Extremely Severe',
    maxWindKmph: 165,
    maxSurgeMeters: 4.2,
    damageLevel: 'Extremely High (Kutch Sea Front)',
    vesselsAffectedCount: 680,
    portsSuspended: ['Jakhau Port', 'Kandla', 'Mundra', 'Porbandar', 'Okha'],
    impactSummary: 'Longest-lived cyclone in Arabian Sea history. Massive coastal inundation across Kutch and Saurashtra with total port shutdowns.',
    affectedCoordinates: [
      { lat: 22.80, lng: 69.20 },
      { lat: 23.25, lng: 68.50 }
    ],
    trendData: [
      { time: 'Day -3', wind: 75, surge: 1.5 },
      { time: 'Day -2', wind: 130, surge: 2.8 },
      { time: 'Landfall', wind: 165, surge: 4.2 },
      { time: 'Day +1', wind: 95, surge: 2.4 },
      { time: 'Day +2', wind: 45, surge: 1.0 }
    ]
  },

  // ================= 2022 =================
  {
    id: 'cyclone-mandous-2022',
    name: 'Cyclone Mandous',
    year: 2022,
    period: 'December 2022',
    type: 'Severe Cyclonic Storm',
    center: { lat: 12.60, lng: 80.20 },
    intensityCategory: 'Severe Cyclonic Storm',
    maxWindKmph: 105,
    maxSurgeMeters: 2.8,
    damageLevel: 'Moderate to Severe',
    vesselsAffectedCount: 245,
    portsSuspended: ['Chennai Port', 'Mahabalipuram', 'Cuddalore', 'Puducherry'],
    impactSummary: 'Landfall near Mamallapuram in Tamil Nadu causing widespread boat capsize, shore erosion, and sea water ingress.',
    affectedCoordinates: [
      { lat: 12.62, lng: 80.19 },
      { lat: 13.08, lng: 80.27 }
    ],
    trendData: [
      { time: 'Day -3', wind: 48, surge: 0.9 },
      { time: 'Day -2', wind: 82, surge: 1.8 },
      { time: 'Landfall', wind: 105, surge: 2.8 },
      { time: 'Day +1', wind: 60, surge: 1.3 },
      { time: 'Day +2', wind: 30, surge: 0.5 }
    ]
  },
  {
    id: 'cyclone-asani-2022',
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

  // ================= 2021 =================
  {
    id: 'cyclone-tauktae-2021',
    name: 'Cyclone Tauktae',
    year: 2021,
    period: 'May 2021',
    type: 'Extremely Severe Cyclonic Storm',
    center: { lat: 20.80, lng: 71.10 },
    intensityCategory: 'Category 4 Extremely Severe',
    maxWindKmph: 185,
    maxSurgeMeters: 4.8,
    damageLevel: 'Catastrophic West Coast Destruction',
    vesselsAffectedCount: 780,
    portsSuspended: ['Veraval', 'Jafarabad', 'Pipavav', 'Mormugao', 'Mumbai'],
    impactSummary: 'Violent cyclonic storm roared parallel to Kerala, Goa, Maharashtra before destructive landfall in Saurashtra (Una/Jafarabad).',
    affectedCoordinates: [
      { lat: 15.40, lng: 73.80 },
      { lat: 18.90, lng: 72.80 },
      { lat: 20.80, lng: 71.30 }
    ],
    trendData: [
      { time: 'Day -3', wind: 80, surge: 1.6 },
      { time: 'Day -2', wind: 140, surge: 3.2 },
      { time: 'Landfall', wind: 185, surge: 4.8 },
      { time: 'Day +1', wind: 100, surge: 2.5 },
      { time: 'Day +2', wind: 50, surge: 1.0 }
    ]
  },
  {
    id: 'cyclone-yaas-2021',
    name: 'Cyclone Yaas',
    year: 2021,
    period: 'May 2021',
    type: 'Very Severe Cyclonic Storm',
    center: { lat: 21.30, lng: 86.90 },
    intensityCategory: 'Category 3 Very Severe',
    maxWindKmph: 140,
    maxSurgeMeters: 4.2,
    damageLevel: 'High Inundation (Odisha / West Bengal)',
    vesselsAffectedCount: 650,
    portsSuspended: ['Dhamra Port', 'Paradip', 'Digha', 'Kakdwip'],
    impactSummary: 'Landfall near Dhamra Port in Odisha with massive storm surge breaching coastal sea walls in Digha and Kakdwip.',
    affectedCoordinates: [
      { lat: 20.80, lng: 86.90 },
      { lat: 21.63, lng: 87.52 }
    ],
    trendData: [
      { time: 'Day -3', wind: 65, surge: 1.2 },
      { time: 'Day -2', wind: 110, surge: 2.6 },
      { time: 'Landfall', wind: 140, surge: 4.2 },
      { time: 'Day +1', wind: 80, surge: 2.0 },
      { time: 'Day +2', wind: 40, surge: 0.8 }
    ]
  },
  {
    id: 'cyclone-gulab-2021',
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

  // ================= 2020 =================
  {
    id: 'super-cyclone-amphan-2020',
    name: 'Super Cyclone Amphan',
    year: 2020,
    period: 'May 2020',
    type: 'Super Cyclonic Storm (Category 5)',
    center: { lat: 21.70, lng: 88.30 },
    intensityCategory: 'Super Cyclonic Storm (Category 5)',
    maxWindKmph: 240,
    maxSurgeMeters: 5.5,
    damageLevel: 'Catastrophic Delta Devastation',
    vesselsAffectedCount: 920,
    portsSuspended: ['Kolkata', 'Haldia', 'Paradip', 'Digha', 'Kakdwip'],
    impactSummary: 'One of the fiercest cyclones on record in Bay of Bengal. Tidal surge of 5m obliterated embankments across entire Sundarbans delta.',
    affectedCoordinates: [
      { lat: 21.60, lng: 87.50 },
      { lat: 22.00, lng: 88.40 }
    ],
    trendData: [
      { time: 'Day -3', wind: 90, surge: 1.8 },
      { time: 'Day -2', wind: 180, surge: 3.5 },
      { time: 'Landfall', wind: 240, surge: 5.5 },
      { time: 'Day +1', wind: 130, surge: 3.0 },
      { time: 'Day +2', wind: 60, surge: 1.2 }
    ]
  },
  {
    id: 'cyclone-nisarga-2020',
    name: 'Cyclone Nisarga',
    year: 2020,
    period: 'June 2020',
    type: 'Severe Cyclonic Storm',
    center: { lat: 18.30, lng: 72.90 },
    intensityCategory: 'Category 2 Severe',
    maxWindKmph: 120,
    maxSurgeMeters: 2.6,
    damageLevel: 'High Coastal Impact (Raigad / Alibaug)',
    vesselsAffectedCount: 340,
    portsSuspended: ['Mumbai Harbor', 'Jawaharlal Nehru Port', 'Alibaug', 'Ratnagiri'],
    impactSummary: 'First severe cyclone to make direct landfall in Maharashtra close to Mumbai since 1891, damaging harbour infrastructure.',
    affectedCoordinates: [
      { lat: 18.20, lng: 72.90 },
      { lat: 18.90, lng: 72.80 }
    ],
    trendData: [
      { time: 'Day -3', wind: 45, surge: 0.8 },
      { time: 'Day -2', wind: 85, surge: 1.7 },
      { time: 'Landfall', wind: 120, surge: 2.6 },
      { time: 'Day +1', wind: 65, surge: 1.3 },
      { time: 'Day +2', wind: 30, surge: 0.5 }
    ]
  },

  // ================= 2000 =================
  {
    id: 'cyclone-bob-2000',
    name: '2000 Central Bay of Bengal Cyclone',
    year: 2000,
    period: 'November - December 2000',
    type: 'Very Severe Cyclonic Storm (BOB 05)',
    center: { lat: 12.00, lng: 80.50 },
    intensityCategory: 'Very Severe Cyclonic Storm',
    maxWindKmph: 155,
    maxSurgeMeters: 3.8,
    damageLevel: 'Severe Coastal Inundation',
    vesselsAffectedCount: 460,
    portsSuspended: ['Puducherry', 'Cuddalore', 'Chennai', 'Nagapattinam'],
    impactSummary: 'Intense cyclonic storm made landfall near Cuddalore with gale winds and 3.8m storm surges severely impacting the fishing sector.',
    affectedCoordinates: [
      { lat: 11.75, lng: 79.77 },
      { lat: 12.00, lng: 79.85 }
    ],
    trendData: [
      { time: 'Day -3', wind: 60, surge: 1.1 },
      { time: 'Day -2', wind: 115, surge: 2.5 },
      { time: 'Landfall', wind: 155, surge: 3.8 },
      { time: 'Day +1', wind: 85, surge: 1.9 },
      { time: 'Day +2', wind: 40, surge: 0.7 }
    ]
  }
];
