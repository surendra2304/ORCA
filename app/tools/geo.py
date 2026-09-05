"""
Pure geometry helpers for ORCA:
- haversine_km: Great-circle distance in kilometers (R=6371.0088 km).
- bearing_deg: Initial compass bearing (0-360 deg, clockwise from true north).
- to_local_xy: Equirectangular projection around lat0 in km units.
- point_in_polygon: Point-in-polygon check via Shapely on local projected coords.
- distance_to_polygon_km: Minimum distance in km to polygon boundary/exterior.
  Documented approximation valid for distances < 300 km.
- nearest_zone: Identifies zone with minimum haversine distance to zone center.

Convention: Coordinates are represented as (lat, lon) in degrees.
Bearing: 0 = North, 90 = East, 180 = South, 270 = West.
Zero I/O, zero LLM, strictly deterministic.
"""

import math
from typing import Any, Dict, List, Optional, Sequence, Tuple
from shapely.geometry import Point, Polygon

EARTH_RADIUS_KM = 6371.0088
KM_PER_DEG_LAT = 111.32


def haversine_km(
    lat1: Optional[float],
    lon1: Optional[float],
    lat2: Optional[float],
    lon2: Optional[float],
) -> Optional[float]:
    """
    Computes great-circle distance between two points on Earth in kilometers
    using the Haversine formula (Earth radius R = 6371.0088 km).
    Returns None if any coordinate is None or invalid.
    """
    if lat1 is None or lon1 is None or lat2 is None or lon2 is None:
        return None

    try:
        phi1 = math.radians(float(lat1))
        phi2 = math.radians(float(lat2))
        delta_phi = math.radians(float(lat2) - float(lat1))
        delta_lambda = math.radians(float(lon2) - float(lon1))

        a = (
            math.sin(delta_phi / 2.0) ** 2
            + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
        )
        c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
        return EARTH_RADIUS_KM * c
    except (ValueError, TypeError):
        return None


def bearing_deg(
    lat1: Optional[float],
    lon1: Optional[float],
    lat2: Optional[float],
    lon2: Optional[float],
) -> Optional[float]:
    """
    Computes initial compass bearing from point 1 to point 2 in degrees (0-360),
    measured clockwise from true north.
    Returns None if any coordinate is None or invalid.
    """
    if lat1 is None or lon1 is None or lat2 is None or lon2 is None:
        return None

    try:
        phi1 = math.radians(float(lat1))
        phi2 = math.radians(float(lat2))
        delta_lambda = math.radians(float(lon2) - float(lon1))

        y = math.sin(delta_lambda) * math.cos(phi2)
        x = math.cos(phi1) * math.sin(phi2) - math.sin(phi1) * math.cos(phi2) * math.cos(delta_lambda)
        theta = math.atan2(y, x)
        return (math.degrees(theta) + 360.0) % 360.0
    except (ValueError, TypeError):
        return None


def to_local_xy(
    lat: float,
    lon: float,
    lat0: float,
    lon0: float = 0.0,
) -> Tuple[float, float]:
    """
    Equirectangular projection around lat0 in km units:
    x = (lon - lon0) * cos(radians(lat0)) * 111.32
    y = (lat - lat0) * 111.32
    """
    cos_lat0 = math.cos(math.radians(lat0))
    x = (float(lon) - float(lon0)) * cos_lat0 * KM_PER_DEG_LAT
    y = (float(lat) - float(lat0)) * KM_PER_DEG_LAT
    return x, y


def point_in_polygon(
    lat: Optional[float],
    lon: Optional[float],
    polygon: Optional[Sequence[Sequence[float]]],
) -> bool:
    """
    Tests whether point (lat, lon) lies inside or on the boundary of polygon.
    Polygon coordinates are given as a sequence of [lat, lon] pairs.
    Uses Shapely on local projected coordinates (equirectangular around lat).
    Normalizes polygon (closes loop if open).
    Returns False if inputs are empty or invalid.
    """
    if lat is None or lon is None or not polygon or len(polygon) < 3:
        return False

    try:
        # Normalize polygon vertices
        coords = list(polygon)
        if coords[0] != coords[-1]:
            coords.append(coords[0])

        lat_f = float(lat)
        lon_f = float(lon)

        # Project vertices around lat0=lat_f, lon0=lon_f
        projected_vertices = [
            to_local_xy(float(v[0]), float(v[1]), lat0=lat_f, lon0=lon_f)
            for v in coords
        ]

        poly = Polygon(projected_vertices)
        if not poly.is_valid:
            poly = poly.buffer(0)

        # Point (lat_f, lon_f) projects to origin (0, 0)
        pt = Point(0.0, 0.0)
        return bool(poly.covers(pt))
    except Exception:
        return False


def distance_to_polygon_km(
    lat: Optional[float],
    lon: Optional[float],
    polygon: Optional[Sequence[Sequence[float]]],
) -> Optional[float]:
    """
    Computes minimum distance in kilometers from (lat, lon) to polygon boundary.
    Valid approximation for distances < 300 km.
    Returns 0.0 if point lies on the edge or if point is inside and distance to edge
    is measured via exterior.
    Returns None if inputs are invalid or empty.
    """
    if lat is None or lon is None or not polygon or len(polygon) < 3:
        return None

    try:
        coords = list(polygon)
        if coords[0] != coords[-1]:
            coords.append(coords[0])

        lat_f = float(lat)
        lon_f = float(lon)

        projected_vertices = [
            to_local_xy(float(v[0]), float(v[1]), lat0=lat_f, lon0=lon_f)
            for v in coords
        ]

        poly = Polygon(projected_vertices)
        if not poly.is_valid:
            poly = poly.buffer(0)

        pt = Point(0.0, 0.0)
        # Distance to the boundary / exterior
        dist = poly.exterior.distance(pt)
        return float(dist)
    except Exception:
        return None


def nearest_zone(
    user: Optional[Tuple[float, float]],
    zones: Optional[List[Dict[str, Any]]],
) -> Optional[Dict[str, Any]]:
    """
    Finds the nearest PFZ zone from user (lat, lon) over all candidate zones.
    Calculates haversine distance to each zone['center'].
    Returns {'distance_km': float, 'bearing_deg': float, 'center': [lat, lon]}
    or None if user or zones is empty.
    """
    if not user or len(user) < 2 or not zones:
        return None

    user_lat, user_lon = user[0], user[1]
    if user_lat is None or user_lon is None:
        return None

    best_zone = None
    min_dist = float("inf")
    best_bearing = 0.0
    best_center: List[float] = []

    for z in zones:
        if not isinstance(z, dict):
            continue
        center = z.get("center")
        if not center or len(center) < 2:
            continue
        try:
            c_lat = float(center[0])
            c_lon = float(center[1])
        except (ValueError, TypeError):
            continue

        d = haversine_km(user_lat, user_lon, c_lat, c_lon)
        if d is not None and d < min_dist:
            min_dist = d
            b = bearing_deg(user_lat, user_lon, c_lat, c_lon)
            best_bearing = b if b is not None else 0.0
            best_center = [c_lat, c_lon]
            best_zone = z

    if best_zone is None or min_dist == float("inf"):
        return None

    return {
        "distance_km": round(min_dist, 2),
        "bearing_deg": round(best_bearing, 1),
        "center": best_center,
    }
