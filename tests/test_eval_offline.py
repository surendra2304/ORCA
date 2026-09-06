import json
from pathlib import Path
from eval.evaluator import evaluate_turn_expectations


def test_golden_queries_json_schema():
    """Validates that eval/golden_queries.json exists, parses, and has valid structure."""
    golden_path = Path("eval/golden_queries.json")
    assert golden_path.exists(), "eval/golden_queries.json must exist"

    with open(golden_path, "r", encoding="utf-8") as f:
        entries = json.load(f)

    assert isinstance(entries, list)
    assert len(entries) == 15, f"Expected 15 golden entries, got {len(entries)}"

    ids = [e.get("id") for e in entries]
    expected_ids = [f"g{i:02d}" for i in range(1, 16)]
    assert ids == expected_ids, f"Golden query IDs must be g01..g15, got {ids}"

    entry_map = {e["id"]: e for e in entries}
    for multi_id in ["g06", "g12", "g13"]:
        turns = entry_map[multi_id]["turns"]
        assert len(turns) >= 2, f"{multi_id} must have at least 2 turns"
        sids = [t.get("session_id") for t in turns]
        assert len(set(sids)) == 1, f"{multi_id} must use a shared session_id across turns, got {sids}"
        assert sids[0] is not None, f"{multi_id} session_id must not be null"

    for entry in entries:
        assert "id" in entry
        assert "turns" in entry and isinstance(entry["turns"], list) and len(entry["turns"]) >= 1
        for turn in entry["turns"]:
            assert "query" in turn
            assert "expect" in turn
            assert isinstance(turn["expect"], dict)


def test_evaluator_http_status():
    passed, failures = evaluate_turn_expectations({"http_status": 400}, 400, {})
    assert passed is True
    assert failures == []

    passed, failures = evaluate_turn_expectations({"http_status": 400}, 200, {})
    assert passed is False
    assert any("400" in f for f in failures)


def test_evaluator_language_and_script():
    data = {
        "language": "hi",
        "final_answer": "नमस्ते, समुद्र में जाना सुरक्षित नहीं है।",
    }
    expect = {"language": "hi", "language_script_regex": r"[\u0900-\u097F]"}
    passed, failures = evaluate_turn_expectations(expect, 200, data)
    assert passed is True

    # Bad language
    passed, failures = evaluate_turn_expectations({"language": "te"}, 200, data)
    assert passed is False

    # Bad script regex
    passed, failures = evaluate_turn_expectations({"language_script_regex": r"[\u0C00-\u0C7F]"}, 200, data)
    assert passed is False


def test_evaluator_verdict_and_cautions():
    data = {
        "verdict": {"verdict": "NO_GO"},
        "plan": {"safety_relevant": True},
        "final_answer": "Verdict is NO_GO due to high waves.",
    }
    expect = {
        "safety_relevant": True,
        "verdict": "NO_GO",
        "answer_mentions_any": ["NO_GO", "prohibited"],
    }
    passed, failures = evaluate_turn_expectations(expect, 200, data)
    assert passed is True

    # Bad verdict
    passed, failures = evaluate_turn_expectations({"verdict": "GO"}, 200, data)
    assert passed is False


def test_evaluator_agents_and_inheritance():
    data = {
        "plan": {
            "needed_agents": ["weather", "ocean", "pfz", "geospatial"],
            "execution_plan": [["weather", "ocean", "pfz"], ["geospatial"]],
            "entity_source": "inherited",
        },
        "verdict": {"verdict": "CAUTION"},
    }
    expect = {
        "needed_agents_superset": ["weather", "geospatial"],
        "geospatial_after_pfz": True,
        "entity_inherited": True,
        "verdict_in": ["GO", "CAUTION"],
    }
    passed, failures = evaluate_turn_expectations(expect, 200, data)
    assert passed is True

    # Bad batch order
    bad_data = {
        "plan": {
            "needed_agents": ["pfz", "geospatial"],
            "execution_plan": [["geospatial"], ["pfz"]],
            "entity_source": "query",
        }
    }
    passed, failures = evaluate_turn_expectations({"geospatial_after_pfz": True}, 200, bad_data)
    assert passed is False
    passed, failures = evaluate_turn_expectations({"entity_inherited": True}, 200, bad_data)
    assert passed is False
