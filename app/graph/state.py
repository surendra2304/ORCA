from typing import Any, Dict, List, TypedDict


class ORCAState(TypedDict):
    """LangGraph state schema for ORCA multi-agent reasoning."""
    query: str
    language: str                    # "en" default; Phase 7 adds real multilingual
    session_id: str
    entities: Dict[str, Any]         # {lat, lon, location_name, date_hint}
    needed_agents: List[str]
    execution_plan: List[List[str]]  # batches; within a batch = parallel, batches run sequentially
    agent_outputs: Dict[str, Any]    # {"weather": {...}, ...} — ONLY successful agents
    final_answer: str
    trace: List[Dict[str, Any]]      # snapshotted from TraceCollector
