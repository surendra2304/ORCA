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

    # Geocode primary location_name if coordinates not provided
    if not (isinstance(lat, (int, float)) and isinstance(lon, (int, float))):
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

    # Geocode origin/destination for route queries if present and coordinates missing
    for endpoint_key in ("origin", "destination"):
        ep = entities.get(endpoint_key)
        if isinstance(ep, dict):
            ep_lat = ep.get("lat")
            ep_lon = ep.get("lon")
            if not (isinstance(ep_lat, (int, float)) and isinstance(ep_lon, (int, float))):
                ep_name = ep.get("name") or ep.get("location_name")
                if ep_name and isinstance(ep_name, str) and ep_name.strip():
                    ep_res = await geocode(ep_name)
                    if ep_res:
                        ep["lat"] = float(ep_res["lat"])
                        ep["lon"] = float(ep_res["lon"])
                        d_name = str(ep_res.get("display_name", ep_name))
                        ep["location_name"] = d_name
                        ep["name"] = ep_name

    return {"entities": entities}
