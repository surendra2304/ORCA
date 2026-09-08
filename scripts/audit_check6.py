import sys
import json
import httpx

if sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

client = httpx.Client(base_url="http://127.0.0.1:8000", timeout=60.0)

# Step 1: POST /query
r1 = client.post("/query?sync=true", json={"text": "Is it safe to fish near Visakhapatnam?", "mode": "mock"})
d1 = r1.json()
sid = d1.get("session_id")
rid1 = d1.get("run_id")
print("=== CONTRACT v1.2: session_id & run_id DIFFER ===")
print(f"session_id: {sid}")
print(f"run_id_1:   {rid1}")
print(f"They differ: {sid != rid1 and sid is not None and rid1 is not None}")

# Step 2: Trace envelopes check
t1_resp = client.get(f"/run/{rid1}/trace")
events1 = t1_resp.json().get("events", [])
first_ev = events1[0]
print(f"\nEnvelope run_id matches response run_id: {first_ev.get('run_id') == rid1}")
print(f"First envelope seq starts at 1: {first_ev.get('seq') == 1}")
print(f"Monotonic seq: {[e['seq'] for e in events1]}")

# Step 3: Second query under same session
r2 = client.post("/query?sync=true", json={"text": "What about Kakinada?", "session_id": sid, "mode": "mock"})
d2 = r2.json()
rid2 = d2.get("run_id")
print(f"\nSecond query executed under same session: run_id_2={rid2}")
print(f"run_id_1 != run_id_2: {rid1 != rid2}")

# Helper to read SSE
def parse_sse(url: str):
    envelopes = []
    with client.stream("GET", url) as resp:
        for line in resp.iter_lines():
            line = line.strip()
            if line.startswith("data:"):
                raw = line[len("data:"):].strip()
                if raw:
                    envelopes.append(json.loads(raw))
    return envelopes

# Step 4: Stream /stream/{run_id_1}
s_rid1 = parse_sse(f"/stream/{rid1}")
print(f"\nGET /stream/{rid1} -> {len(s_rid1)} envelopes streamed. All run_ids match run_id_1: {all(e.get('run_id') == rid1 for e in s_rid1)}")

# Step 5: Stream /stream/{session_id}
s_sid = parse_sse(f"/stream/{sid}")
print(f"GET /stream/{sid} -> {len(s_sid)} envelopes streamed. All run_ids match run_id_2: {all(e.get('run_id') == rid2 for e in s_sid)}")

# Proof that second run's plan_created appears
second_plan_created = next((e for e in s_sid if e.get("type") == "plan_created"), None)
print(f"Second run's plan_created present in /stream/{sid}: {second_plan_created is not None}")
print(f"Second plan_created payload query or run_id: {second_plan_created.get('run_id') if second_plan_created else None}")
