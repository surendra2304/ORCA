import copy
import pytest

from app.core.rules import evaluate_safety, load_rules, reload_rules, VESSEL_CLASSES
from app.graph.planner import validate_plan


@pytest.fixture
def rules():
    return load_rules()


def test_vessel_classes_exported(rules):
    """VESSEL_CLASSES must match the classes defined in safety_rules.yaml."""
    expected = list(rules["vessel_classes"].keys())
    assert VESSEL_CLASSES == expected
    assert "small_fishing_boat" in VESSEL_CLASSES
    assert "motorized_fishing_vessel" in VESSEL_CLASSES
    assert "larger_vessel" in VESSEL_CLASSES


def test_go_caution_no_go_per_vessel_class(rules):
    """Verify GO, CAUTION, and NO_GO outcomes across all vessel classes."""
    for vc in rules["vessel_classes"]:
        th = rules["vessel_classes"][vc]

        # Calm conditions -> GO
        calm_obs = {
            "wave_height_m": th["wave_height_m"]["caution"] - 0.5,
            "wind_knots": th["wind_knots"]["caution"] - 5,
            "gusts_knots": th["gusts_knots"]["caution"] - 5,
            "lightning_risk": "low",
            "hazard_alerts": [],
        }
        res_go = evaluate_safety(calm_obs, vc, rules)
        assert res_go["verdict"] == "GO"
        assert len(res_go["violations"]) == 0
        assert len(res_go["cautions"]) == 0

        # Caution conditions on wave -> CAUTION
        caution_obs = {
            "wave_height_m": th["wave_height_m"]["caution"] + 0.1,
            "wind_knots": th["wind_knots"]["caution"] - 5,
            "gusts_knots": th["gusts_knots"]["caution"] - 5,
            "lightning_risk": "low",
            "hazard_alerts": [],
        }
        res_caution = evaluate_safety(caution_obs, vc, rules)
        assert res_caution["verdict"] == "CAUTION"
        assert len(res_caution["cautions"]) == 1
        assert len(res_caution["violations"]) == 0

        # Stop conditions on wind -> NO_GO
        stop_obs = {
            "wave_height_m": th["wave_height_m"]["caution"] - 0.5,
            "wind_knots": th["wind_knots"]["stop"] + 1,
            "gusts_knots": th["gusts_knots"]["caution"] - 5,
            "lightning_risk": "low",
            "hazard_alerts": [],
        }
        res_stop = evaluate_safety(stop_obs, vc, rules)
        assert res_stop["verdict"] == "NO_GO"
        assert len(res_stop["violations"]) >= 1


def test_boundary_conditions(rules):
    """
    Exact boundary tests for small_fishing_boat:
    - wave exactly 2.5 (stop threshold) -> NO_GO
    - wave 2.49 with everything else calm -> GO
    - wave 2.2 (between caution 2.0 and stop 2.5) -> CAUTION
    """
    vc = "small_fishing_boat"

    # Exactly 2.5 -> stop
    obs_exact_stop = {
        "wave_height_m": 2.5,
        "wind_knots": 10.0,
        "gusts_knots": 15.0,
        "lightning_risk": "low",
    }
    res_exact = evaluate_safety(obs_exact_stop, vc, rules)
    assert res_exact["verdict"] == "NO_GO"
    assert any(v["parameter"] == "wave_height_m" and v["status"] == "stop" for v in res_exact["violations"])

    # 2.49 with everything else calm -> GO (below caution 2.0? Wait! Caution is 2.0, so 2.49 is >= caution!)
    # Below caution 2.0 (e.g. 1.99) -> GO
    obs_calm = {
        "wave_height_m": 1.99,
        "wind_knots": 14.9,
        "gusts_knots": 21.9,
        "lightning_risk": "low",
    }
    res_calm = evaluate_safety(obs_calm, vc, rules)
    assert res_calm["verdict"] == "GO"

    # 2.2 -> CAUTION (2.0 <= 2.2 < 2.5)
    obs_caution = {
        "wave_height_m": 2.2,
        "wind_knots": 10.0,
        "gusts_knots": 15.0,
        "lightning_risk": "low",
    }
    res_caution = evaluate_safety(obs_caution, vc, rules)
    assert res_caution["verdict"] == "CAUTION"
    assert any(c["parameter"] == "wave_height_m" and c["status"] == "caution" for c in res_caution["cautions"])


def test_worst_case_forecast_wind(rules):
    """
    Calm now (wind 10) but one forecast hour has wind 26:
    triggers stop for small_fishing_boat (stop 20), basis recorded as 'worst_forecast'.
    """
    vc = "small_fishing_boat"
    obs = {
        "wave_height_m": 1.2,
        "wind_knots": 10.0,
        "gusts_knots": 15.0,
        "forecast_hours": [
            {"hour": 1, "wind_knots": 12.0},
            {"hour": 2, "wind_knots": 26.0},
            {"hour": 3, "wind_knots": 14.0},
        ],
        "lightning_risk": "low",
    }
    res = evaluate_safety(obs, vc, rules)
    assert res["verdict"] == "NO_GO"
    wind_eval = next(p for p in res["evaluated_parameters"] if p["parameter"] == "wind_knots")
    assert wind_eval["value"] == 26.0
    assert wind_eval["basis"] == "worst_forecast"
    assert wind_eval["status"] == "stop"


