from datetime import datetime, timezone
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional
import yaml

logger = logging.getLogger(__name__)

# Locate default rules path relative to repository root
DEFAULT_RULES_PATH = Path(__file__).resolve().parent.parent.parent / "rules" / "safety_rules.yaml"

_RULES_CACHE: Optional[Dict[str, Any]] = None


def load_rules(path: str = "rules/safety_rules.yaml") -> Dict[str, Any]:
    """
    Loads and caches the safety rules YAML.
    Module-level cache avoids re-reading disk on every request.
    """
    global _RULES_CACHE
    if _RULES_CACHE is not None and path == "rules/safety_rules.yaml":
        return _RULES_CACHE

    target_path = Path(path)
    if not target_path.is_absolute():
        if target_path.exists():
            resolved = target_path
        else:
            resolved = DEFAULT_RULES_PATH
    else:
        resolved = target_path

    with open(resolved, "r", encoding="utf-8") as f:
        loaded = yaml.safe_load(f)

    if path == "rules/safety_rules.yaml":
        _RULES_CACHE = loaded
    return loaded


def reload_rules(path: str = "rules/safety_rules.yaml") -> Dict[str, Any]:
    """
    Forces reloading rules from YAML, clearing the module-level cache.
    Useful for testing dynamic configuration updates.
    """
    global _RULES_CACHE
    _RULES_CACHE = None
    return load_rules(path)


# Exported list of valid vessel classes for API validation
VESSEL_CLASSES: List[str] = list(load_rules().get("vessel_classes", {}).keys())


