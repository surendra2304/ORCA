import asyncio
import json
import logging
from typing import Any, AsyncGenerator, Dict, Optional
from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel, Field
from sse_starlette.sse import EventSourceResponse, ServerSentEvent
import uvicorn

from app.config import settings
from app.core.runner import run_graph_streaming, utc_iso_now
from app.core.sessions import sessions
from app.graph.build_graph import run_graph

logger = logging.getLogger(__name__)

app = FastAPI(title="ORCA API", version=settings.VERSION)

# In-memory store of past runs keyed by session_id (capped at 100 entries)
past_runs: Dict[str, Dict[str, Any]] = {}


class QueryRequest(BaseModel):
    text: str = Field(..., description="User query text")
    language: str = Field("en", description="ISO 639-1 language code")
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
    By default, starts the graph as a BACKGROUND task and returns {"session_id": ...} immediately (<300ms).
    If sync=True (via query param ?sync=true or body flag), executes synchronously and returns full result JSON.
    """
    is_sync = sync or bool(req.sync)

    if is_sync:
        final_state, duration_ms = await run_graph(query=req.text, language=req.language)
        sid = final_state["session_id"]

        result = {
            "session_id": sid,
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
        past_runs[sid] = result

        # Record events in session manager for replay
        if not sessions.session_exists(sid):
            sessions.create_session(sid)
        for entry in final_state.get("trace", []):
            seq = sessions.next_seq(sid)
            raw_type = entry.get("event", "unknown")
            etype = "final_answer" if raw_type == "answer" else raw_type
            envelope = {
                "run_id": sid,
                "seq": seq,
                "ts": entry.get("ts") or utc_iso_now(),
                "type": etype,
                "payload": dict(entry.get("data") or {}),
            }
            if entry.get("agent") and "agent" not in envelope["payload"]:
                envelope["payload"]["agent"] = entry["agent"]
            sessions.store_event(sid, envelope)
        sessions.mark_finished(sid)

        return result

    # Asynchronous streaming execution (default)
    session_id = sessions.create_session()

    # Immediately emit run_started envelope
    run_started_envelope = {
        "run_id": session_id,
        "seq": sessions.next_seq(session_id),
        "ts": utc_iso_now(),
        "type": "run_started",
        "payload": {
            "query": req.text,
            "session_id": session_id,
        },
    }
    sessions.store_event(session_id, run_started_envelope)
    sessions.publish(session_id, run_started_envelope)

    # Launch background reasoning workflow
    asyncio.create_task(
        run_graph_streaming(
            session_id=session_id,
            query=req.text,
            language=req.language,
            sessions=sessions,
        )
    )

    return {"session_id": session_id}


@app.get("/stream/{session_id}")
async def stream_endpoint(session_id: str, request: Request):
    """
    Streams execution trace events live as Server-Sent Events (SSE).
    Closes immediately after run_complete.
    Supports full replay for late or completed subscribers.
    """
    if not sessions.session_exists(session_id):
        raise HTTPException(status_code=404, detail=f"Session not found: {session_id}")

    queue = sessions.register_subscriber(session_id)

    async def event_generator() -> AsyncGenerator[ServerSentEvent, None]:
        sent_seq = 0
        try:
            # 1. Yield replayed events already stored for this session
            stored_events = sessions.get_events(session_id)
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
                    if sessions.is_finished(session_id) and queue.empty():
                        for rem_envelope in sessions.get_events(session_id):
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
            sessions.unregister_subscriber(session_id, queue)

    return EventSourceResponse(
        event_generator(),
        ping=15,
        ping_message_factory=lambda: ServerSentEvent(comment="ping"),
    )


if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)

