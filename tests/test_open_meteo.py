import asyncio
import json
from pathlib import Path
import httpx
import pytest

from app.config import settings
from app.graph.agents.ocean import OceanAgent
from app.graph.agents.weather import WeatherAgent
from app.graph.trace import TraceCollector
from app.tools.http import clear_cache, set_test_transport
from app.tools.open_meteo import get_ocean, get_weather, kmh_to_knots

FIXTURES_DIR = Path(__file__).parent / "fixtures"


@pytest.fixture(autouse=True)
def cleanup():
    clear_cache()
    set_test_transport(None)
    yield
    clear_cache()
    set_test_transport(None)


def test_kmh_to_knots_helper():
    assert kmh_to_knots(None) is None
    assert kmh_to_knots(0.0) == 0.0
    # 10 km/h * 0.53996 = 5.3996 -> 5.4
    assert kmh_to_knots(10.0) == 5.4
    # 2.5 km/h * 0.53996 = 1.3499 -> 1.35
    assert kmh_to_knots(2.5) == 1.35


def test_weather_forecast_normalization_schema_lock():
    async def _run():
        fixture_path = FIXTURES_DIR / "open_meteo_forecast.json"
        with open(fixture_path, "r", encoding="utf-8") as f:
            fixture_data = json.load(f)

        def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(200, json=fixture_data)

        set_test_transport(httpx.MockTransport(handler))

        # Real normalized payload
        real_payload = await get_weather(17.68, 83.22)

        # Mock payload from WeatherAgent
        weather_agent = WeatherAgent()
        mock_payload = await weather_agent.execute({})

        # Programmatic schema lock check: EXACT same key set
        assert set(real_payload.keys()) == set(mock_payload.keys()), (
            f"Schema mismatch! Real keys: {set(real_payload.keys())}, Mock keys: {set(mock_payload.keys())}"
        )

        # Verify field properties
        assert real_payload["source"] == "open-meteo:forecast"
        assert isinstance(real_payload["wind_knots"], float)
        assert isinstance(real_payload["gusts_knots"], float)
        assert isinstance(real_payload["rain_mm"], float)
        assert real_payload["lightning_risk"] in ("low", "moderate", "high", None)
        assert len(real_payload["forecast_hours"]) >= 6

        for fh in real_payload["forecast_hours"]:
            assert isinstance(fh["hour"], int)
            assert isinstance(fh["wind_knots"], float)
            assert isinstance(fh["rain_mm"], float)

    asyncio.run(_run())


def test_marine_forecast_normalization_schema_lock():
    async def _run():
        fixture_path = FIXTURES_DIR / "open_meteo_marine.json"
        with open(fixture_path, "r", encoding="utf-8") as f:
            fixture_data = json.load(f)

        def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(200, json=fixture_data)

        set_test_transport(httpx.MockTransport(handler))

        real_payload = await get_ocean(17.68, 83.22)

        ocean_agent = OceanAgent()
        mock_payload = await ocean_agent.execute({})

        # Programmatic schema lock check: EXACT same key set
        key_diff = set(real_payload.keys()) ^ set(mock_payload.keys())
        assert key_diff == set(), (
            f"Schema mismatch! Real keys: {set(real_payload.keys())}, Mock keys: {set(mock_payload.keys())}, Diff: {key_diff}"
        )

        # Schema v1.3 verification
        assert "chlorophyll_mg_m3" in real_payload
        assert real_payload["chlorophyll_mg_m3"] is None
        assert "chlorophyll_mg_m3" in mock_payload
        assert mock_payload["chlorophyll_mg_m3"] == 1.2
        assert mock_payload["source"] == "mock:INCOIS-OSF"

        # Value checks
        assert real_payload["source"] == "open-meteo:marine"
        assert real_payload["wave_height_m"] == 1.8
        assert real_payload["wave_period_s"] == 8.5
        assert real_payload["swell_height_m"] == 1.4
        assert real_payload["sst_c"] == 28.2
        # 2.5 km/h * 0.53996 = 1.35 kn
        assert real_payload["current_knots"] == 1.35
        assert real_payload["tide_state"] is None

    asyncio.run(_run())


def test_inland_all_null_wave_fields():
    async def _run():
        inland_fixture = {
            "latitude": 17.38,
            "longitude": 78.48,
            "hourly": {
                "time": ["2026-09-06T00:00", "2026-09-06T01:00"],
                "wave_height": [None, None],
                "wave_period": [None, None],
                "swell_wave_height": [None, None],
                "sea_surface_temperature": [None, None],
                "ocean_current_velocity": [None, None],
            },
        }

        def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(200, json=inland_fixture)

        set_test_transport(httpx.MockTransport(handler))

        payload = await get_ocean(17.38, 78.48)
        assert payload["wave_height_m"] is None
        assert payload.get("note") == "no marine data for this location"
        assert payload["source"] == "open-meteo:marine"
        assert payload["chlorophyll_mg_m3"] is None

    asyncio.run(_run())