def utc_iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def evaluate_safety(
    observations: Dict[str, Any],
    vessel_class: str,
    rules: Dict[str, Any],
    input_sources: Optional[Dict[str, str]] = None,
) -> Dict[str, Any]:
    """
    Pure, deterministic evaluation function.
    Converts agent observations into a GO / CAUTION / NO_GO / UNKNOWN verdict per vessel class.
    Zero I/O, zero LLM, strictly YAML-driven.
    """
    vessel_classes = rules.get("vessel_classes", {})
    if vessel_class not in vessel_classes:
        res = {
            "verdict": "UNKNOWN",
            "vessel_class": vessel_class,
            "rules_version": rules.get("version", "unknown"),
            "evaluated_parameters": [],
            "violations": [],
            "cautions": [],
            "unknown_parameters": ["vessel_class"],
            "reason": f"unknown vessel class '{vessel_class}'; valid options: {list(vessel_classes.keys())}",
            "evaluated_at": utc_iso_now(),
        }
        if input_sources is not None:
            res["input_sources"] = input_sources
        return res

    vessel_rules = vessel_classes[vessel_class]
    universal = rules.get("universal", {})

    evaluated_parameters: List[Dict[str, Any]] = []
    violations: List[Dict[str, Any]] = []
    cautions: List[Dict[str, Any]] = []
    unknown_parameters: List[str] = []

    # 1. Vessel-specific parameters (wave_height_m, wind_knots, gusts_knots)
    for param in ("wave_height_m", "wind_knots", "gusts_knots"):
        param_rules = vessel_rules.get(param)
        if not param_rules:
            continue

        raw_val = observations.get(param)

        # Fail-safe missing parameter check
        if raw_val is None:
            unknown_parameters.append(param)
            continue

        try:
            val = float(raw_val)
        except (ValueError, TypeError):
            unknown_parameters.append(param)
            continue

        # Basis determination: explicit basis or worst forecast
        basis = observations.get(f"{param}_basis")
        if not basis:
            bases_dict = observations.get("bases")
            if isinstance(bases_dict, dict) and param in bases_dict:
                basis = bases_dict[param]

        if not basis and param in ("wind_knots", "gusts_knots"):
            forecast_hours = observations.get("forecast_hours")
            if isinstance(forecast_hours, list) and forecast_hours:
                fc_vals = [
                    float(f[param])
                    for f in forecast_hours
                    if isinstance(f, dict) and f.get(param) is not None
                ]
                if fc_vals:
                    max_fc = max(fc_vals)
                    if max_fc > val:
                        val = max_fc
                        basis = "worst_forecast"
                    else:
                        basis = "current"
                else:
                    basis = "current"
            else:
                basis = "current"
        elif not basis:
            basis = "current"

        caution_th = param_rules["caution"]
        stop_th = param_rules["stop"]

        # Equality with threshold triggers the harsher band (>= stop -> stop, >= caution -> caution)
        if val >= stop_th:
            status = "stop"
        elif val >= caution_th:
            status = "caution"
        else:
            status = "pass"

        entry = {
            "parameter": param,
            "value": val,
            "basis": basis,
            "caution": caution_th,
            "stop": stop_th,
            "status": status,
        }
        evaluated_parameters.append(entry)

        if status == "stop":
            violations.append(entry)
        elif status == "caution":
            cautions.append(entry)

    # 2. Universal lightning risk (high -> stop, moderate -> caution)
    if "lightning_risk" in observations:
        lr_val = observations.get("lightning_risk")
        if lr_val is None:
            unknown_parameters.append("lightning_risk")
        else:
            lr_str = str(lr_val).strip().lower()
            univ_lr = universal.get("lightning_risk", {})
            lr_status = univ_lr.get(lr_str, "pass")

            entry = {
                "parameter": "lightning_risk",
                "value": lr_str,
                "basis": "current",
                "caution": "moderate",
                "stop": "high",
                "status": lr_status,
            }
            evaluated_parameters.append(entry)

            if lr_status == "stop":
                violations.append(entry)
            elif lr_status == "caution":
                cautions.append(entry)

    # 3. Universal hazard alerts (cyclone -> stop, severity mapping)
    hazard_alerts = observations.get("hazard_alerts")
    if hazard_alerts is not None:
        if isinstance(hazard_alerts, list):
            univ_sev = universal.get("hazard_alert_severity", {})
            cyclone_action = universal.get("cyclone_alert", "stop")

            for alert in hazard_alerts:
                if not isinstance(alert, dict):
                    continue
                a_type = str(alert.get("type", "hazard")).strip().lower()
                a_sev = str(alert.get("severity", "moderate")).strip().lower()

                if "cyclone" in a_type:
                    status = cyclone_action
                else:
                    status = univ_sev.get(a_sev, "pass")

                entry = {
                    "parameter": f"hazard_alert_{a_type}",
                    "value": a_sev,
                    "basis": "current",
                    "caution": "moderate",
                    "stop": "high",
                    "status": status,
                }
                evaluated_parameters.append(entry)

                if status == "stop":
                    violations.append(entry)
                elif status == "caution":
                    cautions.append(entry)

    # 4. Final verdict determination
    # Fail-safe: if ANY core parameter (wave_height_m, wind_knots) is unknown -> UNKNOWN (never GO)
    core_missing = any(p in unknown_parameters for p in ("wave_height_m", "wind_knots"))

    if core_missing:
        verdict = "UNKNOWN"
        reason = "insufficient data for a safety assessment; consult official IMD/INCOIS advisories"
    elif len(violations) > 0:
        verdict = "NO_GO"
        v = violations[0]
        p = v["parameter"]
        if p == "wave_height_m":
            reason = f"NO-GO: wave height {v['value']} m exceeds the {v['stop']} m limit for {vessel_class}"
        elif p == "wind_knots":
            reason = f"NO-GO: wind {v['value']} knots exceeds the {v['stop']} knots limit for {vessel_class}"
        elif p == "gusts_knots":
            reason = f"NO-GO: gusts {v['value']} knots exceed the {v['stop']} knots limit for {vessel_class}"
        elif p == "lightning_risk":
            reason = f"NO-GO: lightning risk is {v['value']} for {vessel_class}"
        elif "cyclone" in p:
            reason = f"NO-GO: cyclone alert is active for {vessel_class}"
        elif p.startswith("hazard_alert_"):
            clean_type = p.replace("hazard_alert_", "").replace("_", " ")
            reason = f"NO-GO: {clean_type} alert severity {v['value']} exceeds safety limit for {vessel_class}"
        else:
            reason = f"NO-GO: {p} exceeds safety limit for {vessel_class}"
    elif len(cautions) > 0:
        verdict = "CAUTION"
        c = cautions[0]
        p = c["parameter"]
        if p == "wave_height_m":
            reason = f"CAUTION: wave height {c['value']} m exceeds the {c['caution']} m caution threshold for {vessel_class}"
        elif p == "wind_knots":
            reason = f"CAUTION: wind {c['value']} knots exceeds the {c['caution']} knots caution threshold for {vessel_class}"
        elif p == "gusts_knots":
            reason = f"CAUTION: gusts {c['value']} knots exceed the {c['caution']} knots caution threshold for {vessel_class}"
        elif p == "lightning_risk":
            reason = f"CAUTION: lightning risk is {c['value']} for {vessel_class}"
        elif p.startswith("hazard_alert_"):
            clean_type = p.replace("hazard_alert_", "").replace("_", " ")
            reason = f"CAUTION: {clean_type} alert severity {c['value']} requires caution for {vessel_class}"
        else:
            reason = f"CAUTION: {p} requires caution for {vessel_class}"
    else:
        verdict = "GO"
        reason = f"GO: all parameters within safe operational limits for {vessel_class}"

    result = {
        "verdict": verdict,
        "vessel_class": vessel_class,
        "rules_version": rules.get("version", "3.0.0"),
        "evaluated_parameters": evaluated_parameters,
        "violations": violations,
        "cautions": cautions,
        "unknown_parameters": unknown_parameters,
        "reason": reason,
        "evaluated_at": utc_iso_now(),
    }
    if input_sources is not None:
        result["input_sources"] = input_sources
    return result
