import asyncio
import os
from unittest.mock import AsyncMock, patch
import pytest

from app.config import settings
from app.core.rules import evaluate_safety, load_rules
from app.core.runner import run_graph_streaming
from app.core.sessions import SessionManager
from app.graph.build_graph import build_graph, run_graph
from app.graph.reflection import (
    VALID_AGENTS,
    analyze_sufficiency,
    reflection_node,
    replan_node,
    run_reflection_critic,
    should_replan,
)
from app.graph.trace import TraceCollector
from app.tools.http import clear_cache, set_test_transport


@pytest.fixture(autouse=True)
def cleanup():
    clear_cache()
    set_test_transport(None)
    prev_hook = os.environ.get("ORCA_FORCE_AGENT_FAILURE")
    yield
    clear_cache()
    set_test_transport(None)
    if prev_hook is not None:
        os.environ["ORCA_FORCE_AGENT_FAILURE"] = prev_hook
    else:
        os.environ.pop("ORCA_FORCE_AGENT_FAILURE", None)


# ---------------------------------------------------------------------------
# 1. Sufficiency Analyzer Tests
# ---------------------------------------------------------------------------

def test_sufficiency_analyzer_clean_path():
    """All requested needed_agents succeeded -> sufficient=True, empty retries/additions."""
    state = {
        "needed_agents": ["weather", "ocean"],
        "agent_outputs": {
            "weather": {"status": "ok", "wind_knots": 12.0},
            "ocean": {"status": "ok", "wave_height_m": 1.5},
        },
        "safety_relevant": True,
    }
    is_sufficient, retries, additions, reason = analyze_sufficiency(state)
    assert is_sufficient is True
    assert retries == []
    assert additions == []
    assert "All required observations successfully gathered" in reason


def test_sufficiency_analyzer_failed_agent_rule_r1():
    """Failed or missing agent is detected and added to retry_agents."""
    # Sub-case A: Agent in needed_agents but missing from agent_outputs
    state_missing = {
        "needed_agents": ["weather", "ocean"],
        "agent_outputs": {"weather": {"status": "ok"}},
        "safety_relevant": True,
    }
    is_sufficient, retries, additions, reason = analyze_sufficiency(state_missing)
    assert is_sufficient is False
    assert retries == ["ocean"]
    assert additions == []
    assert "ocean" in reason

    # Sub-case B: Agent in agent_outputs with status='error'
    state_error = {
        "needed_agents": ["weather", "ocean"],
        "agent_outputs": {
            "weather": {"status": "ok"},
            "ocean": {"status": "error", "summary": "timeout"},
        },
        "safety_relevant": True,
    }
    is_sufficient_err, retries_err, additions_err, _ = analyze_sufficiency(state_error)
    assert is_sufficient_err is False
    assert retries_err == ["ocean"]


def test_sufficiency_analyzer_safety_dependency_rule_r2():
    """Safety-relevant queries require core agents (weather, ocean) to be retried if deficient."""
    state = {
        "needed_agents": ["weather", "ocean", "pfz"],
        "agent_outputs": {
            "weather": {"status": "error"},
            "ocean": {"status": "error"},
            "pfz": {"status": "ok"},
        },
        "safety_relevant": True,
    }
    is_sufficient, retries, _, reason = analyze_sufficiency(state)
    assert is_sufficient is False
    assert "weather" in retries
    assert "ocean" in retries


def test_sufficiency_analyzer_hazard_escalation_rule_r3():
    """Active high-severity hazard escalates and adds geospatial if not in needed_agents."""
    state = {
        "needed_agents": ["weather", "hazard"],
        "agent_outputs": {
            "weather": {"status": "ok"},
            "hazard": {
                "status": "ok",
                "alerts": [{"severity": "high", "headline": "Cyclone warning"}],
            },
        },
        "safety_relevant": True,
    }
    is_sufficient, retries, additions, reason = analyze_sufficiency(state)
    assert is_sufficient is False
    assert retries == []
    assert additions == ["geospatial"]


# ---------------------------------------------------------------------------
# 2. Critic Validation & Discipline Tests
# ---------------------------------------------------------------------------

