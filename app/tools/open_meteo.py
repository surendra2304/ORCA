from datetime import datetime, timezone
import logging
from typing import Any, Dict, Optional

from app.config import settings
from app.tools.http import FetchError, fetch_json

logger = logging.getLogger(__name__)

OPEN_METEO_FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
OPEN_METEO_MARINE_URL = "https://marine-api.open-meteo.com/v1/marine"


def kmh_to_knots(v: Optional[float]) -> Optional[float]:
    """
    Pure helper to convert km/h to knots using the 0.53996 factor.
    Returns None if v is None.
    """
    if v is None:
        return None
    return round(float(v) * 0.53996, 2)


async def get_weather(lat: float, lon: float) -> Dict[str, Any]:
    """
    Fetches weather forecast from Open-Meteo and normalizes it to the exact
    WeatherAgent payload schema.
    """
    params = {
        "latitude": lat,
        "longitude": lon,
        "hourly": "wind_speed_10m,wind_gusts_10m,precipitation,lightning_potential",
        "wind_speed_unit": "kn",
        "timezone": "Asia/Kolkata",
        "forecast_days": 2,
        "past_hours": 0,
    }

    data = await fetch_json(
        OPEN_METEO_FORECAST_URL,
        params=params,
        cache_ttl_s=settings.CACHE_TTL_S,
        provider="open-meteo:forecast",
    )

    hourly = data.get("hourly", {}) if isinstance(data, dict) else {}
    times = hourly.get("time", [])
    winds = hourly.get("wind_speed_10m", [])
    gusts = hourly.get("wind_gusts_10m", [])
    precips = hourly.get("precipitation", [])
    lightnings = hourly.get("lightning_potential")

    # Find the first valid hour index
    start_idx = 0
    for idx, w in enumerate(winds):
        if w is not None:
            start_idx = idx
            break

    first_wind = float(winds[start_idx]) if start_idx < len(winds) and winds[start_idx] is not None else 0.0
    first_gust = (
        float(gusts[start_idx])
        if start_idx < len(gusts) and gusts[start_idx] is not None
        else first_wind
    )
    first_precip = (
        float(precips[start_idx])
        if start_idx < len(precips) and precips[start_idx] is not None
        else 0.0
    )

    # Determine lightning risk:
    # If variable is absent entirely or None -> None (rule engine treats as unknown)
    # <= 0 or null -> "low"
    # < LIGHTNING_HIGH_JKG -> "moderate"
    # >= LIGHTNING_HIGH_JKG -> "high"
    lightning_risk: Optional[str] = None
    if "lightning_potential" in hourly and lightnings is not None:
        first_lp = lightnings[start_idx] if start_idx < len(lightnings) else None
        if first_lp is None or first_lp <= 0:
            lightning_risk = "low"
        elif first_lp < settings.LIGHTNING_HIGH_JKG:
            lightning_risk = "moderate"
        else:
            lightning_risk = "high"

    # Build forecast_hours: next 24 hours (skip nulls, include what exists)
    forecast_hours = []
    end_idx = min(len(times), start_idx + 24)
    for idx in range(start_idx, end_idx):
        t_str = times[idx]
        w_val = winds[idx] if idx < len(winds) else None
        r_val = precips[idx] if idx < len(precips) else None
        if w_val is None and r_val is None:
            continue

        try:
            hour_int = int(t_str.split("T")[1].split(":")[0])
        except Exception:
            hour_int = idx % 24

        forecast_hours.append({
            "hour": hour_int,
            "wind_knots": float(w_val) if w_val is not None else 0.0,
            "rain_mm": float(r_val) if r_val is not None else 0.0,
        })

    return {
        "source": "open-meteo:forecast",
        "wind_knots": first_wind,
        "gusts_knots": first_gust,
        "rain_mm": first_precip,
        "lightning_risk": lightning_risk,
        "forecast_hours": forecast_hours,
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }


async def get_ocean(lat: float, lon: float) -> Dict[str, Any]:
    """
    Fetches marine forecast from Open-Meteo and normalizes it to the exact
    OceanAgent payload schema. Detects inland/invalid locations.
    """
    params = {
        "latitude": lat,
        "longitude": lon,
        "hourly": "wave_height,wave_period,swell_wave_height,sea_surface_temperature,ocean_current_velocity",
        "timezone": "Asia/Kolkata",
        "forecast_days": 2,
    }

    try:
        data = await fetch_json(
            OPEN_METEO_MARINE_URL,
            params=params,
            cache_ttl_s=settings.CACHE_TTL_S,
            provider="open-meteo:marine",
        )
    except FetchError as fe:
        # Detect inland/no coverage 400 error
        if fe.status_code == 400:
            logger.info("Open-Meteo marine returned 400 (likely inland/no coverage) for (%.4f, %.4f)", lat, lon)
            return {
                "source": "open-meteo:marine",
                "wave_height_m": None,
                "wave_period_s": None,
                "swell_height_m": None,
                "sst_c": None,
                "current_knots": None,
                "tide_state": None,
                "note": "no marine data for this location",
                "fetched_at": datetime.now(timezone.utc).isoformat(),
            }
        raise

    hourly = data.get("hourly", {}) if isinstance(data, dict) else {}
    waves = hourly.get("wave_height", [])
    periods = hourly.get("wave_period", [])
    swells = hourly.get("swell_wave_height", [])
    ssts = hourly.get("sea_surface_temperature", [])
    currents = hourly.get("ocean_current_velocity", [])

    has_any_wave = any(w is not None for w in waves)
    if not has_any_wave:
        logger.info("Open-Meteo marine returned all-null wave fields for (%.4f, %.4f)", lat, lon)
        return {
            "source": "open-meteo:marine",
            "wave_height_m": None,
            "wave_period_s": None,
            "swell_height_m": None,
            "sst_c": None,
            "current_knots": None,
            "tide_state": None,
            "note": "no marine data for this location",
            "fetched_at": datetime.now(timezone.utc).isoformat(),
        }

    first_wave = next((float(w) for w in waves if w is not None), None)
    first_period = next((float(p) for p in periods if p is not None), None)
    first_swell = next((float(s) for s in swells if s is not None), None)
    first_sst = next((float(t) for t in ssts if t is not None), None)
    raw_current = next((float(c) for c in currents if c is not None), None)
    first_current = kmh_to_knots(raw_current)

    return {
        "source": "open-meteo:marine",
        "wave_height_m": first_wave,
        "wave_period_s": first_period,
        "swell_height_m": first_swell,
        "sst_c": first_sst,
        "current_knots": first_current,
        "tide_state": None,
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }
