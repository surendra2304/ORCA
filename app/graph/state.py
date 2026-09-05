from datetime import datetime, timezone
import operator
from typing import Annotated, Any, Dict, List, Optional, TypedDict


def utc_iso_now() -> str:
    """Returns current UTC timestamp in ISO-8601 format."""
    return datetime.now(timezone.utc).isoformat()


def create_event(
    event: str,
    data: Optional[Dict[str, Any]] = None,
    agent: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Creates a trace event adhering to the ORCA Phase 1 event contract:
    {"event": str, "agent": str|None, "ts": iso8601-utc, "data": dict}
    """
    return {
        "event": event,
        "agent": agent,
        "ts": utc_iso_now(),
        "data": data or {},
    }


class ORCAState(TypedDict):
    """LangGraph state schema for ORCA multi-agent reasoning."""
    query: str
    language: str                    # "en" default
    session_id: str
    entities: Dict[str, Any]         # {lat, lon, location_name, date_hint}
    needed_agents: List[str]
    execution_plan: List[List[str]]  # batches of agent names
    agent_outputs: Dict[str, Any]    # {"weather": {...}, ...} — ONLY successful agents
    final_answer: str
    trace: Annotated[List[Dict[str, Any]], operator.add]
