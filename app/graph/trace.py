import asyncio
from datetime import datetime, timezone
import inspect
from typing import Any, Callable, Dict, List, Optional


class TraceCollector:
    """
    Live event collector for ORCA runs.
    Nodes and agents call emit() at the exact moment an event occurs.
    Optionally invokes on_emit callback for live streaming integration.
    """

    def __init__(self, on_emit: Optional[Callable[[Dict[str, Any]], Any]] = None) -> None:
        self.events: List[Dict[str, Any]] = []
        self.on_emit = on_emit

    async def emit(self, event: str, agent: Optional[str], data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Emits a single trace event with an immediate ISO-8601 UTC timestamp.
        Appends to local log and triggers live callback if configured.
        """
        entry = {
            "event": event,
            "agent": agent,
            "ts": datetime.now(timezone.utc).isoformat(),
            "data": data,
        }
        self.events.append(entry)

        if self.on_emit:
            res = self.on_emit(entry)
            if inspect.isawaitable(res):
                await res

        return entry

    def snapshot(self) -> List[Dict[str, Any]]:
        """Returns a snapshot copy of all events emitted so far."""
        return list(self.events)
