import logging
from typing import Any, Dict, Optional, Tuple

from app.graph.state import ORCAState
from app.graph.trace import TraceCollector
from app.tools.geocode import geocode

logger = logging.getLogger(__name__)


async def resolve_entities(
    entities: Optional[Dict[str, Any]]
) -> Tuple[Optional[float], Optional[float]]:
    """
    Pure helper to extract or resolve coordinates from entities dict.
    Returns (lat, lon) or (None, None).
    """
    if not entities or not isinstance(entities, dict):
        return None, None

    lat = entities.get("lat")
    lon = entities.get("lon")
    if isinstance(lat, (int, float)) and isinstance(lon, (int, float)):
        return float(lat), float(lon)

    loc_name = entities.get("location_name")
    if loc_name and isinstance(loc_name, str) and loc_name.strip():
        result = await geocode(loc_name)
        if result:
            return float(result["lat"]), float(result["lon"])

    return None, None


async def resolver_node(state: ORCAState, collector: TraceCollector) -> Dict[str, Any]:
    """
    Resolver LangGraph node positioned between planner and executor:
    START -> planner -> resolver -> executor -> verdict -> aggregator -> END.

    - In mode="mock": no-op, emits nothing, returns immediately.
    - In mode="real": resolves location_name to lat/lon via Nominatim geocoding
      and emits agent_started/agent_result events for 'resolver'.
      On failure, leaves entities unresolved so downstream agents error cleanly.
    """
    mode = state.get("mode", "mock")
    if mode == "mock":
        return {}

    entities = dict(state.get("entities") or {})
    lat = entities.get("lat")
    lon = entities.get("lon")

    # If coordinates are already numbers, no geocoding needed
    if isinstance(lat, (int, float)) and isinstance(lon, (int, float)):
        return {"entities": entities}

    loc_name = entities.get("location_name")
    if loc_name and isinstance(loc_name, str) and loc_name.strip():
        await collector.emit("agent_started", "resolver", {})

        result = await geocode(loc_name)
        if result:
            resolved_lat = float(result["lat"])
            resolved_lon = float(result["lon"])
            display_name = str(result.get("display_name", loc_name))

            entities["lat"] = resolved_lat
            entities["lon"] = resolved_lon
            entities["location_name"] = display_name

            await collector.emit(
                "agent_result",
                "resolver",
                {
                    "status": "ok",
                    "summary": f"Resolved '{loc_name}' to {display_name} ({resolved_lat:.4f}, {resolved_lon:.4f})",
                    "source": "nominatim",
                },
            )
        else:
            await collector.emit(
                "agent_result",
                "resolver",
                {
                    "status": "error",
                    "summary": f"Could not geocode location '{loc_name}'",
                    "source": "nominatim",
                },
            )

    return {"entities": entities}
