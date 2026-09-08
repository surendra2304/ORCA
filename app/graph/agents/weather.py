import asyncio
from datetime import datetime, timezone
import logging
import os
from typing import Any, Dict

from app.graph.agents.base import MockAgent
from app.graph.state import ORCAState
from app.graph.trace import TraceCollector
from app.tools.http import FetchError
from app.tools.open_meteo import get_weather

logger = logging.getLogger(__name__)


class WeatherAgent(MockAgent):
    name = "weather"
    description = "Meteorological forecast from IMD (mock) or Open-Meteo (real) with winds, gusts, rain, and lightning risk."

    async def execute(self, state: ORCAState) -> Dict[str, Any]:
        return {
            "source": "mock:IMD",
            "wind_knots": 14.2,
            "gusts_knots": 22.0,
            "rain_mm": 3.1,
            "lightning_risk": "low",
            "forecast_hours": [
                {
                    "hour": h,
                    "wind_knots": round(14.0 + (h % 3) * 1.5, 1),
                    "rain_mm": round(max(0.0, 3.1 - h * 0.4), 1),
                }
                for h in range(1, 8)
            ],
            "fetched_at": datetime.now(timezone.utc).isoformat(),
        }

    def summarize(self, payload: Dict[str, Any]) -> str:
        return f"Wind {payload.get('wind_knots')} kts, gusts {payload.get('gusts_knots')} kts, rain {payload.get('rain_mm')} mm, lightning risk {payload.get('lightning_risk')}."

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
            source = "open-meteo:forecast"
            await emit.emit("agent_result", self.name, {"status": "error", "summary": summary, "source": source})
            return {"status": "error", "summary": summary, "source": source}

        entities = state.get("entities") or {}
        lat = entities.get("lat")
        lon = entities.get("lon")

        if lat is None or lon is None or not isinstance(lat, (int, float)) or not isinstance(lon, (int, float)):
            logger.warning("WeatherAgent real mode missing coordinates: lat=%s, lon=%s", lat, lon)
            summary = "Missing or unresolved coordinates (lat, lon) for real weather forecast"
            source = "open-meteo:forecast"
            await emit.emit("agent_result", self.name, {"status": "error", "summary": summary, "source": source})
            return {"status": "error", "summary": summary, "source": source}

        lat_f = float(lat)
        lon_f = float(lon)

        # Emit tool_called before calling external API
        await emit.emit(
            "tool_called",
            self.name,
            {
                "tool": "open_meteo_forecast",
                "params": {"lat": lat_f, "lon": lon_f},
            },
        )

        try:
            payload = await get_weather(lat_f, lon_f)
            status = "ok"
            summary = self.summarize(payload)
            source = payload.get("source", "open-meteo:forecast")
        except FetchError as fe:
            logger.warning("WeatherAgent fetch error: %s", fe)
            status = "error"
            summary = f"Weather forecast fetch failed: {fe}"
            source = "open-meteo:forecast"
            payload = {"status": "error", "summary": summary, "source": source}
        except Exception as exc:
            logger.warning("WeatherAgent unexpected exception: %s", exc)
            status = "error"
            summary = f"Weather agent failed: {exc}"
            source = "open-meteo:forecast"
            payload = {"status": "error", "summary": summary, "source": source}

        await emit.emit(
            "agent_result",
            self.name,
            {"status": status, "summary": summary, "source": source},
        )
        return payload


agent = WeatherAgent()
