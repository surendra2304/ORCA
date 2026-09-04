# ORCA Phase 0 Orchestrator

This is the orchestration skeleton for ORCA: a LangGraph agent graph exposed over FastAPI with SSE streaming.

## Setup
1. Copy `.env.example` to `.env` and fill in your API keys (Gemini and Groq).
2. Install dependencies:
   ```bash
   uv sync
   ```

## Running the Server
```bash
uv run uvicorn app.main:app --reload
```

## Running the Test Client
In a separate terminal, run:
```bash
uv run python scripts/test_client.py
```
Or with a custom query:
```bash
uv run python scripts/test_client.py "What is the weather in Mumbai?"
```
