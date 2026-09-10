"""
app/core/dashboard.py — Deterministic Dashboard Pipelines (No LLM)

Executes fixed canonical batch [weather, ocean, hazard, geospatial] in ONE
parallel batch, reuses the 8B executor, evaluates safety rules via the rule engine,
and calculates the transparent zone index.
"""

from datetime import datetime, timezone
import logging
import time
from typing import Any, Dict, Optional, Tuple

from app.config import settings
from app.core.rules import evaluate_safety, load_rules
from app.core.zone_index import compute_zone_index
from app.graph.executor import executor_node
from app.graph.trace import TraceCollector

logger = logging.getLogger(__name__)

# Module-level TTL cache: (lat, lon, vessel_class, mode) -> (timestamp, data)
_DASHBOARD_CACHE: Dict[Tuple[float, float, str, str], Tuple[float, Dict[str, Any]]] = {}


def clear_dashboard_cache() -> None:
    """Clears the dashboard briefing cache. Exposed for unit testing."""
    global _DASHBOARD_CACHE
    _DASHBOARD_CACHE.clear()


def get_dashboard_cache_size() -> int:
    """Returns number of cached entries."""
    return len(_DASHBOARD_CACHE)


def utc_iso_now() -> str:
    """Returns ISO 8601 UTC timestamp."""
    return datetime.now(timezone.utc).isoformat()


def assemble_observations_and_provenance(
    agent_outputs: Dict[str, Any]
) -> Tuple[Dict[str, Any], Dict[str, str]]:
    """
    Assembles observations for the safety rule engine and tracks provenance sources
    from consumed agent outputs exactly matching verdict_node.
    """
    weather_data = agent_outputs.get("weather")
    ocean_data = agent_outputs.get("ocean")
    hazard_data = agent_outputs.get("hazard")
    geospatial_data = agent_outputs.get("geospatial")

    # Ocean observations
    wave_height_m = ocean_data.get("wave_height_m") if ocean_data else None

    # Weather observations (worst-case over forecast_hours)
    if weather_data:
        current_wind = weather_data.get("wind_knots")
        current_gusts = weather_data.get("gusts_knots")
        forecast_hours = weather_data.get("forecast_hours") or []

        forecast_winds = [
            float(f["wind_knots"])
            for f in forecast_hours
            if isinstance(f, dict) and f.get("wind_knots") is not None
        ]
        max_forecast_wind = max(forecast_winds) if forecast_winds else None

        if current_wind is not None and max_forecast_wind is not None:
            if max_forecast_wind > float(current_wind):
                wind_knots = max_forecast_wind
                wind_basis = "worst_forecast"
            else:
                wind_knots = float(current_wind)
                wind_basis = "current"
        elif current_wind is not None:
            wind_knots = float(current_wind)
            wind_basis = "current"
        elif max_forecast_wind is not None:
            wind_knots = max_forecast_wind
            wind_basis = "worst_forecast"
        else:
            wind_knots = None
            wind_basis = "current"

        forecast_gusts = [
            float(f["gusts_knots"])
            for f in forecast_hours
            if isinstance(f, dict) and f.get("gusts_knots") is not None
        ]
        max_forecast_gusts = max(forecast_gusts) if forecast_gusts else None

        if current_gusts is not None and max_forecast_gusts is not None:
            if max_forecast_gusts > float(current_gusts):
                gusts_knots = max_forecast_gusts
                gusts_basis = "worst_forecast"
            else:
                gusts_knots = float(current_gusts)
                gusts_basis = "current"
        elif current_gusts is not None:
            gusts_knots = float(current_gusts)
            gusts_basis = "current"
        elif max_forecast_gusts is not None:
            gusts_knots = max_forecast_gusts
            gusts_basis = "worst_forecast"
        else:
            gusts_knots = None
            gusts_basis = "current"

        lightning_risk = weather_data.get("lightning_risk")
    else:
        wind_knots = None
        wind_basis = "current"
        gusts_knots = None
        gusts_basis = "current"
        lightning_risk = None

    # Hazard alerts
    hazard_alerts = hazard_data.get("alerts") if hazard_data else None

    observations = {
        "wave_height_m": wave_height_m,
        "wind_knots": wind_knots,
        "wind_knots_basis": wind_basis,
        "gusts_knots": gusts_knots,
        "gusts_knots_basis": gusts_basis,
        "lightning_risk": lightning_risk,
        "hazard_alerts": hazard_alerts,
        "geospatial": geospatial_data,
    }

    # Provenance tracking
    input_sources: Dict[str, str] = {}
    if weather_data and "source" in weather_data:
        input_sources["weather"] = weather_data["source"]
    if ocean_data and "source" in ocean_data:
        input_sources["ocean"] = ocean_data["source"]
    if hazard_data and hazard_data.get("alerts") and "source" in hazard_data:
        input_sources["hazard"] = hazard_data["source"]
    if (
        geospatial_data
        and isinstance(geospatial_data, dict)
        and geospatial_data.get("user") is not None
        and "source" in geospatial_data
    ):
        input_sources["geospatial"] = geospatial_data["source"]

    return observations, input_sources


