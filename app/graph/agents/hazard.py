import asyncio
import logging
import os
from typing import Any, Dict, List, Optional

from app.config import settings
from app.graph.agents.base import MockAgent
from app.graph.state import ORCAState
from app.graph.trace import TraceCollector
from app.tools.geo import haversine_km
from app.tools.hazard_providers import get_hazard_payload

logger = logging.getLogger(__name__)


class HazardAgent(MockAgent):
    name = "hazard"
    description = "Marine hazard alerts from IMD & INCOIS for high waves, squally winds, and storms."

    async def execute(self, state: ORCAState) -> Dict[str, Any]:
        """Returns mock payload with locked Phase 6 schema."""
        return await get_hazard_payload(lat=None, lon=None, date=None, mode="mock")

    def summarize(self, payload: Dict[str, Any]) -> str:
        alerts = payload.get("alerts", [])
        if not alerts:
            note = payload.get("note")
            return f"Hazard alerts: {note}" if note else "No active marine hazard alerts."
        types = [a.get("type", "hazard") for a in alerts]
        return f"Active marine alerts ({len(alerts)}): {', '.join(types)}."

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
            source = "mock:IMD+INCOIS"
            await emit.emit("agent_result", self.name, {"status": "error", "summary": summary, "source": source})
            return {"status": "error", "summary": summary, "source": source}

        entities = state.get("entities") or {}
        user_lat = entities.get("lat")
        user_lon = entities.get("lon")
        date_hint = entities.get("date_hint")

        try:
            # 1. Emit ONE tool_called per attempted provider BEFORE attempting it
            if settings.IMD_CAP_FEED_URL.strip():
                await emit.emit(
                    "tool_called",
                    self.name,
                    {"tool": "imd_cap", "params": {"lat": user_lat, "lon": user_lon, "date": date_hint}},
                )

            if settings.INCOIS_ALERTS_BASE_URL.strip():
                await emit.emit(
                    "tool_called",
                    self.name,
                    {"tool": "incois_alerts", "params": {"lat": user_lat, "lon": user_lon, "date": date_hint}},
                )

            # Always attempt local advisory file provider
            await emit.emit(
                "tool_called",
                self.name,
                {"tool": "hazard_advisory_file", "params": {"lat": user_lat, "lon": user_lon, "date": date_hint}},
            )

            # 2. Fetch merged hazard payload
            payload = await get_hazard_payload(user_lat, user_lon, date=date_hint, mode="real")

            # 3. Location relevance filtering:
            # Hazard advisories are regional/national bulletins, not point observations;
            # missing user coordinates do NOT error the hazard agent (unlike point-weather/ocean),
            # but leave affected=None for conservative inclusion in safety assessment.
            has_user_coords = (
                user_lat is not None
                and user_lon is not None
                and isinstance(user_lat, (int, float))
                and isinstance(user_lon, (int, float))
            )

            for alert in payload.get("alerts", []):
                center = alert.get("center")
                radius_km = alert.get("radius_km")
                if has_user_coords and center and len(center) >= 2 and radius_km is not None:
                    dist = haversine_km(float(user_lat), float(user_lon), float(center[0]), float(center[1]))
                    if dist is not None:
                        alert["distance_km"] = round(dist, 2)
                        alert["affected"] = dist <= float(radius_km)
                    else:
                        alert["distance_km"] = None
                        alert["affected"] = None
                elif has_user_coords and (not center or radius_km is None):
                    alert["distance_km"] = None
                    alert["affected"] = None  # unknown relevance: keep, conservative
                else:
                    # No user coords: affected=None everywhere
                    alert["distance_km"] = None
                    alert["affected"] = None

            status = "ok"
            summary = self.summarize(payload)
            source = payload.get("source", "hazard:advisory-file")

        except Exception as exc:
            logger.error("HazardAgent error in real mode: %s", exc, exc_info=True)
            status = "error"
            summary = f"Hazard agent execution failed: {exc}"
            source = "hazard:advisory-file"
            payload = {"status": "error", "summary": summary, "source": source}

        await emit.emit(
            "agent_result",
            self.name,
            {"status": status, "summary": summary, "source": source},
        )
        return payload


agent = HazardAgent()
