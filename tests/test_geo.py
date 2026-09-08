import json
from pathlib import Path
import pytest

from app.tools.geo import (
    bearing_deg,
    distance_to_polygon_km,
    haversine_km,
    nearest_zone,
    point_in_polygon,
    to_local_xy,
)

EEZ_FILE = Path(__file__).resolve().parent.parent / "data" / "geo" / "india_eez_simplified.geojson"


def test_haversine_known_values():
    # Kakinada (16.98, 82.25) to zone center (16.5, 82.5)
    dist = haversine_km(16.98, 82.25, 16.5, 82.5)
    assert dist is not None
    # 60.7 km +/- 2 km
    assert abs(dist - 60.7) <= 2.0, f"Expected 60.7 +/- 2 km, got {dist:.2f}"

    # Edge cases
    assert haversine_km(None, 82.0, 16.0, 82.0) is None
    assert haversine_km(16.0, 82.0, 16.0, 82.0) == 0.0


def test_bearing_kakinada_to_zone():
    # Kakinada (16.98, 82.25) to zone center (16.5, 82.5) (South-East)
    b = bearing_deg(16.98, 82.25, 16.5, 82.5)
    assert b is not None
    assert 130.0 <= b <= 160.0, f"Expected bearing in [130, 160], got {b:.1f}"

    # Bearing due North
    assert bearing_deg(10.0, 80.0, 11.0, 80.0) == pytest.approx(0.0, abs=1e-2)
    # Bearing due East
    assert bearing_deg(10.0, 80.0, 10.0, 81.0) == pytest.approx(90.0, abs=1.0)


def test_to_local_xy():
    x, y = to_local_xy(16.0, 82.0, lat0=16.0, lon0=82.0)
    assert x == 0.0
    assert y == 0.0


def test_point_in_polygon_unit_square():
    # Square [10, 10] to [11, 11] in lat/lon
    square = [
        [10.0, 10.0],
        [10.0, 11.0],
        [11.0, 11.0],
        [11.0, 10.0],
    ]
    # Inside
    assert point_in_polygon(10.5, 10.5, square) is True
    # Outside
    assert point_in_polygon(9.5, 10.5, square) is False
    assert point_in_polygon(12.0, 10.5, square) is False
    # None inputs
    assert point_in_polygon(None, 10.5, square) is False
    assert point_in_polygon(10.5, None, square) is False
    assert point_in_polygon(10.5, 10.5, None) is False


def test_point_in_polygon_bundled_eez():
    with open(EEZ_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
    ring = data["features"][0]["geometry"]["coordinates"][0]
    # Convert [lon, lat] from GeoJSON to [lat, lon]
    eez_polygon = [[c[1], c[0]] for c in ring]

    # Offshore Bay of Bengal point inside EEZ: (15.0N, 83.5E)
    assert point_in_polygon(15.0, 83.5, eez_polygon) is True

    # Far-offshore point well beyond EEZ: (15.0N, 95.0E)
    assert point_in_polygon(15.0, 95.0, eez_polygon) is False

    # Inland point west of coastline: Hyderabad (17.38N, 78.48E)
    assert point_in_polygon(17.38, 78.48, eez_polygon) is False


def test_distance_to_polygon_sanity():
    # Square [10, 10] to [11, 11]
    square = [
        [10.0, 10.0],
        [10.0, 11.0],
        [11.0, 11.0],
        [11.0, 10.0],
    ]
    # Point on edge -> distance 0
    d_edge = distance_to_polygon_km(10.0, 10.5, square)
    assert d_edge is not None
    assert d_edge == pytest.approx(0.0, abs=1e-3)

    # Point 1 deg away in latitude -> approx 111.32 km
    d_away = distance_to_polygon_km(9.0, 10.5, square)
    assert d_away is not None
    assert abs(d_away - 111.32) < 5.0


def test_nearest_zone():
    user = (16.98, 82.25)  # Kakinada
    zones = [
        {"center": [17.6, 83.5], "confidence": 0.75},  # Vizag area ~150 km
        {"center": [16.5, 82.5], "confidence": 0.82},  # Nearby area ~60 km
    ]
    nz = nearest_zone(user, zones)
    assert nz is not None
    assert nz["center"] == [16.5, 82.5]
    assert abs(nz["distance_km"] - 60.7) <= 2.0
    assert 130.0 <= nz["bearing_deg"] <= 160.0

    # Empty inputs
    assert nearest_zone(None, zones) is None
    assert nearest_zone(user, []) is None