def test_critic_disabled_by_default_zero_llm_calls(monkeypatch):
    """When REFLECTION_LLM_CRITIC=False, zero LLM calls occur."""
    async def _run():
        monkeypatch.setattr(settings, "REFLECTION_LLM_CRITIC", False)
        with patch("app.graph.reflection.call_llm_json") as mock_call:
            res = await run_reflection_critic({"query": "Check weather", "needed_agents": ["weather"]})
            assert mock_call.call_count == 0
            assert res["critic_used"] is False
            assert res["retry_agents"] == []
            assert res["additional_agents"] == []

    asyncio.run(_run())


def test_critic_validation_ignores_out_of_set_agents(monkeypatch):
    """Critic returning invalid/out-of-set agents has those discarded while valid agents are kept."""
    async def _run():
        monkeypatch.setattr(settings, "REFLECTION_LLM_CRITIC", True)
        canned_critic_response = {
            "additional_agents": ["space_radar", "geospatial", "sonar_ping"],
            "retry_agents": ["navigation_ai", "weather"],
            "reason": "Ensure satellite and geospatial boundaries are checked",
        }

        with patch("app.graph.reflection.call_llm_json", AsyncMock(return_value=canned_critic_response)):
            state = {
                "query": "Is it safe to fish?",
                "needed_agents": ["weather"],
                "agent_outputs": {"weather": {"status": "ok"}},
            }
            res = await run_reflection_critic(state)
            assert res["critic_used"] is True
            # Invalid 'space_radar' and 'sonar_ping' must be discarded; 'geospatial' is valid
            assert res["additional_agents"] == ["geospatial"]
            assert "space_radar" not in res["additional_agents"]
            assert "sonar_ping" not in res["additional_agents"]
            # Invalid 'navigation_ai' discarded; 'weather' is valid and was in needed_agents
            assert res["retry_agents"] == ["weather"]
            assert "navigation_ai" not in res["retry_agents"]

    asyncio.run(_run())


def test_critic_no_removal_path(monkeypatch):
    """Critic cannot remove already completed agents or modify outputs."""
    async def _run():
        monkeypatch.setattr(settings, "REFLECTION_LLM_CRITIC", True)
        # Malicious critic attempting to remove 'weather' or drop observations
        adversarial_critic = {
            "remove_agents": ["weather"],
            "needed_agents": [],
            "additional_agents": [],
            "retry_agents": [],
            "reason": "Drop weather observation",
        }
        with patch("app.graph.reflection.call_llm_json", AsyncMock(return_value=adversarial_critic)):
            state = {
                "needed_agents": ["weather", "ocean"],
                "agent_outputs": {
                    "weather": {"status": "ok", "wind_knots": 10.0},
                    "ocean": {"status": "ok", "wave_height_m": 1.2},
                },
            }
            collector = TraceCollector()
            res = await reflection_node(state, collector)
            # R-rules and state are intact
            assert res["reflection"]["sufficient"] is True
            assert res["reflection"]["retry_agents"] == []
            assert res["reflection"]["additional_agents"] == []
            # Completed agents were not removed
            assert "weather" in state["agent_outputs"]

    asyncio.run(_run())


# ---------------------------------------------------------------------------
# 3. Clean Path & Replan Flow Tests
# ---------------------------------------------------------------------------

def test_clean_path_mock_mode_run():
    """Clean mock run produces exactly one reflection event (sufficient=True), zero replan events."""
    async def _run():
        collector = TraceCollector()
        mock_plan = {
            "needed_agents": ["weather", "ocean"],
            "execution_plan": [["weather", "ocean"]],
            "entities": {"lat": 17.68, "lon": 83.22, "location_name": "Visakhapatnam"},
        }
        with patch("app.graph.planner.call_llm_json", AsyncMock(return_value=mock_plan)):
            with patch("app.graph.aggregator.call_llm", AsyncMock(return_value="Safe conditions.")):
                final_state, _ = await run_graph(
                    query="Is it safe to fish tomorrow from Vizag?",
                    language="en",
                    mode="mock",
                )

        trace = final_state.get("trace", [])
        reflection_events = [e for e in trace if e["event"] == "reflection"]
        replan_events = [e for e in trace if e["event"] == "replan"]

        assert len(reflection_events) == 1
        assert reflection_events[0]["data"]["sufficient"] is True
        assert reflection_events[0]["data"]["retry_agents"] == []
        assert len(replan_events) == 0

        # Verdict identical to Phase 8A standard
        verdict = final_state.get("verdict", {})
        assert verdict.get("verdict") in ("GO", "CAUTION", "NO_GO")

    asyncio.run(_run())