def test_inland_400_marine_error():
    async def _run():
        def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(400, json={"error": True, "reason": "No marine data available for coordinates"})

        set_test_transport(httpx.MockTransport(handler))

        payload = await get_ocean(17.38, 78.48)
        assert payload["wave_height_m"] is None
        assert payload.get("note") == "no marine data for this location"
        assert payload["chlorophyll_mg_m3"] is None

    asyncio.run(_run())


def test_ocean_agent_mock_mode_identity():
    """Mock mode maintains exact canned identity and schema v1.3 chlorophyll."""
    async def _run():
        agent = OceanAgent()
        payload = await agent.execute({})
        assert payload["source"] == "mock:INCOIS-OSF"
        assert payload["chlorophyll_mg_m3"] == 1.2
        assert payload["sst_c"] == 28.4
        assert "note" not in payload

    asyncio.run(_run())


def test_ocean_agent_real_erddap_unset(monkeypatch):
    """When ERDDAP is unset, real mode emits zero ERDDAP tool events and source remains open-meteo:marine."""
    async def _run():
        monkeypatch.setattr(settings, "INCOIS_ERDDAP_BASE_URL", "")
        monkeypatch.setattr(settings, "INCOIS_ERDDAP_SST_DATASET", "")
        monkeypatch.setattr(settings, "INCOIS_ERDDAP_CHL_DATASET", "")

        fixture_path = FIXTURES_DIR / "open_meteo_marine.json"
        with open(fixture_path, "r", encoding="utf-8") as f:
            fixture_data = json.load(f)

        def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(200, json=fixture_data)

        set_test_transport(httpx.MockTransport(handler))

        collector = TraceCollector()
        agent = OceanAgent()
        state = {
            "mode": "real",
            "entities": {"lat": 17.68, "lon": 83.22},
        }

        payload = await agent.run(collector, state)

        tool_calls = [e for e in collector.events if e["event"] == "tool_called"]
        assert len(tool_calls) == 1
        assert tool_calls[0]["data"]["tool"] == "open_meteo_marine"

        assert payload["source"] == "open-meteo:marine"
        assert payload["sst_c"] == 28.2
        assert payload["chlorophyll_mg_m3"] is None

    asyncio.run(_run())


def test_ocean_agent_real_erddap_configured_success(monkeypatch):
    """When ERDDAP is configured, tool events are emitted, SST replaced, chlorophyll set, and source composed."""
    async def _run():
        monkeypatch.setattr(settings, "INCOIS_ERDDAP_BASE_URL", "https://erddap.incois.gov.in/erddap")
        monkeypatch.setattr(settings, "INCOIS_ERDDAP_SST_DATASET", "OCM-SST")
        monkeypatch.setattr(settings, "INCOIS_ERDDAP_CHL_DATASET", "OCM-CHL")

        fixture_path = FIXTURES_DIR / "open_meteo_marine.json"
        with open(fixture_path, "r", encoding="utf-8") as f:
            open_meteo_data = json.load(f)

        sst_table = {
            "table": {
                "columnNames": ["time", "latitude", "longitude", "sst"],
                "rows": [["2026-09-08T06:00:00Z", 17.68, 83.22, 28.6]],
            }
        }
        chl_table = {
            "table": {
                "columnNames": ["time", "latitude", "longitude", "chlorophyll"],
                "rows": [["2026-09-08T06:00:00Z", 17.68, 83.22, 1.45]],
            }
        }

        def handler(request: httpx.Request) -> httpx.Response:
            url_str = str(request.url)
            if "marine-api.open-meteo.com" in url_str:
                return httpx.Response(200, json=open_meteo_data)
            if "OCM-SST" in url_str:
                return httpx.Response(200, json=sst_table)
            if "OCM-CHL" in url_str:
                return httpx.Response(200, json=chl_table)
            return httpx.Response(404)

        set_test_transport(httpx.MockTransport(handler))

        collector = TraceCollector()
        agent = OceanAgent()
        state = {
            "mode": "real",
            "entities": {"lat": 17.68, "lon": 83.22},
        }

        payload = await agent.run(collector, state)

        tools_called = [e["data"]["tool"] for e in collector.events if e["event"] == "tool_called"]
        assert tools_called == ["open_meteo_marine", "incois_erddap_sst", "incois_erddap_chl"]

        assert payload["source"] == "open-meteo:marine+incois:erddap(sst)+incois:erddap(chl)"
        assert payload["sst_c"] == 28.6  # Replaced with ERDDAP
        assert payload["chlorophyll_mg_m3"] == 1.45
        # abs(28.2 - 28.6) = 0.4 <= 1.5, so no note
        assert payload.get("note") is None

    asyncio.run(_run())


