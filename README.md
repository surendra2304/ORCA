# ORCA — Oceanic Reasoning & Collaborative Agents

ORCA is an agentic AI marine decision-support backend tailored for Indian Ocean maritime users, fishermen, and coastal planners. It harmonizes multi-source oceanographic, meteorological, and geospatial observations to deliver actionable, reliable safety recommendations.

## Phase Status

| Phase | Description | Status |
|---|---|---|
| **Phase 0** | **Foundation, FastAPI Health, & Provider-Agnostic LLM Layer** | **Completed** |
| **Phase 1** | **Reasoning Core: LangGraph StateGraph, 6 Mock Agents, & POST /query** | **Completed** |
| Phase 2 | Real-time Server-Sent Events (SSE) Streaming & Trace Events | Planned |
| Phase 3 | Real Data Ingestion Integrations (INCOIS, IMD, MOSDAC) | Planned |
| Phase 4 | Multilingual Localization & Translation Layer | Planned |
| Phase 5 | Geospatial Visualizations & Map Data Layer | Planned |
| Phase 6 | Persistent Knowledge Store & History | Planned |
| Phase 7 | Production Hardening, Observability, & Evaluation | Planned |

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

### 5. Run the Reasoning Query Client (Phase 1)
Run the synchronous multi-agent query CLI client:
```bash
# Default query ("Is it safe to fish near Visakhapatnam tomorrow?")
uv run python scripts/test_client.py

# Custom query
uv run python scripts/test_client.py "Check ocean currents and PFZ zones near Kakinada"
```

### 6. Run Unit Tests
Verify the planner validator rules and geospatial haversine math:
```bash
uv run pytest -q
```
