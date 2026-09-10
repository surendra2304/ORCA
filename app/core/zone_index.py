"""
app/core/zone_index.py — Transparent Zone Index (zi-1.0)

Pure, deterministic, no I/O, no LLM calculation for zone comparison.
ADVISORY ZONE-INDEX for zone COMPARISON only. NOT safety thresholds.
Vessel verdicts come ONLY from the rule engine (rules/safety_rules.yaml).
"""

from typing import Any, Dict, List, Optional
from app.config import settings


def compute_zone_index(observations: Dict[str, Any]) -> Dict[str, Any]:
    """
    Computes transparent zone index score and advisory band from observations:
    - wave_height_m: float | None
    - wind_knots: float | None
    - affected_alerts: list of severities (str) or alert dicts
    - inside_restricted: bool

    Formula:
      score = clamp(0, 100, 100 - min(ZONE_INDEX_WAVE_MAX, wave_m * ZONE_INDEX_WAVE_W)
                                - min(ZONE_INDEX_WIND_MAX, wind_kt * ZONE_INDEX_WIND_W)
                                - max(alert severities mapped))
      If inside_restricted -> score = ZONE_INDEX_RESTRICTED_SCORE (0.0).
      Missing wave/wind -> component cost = 0.0 BUT component value flagged
      "unavailable": True (never silently treated as calm).

    Bands:
      score >= 75.0: "favourable"
      50.0 <= score < 75.0: "caution"
      < 50.0: "avoid"
    """
    inside_restricted = bool(observations.get("inside_restricted", observations.get("is_restricted", False)))

    # 1. Wave component
    raw_wave = observations.get("wave_height_m")
    if raw_wave is None:
        raw_wave = observations.get("wave_m")

    wave_val: Optional[float] = None
    wave_unavailable = True
    wave_cost = 0.0

    if raw_wave is not None:
        try:
            wave_val = float(raw_wave)
            wave_unavailable = False
            wave_cost = min(settings.ZONE_INDEX_WAVE_MAX, max(0.0, wave_val) * settings.ZONE_INDEX_WAVE_W)
        except (ValueError, TypeError):
            wave_unavailable = True

    # 2. Wind component
    raw_wind = observations.get("wind_knots")
    if raw_wind is None:
        raw_wind = observations.get("wind_kt")
    if raw_wind is None:
        raw_wind = observations.get("wind_speed_knots")

    wind_val: Optional[float] = None
    wind_unavailable = True
    wind_cost = 0.0

    if raw_wind is not None:
        try:
            wind_val = float(raw_wind)
            wind_unavailable = False
            wind_cost = min(settings.ZONE_INDEX_WIND_MAX, max(0.0, wind_val) * settings.ZONE_INDEX_WIND_W)
        except (ValueError, TypeError):
            wind_unavailable = True

    # 3. Alert severities mapping
    alerts_raw = observations.get("affected_alerts")
    if alerts_raw is None:
        alerts_raw = observations.get("alerts")
    if alerts_raw is None:
        alert_lvl = observations.get("alert_level")
        alerts_raw = [alert_lvl] if alert_lvl else []

    alerts = alerts_raw if isinstance(alerts_raw, list) else [alerts_raw]
    mapped_costs: List[float] = []
    max_severity: Optional[str] = None
    highest_cost = 0.0

    for a in alerts:
        if isinstance(a, str):
            s = a.strip().lower()
        elif isinstance(a, dict):
            s = str(a.get("severity") or a.get("level") or "").strip().lower()
        else:
            s = ""

        if s in ("high", "severe", "extreme", "critical"):
            cost = settings.ZONE_INDEX_ALERT_HIGH
            mapped_costs.append(cost)
            if cost > highest_cost:
                highest_cost = cost
                max_severity = "high"
        elif s in ("moderate", "medium"):
            cost = settings.ZONE_INDEX_ALERT_MODERATE
            mapped_costs.append(cost)
            if cost > highest_cost:
                highest_cost = cost
                max_severity = "moderate"
        elif s:
            mapped_costs.append(0.0)
            if max_severity is None:
                max_severity = s

    alert_cost = max(mapped_costs) if mapped_costs else 0.0

    # 4. Score calculation & restricted override
    if inside_restricted:
        score = float(settings.ZONE_INDEX_RESTRICTED_SCORE)
    else:
        raw_score = 100.0 - wave_cost - wind_cost - alert_cost
        score = max(0.0, min(100.0, raw_score))

    score = round(score, 1)

    # 5. Advisory Bands (MUST NOT collide with vessel verdicts GO/CAUTION/NO_GO/UNKNOWN)
    if score >= 75.0:
        band = "favourable"
    elif score >= 50.0:
        band = "caution"
    else:
        band = "avoid"

    wave_comp = {
        "value": round(wave_val, 2) if wave_val is not None else None,
        "cost": round(wave_cost, 1),
        "penalty": round(wave_cost, 1),
        "unavailable": wave_unavailable,
    }
    wind_comp = {
        "value": round(wind_val, 2) if wind_val is not None else None,
        "cost": round(wind_cost, 1),
        "penalty": round(wind_cost, 1),
        "unavailable": wind_unavailable,
    }
    alerts_comp = {
        "cost": round(alert_cost, 1),
        "penalty": round(alert_cost, 1),
        "max_severity": max_severity,
        "count": len(alerts),
        "unavailable": False if observations.get("alert_level") is not None or observations.get("affected_alerts") is not None else True,
    }

    return {
        "score": score,
        "band": band,
        "restricted_override": inside_restricted,
        "components": {
            "wave": wave_comp,
            "wind": wind_comp,
            "alerts": alerts_comp,
            "hazard": alerts_comp,
            "restricted": inside_restricted,
        },
        "formula_version": settings.ZONE_INDEX_FORMULA_VERSION,
    }
