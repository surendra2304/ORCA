import asyncio
import logging
import os
from typing import Any, Dict

from app.graph.agents.base import MockAgent
from app.graph.state import ORCAState
from app.graph.trace import TraceCollector
from app.tools.pfz_providers import get_pfz_payload

logger = logging.getLogger(__name__)


class PFZAgent(MockAgent):
    name = "pfz"
    description = "INCOIS Potential Fishing Zones (PFZ) advisory with coordinates, depths, and confidence."

    async def execute(self, state: ORCAState) -> Dict[str, Any]:
        return {
            "source": "mock:INCOIS-PFZ",
            "advisory_id": "PFZ-MOCK-001",
            "advisory_date": None,
            "zones": [
                {
                    "polygon": [
                        [16.3, 82.3],
                        [16.3, 82.7],
                        [16.7, 82.7],
                        [16.7, 82.3],
                    ],
                    "depth_m": 45.0,
                    "center": [16.5, 82.5],
                    "confidence": 0.78,
                }
            ],
            "note": None,
        }

    def summarize(self, payload: Dict[str, Any]) -> str:
        zones = payload.get("zones", [])
        count = len(zones)
        conf = (
            zones[0].get("confidence", 0.0)
            if count > 0 and zones[0].get("confidence") is not None
            else 0.0
        )
        if count == 0 and payload.get("note"):
            return f"PFZ advisory: {payload.get('note')}"
        return f"Identified {count} Potential Fishing Zone(s) with confidence {conf:.0%}."

    async def run(self, emit: TraceCollector, state: ORCAState) -> Dict[str, Any]:
        mode = state.get("mode", "mock")
        if mode == "mock":
            return await super().run(emit, state)

        # mode == "real"
        await emit.emit("agent_started", self.name, {})

        # Forced failure hook
        force_fail = os.getenv("ORCA_FORCE_AGENT_FAILURE", "").strip().lower()
        if force_fail and force_fail == self.name.lower():
            logger.warning("Forced failure for %s via ORCA_FORCE_AGENT_FAILURE", self.name)
            summary = f"Agent execution failed: Forced agent failure via ORCA_FORCE_AGENT_FAILURE for {self.name}"
            source = "incois:advisory-file"
            await emit.emit("agent_result", self.name, {"status": "error", "summary": summary, "source": source})
            return {"status": "error", "summary": summary, "source": source}

        entities = state.get("entities") or {}
        lat = entities.get("lat")
        lon = entities.get("lon")
        date_hint = entities.get("date_hint")

        if lat is None or lon is None or not isinstance(lat, (int, float)) or not isinstance(lon, (int, float)):
            logger.warning("PFZAgent real mode missing coordinates: lat=%s, lon=%s", lat, lon)
            summary = "Missing or unresolved coordinates (lat, lon) for real PFZ advisory"
            source = "incois:advisory-file"
            await emit.emit("agent_result", self.name, {"status": "error", "summary": summary, "source": source})
            return {"status": "error", "summary": summary, "source": source}

        lat_f = float(lat)
        lon_f = float(lon)

        # Emit tool_called before fetching advisory
        await emit.emit(
            "tool_called",
            self.name,
            {
                "tool": "incois_pfz",
                "params": {"lat": lat_f, "lon": lon_f, "date": date_hint},
            },
        )

        try:
            payload = await get_pfz_payload(lat_f, lon_f, date=date_hint, mode="real")
            status = "ok"
            summary = self.summarize(payload)
            source = payload.get("source", "incois:advisory-file")
        except Exception as exc:
            logger.warning("PFZAgent unexpected error: %s", exc)
            status = "error"
            summary = f"PFZ agent failed: {exc}"
            source = "incois:advisory-file"
            payload = {"status": "error", "summary": summary, "source": source}

        await emit.emit(
            "agent_result",
            self.name,
            {"status": status, "summary": summary, "source": source},
        )
        return payload


agent = PFZAgent()
