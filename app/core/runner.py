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


from app.core.memory import memory


async def run_graph_streaming(
    session_id: str,
    query: str,
    language: str = "en",
    sessions: Optional[SessionManager] = None,
    vessel_class: str = "small_fishing_boat",
    mode: Optional[str] = None,
    run_id: Optional[str] = None,
) -> None:
    """
    Executes the ORCA reasoning graph as a streaming background task.
    Every trace event emitted by nodes and agents is translated into an SSE wire envelope,
    assigned a monotonic seq number, stored in the replay buffer, and published live.
    Guarantees that run_complete is emitted and the session/run is marked finished even on error.
    """
    sm = sessions or default_sessions
    rid = run_id or session_id
    start_time = time.perf_counter()
    effective_mode = mode if mode in ("mock", "real") else ("mock" if settings.MOCK_MODE else "real")

    async def on_trace_emit(entry: Dict[str, Any]) -> None:
        event_type = entry.get("event", "unknown")
        if event_type == "answer":
            event_type = "final_answer"

        # Deduplicate run_started if already emitted at session/run creation
        if event_type == "run_started":
            stored_events = sm.get_events(rid)
            if any(e.get("type") == "run_started" for e in stored_events):
                return

        seq = sm.next_seq(rid)
        payload = dict(entry.get("data") or {})
        agent = entry.get("agent")
        if agent and "agent" not in payload:
            payload["agent"] = agent

        envelope = {
            "run_id": rid,
            "seq": seq,
            "ts": entry.get("ts") or utc_iso_now(),
            "type": event_type,
            "payload": payload,
        }
        sm.store_event(rid, envelope)
        sm.publish(rid, envelope)

    collector = TraceCollector(on_emit=on_trace_emit)
    graph = build_graph(collector)

    history = memory.get_turns(session_id)

    initial_state: ORCAState = {
        "query": query,
        "language": language or "en",
        "session_id": session_id,
        "run_id": rid,
        "vessel_class": vessel_class or "small_fishing_boat",
        "mode": effective_mode,
        "safety_relevant": True,
        "verdict": None,
        "entities": {"lat": None, "lon": None, "location_name": None, "date_hint": None},
        "history": history,
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

        # Persist turn to conversation memory
        v_dict = final_state.get("verdict")
        v_str = v_dict.get("verdict") if isinstance(v_dict, dict) else None
        memory.append_turn(
            session_id=session_id,
            turn={
                "query": query,
                "language": final_state.get("language", language),
                "entities": final_state.get("entities", {}),
                "safety_relevant": final_state.get("safety_relevant", True),
                "verdict_summary": v_str,
                "final_answer": final_state.get("final_answer", ""),
                "run_id": rid,
                "ts": utc_iso_now(),
            },
        )

    except Exception as exc:
        logger.error("Fatal exception during graph execution for session %s run %s: %s", session_id, rid, exc, exc_info=True)
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
        sm.mark_finished(rid)
