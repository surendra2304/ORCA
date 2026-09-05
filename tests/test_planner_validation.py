from app.graph.agents.geospatial import haversine_distance, initial_bearing
from app.graph.planner import validate_plan


def test_valid_plan_passes():
    payload = {
        "needed_agents": ["weather", "ocean", "pfz", "satellite", "hazard", "geospatial"],
        "execution_plan": [
            ["weather", "ocean", "pfz", "satellite", "hazard"],
            ["geospatial"],
        ],
        "entities": {
            "lat": 17.68,
            "lon": 83.21,
            "location_name": "Visakhapatnam",
            "date_hint": "tomorrow",
        },
    }
    is_valid, errors = validate_plan(payload)
    assert is_valid is True
    assert errors == []


def test_valid_subset_plan_passes():
    payload = {
        "needed_agents": ["weather", "ocean"],
        "execution_plan": [["weather", "ocean"]],
        "entities": {"lat": None, "lon": None, "location_name": None, "date_hint": None},
    }
    is_valid, errors = validate_plan(payload)
    assert is_valid is True
    assert errors == []


def test_duplicate_agent_fails():
    payload = {
        "needed_agents": ["weather", "ocean"],
        "execution_plan": [["weather", "ocean"], ["weather"]],
        "entities": {"lat": None, "lon": None, "location_name": None, "date_hint": None},
    }
    is_valid, errors = validate_plan(payload)
    assert is_valid is False
    assert any("appears 2 times" in err for err in errors)


def test_unknown_agent_fails():
    payload = {
        "needed_agents": ["weather", "alien_radar"],
        "execution_plan": [["weather", "alien_radar"]],
        "entities": {"lat": None, "lon": None, "location_name": None, "date_hint": None},
    }
    is_valid, errors = validate_plan(payload)
    assert is_valid is False
    assert any("alien_radar" in err for err in errors)


def test_missing_agent_in_batches_fails():
    payload = {
        "needed_agents": ["weather", "ocean", "hazard"],
        "execution_plan": [["weather", "ocean"]],
        "entities": {"lat": None, "lon": None, "location_name": None, "date_hint": None},
    }
    is_valid, errors = validate_plan(payload)
    assert is_valid is False
    assert any("hazard" in err and "missing" in err for err in errors)


def test_geospatial_before_pfz_fails():
    payload = {
        "needed_agents": ["pfz", "geospatial"],
        "execution_plan": [["geospatial"], ["pfz"]],
        "entities": {"lat": None, "lon": None, "location_name": None, "date_hint": None},
    }
    is_valid, errors = validate_plan(payload)
    assert is_valid is False
    assert any("Dependency violation" in err for err in errors)


def test_geospatial_same_batch_as_pfz_fails():
    payload = {
        "needed_agents": ["pfz", "geospatial"],
        "execution_plan": [["pfz", "geospatial"]],
        "entities": {"lat": None, "lon": None, "location_name": None, "date_hint": None},
    }
    is_valid, errors = validate_plan(payload)
    assert is_valid is False
    assert any("Dependency violation" in err for err in errors)


def test_malformed_types_fail():
    # Non-dict payload
    is_valid, errors = validate_plan("not a dict")
    assert is_valid is False

    # Empty needed_agents
    is_valid, errors = validate_plan({"needed_agents": [], "execution_plan": []})
    assert is_valid is False

    # Invalid coordinates (non-numeric string)
    payload = {
        "needed_agents": ["weather"],
        "execution_plan": [["weather"]],
        "entities": {"lat": "invalid_latitude", "lon": None},
    }
    is_valid, errors = validate_plan(payload)
    assert is_valid is False
    assert any("invalid_latitude" in err for err in errors)


def test_entity_float_coercion():
    payload = {
        "needed_agents": ["weather"],
        "execution_plan": [["weather"]],
        "entities": {"lat": "17.68", "lon": 83, "location_name": "Vizag", "date_hint": None},
    }
    is_valid, errors = validate_plan(payload)
    assert is_valid is True
    assert isinstance(payload["entities"]["lat"], float)
    assert isinstance(payload["entities"]["lon"], float)
    assert payload["entities"]["lat"] == 17.68
    assert payload["entities"]["lon"] == 83.0


def test_haversine_distance():
    # Visakhapatnam to Kakinada Port is approximately 130-140 km
    vizag = (17.6868, 83.2185)
    kakinada = (16.98, 82.25)
    dist = haversine_distance(vizag[0], vizag[1], kakinada[0], kakinada[1])
    assert 120.0 < dist < 150.0

    # Same point distance should be 0.0
    assert round(haversine_distance(17.0, 83.0, 17.0, 83.0), 4) == 0.0

    # Bearing test
    bearing = initial_bearing(vizag[0], vizag[1], kakinada[0], kakinada[1])
    assert 0.0 <= bearing <= 360.0
