import sys
import json
import httpx

if sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

client = httpx.Client(base_url="http://127.0.0.1:8000", timeout=60.0)

print("=== PART A: MULTI-TURN INHERITANCE ===")
# Turn 1
r1 = client.post("/query?sync=true", json={"text": "I will fish from Kakinada tomorrow", "vessel_class": "small_fishing_boat", "mode": "mock"})
d1 = r1.json()
session_id = d1["session_id"]
print(f"--- TURN 1 RESPONSE (session_id={session_id}) ---")
print(f"Status: {r1.status_code}")
print(f"Plan: {json.dumps(d1.get('plan'), indent=2)}")
print(f"Verdict: {json.dumps(d1.get('verdict'), indent=2)}")
print(f"Final Answer: {d1.get('final_answer')}")

# Turn 2 (same session)
r2 = client.post("/query?sync=true", json={"text": "What if I leave at 4 AM instead?", "session_id": session_id, "vessel_class": "small_fishing_boat", "mode": "mock"})
d2 = r2.json()
print(f"\n--- TURN 2 RESPONSE (same session_id={session_id}) ---")
print(f"Status: {r2.status_code}")
print(f"Plan: {json.dumps(d2.get('plan'), indent=2)}")
print(f"Verdict: {json.dumps(d2.get('verdict'), indent=2)}")
print(f"Final Answer: {d2.get('final_answer')}")

print("\n=== PART B: FRESH SESSION NEGATIVE TEST ===")
# Fresh session with only "What if I leave at 4 AM?"
r_fresh = client.post("/query?sync=true", json={"text": "What if I leave at 4 AM?", "vessel_class": "small_fishing_boat", "mode": "mock"})
d_fresh = r_fresh.json()
print(f"--- FRESH SESSION RESPONSE (session_id={d_fresh.get('session_id')}) ---")
print(f"Status: {r_fresh.status_code}")
print(f"Plan: {json.dumps(d_fresh.get('plan'), indent=2)}")
print(f"Verdict: {json.dumps(d_fresh.get('verdict'), indent=2)}")
print(f"Final Answer: {d_fresh.get('final_answer')}")
