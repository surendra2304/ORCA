import { PFZZone, SeaConditionsData, MetricSummary, UserProfile, UserPreferences, MarineAlert } from '../types';

export const initialUserProfile: UserProfile = {
  name: 'Ramesh',
  phone: '+91 98765 43210',
  boatName: 'MV Ocean Star',
  homeHarbour: 'Kakinada',
  location: 'Kakinada Coast',
};

export const initialPreferences: UserPreferences = {
  distanceUnit: 'Kilometers (km)',
  tempUnit: 'Celsius (°C)',
  windUnit: 'km/h',
  notifications: true,
  darkMode: false,
};

export const currentSeaConditions: SeaConditionsData = {
  seaTemp: 27.6,
  tempStatus: 'Normal Front',
  heatStress: 'Low',
  windSpeed: 18,
  waveHeight: 1.2,
  seaState: 'Moderate',
  tide: 1.4,
  tideDirection: 'rising',
  visibility: 8,
  visibilityRating: 'Good',
  thermalFrontStatus: 'Optimal',
  thermalFrontNote: 'Cooler waters deep, warm surface front favorable for Tuna & Mackerel schooling.',
};

export const initialMetrics: MetricSummary = {
  totalTrips: 12,
  tripsChange: '2 vs last week',
  totalCatchKg: 850,
  catchChange: '8% vs last week',
  avgCatchKg: 70.8,
  avgCatchChange: '6% vs last week',
  bestZone: 'PFZ-03',
  bestZoneActivity: 'High Activity',
  totalDistanceKm: 142,
  distanceChange: '5% vs last week',
  estEarningsInr: 18450,
  earningsChange: '10% vs last week',
};

export const pfzZones: Record<string, PFZZone> = {
  'pfz-03': {
    id: 'pfz-03',
    name: 'PFZ-03',
    number: '03',
    lat: 16.950,
    lng: 82.350,
    suitability: 'high',
    suitabilityLabel: 'High Suitability',
    color: '#10b981',
    distance: '18.4 km',
    seaTemp: '27.4 °C',
    waveHeight: '1.2 m',
    windSpeed: '18 km/h',
    expectedCatch: 'High',
    bestTime: '06:00 AM - 11:00 AM',
    species: 'Sardine, Mackerel, Tuna',
    heatCondition: 'Optimal Heat (Safe & Dense Pelagic Layer)',
    heatBadgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    heatDotColor: 'bg-emerald-500',
    heatAdvice: 'Surface Feeding Layer active',
    depth: '14 - 22 m',
    chlorophyllIndex: '0.48 mg/m³',
    salinity: '32.8 PSU',
    currentVelocity: '0.6 knots SW',
  },
  'pfz-07': {
    id: 'pfz-07',
    name: 'PFZ-07',
    number: '07',
    lat: 16.820,
    lng: 82.400,
    suitability: 'medium',
    suitabilityLabel: 'Medium Suitability',
    color: '#f59e0b',
    distance: '24.7 km',
    seaTemp: '28.1 °C',
    waveHeight: '1.6 m',
    windSpeed: '22 km/h',
    expectedCatch: 'Moderate',
    bestTime: '05:30 AM - 09:30 AM',
    species: 'Seer Fish, Ribbon Fish',
    heatCondition: 'Moderate Warm Pool (Moderate Dispersion)',
    heatBadgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    heatDotColor: 'bg-amber-500',
    heatAdvice: 'Pelagic fish migrating toward cooler thermocline',
    depth: '22 - 32 m',
    chlorophyllIndex: '0.28 mg/m³',
    salinity: '33.1 PSU',
    currentVelocity: '0.8 knots S',
  },
  'pfz-11': {
    id: 'pfz-11',
    name: 'PFZ-11',
    number: '11',
    lat: 16.700,
    lng: 82.480,
    suitability: 'low',
    suitabilityLabel: 'Low Suitability',
    color: '#ef4444',
    distance: '32.1 km',
    seaTemp: '30.8 °C',
    waveHeight: '2.4 m',
    windSpeed: '31 km/h',
    expectedCatch: 'Low / Rough Sea',
    bestTime: 'Advisory: Exercise Caution',
    species: 'Scattered / Deep Water',
    heatCondition: 'Extreme Thermal Heat Stress (>30.5°C)',
    heatBadgeClass: 'bg-red-50 text-red-600 border-red-200',
    heatDotColor: 'bg-red-500',
    heatAdvice: 'Fish dispersed deep below thermocline (>40m)',
    depth: '38 - 50 m',
    chlorophyllIndex: '0.12 mg/m³',
    salinity: '34.0 PSU',
    currentVelocity: '1.4 knots SE',
  },
  'pfz-15': {
    id: 'pfz-15',
    name: 'PFZ-15',
    number: '15',
    lat: 17.080,
    lng: 82.420,
    suitability: 'high',
    suitabilityLabel: 'High Suitability',
    color: '#10b981',
    distance: '36.5 km',
    seaTemp: '25.9 °C',
    waveHeight: '1.1 m',
    windSpeed: '16 km/h',
    expectedCatch: 'Very High',
    bestTime: '04:30 AM - 10:30 AM',
    species: 'Yellowfin Tuna, Sardine, Squid',
    heatCondition: 'Cool Upwelling Front (Nutrient Rich)',
    heatBadgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    heatDotColor: 'bg-cyan-500',
    heatAdvice: 'Optimal surface and sub-surface schools',
    depth: '10 - 18 m',
    chlorophyllIndex: '0.62 mg/m³',
    salinity: '32.4 PSU',
    currentVelocity: '0.5 knots NW',
  },
};

