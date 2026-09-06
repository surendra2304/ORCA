import json
import tempfile
from pathlib import Path

from app.core.memory import ConversationMemory


def test_conversation_memory_lifecycle_and_persistence():
    with tempfile.TemporaryDirectory() as tmpdir:
        mem = ConversationMemory(turns_cap=3, sessions_dir=tmpdir)
        session_id = "test-session-123"

        assert mem.get_turns(session_id) == []
        assert mem.last_entities(session_id) is None

        # Turn 1
        mem.append_turn(
            session_id=session_id,
            turn={
                "query": "I am in Visakhapatnam",
                "language": "en",
                "entities": {"lat": 17.68, "lon": 83.21, "location_name": "Visakhapatnam"},
                "safety_relevant": True,
                "verdict_summary": "NO_GO",
                "final_answer": "NO_GO: high waves.",
                "run_id": "run-1",
            },
        )

        turns = mem.get_turns(session_id)
        assert len(turns) == 1
        assert turns[0]["query"] == "I am in Visakhapatnam"
        assert turns[0]["run_id"] == "run-1"
        assert mem.last_entities(session_id) == {
            "lat": 17.68,
            "lon": 83.21,
            "location_name": "Visakhapatnam",
        }

        # Verify disk persistence
        sess_file = Path(tmpdir) / f"{session_id}.json"
        assert sess_file.exists()
        with open(sess_file, "r", encoding="utf-8") as f:
            disk_data = json.load(f)
        assert disk_data["session_id"] == session_id
        assert len(disk_data["turns"]) == 1

        # Test lazy load from disk after memory reset (simulating server restart)
        mem2 = ConversationMemory(turns_cap=3, sessions_dir=tmpdir)
        turns2 = mem2.get_turns(session_id)
        assert len(turns2) == 1
        assert turns2[0]["run_id"] == "run-1"
        assert mem2.last_entities(session_id)["location_name"] == "Visakhapatnam"

        # Turn 2, 3, 4 (testing turns cap)
        mem2.append_turn(session_id, {"query": "Turn 2", "run_id": "run-2"})
        mem2.append_turn(session_id, {"query": "Turn 3", "run_id": "run-3"})
        mem2.append_turn(session_id, {"query": "Turn 4", "run_id": "run-4"})

        turns_capped = mem2.get_turns(session_id)
        assert len(turns_capped) == 3
        # Turn 1 should have been dropped (cap=3)
        queries = [t["query"] for t in turns_capped]
        assert queries == ["Turn 2", "Turn 3", "Turn 4"]
