from typing import Any, Dict
from fastapi import FastAPI
from pydantic import BaseModel, Field
import uvicorn

from app.config import settings
from app.graph.build_graph import run_graph

app = FastAPI(title="ORCA API", version=settings.VERSION)

# In-memory store of past runs keyed by session_id (capped at 100 entries)
past_runs: Dict[str, Dict[str, Any]] = {}


class QueryRequest(BaseModel):
    text: str = Field(..., description="User query text")
    language: str = Field("en", description="ISO 639-1 language code")


@app.get("/health")
async def health_check():
    """
    Health check endpoint returning application status and LLM configuration flags.
    Never exposes raw API keys.
    """
    return {
        "app": settings.APP_NAME,
        "version": settings.VERSION,
        "mock_mode": settings.MOCK_MODE,
        "gemini_configured": settings.gemini_configured,
        "groq_configured": settings.groq_configured,
    }


@app.post("/query")
async def query_endpoint(req: QueryRequest):
    """
    Synchronous reasoning query endpoint.
    Executes the LangGraph reasoning workflow (planner -> executor -> aggregator)
    and returns full result JSON.
    """
    final_state, duration_ms = await run_graph(query=req.text, language=req.language)

    result = {
        "session_id": final_state["session_id"],
        "plan": {
            "needed_agents": final_state.get("needed_agents", []),
            "execution_plan": final_state.get("execution_plan", []),
        },
        "agent_outputs": final_state.get("agent_outputs", {}),
        "final_answer": final_state.get("final_answer", ""),
        "trace": final_state.get("trace", []),
        "duration_ms": duration_ms,
    }

    # Maintain in-memory cap of 100 entries
    if len(past_runs) >= 100:
        oldest_key = next(iter(past_runs))
        del past_runs[oldest_key]
    past_runs[final_state["session_id"]] = result

    return result


if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
