import sys
import httpx
import json

if sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

client = httpx.Client(base_url='http://127.0.0.1:8000', timeout=60.0)

# Step 1: Run Turn 1
r1 = client.post('/query?sync=true', json={'text': 'I will fish from Kakinada tomorrow. Is it safe?', 'mode': 'mock'})
d1 = r1.json()
session_id = d1['session_id']
run_id_1 = d1['run_id']
print(f"Turn 1 executed: session_id={session_id}, run_id_1={run_id_1}")

# Step 2: Run Turn 2
r2 = client.post('/query?sync=true', json={'text': 'What if I leave at 4 AM instead?', 'session_id': session_id, 'mode': 'mock'})
d2 = r2.json()
run_id_2 = d2['run_id']
print(f"Turn 2 executed: session_id={session_id}, run_id_2={run_id_2}")

# Save IDs for post-restart verification
with open("scratch/persisted_ids.json", "w", encoding="utf-8") as f:
    json.dump({"session_id": session_id, "run_id_1": run_id_1, "run_id_2": run_id_2}, f)

print("Pre-restart session state:")
s_resp = client.get(f"/sessions/{session_id}")
print(f"Status: {s_resp.status_code}, turns count: {len(s_resp.json().get('turns', []))}")
