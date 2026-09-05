import asyncio
from datetime import datetime, timezone
import logging
import os
from typing import Any, Dict

from app.graph.agents.base import MockAgent
from app.graph.state import ORCAState
from app.graph.trace import TraceCollector
from app.tools.http import FetchError
from app.tools.open_meteo import get_ocean

logger = logging.getLogger(__name__)


class OceanAgent(MockAgent):
    name = "ocean"
    description = "INCOIS Ocean State Forecast (mock) or Open-Meteo Marine (real) with waves, swells, and SST."

    async def execute(self, state: ORCAState) -> Dict[str, Any]:
        return {
            "source": "mock:INCOIS-OSF",
            "wave_height_m": 2.8,
            "wave_period_s": 9.0,
            "swell_height_m": 1.9,
            "sst_c": 28.4,
            "current_knots": 1.2,
            "tide_state": "rising",
            "fetched_at": datetime.now(timezone.utc).isoformat(),
        }

    def summarize(self, payload: Dict[str, Any]) -> str:
        if payload.get("note"):
            return f"Ocean data: {payload.get('note')}."
        return f"Waves {payload.get('wave_height_m')}m, swell {payload.get('swell_height_m')}m, SST {payload.get('sst_c')}°C, tide {payload.get('tide_state')}."

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
            source = "open-meteo:marine"
            await emit.emit("agent_result", self.name, {"status": "error", "summary": summary, "source": source})
            return {"status": "error", "summary": summary, "source": source}

        entities = state.get("entities") or {}
        lat = entities.get("lat")
        lon = entities.get("lon")

        if lat is None or lon is None or not isinstance(lat, (int, float)) or not isinstance(lon, (int, float)):
            logger.warning("OceanAgent real mode missing coordinates: lat=%s, lon=%s", lat, lon)
            summary = "Missing or unresolved coordinates (lat, lon) for real marine forecast"
            source = "open-meteo:marine"
            await emit.emit("agent_result", self.name, {"status": "error", "summary": summary, "source": source})
            return {"status": "error", "summary": summary, "source": source}

        lat_f = float(lat)
        lon_f = float(lon)

        # Emit tool_called before calling external API
        await emit.emit(
            "tool_called",
            self.name,
            {
                "tool": "open_meteo_marine",
                "params": {"lat": lat_f, "lon": lon_f},
            },
        )

        try:
            payload = await get_ocean(lat_f, lon_f)
            status = "ok"
            summary = self.summarize(payload)
            source = payload.get("source", "open-meteo:marine")
        except FetchError as fe:
            logger.warning("OceanAgent fetch error: %s", fe)
            status = "error"
            summary = f"Marine forecast fetch failed: {fe}"
            source = "open-meteo:marine"
            payload = {"status": "error", "summary": summary, "source": source}
        except Exception as exc:
            logger.warning("OceanAgent unexpected exception: %s", exc)
            status = "error"
            summary = f"Ocean agent failed: {exc}"
            source = "open-meteo:marine"
            payload = {"status": "error", "summary": summary, "source": source}

        await emit.emit(
            "agent_result",
            self.name,
            {"status": status, "summary": summary, "source": source},
        )
        return payload


agent = OceanAgent()
