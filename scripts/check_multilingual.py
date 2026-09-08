import sys
import httpx
import json

if sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

client = httpx.Client(base_url='http://127.0.0.1:8000', timeout=60.0)

queries = [
    ('hi', 'क्या कल सुबह विशाखापत्तनम के पास मछली पकड़ना सुरक्षित है?'),
    ('te', 'రేపు ఉదయం కాకినాడ సమీపంలో ఫిషింగ్ చెయ్యడం సురక్షితమేనా?'),
    ('ta', 'நாளை காலை சென்னை அருகில் மீன் பிடிப்பது பாதுகாப்பானதா?'),
    ('bn', 'আমি কি কাল সকালে ভিসাখাপত্তনমের কাছে মাছ ধরতে যেতে পারি?')
]

for exp_lang, q in queries:
    resp = client.post('/query?sync=true', json={'text': q, 'mode': 'mock', 'vessel_class': 'small_fishing_boat'})
    d = resp.json()
    lang = d.get('language')
    ans = d.get('final_answer', '')
    verdict_tokens = [t for t in ['GO', 'CAUTION', 'NO_GO', 'UNKNOWN'] if t in ans]
    print(f"=== [{exp_lang.upper()}] ===")
    print(f"Language Code: {lang} (Matches expected: {lang == exp_lang})")
    print(f"Untranslated Token: {verdict_tokens}")
    print(f"First 100 characters:\n{ans[:100]}")
    print()
