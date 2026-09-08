import subprocess
import httpx
import json

client = httpx.Client(base_url="http://127.0.0.1:8000", timeout=30.0)

# Check 7.1: /health has all 5 fields
health_resp = client.get("/health")
assert health_resp.status_code == 200
h_data = health_resp.json()
required_health_keys = {"app", "version", "mock_mode", "gemini_configured", "groq_configured"}
assert required_health_keys.issubset(h_data.keys()), f"Missing health keys: {required_health_keys - set(h_data.keys())}"
print(f"1. /health 5 fields PASS: {h_data}")

# Check 7.2: Default mock small boat -> NO_GO (wave 2.8 vs 2.5)
q_resp = client.post("/query?sync=true", json={"text": "Is it safe to fish near Visakhapatnam tomorrow?", "mode": "mock", "vessel_class": "small_fishing_boat"})
assert q_resp.status_code == 200
q_data = q_resp.json()
verdict = q_data.get("verdict", {})
assert verdict.get("verdict") == "NO_GO", f"Expected NO_GO, got {verdict.get('verdict')}"
assert any(v.get("parameter") == "wave_height_m" and v.get("value") == 2.8 and v.get("stop") == 2.5 for v in verdict.get("violations", [])), "Violation wave 2.8 vs 2.5 missing"
print(f"2. Default mock small boat NO_GO PASS: {verdict.get('reason')}")

# Check 7.3: Envelope has {run_id, seq, ts, type, payload} & monotonic seq starting at 1
run_id = q_data["run_id"]
trace_resp = client.get(f"/run/{run_id}/trace")
assert trace_resp.status_code == 200
events = trace_resp.json().get("events", [])
assert len(events) > 0
required_envelope_keys = {"run_id", "seq", "ts", "type", "payload"}
for idx, ev in enumerate(events, 1):
    assert required_envelope_keys.issubset(ev.keys()), f"Event missing envelope keys: {ev}"
    assert ev["seq"] == idx, f"Event seq mismatch: expected {idx}, got {ev['seq']}"
print(f"3. Envelopes structure and monotonic seq (1..{len(events)}) PASS")

# Check 7.4: .env untracked in git
git_res = subprocess.run(["git", "status", "--porcelain", ".env"], capture_output=True, text=True)
tracked_res = subprocess.run(["git", "ls-files", ".env"], capture_output=True, text=True)
assert tracked_res.stdout.strip() == "", f".env is tracked in git! Output: {tracked_res.stdout}"
print("4. .env untracked in git PASS")

print("\nALL REGRESSION & HYGIENE CHECKS PASSED!")
