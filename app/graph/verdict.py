import logging
from typing import Any, Dict

from app.core.rules import evaluate_safety, load_rules
from app.graph.state import ORCAState
from app.graph.trace import TraceCollector

logger = logging.getLogger(__name__)


async def verdict_node(state: ORCAState, collector: TraceCollector) -> Dict[str, Any]:
    """
    Verdict LangGraph node.
    Deterministically computes safety verdict from agent observations against YAML thresholds.
    Never lets LLM determine safety.
    If query is not safety-relevant, skips evaluation and emits nothing.
    """
    # 1. Skip if query is not safety-relevant
    if state.get("safety_relevant") is not True:
        logger.info("Query marked not safety-relevant; skipping verdict evaluation.")
        return {"verdict": None}

    vessel_class = state.get("vessel_class") or "small_fishing_boat"
    agent_outputs = state.get("agent_outputs") or {}

    try:
        # 2. Assemble observations from agent outputs
        weather_data = agent_outputs.get("weather")
        ocean_data = agent_outputs.get("ocean")
        hazard_data = agent_outputs.get("hazard")

        # Ocean observations
        wave_height_m = ocean_data.get("wave_height_m") if ocean_data else None

        # Weather observations (worst-case over forecast_hours)
        if weather_data:
            current_wind = weather_data.get("wind_knots")
            current_gusts = weather_data.get("gusts_knots")
            forecast_hours = weather_data.get("forecast_hours") or []

            # Worst-case wind
            forecast_winds = [
                float(f["wind_knots"])
                for f in forecast_hours
                if isinstance(f, dict) and f.get("wind_knots") is not None
            ]
            max_forecast_wind = max(forecast_winds) if forecast_winds else None

            if current_wind is not None and max_forecast_wind is not None:
                if max_forecast_wind > float(current_wind):
                    wind_knots = max_forecast_wind
                    wind_basis = "worst_forecast"
                else:
                    wind_knots = float(current_wind)
                    wind_basis = "current"
            elif current_wind is not None:
                wind_knots = float(current_wind)
                wind_basis = "current"
            elif max_forecast_wind is not None:
                wind_knots = max_forecast_wind
                wind_basis = "worst_forecast"
            else:
                wind_knots = None
                wind_basis = "current"

            # Worst-case gusts
            forecast_gusts = [
                float(f["gusts_knots"])
                for f in forecast_hours
                if isinstance(f, dict) and f.get("gusts_knots") is not None
            ]
            max_forecast_gusts = max(forecast_gusts) if forecast_gusts else None

            if current_gusts is not None and max_forecast_gusts is not None:
                if max_forecast_gusts > float(current_gusts):
                    gusts_knots = max_forecast_gusts
                    gusts_basis = "worst_forecast"
                else:
                    gusts_knots = float(current_gusts)
                    gusts_basis = "current"
            elif current_gusts is not None:
                gusts_knots = float(current_gusts)
                gusts_basis = "current"
            elif max_forecast_gusts is not None:
                gusts_knots = max_forecast_gusts
                gusts_basis = "worst_forecast"
            else:
                gusts_knots = None
                gusts_basis = "current"

            lightning_risk = weather_data.get("lightning_risk")
        else:
            wind_knots = None
            wind_basis = "current"
            gusts_knots = None
            gusts_basis = "current"
            lightning_risk = None

        # Hazard alerts
        hazard_alerts = hazard_data.get("alerts") if hazard_data else None

        # Geospatial observations
        geospatial_data = agent_outputs.get("geospatial")

        observations = {
            "wave_height_m": wave_height_m,
            "wind_knots": wind_knots,
            "wind_knots_basis": wind_basis,
            "gusts_knots": gusts_knots,
            "gusts_knots_basis": gusts_basis,
            "lightning_risk": lightning_risk,
            "hazard_alerts": hazard_alerts,
            "geospatial": geospatial_data,
        }

        # Provenance: assemble input_sources from consumed agents only
        input_sources: Dict[str, str] = {}
        if weather_data and "source" in weather_data:
            input_sources["weather"] = weather_data["source"]
        if ocean_data and "source" in ocean_data:
            input_sources["ocean"] = ocean_data["source"]
        if hazard_data and hazard_data.get("alerts") and "source" in hazard_data:
            input_sources["hazard"] = hazard_data["source"]
        # input_sources gains "geospatial" ONLY when geofence was actually evaluated (user coords present)
        if (
            geospatial_data
            and isinstance(geospatial_data, dict)
            and geospatial_data.get("user") is not None
            and "source" in geospatial_data
        ):
            input_sources["geospatial"] = geospatial_data["source"]

        # 3. Deterministic evaluation
        rules = load_rules()
        verdict = evaluate_safety(observations, vessel_class, rules, input_sources=input_sources)

        # 4. Emit verdict event live
        await collector.emit("verdict", None, verdict)

        return {"verdict": verdict}

    except Exception as exc:
        logger.error("Unexpected error in verdict_node: %s", exc, exc_info=True)
        await collector.emit(
            "error",
            None,
            {
                "stage": "verdict",
                "message": f"Verdict evaluation error: {exc}",
                "recoverable": True,
            },
        )
        fallback_verdict = {
            "verdict": "UNKNOWN",
            "vessel_class": vessel_class,
            "rules_version": "3.0.0",
            "evaluated_parameters": [],
            "violations": [],
            "cautions": [],
            "unknown_parameters": ["evaluation_exception"],
            "reason": "evaluation error",
            "evaluated_at": collector.events[-1]["ts"] if collector.events else "",
        }
        await collector.emit("verdict", None, fallback_verdict)
        return {"verdict": fallback_verdict}
