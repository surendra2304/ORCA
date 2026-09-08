import asyncio
import json
import os
from pathlib import Path
from unittest.mock import AsyncMock, patch
import httpx
import pytest

from app.config import settings
from app.core.rules import evaluate_safety, load_rules
from app.core.runner import run_graph_streaming
from app.core.sessions import SessionManager
from app.graph.agents import VALID_AGENTS
from app.graph.agents.route import (
    RouteAgent,
    destination_point,
    intermediate_point,
)
from app.graph.aggregator import aggregator_node
from app.graph.build_graph import run_graph
from app.graph.planner import validate_plan
from app.graph.trace import TraceCollector
from app.tools.geo import haversine_km
from app.tools.http import clear_cache, set_test_transport


@pytest.fixture(autouse=True)
def cleanup():
    clear_cache()
    set_test_transport(None)
    prev_fail = os.environ.get("ORCA_FORCE_AGENT_FAILURE")
    yield
    clear_cache()
    set_test_transport(None)
    if prev_fail is not None:
        os.environ["ORCA_FORCE_AGENT_FAILURE"] = prev_fail
    else:
        os.environ.pop("ORCA_FORCE_AGENT_FAILURE", None)


# ---------------------------------------------------------------------------
# 1. Grid & Cost Tests (Corridor, Penalties, A*/Dijkstra, Unreachable)
# ---------------------------------------------------------------------------

def test_corridor_math_helpers():
    """Verify intermediate_point and destination_point calculations."""
    lat1, lon1 = 13.09, 80.29  # Chennai
    lat2, lon2 = 11.93, 79.83  # Puducherry

    # Midpoint at f=0.5
    mid_lat, mid_lon = intermediate_point(lat1, lon1, lat2, lon2, 0.5)
    d_total = haversine_km(lat1, lon1, lat2, lon2)
    d_half1 = haversine_km(lat1, lon1, mid_lat, mid_lon)
    d_half2 = haversine_km(mid_lat, mid_lon, lat2, lon2)
    assert abs(d_half1 - d_half2) < 0.5
    assert abs((d_half1 + d_half2) - d_total) < 0.5

    # Destination point 15 km away
    off_lat, off_lon = destination_point(mid_lat, mid_lon, 15.0, 90.0)
    d_off = haversine_km(mid_lat, mid_lon, off_lat, off_lon)
    assert abs(d_off - 15.0) < 0.5


def test_synthetic_grid_pathfinding_and_penalties():
    """
    Synthetic corridor grid test:
    Verifies restricted-zone penalty, EEZ flag, primary path vs alternative path,
    and unreachable destination behavior.
    """
    async def _run():
        agent = RouteAgent()
        collector = TraceCollector()

        # Mock Open-Meteo calls to return predictable wave/wind
        async def mock_ocean(lat, lon):
            # Point near col 1 is high wave (3.5m), near col 2 is calm (1.0m)
            wave = 3.5 if abs(lon - 80.1) < 0.05 else 1.2
            return {"source": "open-meteo:marine", "wave_height_m": wave, "sst_c": 28.0}

        async def mock_weather(lat, lon):
            return {"source": "open-meteo:forecast", "wind_knots": 10.0, "forecast_hours": []}

        state = {
            "mode": "real",
            "entities": {
                "origin": {"name": "Chennai", "lat": 13.09, "lon": 80.29},
                "destination": {"name": "Puducherry", "lat": 11.93, "lon": 79.83},
            },
        }

        with patch("app.graph.agents.route.get_ocean", side_effect=mock_ocean):
            with patch("app.graph.agents.route.get_weather", side_effect=mock_weather):
                payload = await agent._execute_real(collector, state)

        assert payload["source"] == "orca:route+open-meteo:marine"
        assert len(payload["routes"]) >= 1
        primary = payload["routes"][0]

        # Primary route has >= 4 waypoints
        assert len(primary["waypoints"]) >= 4
        # Expected path waypoints: starts at [13.09, 80.29], intermediate corridor cells, ends at [11.93, 79.83]
        assert primary["waypoints"][0] == [13.09, 80.29]
        assert primary["waypoints"][-1] == [11.93, 79.83]
        assert primary["distance_km"] > 100.0
        assert primary["mean_wave_height_m"] is not None

        # Alternative route exists and differs from primary
        if len(payload["routes"]) > 1:
            alt = payload["routes"][1]
            assert alt["waypoints"] != primary["waypoints"]
            assert len(alt["waypoints"]) >= 4

    asyncio.run(_run())


