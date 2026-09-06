from typing import Any, Dict, List, Optional, TypedDict


class ORCAState(TypedDict, total=False):
    """LangGraph state schema for ORCA multi-agent reasoning."""
    query: str
    language: str                    # "en" default; Phase 7 adds real multilingual
    session_id: str
    run_id: str                      # Unique per run (UUID)
    vessel_class: str                # e.g. "small_fishing_boat"
    mode: str                        # "mock" | "real"
    safety_relevant: bool            # True if query involves sea safety/trip feasibility
    verdict: Optional[Dict[str, Any]]# Deterministic safety rule engine verdict dict or None
    entities: Dict[str, Any]         # {lat, lon, location_name, date_hint}
    entity_source: Optional[str]     # "query" | "inherited"
    history: Optional[List[Dict[str, Any]]] # Previous conversation turns
    needed_agents: List[str]
    execution_plan: List[List[str]]  # batches; within a batch = parallel, batches run sequentially
    agent_outputs: Dict[str, Any]    # {"weather": {...}, ...} — ONLY successful agents
    final_answer: str
    trace: List[Dict[str, Any]]      # snapshotted from TraceCollector

