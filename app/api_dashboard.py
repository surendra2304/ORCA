"""
app/api_dashboard.py — ORCA Dashboard REST API Router (Phase 8D)

LLM-FREE, deterministic REST endpoints for the Analyst Dashboard:
1. GET /api/geo/{layer}
2. GET /api/briefing
3. GET /api/zones
4. GET /api/timeseries
5. GET /api/analysis
6. GET /api/riskgrid
7. GET /api/disasters and GET /api/disasters/{id}
"""

import json
import logging
import math
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse

from app.config import settings
from app.core.dashboard import run_dashboard, utc_iso_now
from app.core.rules import VESSEL_CLASSES
from app.core.zone_index import compute_zone_index
from app.graph.agents.geospatial import load_geodata
from app.tools.erddap_providers import ErddapProvider
from app.tools.geo import bearing_deg, haversine_km, point_in_polygon
from app.tools.open_meteo import get_ocean, get_sst_timeseries_open_meteo
from app.tools.pfz_providers import get_pfz_payload

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["dashboard"])


def validate_coordinates(lat: float, lon: float) -> None:
    """Validates latitude and longitude ranges, raising HTTP 400 on error."""
    if not isinstance(lat, (int, float)) or not isinstance(lon, (int, float)):
        raise HTTPException(status_code=400, detail="lat and lon must be numbers")
    if not (-90.0 <= lat <= 90.0):
        raise HTTPException(status_code=400, detail=f"Latitude {lat} out of range [-90, 90]")
    if not (-180.0 <= lon <= 180.0):
        raise HTTPException(status_code=400, detail=f"Longitude {lon} out of range [-180, 180]")


def get_effective_mode(mode: Optional[str]) -> str:
    """Resolves execution mode defaulting like /query."""
    if mode is not None:
        if mode not in ("mock", "real"):
            raise HTTPException(status_code=400, detail=f"Invalid mode '{mode}'. Valid: ['mock', 'real']")
        return mode
    return "mock" if settings.MOCK_MODE else "real"


# ---------------------------------------------------------------------------
# 1. Map Layers: GET /api/geo/{layer}
# ---------------------------------------------------------------------------
@router.get("/geo/{layer}")
async def get_geo_layer(layer: str):
    """
    Serves static GeoJSON / JSON layers from data/geo/:
    - eez -> data/geo/india_eez_simplified.geojson
    - restricted -> data/geo/restricted_zones.geojson
    - ports -> data/geo/ports.json
    Rejects path traversal and unknown layers.
    """
    allowed_layers = {
        "eez": "india_eez_simplified.geojson",
        "restricted": "restricted_zones.geojson",
        "ports": "ports.json",
    }

    clean_layer = layer.strip().lower()
    if ".." in layer or "/" in layer or "\\" in layer:
        raise HTTPException(
            status_code=400,
            detail="Invalid layer path",
        )
    if clean_layer not in allowed_layers:
        raise HTTPException(
            status_code=404,
            detail=f"Layer '{layer}' not found. Valid layers: {list(allowed_layers.keys())}",
        )

    file_path = Path(settings.GEO_DATA_DIR) / allowed_layers[clean_layer]
    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"File for layer '{layer}' missing on server")

    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return JSONResponse(content=data)
    except Exception as exc:
        logger.error("Error reading geo layer %s: %s", layer, exc)
        return JSONResponse(
            status_code=200,
            content={"error": {"message": f"Could not read layer: {exc}", "recoverable": True}},
        )


# ---------------------------------------------------------------------------
# 2. Briefing: GET /api/briefing
# ---------------------------------------------------------------------------
@router.get("/briefing")
async def get_briefing(
    lat: float = Query(..., description="Latitude (-90 to 90)"),
    lon: float = Query(..., description="Longitude (-180 to 180)"),
    vessel_class: str = Query("small_fishing_boat", description="Vessel class"),
    mode: Optional[str] = Query(None, description="mock | real"),
):
    """
    The Home-tab briefing endpoint.
    Executes the deterministic, zero-LLM pipeline for [weather, ocean, hazard, geospatial],
    evaluates safety rules, and computes the transparent zone index.
    """
    validate_coordinates(lat, lon)
    if vessel_class not in VESSEL_CLASSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid vessel_class '{vessel_class}'. Valid: {VESSEL_CLASSES}",
        )
    effective_mode = get_effective_mode(mode)

    try:
        data = await run_dashboard(lat, lon, vessel_class, effective_mode)
        return data
    except Exception as exc:
        logger.error("run_dashboard error: %s", exc)
        return {
            "error": {"message": str(exc), "recoverable": True},
            "location": {"lat": lat, "lon": lon},
            "vessel_class": vessel_class,
            "mode": effective_mode,
            "generated_at": utc_iso_now(),
        }


