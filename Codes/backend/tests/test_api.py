from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_and_analysis_endpoints():
    assert client.get("/api/health").json()["status"] == "ok"
    response = client.post("/api/lexer/analyze", json={"source": "int answer = 42;"})
    assert response.status_code == 200
    result = response.json()
    assert [token["type"] for token in result["tokens"]] == ["KEYWORD", "IDENTIFIER", "ASSIGNMENT_OPERATOR", "INTEGER", "DELIMITER"]
    assert client.get(f"/api/reports/{result['id']}").json()["source"] == "int answer = 42;"


def test_automata_endpoint_returns_real_machine():
    response = client.post("/api/automata/dfa", json={"pattern": "a(b|c)*"})
    assert response.status_code == 200
    result = response.json()
    assert len(result["nfa"]["states"]) > 0
    assert len(result["dfa"]["states"]) > 0
    simulation = client.post("/api/automata/simulate", json={"pattern": "a(b|c)*", "lexeme": "abcb"})
    assert simulation.json()["accepted"] is True


def test_invalid_automata_pattern_returns_validation_error():
    response = client.post("/api/automata/nfa", json={"pattern": "(abc"})
    assert response.status_code == 422


def test_vite_preview_origin_can_call_api():
    response = client.options(
        "/api/token-rules",
        headers={
            "Origin": "http://127.0.0.1:4173",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "content-type",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://127.0.0.1:4173"
