# ORCA — Oceanic Reasoning & Collaborative Agents

ORCA is an agentic AI marine decision-support backend tailored for Indian Ocean maritime users, fishermen, and coastal planners. It harmonizes multi-source oceanographic, meteorological, and geospatial observations to deliver actionable, reliable safety recommendations.

## Phase Status

| Phase | Description | Status |
|---|---|---|
| **Phase 0** | **Foundation, FastAPI Health, & Provider-Agnostic LLM Layer** | **Completed** |
| Phase 1 | Marine & Weather Ingestion Integrations (INCOIS, IMD, MOSDAC) | Planned |
| Phase 2 | LangGraph Orchestration & Dynamic Planner Graph | Planned |
| Phase 3 | Multi-Agent Execution (PFZ, Hazard, Satellite, Ocean, Weather) | Planned |
| Phase 4 | Multilingual Localization & Translation Layer | Planned |
| Phase 5 | Real-time SSE Streaming & WebSocket Events | Planned |
| Phase 6 | Geospatial Visualizations & Map Data Layer | Planned |
| Phase 7 | Persistent Knowledge Store & History | Planned |
| Phase 8 | Production Hardening, Observability, & Evaluation | Planned |

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

### 5. Run the Smoke Test
Verify the LLM layer using the smoke CLI script:
```bash
# Default prompt
uv run python scripts/smoke_llm.py

# Custom prompt
uv run python scripts/smoke_llm.py "Provide a 1-sentence maritime advisory for the Bay of Bengal"

# Structured JSON test
uv run python scripts/smoke_llm.py --json
```