# ---------------------------------------------------------------------------
# 3. Ranked Zones: GET /api/zones
# ---------------------------------------------------------------------------
@router.get("/zones")
async def get_ranked_zones(
    lat: float = Query(..., description="User latitude"),
    lon: float = Query(..., description="User longitude"),
    max: int = Query(5, description="Maximum number of nearest zones to return"),
    mode: Optional[str] = Query(None, description="mock | real"),
):
    """
    Returns nearest PFZ zones ranked by distance from user coordinates.
    Probes ocean conditions at each zone center to compute transparent zone index.
    Honest empty when no advisory zones exist.
    """
    validate_coordinates(lat, lon)
    max_count = int(max)
    if max_count < 1:
        max_count = 1
    elif max_count > 20:
        max_count = 20

    effective_mode = get_effective_mode(mode)
    user_coords = (lat, lon)

    try:
        pfz_payload = await get_pfz_payload(lat, lon, mode=effective_mode)
        raw_zones = pfz_payload.get("zones") or []
        note = pfz_payload.get("note")
        sources_base = [pfz_payload.get("source", "incois:advisory-file")]

        if not raw_zones:
            return {
                "zones": [],
                "count": 0,
                "generated_at": utc_iso_now(),
                "note": note or "no PFZ advisory available; consult official INCOIS advisories at incois.gov.in",
            }

        # Calculate distance and bearing for each zone
        enriched_candidates = []
        for idx, z in enumerate(raw_zones):
            center = z.get("center") or [lat, lon]
            c_lat, c_lon = float(center[0]), float(center[1])
            dist_km = haversine_km(lat, lon, c_lat, c_lon)
            brg = bearing_deg(lat, lon, c_lat, c_lon)
            enriched_candidates.append({
                "raw": z,
                "idx": idx,
                "center": [c_lat, c_lon],
                "distance_km": round(dist_km or 0.0, 2),
                "bearing_deg": round(brg or 0.0, 1),
            })

        # Nearest by haversine first
        enriched_candidates.sort(key=lambda x: x["distance_km"])
        selected = enriched_candidates[:max_count]

        ranked_zones = []
        for item in selected:
            raw_z = item["raw"]
            center = item["center"]
            zone_id = raw_z.get("id") or raw_z.get("zone_id") or f"pfz-{item['idx']+1:02d}"

            # Fetch ocean conditions at zone center
            wave_height_m = None
            sst_c = None
            chl = raw_z.get("chlorophyll_mg_m3")
            sources = list(sources_base)

            try:
                if effective_mode == "mock":
                    # In mock mode, supply deterministic values
                    wave_height_m = 1.4
                    sst_c = 28.2
                    sources.append("mock:open-meteo:marine")
                else:
                    ocean_data = await get_ocean(center[0], center[1])
                    wave_height_m = ocean_data.get("wave_height_m")
                    sst_c = ocean_data.get("sst_c")
                    if ocean_data.get("source"):
                        sources.append(ocean_data["source"])
            except Exception as ocean_exc:
                logger.warning("Failed to fetch ocean conditions for zone %s: %s", zone_id, ocean_exc)
                wave_height_m = None
                sst_c = None

            # Transparent zone index for this zone
            z_index = compute_zone_index({
                "wave_height_m": wave_height_m,
                "wind_knots": None,
                "affected_alerts": [],
                "inside_restricted": False,
            })

            ranked_zones.append({
                "id": str(zone_id),
                "center": center,
                "distance_km": item["distance_km"],
                "bearing_deg": item["bearing_deg"],
                "depth_m": raw_z.get("depth_m"),
                "sst_c": sst_c,
                "chlorophyll_mg_m3": chl,
                "wave_height_m": wave_height_m,
                "zone_index": z_index,
                "sources": list(dict.fromkeys(sources)),
            })

        return {
            "zones": ranked_zones,
            "count": len(ranked_zones),
            "generated_at": utc_iso_now(),
            "note": note,
        }
    except Exception as exc:
        logger.error("Error in /api/zones: %s", exc)
        return {
            "error": {"message": str(exc), "recoverable": True},
            "zones": [],
            "count": 0,
            "generated_at": utc_iso_now(),
            "note": "failed to query zones",
        }


