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


def test_verdict_input_sources_provenance(rules):
    """When input_sources is passed to evaluate_safety, verdict includes input_sources."""
    vc = "small_fishing_boat"
    obs = {
        "wave_height_m": 1.5,
        "wind_knots": 10.0,
        "gusts_knots": 15.0,
        "lightning_risk": "low",
    }
    sources = {
        "weather": "open-meteo:forecast",
        "ocean": "open-meteo:marine",
        "hazard": "mock:IMD+INCOIS",
    }
    res = evaluate_safety(obs, vc, rules, input_sources=sources)
    assert res["verdict"] == "GO"
    assert "input_sources" in res
    assert res["input_sources"] == sources


def test_geofence_naval_stop_precedence_over_unknown(rules):
    """Inside naval zone produces NO_GO even with wave/wind missing (stop beats unknown)."""
    vc = "small_fishing_boat"
    obs = {
        "wave_height_m": None,  # core data missing
        "wind_knots": None,
        "geospatial": {
            "user": {"lat": 17.70, "lon": 83.30},
            "restricted": {"inside": True, "zone": "Visakhapatnam Naval Exclusion Area", "category": "naval"},
        },
    }
    res = evaluate_safety(obs, vc, rules)
    assert res["verdict"] == "NO_GO"
    assert "Visakhapatnam Naval Exclusion Area" in res["reason"]
    assert any(v["parameter"] == "restricted_zone" and v["status"] == "stop" for v in res["violations"])


def test_geofence_sanctuary_stop(rules):
    """Inside sanctuary zone produces NO_GO."""
    vc = "small_fishing_boat"
    obs = {
        "wave_height_m": 1.0,
        "wind_knots": 10.0,
        "geospatial": {
            "user": {"lat": 20.50, "lon": 87.00},
            "restricted": {"inside": True, "zone": "Gahirmatha Marine Sanctuary", "category": "sanctuary"},
        },
    }
    res = evaluate_safety(obs, vc, rules)
    assert res["verdict"] == "NO_GO"
    assert "Gahirmatha Marine Sanctuary" in res["reason"]


def test_geofence_imbl_caution(rules):
    """Inside IMBL buffer zone with calm sea produces CAUTION."""
    vc = "small_fishing_boat"
    obs = {
        "wave_height_m": 1.0,
        "wind_knots": 10.0,
        "geospatial": {
            "user": {"lat": 9.30, "lon": 79.40},
            "restricted": {"inside": True, "zone": "Gulf of Mannar / Palk Strait IMBL Buffer Zone", "category": "imbl"},
        },
    }
    res = evaluate_safety(obs, vc, rules)
    assert res["verdict"] == "CAUTION"
    assert any(c["parameter"] == "restricted_zone" and c["status"] == "caution" for c in res["cautions"])


def test_geofence_unknown_category_default_stop(rules):
    """Unknown category restricted zone defaults to stop -> NO_GO."""
    vc = "small_fishing_boat"
    obs = {
        "wave_height_m": 1.0,
        "wind_knots": 10.0,
        "geospatial": {
            "user": {"lat": 12.0, "lon": 80.0},
            "restricted": {"inside": True, "zone": "Secret Testing Area", "category": "unclassified_military"},
        },
    }
    res = evaluate_safety(obs, vc, rules)
    assert res["verdict"] == "NO_GO"


def test_geofence_outside_eez_maritime_gate(rules):
    """Outside EEZ with maritime wave number produces NO_GO; with wave None (inland gate) produces UNKNOWN."""
    vc = "small_fishing_boat"
    # Maritime offshore user
    obs_maritime = {
        "wave_height_m": 1.5,
        "wind_knots": 10.0,
        "geospatial": {
            "user": {"lat": 8.0, "lon": 90.0},
            "eez": {"inside": False, "nearest_boundary_km": 500.0},
        },
    }
    res_m = evaluate_safety(obs_maritime, vc, rules)
    assert res_m["verdict"] == "NO_GO"
    assert any(v["parameter"] == "eez_membership" for v in res_m["violations"])

    # Inland user (e.g. Hyderabad): wave_height_m is None
    obs_inland = {
        "wave_height_m": None,
        "wind_knots": 8.0,
        "geospatial": {
            "user": {"lat": 17.38, "lon": 78.48},
            "eez": {"inside": False, "nearest_boundary_km": 300.0},
        },
    }
    res_inland = evaluate_safety(obs_inland, vc, rules)
    assert res_inland["verdict"] == "UNKNOWN"  # maritime gate works, NOT NO_GO


