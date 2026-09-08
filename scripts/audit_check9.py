import asyncio
import subprocess
import sys
sys.path.insert(0, ".")
import httpx
from app.graph.agents.ocean import OceanAgent
from app.tools.open_meteo import get_ocean
from app.tools.hazard_providers import get_hazard_payload
from app.tools.http import set_test_transport

client = httpx.Client(base_url="http://127.0.0.1:8000", timeout=10.0)

print("=== 1. /health 5 FIELDS ===")
h_resp = client.get("/health")
h_data = h_resp.json()
print(f"Status: {h_resp.status_code}, Payload: {h_data}")
expected_keys = {"app", "version", "mock_mode", "gemini_configured", "groq_configured"}
assert expected_keys.issubset(h_data.keys()), f"Missing keys: {expected_keys - set(h_data.keys())}"
print("=> PASS: All 5 health fields present.")

print("\n=== 2. INVALID MODE / VESSEL 400s ===")
r_mode = client.post("/query", json={"text": "test", "mode": "invalid_mode"})
print(f"Invalid mode status: {r_mode.status_code}, detail: {r_mode.json().get('detail')}")
assert r_mode.status_code == 400

r_vessel = client.post("/query", json={"text": "test", "vessel_class": "yacht"})
print(f"Invalid vessel status: {r_vessel.status_code}, detail: {r_vessel.json().get('detail')}")
assert r_vessel.status_code == 400
print("=> PASS: 400 returned for both invalid mode and invalid vessel.")

print("\n=== 3. SCHEMA LOCKS (PROGRAMMATIC DIFFS) ===")
# Ocean schema diff
async def check_schemas():
    # Ocean
    def handler(req: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={
            "latitude": 17.68, "longitude": 83.22,
            "hourly": {
                "time": ["2026-09-06T00:00"],
                "wave_height": [1.8], "wave_period": [8.5],
                "swell_wave_height": [1.4], "sea_surface_temperature": [28.2],
                "ocean_current_velocity": [2.5]
            }
        })
    set_test_transport(httpx.MockTransport(handler))
    real_ocean = await get_ocean(17.68, 83.22)
    mock_ocean = await OceanAgent().execute({})
    set_test_transport(None)
    
    ocean_diff = set(mock_ocean.keys()) ^ set(real_ocean.keys())
    print(f"Ocean schema diff (mock vs real): {ocean_diff}")
    assert ocean_diff == set(), f"Ocean schema mismatch: {ocean_diff}"

    # Hazard
    mock_haz = await get_hazard_payload(None, None, mode="mock")
    real_haz = await get_hazard_payload(17.68, 83.22, mode="real")
    haz_diff = set(mock_haz.keys()) ^ set(real_haz.keys())
    print(f"Hazard schema diff (mock vs real): {haz_diff}")
    assert haz_diff == set(), f"Hazard schema mismatch: {haz_diff}"

    # Hazard alert item diff
    mock_alert_keys = set(mock_haz["alerts"][0].keys())
    # If real alerts has item or test schema
    expected_alert_keys = {"type", "severity", "validity", "area", "headline", "center", "radius_km", "distance_km", "affected"}
    alert_diff = mock_alert_keys ^ expected_alert_keys
    print(f"Hazard alert item keys diff: {alert_diff}")
    assert alert_diff == set(), f"Alert item keys mismatch: {alert_diff}"

asyncio.run(check_schemas())
print("=> PASS: Programmatic schema diffs are empty set().")

print("\n=== 4. THRESHOLD HYGIENE GREP ===")
# Grep agent files for hardcoded safety threshold comparisons (e.g. wave > 2.5)
res = subprocess.run(["git", "grep", "-n", "wave_height.*[><=]", "app/graph/agents/"], capture_output=True, text=True)
print(f"Agent threshold grep matches (should be empty): '{res.stdout.strip()}'")
assert res.stdout.strip() == "", "Hardcoded safety thresholds found in agent code!"
print("=> PASS: No hardcoded thresholds in agent code.")

print("\n=== 5. GIT & ENVIRONMENT HYGIENE ===")
untracked = subprocess.run(["git", "ls-files", ".env"], capture_output=True, text=True)
assert untracked.stdout.strip() == "", ".env is tracked in git!"
print("=> PASS: .env is untracked.")

# Check README documents contract v1.2 and eval usage
with open("README.md", "r", encoding="utf-8") as f:
    readme = f.read()
assert "Phase 7" in readme
assert "run_eval.py" in readme
print("=> PASS: README documents Phase 7 and eval runner usage.")