def test_replan_flow_self_correction():
    """
    Self-correction: Force ocean failure on pass 1.
    Sequence: reflection (sufficient=False) -> replan -> pass 2 ocean -> verdict computed with pass 2 data.
    """
    async def _run():
        call_count = {"ocean": 0}

        from app.graph.agents.ocean import OceanAgent
        orig_run = OceanAgent.run

        async def mocked_ocean_run(self, collector, state):
            call_count["ocean"] += 1
            if call_count["ocean"] == 1:
                # Pass 1 failure
                await collector.emit("agent_started", "ocean", {})
                await collector.emit("agent_result", "ocean", {"status": "error", "summary": "Pass 1 failure", "source": "open-meteo:marine"})
                return {"status": "error", "summary": "Pass 1 failure", "source": "open-meteo:marine"}
            else:
                # Pass 2 recovery
                return await orig_run(self, collector, state)

        mock_plan = {
            "needed_agents": ["weather", "ocean"],
            "execution_plan": [["weather", "ocean"]],
            "entities": {"lat": 17.68, "lon": 83.22, "location_name": "Vizag"},
        }

        with patch("app.graph.agents.ocean.OceanAgent.run", mocked_ocean_run):
            with patch("app.graph.planner.call_llm_json", AsyncMock(return_value=mock_plan)):
                with patch("app.graph.aggregator.call_llm", AsyncMock(return_value="Conditions advisory.")):
                    final_state, _ = await run_graph(
                        query="Can I fish near Vizag tomorrow?",
                        language="en",
                        mode="mock",
                    )

        trace = final_state.get("trace", [])
        event_types = [e["event"] for e in trace]

        # Verify trace sequence contains reflection -> replan -> agent_started -> agent_result -> verdict
        assert "reflection" in event_types
        assert "replan" in event_types

        refl_idx = event_types.index("reflection")
        replan_idx = event_types.index("replan")
        verdict_idx = event_types.index("verdict")

        assert refl_idx < replan_idx < verdict_idx

        refl_payload = trace[refl_idx]["data"]
        replan_payload = trace[replan_idx]["data"]

        assert refl_payload["sufficient"] is False
        assert refl_payload["retry_agents"] == ["ocean"]
        assert replan_payload["retry_agents"] == ["ocean"]

        # Ocean was attempted twice
        assert call_count["ocean"] == 2

        # Final state has successful pass 2 payload
        ocean_output = final_state.get("agent_outputs", {}).get("ocean", {})
        assert ocean_output.get("status") != "error"
        assert ocean_output.get("wave_height_m") == 2.8

    asyncio.run(_run())


# ---------------------------------------------------------------------------
# 4. Cap Proof & Fail-Safe Interaction Tests
# ---------------------------------------------------------------------------

def test_cap_proof_forced_double_failure():
    """
    Structural Cap Proof:
    When an agent fails on BOTH pass 1 and pass 2, the graph routes directly to verdict.
    Reflection node is executed EXACTLY ONCE; replan node is executed EXACTLY ONCE.
    """
    async def _run():
        call_count = {"weather": 0}

        async def double_fail_weather(self, collector, state):
            call_count["weather"] += 1
            await collector.emit("agent_started", "weather", {})
            await collector.emit("agent_result", "weather", {"status": "error", "summary": f"Failure pass {call_count['weather']}", "source": "open-meteo:forecast"})
            return {"status": "error", "summary": f"Failure pass {call_count['weather']}", "source": "open-meteo:forecast"}

        mock_plan = {
            "needed_agents": ["weather"],
            "execution_plan": [["weather"]],
            "entities": {"lat": 17.68, "lon": 83.22, "location_name": "Vizag"},
        }

        with patch("app.graph.agents.weather.WeatherAgent.run", double_fail_weather):
            with patch("app.graph.planner.call_llm_json", AsyncMock(return_value=mock_plan)):
                with patch("app.graph.aggregator.call_llm", AsyncMock(return_value="Conditions advisory.")):
                    final_state, _ = await run_graph(
                        query="Is it safe to fish?",
                        language="en",
                        mode="mock",
                    )

        trace = final_state.get("trace", [])
        event_types = [e["event"] for e in trace]

        # Exactly ONE reflection event, exactly ONE replan event
        reflection_events = [e for e in trace if e["event"] == "reflection"]
        replan_events = [e for e in trace if e["event"] == "replan"]

        assert len(reflection_events) == 1
        assert len(replan_events) == 1
        assert call_count["weather"] == 2
        assert event_types[-1] == "run_complete"

    asyncio.run(_run())


