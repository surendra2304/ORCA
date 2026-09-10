import asyncio
import math
from unittest.mock import MagicMock, patch
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.config import (
    ZONE_INDEX_FORMULA_VERSION,
    ZONE_INDEX_WAVE_W,
    ZONE_INDEX_WAVE_MAX,
    ZONE_INDEX_WIND_W,
    ZONE_INDEX_WIND_MAX,
    ZONE_INDEX_ALERT_MODERATE,
    ZONE_INDEX_ALERT_HIGH,
    ZONE_INDEX_RESTRICTED_SCORE,
)
from app.core.zone_index import compute_zone_index
from app.core.dashboard import run_dashboard, clear_dashboard_cache
from app.tools.erddap_providers import parse_erddap_timeseries
from app.tools.open_meteo import get_sst_timeseries_open_meteo


@pytest.fixture
def client():
    return TestClient(app)


# =====================================================================
# 1. ZONE INDEX UNIT TESTS
# =====================================================================
def test_zone_index_perfect_conditions():
    obs = {
        "wave_height_m": 0.0,
        "wind_speed_knots": 0.0,
        "alert_level": "low",
        "is_restricted": False,
    }
    zi = compute_zone_index(obs)
    assert zi["formula_version"] == ZONE_INDEX_FORMULA_VERSION
    assert zi["score"] == 100.0
    assert zi["band"] == "favourable"
    assert zi["restricted_override"] is False
    assert zi["components"]["wave"]["cost"] == 0.0
    assert zi["components"]["wind"]["cost"] == 0.0
    assert zi["components"]["alerts"]["cost"] == 0.0


def test_zone_index_wave_penalty_capping():
    # wave_height_m = 3.0 -> raw = 3.0 * 16.0 = 48.0, cap is 40.0
    obs = {
        "wave_height_m": 3.0,
        "wind_speed_knots": 0.0,
        "alert_level": "low",
        "is_restricted": False,
    }
    zi = compute_zone_index(obs)
    assert zi["components"]["wave"]["cost"] == ZONE_INDEX_WAVE_MAX
    assert zi["score"] == 100.0 - ZONE_INDEX_WAVE_MAX
    assert zi["band"] == "caution"  # 60.0 is caution (50 <= score < 75)


def test_zone_index_wind_penalty_capping():
    # wind_speed_knots = 30.0 -> raw = 30.0 * 1.5 = 45.0, cap is 30.0
    obs = {
        "wave_height_m": 0.0,
        "wind_speed_knots": 30.0,
        "alert_level": "low",
        "is_restricted": False,
    }
    zi = compute_zone_index(obs)
    assert zi["components"]["wind"]["cost"] == ZONE_INDEX_WIND_MAX
    assert zi["score"] == 100.0 - ZONE_INDEX_WIND_MAX
    assert zi["band"] == "caution"  # 70.0 is caution (50 <= score < 75)


def test_zone_index_hazard_alert_levels():
    for alert, exp_pen in [
        ("low", 0.0),
        ("moderate", ZONE_INDEX_ALERT_MODERATE),
        ("high", ZONE_INDEX_ALERT_HIGH),
        ("critical", ZONE_INDEX_ALERT_HIGH),
    ]:
        obs = {
            "wave_height_m": 0.0,
            "wind_speed_knots": 0.0,
            "alert_level": alert,
            "is_restricted": False,
        }
        zi = compute_zone_index(obs)
        assert zi["components"]["alerts"]["cost"] == exp_pen


def test_zone_index_restricted_override():
    obs = {
        "wave_height_m": 0.0,
        "wind_speed_knots": 0.0,
        "alert_level": "low",
        "is_restricted": True,
    }
    zi = compute_zone_index(obs)
    assert zi["score"] == ZONE_INDEX_RESTRICTED_SCORE
    assert zi["band"] == "avoid"
    assert zi["restricted_override"] is True


def test_zone_index_missing_values_flag():
    obs = {
        "wave_height_m": None,
        "wind_speed_knots": None,
        "alert_level": None,
        "is_restricted": False,
    }
    zi = compute_zone_index(obs)
    assert zi["components"]["wave"]["unavailable"] is True
    assert zi["components"]["wind"]["unavailable"] is True
    assert zi["components"]["alerts"]["unavailable"] is True
    assert zi["score"] == 100.0


def test_zone_index_determinism():
    obs = {
        "wave_height_m": 1.5,
        "wind_speed_knots": 14.0,
        "alert_level": "moderate",
        "is_restricted": False,
    }
    res1 = compute_zone_index(obs)
    res2 = compute_zone_index(obs)
    assert res1 == res2


