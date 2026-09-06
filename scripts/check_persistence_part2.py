import httpx
import json

with open("scratch/persisted_ids.json", "r", encoding="utf-8") as f:
    ids = json.load(f)

session_id = ids["session_id"]
run_id_1 = ids["run_id_1"]
run_id_2 = ids["run_id_2"]

client = httpx.Client(base_url="http://127.0.0.1:8000", timeout=10.0)

print("=== CHECKING PERSISTED SESSION ===")
s_resp = client.get(f"/sessions/{session_id}")
print(f"GET /sessions/{session_id} -> Status: {s_resp.status_code}")
session_data = s_resp.json()
print(f"Session ID: {session_data.get('session_id')}")
turns = session_data.get("turns", [])
print(f"Recovered Turns Count: {len(turns)}")
for i, turn in enumerate(turns, 1):
    print(f"  Turn {i}: Query='{turn.get('query')}', RunID='{turn.get('run_id')}'")

print("\n=== CHECKING PERSISTED RUN 1 TRACE ===")
t1_resp = client.get(f"/run/{run_id_1}/trace")
print(f"GET /run/{run_id_1}/trace -> Status: {t1_resp.status_code}")
t1_data = t1_resp.json()
t1_events = t1_data.get("events", [])
print(f"Run 1 Envelopes Count: {len(t1_events)}")
if t1_events:
    print(f"  First event: {t1_events[0].get('type')} (seq={t1_events[0].get('seq')})")
    print(f"  Last event:  {t1_events[-1].get('type')} (seq={t1_events[-1].get('seq')})")

print("\n=== CHECKING PERSISTED RUN 2 TRACE ===")
t2_resp = client.get(f"/run/{run_id_2}/trace")
print(f"GET /run/{run_id_2}/trace -> Status: {t2_resp.status_code}")
t2_data = t2_resp.json()
t2_events = t2_data.get("events", [])
print(f"Run 2 Envelopes Count: {len(t2_events)}")
if t2_events:
    print(f"  First event: {t2_events[0].get('type')} (seq={t2_events[0].get('seq')})")
    print(f"  Last event:  {t2_events[-1].get('type')} (seq={t2_events[-1].get('seq')})")
