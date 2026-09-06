import sys
import json
import httpx

if sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

client = httpx.Client(base_url="http://127.0.0.1:8000", timeout=60.0)

# Turn 1
r1 = client.post("/query?sync=true", json={"text": "I will fish from Kakinada tomorrow. Is it safe?", "mode": "mock"})
d1 = r1.json()
session_id = d1["session_id"]
run_id_1 = d1["run_id"]

# Turn 2
r2 = client.post("/query?sync=true", json={"text": "What if I leave at 4 AM instead?", "session_id": session_id, "mode": "mock"})
d2 = r2.json()
run_id_2 = d2["run_id"]

# Pre-restart check of run 1 trace
t1_resp = client.get(f"/run/{run_id_1}/trace")
t1_data = t1_resp.json()
events = t1_data.get("events", [])
print(f"PRE-RESTART RUN 1: run_id={run_id_1}, event_count={len(events)}, first={events[0]['type']}, last={events[-1]['type']}")

with open("scratch/check5_ids.json", "w", encoding="utf-8") as f:
    json.dump({
        "session_id": session_id,
        "run_id_1": run_id_1,
        "run_id_2": run_id_2,
        "pre_event_count": len(events),
        "pre_first": events[0]["type"],
        "pre_last": events[-1]["type"],
    }, f)

print(f"Session established: {session_id} with 2 turns.")