# =====================================================================
# 2. ZERO-LLM PROOF & DASHBOARD CACHING
# =====================================================================
def test_zero_llm_proof_in_run_dashboard():
    async def _test():
        clear_dashboard_cache()
        with patch("app.llm.client.call_llm") as mock_llm, patch("app.llm.client.call_llm_json") as mock_llm_json:
            res = await run_dashboard(lat=16.98, lon=82.24, vessel_class="small_fishing_boat", mode="mock")
            mock_llm.assert_not_called()
            mock_llm_json.assert_not_called()
            assert "verdict" in res
            assert "zone_index" in res
            assert res["cached"] is False

    asyncio.run(_test())


def test_dashboard_caching_and_clear():
    async def _test():
        clear_dashboard_cache()
        res1 = await run_dashboard(lat=17.0, lon=83.0, vessel_class="small_fishing_boat", mode="mock")
        assert res1["cached"] is False

        res2 = await run_dashboard(lat=17.0, lon=83.0, vessel_class="small_fishing_boat", mode="mock")
        assert res2["cached"] is True
        assert res2["verdict"] == res1["verdict"]

        clear_dashboard_cache()
        res3 = await run_dashboard(lat=17.0, lon=83.0, vessel_class="small_fishing_boat", mode="mock")
        assert res3["cached"] is False

    asyncio.run(_test())


# =====================================================================
# 3. TIMESERIES & ERDDAP
# =====================================================================
def test_parse_erddap_timeseries():
    data = {
        "table": {
            "columnNames": ["time", "latitude", "longitude", "sst"],
            "rows": [
                ["2026-09-01T00:00:00Z", 16.98, 82.24, 28.5],
                ["2026-09-02T00:00:00Z", 16.98, 82.24, 28.7],
            ],
        }
    }
    pts = parse_erddap_timeseries(data, 16.98, 82.24, "sst")
    assert len(pts) == 2
    assert pts[0]["date"] == "2026-09-01"
    assert pts[0]["value"] == 28.5
    assert pts[1]["value"] == 28.7


def test_parse_erddap_timeseries_empty():
    pts = parse_erddap_timeseries({}, 16.98, 82.24, "sst")
    assert pts == []


def test_open_meteo_timeseries_mock():
    async def _test():
        pts = await get_sst_timeseries_open_meteo(lat=16.98, lon=82.24, days=15, mode="mock")
        assert len(pts) == 15
        for p in pts:
            assert "date" in p or "time" in p
            assert "value" in p
            assert 26.0 <= p["value"] <= 32.0

    asyncio.run(_test())



# =====================================================================
# 4. REST API ENDPOINTS
# =====================================================================
def test_api_briefing_success(client):
    with patch("app.llm.client.call_llm") as mock_llm, patch("app.llm.client.call_llm_json") as mock_llm_json:
        resp = client.get("/api/briefing?lat=16.98&lon=82.24&vessel_class=small_fishing_boat&mode=mock")
        assert resp.status_code == 200
        mock_llm.assert_not_called()
        mock_llm_json.assert_not_called()

        data = resp.json()
        assert "verdict" in data
        assert "zone_index" in data
        assert data["zone_index"]["formula_version"] == "zi-1.0"
        assert data["zone_index"]["band"] in ["favourable", "caution", "avoid"]


def test_api_briefing_validation_errors(client):
    # Latitude out of bounds
    resp = client.get("/api/briefing?lat=95.0&lon=82.24")
    assert resp.status_code == 400
    # Longitude out of bounds
    resp = client.get("/api/briefing?lat=16.98&lon=190.0")
    assert resp.status_code == 400
    # Invalid vessel class
    resp = client.get("/api/briefing?lat=16.98&lon=82.24&vessel_class=super_yacht")
    assert resp.status_code == 400


def test_api_timeseries_sst(client):
    resp = client.get("/api/timeseries?lat=16.98&lon=82.24&variable=sst&days=10&mode=mock")
    assert resp.status_code == 200
    data = resp.json()
    assert data["variable"] == "sst"
    assert len(data["points"]) == 10
    assert data["days"] == 10


def test_api_timeseries_chlorophyll_honest_note(client):
    resp = client.get("/api/timeseries?lat=16.98&lon=82.24&variable=chlorophyll&days=10&mode=mock")
    assert resp.status_code == 200
    data = resp.json()
    assert data["variable"] == "chlorophyll"
    assert data["points"] == []
    assert data["note"] is not None
    assert "unavailable" in data["note"].lower()


def test_api_timeseries_invalid_variable(client):
    resp = client.get("/api/timeseries?lat=16.98&lon=82.24&variable=uranium")
    assert resp.status_code == 400


