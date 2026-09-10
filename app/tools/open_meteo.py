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
        "current": "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m",
        "hourly": "temperature_2m,precipitation,weather_code,wind_speed_10m,wind_gusts_10m,lightning_potential",
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

    current = data.get("current", {}) if isinstance(data, dict) else {}
    hourly = data.get("hourly", {}) if isinstance(data, dict) else {}
    times = hourly.get("time", [])
    winds = hourly.get("wind_speed_10m", [])
    gusts = hourly.get("wind_gusts_10m", [])
    precips = hourly.get("precipitation", [])
    temps = hourly.get("temperature_2m", [])
    codes = hourly.get("weather_code", [])
    lightnings = hourly.get("lightning_potential")

    # Find the current hour in IST
    from datetime import timedelta
    ist_now = datetime.now(timezone(timedelta(hours=5, minutes=30)))
    cur_hour_str = ist_now.strftime("%Y-%m-%dT%H:00")

    start_idx = 0
    for idx, t in enumerate(times):
        if t >= cur_hour_str:
            start_idx = idx
            break
    else:
        # Fallback for mock fixtures where timestamp might be older
        for idx, w in enumerate(winds):
            if w is not None:
                start_idx = idx
                break

    if current.get("wind_speed_10m") is not None:
        first_wind = float(current["wind_speed_10m"])
    elif start_idx < len(winds) and winds[start_idx] is not None:
        first_wind = float(winds[start_idx])
    else:
        first_wind = 0.0

    if current.get("wind_gusts_10m") is not None:
        first_gust = float(current["wind_gusts_10m"])
    elif start_idx < len(gusts) and gusts[start_idx] is not None:
        first_gust = float(gusts[start_idx])
    else:
        first_gust = first_wind

    if current.get("precipitation") is not None:
        first_precip = float(current["precipitation"])
    elif start_idx < len(precips) and precips[start_idx] is not None:
        first_precip = float(precips[start_idx])
    else:
        first_precip = 0.0

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

    def _weather_code_desc(code: Optional[int]) -> str:
        if code is None:
            return "Clear"
        if code == 0:
            return "Clear sky"
        if code in (1, 2):
            return "Partly cloudy"
        if code == 3:
            return "Overcast"
        if code in (45, 48):
            return "Foggy"
        if code in (51, 53, 55):
            return "Drizzle"
        if code in (61, 63, 65):
            return "Rain"
        if code in (80, 81, 82):
            return "Rain showers"
        if code in (95, 96, 99):
            return "Thunderstorm"
        return "Moderate"

    # Build forecast_hours: next 24 hours (skip nulls, include what exists)
    forecast_hours = []
    end_idx = min(len(times), start_idx + 24)
    for idx in range(start_idx, end_idx):
        t_str = times[idx]
        w_val = winds[idx] if idx < len(winds) else None
        r_val = precips[idx] if idx < len(precips) else None
        temp_val = temps[idx] if idx < len(temps) else None
        code_val = codes[idx] if idx < len(codes) else None
        if w_val is None and r_val is None:
            continue

        try:
            hour_int = int(t_str.split("T")[1].split(":")[0])
        except Exception:
            hour_int = idx % 24

        item = {
            "hour": hour_int,
            "wind_knots": float(w_val) if w_val is not None else 0.0,
            "rain_mm": float(r_val) if r_val is not None else 0.0,
        }
        if temp_val is not None:
            item["temp_c"] = float(temp_val)
        if code_val is not None:
            item["condition"] = _weather_code_desc(code_val)
        forecast_hours.append(item)

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
        "current": "wave_height,wave_direction,wave_period,wind_wave_height,swell_wave_height",
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
                "chlorophyll_mg_m3": None,
                "note": "no marine data for this location",
                "fetched_at": datetime.now(timezone.utc).isoformat(),
            }
        raise

    current = data.get("current", {}) if isinstance(data, dict) else {}
    hourly = data.get("hourly", {}) if isinstance(data, dict) else {}
    waves = hourly.get("wave_height", [])
    periods = hourly.get("wave_period", [])
    swells = hourly.get("swell_wave_height", [])
    ssts = hourly.get("sea_surface_temperature", [])
    currents = hourly.get("ocean_current_velocity", [])

    has_any_wave = any(w is not None for w in waves) or (current.get("wave_height") is not None)
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
            "chlorophyll_mg_m3": None,
            "note": "no marine data for this location",
            "fetched_at": datetime.now(timezone.utc).isoformat(),
        }

    if current.get("wave_height") is not None:
        first_wave = float(current["wave_height"])
    else:
        first_wave = next((float(w) for w in waves if w is not None), None)

    if current.get("wave_period") is not None:
        first_period = float(current["wave_period"])
    else:
        first_period = next((float(p) for p in periods if p is not None), None)

    if current.get("swell_wave_height") is not None:
        first_swell = float(current["swell_wave_height"])
    else:
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
        "chlorophyll_mg_m3": None,
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }


async def get_sst_timeseries_open_meteo(
    lat: float,
    lon: float,
    days: int = 30,
    mode: str = "mock",
) -> List[Dict[str, Any]]:
    """
    Fetches SST timeseries from Open-Meteo Marine API with past_days=days (capped at 92).
    Downsamples hourly values to daily mean, preserving nulls.
    In mock mode, returns deterministic synthetic series over past N days.
    """
    from datetime import date, timedelta
    days = max(1, min(92, int(days)))

    if mode == "mock":
        today = date.today()
        points = []
        base_sst = 28.5 - abs(lat - 15.0) * 0.1
        for i in range(days - 1, -1, -1):
            d = today - timedelta(days=i)
            # deterministic slight daily fluctuation
            variation = round(((i * 7) % 11 - 5) * 0.08, 2)
            val = round(base_sst + variation, 2)
            points.append({"date": d.isoformat(), "value": val})
        return points

    # Real mode
    params = {
        "latitude": lat,
        "longitude": lon,
        "hourly": "sea_surface_temperature",
        "past_days": days,
        "forecast_days": 1,
        "timezone": "Asia/Kolkata",
    }

    try:
        data = await fetch_json(
            OPEN_METEO_MARINE_URL,
            params=params,
            cache_ttl_s=settings.CACHE_TTL_S,
            provider="open-meteo:marine",
        )
    except FetchError as fe:
        logger.warning("Open-Meteo marine timeseries fetch error: %s", fe)
        return []

    hourly = data.get("hourly", {}) if isinstance(data, dict) else {}
    times = hourly.get("time", [])
    ssts = hourly.get("sea_surface_temperature", [])

    from collections import defaultdict
    daily_values: Dict[str, List[float]] = defaultdict(list)
    null_dates: set = set()

    for t_str, sst_val in zip(times, ssts):
        date_str = str(t_str)[:10]
        if len(date_str) == 10 and date_str[4] == "-" and date_str[7] == "-":
            if sst_val is not None:
                try:
                    daily_values[date_str].append(float(sst_val))
                except (ValueError, TypeError):
                    null_dates.add(date_str)
            else:
                null_dates.add(date_str)

    all_dates = sorted(set(daily_values.keys()) | null_dates)
    points = []
    for d in all_dates:
        vals = daily_values.get(d, [])
        mean_val = round(sum(vals) / len(vals), 2) if vals else None
        points.append({"date": d, "value": mean_val})

    return points[-days:] if len(points) > days else points

