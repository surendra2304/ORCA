import asyncio
import json
from pathlib import Path
import httpx
import pytest

from app.graph.agents.ocean import OceanAgent
from app.graph.agents.weather import WeatherAgent
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
        assert set(real_payload.keys()) == set(mock_payload.keys()), (
            f"Schema mismatch! Real keys: {set(real_payload.keys())}, Mock keys: {set(mock_payload.keys())}"
        )

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

    asyncio.run(_run())


def test_inland_400_marine_error():
    async def _run():
        def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(400, json={"error": True, "reason": "No marine data available for coordinates"})

        set_test_transport(httpx.MockTransport(handler))

        payload = await get_ocean(17.38, 78.48)
        assert payload["wave_height_m"] is None
        assert payload.get("note") == "no marine data for this location"

    asyncio.run(_run())
