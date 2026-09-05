import argparse
from datetime import datetime, timezone
import json
import sys
import time
import httpx

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

DEFAULT_QUERY = "Is it safe to fish near Visakhapatnam tomorrow?"
DEFAULT_BASE_URL = "http://127.0.0.1:8000"


def format_ts(ts_str: str) -> str:
    """Formats an ISO timestamp to [HH:MM:SS.mmm]."""
    try:
        dt = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
        return dt.strftime("%H:%M:%S.%f")[:-3]
    except Exception:
        return datetime.now(timezone.utc).strftime("%H:%M:%S.%f")[:-3]


def main():
    parser = argparse.ArgumentParser(description="ORCA Phase 2 Live SSE Streaming Client")
    parser.add_argument(
        "query",
        nargs="?",
        default=DEFAULT_QUERY,
        help=f"Query to send to ORCA (default: '{DEFAULT_QUERY}')",
    )
    parser.add_argument(
        "--lang",
        default="en",
        help="Language code (default: 'en')",
    )
    parser.add_argument(
        "--vessel",
        default="small_fishing_boat",
        help="Vessel class (default: 'small_fishing_boat')",
    )
    parser.add_argument(
        "--mode",
        choices=["mock", "real"],
        default=None,
        help="Execution mode (default: server default from settings.MOCK_MODE)",
    )
    parser.add_argument(
        "--base-url",
        default=DEFAULT_BASE_URL,
        help=f"ORCA base URL (default: {DEFAULT_BASE_URL})",
    )
    args = parser.parse_args()

    base_url = args.base_url.rstrip("/")

    print("=" * 70)
    print("ORCA Reasoning Engine - Live SSE Streaming Client")
    print("=" * 70)
    print(f"Query:        '{args.query}'")
    print(f"Language:     {args.lang}")
    print(f"Vessel Class: {args.vessel}")
    print(f"Mode:         {args.mode or 'default (mock)'}")
    print(f"Base URL:     {base_url}")
    print("-" * 70)

    # 1. Start query as background task
    t0 = time.perf_counter()
    query_body = {
        "text": args.query,
        "language": args.lang,
        "vessel_class": args.vessel,
    }
    if args.mode is not None:
        query_body["mode"] = args.mode

    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.post(
                f"{base_url}/query",
                json=query_body,
            )
            resp.raise_for_status()
            init_data = resp.json()
    except httpx.ConnectError:
        print(f"\n[ERROR] Could not connect to {base_url}.")
        print("Please ensure the FastAPI server is running with:")
        print("  uv run uvicorn app.main:app --reload")
        sys.exit(1)
    except Exception as exc:
        print(f"\n[ERROR] Failed to start query: {exc}")
        sys.exit(1)

    post_latency_ms = int((time.perf_counter() - t0) * 1000)
    session_id = init_data.get("session_id")
    if not session_id:
        print(f"\n[ERROR] No session_id returned: {init_data}")
        sys.exit(1)

    print(f"POST /query returned session_id={session_id} in {post_latency_ms} ms")
    print(f"Connecting to live SSE stream: {base_url}/stream/{session_id}")
    print("-" * 70)

    # 2. Connect to SSE stream
    stream_url = f"{base_url}/stream/{session_id}"
    event_count = 0
    final_advisory_text = None
    final_verdict_data = None

    try:
        with httpx.Client(timeout=60.0) as client:
            with client.stream("GET", stream_url) as stream:
                if stream.status_code != 200:
                    print(f"\n[ERROR] Stream endpoint returned HTTP {stream.status_code}")
                    sys.exit(1)

                current_event = None
                current_data_lines = []

                for raw_line in stream.iter_lines():
                    line = raw_line.strip()
                    if not line:
                        if current_event and current_data_lines:
                            raw_json = "\n".join(current_data_lines)
                            try:
                                envelope = json.loads(raw_json)
                            except Exception:
                                envelope = {}

                            event_count += 1
                            seq = envelope.get("seq", event_count)
                            ts_formatted = format_ts(envelope.get("ts", ""))
                            etype = envelope.get("type", current_event)
                            payload = envelope.get("payload", {})
                            agent = payload.get("agent", "")

                            # Generate clean summary
                            summary = ""
                            if etype == "run_started":
                                summary = f"Started session {envelope.get('run_id')}"
                            elif etype == "plan_created":
                                needed = payload.get("needed_agents", [])
                                batches = len(payload.get("execution_plan", []))
                                summary = f"Plan: {needed} across {batches} batch(es)"
                            elif etype == "agent_started":
                                summary = f"Agent {agent} started execution"
                            elif etype == "tool_called":
                                tool_name = payload.get("tool", "")
                                params = payload.get("params", {})
                                summary = f"Invoked {tool_name} params={params}"
                            elif etype == "agent_result":
                                summary = payload.get("summary", f"Agent {agent} finished")
                            elif etype == "verdict":
                                final_verdict_data = payload
                                verdict_val = payload.get("verdict", "UNKNOWN")
                                reason = payload.get("reason", "")
                                summary = f"Verdict: [{verdict_val}] - {reason}"
                            elif etype == "final_answer":
                                final_advisory_text = payload.get("text", "")
                                summary = f"Final answer synthesized ({len(final_advisory_text)} chars)"
                            elif etype == "run_complete":
                                dur = payload.get("duration_ms", 0)
                                run_list = payload.get("agents_run", [])
                                failed_list = payload.get("agents_failed", [])
                                summary = f"Run complete in {dur}ms (agents: {len(run_list)} run, {len(failed_list)} failed)"
                            elif etype == "error":
                                summary = f"ERROR in {payload.get('stage')}: {payload.get('message')}"
                            else:
                                summary = str(payload)[:60]

                            agent_col = f"[{agent}]" if agent else ""
                            print(f"[{ts_formatted}] #{seq:<2} {etype:<15} {agent_col:<14} {summary}")

                            if etype == "run_complete":
                                break

                        current_event = None
                        current_data_lines = []
                        continue

                    if line.startswith(":"):
                        # SSE comment heartbeat
                        continue
                    if line.startswith("event:"):
                        current_event = line[len("event:"):].strip()
                    elif line.startswith("data:"):
                        current_data_lines.append(line[len("data:"):].strip())

    except httpx.ConnectError:
        print(f"\n[ERROR] Lost connection to SSE stream at {stream_url}")
        sys.exit(1)
    except Exception as exc:
        print(f"\n[ERROR] Stream error: {exc}")
        sys.exit(1)

    total_wall_ms = int((time.perf_counter() - t0) * 1000)

    if final_verdict_data:
        print("\n" + "=" * 70)
        print(f"--- DETERMINISTIC SAFETY VERDICT: {final_verdict_data.get('verdict')} ---")
        print(f"Reason: {final_verdict_data.get('reason')}")
        if final_verdict_data.get("violations"):
            print("Violations:")
            for v in final_verdict_data["violations"]:
                print(f"  * {v['parameter']}: {v['value']} (limit: {v['stop']})")
        if final_verdict_data.get("cautions"):
            print("Cautions:")
            for c in final_verdict_data["cautions"]:
                print(f"  * {c['parameter']}: {c['value']} (caution: {c['caution']})")
        print("=" * 70)

    if final_advisory_text:
        print("\n" + "=" * 70)
        print("--- FINAL ADVISORY ---")
        print(final_advisory_text.strip())
        print("=" * 70)

    print(f"\n[PASS] Stream finished cleanly. Total events: {event_count}. Total wall-clock time: {total_wall_ms} ms (~{total_wall_ms/1000:.2f}s)\n")


if __name__ == "__main__":
    main()

