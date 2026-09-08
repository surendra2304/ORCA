import re
from typing import Any, Dict, List, Tuple


def evaluate_turn_expectations(
    expect: Dict[str, Any],
    status_code: int,
    data: Dict[str, Any],
) -> Tuple[bool, List[str]]:
    """
    Pure expectation evaluator function.
    Returns (is_passed, list_of_failure_reasons).
    """
    failures: List[str] = []

    # 1. HTTP Status expectation
    if "http_status" in expect:
        expected_status = expect["http_status"]
        if status_code != expected_status:
            failures.append(f"HTTP status expected {expected_status}, got {status_code}")
            return False, failures

    # If http_status was expected (e.g. 400), don't check data fields
    if status_code >= 400:
        return len(failures) == 0, failures

    # 2. Language expectation
    if "language" in expect:
        exp_lang = expect["language"].strip().lower()
        actual_lang = str(data.get("language") or "").strip().lower()
        if actual_lang != exp_lang:
            failures.append(f"Language expected '{exp_lang}', got '{actual_lang}'")

    # 3. Language script regex expectation (evaluated on final_answer or text)
    if "language_script_regex" in expect:
        pattern = expect["language_script_regex"]
        answer_text = str(data.get("final_answer") or "")
        if not re.search(pattern, answer_text):
            failures.append(f"Script regex '{pattern}' did not match answer text: '{answer_text[:80]}...'")

    # 4. Safety relevant expectation
    if "safety_relevant" in expect:
        exp_sr = bool(expect["safety_relevant"])
        plan = data.get("plan") or {}
        actual_sr = plan.get("safety_relevant")
        if actual_sr is None:
            actual_sr = data.get("safety_relevant")
        if actual_sr is None:
            actual_sr = True
        actual_sr = bool(actual_sr)
        if actual_sr != exp_sr:
            failures.append(f"safety_relevant expected {exp_sr}, got {actual_sr}")

    # 5. Verdict exact expectation
    if "verdict" in expect:
        exp_verdict = expect["verdict"]
        verdict_obj = data.get("verdict")
        actual_verdict = verdict_obj.get("verdict") if isinstance(verdict_obj, dict) else None
        if actual_verdict != exp_verdict:
            failures.append(f"verdict expected '{exp_verdict}', got '{actual_verdict}'")

    # 6. Verdict in list expectation
    if "verdict_in" in expect:
        allowed = expect["verdict_in"]
        verdict_obj = data.get("verdict")
        actual_verdict = verdict_obj.get("verdict") if isinstance(verdict_obj, dict) else None
        if actual_verdict not in allowed:
            failures.append(f"verdict '{actual_verdict}' not in allowed list {allowed}")

    # 7. Answer mentions any expectation
    if "answer_mentions_any" in expect:
        substrings = [s.lower() for s in expect["answer_mentions_any"]]
        answer_lower = str(data.get("final_answer") or "").lower()
        if not any(s in answer_lower for s in substrings):
            failures.append(f"final_answer does not mention any of {substrings}")

    # 8. Needed agents superset expectation
    if "needed_agents_superset" in expect:
        required = expect["needed_agents_superset"]
        plan = data.get("plan") or {}
        needed = plan.get("needed_agents") or []
        for req in required:
            if req not in needed:
                failures.append(f"required agent '{req}' missing from needed_agents {needed}")

    # 9. Geospatial after PFZ batch expectation
    if expect.get("geospatial_after_pfz") is True:
        plan = data.get("plan") or {}
        exec_plan = plan.get("execution_plan") or []
        pfz_batch = -1
        geo_batch = -1
        for idx, batch in enumerate(exec_plan):
            if isinstance(batch, list):
                if "pfz" in batch:
                    pfz_batch = idx
                if "geospatial" in batch:
                    geo_batch = idx
        if pfz_batch == -1 or geo_batch == -1 or geo_batch <= pfz_batch:
            failures.append(f"geospatial (batch {geo_batch}) must run strictly after pfz (batch {pfz_batch})")

    # 10. Entity inherited expectation
    if expect.get("entity_inherited") is True:
        plan = data.get("plan") or {}
        es = plan.get("entity_source")
        if es != "inherited":
            failures.append(f"entity_source expected 'inherited', got '{es}'")

    return len(failures) == 0, failures