def test_ocean_agent_discrepancy_threshold(monkeypatch):
    """
    Cross-validation:
    diff 2.0 (> 1.5) -> note present with both values.
    diff 0.3 (<= 1.5) -> no note.
    """
    async def _run():
        monkeypatch.setattr(settings, "INCOIS_ERDDAP_BASE_URL", "https://erddap.incois.gov.in/erddap")
        monkeypatch.setattr(settings, "INCOIS_ERDDAP_SST_DATASET", "OCM-SST")
        monkeypatch.setattr(settings, "INCOIS_ERDDAP_CHL_DATASET", "")

        fixture_path = FIXTURES_DIR / "open_meteo_marine.json"
        with open(fixture_path, "r", encoding="utf-8") as f:
            open_meteo_data = json.load(f)

        # Case 1: diff 2.0 (Open-Meteo 28.2 vs ERDDAP 30.2)
        sst_table_diff_2 = {
            "table": {
                "columnNames": ["time", "latitude", "longitude", "sst"],
                "rows": [["2026-09-08T06:00:00Z", 17.68, 83.22, 30.2]],
            }
        }

        def handler_diff_2(request: httpx.Request) -> httpx.Response:
            if "marine-api.open-meteo.com" in str(request.url):
                return httpx.Response(200, json=open_meteo_data)
            return httpx.Response(200, json=sst_table_diff_2)

        set_test_transport(httpx.MockTransport(handler_diff_2))
        collector = TraceCollector()
        agent = OceanAgent()
        state = {"mode": "real", "entities": {"lat": 17.68, "lon": 83.22}}

        payload_diff_2 = await agent.run(collector, state)
        assert payload_diff_2["sst_c"] == 30.2
        assert payload_diff_2.get("note") == "sst sources disagree: open-meteo 28.2 C vs incois 30.2 C"

        # Case 2: diff 0.3 (Open-Meteo 28.2 vs ERDDAP 28.5)
        clear_cache()
        sst_table_diff_03 = {
            "table": {
                "columnNames": ["time", "latitude", "longitude", "sst"],
                "rows": [["2026-09-08T06:00:00Z", 17.68, 83.22, 28.5]],
            }
        }

        def handler_diff_03(request: httpx.Request) -> httpx.Response:
            if "marine-api.open-meteo.com" in str(request.url):
                return httpx.Response(200, json=open_meteo_data)
            return httpx.Response(200, json=sst_table_diff_03)

        set_test_transport(httpx.MockTransport(handler_diff_03))
        collector = TraceCollector()
        payload_diff_03 = await agent.run(collector, state)
        assert payload_diff_03["sst_c"] == 28.5
        assert payload_diff_03.get("note") is None

    asyncio.run(_run())


def test_ocean_agent_real_erddap_partial_failure(monkeypatch):
    """When SST succeeds but CHL fails, tag only for SST and chlorophyll remains None."""
    async def _run():
        monkeypatch.setattr(settings, "INCOIS_ERDDAP_BASE_URL", "https://erddap.incois.gov.in/erddap")
        monkeypatch.setattr(settings, "INCOIS_ERDDAP_SST_DATASET", "OCM-SST")
        monkeypatch.setattr(settings, "INCOIS_ERDDAP_CHL_DATASET", "OCM-CHL")

        fixture_path = FIXTURES_DIR / "open_meteo_marine.json"
        with open(fixture_path, "r", encoding="utf-8") as f:
            open_meteo_data = json.load(f)

        sst_table = {
            "table": {
                "columnNames": ["time", "latitude", "longitude", "sst"],
                "rows": [["2026-09-08T06:00:00Z", 17.68, 83.22, 28.9]],
            }
        }

        def handler(request: httpx.Request) -> httpx.Response:
            url_str = str(request.url)
            if "marine-api.open-meteo.com" in url_str:
                return httpx.Response(200, json=open_meteo_data)
            if "OCM-SST" in url_str:
                return httpx.Response(200, json=sst_table)
            if "OCM-CHL" in url_str:
                return httpx.Response(500, text="CHL error")
            return httpx.Response(404)

        set_test_transport(httpx.MockTransport(handler))
        collector = TraceCollector()
        agent = OceanAgent()
        state = {"mode": "real", "entities": {"lat": 17.68, "lon": 83.22}}

        payload = await agent.run(collector, state)
        assert payload["source"] == "open-meteo:marine+incois:erddap(sst)"
        assert payload["sst_c"] == 28.9
        assert payload["chlorophyll_mg_m3"] is None

    asyncio.run(_run())


