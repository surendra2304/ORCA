import json
import httpx

client = httpx.Client(base_url="http://127.0.0.1:8000", timeout=30.0)

# Step 1: Execute query
resp = client.post("/query?sync=true", json={"text": "Is it safe to fish near Visakhapatnam?", "mode": "mock"})
d = resp.json()
run_id = d["run_id"]
session_id = d["session_id"]
print(f"Executed query -> session_id={session_id}, run_id={run_id}")

def parse_sse_stream(url: str):
    envelopes = []
    with client.stream("GET", url) as response:
        assert response.status_code == 200, f"SSE GET {url} failed with {response.status_code}"
        for line in response.iter_lines():
            line = line.strip()
            if line.startswith("data:"):
                raw_data = line[len("data:"):].strip()
                if raw_data:
                    envelopes.append(json.loads(raw_data))
    return envelopes

# Step 2: Replay via run_id
run_envelopes = parse_sse_stream(f"/stream/{run_id}")
print(f"GET /stream/{run_id} returned {len(run_envelopes)} replayed envelopes")
seqs = [e["seq"] for e in run_envelopes]
print(f"  Sequences: {seqs}")
assert seqs == list(range(1, len(seqs) + 1)), f"Sequences not monotonic starting at 1: {seqs}"
assert run_envelopes[0]["type"] == "run_started", f"First event not run_started: {run_envelopes[0]['type']}"
assert run_envelopes[-1]["type"] == "run_complete", f"Last event not run_complete: {run_envelopes[-1]['type']}"
print("  => Replay via run_id: PASS (monotonic 1..N, starts run_started, ends run_complete)")

# Step 3: Replay via session_id
session_envelopes = parse_sse_stream(f"/stream/{session_id}")
print(f"GET /stream/{session_id} returned {len(session_envelopes)} replayed envelopes")
assert len(session_envelopes) == len(run_envelopes), f"Count mismatch: {len(session_envelopes)} vs {len(run_envelopes)}"
assert [e["seq"] for e in session_envelopes] == seqs, "Sequences mismatch on session replay"
assert session_envelopes[-1]["run_id"] == run_id, "Session replay did not target latest run"
print("  => Replay via session_id: PASS (resolves to latest run, exact match)")
