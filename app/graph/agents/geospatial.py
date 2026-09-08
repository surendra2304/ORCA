import json
import logging
import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from app.config import settings
from app.graph.agents.base import MockAgent
from app.graph.state import ORCAState
from app.graph.trace import TraceCollector
from app.tools.geo import (
    bearing_deg,
    bearing_deg as initial_bearing,
    distance_to_polygon_km,
    haversine_km,
    haversine_km as haversine_distance,
    nearest_zone,
    point_in_polygon,
)

logger = logging.getLogger(__name__)

# Cached geographic data
_GEO_CACHE: Dict[str, Any] = {}


def load_geodata() -> Tuple[List[List[List[float]]], List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Loads and caches EEZ polygons, restricted zones, and ports from GEO_DATA_DIR.
    Converts GeoJSON coordinates [lon, lat] into [lat, lon] rings.
    """
    global _GEO_CACHE
    if "loaded" in _GEO_CACHE:
        return _GEO_CACHE["eez"], _GEO_CACHE["restricted"], _GEO_CACHE["ports"]

    geo_dir = Path(settings.GEO_DATA_DIR)
    eez_file = geo_dir / "india_eez_simplified.geojson"
    restricted_file = geo_dir / "restricted_zones.geojson"
    ports_file = geo_dir / "ports.json"

    # 1. Load EEZ
    eez_polygons: List[List[List[float]]] = []
    if eez_file.exists():
        try:
            with open(eez_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                features = data.get("features", [])
                for feat in features:
                    geom = feat.get("geometry", {})
                    gtype = geom.get("type")
                    coords = geom.get("coordinates", [])
                    if gtype == "Polygon" and coords:
                        ring = coords[0]
                        eez_polygons.append([[float(c[1]), float(c[0])] for c in ring])
                    elif gtype == "MultiPolygon" and coords:
                        for poly in coords:
                            if poly:
                                ring = poly[0]
                                eez_polygons.append([[float(c[1]), float(c[0])] for c in ring])
        except Exception as exc:
            logger.warning("Error loading EEZ geojson '%s': %s", eez_file, exc)

    # 2. Load Restricted Zones
    restricted_zones: List[Dict[str, Any]] = []
    if restricted_file.exists():
        try:
            with open(restricted_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                features = data.get("features", [])
                for feat in features:
                    props = feat.get("properties", {})
                    geom = feat.get("geometry", {})
                    coords = geom.get("coordinates", [])
                    if coords:
                        ring = coords[0]
                        lat_lon_ring = [[float(c[1]), float(c[0])] for c in ring]
                        restricted_zones.append({
                            "name": props.get("name", "Restricted Area"),
                            "category": props.get("category", "general"),
                            "restriction": props.get("restriction", "Entry prohibited"),
                            "polygon": lat_lon_ring,
                        })
        except Exception as exc:
            logger.warning("Error loading restricted zones '%s': %s", restricted_file, exc)

    # 3. Load Ports
    ports: List[Dict[str, Any]] = []
    if ports_file.exists():
        try:
            with open(ports_file, "r", encoding="utf-8") as f:
                ports_data = json.load(f)
                if isinstance(ports_data, list):
                    ports = ports_data
        except Exception as exc:
            logger.warning("Error loading ports '%s': %s", ports_file, exc)

    _GEO_CACHE["eez"] = eez_polygons
    _GEO_CACHE["restricted"] = restricted_zones
    _GEO_CACHE["ports"] = ports
    _GEO_CACHE["loaded"] = True

    return eez_polygons, restricted_zones, ports


class GeospatialAgent(MockAgent):
    name = "geospatial"
    description = "Navigational calculations computing real distances and bearings to PFZ zones, ports, EEZ, and restricted areas."

    async def execute(self, state: ORCAState) -> Dict[str, Any]:
        entities = state.get("entities") or {}
        user_lat = entities.get("lat")
        user_lon = entities.get("lon")

        # Fallback for queries with no coords
        if user_lat is None or user_lon is None or not isinstance(user_lat, (int, float)) or not isinstance(user_lon, (int, float)):
            return {
                "source": "orca:geospatial",
                "user": None,
                "pfz": None,
                "ports": None,
                "eez": {
                    "inside": False,
                    "nearest_boundary_km": None,
                    "boundary_file": "india_eez_simplified.geojson",
                },
                "restricted": None,
                "note": "no location in query",
            }

        lat_f = float(user_lat)
        lon_f = float(user_lon)
        user_coords = (lat_f, lon_f)

        eez_polygons, restricted_zones, ports = load_geodata()

        # 1. PFZ nearest zone over all zones
        pfz_output = (state.get("agent_outputs") or {}).get("pfz") or {}
        candidate_zones = pfz_output.get("zones", [])
        zones_considered = len(candidate_zones) if isinstance(candidate_zones, list) else 0
        nearest_pfz = nearest_zone(user_coords, candidate_zones) if zones_considered > 0 else None

        pfz_dict: Dict[str, Any] = {
            "zones_considered": zones_considered,
            "nearest": nearest_pfz,
        }

        # 2. Nearest Port
        nearest_port = None
        if ports:
            min_port_dist = float("inf")
            best_port = None
            for p in ports:
                d = haversine_km(lat_f, lon_f, p.get("lat"), p.get("lon"))
                if d is not None and d < min_port_dist:
                    min_port_dist = d
                    best_port = p
            if best_port and min_port_dist != float("inf"):
                nearest_port = {
                    "name": best_port.get("name"),
                    "distance_km": round(min_port_dist, 2),
                }

        # 3. EEZ Membership & Distance to Boundary
        eez_inside = False
        eez_boundary_dist = float("inf")
        for poly in eez_polygons:
            if point_in_polygon(lat_f, lon_f, poly):
                eez_inside = True
            d = distance_to_polygon_km(lat_f, lon_f, poly)
            if d is not None and d < eez_boundary_dist:
                eez_boundary_dist = d

        eez_dict = {
            "inside": eez_inside,
            "nearest_boundary_km": round(eez_boundary_dist, 2) if eez_boundary_dist != float("inf") else None,
            "boundary_file": "india_eez_simplified.geojson",
        }

        # 4. Restricted Zones Check
        restr_inside = False
        restr_zone_name: Optional[str] = None
        restr_category: Optional[str] = None
        min_restr_dist = float("inf")

        for rz in restricted_zones:
            poly = rz.get("polygon", [])
            if point_in_polygon(lat_f, lon_f, poly):
                restr_inside = True
                restr_zone_name = rz.get("name")
                restr_category = rz.get("category")
            d = distance_to_polygon_km(lat_f, lon_f, poly)
            if d is not None and d < min_restr_dist:
                min_restr_dist = d

        restricted_dict = {
            "inside": restr_inside,
            "zone": restr_zone_name if restr_inside else None,
            "nearest_km": 0.0 if restr_inside else (round(min_restr_dist, 2) if min_restr_dist != float("inf") else None),
            "category": restr_category if restr_inside else None,
        }

        return {
            "source": "orca:geospatial",
            "user": {"lat": round(lat_f, 4), "lon": round(lon_f, 4)},
            "pfz": pfz_dict,
            "ports": {"nearest": nearest_port},
            "eez": eez_dict,
            "restricted": restricted_dict,
            "note": None,
        }

    def summarize(self, payload: Dict[str, Any]) -> str:
        if payload.get("user") is None:
            return "Geospatial calculation skipped: no location in query."

        summary_parts = []
        pfz_info = payload.get("pfz")
        if pfz_info and pfz_info.get("nearest"):
            nz = pfz_info["nearest"]
            summary_parts.append(f"Nearest PFZ {nz.get('distance_km')}km (bearing {nz.get('bearing_deg')}°)")

        ports_info = payload.get("ports", {})
        if ports_info and ports_info.get("nearest"):
            np = ports_info["nearest"]
            summary_parts.append(f"nearest port {np.get('name')} ({np.get('distance_km')}km)")

        restr_info = payload.get("restricted", {})
        if restr_info:
            if restr_info.get("inside"):
                summary_parts.append(f"INSIDE restricted zone '{restr_info.get('zone')}'")
            elif restr_info.get("nearest_km") is not None:
                summary_parts.append(f"nearest restricted zone {restr_info.get('nearest_km')}km")

        eez_info = payload.get("eez", {})
        if eez_info and not eez_info.get("inside"):
            summary_parts.append("OUTSIDE Indian EEZ waters")

        return "; ".join(summary_parts) + "." if summary_parts else "Geospatial calculations completed."


agent = GeospatialAgent()