async def run_dashboard(
    lat: float,
    lon: float,
    vessel_class: str = "small_fishing_boat",
    mode: str = "mock",
) -> Dict[str, Any]:
    """
    DETERMINISTIC DASHBOARD PIPELINE (Zero LLM).
    - Checks in-memory cache keyed by (lat, lon, vessel_class, mode).
    - Runs [weather, ocean, hazard, geospatial] concurrently in ONE batch via executor_node.
    - Evaluates safety rules deterministically via evaluate_safety.
    - Computes transparent zone_index.
    - Returns locked briefing schema.
    """
    cache_key = (round(lat, 4), round(lon, 4), vessel_class, mode)
    now = time.time()

    # 1. Check TTL cache
    if cache_key in _DASHBOARD_CACHE:
        cached_time, cached_data = _DASHBOARD_CACHE[cache_key]
        if now - cached_time < settings.DASHBOARD_CACHE_TTL_S:
            logger.info("Dashboard cache hit for %s", cache_key)
            out = dict(cached_data)
            out["cached"] = True
            return out

    # 2. Setup fixed canonical execution plan in ONE parallel batch
    collector = TraceCollector()
    state = {
        "execution_plan": [["weather", "ocean", "hazard", "geospatial"]],
        "entities": {
            "lat": lat,
            "lon": lon,
            "location_name": f"Point ({lat:.4f}, {lon:.4f})",
        },
        "mode": mode,
        "vessel_class": vessel_class,
        "agent_outputs": {},
    }

    # 3. Execute batch concurrently (zero LLM calls)
    res = await executor_node(state, collector)
    agent_outputs = res.get("agent_outputs") or {}

    # 4. Assemble observations and provenance
    observations, input_sources = assemble_observations_and_provenance(agent_outputs)

    # 5. Deterministic verdict via safety rules
    rules = load_rules()
    verdict = evaluate_safety(observations, vessel_class, rules, input_sources=input_sources)

    # 6. Compute transparent Zone Index
    # Check if user is inside any restricted zones from geospatial agent
    geo_user = (agent_outputs.get("geospatial") or {}).get("user") or {}
    inside_restricted = bool(geo_user.get("restricted_zones"))

    # Extract alert severities for alerts that affect this location
    raw_alerts = (agent_outputs.get("hazard") or {}).get("alerts") or []
    affected_alerts: list = []
    for a in raw_alerts:
        if isinstance(a, dict):
            # Only count alert if affected is True (or omitted)
            if a.get("affected", True):
                affected_alerts.append(a.get("severity") or a.get("level") or "moderate")

    zone_index_obs = {
        "wave_height_m": observations.get("wave_height_m"),
        "wind_knots": observations.get("wind_knots"),
        "affected_alerts": affected_alerts,
        "inside_restricted": inside_restricted,
    }
    zone_idx = compute_zone_index(zone_index_obs)

    # 7. Build locked briefing response
    summary = {
        "verdict": verdict.get("verdict"),
        "zone_index_score": zone_idx.get("score"),
        "band": zone_idx.get("band"),
        "reasons": verdict.get("reasons", []),
    }
    layers = {
        "weather": agent_outputs.get("weather"),
        "ocean": agent_outputs.get("ocean"),
        "hazard": agent_outputs.get("hazard"),
        "geospatial": agent_outputs.get("geospatial"),
    }

    result = {
        "summary": summary,
        "location": {"lat": lat, "lon": lon},
        "vessel_class": vessel_class,
        "mode": mode,
        "generated_at": utc_iso_now(),
        "weather": agent_outputs.get("weather"),
        "ocean": agent_outputs.get("ocean"),
        "hazard": agent_outputs.get("hazard"),
        "geospatial": agent_outputs.get("geospatial"),
        "layers": layers,
        "verdict": verdict,
        "zone_index": zone_idx,
        "provenance": input_sources,
        "cached": False,
    }


    # Cache result
    _DASHBOARD_CACHE[cache_key] = (now, dict(result))
    return result

