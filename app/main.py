import asyncio
import json
import logging
from typing import Any, AsyncGenerator, Dict, Optional
import uuid
from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel, Field
from sse_starlette.sse import EventSourceResponse, ServerSentEvent
import uvicorn

from app.config import settings
from app.core.memory import memory
from app.core.rules import VESSEL_CLASSES
from app.core.runner import run_graph_streaming, utc_iso_now
from app.core.sessions import sessions
from app.graph.build_graph import run_graph

logger = logging.getLogger(__name__)

app = FastAPI(title="ORCA API", version=settings.VERSION)

# In-memory store of past runs keyed by run_id and session_id (capped at 100 entries)
past_runs: Dict[str, Dict[str, Any]] = {}


class QueryRequest(BaseModel):
    text: str = Field(..., description="User query text")
    session_id: Optional[str] = Field(None, description="Optional session ID to continue an ongoing conversation")
    language: Optional[str] = Field("en", description="ISO 639-1 language code")
    vessel_class: Optional[str] = Field("small_fishing_boat", description="Vessel class for safety rules")
    mode: Optional[str] = Field(None, description="Execution mode: mock | real")
    sync: Optional[bool] = Field(None, description="Optional sync flag in body")


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
async def query_endpoint(req: QueryRequest, sync: bool = False):
    """
    Reasoning query endpoint.
    Contract v1.2:
    - run_id is unique per run.
    - session_id connects multiple conversational turns (omitted = new session; provided = continue conversation).
    - In async mode (default), starts graph as BACKGROUND task and returns {"session_id", "run_id", "mode", "language", "verdict": None}.
    - In sync mode (?sync=true), executes synchronously and returns full result JSON with run_id and detected language.
    """
    vessel_class = req.vessel_class or "small_fishing_boat"
    if vessel_class not in VESSEL_CLASSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid vessel_class '{vessel_class}'. Valid options: {VESSEL_CLASSES}",
        )

    effective_mode = req.mode if req.mode is not None else ("mock" if settings.MOCK_MODE else "real")
    if effective_mode not in ("mock", "real"):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid mode '{effective_mode}'. Valid options: ['mock', 'real']",
        )

    is_sync = sync or bool(req.sync)
    session_id = req.session_id or str(uuid.uuid4())
    run_id = str(uuid.uuid4())

    # Register run and update latest mapping
    sessions.create_run(run_id=run_id, session_id=session_id)

    if is_sync:
        final_state, duration_ms = await run_graph(
            query=req.text,
            language=req.language or "en",
            session_id=session_id,
            run_id=run_id,
            vessel_class=vessel_class,
            mode=effective_mode,
        )

        detected_lang = final_state.get("language", req.language or "en")

        result = {
            "session_id": session_id,
            "run_id": run_id,
            "mode": effective_mode,
            "language": detected_lang,
            "verdict": final_state.get("verdict"),
            "plan": {
                "needed_agents": final_state.get("needed_agents", []),
                "execution_plan": final_state.get("execution_plan", []),
                "safety_relevant": final_state.get("safety_relevant", True),
                "language": detected_lang,
                "entity_source": final_state.get("entity_source", "query"),
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
        past_runs[run_id] = result
        past_runs[session_id] = result

        # Store envelopes in session manager with run_id
        for entry in final_state.get("trace", []):
            seq = sessions.next_seq(run_id)
            raw_type = entry.get("event", "unknown")
            etype = "final_answer" if raw_type == "answer" else raw_type
            envelope = {
                "run_id": run_id,
                "seq": seq,
                "ts": entry.get("ts") or utc_iso_now(),
                "type": etype,
                "payload": dict(entry.get("data") or {}),
            }
            if entry.get("agent") and "agent" not in envelope["payload"]:
                envelope["payload"]["agent"] = entry["agent"]
            sessions.store_event(run_id, envelope)
        sessions.mark_finished(run_id)

        return result

    # Asynchronous streaming execution (default)
    # Immediately emit run_started envelope for run_id
    run_started_envelope = {
        "run_id": run_id,
        "seq": sessions.next_seq(run_id),
        "ts": utc_iso_now(),
        "type": "run_started",
        "payload": {
            "query": req.text,
            "session_id": session_id,
            "run_id": run_id,
            "vessel_class": vessel_class,
            "mode": effective_mode,
        },
    }
    sessions.store_event(run_id, run_started_envelope)
    sessions.publish(run_id, run_started_envelope)

    # Launch background reasoning workflow
    asyncio.create_task(
        run_graph_streaming(
            session_id=session_id,
            run_id=run_id,
            query=req.text,
            language=req.language or "en",
            sessions=sessions,
            vessel_class=vessel_class,
            mode=effective_mode,
        )
    )

    return {
        "session_id": session_id,
        "run_id": run_id,
        "mode": effective_mode,
        "language": req.language or "en",
        "verdict": None,
    }


@app.get("/stream/{target_id}")
async def stream_endpoint(target_id: str, request: Request):
    """
    Streams execution trace events live as Server-Sent Events (SSE).
    target_id can be either a specific run_id or a session_id:
    - If run_id: streams that exact run.
    - If session_id: streams the latest run for that session.
    Closes immediately after run_complete.
    Supports full replay for late subscribers or completed runs.
    """
    if not sessions.session_exists(target_id):
        raise HTTPException(status_code=404, detail=f"Session/Run not found: {target_id}")

    target_run_id = sessions.resolve_run_id(target_id)
    queue = sessions.register_subscriber(target_run_id)

    async def event_generator() -> AsyncGenerator[ServerSentEvent, None]:
        sent_seq = 0
        try:
            # 1. Yield replayed events already stored for this run
            stored_events = sessions.get_events(target_run_id)
            for envelope in stored_events:
                if envelope["seq"] > sent_seq:
                    sent_seq = envelope["seq"]
                    yield ServerSentEvent(
                        event=envelope["type"],
                        data=json.dumps(envelope),
                    )
                    if envelope["type"] == "run_complete":
                        return

            # 2. Yield live events
            while True:
                if await request.is_disconnected():
                    break

                try:
                    envelope = await asyncio.wait_for(queue.get(), timeout=1.0)
                except asyncio.TimeoutError:
                    if sessions.is_finished(target_run_id) and queue.empty():
                        for rem_envelope in sessions.get_events(target_run_id):
                            if rem_envelope["seq"] > sent_seq:
                                sent_seq = rem_envelope["seq"]
                                yield ServerSentEvent(
                                    event=rem_envelope["type"],
                                    data=json.dumps(rem_envelope),
                                )
                        break
                    continue

                if envelope["seq"] <= sent_seq:
                    continue

                sent_seq = envelope["seq"]
                yield ServerSentEvent(
                    event=envelope["type"],
                    data=json.dumps(envelope),
                )

                if envelope["type"] == "run_complete":
                    break
        finally:
            sessions.unregister_subscriber(target_run_id, queue)

    return EventSourceResponse(
        event_generator(),
        ping=15,
        ping_message_factory=lambda: ServerSentEvent(comment="ping"),
    )


@app.get("/run/{run_id}/trace")
async def get_run_trace(run_id: str):
    """
    Returns full trace envelope history for a specific run from memory or disk.
    404 if run is unknown.
    """
    events = sessions.get_events(run_id)
    if not events:
        raise HTTPException(status_code=404, detail=f"Run not found: {run_id}")

    session_id = events[0].get("payload", {}).get("session_id", run_id) if events else run_id
    return {
        "run_id": run_id,
        "session_id": session_id,
        "event_count": len(events),
        "events": events,
    }


@app.get("/sessions/{session_id}")
async def get_session_details(session_id: str):
    """
    Returns the multi-turn session record (turns summary) from memory or disk.
    404 if session is unknown.
    """
    session_data = memory.get_session_dict(session_id)
    if not session_data:
        raise HTTPException(status_code=404, detail=f"Session not found: {session_id}")
    return session_data


if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
