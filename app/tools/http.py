import asyncio
import logging
import time
from typing import Any, Dict, Optional
import urllib.parse
import httpx

from app.config import settings

logger = logging.getLogger(__name__)


class FetchError(Exception):
    """Raised when an external HTTP fetch fails."""
    def __init__(self, message: str, status_code: Optional[int] = None) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code


# In-memory TTL cache store: key -> {"data": dict, "timestamp": float}
_cache_store: Dict[str, Dict[str, Any]] = {}

_client: Optional[httpx.AsyncClient] = None
_test_transport: Optional[httpx.BaseTransport] = None


def set_test_transport(transport: Optional[httpx.BaseTransport]) -> None:
    """Sets a test transport (e.g. httpx.MockTransport) and resets the client."""
    global _client, _test_transport
    _test_transport = transport
    _client = None


def get_client() -> httpx.AsyncClient:
    """Returns the managed httpx.AsyncClient singleton."""
    global _client
    if _client is None or _client.is_closed:
        headers = {
            "User-Agent": "ORCA/0.1 (marine decision support; https://github.com/surendra2304/ORCA)"
        }
        if _test_transport is not None:
            _client = httpx.AsyncClient(transport=_test_transport, headers=headers)
        else:
            _client = httpx.AsyncClient(headers=headers)
    return _client


def clear_cache() -> None:
    """Clears all in-memory cache entries."""
    _cache_store.clear()


def make_cache_key(url: str, params: Optional[Dict[str, Any]]) -> str:
    if not params:
        return url
    sorted_items = sorted((str(k), str(v)) for k, v in params.items())
    query_str = urllib.parse.urlencode(sorted_items)
    return f"{url}?{query_str}"


async def fetch_json(
    url: str,
    params: Optional[Dict[str, Any]] = None,
    *,
    timeout_s: Optional[float] = None,
    cache_ttl_s: Optional[int] = None,
    provider: str = "",
) -> Dict[str, Any]:
    """
    Resilience wrapper for fetching JSON:
    - In-memory TTL cache
    - Retries for TransportError, 5xx (0.5s), and 429 (1.5s)
    - Stale cache fallback up to STALE_MAX_AGE_S on total failure
    - Open-Meteo 400 error body convention handling
    - Structured INFO logging
    """
    timeout = timeout_s if timeout_s is not None else settings.HTTP_TIMEOUT_S
    ttl = cache_ttl_s if cache_ttl_s is not None else settings.CACHE_TTL_S
    max_stale_age = settings.STALE_MAX_AGE_S

    parsed_url = urllib.parse.urlparse(url)
    host = parsed_url.netloc or url
    prov_label = provider or host

    cache_key = make_cache_key(url, params)
    now = time.time()

    # 1. Fresh Cache check
    if cache_key in _cache_store:
        entry = _cache_store[cache_key]
        age_s = int(now - entry["timestamp"])
        if age_s <= ttl:
            logger.info("Provider: %s, host: %s, cache: hit (age %ds), status: 200", prov_label, host, age_s)
            cached_data = entry["data"]
            if isinstance(cached_data, dict):
                cached_payload = dict(cached_data)
                cached_payload["_cache"] = {"hit": True, "age_s": age_s}
                return cached_payload
            return cached_data

    client = get_client()

    # 2. Execute request with retries
    attempt = 0
    max_attempts = 1 + settings.HTTP_RETRIES
    last_error: Optional[Exception] = None
    response: Optional[httpx.Response] = None

    while attempt < max_attempts:
        attempt += 1
        try:
            response = await client.get(url, params=params, timeout=timeout)

            # Open-Meteo 400 error convention: {"error": true, "reason": "..."}
            if response.status_code == 400:
                try:
                    err_body = response.json()
                    if isinstance(err_body, dict) and (err_body.get("error") is True or "reason" in err_body):
                        reason = err_body.get("reason", "Open-Meteo request error")
                        logger.warning("Provider: %s, host: %s, cache: miss, status: 400, reason: %s", prov_label, host, reason)
                        raise FetchError(f"Open-Meteo error: {reason}", status_code=400)
                except (ValueError, TypeError):
                    pass
                raise FetchError(f"HTTP 400 Bad Request from {host}", status_code=400)

            # Retry on 429
            if response.status_code == 429:
                if attempt < max_attempts:
                    logger.warning("Provider: %s, host: %s, 429 Rate Limited. Retrying after 1.5s...", prov_label, host)
                    await asyncio.sleep(1.5)
                    continue
                else:
                    raise FetchError("HTTP 429 Rate Limit Exceeded", status_code=429)

            # Retry on 5xx
            if 500 <= response.status_code < 600:
                if attempt < max_attempts:
                    logger.warning("Provider: %s, host: %s, server error %d. Retrying after 0.5s...", prov_label, host, response.status_code)
                    await asyncio.sleep(0.5)
                    continue
                else:
                    raise FetchError(f"HTTP {response.status_code} Server Error", status_code=response.status_code)

            # Other 4xx
            if 400 <= response.status_code < 500:
                raise FetchError(f"HTTP {response.status_code} Client Error", status_code=response.status_code)

            response.raise_for_status()
            data = response.json()

            # Store successful response in cache
            _cache_store[cache_key] = {"data": data, "timestamp": time.time()}
            logger.info("Provider: %s, host: %s, cache: miss, status: %d", prov_label, host, response.status_code)
            return data

        except (httpx.TransportError, httpx.TimeoutException) as exc:
            last_error = exc
            if attempt < max_attempts:
                logger.warning("Provider: %s, host: %s, transport error %s. Retrying after 0.5s...", prov_label, host, exc)
                await asyncio.sleep(0.5)
                continue
        except FetchError as fe:
            last_error = fe
            break
        except Exception as exc:
            last_error = exc
            break

    # 3. Total failure -> Stale Cache Fallback
    now = time.time()
    if cache_key in _cache_store:
        stale_entry = _cache_store[cache_key]
        stale_age_s = int(now - stale_entry["timestamp"])
        if stale_age_s < max_stale_age:
            logger.info("Provider: %s, host: %s, cache: stale (age %ds), status: fallback", prov_label, host, stale_age_s)
            stale_data = stale_entry["data"]
            if isinstance(stale_data, dict):
                stale_payload = dict(stale_data)
                stale_payload["_cache"] = {"stale": True, "age_s": stale_age_s}
                return stale_payload
            return stale_data

    # No stale cache available
    err_msg = str(last_error) if last_error else "Failed to fetch JSON"
    status_code = getattr(last_error, "status_code", None)
    logger.error("Provider: %s, host: %s failed: %s (no stale cache available)", prov_label, host, err_msg)
    raise FetchError(err_msg, status_code=status_code)
