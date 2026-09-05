import logging
from typing import Any, Dict, Optional

from app.config import settings
from app.tools.http import FetchError, fetch_json

logger = logging.getLogger(__name__)

NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search"


async def geocode(name: str) -> Optional[Dict[str, Any]]:
    """
    Geocodes a location name in India using Nominatim OpenStreetMap search.
    Enforces required User-Agent header, 24h caching via GEOCODE_TTL_S,
    and returns {"lat": float, "lon": float, "display_name": str} or None.
    Never logs more than the query and resolved coords.
    """
    clean_name = name.strip()
    if not clean_name:
        return None

    params = {
        "q": clean_name,
        "format": "json",
        "limit": 1,
        "countrycodes": "in",
    }

    try:
        raw_res = await fetch_json(
            NOMINATIM_SEARCH_URL,
            params=params,
            cache_ttl_s=settings.GEOCODE_TTL_S,
            provider="nominatim",
        )

        results = raw_res if isinstance(raw_res, list) else raw_res.get("results", [])
        if not results or not isinstance(results, list):
            logger.info("Geocode query '%s' yielded 0 results", clean_name)
            return None

        top = results[0]
        lat = float(top["lat"])
        lon = float(top["lon"])
        display_name = str(top.get("display_name", clean_name))

        logger.info("Resolved '%s' -> (%.4f, %.4f)", clean_name, lat, lon)
        return {
            "lat": lat,
            "lon": lon,
            "display_name": display_name,
        }

    except FetchError as fe:
        logger.warning("Geocoding failed for '%s': %s", clean_name, fe)
        return None
    except Exception as exc:
        logger.warning("Unexpected geocoding exception for '%s': %s", clean_name, exc)
        return None
