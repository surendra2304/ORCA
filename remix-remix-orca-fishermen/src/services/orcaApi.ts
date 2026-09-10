/**
 * ORCA Marine Intelligence API Client
 * Connects the Fishermen Dashboard to the Python FastAPI multi-agent backend.
 */

const ORCA_BASE_URL = import.meta.env.VITE_ORCA_API_URL || 'http://localhost:8000';

export interface QueryRequest {
  text: string;
  session_id?: string;
  language?: string;
  vessel_class?: string;
  mode?: 'mock' | 'real';
  lat?: number;
  lon?: number;
  location_name?: string;
}

export interface QueryResponse {
  session_id: string;
  run_id: string;
  mode: string;
  language: string;
  verdict: VerdictData | null;
}

export interface SyncQueryResponse extends QueryResponse {
  plan: {
    needed_agents: string[];
    execution_plan: string[][];
    safety_relevant: boolean;
    language: string;
  };
  agent_outputs: AgentOutputs;
  final_answer: string;
  trace: TraceEvent[];
  duration_ms: number;
}

export interface VerdictData {
  go: boolean;
  color: 'green' | 'yellow' | 'red' | 'gray';
  label: 'GO' | 'CAUTION' | 'NO_GO' | 'UNKNOWN';
  summary: string;
  triggered_rules: string[];
  vessel_class: string;
}

export interface AgentOutputs {
  weather?: WeatherOutput;
  ocean?: OceanOutput;
  pfz?: PFZOutput;
  satellite?: SatelliteOutput;
  hazard?: HazardOutput;
  geospatial?: GeospatialOutput;
  route?: RouteOutput;
}

export interface WeatherOutput {
  source: string;
  wind_knots: number;
  gusts_knots: number;
  rain_mm: number;
  lightning_risk: string;
  forecast_hours: Array<{ hour: number; wind_knots: number; rain_mm: number }>;
  fetched_at: string;
}

export interface OceanOutput {
  source: string;
  wave_height_m: number;
  wave_period_s: number;
  swell_height_m: number;
  sst_c: number;
  current_knots: number;
  tide_state: string;
  chlorophyll_mg_m3: number;
  fetched_at: string;
}

export interface PFZOutput {
  source: string;
  advisory_id: string;
  advisory_date: string | null;
  zones: PFZZoneData[];
  note: string | null;
}

export interface PFZZoneData {
  polygon: number[][];
  depth_m: number;
  center: number[];
  confidence: number;
}

export interface SatelliteOutput {
  source: string;
  sst_c: number;
  chlorophyll_mg_m3: number;
  sst_anomaly_c: number;
}

export interface HazardOutput {
  source: string;
  alerts: HazardAlert[];
  note: string | null;
}

export interface HazardAlert {
  type: string;
  severity: string;
  description: string;
  area?: string;
  center?: number[];
  radius_km?: number;
  distance_km?: number;
  affected?: boolean;
}

export interface GeospatialOutput {
  source: string;
  user: { lat: number; lon: number };
  pfz: { nearest: { distance_km: number; bearing_deg: number; name: string } | null };
  ports: { nearest: { name: string; distance_km: number } | null };
  eez: { inside: boolean; nearest_boundary_km: number | null };
  restricted: { inside: boolean; zone: string | null; nearest_km: number | null; category: string | null };
  note: string | null;
}

export interface RouteOutput {
  source: string;
  origin: { name: string; lat: number; lon: number };
  destination: { name: string; lat: number; lon: number };
  routes: Array<{
    waypoints: number[][];
    distance_km: number;
    mean_wave_height_m: number | null;
    max_wave_height_m: number | null;
    mean_wind_knots: number | null;
    restricted_zones_crossed: string[];
    eez_flags: number;
    note: string;
  }>;
  departure_window: { start_hour: number; end_hour: number; basis: string };
  note: string | null;
}

export interface TraceEvent {
  event: string;
  ts: string;
  agent?: string;
  data?: Record<string, unknown>;
}

