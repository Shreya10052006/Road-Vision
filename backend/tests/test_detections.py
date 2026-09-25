def test_list_detections_empty_on_fresh_db(client):
    response = client.get("/api/detections")
    assert response.status_code == 200
    body = response.json()
    assert body["items"] == []
    assert body["total"] == 0


def test_get_inspection_detections_for_unprocessed_inspection(client):
    """A freshly-created inspection has no detections yet — the ML pipeline
    hasn't run. This should be an empty list, not an error and not fake data."""
    created = client.post("/api/inspections", json={"source_type": "live", "road": "ECR Road"}).json()
    response = client.get(f"/api/inspections/{created['id']}/detections")
    assert response.status_code == 200
    assert response.json() == {"items": [], "total": 0}


def test_get_detections_for_nonexistent_inspection_returns_404(client):
    response = client.get("/api/inspections/INSP-0000-0000/detections")
    assert response.status_code == 404


def test_get_detection_invalid_id_returns_404(client):
    response = client.get("/api/detections/NOPE-001")
    assert response.status_code == 404
