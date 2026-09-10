from starlette.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_spa_root_serves_html():
    resp = client.get("/")
    assert resp.status_code == 200
    assert "html" in resp.headers.get("content-type", "").lower()

def test_spa_client_route_fallback():
    resp = client.get("/fisherman/voice")
    assert resp.status_code == 200
    assert "html" in resp.headers.get("content-type", "").lower()

def test_api_route_not_intercepted_by_spa():
    resp = client.get("/api/nonexistent_route_404")
    assert resp.status_code == 404

def test_health_route_works():
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert "app" in data