def test_geofence_boundary_proximity_caution(rules):
    """Inside EEZ within 20 km of boundary produces CAUTION."""
    vc = "small_fishing_boat"
    obs = {
        "wave_height_m": 1.0,
        "wind_knots": 10.0,
        "geospatial": {
            "user": {"lat": 12.0, "lon": 82.0},
            "eez": {"inside": True, "nearest_boundary_km": 15.0},
        },
    }
    res = evaluate_safety(obs, vc, rules)
    assert res["verdict"] == "CAUTION"
    assert any(c["parameter"] == "eez_boundary_proximity" for c in res["cautions"])


def test_geofence_deep_inside_eez_silent(rules):
    """Deep inside EEZ (>20 km) with calm sea produces GO (geofence silent)."""
    vc = "small_fishing_boat"
    obs = {
        "wave_height_m": 1.0,
        "wind_knots": 10.0,
        "geospatial": {
            "user": {"lat": 15.0, "lon": 83.0},
            "eez": {"inside": True, "nearest_boundary_km": 150.0},
            "restricted": {"inside": False, "zone": None},
        },
    }
    res = evaluate_safety(obs, vc, rules)
    assert res["verdict"] == "GO"
    assert len(res["cautions"]) == 0
    assert len(res["violations"]) == 0


def test_geofence_missing_or_user_null_unassessed(rules):
    """When geospatial is missing or user coords are null, geofence is unassessed."""
    vc = "small_fishing_boat"
    # Geospatial missing
    obs_none = {"wave_height_m": 1.0, "wind_knots": 10.0}
    res_none = evaluate_safety(obs_none, vc, rules)
    assert res_none["verdict"] == "GO"
    assert res_none["unassessed_checks"] == ["geofence"]

    # User null in geospatial
    obs_null = {
        "wave_height_m": 1.0,
        "wind_knots": 10.0,
        "geospatial": {"user": None, "eez": {"inside": False}},
    }
    res_null = evaluate_safety(obs_null, vc, rules)
    assert res_null["verdict"] == "GO"
    assert res_null["unassessed_checks"] == ["geofence"]


def test_geofence_yaml_driven_flip(rules):
    """Modifying rules dict dynamically flips the verdict as predicted by YAML."""
    vc = "small_fishing_boat"
    obs = {
        "wave_height_m": 1.0,
        "wind_knots": 10.0,
        "geospatial": {
            "user": {"lat": 9.30, "lon": 79.40},
            "restricted": {"inside": True, "zone": "IMBL Buffer", "category": "imbl"},
        },
    }
    # Base: imbl is caution
    res_base = evaluate_safety(obs, vc, rules)
    assert res_base["verdict"] == "CAUTION"

    # Flip imbl to stop
    mod_rules = copy.deepcopy(rules)
    mod_rules["universal"]["geofence"]["restricted_zone_categories"]["imbl"] = "stop"
    res_flip = evaluate_safety(obs, vc, mod_rules)
    assert res_flip["verdict"] == "NO_GO"


def test_hazard_affected_false_excluded(rules):
    """Alerts with affected=False are excluded from severity mapping; affected=True or None are included."""
    vc = "small_fishing_boat"
    # Far-away extreme cyclone alert (affected=False) should NOT trigger NO_GO
    obs = {
        "wave_height_m": 1.0,
        "wind_knots": 10.0,
        "hazard_alerts": [
            {"type": "cyclone", "severity": "extreme", "affected": False},
            {"type": "high_wave", "severity": "moderate", "affected": True},
        ],
    }
    res = evaluate_safety(obs, vc, rules)
    # The cyclone alert was excluded because affected is False; the moderate high_wave is included -> CAUTION
    assert res["verdict"] == "CAUTION"
    assert not any("cyclone" in v["parameter"] for v in res["violations"])


