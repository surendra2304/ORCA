export type AppScreen = 'login' | 'home' | 'dashboard' | 'analytics' | 'pfz-areas' | 'settings';

export type SuitabilityLevel = 'high' | 'medium' | 'low';

export interface PFZZone {
  id: string;
  name: string;
  number: string;
  lat: number;
  lng: number;
  suitability: SuitabilityLevel;
  suitabilityLabel: string;
  color: string;
  distance: string;
  seaTemp: string;
  waveHeight: string;
  windSpeed: string;
  expectedCatch: string;
  bestTime: string;
  species: string;
  heatCondition: string;
  heatBadgeClass: string;
  heatDotColor: string;
  heatAdvice: string;
  depth: string;
  chlorophyllIndex?: string;
  salinity?: string;
  currentVelocity?: string;
}

export interface SeaConditionsData {
  seaTemp: number;
  tempStatus: string;
  heatStress: string;
  windSpeed: number;
  waveHeight: number;
  seaState: string;
  tide: number;
  tideDirection: 'rising' | 'falling';
  visibility: number;
  visibilityRating: string;
  thermalFrontStatus: string;
  thermalFrontNote: string;
}

export interface MetricSummary {
  totalTrips: number;
  tripsChange: string;
  totalCatchKg: number;
  catchChange: string;
  avgCatchKg: number;
  avgCatchChange: string;
  bestZone: string;
  bestZoneActivity: string;
  totalDistanceKm: number;
  distanceChange: string;
  estEarningsInr: number;
  earningsChange: string;
}

export interface UserProfile {
  name: string;
  phone: string;
  boatName: string;
  homeHarbour: string;
  location: string;
}

export interface UserPreferences {
  distanceUnit: 'Kilometers (km)' | 'Nautical Miles (NM)' | 'Miles (mi)';
  tempUnit: 'Celsius (°C)' | 'Fahrenheit (°F)';
  windUnit: 'km/h' | 'Knots (kn)' | 'm/s';
  notifications: boolean;
  darkMode: boolean;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'orca';
  text: string;
  timestamp: string;
  isQuickReply?: boolean;
}

export interface MarineAlert {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  time: string;
  isRead: boolean;
}
