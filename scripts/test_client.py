import argparse
import json
import sys
import httpx

DEFAULT_QUERY = "Is it safe to fish near Visakhapatnam tomorrow?"
SERVER_URL = "http://127.0.0.1:8000/query"


def main():
    parser = argparse.ArgumentParser(description="ORCA Phase 1 CLI Test Client")
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
        "--url",
        default=SERVER_URL,
        help=f"ORCA query endpoint URL (default: {SERVER_URL})",
    )
    args = parser.parse_args()

    print("=" * 65)
    print("ORCA Reasoning Engine - Synchronous Query Client")
    print("=" * 65)
    print(f"Query:    '{args.query}'")
    print(f"Language: {args.lang}")
    print(f"Endpoint: {args.url}")
    print("-" * 65)
    print("Sending request... (agents running in batches with simulated latency)")

    try:
        with httpx.Client(timeout=60.0) as client:
            resp = client.post(args.url, json={"text": args.query, "language": args.lang})
            resp.raise_for_status()
            data = resp.json()
    except httpx.ConnectError:
        print(f"\n[ERROR] Could not connect to {args.url}.")
        print("Please ensure the FastAPI server is running with:")
        print("  uv run uvicorn app.main:app --reload")
        sys.exit(1)
    except Exception as exc:
        print(f"\n[ERROR] Request failed: {exc}")
        sys.exit(1)

    session_id = data.get("session_id", "N/A")
    plan = data.get("plan", {})
    needed_agents = plan.get("needed_agents", [])
    execution_plan = plan.get("execution_plan", [])
    agent_outputs = data.get("agent_outputs", {})
    final_answer = data.get("final_answer", "")
    duration_ms = data.get("duration_ms", 0)
    trace = data.get("trace", [])

    print(f"\n[SUCCESS] Response received in {duration_ms} ms (~{duration_ms/1000:.2f}s)")
    print(f"Session ID: {session_id}")

    print("\n--- EXECUTION PLAN ---")
    print(f"Needed Agents ({len(needed_agents)}): {', '.join(needed_agents)}")
    for idx, batch in enumerate(execution_plan):
        print(f"  Batch {idx + 1} (parallel): {', '.join(batch)}")

    print("\n--- AGENT OUTPUTS SUMMARY ---")
    for agent_name, payload in agent_outputs.items():
        source = payload.get("source", "unknown")
        print(f"  * [{agent_name.upper()}] (Source: {source})")
        if agent_name == "geospatial":
            print(f"      Dist to PFZ:  {payload.get('dist_to_pfz_km')} km (bearing {payload.get('bearing_to_pfz_deg')} deg)")
            print(f"      Dist to Port: {payload.get('dist_to_port_km')} km ({payload.get('port_name')})")
        elif agent_name == "weather":
            print(f"      Wind: {payload.get('wind_knots')} kts (gusts {payload.get('gusts_knots')} kts), Rain: {payload.get('rain_mm')} mm")
        elif agent_name == "ocean":
            print(f"      Waves: {payload.get('wave_height_m')} m, Swell: {payload.get('swell_height_m')} m, SST: {payload.get('sst_c')} C")
        elif agent_name == "pfz":
            zones = payload.get("zones", [])
            print(f"      Advisory ID: {payload.get('advisory_id')}, Zones: {len(zones)}")
        elif agent_name == "satellite":
            print(f"      Chlorophyll-a: {payload.get('chlorophyll_mg_m3')} mg/m3, SST: {payload.get('sst_c')} C")
        elif agent_name == "hazard":
            alerts = payload.get("alerts", [])
            print(f"      Alerts: {len(alerts)} ({', '.join(a.get('type') for a in alerts)})")
        else:
            print(f"      Data: {json.dumps(payload, indent=8)}")

    print("\n--- FINAL ADVISORY ---")
    print(final_answer.strip())

    print("\n--- TRACE SUMMARY ---")
    print(f"Total events recorded: {len(trace)}")
    for ev in trace:
        ev_type = ev.get("event")
        ag = ev.get("agent") or "system"
        ts = ev.get("ts", "")[-12:]
        print(f"  [{ts}] {ev_type:<14} (agent: {ag})")

    print("=" * 65)


if __name__ == "__main__":
    main()
