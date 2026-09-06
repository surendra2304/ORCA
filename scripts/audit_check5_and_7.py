import sys
import json
import httpx

if sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

client = httpx.Client(base_url="http://127.0.0.1:8000", timeout=60.0)

with open("scratch/check5_ids.json", "r", encoding="utf-8") as f:
    ids = json.load(f)

session_id = ids["session_id"]
run_id_1 = ids["run_id_1"]
run_id_2 = ids["run_id_2"]

print("=== CHECK 5: POST-RESTART RUN 1 TRACE VERIFICATION ===")
r_trace = client.get(f"/run/{run_id_1}/trace")
assert r_trace.status_code == 200, f"GET /run/{run_id_1}/trace failed: {r_trace.status_code}"
d_trace = r_trace.json()
events = d_trace.get("events", [])
first_type = events[0]["type"] if events else None
last_type = events[-1]["type"] if events else None
print(f"Post-restart /run/{run_id_1}/trace -> event_count: {len(events)}, first: {first_type}, last: {last_type}")
print(f"Matches pre-restart? Count: {len(events) == ids['pre_event_count']}, First: {first_type == ids['pre_first']}, Last: {last_type == ids['pre_last']}")

print("\n=== CHECK 5: POST-RESTART SESSION VERIFICATION ===")
r_sess = client.get(f"/sessions/{session_id}")
assert r_sess.status_code == 200, f"GET /sessions/{session_id} failed: {r_sess.status_code}"
d_sess = r_sess.json()
turns = d_sess.get("turns", [])
print(f"Session {session_id} recovered turns count: {len(turns)}")
for i, turn in enumerate(turns, 1):
    print(f"\nTurn {i}:")
    print(f"  Query:        {turn.get('query')}")
    print(f"  Language:     {turn.get('language')}")
    print(f"  Final Answer: {turn.get('final_answer')}")

print("\n=== CHECK 7: MEMORY PERSISTENCE ACROSS RESTART ===")
# Send follow-up in the same session: "What is the weather there?"
r3 = client.post("/query?sync=true", json={"text": "What is the weather there?", "session_id": session_id, "mode": "mock"})
assert r3.status_code == 200, f"Turn 3 failed: {r3.status_code}"
d3 = r3.json()
plan3 = d3.get("plan", {})
print(f"Turn 3 Plan entity_source: {plan3.get('entity_source')}")
print(f"Turn 3 Plan safety_relevant: {plan3.get('safety_relevant')}")
print(f"Turn 3 Final Answer: {d3.get('final_answer')}")
