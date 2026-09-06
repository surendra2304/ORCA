import argparse
import asyncio
import json
import os
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional
import httpx

sys.path.insert(0, os.getcwd())
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from eval.evaluator import evaluate_turn_expectations


async def run_evaluation(
    base_url: str = "http://127.0.0.1:8000",
    mode_filter: Optional[str] = None,
    offline: bool = False,
    retries: int = 1,
    golden_path: str = "eval/golden_queries.json",
    report_path: str = "eval/last_report.md",
) -> int:
    path = Path(golden_path)
    if not path.exists():
        print(f"Error: Golden file '{golden_path}' not found.")
        return 1

    with open(path, "r", encoding="utf-8") as f:
        golden_entries: List[Dict[str, Any]] = json.load(f)

    results: List[Dict[str, Any]] = []
    total_passed = 0
    total_failed = 0
    total_skipped = 0

    print("=" * 75)
    print(f"ORCA Phase 7 Evaluation Runner against {base_url}")
    print(f"Total entries: {len(golden_entries)} | Mode filter: {mode_filter} | Offline: {offline}")
    print("=" * 75)

    async with httpx.AsyncClient(base_url=base_url, timeout=60.0) as client:
        # Check server health first
        try:
            h_resp = await client.get("/health")
            if h_resp.status_code != 200:
                print(f"Warning: Health check returned {h_resp.status_code}")
        except Exception as exc:
            if not offline:
                print(f"Error connecting to server at {base_url}: {exc}")
                return 1

        for entry in golden_entries:
            entry_id = entry.get("id", "unknown")
            turns = entry.get("turns", [])

            # Check mode filter
            entry_modes = [t.get("mode", "mock") for t in turns]
            if mode_filter and all(m != mode_filter for m in entry_modes):
                results.append({
                    "id": entry_id,
                    "status": "SKIP",
                    "checks": "0/0",
                    "details": f"Filtered out by mode_filter={mode_filter}",
                })
                total_skipped += 1
                continue

            # Check offline skip (e.g. g14 real-mode query requiring live internet)
            if offline and entry_id == "g14":
                results.append({
                    "id": entry_id,
                    "status": "SKIP",
                    "checks": "0/0",
                    "details": "Skipped in --offline mode",
                })
                total_skipped += 1
                continue

            # Run turns in sequence for this entry
            entry_status = "PASS"
            entry_detail = ""
            turn_passed_count = 0
            total_turn_checks = 0

            # Generate session_id for shared session entries if needed
            shared_session_id = None
            if any(t.get("session_id") for t in turns):
                first_shared = next(t.get("session_id") for t in turns if t.get("session_id"))
                shared_session_id = f"{first_shared}-{os.getpid()}"

            for turn_idx, turn in enumerate(turns, 1):
                query = turn["query"]
                mode = turn.get("mode", "mock")
                vessel_class = turn.get("vessel_class", "small_fishing_boat")
                expect = turn.get("expect", {})
                num_checks = len(expect)
                total_turn_checks += num_checks

                turn_session_id = shared_session_id if turn.get("session_id") else None

                print(f"[{entry_id}] Running turn {turn_idx}/{len(turns)}: '{query[:45]}...' (mode={mode})", flush=True)
                # Attempt with retries
                turn_success = False
                turn_failures: List[str] = []

                for attempt in range(retries + 1):
                    try:
                        resp = await client.post(
                            "/query?sync=true",
                            json={
                                "text": query,
                                "session_id": turn_session_id,
                                "mode": mode,
                                "vessel_class": vessel_class,
                            },
                        )
                        status_code = resp.status_code
                        data = resp.json() if status_code == 200 else {}
                    except Exception as req_exc:
                        status_code = 500
                        data = {"error": str(req_exc)}

                    turn_success, turn_failures = evaluate_turn_expectations(expect, status_code, data)
                    if turn_success:
                        break
                    if attempt < retries:
                        print(f"[{entry_id}] Turn {turn_idx} attempt {attempt+1} failed ({turn_failures}); retrying...", flush=True)
                        await asyncio.sleep(1.0)

                if turn_success:
                    turn_passed_count += num_checks
                else:
                    entry_status = "FAIL"
                    entry_detail = f"Turn {turn_idx} failed: " + "; ".join(turn_failures)
                    break

            if entry_status == "PASS":
                total_passed += 1
                results.append({
                    "id": entry_id,
                    "status": "PASS",
                    "checks": f"{total_turn_checks}/{total_turn_checks}",
                    "details": "All checks passed",
                })
                print(f"[{entry_id}] PASS ({total_turn_checks}/{total_turn_checks})", flush=True)
            else:
                total_failed += 1
                results.append({
                    "id": entry_id,
                    "status": "FAIL",
                    "checks": f"{turn_passed_count}/{total_turn_checks}",
                    "details": entry_detail,
                })
                print(f"[{entry_id}] FAIL: {entry_detail}", flush=True)

    # Build Markdown Report
    report_lines = [
        "# ORCA Phase 7 Evaluation Report",
        "",
        f"**Base URL:** `{base_url}`  ",
        f"**Summary:** Total: {len(golden_entries)} | Passed: {total_passed} | Failed: {total_failed} | Skipped: {total_skipped}  ",
        "",
        "| ID | Status | Checks | Failure / Notes |",
        "|---|---|---|---|",
    ]

    for r in results:
        report_lines.append(f"| {r['id']} | **{r['status']}** | {r['checks']} | {r['details']} |")

    report_lines.append("")
    status_summary = "PASSED" if total_failed == 0 else f"FAILED ({total_failed} failures)"
    report_lines.append(f"**Final Verdict:** {status_summary}")

    report_content = "\n".join(report_lines) + "\n"
    Path(report_path).parent.mkdir(parents=True, exist_ok=True)
    with open(report_path, "w", encoding="utf-8") as f:
        f.write(report_content)

    print("\n" + report_content)
    return 0 if total_failed == 0 else 1


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="ORCA Phase 7 Evaluation Runner")
    parser.add_argument("--base-url", default="http://127.0.0.1:8000", help="Base URL of running server")
    parser.add_argument("--mode-filter", default=None, choices=["mock", "real"], help="Filter by mock/real mode")
    parser.add_argument("--offline", action="store_true", help="Skip entries requiring live internet / external services")
    parser.add_argument("--retries", type=int, default=1, help="Number of retries per failed turn")
    args = parser.parse_args()

    exit_code = asyncio.run(
        run_evaluation(
            base_url=args.base_url,
            mode_filter=args.mode_filter,
            offline=args.offline,
            retries=args.retries,
        )
    )
    sys.exit(exit_code)