def test_fail_safe_interaction_force_failure():
    """
    ORCA_FORCE_AGENT_FAILURE=weather on safety query:
    Weather attempted twice, exactly one replan event, verdict is UNKNOWN, terminates with run_complete.
    """
    async def _run():
        os.environ["ORCA_FORCE_AGENT_FAILURE"] = "weather"

        mock_plan = {
            "needed_agents": ["weather", "ocean"],
            "execution_plan": [["weather", "ocean"]],
            "entities": {"lat": 17.68, "lon": 83.22, "location_name": "Vizag"},
        }

        with patch("app.graph.planner.call_llm_json", AsyncMock(return_value=mock_plan)):
            with patch("app.graph.aggregator.call_llm", AsyncMock(return_value="Unable to verify weather.")):
                final_state, _ = await run_graph(
                    query="Can a small fishing boat leave tomorrow from Visakhapatnam?",
                    language="en",
                    vessel_class="small_fishing_boat",
                    mode="real",
                )

        trace = final_state.get("trace", [])
        event_types = [e["event"] for e in trace]

        # Weather attempted exactly twice
        weather_starts = [e for e in trace if e["event"] == "agent_started" and e.get("agent") == "weather"]
        assert len(weather_starts) == 2

        # Exactly one replan event
        replan_events = [e for e in trace if e["event"] == "replan"]
        assert len(replan_events) == 1

        # Safety verdict is UNKNOWN (weather missing)
        verdict = final_state.get("verdict", {})
        assert verdict.get("verdict") == "UNKNOWN"

        # Final event is run_complete
        assert event_types[-1] == "run_complete"

    asyncio.run(_run())


# ---------------------------------------------------------------------------
# 5. Streaming Passthrough & Replay Tests
# ---------------------------------------------------------------------------

def test_stream_passthrough_includes_reflection_and_replan():
    """Streaming background execution records and publishes reflection and replan events with monotonic seq."""
    async def _run():
        sm = SessionManager()
        rid = "test-replan-run-001"
        sid = "test-session-001"

        call_count = {"ocean": 0}
        from app.graph.agents.ocean import OceanAgent
        orig_run = OceanAgent.run

        async def mocked_ocean(self, collector, state):
            call_count["ocean"] += 1
            if call_count["ocean"] == 1:
                await collector.emit("agent_started", "ocean", {})
                await collector.emit("agent_result", "ocean", {"status": "error", "summary": "fail 1", "source": "open-meteo:marine"})
                return {"status": "error", "summary": "fail 1", "source": "open-meteo:marine"}
            return await orig_run(self, collector, state)

        mock_plan = {
            "needed_agents": ["ocean"],
            "execution_plan": [["ocean"]],
            "entities": {"lat": 17.68, "lon": 83.22, "location_name": "Vizag"},
        }

        with patch("app.graph.agents.ocean.OceanAgent.run", mocked_ocean):
            with patch("app.graph.planner.call_llm_json", AsyncMock(return_value=mock_plan)):
                with patch("app.graph.aggregator.call_llm", AsyncMock(return_value="Advisory.")):
                    await run_graph_streaming(
                        session_id=sid,
                        run_id=rid,
                        query="Can I fish near Vizag?",
                        language="en",
                        sessions=sm,
                        mode="mock",
                    )

        events = sm.get_events(rid)
        types = [e["type"] for e in events]

        # Must include both reflection and replan
        assert "reflection" in types
        assert "replan" in types

        # Check envelope schema
        for env in events:
            assert "run_id" in env
            assert "seq" in env
            assert "ts" in env
            assert "type" in env
            assert "payload" in env

        # Strict monotonic seq check
        seqs = [e["seq"] for e in events]
        assert seqs == list(range(1, len(events) + 1)), f"seq numbers not strictly monotonic: {seqs}"

    asyncio.run(_run())
