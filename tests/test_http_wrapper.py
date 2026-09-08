import asyncio
import time
import httpx
import pytest

from app.config import settings
from app.tools.http import (
    FetchError,
    _cache_store,
    clear_cache,
    fetch_json,
    make_cache_key,
    set_test_transport,
)


@pytest.fixture(autouse=True)
def cleanup_http():
    clear_cache()
    set_test_transport(None)
    yield
    clear_cache()
    set_test_transport(None)


def test_cache_hit_on_repeated_call():
    async def _run():
        call_count = 0

        def handler(request: httpx.Request) -> httpx.Response:
            nonlocal call_count
            call_count += 1
            return httpx.Response(200, json={"test": "data", "count": call_count})

        transport = httpx.MockTransport(handler)
        set_test_transport(transport)

        # First call - cache miss
        res1 = await fetch_json("https://api.example.com/data", params={"q": "1"}, cache_ttl_s=100)
        assert res1.get("test") == "data"
        assert call_count == 1
        assert "_cache" not in res1

        # Second call - cache hit
        res2 = await fetch_json("https://api.example.com/data", params={"q": "1"}, cache_ttl_s=100)
        assert res2.get("test") == "data"
        assert call_count == 1  # Transport was NOT called again
        assert res2.get("_cache", {}).get("hit") is True
        assert "age_s" in res2["_cache"]

    asyncio.run(_run())


def test_retry_on_500_then_success():
    async def _run():
        attempt = 0

        def handler(request: httpx.Request) -> httpx.Response:
            nonlocal attempt
            attempt += 1
            if attempt == 1:
                return httpx.Response(500, json={"error": "server error"})
            return httpx.Response(200, json={"recovered": True})

        transport = httpx.MockTransport(handler)
        set_test_transport(transport)

        res = await fetch_json("https://api.example.com/flaky")
        assert attempt == 2
        assert res.get("recovered") is True

    asyncio.run(_run())


def test_400_with_error_body_raises_fetch_error():
    async def _run():
        def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(
                400,
                json={"error": True, "reason": "Latitude must be in range -90 to 90"},
            )

        transport = httpx.MockTransport(handler)
        set_test_transport(transport)

        with pytest.raises(FetchError) as exc_info:
            await fetch_json("https://api.open-meteo.com/v1/forecast", params={"latitude": 999})

        assert exc_info.value.status_code == 400
        assert "Latitude must be in range" in str(exc_info.value)

    asyncio.run(_run())


def test_stale_fallback_within_max_age():
    async def _run():
        url = "https://api.example.com/marine"
        params = {"lat": 17.68}
        key = make_cache_key(url, params)

        # Poison cache with an entry that is past TTL (900s) but within STALE_MAX_AGE_S (21600s)
        old_ts = time.time() - 3600  # 1 hour old
        _cache_store[key] = {
            "data": {"wave_height": 2.5},
            "timestamp": old_ts,
        }

        # Now make the network transport fail with TransportError
        def handler(request: httpx.Request) -> httpx.Response:
            raise httpx.ConnectError("Network is down")

        transport = httpx.MockTransport(handler)
        set_test_transport(transport)

        res = await fetch_json(url, params=params, cache_ttl_s=60)
        assert res.get("wave_height") == 2.5
        assert res.get("_cache", {}).get("stale") is True
        assert res["_cache"]["age_s"] >= 3600

    asyncio.run(_run())


def test_no_stale_fallback_after_stale_max_age_exceeded():
    async def _run():
        url = "https://api.example.com/marine"
        params = {"lat": 17.68}
        key = make_cache_key(url, params)

        # Poison cache with an entry older than STALE_MAX_AGE_S (6 hours + 10s)
        expired_ts = time.time() - (settings.STALE_MAX_AGE_S + 10)
        _cache_store[key] = {
            "data": {"wave_height": 2.5},
            "timestamp": expired_ts,
        }

        def handler(request: httpx.Request) -> httpx.Response:
            raise httpx.ConnectError("Network is down")

        transport = httpx.MockTransport(handler)
        set_test_transport(transport)

        with pytest.raises(FetchError):
            await fetch_json(url, params=params)

    asyncio.run(_run())