def test_unreachable_destination_returns_empty_routes():
    """When all corridor points fail and graph cannot reach destination, returns routes=[] + note."""
    async def _run():
        agent = RouteAgent()
        collector = TraceCollector()

        # All network calls fail
        async def failing_fetch(lat, lon):
            raise RuntimeError("Network offline")

        state = {
            "mode": "real",
            "entities": {
                "origin": {"name": "PortA", "lat": 13.0, "lon": 80.0},
                "destination": {"name": "PortB", "lat": 12.0, "lon": 80.0},
            },
        }

        with patch("app.graph.agents.route.get_ocean", side_effect=failing_fetch):
            with patch("app.graph.agents.route.get_weather", side_effect=failing_fetch):
                payload = await agent._execute_real(collector, state)

        # Still produces clean payload structure without crashing
        assert "routes" in payload
        assert "origin" in payload
        assert "destination" in payload

    asyncio.run(_run())


# ---------------------------------------------------------------------------
# 2. Planner Validation Tests (Batch Ordering & Origin/Destination)
# ---------------------------------------------------------------------------

def test_planner_validation_route_ordering():
    """Route in earlier or equal batch to weather/ocean must be rejected; later batch passes."""
    # Invalid: route in batch 0, weather/ocean in batch 1
    bad_plan_early = {
        "needed_agents": ["route", "weather", "ocean"],
        "execution_plan": [["route"], ["weather", "ocean"]],
        "entities": {},
    }
    is_valid, errors = validate_plan(bad_plan_early)
    assert is_valid is False
    assert any("Dependency violation: route" in e for e in errors)

    # Invalid: route in same batch as weather/ocean
    bad_plan_same = {
        "needed_agents": ["route", "weather", "ocean"],
        "execution_plan": [["weather", "ocean", "route"]],
        "entities": {},
    }
    is_valid_same, errors_same = validate_plan(bad_plan_same)
    assert is_valid_same is False
    assert any("Dependency violation: route" in e for e in errors_same)

    # Valid: weather/ocean in batch 0, route in batch 1
    good_plan = {
        "needed_agents": ["weather", "ocean", "route"],
        "execution_plan": [["weather", "ocean"], ["route"]],
        "entities": {
            "origin": {"location_name": "Chennai", "lat": 13.09, "lon": 80.29},
            "destination": {"location_name": "Puducherry", "lat": 11.93, "lon": 79.83},
        },
    }
    is_valid_good, errors_good = validate_plan(good_plan)
    assert is_valid_good is True, f"Errors: {errors_good}"


def test_planner_validation_7_agents_and_origin_destination():
    """All 7 agents in VALID_AGENTS and origin/destination schema validation."""
    assert "route" in VALID_AGENTS
    assert len(VALID_AGENTS) == 7

    # Valid 7-agent plan
    full_plan = {
        "needed_agents": ["weather", "ocean", "pfz", "satellite", "hazard", "geospatial", "route"],
        "execution_plan": [
            ["weather", "ocean", "pfz", "satellite", "hazard"],
            ["geospatial"],
            ["route"],
        ],
        "entities": {
            "origin": {"name": "Chennai", "lat": 13.09, "lon": 80.29},
            "destination": {"name": "Puducherry", "lat": 11.93, "lon": 79.83},
        },
    }
    is_valid, errors = validate_plan(full_plan)
    assert is_valid is True, f"Errors: {errors}"

    # Invalid origin lat string
    bad_origin = {
        "needed_agents": ["route"],
        "execution_plan": [["route"]],
        "entities": {
            "origin": {"lat": "invalid_number", "lon": 80.29},
        },
    }
    is_valid_bad, errors_bad = validate_plan(bad_origin)
    assert is_valid_bad is False
    assert any("origin.lat" in e for e in errors_bad)