def test_api_zones_mock(client):
    resp = client.get("/api/zones?lat=16.98&lon=82.24&max=3&mode=mock")
    assert resp.status_code == 200
    data = resp.json()
    assert "zones" in data
    assert len(data["zones"]) <= 3
    # Zones sorted by distance
    dists = [z["distance_km"] for z in data["zones"] if "distance_km" in z]
    assert dists == sorted(dists)


def test_api_analysis(client):
    resp = client.get("/api/analysis?lat=16.98&lon=82.24&days=14&mode=mock")
    assert resp.status_code == 200
    data = resp.json()
    assert "sst_stats" in data
    stats = data["sst_stats"]
    assert "mean" in stats
    assert "min" in stats
    assert "max" in stats
    assert "std" in stats
    assert stats["min"] <= stats["mean"] <= stats["max"]


def test_analysis_stats_synthetic_math(client):
    resp = client.get("/api/analysis?lat=16.98&lon=82.24&days=7&mode=mock")
    assert resp.status_code == 200
    data = resp.json()
    stats = data["sst_stats"]
    assert stats["min"] == 27.9
    assert stats["max"] == 28.7
    assert stats["mean"] == 28.32
    assert stats["std"] == 0.276
    assert stats["trend_slope_c_per_day"] == -0.057
    assert stats["front_stability"]["label"] == "high"


def test_api_riskgrid(client):
    resp = client.get("/api/riskgrid?lat=16.98&lon=82.24&rings=2&radius_km=10.0&mode=mock")
    assert resp.status_code == 200
    data = resp.json()
    assert "grid" in data
    # Rings formula: rings * 8 + 1 -> 2 * 8 + 1 = 17
    assert len(data["grid"]) == 17
    assert len(data["rings"]) == 2
    assert data["radius_km"] == 10.0



def test_api_riskgrid_invalid_rings(client):
    resp = client.get("/api/riskgrid?lat=16.98&lon=82.24&rings=10")
    assert resp.status_code == 400


def test_api_geo_layer(client):
    # ports returns JSON list
    resp = client.get("/api/geo/ports")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)

    # eez returns FeatureCollection
    resp_eez = client.get("/api/geo/eez")
    assert resp_eez.status_code == 200
    assert resp_eez.json().get("type") == "FeatureCollection"


def test_api_geo_path_traversal(client):
    resp = client.get("/api/geo/..%2F..%2Fetc%2Fpasswd")
    assert resp.status_code in [400, 404]


def test_api_disasters_all(client):
    resp = client.get("/api/disasters")
    assert resp.status_code == 200
    data = resp.json()
    assert "disasters" in data
    assert data["count"] >= 5
    for item in data["disasters"]:
        assert item.get("source_url", "").startswith("http")
        assert len(item.get("source_name", "")) > 0


def test_api_disasters_single(client):
    resp = client.get("/api/disasters/cyclone-michaung-2023")
    assert resp.status_code == 200
    data = resp.json()
    assert "michaung" in data["id"]
    assert "Michaung" in data["name"]

    # Not found
    resp404 = client.get("/api/disasters/non-existent-cyclone")
    assert resp404.status_code == 404


# =====================================================================
# 5. SCHEMA PARITY CHECK (MOCK vs REAL MODE)
# =====================================================================
def test_schema_parity_mock_vs_real(client):
    # Briefing schema parity
    resp_mock = client.get("/api/briefing?lat=16.98&lon=82.24&vessel_class=small_fishing_boat&mode=mock")
    resp_real = client.get("/api/briefing?lat=16.98&lon=82.24&vessel_class=small_fishing_boat&mode=real")
    assert resp_mock.status_code == 200
    assert resp_real.status_code == 200
    mock_keys = set(resp_mock.json().keys())
    real_keys = set(resp_real.json().keys())
    assert mock_keys ^ real_keys == set(), f"Briefing keys differ: {mock_keys ^ real_keys}"

    # Zones schema parity
    resp_z_mock = client.get("/api/zones?lat=16.98&lon=82.24&max=3&mode=mock")
    resp_z_real = client.get("/api/zones?lat=16.98&lon=82.24&max=3&mode=real")
    assert resp_z_mock.status_code == 200
    assert resp_z_real.status_code == 200
    assert set(resp_z_mock.json().keys()) ^ set(resp_z_real.json().keys()) == set()

    # Timeseries schema parity
    resp_t_mock = client.get("/api/timeseries?lat=16.98&lon=82.24&variable=sst&days=5&mode=mock")
    resp_t_real = client.get("/api/timeseries?lat=16.98&lon=82.24&variable=sst&days=5&mode=real")
    assert resp_t_mock.status_code == 200
    assert resp_t_real.status_code == 200
    assert set(resp_t_mock.json().keys()) ^ set(resp_t_real.json().keys()) == set()