def test_lightning_high_triggers_no_go(rules):
    """Lightning risk high -> NO_GO even with completely calm wind and waves."""
    vc = "larger_vessel"  # even largest vessel stops for high lightning risk
    obs = {
        "wave_height_m": 0.5,
        "wind_knots": 5.0,
        "gusts_knots": 8.0,
        "lightning_risk": "high",
    }
    res = evaluate_safety(obs, vc, rules)
    assert res["verdict"] == "NO_GO"
    assert any(v["parameter"] == "lightning_risk" and v["status"] == "stop" for v in res["violations"])


def test_cyclone_alert_triggers_no_go_for_all_classes(rules):
    """Cyclone alert must trigger NO_GO across all three vessel classes."""
    for vc in rules["vessel_classes"]:
        obs = {
            "wave_height_m": 0.5,
            "wind_knots": 5.0,
            "gusts_knots": 8.0,
            "lightning_risk": "low",
            "hazard_alerts": [
                {"type": "cyclone_warning", "severity": "moderate"}
            ],
        }
        res = evaluate_safety(obs, vc, rules)
        assert res["verdict"] == "NO_GO", f"Cyclone alert did not trigger NO_GO for {vc}"
        assert any("cyclone" in v["parameter"] and v["status"] == "stop" for v in res["violations"])


def test_missing_ocean_output_triggers_unknown(rules):
    """If ocean output (wave_height_m) is missing/None, verdict is UNKNOWN, never GO."""
    vc = "small_fishing_boat"
    obs = {
        "wave_height_m": None,
        "wind_knots": 5.0,
        "gusts_knots": 8.0,
        "lightning_risk": "low",
    }
    res = evaluate_safety(obs, vc, rules)
    assert res["verdict"] == "UNKNOWN"
    assert "wave_height_m" in res["unknown_parameters"]
    assert "insufficient data" in res["reason"].lower()


def test_missing_weather_output_triggers_unknown(rules):
    """If weather output (wind_knots) is missing/None, verdict is UNKNOWN, never GO."""
    vc = "small_fishing_boat"
    obs = {
        "wave_height_m": 1.0,
        "wind_knots": None,
        "gusts_knots": None,
        "lightning_risk": "low",
    }
    res = evaluate_safety(obs, vc, rules)
    assert res["verdict"] == "UNKNOWN"
    assert "wind_knots" in res["unknown_parameters"]
    assert "insufficient data" in res["reason"].lower()


def test_evaluation_determinism(rules):
    """Calling evaluate_safety twice with identical inputs produces byte-identical output (excluding evaluated_at)."""
    vc = "small_fishing_boat"
    obs = {
        "wave_height_m": 2.8,
        "wind_knots": 18.0,
        "gusts_knots": 24.0,
        "lightning_risk": "moderate",
        "hazard_alerts": [{"type": "high_wave", "severity": "moderate"}],
    }
    res1 = evaluate_safety(obs, vc, rules)
    res2 = evaluate_safety(obs, vc, rules)

    res1_clean = {k: v for k, v in res1.items() if k != "evaluated_at"}
    res2_clean = {k: v for k, v in res2.items() if k != "evaluated_at"}
    assert res1_clean == res2_clean


def test_yaml_driven_dynamic_thresholds():
    """Modifying the rules dict dynamically changes the verdict, proving thresholds are not hardcoded."""
    base_rules = load_rules()
    modified_rules = copy.deepcopy(base_rules)

    # In base rules, wave 2.8 for small_fishing_boat is NO_GO (stop is 2.5)
    obs = {
        "wave_height_m": 2.8,
        "wind_knots": 10.0,
        "gusts_knots": 15.0,
        "lightning_risk": "low",
    }
    base_res = evaluate_safety(obs, "small_fishing_boat", base_rules)
    assert base_res["verdict"] == "NO_GO"

    # Raise stop threshold to 3.0 and caution to 2.9 in modified rules -> now passes as GO!
    modified_rules["vessel_classes"]["small_fishing_boat"]["wave_height_m"]["caution"] = 2.9
    modified_rules["vessel_classes"]["small_fishing_boat"]["wave_height_m"]["stop"] = 3.0

    mod_res = evaluate_safety(obs, "small_fishing_boat", modified_rules)
    assert mod_res["verdict"] == "GO"


def test_validate_plan_safety_relevant_default():
    """Missing or non-boolean safety_relevant field in planner payload must default to True."""
    # 1. Missing safety_relevant
    payload_missing = {
        "needed_agents": ["weather", "ocean"],
        "execution_plan": [["weather", "ocean"]],
        "entities": {},
    }
    is_valid, errors = validate_plan(payload_missing)
    assert is_valid is True
    assert payload_missing["safety_relevant"] is True

    # 2. Non-boolean safety_relevant
    payload_invalid = {
        "safety_relevant": "yes",
        "needed_agents": ["weather", "ocean"],
        "execution_plan": [["weather", "ocean"]],
        "entities": {},
    }
    is_valid, errors = validate_plan(payload_invalid)
    assert is_valid is True
    assert payload_invalid["safety_relevant"] is True

    # 3. Explicit False is preserved
    payload_false = {
        "safety_relevant": False,
        "needed_agents": ["pfz"],
        "execution_plan": [["pfz"]],
        "entities": {},
    }
    is_valid, errors = validate_plan(payload_false)
    assert is_valid is True
    assert payload_false["safety_relevant"] is False