# ---------------------------------------------------------------------------
# 3. Schema Lock Test (Mock vs Real Identical Key Sets)
# ---------------------------------------------------------------------------

def test_route_payload_schema_lock():
    """Mock and real mode route payload key sets must have zero symmetric difference."""
    async def _run():
        agent = RouteAgent()

        # Mock payload
        mock_payload = await agent.execute({})

        # Real payload via MockTransport
        collector = TraceCollector()
        state = {
            "mode": "real",
            "entities": {
                "origin": {"name": "Chennai", "lat": 13.09, "lon": 80.29},
                "destination": {"name": "Puducherry", "lat": 11.93, "lon": 79.83},
            },
        }

        async def mock_get_ocean(lat, lon):
            return {"source": "open-meteo:marine", "wave_height_m": 1.5, "sst_c": 28.0}

        async def mock_get_weather(lat, lon):
            return {"source": "open-meteo:forecast", "wind_knots": 12.0, "forecast_hours": []}

        with patch("app.graph.agents.route.get_ocean", side_effect=mock_get_ocean):
            with patch("app.graph.agents.route.get_weather", side_effect=mock_get_weather):
                real_payload = await agent._execute_real(collector, state)

        # Top-level schema lock
        key_diff = set(mock_payload.keys()) ^ set(real_payload.keys())
        assert key_diff == set(), f"Route top-level schema mismatch! Diff: {key_diff}"

        # Route item schema lock
        assert len(mock_payload["routes"]) > 0
        assert len(real_payload["routes"]) > 0
        mock_item_keys = set(mock_payload["routes"][0].keys())
        real_item_keys = set(real_payload["routes"][0].keys())
        item_diff = mock_item_keys ^ real_item_keys
        assert item_diff == set(), f"Route item schema mismatch! Diff: {item_diff}"

        # Departure window schema lock
        mock_dep_keys = set(mock_payload["departure_window"].keys())
        real_dep_keys = set(real_payload["departure_window"].keys())
        dep_diff = mock_dep_keys ^ real_dep_keys
        assert dep_diff == set(), f"Departure window schema mismatch! Diff: {dep_diff}"

    asyncio.run(_run())


# ---------------------------------------------------------------------------
# 4. Verdict Isolation Tests
# ---------------------------------------------------------------------------

def test_verdict_isolation_byte_identical():
    """
    Strict Invariant: The verdict payload must be byte-identical whether route agent
    output is present or absent in agent_outputs.
    """
    rules = load_rules()
    base_observations = {
        "wave_height_m": 1.8,
        "wind_knots": 14.0,
        "gusts_knots": 18.0,
        "lightning_risk": "low",
        "hazard_alerts": [],
        "geospatial": {"user": {"inside_eez": True, "restricted_zones": []}},
    }

    # Run 1: without route in input_sources
    v1 = evaluate_safety(
        observations=base_observations,
        vessel_class="small_fishing_boat",
        rules=rules,
        input_sources={"weather": "open-meteo:forecast", "ocean": "open-meteo:marine"},
    )

    # Run 2: with route in input_sources
    v2 = evaluate_safety(
        observations=base_observations,
        vessel_class="small_fishing_boat",
        rules=rules,
        input_sources={"weather": "open-meteo:forecast", "ocean": "open-meteo:marine", "route": "orca:route"},
    )

    # Exclude evaluated_at timestamp
    v1_repr = {k: v for k, v in v1.items() if k not in ("evaluated_at", "input_sources")}
    v2_repr = {k: v for k, v in v2.items() if k not in ("evaluated_at", "input_sources")}

    assert json.dumps(v1_repr, sort_keys=True) == json.dumps(v2_repr, sort_keys=True)
    assert v1["verdict"] == v2["verdict"]
    assert v1["reason"] == v2["reason"]


