import time
from typing import Any, Dict, Optional, Tuple
import uuid

from langgraph.graph import END, START, StateGraph

from app.config import settings
from app.graph.aggregator import aggregator_node
from app.graph.executor import executor_node
from app.graph.planner import planner_node
from app.graph.resolver import resolver_node
from app.graph.state import ORCAState
from app.graph.trace import TraceCollector
from app.graph.verdict import verdict_node


def build_graph(collector: TraceCollector):
    """
    Constructs and compiles the ORCA reasoning StateGraph:
    START -> planner -> resolver -> executor -> verdict -> aggregator -> END.
    Node functions close over the per-run TraceCollector instance.
    """
    builder = StateGraph(ORCAState)

    async def _planner_node(state: ORCAState) -> Dict[str, Any]:
        return await planner_node(state, collector)

    async def _resolver_node(state: ORCAState) -> Dict[str, Any]:
        return await resolver_node(state, collector)

    async def _executor_node(state: ORCAState) -> Dict[str, Any]:
        return await executor_node(state, collector)

    async def _verdict_node(state: ORCAState) -> Dict[str, Any]:
        return await verdict_node(state, collector)

    async def _aggregator_node(state: ORCAState) -> Dict[str, Any]:
        return await aggregator_node(state, collector)

    builder.add_node("planner", _planner_node)
    builder.add_node("resolver", _resolver_node)
    builder.add_node("executor", _executor_node)
    builder.add_node("verdict", _verdict_node)
    builder.add_node("aggregator", _aggregator_node)

    builder.add_edge(START, "planner")
    builder.add_edge("planner", "resolver")
    builder.add_edge("resolver", "executor")
    builder.add_edge("executor", "verdict")
    builder.add_edge("verdict", "aggregator")
    builder.add_edge("aggregator", END)

    return builder.compile()


from datetime import datetime, timezone
from app.core.memory import memory


async def run_graph(
    query: str,
    language: str = "en",
    session_id: Optional[str] = None,
    run_id: Optional[str] = None,
    vessel_class: str = "small_fishing_boat",
    mode: Optional[str] = None,
) -> Tuple[Dict[str, Any], int]:
    """
    Helper function that initializes state, invokes the LangGraph workflow
    with a live TraceCollector, emits run_complete, snapshots the collector
    into final_state["trace"], and persists the completed turn into ConversationMemory.
    """
    start_time = time.perf_counter()
    sid = session_id or str(uuid.uuid4())
    rid = run_id or str(uuid.uuid4())
    effective_mode = mode if mode in ("mock", "real") else ("mock" if settings.MOCK_MODE else "real")
    collector = TraceCollector()

    history = memory.get_turns(sid)

    initial_state: ORCAState = {
        "query": query,
        "language": language or "en",
        "session_id": sid,
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

    graph = build_graph(collector)
    final_state = await graph.ainvoke(initial_state)

    duration_ms = int((time.perf_counter() - start_time) * 1000)

    needed = final_state.get("needed_agents") or []
    outputs = final_state.get("agent_outputs") or {}
    agents_run = [a for a in needed if a in outputs]
    agents_failed = [a for a in needed if a not in outputs]

    # Emit run_complete via the collector
    await collector.emit(
        "run_complete",
        None,
        {
            "duration_ms": duration_ms,
            "agents_run": agents_run,
            "agents_failed": agents_failed,
        },
    )

    # Attach the full chronological trace snapshot to final_state
    final_state["trace"] = collector.snapshot()
    final_state["run_id"] = rid

    # Persist turn to conversation memory
    v_dict = final_state.get("verdict")
    v_str = v_dict.get("verdict") if isinstance(v_dict, dict) else None
    memory.append_turn(
        session_id=sid,
        turn={
            "query": query,
            "language": final_state.get("language", language),
            "entities": final_state.get("entities", {}),
            "safety_relevant": final_state.get("safety_relevant", True),
            "verdict_summary": v_str,
            "final_answer": final_state.get("final_answer", ""),
            "run_id": rid,
            "ts": datetime.now(timezone.utc).isoformat(),
        },
    )

    return final_state, duration_ms
