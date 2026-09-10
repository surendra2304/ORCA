# ORCA — Oceanic Reasoning & Coastal Advisory System

**SIH 2026** - A comprehensive multi-agent AI system providing real-time marine safety advisories, weather forecasts, ocean state predictions, and fishing zone recommendations for coastal communities.

---

## Features

- **Multi-Agent Architecture**: 7 specialized agents (Weather, Ocean, PFZ, Satellite, Geospatial, Hazard, Route)
- **Real-Time Safety Verdicts**: Deterministic rule-based safety assessment with NO_GO/CAUTION/GO verdicts
- **Live Streaming**: Server-Sent Events (SSE) for real-time agent progress tracking
- **Interactive Maps**: Leaflet-based map with PFZ zones, ports, and route visualization
- **Voice Input**: Speech-to-text for hands-free operation
- **Multilingual Support**: English and Hindi language support
- **Conversation Memory**: Multi-turn context retention
- **Bounded Reflection**: Self-reflection mechanism for quality assurance

---

## Quick Start

### Backend (Python/FastAPI)

```bash
cd ORCA
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt

# Configure .env file with your API keys
cp .env.example .env

# Start the server
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Frontend (React/Vite)

```bash
cd remix-remix-orca-fishermen
npm install
npm run dev
```

The frontend will be available at http://localhost:5173

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/query` | POST | Submit a query (async or sync) |
| `/stream/{run_id}` | GET | SSE stream for live updates |
| `/run/{run_id}/trace` | GET | Get full trace for a run |
| `/sessions/{session_id}` | GET | Get session history |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  HomeScreen  │  │  Dashboard  │  │  Interactive Map    │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │ HTTP/SSE
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend (FastAPI)                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Multi-Agent Graph Engine                 │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │   │
│  │  │ Weather │ │  Ocean  │ │   PFZ   │ │ Hazard  │   │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘   │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐               │   │
│  │  │Satellite│ │Geospatial│ │  Route  │               │   │
│  │  └─────────┘ └─────────┘ └─────────┘               │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Planner   │  │  Reflection │  │      Verdict        │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `GEMINI_API_KEY` | Google Gemini API Key | (required) |
| `GROQ_API_KEY` | Groq API Key (fallback) | (required) |
| `MOCK_MODE` | Use mock data (true/false) | true |
| `MODEL_GEMINI` | Gemini model name | gemini-2.0-flash |
| `MODEL_GROQ` | Groq model name | openai/gpt-oss-20b |

---

## Dashboard Data Sources

| Name | Access | Key? | Used-by Endpoint | Provenance String |
|------|--------|------|------------------|-------------------|
| Open-Meteo Marine & Forecast | Public REST | No | `/api/briefing`, `/api/timeseries`, `/api/zones`, `/api/analysis`, `/api/riskgrid` | `open-meteo:marine`, `open-meteo:forecast` |
| INCOIS ERDDAP | Griddap REST | Optional | `/api/timeseries?variable=chlorophyll`, `/api/briefing` | `incois:erddap:<dataset>` |
| India EEZ GeoJSON | Bundled File (`data/geo/india_eez_simplified.geojson`) | No | `/api/geo/eez`, `/api/briefing`, `/api/zones` | `india_eez_simplified.geojson` |
| Restricted Zones GeoJSON | Bundled File (`data/geo/restricted_zones.geojson`) | No | `/api/geo/restricted`, `/api/briefing`, `/api/zones` | `restricted_zones.geojson` |
| Major Ports GeoJSON | Bundled File (`data/geo/ports.geojson`) | No | `/api/geo/ports`, `/api/briefing`, `/api/zones` | `ports.geojson` |
| IMD & INCOIS Advisories | Bundled Directory (`data/hazard_advisories`) | No | `/api/briefing`, `/api/zones` | `hazard:advisory-file` |
| Historical Cyclones & Tsunamis | Bundled File (`data/disasters/cyclones.json`) | No | `/api/disasters` | Official IMD RSMC Reports |

---

## Dashboard REST API Reference

Zero-LLM, deterministic data layer powering the ORCA Analyst Dashboard.

| Endpoint | Method | Parameters | Description |
|----------|--------|------------|-------------|
| `/api/geo/{layer}` | GET | `layer` in `[eez, restricted, ports]` | Returns GeoJSON feature collections or port definitions. Reject with 400 on traversal. |
| `/api/briefing` | GET | `lat`, `lon`, `vessel_class`, `mode` | Full ocean, weather, hazard, geofence, deterministic verdict, and zone index. |
| `/api/zones` | GET | `lat`, `lon`, `max`, `mode` | Candidate fishing zones ranked nearest-first with transparent zone indices. |
| `/api/timeseries` | GET | `lat`, `lon`, `variable` in `[sst, wave_height, wind_speed, chlorophyll]`, `days`, `mode` | Historical daily mean time-series points. Honest empty when unconfigured. |
| `/api/analysis` | GET | `lat`, `lon`, `days`, `mode` | Statistical analysis (mean, min, max, stddev, slope, front stability). |
| `/api/riskgrid` | GET | `lat`, `lon`, `rings` (1..5), `radius_km`, `mode` | Concentric polar risk assessment grid ($N = \text{rings} \times 8 + 1$ points). |
| `/api/disasters` | GET | `id` (optional) | Curated history of 5 major North Indian Ocean cyclonic and tsunami events. |

---

## Transparent Zone Index (zi-1.0)

Deterministic, zero-LLM operational index for comparing relative marine zone favorability. **Advisory only — NOT a safety verdict** (vessel safety verdicts originate exclusively from the rule engine).

### Formula
$$\text{Score} = \max\left(0, \min\left(100, 100 - \text{Cost}_{\text{wave}} - \text{Cost}_{\text{wind}} - \text{Cost}_{\text{alert}}\right)\right)$$

- **Wave Cost**: $\min\left(40.0, \text{wave\_height\_m} \times 16.0\right)$
- **Wind Cost**: $\min\left(30.0, \text{wind\_knots} \times 1.5\right)$
- **Alert Cost**:
  - `critical` / `high` / `severe`: $30.0$
  - `moderate`: $15.0$
  - `low` / `none`: $0.0$
- **Restricted Zone Override**: If coordinates lie within a restricted maritime zone, score is immediately clamped to $0.0$ (`band = avoid`, `restricted_override = true`).
- **Missing Data Policy**: If wave, wind, or alert observations are missing (`null`), their cost is $0.0$ but the component is explicitly flagged with `"unavailable": true` to maintain transparency. Missing values are never silently assumed calm.

### Advisory Bands
- **`favourable`**: $[70.0, 100.0]$
- **`caution`**: $[40.0, 70.0)$
- **`avoid`**: $[0.0, 40.0)$

---

## Testing

```bash
# Run all offline tests
pytest -q

# Run evaluation suite
python scripts/run_eval.py
```

---

## License

MIT License - See LICENSE file for details
