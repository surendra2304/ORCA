import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface CoastalPort {
  id: string;
  name: string;
  region: string;
  lat: number;
  lon: number;
  description?: string;
}

export const COASTAL_PORTS: CoastalPort[] = [
  {
    id: 'kakinada',
    name: 'Kakinada Port',
    region: 'Andhra Pradesh',
    lat: 16.9891,
    lon: 82.2475,
    description: 'Major deepwater fishing harbour on Godavari coast',
  },
  {
    id: 'vizag',
    name: 'Visakhapatnam Harbor',
    region: 'Andhra Pradesh',
    lat: 17.6868,
    lon: 83.2185,
    description: 'Primary commercial & fishing harbour of North AP',
  },
  {
    id: 'bhimavaram',
    name: 'Bhimavaram / Antarvedi Coast',
    region: 'Andhra Pradesh',
    lat: 16.3268,
    lon: 81.7289,
    description: 'Confluence of Godavari & Bay of Bengal',
  },
  {
    id: 'machilipatnam',
    name: 'Machilipatnam (Gilakaladindi)',
    region: 'Andhra Pradesh',
    lat: 16.1875,
    lon: 81.1389,
    description: 'Krishna delta fishing and landing centre',
  },
  {
    id: 'nizampatnam',
    name: 'Nizampatnam Port',
    region: 'Andhra Pradesh',
    lat: 15.9062,
    lon: 80.6682,
    description: 'Bapatla / Guntur coastal fishing harbour',
  },
  {
    id: 'krishnapatnam',
    name: 'Krishnapatnam Port',
    region: 'Andhra Pradesh',
    lat: 14.2500,
    lon: 80.1167,
    description: 'Nellore deep sea coastal harbour',
  },
  {
    id: 'chennai',
    name: 'Chennai Fishing Harbour',
    region: 'Tamil Nadu',
    lat: 13.1250,
    lon: 80.2970,
    description: 'Kasimedu coastal fishery hub',
  },
  {
    id: 'paradip',
    name: 'Paradip Fishing Harbour',
    region: 'Odisha',
    lat: 20.3165,
    lon: 86.6114,
    description: 'Mahanadi river mouth marine hub',
  },
  {
    id: 'mangalore',
    name: 'Mangalore Port',
    region: 'Karnataka',
    lat: 12.9141,
    lon: 74.8560,
    description: 'Arabian Sea west coast fishery hub',
  },
  {
    id: 'kochi',
    name: 'Kochi (Cochin) Port',
    region: 'Kerala',
    lat: 9.9312,
    lon: 76.2673,
    description: 'Vembanad estuary & Arabian Sea landing harbour',
  },
  {
    id: 'mumbai',
    name: 'Mumbai (Sassoon Docks)',
    region: 'Maharashtra',
    lat: 18.9170,
    lon: 72.8250,
    description: 'Historic commercial fishing harbour',
  },
];

export interface UserLocation {
  lat: number;
  lon: number;
  name: string;
  isGPS: boolean;
  accuracy?: number; // in meters
  nearestPort?: string;
  lastUpdated: number;
}

export interface LocationContextType {
  location: UserLocation;
  loading: boolean;
  permission: 'prompt' | 'granted' | 'denied' | 'unsupported';
  error: string | null;
  requestLocation: () => Promise<void>;
  selectPort: (port: CoastalPort) => void;
  availablePorts: CoastalPort[];
}

// Haversine distance in kilometers
function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Find nearest coastal port
export function findNearestPort(lat: number, lon: number): { port: CoastalPort; distanceKm: number } {
  let nearest = COASTAL_PORTS[0];
  let minDistance = Infinity;

  for (const port of COASTAL_PORTS) {
    const dist = getDistanceKm(lat, lon, port.lat, port.lon);
    if (dist < minDistance) {
      minDistance = dist;
      nearest = port;
    }
  }

  return { port: nearest, distanceKm: Math.round(minDistance * 10) / 10 };
}

const DEFAULT_LOCATION: UserLocation = {
  lat: 16.9891,
  lon: 82.2475,
  name: 'Kakinada Port',
  isGPS: false,
  nearestPort: 'Kakinada Port',
  lastUpdated: Date.now(),
};

