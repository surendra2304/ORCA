import math
from typing import Any, Dict, Optional, Tuple
from app.graph.agents.base import MockAgent
from app.graph.state import ORCAState

EARTH_RADIUS_KM = 6371.0
KAKINADA_PORT = [16.98, 82.25]
DEFAULT_PFZ_CENTER = [16.5, 82.5]

KNOWN_COASTAL_COORDS = {
    "visakhapatnam": (17.6868, 83.2185),
    "vizag": (17.6868, 83.2185),
    "kakinada": (16.9891, 82.2475),
    "machilipatnam": (16.1875, 81.1389),
    "chennai": (13.0827, 80.2707),
    "paradip": (20.3164, 86.6114),
}


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Computes great-circle distance between two points on Earth in kilometers
    using the Haversine formula.
    """
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return EARTH_RADIUS_KM * c


def initial_bearing(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Computes initial compass bearing from point 1 to point 2 in degrees (0..360).
    """
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_lambda = math.radians(lon2 - lon1)

    y = math.sin(delta_lambda) * math.cos(phi2)
    x = math.cos(phi1) * math.sin(phi2) - math.sin(phi1) * math.cos(phi2) * math.cos(
        delta_lambda
    )
    theta = math.atan2(y, x)
    return (math.degrees(theta) + 360.0) % 360.0


class GeospatialAgent(MockAgent):
    name = "geospatial"
    description = "Navigational calculations computing real distances and bearings from user to PFZ and ports."

    async def execute(self, state: ORCAState) -> Dict[str, Any]:
        entities = state.get("entities") or {}
        user_lat = entities.get("lat")
        user_lon = entities.get("lon")

        # If lat/lon are missing, attempt lookup from location_name or user query
        if user_lat is None or user_lon is None:
            loc_name = (entities.get("location_name") or "").lower()
            query_text = (state.get("query") or "").lower()
            search_text = f"{loc_name} {query_text}"
            for key, coords in KNOWN_COASTAL_COORDS.items():
                if key in search_text:
                    user_lat, user_lon = coords
                    break

        if user_lat is None or user_lon is None:
            return {
                "source": "mock:geospatial",
                "user": None,
                "note": "no location in query",
            }

        # Retrieve PFZ zone center from pfz agent output (if available)
        pfz_output = (state.get("agent_outputs") or {}).get("pfz") or {}
        pfz_center = DEFAULT_PFZ_CENTER
        zones = pfz_output.get("zones")
        if isinstance(zones, list) and len(zones) > 0 and "center" in zones[0]:
            candidate = zones[0]["center"]
            if isinstance(candidate, (list, tuple)) and len(candidate) == 2:
                pfz_center = [float(candidate[0]), float(candidate[1])]

        dist_to_pfz = haversine_distance(user_lat, user_lon, pfz_center[0], pfz_center[1])
        bearing_to_pfz = initial_bearing(user_lat, user_lon, pfz_center[0], pfz_center[1])
        dist_to_port = haversine_distance(user_lat, user_lon, KAKINADA_PORT[0], KAKINADA_PORT[1])

        return {
            "source": "mock:geospatial",
            "user": {"lat": round(float(user_lat), 4), "lon": round(float(user_lon), 4)},
            "dist_to_pfz_km": round(dist_to_pfz, 2),
            "bearing_to_pfz_deg": round(bearing_to_pfz, 1),
            "dist_to_port_km": round(dist_to_port, 2),
            "port_name": "Kakinada Port",
        }

    def summarize(self, payload: Dict[str, Any]) -> str:
        if payload.get("user") is None:
            return "Geospatial calculation skipped: no location coordinates in query."
        return (
            f"Distance to PFZ: {payload.get('dist_to_pfz_km')} km (bearing {payload.get('bearing_to_pfz_deg')} deg); "
            f"distance to port: {payload.get('dist_to_port_km')} km."
        )


agent = GeospatialAgent()
