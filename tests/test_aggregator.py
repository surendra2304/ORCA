import asyncio
from unittest.mock import AsyncMock, patch
from app.graph.aggregator import aggregator_node, AGGREGATOR_SYSTEM_TEMPLATE
from app.graph.trace import TraceCollector


def test_aggregator_null_user_prompt_contract():
    """
    Check 4: Offline unit test for user=null geospatial payload + aggregator.
    Asserts:
    1. The aggregator system prompt contains the new null-user honesty guard instructions
       for EEZ boundaries and restricted zones.
    2. Prompt contains multilingual instructions for native words for verdict.
    3. The resulting answer contains no claim of being outside/inside any boundary when user=null.
    """
    async def _run():
        collector = TraceCollector()
        geospatial_payload = {
            "source": "orca:geospatial",
            "user": None,
            "pfz": None,
            "ports": None,
            "eez": {
                "inside": False,
                "nearest_boundary_km": None,
                "boundary_file": "india_eez_simplified.geojson",
            },
            "restricted": None,
            "note": "no location in query",
        }

        state = {
            "query": "What if I leave at 4 AM?",
            "language": "en",
            "agent_outputs": {
                "geospatial": geospatial_payload,
                "weather": {
                    "source": "mock:IMD",
                    "wind_knots": 14.2,
                    "gusts_knots": 22.0,
                },
                "ocean": {
                    "source": "mock:INCOIS-OSF",
                    "wave_height_m": 2.8,
                },
            },
            "verdict": {
                "verdict": "NO_GO",
                "reason": "NO-GO: wave height 2.8 m exceeds the 2.5 m limit for small_fishing_boat",
                "unassessed_checks": ["geofence"],
                "violations": [
                    {"parameter": "wave_height_m", "value": 2.8, "status": "stop"}
                ],
            },
        }

        captured_system = None
        captured_prompt = None

        compliant_answer = (
            "Safety Verdict: NO_GO\n\n"
            "Reason: wave height 2.8 m exceeds the 2.5 m limit for small_fishing_boat.\n"
            "Location is unknown/needed. Weather: wind 14.2 knots, gusts 22.0 knots."
        )

        async def mock_call_llm(prompt: str, system: str) -> str:
            nonlocal captured_system, captured_prompt
            captured_prompt = prompt
            captured_system = system
            return compliant_answer

        with patch("app.graph.aggregator.call_llm", side_effect=mock_call_llm):
            result = await aggregator_node(state, collector)

        # 1. Assert prompt contains the honesty guard for EEZ boundary / Indian waters
        assert captured_system is not None
        assert "When eez.inside=false AND the user position is known, state the position is outside Indian waters." in captured_system
        assert "When the user position is UNKNOWN (user=null), you MUST say the location is unknown/needed — NEVER claim the vessel is outside Indian waters, near a boundary, or inside any zone." in captured_system

        # 2. Assert prompt contains the honesty guard for restricted zones
        assert "only name a restricted zone when restricted.inside is true; when user=null, never imply presence in or near any zone." in captured_system

        # 3. Assert prompt contains multilingual native verdict instruction
        assert "For hi/bn/mr use the native word for verdict (Hindi: निर्णय, Bengali: রায়); never transliterate the English word." in captured_system

        # 4. Assert the final answer contains no claim of being outside/inside any boundary or zone
        answer_lower = result["final_answer"].lower()
        forbidden_claims = [
            "outside indian waters",
            "outside the indian eez",
            "outside indian eez boundary",
            "near a boundary",
            "inside restricted zone",
            "inside naval",
            "inside any zone",
        ]
        for phrase in forbidden_claims:
            assert phrase not in answer_lower, f"Answer contains prohibited boundary claim: '{phrase}'"

        # Assert trace event 'final_answer' was emitted
        answer_events = [e for e in collector.events if e["event"] == "final_answer"]
        assert len(answer_events) == 1
        assert answer_events[0]["data"]["text"] == compliant_answer

    asyncio.run(_run())


def test_aggregator_null_user_violative_mock_prompt_contract():
    """
    Check 4: Explicit prompt-contract test mocking the LLM with a violative response
    and asserting the system prompt contains the new guard instructions.
    """
    async def _run():
        collector = TraceCollector()
        geospatial_payload = {
            "source": "orca:geospatial",
            "user": None,
            "pfz": None,
            "ports": None,
            "eez": {
                "inside": False,
                "nearest_boundary_km": None,
                "boundary_file": "india_eez_simplified.geojson",
            },
            "restricted": None,
            "note": "no location in query",
        }

        state = {
            "query": "What if I leave at 4 AM?",
            "language": "en",
            "agent_outputs": {"geospatial": geospatial_payload},
            "verdict": {
                "verdict": "NO_GO",
                "reason": "NO-GO: wave height 2.8 m exceeds the 2.5 m limit for small_fishing_boat",
                "unassessed_checks": ["geofence"],
            },
        }

        captured_system = None
        violative_llm_response = "The vessel is outside Indian waters and near a restricted boundary zone."

        async def mock_call_llm(prompt: str, system: str) -> str:
            nonlocal captured_system
            captured_system = system
            return violative_llm_response

        with patch("app.graph.aggregator.call_llm", side_effect=mock_call_llm):
            result = await aggregator_node(state, collector)

        # Prompt-contract assertion: despite violative mock response, verify the prompt strictly contained the guards
        assert captured_system is not None
        assert "When eez.inside=false AND the user position is known, state the position is outside Indian waters." in captured_system
        assert "When the user position is UNKNOWN (user=null), you MUST say the location is unknown/needed — NEVER claim the vessel is outside Indian waters, near a boundary, or inside any zone." in captured_system
        assert "only name a restricted zone when restricted.inside is true; when user=null, never imply presence in or near any zone." in captured_system
        assert "For hi/bn/mr use the native word for verdict (Hindi: निर्णय, Bengali: রায়); never transliterate the English word." in captured_system

    asyncio.run(_run())