const STORAGE_KEY = 'orca_user_location';

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [location, setLocation] = useState<UserLocation>(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (typeof parsed.lat === 'number' && typeof parsed.lon === 'number') {
          return parsed;
        }
      }
    } catch {
      // ignore JSON parse error
    }
    return DEFAULT_LOCATION;
  });

  const [loading, setLoading] = useState(false);
  const [permission, setPermission] = useState<'prompt' | 'granted' | 'denied' | 'unsupported'>('prompt');
  const [error, setError] = useState<string | null>(null);

  // Reverse geocode lat/lon with Nominatim or fall back to closest coastal port
  const resolveLocationName = useCallback(async (lat: number, lon: number): Promise<string> => {
    const { port, distanceKm } = findNearestPort(lat, lon);

    // If within 25 km of a known major fishing port, prefer that harbor's name
    if (distanceKm <= 25) {
      return port.name;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=12&addressdetails=1`,
        {
          signal: controller.signal,
          headers: { 'Accept-Language': 'en' },
        }
      );
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const city =
          data.address?.city ||
          data.address?.town ||
          data.address?.suburb ||
          data.address?.county ||
          data.address?.state_district;
        if (city) {
          const portBase = port.name.replace(/\s+(Coast|Port|Harbor)\s*$/i, '');
          return `${city} (${portBase} Coast)`;
        }
      }
    } catch {
      // Network failure or timeout: fallback cleanly
    }

    // Fallback: "[Nearest Port] Region (~X km)"
    return `${port.name} (~${Math.round(distanceKm)}km)`;
  }, []);

  // Request browser GPS position
  const requestLocation = useCallback(async () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setPermission('unsupported');
      setError('Geolocation is not supported by your browser.');
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = parseFloat(pos.coords.latitude.toFixed(5));
        const lon = parseFloat(pos.coords.longitude.toFixed(5));
        const accuracy = Math.round(pos.coords.accuracy);

        const { port } = findNearestPort(lat, lon);
        const resolvedName = await resolveLocationName(lat, lon);

        const newLocation: UserLocation = {
          lat,
          lon,
          name: resolvedName,
          isGPS: true,
          accuracy,
          nearestPort: port.name,
          lastUpdated: Date.now(),
        };

        setLocation(newLocation);
        setPermission('granted');
        setLoading(false);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(newLocation));
        } catch {
          // ignore localStorage failure
        }
      },
      (err) => {
        setLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setPermission('denied');
          setError('Location permission was denied. You can select a port manually.');
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setError('Location information is currently unavailable.');
        } else if (err.code === err.TIMEOUT) {
          setError('Location request timed out. Please try again or select a port.');
        } else {
          setError('Unable to acquire GPS location.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  }, [resolveLocationName]);

  // Request location automatically on mount (app open)
  useEffect(() => {
    // Check permission status if Permissions API is supported
    if (typeof navigator !== 'undefined' && 'permissions' in navigator) {
      navigator.permissions
        .query({ name: 'geolocation' })
        .then((status) => {
          setPermission(status.state);
          status.onchange = () => {
            setPermission(status.state);
            if (status.state === 'granted') {
              requestLocation();
            }
          };
        })
        .catch(() => {
          // Some browsers do not support querying geolocation permission
        });
    }

    // Trigger browser geolocation prompt on app launch
    requestLocation();
  }, [requestLocation]);

  // Manually select a known coastal port
  const selectPort = useCallback((port: CoastalPort) => {
    const updatedLocation: UserLocation = {
      lat: port.lat,
      lon: port.lon,
      name: port.name,
      isGPS: false,
      nearestPort: port.name,
      lastUpdated: Date.now(),
    };
    setLocation(updatedLocation);
    setError(null);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedLocation));
    } catch {
      // ignore
    }
  }, []);

  return (
    <LocationContext.Provider
      value={{
        location,
        loading,
        permission,
        error,
        requestLocation,
        selectPort,
        availablePorts: COASTAL_PORTS,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = (): LocationContextType => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};