export interface SSEEnvelope {
  run_id: string;
  seq: number;
  ts: string;
  type: string;
  agent?: string;
  payload: Record<string, unknown>;
}

// ─── Core API Calls ─────────────────────────────────────────────────────────

/**
 * Send a query to ORCA and get a run_id back immediately (async mode).
 */
export async function sendQuery(req: QueryRequest): Promise<QueryResponse> {
  const res = await fetch(`${ORCA_BASE_URL}/query`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Connection': 'keep-alive',
    },
    body: JSON.stringify({
      text: req.text,
      session_id: req.session_id,
      language: req.language || 'en',
      vessel_class: req.vessel_class || 'small_fishing_boat',
      mode: req.mode || 'real',
      lat: req.lat,
      lon: req.lon,
      location_name: req.location_name,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`ORCA query failed (${res.status}): ${err}`);
  }
  return res.json();
}

/**
 * Send a query and wait for the full result synchronously.
 * Best for dashboard pre-loading (non-chat use cases).
 */
export async function sendQuerySync(req: QueryRequest): Promise<SyncQueryResponse> {
  const res = await fetch(`${ORCA_BASE_URL}/query?sync=true`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Connection': 'keep-alive',
    },
    body: JSON.stringify({
      text: req.text,
      session_id: req.session_id,
      language: req.language || 'en',
      vessel_class: req.vessel_class || 'small_fishing_boat',
      mode: req.mode || 'real',
      lat: req.lat,
      lon: req.lon,
      location_name: req.location_name,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`ORCA sync query failed (${res.status}): ${err}`);
  }
  return res.json();
}

/**
 * Subscribe to live SSE events for a run.
 * Calls onEvent for each envelope received.
 * Calls onDone when run_complete is received.
 * Calls onError on connection error.
 * Returns a cleanup function to close the stream.
 */
export function streamRun(
  runId: string,
  onEvent: (envelope: SSEEnvelope) => void,
  onDone: () => void,
  onError: (err: Event) => void,
): () => void {
  let isDone = false;
  const es = new EventSource(`${ORCA_BASE_URL}/stream/${runId}`);

  const handleEnvelope = (envelope: SSEEnvelope) => {
    onEvent(envelope);
    if (envelope.type === 'run_complete') {
      isDone = true;
      es.close();
      onDone();
    }
  };

  es.onmessage = (e: MessageEvent) => {
    try {
      const envelope: SSEEnvelope = JSON.parse(e.data);
      handleEnvelope(envelope);
    } catch {
      // ignore parse errors
    }
  };

  // Named event types from ORCA - MUST match all event types emitted by backend
  const eventTypes = [
    'run_started', 'plan_created', 'agent_started', 'tool_called', 'agent_result',
    'reflection', 'verdict', 'final_answer', 'run_complete', 'error',
    'planner', 'resolver', 'agent', 'aggregator',
  ];
  for (const type of eventTypes) {
    es.addEventListener(type, (e: Event) => {
      const msgEvent = e as MessageEvent;
      try {
        const envelope: SSEEnvelope = JSON.parse(msgEvent.data);
        handleEnvelope(envelope);
      } catch {
        // ignore
      }
    });
  }

  es.onerror = (err) => {
    if (isDone) return;
    onError(err);
    es.close();
  };

  return () => {
    isDone = true;
    es.close();
  };
}

/**
 * Health check — returns true if ORCA API is reachable.
 */
export async function checkHealth(): Promise<{
  ok: boolean;
  mock_mode: boolean;
  gemini_configured: boolean;
  groq_configured: boolean;
}> {
  try {
    const res = await fetch(`${ORCA_BASE_URL}/health`, { 
      signal: AbortSignal.timeout(3000),
      headers: { 'Connection': 'keep-alive' },
    });
    if (!res.ok) return { ok: false, mock_mode: true, gemini_configured: false, groq_configured: false };
    const data = await res.json();
    return { ok: true, ...data };
  } catch {
    return { ok: false, mock_mode: true, gemini_configured: false, groq_configured: false };
  }
}
