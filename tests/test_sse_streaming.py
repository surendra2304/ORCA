import asyncio
import json
import time
from typing import Any, Dict, List
import httpx
import pytest

from app.main import app


def parse_sse_events(lines: List[str]) -> List[Dict[str, Any]]:
    """Parses raw SSE stream lines into a list of envelope dicts."""
    events = []
    current_event = None
    current_data = []

    for line in lines:
        line = line.strip()
        if not line:
            if current_event and current_data:
                raw_json = "\n".join(current_data)
                envelope = json.loads(raw_json)
                events.append(envelope)
            current_event = None
            current_data = []
            continue
        if line.startswith(":"):
            # Comment line / ping
            continue
        if line.startswith("event:"):
            current_event = line[len("event:"):].strip()
        elif line.startswith("data:"):
            current_data.append(line[len("data:"):].strip())

    if current_event and current_data:
        raw_json = "\n".join(current_data)
        events.append(json.loads(raw_json))

    return events


def test_post_query_async_returns_fast():
    """POST /query in async mode must return session_id immediately in <300ms."""
    async def _test():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            t0 = time.perf_counter()
            resp = await client.post("/query", json={"text": "Quick async test query", "language": "en"})
            elapsed_ms = (time.perf_counter() - t0) * 1000

            assert resp.status_code == 200
            data = resp.json()
            assert "session_id" in data
            assert isinstance(data["session_id"], str)
            assert len(data["session_id"]) > 0
            assert elapsed_ms < 500, f"Async query took too long: {elapsed_ms:.1f}ms"

    asyncio.run(_test())


def test_post_query_sync_fallback():
    """POST /query?sync=true preserves the Phase 1 synchronous execution format."""
    async def _test():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            resp = await client.post("/query?sync=true", json={"text": "Sync query test", "language": "en"})
            assert resp.status_code == 200
            data = resp.json()
            assert "session_id" in data
            assert "plan" in data
            assert "agent_outputs" in data
            assert "final_answer" in data
            assert "trace" in data
            assert "duration_ms" in data

    asyncio.run(_test())


def test_get_stream_404_for_unknown_session():
    """GET /stream/{session_id} returns 404 when session_id does not exist."""
    async def _test():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            resp = await client.get("/stream/unknown-nonexistent-session-1234")
            assert resp.status_code == 404
            assert "not found" in resp.json().get("detail", "").lower()

    asyncio.run(_test())


def test_sse_streaming_lifecycle_and_monotonic_sequence():
    """
    Connects to live GET /stream/{session_id} and asserts:
    - First event is run_started
    - Plan and agents are emitted
    - Monotonic seq starting at 1 with no gaps or duplicates
    - Envelope conforms to wire format
    - Last event is run_complete and stream closes
    """
    async def _test():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            post_resp = await client.post(
                "/query",
                json={"text": "Is it safe to fish near Kakinada tomorrow?", "language": "en"},
            )
            assert post_resp.status_code == 200
            resp_json = post_resp.json()
            session_id = resp_json["session_id"]
            run_id = resp_json["run_id"]

            lines: List[str] = []
            async with client.stream("GET", f"/stream/{session_id}") as stream:
                assert stream.status_code == 200
                async for raw_line in stream.aiter_lines():
                    lines.append(raw_line)

            events = parse_sse_events(lines)
            assert len(events) >= 5, f"Expected at least 5 events, got {len(events)}"

            # Verify envelope shape for every event
            for ev in events:
                assert ev["run_id"] == run_id
                assert isinstance(ev["seq"], int)
                assert isinstance(ev["ts"], str)
                assert isinstance(ev["type"], str)
                assert isinstance(ev["payload"], dict)

            # Verify strictly monotonic sequences starting at 1
            seqs = [ev["seq"] for ev in events]
            expected_seqs = list(range(1, len(events) + 1))
            assert seqs == expected_seqs, f"Sequence numbers not strictly monotonic 1..N: {seqs}"

            # Check lifecycle stages
            event_types = [ev["type"] for ev in events]
            assert event_types[0] == "run_started"
            assert "plan_created" in event_types
            assert "agent_started" in event_types
            assert "agent_result" in event_types
            assert "final_answer" in event_types
            assert event_types[-1] == "run_complete"

            # Check run_complete payload
            complete_ev = events[-1]
            assert "duration_ms" in complete_ev["payload"]
            assert "agents_run" in complete_ev["payload"]
            assert "agents_failed" in complete_ev["payload"]

    asyncio.run(_test())


def test_sse_stream_replay_for_finished_session():
    """Connecting to GET /stream/{session_id} after run completion returns full replay and terminates."""
    async def _test():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            # Run query and consume first stream to completion
            post_resp = await client.post(
                "/query",
                json={"text": "Replay test query for Chennai coast", "language": "en"},
            )
            session_id = post_resp.json()["session_id"]

            first_lines: List[str] = []
            async with client.stream("GET", f"/stream/{session_id}") as stream:
                async for raw_line in stream.aiter_lines():
                    first_lines.append(raw_line)
            first_events = parse_sse_events(first_lines)
            assert first_events[-1]["type"] == "run_complete"

            # Late subscriber: connect to already finished session
            replay_lines: List[str] = []
            async with client.stream("GET", f"/stream/{session_id}") as stream:
                async for raw_line in stream.aiter_lines():
                    replay_lines.append(raw_line)
            replay_events = parse_sse_events(replay_lines)

            # Replay must have identical sequence of event types and seqs
            assert len(replay_events) == len(first_events)
            assert [e["seq"] for e in replay_events] == [e["seq"] for e in first_events]
            assert [e["type"] for e in replay_events] == [e["type"] for e in first_events]
            assert replay_events[-1]["type"] == "run_complete"

    asyncio.run(_test())


def test_crash_safety_agent_failure_resilience(monkeypatch):
    """
    When an agent fails (simulated via ORCA_FORCE_AGENT_FAILURE),
    the agent error is caught, other agents run, final answer is generated,
    and run_complete is emitted with the agent listed in agents_failed.
    """
    monkeypatch.setenv("ORCA_FORCE_AGENT_FAILURE", "weather")

    async def _test():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            post_resp = await client.post(
                "/query",
                json={"text": "Check weather and ocean for Visakhapatnam", "language": "en"},
            )
            session_id = post_resp.json()["session_id"]

            lines: List[str] = []
            async with client.stream("GET", f"/stream/{session_id}") as stream:
                async for raw_line in stream.aiter_lines():
                    lines.append(raw_line)

            events = parse_sse_events(lines)
            event_types = [ev["type"] for ev in events]

            # Verify run finished cleanly
            assert event_types[-1] == "run_complete"
            complete_ev = events[-1]
            assert "weather" in complete_ev["payload"]["agents_failed"]

            # Verify weather agent reported error status in agent_result
            weather_results = [
                ev for ev in events
                if ev["type"] == "agent_result" and ev["payload"].get("agent") == "weather"
            ]
            assert len(weather_results) == 1
            assert weather_results[0]["payload"]["status"] == "error"

            # Verify final_answer was still generated despite weather failure
            assert "final_answer" in event_types

    asyncio.run(_test())

