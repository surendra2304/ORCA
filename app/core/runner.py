import asyncio
from datetime import datetime, timezone
import logging
import time
from typing import Any, Dict, Optional

from app.config import settings
from app.core.sessions import SessionManager, sessions as default_sessions
from app.graph.build_graph import build_graph
from app.graph.state import ORCAState
from app.graph.trace import TraceCollector

logger = logging.getLogger(__name__)


def utc_iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


async def run_graph_streaming(
    session_id: str,
    query: str,
    language: str = "en",
    sessions: Optional[SessionManager] = None,
    vessel_class: str = "small_fishing_boat",
    mode: Optional[str] = None,
) -> None:
    """
    Executes the ORCA reasoning graph as a streaming background task.
    Every trace event emitted by nodes and agents is translated into an SSE wire envelope,
    assigned a monotonic seq number, stored in the replay buffer, and published live.
    Guarantees that run_complete is emitted and the session is marked finished even on error.
    """
    sm = sessions or default_sessions
    start_time = time.perf_counter()
    effective_mode = mode if mode in ("mock", "real") else ("mock" if settings.MOCK_MODE else "real")

    async def on_trace_emit(entry: Dict[str, Any]) -> None:
        event_type = entry.get("event", "unknown")
        if event_type == "answer":
            event_type = "final_answer"

        # Deduplicate run_started if already emitted at session creation
        if event_type == "run_started":
            stored_events = sm.get_events(session_id)
            if any(e.get("type") == "run_started" for e in stored_events):
                return

        seq = sm.next_seq(session_id)
        payload = dict(entry.get("data") or {})
        agent = entry.get("agent")
        if agent and "agent" not in payload:
            payload["agent"] = agent

        envelope = {
            "run_id": session_id,
            "seq": seq,
            "ts": entry.get("ts") or utc_iso_now(),
            "type": event_type,
            "payload": payload,
        }
        sm.store_event(session_id, envelope)
        sm.publish(session_id, envelope)

    collector = TraceCollector(on_emit=on_trace_emit)
    graph = build_graph(collector)

    initial_state: ORCAState = {
        "query": query,
        "language": language or "en",
        "session_id": session_id,
        "vessel_class": vessel_class or "small_fishing_boat",
        "mode": effective_mode,
        "safety_relevant": True,
        "verdict": None,
        "entities": {"lat": None, "lon": None, "location_name": None, "date_hint": None},
        "needed_agents": [],
        "execution_plan": [],
        "agent_outputs": {},
        "final_answer": "",
        "trace": [],
    }

    try:
        final_state = await graph.ainvoke(initial_state)
        duration_ms = int((time.perf_counter() - start_time) * 1000)

        needed = final_state.get("needed_agents") or []
        outputs = final_state.get("agent_outputs") or {}
        agents_run = [a for a in needed if a in outputs]
        agents_failed = [a for a in needed if a not in outputs]

        await on_trace_emit({
            "event": "run_complete",
            "agent": None,
            "ts": utc_iso_now(),
            "data": {
                "duration_ms": duration_ms,
                "agents_run": agents_run,
                "agents_failed": agents_failed,
            },
        })
    except Exception as exc:
        logger.error("Fatal exception during graph execution for session %s: %s", session_id, exc, exc_info=True)
        duration_ms = int((time.perf_counter() - start_time) * 1000)

        await on_trace_emit({
            "event": "error",
            "agent": None,
            "ts": utc_iso_now(),
            "data": {
                "stage": "graph_execution",
                "message": str(exc),
                "recoverable": False,
            },
        })
        await on_trace_emit({
            "event": "run_complete",
            "agent": None,
            "ts": utc_iso_now(),
            "data": {
                "duration_ms": duration_ms,
                "agents_run": [],
                "agents_failed": [],
            },
        })
    finally:
        sm.mark_finished(session_id)
