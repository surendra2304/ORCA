import sys
import json
import httpx

if sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

client = httpx.Client(base_url="http://127.0.0.1:8000", timeout=60.0)

# g03 Hindi
r_hi = client.post("/query?sync=true", json={"text": "क्या कल सुबह विशाखापत्तनम के पास मछली पकड़ना सुरक्षित है?", "mode": "mock", "vessel_class": "small_fishing_boat"})
d_hi = r_hi.json()
print("=== g03 HINDI FULL FINAL_ANSWER ===")
print("Language Detected:", d_hi.get("language"))
print("Final Answer:")
print(d_hi.get("final_answer"))
print()

# g04 Telugu
r_te = client.post("/query?sync=true", json={"text": "రేపు ఉదయం కాకినాడ సమీపంలో ఫిషింగ్ చెయ్యడం సురక్షితమేనా?", "mode": "mock", "vessel_class": "small_fishing_boat"})
d_te = r_te.json()
print("=== g04 TELUGU ===")
print("Language Detected:", d_te.get("language"))
print("Final Answer (first 120 chars):", d_te.get("final_answer")[:120])
print()

# g05 Tamil
r_ta = client.post("/query?sync=true", json={"text": "நாளை காலை சென்னை அருகில் மீன் பிடிப்பது பாதுகாப்பானதா?", "mode": "mock", "vessel_class": "small_fishing_boat"})
d_ta = r_ta.json()
print("=== g05 TAMIL ===")
print("Language Detected:", d_ta.get("language"))
print("Final Answer (first 120 chars):", d_ta.get("final_answer")[:120])
print()

# g15 Bengali
r_bn = client.post("/query?sync=true", json={"text": "আমি কি কাল সকালে ভিসাখাপত্তনমের কাছে মাছ ধরতে যেতে পারি?", "mode": "mock", "vessel_class": "small_fishing_boat"})
d_bn = r_bn.json()
print("=== g15 BENGALI ===")
print("Language Detected:", d_bn.get("language"))
print("Final Answer (first 120 chars):", d_bn.get("final_answer")[:120])
print()