def test_ocean_agent_real_erddap_total_failure_fallback(monkeypatch):
    """When ERDDAP returns HTTP 500 or unparseable JSON, falls back cleanly to open-meteo:marine with agent status ok."""
    async def _run():
        monkeypatch.setattr(settings, "INCOIS_ERDDAP_BASE_URL", "https://erddap.incois.gov.in/erddap")
        monkeypatch.setattr(settings, "INCOIS_ERDDAP_SST_DATASET", "OCM-SST")
        monkeypatch.setattr(settings, "INCOIS_ERDDAP_CHL_DATASET", "OCM-CHL")

        fixture_path = FIXTURES_DIR / "open_meteo_marine.json"
        with open(fixture_path, "r", encoding="utf-8") as f:
            open_meteo_data = json.load(f)

        def handler(request: httpx.Request) -> httpx.Response:
            url_str = str(request.url)
            if "marine-api.open-meteo.com" in url_str:
                return httpx.Response(200, json=open_meteo_data)
            if "OCM-SST" in url_str:
                return httpx.Response(500, text="Internal Server Error")
            if "OCM-CHL" in url_str:
                return httpx.Response(200, json={"corrupted_shape": True})
            return httpx.Response(404)

        set_test_transport(httpx.MockTransport(handler))
        collector = TraceCollector()
        agent = OceanAgent()
        state = {"mode": "real", "entities": {"lat": 17.68, "lon": 83.22}}

        payload = await agent.run(collector, state)
        agent_res = next(e for e in collector.events if e["event"] == "agent_result")

        assert agent_res["data"]["status"] == "ok"
        assert payload["source"] == "open-meteo:marine"
        assert "incois" not in payload["source"]
        assert payload["sst_c"] == 28.2  # Original Open-Meteo
        assert payload["chlorophyll_mg_m3"] is None

    asyncio.run(_run())


def test_verdict_input_sources_carries_composed_ocean_source(monkeypatch):
    """input_sources in verdict carries the composed ocean source string end-to-end."""
    from unittest.mock import patch
    from app.graph.build_graph import run_graph

    async def _run():
        monkeypatch.setattr(settings, "INCOIS_ERDDAP_BASE_URL", "https://erddap.incois.gov.in/erddap")
        monkeypatch.setattr(settings, "INCOIS_ERDDAP_SST_DATASET", "OCM-SST")
        monkeypatch.setattr(settings, "INCOIS_ERDDAP_CHL_DATASET", "OCM-CHL")

        fixture_marine = FIXTURES_DIR / "open_meteo_marine.json"
        with open(fixture_marine, "r", encoding="utf-8") as f:
            marine_data = json.load(f)

        fixture_weather = FIXTURES_DIR / "open_meteo_forecast.json"
        with open(fixture_weather, "r", encoding="utf-8") as f:
            weather_data = json.load(f)

        sst_table = {
            "table": {
                "columnNames": ["time", "latitude", "longitude", "sst"],
                "rows": [["2026-09-08T06:00:00Z", 17.68, 83.22, 28.6]],
            }
        }
        chl_table = {
            "table": {
                "columnNames": ["time", "latitude", "longitude", "chlorophyll"],
                "rows": [["2026-09-08T06:00:00Z", 17.68, 83.22, 1.45]],
            }
        }

        def handler(request: httpx.Request) -> httpx.Response:
            url_str = str(request.url)
            if "marine-api.open-meteo.com" in url_str:
                return httpx.Response(200, json=marine_data)
            if "api.open-meteo.com/v1/forecast" in url_str:
                return httpx.Response(200, json=weather_data)
            if "OCM-SST" in url_str:
                return httpx.Response(200, json=sst_table)
            if "OCM-CHL" in url_str:
                return httpx.Response(200, json=chl_table)
            return httpx.Response(404)

        set_test_transport(httpx.MockTransport(handler))

        mock_plan = {
            "needed_agents": ["weather", "ocean"],
            "execution_plan": [["weather", "ocean"]],
            "entities": {
                "lat": 17.68,
                "lon": 83.22,
                "location_name": "Visakhapatnam",
                "date_hint": "today",
            },
        }

        with patch("app.graph.planner.call_llm_json", return_value=mock_plan):
            with patch("app.graph.aggregator.call_llm", return_value="Conditions advisory."):
                final_state, _ = await run_graph(
                    query="Can I go fishing today from Vizag?",
                    language="en",
                    mode="real",
                )

        verdict = final_state.get("verdict", {})
        input_sources = verdict.get("input_sources", {})
        assert input_sources.get("ocean") == "open-meteo:marine+incois:erddap(sst)+incois:erddap(chl)"

    asyncio.run(_run())

