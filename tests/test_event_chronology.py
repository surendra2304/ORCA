import asyncio
from datetime import datetime
from unittest.mock import patch

from app.graph.build_graph import run_graph


def test_event_chronology():
    asyncio.run(_async_test_event_chronology())


async def _async_test_event_chronology():
    """
    Tests live chronological event emission:
    (a) all agent_started events precede any agent_result of that parallel batch
    (b) trace ts values are non-decreasing across the whole trace
    (c) per agent, result.ts - started.ts is between 0.4s and 1.5s
    (d) final state["trace"] length == 1 run_started + 1 plan_created + 2*N agent events + 1 answer + 1 run_complete,
        in that exact macro order
    """
    batch1_agents = ["weather", "ocean", "pfz", "satellite"]
    batch2_agents = ["geospatial"]
    all_agents = batch1_agents + batch2_agents
    n_agents = len(all_agents)

    mock_plan = {
        "needed_agents": all_agents,
        "execution_plan": [batch1_agents, batch2_agents],
        "entities": {
            "lat": 17.6868,
            "lon": 83.2185,
            "location_name": "Visakhapatnam",
            "date_hint": "tomorrow",
        },
    }

    with patch("app.graph.planner.call_llm_json", return_value=mock_plan):
        with patch(
            "app.graph.aggregator.call_llm",
            return_value="Advisory: Favorable fishing conditions near Visakhapatnam.",
        ):
            final_state, duration_ms = await run_graph(
                query="Check weather, ocean, pfz, satellite, and geospatial for Visakhapatnam",
                language="en",
            )

    trace = final_state.get("trace", [])

    # (d) Macro order & exact length
    # 1 run_started + 1 plan_created + 2*N agent events + 1 verdict + 1 answer + 1 run_complete
    expected_length = 1 + 1 + 2 * n_agents + 1 + 1 + 1
    assert (
        len(trace) == expected_length
    ), f"Expected {expected_length} events, got {len(trace)}. Trace: {[e['event'] for e in trace]}"

    assert trace[0]["event"] == "run_started", f"First event must be run_started, got {trace[0]['event']}"
    assert trace[1]["event"] == "plan_created", f"Second event must be plan_created, got {trace[1]['event']}"
    assert trace[-3]["event"] == "verdict", f"Antepenultimate event must be verdict, got {trace[-3]['event']}"
    assert trace[-2]["event"] == "answer", f"Penultimate event must be answer, got {trace[-2]['event']}"
    assert trace[-1]["event"] == "run_complete", f"Final event must be run_complete, got {trace[-1]['event']}"

    # Middle events must all be agent events
    middle_events = trace[2:-3]
    assert all(
        e["event"] in ("agent_started", "agent_result") for e in middle_events
    ), f"Middle events must be agent events: {middle_events}"

    # (a) For Batch 1 (>= 3 agents running concurrently):
    # All agent_started events of Batch 1 must precede ANY agent_result of Batch 1
    b1_started_indices = []
    b1_result_indices = []

    for idx, e in enumerate(trace):
        if e.get("agent") in batch1_agents:
            if e["event"] == "agent_started":
                b1_started_indices.append(idx)
            elif e["event"] == "agent_result":
                b1_result_indices.append(idx)

    assert len(b1_started_indices) == len(batch1_agents), "All batch 1 agents must have agent_started"
    assert len(b1_result_indices) == len(batch1_agents), "All batch 1 agents must have agent_result"

    max_started_idx = max(b1_started_indices)
    min_result_idx = min(b1_result_indices)

    assert (
        max_started_idx < min_result_idx
    ), f"All agent_started (max index {max_started_idx}) must precede any agent_result (min index {min_result_idx}) in batch 1"

    # (b) trace ts values are non-decreasing across the whole trace
    timestamps = [datetime.fromisoformat(e["ts"]) for e in trace]
    for i in range(len(timestamps) - 1):
        assert (
            timestamps[i] <= timestamps[i + 1]
        ), f"Timestamps must be non-decreasing: trace[{i}] ({timestamps[i]}) > trace[{i+1}] ({timestamps[i+1]})"

    # (c) per agent, result.ts - started.ts is between 0.4s and 1.5s
    for agent_name in all_agents:
        agent_started_event = next(
            e for e in trace if e.get("agent") == agent_name and e["event"] == "agent_started"
        )
        agent_result_event = next(
            e for e in trace if e.get("agent") == agent_name and e["event"] == "agent_result"
        )

        started_dt = datetime.fromisoformat(agent_started_event["ts"])
        result_dt = datetime.fromisoformat(agent_result_event["ts"])
        duration_s = (result_dt - started_dt).total_seconds()

        assert (
            0.4 <= duration_s <= 1.5
        ), f"Agent {agent_name} duration was {duration_s:.3f}s; expected between 0.4s and 1.5s"
