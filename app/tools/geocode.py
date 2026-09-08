import logging
import time
from typing import Any, Dict, Optional

from app.config import settings
from app.tools.http import FetchError, _cache_store, fetch_json, make_cache_key

logger = logging.getLogger(__name__)

NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search"


def _has_non_latin(text: str) -> bool:
    """Returns True if string contains non-ASCII alphabetic characters."""
    return any(ord(c) > 127 and c.isalpha() for c in text)


async def _fetch_nominatim(query_text: str) -> Optional[Dict[str, Any]]:
    params = {
        "q": query_text,
        "format": "json",
        "limit": 1,
        "countrycodes": "in",
    }
    raw_res = await fetch_json(
        NOMINATIM_SEARCH_URL,
        params=params,
        cache_ttl_s=settings.GEOCODE_TTL_S,
        provider="nominatim",
    )
    results = raw_res if isinstance(raw_res, list) else (raw_res.get("results", []) if isinstance(raw_res, dict) else [])
    if not results or not isinstance(results, list):
        return None

    top = results[0]
    lat = float(top["lat"])
    lon = float(top["lon"])
    display_name = str(top.get("display_name", query_text))
    return {
        "lat": lat,
        "lon": lon,
        "display_name": display_name,
        "raw_results": results,
    }


async def geocode(name: str) -> Optional[Dict[str, Any]]:
    """
    Geocodes a location name in India using Nominatim OpenStreetMap search.
    Enforces required User-Agent header, 24h caching via GEOCODE_TTL_S,
    and returns {"lat": float, "lon": float, "display_name": str} or None.

    Native-script tolerance:
    If geocode() with raw name returns None AND the name contains non-Latin characters,
    retries ONCE with a transliterated/Latin form obtained from the LLM.
    Caches both forms.
    """
    clean_name = name.strip()
    if not clean_name:
        return None

    try:
        res = await _fetch_nominatim(clean_name)
        if res:
            logger.info("Resolved '%s' -> (%.4f, %.4f)", clean_name, res["lat"], res["lon"])
            return {
                "lat": res["lat"],
                "lon": res["lon"],
                "display_name": res["display_name"],
            }

        # If raw query returned None and name has non-Latin characters, attempt romanization
        if _has_non_latin(clean_name):
            try:
                from app.llm.client import call_llm
                romanized = await call_llm(
                    prompt=f"Return ONLY the Latin-alphabet romanization of this place name: {clean_name}",
                    system="You are a geographic transliterator. Output ONLY the romanized English spelling of the Indian place name, without punctuation, notes, or explanation.",
                )
                clean_romanized = romanized.strip().strip('"').strip("'").strip()
                if clean_romanized and clean_romanized.lower() != clean_name.lower():
                    logger.info("Retrying geocode for non-Latin '%s' using romanization '%s'", clean_name, clean_romanized)
                    res_romanized = await _fetch_nominatim(clean_romanized)
                    if res_romanized:
                        logger.info("Resolved '%s' via romanization '%s' -> (%.4f, %.4f)", clean_name, clean_romanized, res_romanized["lat"], res_romanized["lon"])
                        # Cache for raw name as well
                        raw_key = make_cache_key(
                            NOMINATIM_SEARCH_URL,
                            {"q": clean_name, "format": "json", "limit": 1, "countrycodes": "in"},
                        )
                        _cache_store[raw_key] = {
                            "data": res_romanized["raw_results"],
                            "timestamp": time.time(),
                        }
                        return {
                            "lat": res_romanized["lat"],
                            "lon": res_romanized["lon"],
                            "display_name": res_romanized["display_name"],
                        }
            except Exception as translit_err:
                logger.warning("Romanization transliteration failed for '%s': %s", clean_name, translit_err)

        logger.info("Geocode query '%s' yielded 0 results", clean_name)
        return None

    except FetchError as fe:
        logger.warning("Geocoding failed for '%s': %s", clean_name, fe)
        return None
    except Exception as exc:
        logger.warning("Unexpected geocoding exception for '%s': %s", clean_name, exc)
        return None