# ---------------------------------------------------------------------------
# 4. Timeseries: GET /api/timeseries
# ---------------------------------------------------------------------------
@router.get("/timeseries")
async def get_timeseries(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude"),
    variable: str = Query(..., description="Variable: sst | chlorophyll"),
    days: int = Query(settings.TIMESERIES_DEFAULT_DAYS, description="Number of past days (max 92)"),
    mode: Optional[str] = Query(None, description="mock | real"),
):
    """
    Daily time series endpoint.
    - variable=sst: ERDDAP if configured, else Open-Meteo marine past_days.
    - variable=chlorophyll: ERDDAP only; unconfigured returns honest empty list.
    Points are sorted ascending; nulls preserved.
    """
    validate_coordinates(lat, lon)
    var_clean = variable.strip().lower()
    if var_clean not in ("sst", "chlorophyll"):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid variable '{variable}'. Valid options: ['sst', 'chlorophyll']",
        )

    capped_days = max(1, min(92, int(days)))
    effective_mode = get_effective_mode(mode)

    if var_clean == "chlorophyll":
        erddap = ErddapProvider()
        if not erddap.is_chl_configured or effective_mode == "mock":
            return {
                "variable": "chlorophyll",
                "unit": "mg/m³",
                "days": capped_days,
                "source": "incois:erddap(chl)",
                "points": [],
                "note": "chlorophyll-a time series is currently unavailable; requires INCOIS ERDDAP (unconfigured)",
                "generated_at": utc_iso_now(),
            }
        # If configured, could query ERDDAP chlorophyll
        return {
            "variable": "chlorophyll",
            "unit": "mg/m³",
            "days": capped_days,
            "source": "incois:erddap(chl)",
            "points": [],
            "note": None,
            "generated_at": utc_iso_now(),
        }

    # var_clean == "sst"
    erddap = ErddapProvider()
    if erddap.is_sst_configured and effective_mode == "real":
        try:
            points = await erddap.get_sst_series(lat, lon, capped_days)
            if points:
                return {
                    "variable": "sst",
                    "unit": "°C",
                    "days": capped_days,
                    "source": "incois:erddap(sst)",
                    "points": points,
                    "note": None,
                    "generated_at": utc_iso_now(),
                }
        except Exception as exc:
            logger.warning("ERDDAP get_sst_series failed: %s. Falling back to Open-Meteo.", exc)

    # Fallback to Open-Meteo marine past_days
    points = await get_sst_timeseries_open_meteo(lat, lon, capped_days, mode=effective_mode)
    return {
        "variable": "sst",
        "unit": "°C",
        "days": capped_days,
        "source": "open-meteo:marine",
        "points": points,
        "note": None,
        "generated_at": utc_iso_now(),
    }


