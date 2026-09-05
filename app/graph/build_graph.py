import time
from typing import Any, Dict, Optional, Tuple
import uuid

from langgraph.graph import END, START, StateGraph

from app.graph.aggregator import aggregator_node
from app.graph.executor import executor_node
from app.graph.planner import planner_node
from app.graph.state import ORCAState, create_event


def build_graph():
    """
    Constructs and compiles the ORCA reasoning StateGraph:
    START -> planner -> executor -> aggregator -> END.
    """
    builder = StateGraph(ORCAState)

    builder.add_node("planner", planner_node)
    builder.add_node("executor", executor_node)
    builder.add_node("aggregator", aggregator_node)

    builder.add_edge(START, "planner")
    builder.add_edge("planner", "executor")
    builder.add_edge("executor", "aggregator")
    builder.add_edge("aggregator", END)

    return builder.compile()


_orca_graph = None


def get_compiled_graph():
    """Returns a singleton instance of the compiled graph."""
    global _orca_graph
    if _orca_graph is None:
        _orca_graph = build_graph()
    return _orca_graph


async def run_graph(
    query: str,
    language: str = "en",
    session_id: Optional[str] = None,
) -> Tuple[Dict[str, Any], int]:
    """
    Helper function that initializes state, invokes the LangGraph workflow,
    appends run_complete trace event, and returns (final_state, duration_ms).
    """
    start_time = time.perf_counter()
    sid = session_id or str(uuid.uuid4())

    initial_state: ORCAState = {
        "query": query,
        "language": language or "en",
        "session_id": sid,
        "entities": {"lat": None, "lon": None, "location_name": None, "date_hint": None},
        "needed_agents": [],
        "execution_plan": [],
        "agent_outputs": {},
        "final_answer": "",
        "trace": [],
    }

    graph = get_compiled_graph()
    final_state = await graph.ainvoke(initial_state)

    duration_ms = int((time.perf_counter() - start_time) * 1000)

    needed = final_state.get("needed_agents") or []
    outputs = final_state.get("agent_outputs") or {}
    agents_run = [a for a in needed if a in outputs]
    agents_failed = [a for a in needed if a not in outputs]

    complete_event = create_event(
        "run_complete",
        data={
            "duration_ms": duration_ms,
            "agents_run": agents_run,
            "agents_failed": agents_failed,
        },
    )

    if "trace" in final_state:
        final_state["trace"].append(complete_event)
    else:
        final_state["trace"] = [complete_event]

    return final_state, duration_ms