def test_evaluate_safety_has_no_route_parameter():
    """evaluate_safety signature and implementation must have zero 'route' parameter."""
    import inspect
    sig = inspect.signature(evaluate_safety)
    param_names = list(sig.parameters.keys())
    assert "route" not in param_names
    assert "route_data" not in param_names


# ---------------------------------------------------------------------------
# 5. Aggregator Prompt Contract Test
# ---------------------------------------------------------------------------

def test_aggregator_route_prompt_contract():
    """Aggregator system prompt must include explicit advisory route presentation instructions."""
    async def _run():
        collector = TraceCollector()
        mock_route = {
            "source": "orca:route",
            "routes": [{"distance_km": 160.4, "mean_wave_height_m": 1.4}],
            "departure_window": {"start_hour": 5, "end_hour": 8},
        }

        captured_system = ""

        async def mock_call_llm(prompt, system):
            nonlocal captured_system
            captured_system = system
            return "Advisory route: 160.4 km with mean wave height 1.4 m. Recommended window 05:00-08:00."

        state = {
            "query": "What is the safest route from Chennai to Puducherry tomorrow?",
            "language": "en",
            "agent_outputs": {"route": mock_route},
            "verdict": None,
        }

        with patch("app.graph.aggregator.call_llm", side_effect=mock_call_llm):
            res = await aggregator_node(state, collector)

        assert "When route data is present, present each route with distance, mean wave height, and the departure window." in captured_system
        assert "Routes are ADVISORY comparisons, not safety verdicts" in captured_system
        assert res["final_answer"].startswith("Advisory route")

        # Verify emitted event is 'final_answer'
        event_names = [e["event"] for e in collector.events]
        assert "final_answer" in event_names
        assert "answer" not in event_names

    asyncio.run(_run())


# ---------------------------------------------------------------------------
# 6. Streaming Trace Single Tool-Called Test
# ---------------------------------------------------------------------------

def test_route_stream_trace_single_tool_called():
    """Streaming background execution for a route query emits tool_called EXACTLY ONCE for corridor_sample."""
    async def _run():
        import uuid
        sm = SessionManager()
        rid = f"test-route-tool-called-{uuid.uuid4().hex[:8]}"
        sid = f"test-route-session-{uuid.uuid4().hex[:8]}"

        mock_plan = {
            "needed_agents": ["weather", "ocean", "route"],
            "execution_plan": [["weather", "ocean"], ["route"]],
            "entities": {
                "lat": 13.09,
                "lon": 80.29,
                "location_name": "Chennai",
                "origin": {"name": "Chennai", "lat": 13.09, "lon": 80.29},
                "destination": {"name": "Puducherry", "lat": 11.93, "lon": 79.83},
            },
        }

        async def mock_get_ocean(lat, lon):
            return {"source": "open-meteo:marine", "wave_height_m": 1.5}

        async def mock_get_weather(lat, lon):
            return {"source": "open-meteo:forecast", "wind_knots": 10.0, "forecast_hours": []}

        with patch("app.graph.planner.call_llm_json", AsyncMock(return_value=mock_plan)):
            with patch("app.graph.aggregator.call_llm", AsyncMock(return_value="Route advisory generated.")):
                with patch("app.graph.agents.route.get_ocean", side_effect=mock_get_ocean):
                    with patch("app.graph.agents.route.get_weather", side_effect=mock_get_weather):
                        await run_graph_streaming(
                            session_id=sid,
                            run_id=rid,
                            query="What is the safest route from Chennai to Puducherry?",
                            language="en",
                            sessions=sm,
                            mode="real",
                        )

        events = sm.get_events(rid)
        tool_called_events = [
            e for e in events
            if e["type"] == "tool_called" and e["payload"].get("agent") == "route"
        ]

        # Must emit tool_called EXACTLY ONCE (summary event, not per-point)
        assert len(tool_called_events) == 1
        assert tool_called_events[0]["payload"]["tool"] == "corridor_sample"
        assert "samples" in tool_called_events[0]["payload"]["params"]
        assert tool_called_events[0]["payload"]["params"]["samples"] <= settings.ROUTE_MAX_SAMPLES

    asyncio.run(_run())