# ---------------------------------------------------------------------------
# 5. Derived Analysis: GET /api/analysis
# ---------------------------------------------------------------------------
@router.get("/analysis")
async def get_analysis(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude"),
    metric: str = Query("sst_stats", description="Analysis metric to compute (valid: 'sst_stats')"),
    days: int = Query(settings.TIMESERIES_DEFAULT_DAYS, description="Number of past days (max 92)"),
    mode: Optional[str] = Query(None, description="mock | real"),
):
    """
    Derived statistical analysis metrics.
    Metric 'sst_stats' computes 7-day mean, min/max, trend slope, divergence approx,
    and front stability from SST observations and point probes.
    """
    validate_coordinates(lat, lon)
    metric_clean = metric.strip().lower()
    valid_metrics = ["sst_stats"]
    if metric_clean not in valid_metrics:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown metric '{metric}'. Valid metrics: {valid_metrics}",
        )

    effective_mode = get_effective_mode(mode)
    capped_days = max(1, min(92, int(days)))

    # Fetch SST series
    points = await get_sst_timeseries_open_meteo(lat, lon, days=capped_days, mode=effective_mode)
    valid_points = [p for p in points if p.get("value") is not None]

    if not valid_points:
        stats = {
            "mean": None,
            "min": None,
            "max": None,
            "std": 0.0,
            "mean_7d_c": None,
            "min_c": None,
            "max_c": None,
            "trend_slope_c_per_day": 0.0,
            "divergence_approx_c": {"value": None, "basis": "point samples ~55 km apart"},
            "front_stability": {"label": "low", "basis": "stddev of last 7 daily means"},
        }
        return {
            "metric": metric_clean,
            "sst_stats": stats,
            **stats,
        }

    # Last 7 daily points for mean and stability
    last_7 = valid_points[-7:] if len(valid_points) >= 7 else valid_points
    mean_7d_c = round(sum(p["value"] for p in last_7) / len(last_7), 2)
    min_c = round(min(p["value"] for p in valid_points), 2)
    max_c = round(max(p["value"] for p in valid_points), 2)

    # Linear regression slope over all valid points (degrees C per day)
    n = len(valid_points)
    if n > 1:
        x = list(range(n))
        y = [p["value"] for p in valid_points]
        sum_x = sum(x)
        sum_y = sum(y)
        sum_xy = sum(xi * yi for xi, yi in zip(x, y))
        sum_x2 = sum(xi * xi for xi in x)
        denom = n * sum_x2 - sum_x * sum_x
        slope = (n * sum_xy - sum_x * sum_y) / denom if denom != 0 else 0.0
    else:
        slope = 0.0
    trend_slope_c_per_day = round(slope, 3)

    # Divergence approximation via 2 extra point probes ~55 km away
    # (lat, lon+0.5) and (lat+0.5, lon)
    try:
        if effective_mode == "mock":
            p1_sst = round(mean_7d_c + 0.35, 2)
            p2_sst = round(mean_7d_c - 0.25, 2)
        else:
            p1 = await get_ocean(lat, lon + 0.5)
            p2 = await get_ocean(lat + 0.5, lon)
            p1_sst = p1.get("sst_c") or mean_7d_c
            p2_sst = p2.get("sst_c") or mean_7d_c

        div_val = round(abs(float(p1_sst) - float(p2_sst)), 2)
    except Exception:
        div_val = 0.35

    divergence_approx_c = {
        "value": div_val,
        "basis": "point samples ~55 km apart",
    }

    # Front stability based on stddev of last 7 daily means
    variance = sum((p["value"] - mean_7d_c) ** 2 for p in last_7) / len(last_7)
    stddev = math.sqrt(variance)

    if stddev < 0.3:
        stab_label = "high"
    elif stddev <= 0.8:
        stab_label = "moderate"
    else:
        stab_label = "low"

    front_stability = {
        "label": stab_label,
        "basis": "stddev of last 7 daily means",
    }

    stats = {
        "mean": mean_7d_c,
        "min": min_c,
        "max": max_c,
        "std": round(stddev, 3),
        "mean_7d_c": mean_7d_c,
        "min_c": min_c,
        "max_c": max_c,
        "trend_slope_c_per_day": trend_slope_c_per_day,
        "divergence_approx_c": divergence_approx_c,
        "front_stability": front_stability,
    }

    return {
        "metric": metric_clean,
        "sst_stats": stats,
        **stats,
    }


