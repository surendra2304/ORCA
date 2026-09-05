import asyncio
import json
from pathlib import Path
import httpx
import pytest

from app.graph.resolver import resolve_entities, resolver_node
from app.graph.trace import TraceCollector
from app.tools.http import clear_cache, set_test_transport

FIXTURES_DIR = Path(__file__).parent / "fixtures"


@pytest.fixture(autouse=True)
def cleanup():
    clear_cache()
    set_test_transport(None)
    yield
    clear_cache()
    set_test_transport(None)


def test_resolve_entities_with_existing_coords():
    async def _run():
        entities = {"lat": 17.6868, "lon": 83.2185, "location_name": "Visakhapatnam"}
        lat, lon = await resolve_entities(entities)
        assert lat == 17.6868
        assert lon == 83.2185

    asyncio.run(_run())


def test_resolve_entities_with_location_name_geocoding():
    async def _run():
        fixture_path = FIXTURES_DIR / "nominatim_vizag.json"
        with open(fixture_path, "r", encoding="utf-8") as f:
            nominatim_data = json.load(f)

        def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(200, json=nominatim_data)

        set_test_transport(httpx.MockTransport(handler))

        entities = {"lat": None, "lon": None, "location_name": "Visakhapatnam"}
        lat, lon = await resolve_entities(entities)
        assert lat == 17.6868
        assert lon == 83.2185

    asyncio.run(_run())


def test_resolve_entities_with_empty_or_none():
    async def _run():
        assert await resolve_entities({}) == (None, None)
        assert await resolve_entities(None) == (None, None)
        assert await resolve_entities({"lat": None, "lon": None, "location_name": ""}) == (None, None)

    asyncio.run(_run())


def test_resolver_node_in_mock_mode_emits_no_events():
    async def _run():
        collector = TraceCollector()
        state = {
            "mode": "mock",
            "entities": {"lat": None, "lon": None, "location_name": "Visakhapatnam"},
        }
        result = await resolver_node(state, collector)
        assert result == {}
        assert len(collector.events) == 0

    asyncio.run(_run())


def test_resolver_node_in_real_mode_emits_events():
    async def _run():
        fixture_path = FIXTURES_DIR / "nominatim_vizag.json"
        with open(fixture_path, "r", encoding="utf-8") as f:
            nominatim_data = json.load(f)

        def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(200, json=nominatim_data)

        set_test_transport(httpx.MockTransport(handler))

        collector = TraceCollector()
        state = {
            "mode": "real",
            "entities": {"lat": None, "lon": None, "location_name": "Visakhapatnam"},
        }
        result = await resolver_node(state, collector)

        assert result["entities"]["lat"] == 17.6868
        assert result["entities"]["lon"] == 83.2185

        event_types = [e["event"] for e in collector.events]
        assert event_types == ["agent_started", "agent_result"]
        assert collector.events[0]["agent"] == "resolver"
        assert collector.events[1]["agent"] == "resolver"
        assert collector.events[1]["data"]["status"] == "ok"

    asyncio.run(_run())
