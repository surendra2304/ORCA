# ORCA — Oceanic Reasoning & Collaborative Agents

ORCA is an agentic AI marine decision-support backend tailored for Indian Ocean maritime users, fishermen, and coastal planners. It harmonizes multi-source oceanographic, meteorological, and geospatial observations to deliver actionable, reliable safety recommendations.

## Phase Status

| Phase | Description | Status |
|---|---|---|
| **Phase 0** | **Foundation, FastAPI Health, & Provider-Agnostic LLM Layer** | **Completed** |
| **Phase 1** | **Reasoning Core: LangGraph StateGraph, 6 Mock Agents, & POST /query** | **Completed** |
| **Phase 2** | **Real-time Server-Sent Events (SSE) Streaming & Trace Events** | **Completed** |
| **Phase 3** | **The Safety Brain: Deterministic YAML Rule Engine & Vessel Verdicts** | **Completed** |
| Phase 4 | Real Data Ingestion Integrations (INCOIS, IMD, MOSDAC) | Planned |
| Phase 5 | Multilingual Localization & Translation Layer | Planned |
| Phase 6 | Geospatial Visualizations & Map Data Layer | Planned |
| Phase 7 | Persistent Knowledge Store & History | Planned |

---

## Setup & Quickstart

### 1. Prerequisites
- Python 3.11+
- [uv](https://docs.astral.sh/uv/) package manager

### 2. Install Dependencies
```bash
uv sync
```

### 3. Configure Environment
Copy the example environment file:
```bash
cp .env.example .env
```
Open `.env` and configure your API keys:
```env
GEMINI_API_KEY=your_gemini_api_key_here
GROQ_API_KEY=your_groq_api_key_here
MOCK_MODE=true
```

### 4. Run the FastAPI Server
Start the local server with hot reloading:
```bash
uv run uvicorn app.main:app --reload
```
Check health status in your browser or terminal:
```bash
curl http://127.0.0.1:8000/health
```

### 5. Run the Live SSE Streaming Query Client (Phase 2)
Run the real-time SSE streaming CLI client:
```bash
# Default query ("Is it safe to fish near Visakhapatnam tomorrow?")
uv run python scripts/test_client.py

# Custom query
uv run python scripts/test_client.py "Check ocean currents and PFZ zones near Kakinada"
```

To stream directly with cURL or another HTTP client:
```bash
# 1. Start background reasoning task
curl -X POST http://127.0.0.1:8000/query \
     -H "Content-Type: application/json" \
     -d '{"text": "Is it safe to fish near Visakhapatnam tomorrow?"}'

# 2. Connect to live SSE stream (or replay past completed runs)
curl.exe -N http://127.0.0.1:8000/stream/<session_id>
```

For synchronous execution (Phase 1 fallback):
```bash
curl -X POST "http://127.0.0.1:8000/query?sync=true" \
     -H "Content-Type: application/json" \
     -d '{"text": "Is it safe to fish near Visakhapatnam tomorrow?"}'
```

### 6. Run Unit Tests
Verify the planner validator rules and geospatial haversine math:
```bash
uv run pytest -q
```