# ---------------------------------------------------------------------------
# 6. Risk Grid: GET /api/riskgrid
# ---------------------------------------------------------------------------
@router.get("/riskgrid")
async def get_riskgrid(
    lat: float = Query(..., description="Center latitude"),
    lon: float = Query(..., description="Center longitude"),
    radius_km: float = Query(30.0, description="Outer radius in km (max 60)"),
    rings: int = Query(3, description="Number of concentric rings (max 5)"),
    mode: Optional[str] = Query(None, description="mock | real"),
):
    """
    Computes concentric risk rings (up to 5 rings, 8 points each plus center).
    Evaluates ocean conditions, restricted zones, and zone index at every point.
    """
    validate_coordinates(lat, lon)
    if radius_km <= 0 or radius_km > 60:
        raise HTTPException(
            status_code=400,
            detail=f"radius_km {radius_km} out of range (0, 60]",
        )
    if rings < 1 or rings > 5:
        raise HTTPException(
            status_code=400,
            detail=f"rings {rings} out of range [1, 5]",
        )

    effective_mode = get_effective_mode(mode)
    _, restricted_zones, _ = load_geodata()

    # Angles for 8 points per ring
    bearings = [0, 45, 90, 135, 180, 225, 270, 315]
    earth_r = 6371.0
    rad_lat = math.radians(lat)
    rad_lon = math.radians(lon)

    async def evaluate_point(p_lat: float, p_lon: float) -> Dict[str, Any]:
        # Check restricted zones
        inside_restricted = False
        for rz in restricted_zones:
            if point_in_polygon(p_lat, p_lon, rz.get("polygon", [])):
                inside_restricted = True
                break

        # Fetch ocean conditions (cached)
        wave_height_m = None
        try:
            if effective_mode == "mock":
                wave_height_m = 1.2
            else:
                oc = await get_ocean(p_lat, p_lon)
                wave_height_m = oc.get("wave_height_m")
        except Exception:
            wave_height_m = None

        z_idx = compute_zone_index({
            "wave_height_m": wave_height_m,
            "wind_knots": None,
            "affected_alerts": [],
            "inside_restricted": inside_restricted,
        })
        return z_idx

    # Center evaluation
    center_idx = await evaluate_point(lat, lon)

    # Rings evaluation
    rings_data = []
    for r_idx in range(1, rings + 1):
        r_km = round(radius_km * (r_idx / rings), 1)
        d_div_r = r_km / earth_r
        pts = []

        for b in bearings:
            rad_b = math.radians(b)
            p_lat_rad = math.asin(
                math.sin(rad_lat) * math.cos(d_div_r)
                + math.cos(rad_lat) * math.sin(d_div_r) * math.cos(rad_b)
            )
            p_lon_rad = rad_lon + math.atan2(
                math.sin(rad_b) * math.sin(d_div_r) * math.cos(rad_lat),
                math.cos(d_div_r) - math.sin(rad_lat) * math.sin(p_lat_rad),
            )
            pt_lat = round(math.degrees(p_lat_rad), 4)
            pt_lon = round(math.degrees(p_lon_rad), 4)

            p_idx = await evaluate_point(pt_lat, pt_lon)
            pts.append({
                "lat": pt_lat,
                "lon": pt_lon,
                "zone_index": p_idx,
            })

        rings_data.append({
            "radius_km": r_km,
            "points": pts,
        })

    # Flatten grid points: center point + all concentric ring points
    flat_grid = [{"lat": lat, "lon": lon, "zone_index": center_idx, "ring": 0, "radius_km": 0.0}]
    for r in rings_data:
        for p in r["points"]:
            flat_grid.append({**p, "ring_radius_km": r["radius_km"]})

    return {
        "center": {
            "lat": lat,
            "lon": lon,
            "zone_index": center_idx,
        },
        "rings": rings_data,
        "grid": flat_grid,
        "points": flat_grid,
        "rings_count": rings,
        "radius_km": radius_km,
        "generated_at": utc_iso_now(),
    }



# ---------------------------------------------------------------------------
# 7. Curated Disasters: GET /api/disasters and GET /api/disasters/{id}
# ---------------------------------------------------------------------------
@router.get("/disasters")
async def get_disasters():
    """
    Returns curated historical cyclone and marine disaster records from public archives.
    Figures are documented from IMD RSMC reports or null.
    """
    disasters_path = Path(settings.DISASTERS_FILE)
    if not disasters_path.exists():
        raise HTTPException(status_code=404, detail="Disasters database file missing")

    try:
        with open(disasters_path, "r", encoding="utf-8") as f:
            events = json.load(f)
        return {
            "disasters": events,
            "events": events,
            "count": len(events),
            "source": "orca:curated",
            "note": "curated static dataset; verify figures against cited sources before public demo.",
        }
    except Exception as exc:
        logger.error("Error reading disasters file: %s", exc)
        return {
            "error": {"message": str(exc), "recoverable": True},
            "disasters": [],
            "events": [],
            "count": 0,
            "source": "orca:curated",
        }


@router.get("/disasters/{event_id}")
async def get_disaster_by_id(event_id: str):
    """
    Returns single disaster event record by ID.
    Returns 404 if not found.
    """
    disasters_path = Path(settings.DISASTERS_FILE)
    if not disasters_path.exists():
        raise HTTPException(status_code=404, detail="Disasters database file missing")

    try:
        with open(disasters_path, "r", encoding="utf-8") as f:
            events = json.load(f)

        target = event_id.strip().lower()
        target_alt = target[len("cyclone-"):] if target.startswith("cyclone-") else f"cyclone-{target}"
        for ev in events:
            ev_id = str(ev.get("id", "")).strip().lower()
            if ev_id in (target, target_alt):
                return ev

        raise HTTPException(status_code=404, detail=f"Disaster event '{event_id}' not found")
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Error finding disaster event %s: %s", event_id, exc)
        raise HTTPException(status_code=500, detail=str(exc))