export const harborCoords: [number, number] = [16.989, 82.247]; // Kakinada Fishing Harbor

export const catchOverTimeData = [
  { date: '28 Apr', day: 'Mon', catchKg: 90 },
  { date: '29 Apr', day: 'Tue', catchKg: 150 },
  { date: '30 Apr', day: 'Wed', catchKg: 100 },
  { date: '01 May', day: 'Thu', catchKg: 75 },
  { date: '02 May', day: 'Fri', catchKg: 150 },
  { date: '03 May', day: 'Sat', catchKg: 152 },
  { date: '04 May', day: 'Sun', catchKg: 155 },
];

export const catchByFishTypeData = [
  { name: 'Sardine', percentage: 40, color: '#0d6efd', kg: 340 },
  { name: 'Mackerel', percentage: 30, color: '#f59e0b', kg: 255 },
  { name: 'Tuna', percentage: 20, color: '#10b981', kg: 170 },
  { name: 'Others', percentage: 10, color: '#1e3a8a', kg: 85 },
];

export const catchByPFZAreaData = [
  { name: 'PFZ-03', percentage: 45, color: '#059669', kg: 382.5 },
  { name: 'PFZ-07', percentage: 30, color: '#f97316', kg: 255 },
  { name: 'PFZ-11', percentage: 15, color: '#ef4444', kg: 127.5 },
  { name: 'Others', percentage: 10, color: '#0d6efd', kg: 85 },
];

export const initialAlerts: MarineAlert[] = [
  {
    id: 'alt-1',
    title: 'Safe Sea Window Confirmed',
    description: 'Optimal fishing conditions along Kakinada Coast until 11:00 AM. SST 27.6°C.',
    severity: 'low',
    time: '30 mins ago',
    isRead: false,
  },
  {
    id: 'alt-2',
    title: 'INCOIS PFZ Advisories Synced',
    description: 'High Chlorophyll front detected 18.4 km offshore (PFZ-03). Schooling reported.',
    severity: 'low',
    time: '2 hours ago',
    isRead: false,
  },
  {
    id: 'alt-3',
    title: 'Naval Patrol Notice in North Sector',
    description: 'Commercial trawling restricted in coastal polygon north of 17.06° N.',
    severity: 'medium',
    time: 'Yesterday',
    isRead: true,
  },
];

// Conversational AI bot intelligence answers tailored to Kakinada / Andhra Coast
export function getBotReply(query: string): string {
  const q = query.toLowerCase();
  if (q.includes('best fishing zone') || q.includes('where is the best') || q.includes('pfz')) {
    return "The best fishing zone today is PFZ-03 (16.95° N, 82.35° E), located 18.4 km east-southeast of Kakinada Port. Current Sea Surface Temperature is 27.4°C with an optimal chlorophyll front. Expect strong schools of Sardine, Mackerel, and Yellowfin Tuna at 14–22 meters depth.";
  }
  if (q.includes('safe') || q.includes('is the sea safe')) {
    return "Yes, the sea is safe for artisanal and mechanized fishing today! Wave height is low to moderate at 1.2 m, wind speed is 18 km/h, and visibility is 8 km. No cyclone or severe surge warnings are in effect along Kakinada Coast.";
  }
  if (q.includes('weather') || q.includes('wind') || q.includes('wave')) {
    return "Current weather at Kakinada Coast: Fair and sunny ☀️. Ambient temperature 31°C, Sea Surface Temperature (SST) 27.6°C. Wind speed: 18 km/h from the South-Southwest. Wave height: 1.2 m. Tide is rising at +1.4 m.";
  }
  if (q.includes('should i go fishing') || q.includes('now')) {
    return "Yes, the current window from 06:00 AM to 11:00 AM is rated EXCELLENT. Sea conditions are stable, surface feeding is active, and the thermal gradient around PFZ-03 provides safe navigation.";
  }
  if (q.includes('high fish productivity') || q.includes('productivity')) {
    return "High fish productivity is concentrated in PFZ-03 (18.4 km) and PFZ-15 (36.5 km). PFZ-15 has cool upwelling water at 25.9°C rich in plankton, yielding high catches of Yellowfin Tuna and Squid.";
  }
  if (q.includes('risk') || q.includes('danger') || q.includes('hazard')) {
    return "Today's main risk area is PFZ-11 (32.1 km offshore). It exhibits extreme thermal heat stress (>30.8°C), rip currents, and 2.4 m swells with dispersed fish. Also avoid the Naval Patrol restricted zone 17.06° N.";
  }
  if (q.includes('sst') || q.includes('temperature') || q.includes('thermal')) {
    return "Sea Surface Temperature (SST) along Kakinada is currently 27.6°C (Optimal front). The cool upwelling shelf to the north sits at 24.8°C–25.9°C, while offshore heat stress pockets reach 30.8°C in PFZ-11.";
  }
  return `ORCA Marine Intelligence for Kakinada Coast: Sea conditions are stable (SST 27.6°C, waves 1.2m). Best target zone is PFZ-03 with estimated catch high for Sardine and Tuna. Stay clear of PFZ-11 due to thermal heat stress. Safe voyage!`;
}
