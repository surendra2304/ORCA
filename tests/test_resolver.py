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


def test_geocode_native_script_retry_with_llm_transliteration():
    """
    Check 8: Unit test evidence for native-script retry.
    MockTransport: First Nominatim call with native script returns empty [];
    LLM transliteration called once to produce romanized name;
    Retry with romanized name resolves successfully.
    """
    from unittest.mock import AsyncMock, patch

    async def _run():
        calls = []

        def handler(request: httpx.Request) -> httpx.Response:
            url_str = str(request.url)
            calls.append(url_str)
            if "Visakhapatnam" in url_str:
                return httpx.Response(
                    200,
                    json=[{
                        "lat": "17.6868",
                        "lon": "83.2185",
                        "display_name": "Visakhapatnam, Andhra Pradesh, India",
                    }],
                )
            # Native script or other returns empty
            return httpx.Response(200, json=[])

        set_test_transport(httpx.MockTransport(handler))

        mock_llm = AsyncMock(return_value="Visakhapatnam")
        with patch("app.llm.client.call_llm", mock_llm):
            entities = {"lat": None, "lon": None, "location_name": "विशाखापत्तनम"}
            lat, lon = await resolve_entities(entities)

            assert lat == 17.6868
            assert lon == 83.2185
            # LLM transliteration was called exactly once
            assert mock_llm.await_count == 1
            # Nominatim was called at least twice (original native script + romanized retry)
            assert len(calls) >= 2

    asyncio.run(_run())


def test_geocode_latin_script_does_not_invoke_llm_transliteration():
    """
    Check 8: Confirm the LLM transliteration fallback is NOT invoked for Latin-script names.
    """
    from unittest.mock import AsyncMock, patch

    async def _run():
        def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(200, json=[])

        set_test_transport(httpx.MockTransport(handler))

        mock_llm = AsyncMock(return_value="SomePlace")
        with patch("app.llm.client.call_llm", mock_llm):
            entities = {"lat": None, "lon": None, "location_name": "NonExistentPort"}
            lat, lon = await resolve_entities(entities)

            assert lat is None
            assert lon is None
            # LLM fallback must NOT be called for Latin-script names
            mock_llm.assert_not_called()

    asyncio.run(_run())

