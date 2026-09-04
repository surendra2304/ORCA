import sys
import json
import httpx
from datetime import datetime

def main():
    query = "Is it safe to fish near Visakhapatnam tomorrow?"
    if len(sys.argv) > 1:
        query = " ".join(sys.argv[1:])
        
    print(f"Query: {query}")
    
    with httpx.Client(timeout=30.0) as client:
        print("Starting query...")
        response = client.post("http://127.0.0.1:8000/query", json={"text": query})
        response.raise_for_status()
        session_id = response.json()["session_id"]
        print(f"Got session_id: {session_id}")
        
        print("Streaming events:")
        print("-" * 60)
        
        with client.stream("GET", f"http://127.0.0.1:8000/stream/{session_id}", timeout=None) as stream:
            for line in stream.iter_lines():
                if line.startswith("data: "):
                    data_str = line[6:]
                    try:
                        event = json.loads(data_str)
                        ts = event.get('timestamp')
                        ts_str = datetime.fromtimestamp(ts).strftime('%H:%M:%S') if ts else 'N/A'
                        
                        print(f"[{ts_str}] EVENT: {event.get('event')}")
                        
                        if "agent" in event:
                            print(f"  Agent: {event['agent']}")
                        if "data" in event and event["data"]:
                            if event.get("event") != "final_answer":
                                print(f"  Data: {json.dumps(event['data'])}")
                            
                        if event.get("event") == "final_answer":
                            print("\n=== FINAL ANSWER ===")
                            print(event.get("data", {}).get("answer", ""))
                            print("====================")
                    except json.JSONDecodeError:
                        print(f"Raw data: {data_str}")

if __name__ == "__main__":
    main()
