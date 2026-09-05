from datetime import datetime, timezone
from typing import Any, Dict, List, Optional


class TraceCollector:
    """
    Live event collector for ORCA runs.
    Nodes and agents call emit() at the exact moment an event occurs,
    ensuring true chronological order and zero batch-grouped accumulation.
    """

    def __init__(self) -> None:
        self.events: List[Dict[str, Any]] = []

    async def emit(self, event: str, agent: Optional[str], data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Emits a single trace event with an immediate ISO-8601 UTC timestamp.
        Appends directly to the in-memory log.
        """
        entry = {
            "event": event,
            "agent": agent,
            "ts": datetime.now(timezone.utc).isoformat(),
            "data": data,
        }
        self.events.append(entry)
        return entry

    def snapshot(self) -> List[Dict[str, Any]]:
        """Returns a snapshot copy of all events emitted so far."""
        return list(self.events)
