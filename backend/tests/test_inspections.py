def test_create_live_inspection(client):
    response = client.post(
        "/api/inspections",
        json={"source_type": "live", "road": "Anna Salai", "area": "Teynampet"},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["id"].startswith("INSP-")
    assert body["source_type"] == "live"
    assert body["status"] == "pending"
    assert body["road"] == "Anna Salai"
    # Nothing ML-derived should be fabricated on creation.
    assert body["frames_processed"] == 0
    assert body["total_detections"] == 0
    assert body["road_health_score"] is None


def test_create_inspection_rejects_upload_source_type(client):
    # POST /inspections is for live-mode only; upload goes through /inspections/upload.
    response = client.post("/api/inspections", json={"source_type": "upload"})
    assert response.status_code == 400


def test_get_inspection_by_id(client):
    created = client.post("/api/inspections", json={"source_type": "live", "road": "GST Road"}).json()
    response = client.get(f"/api/inspections/{created['id']}")
    assert response.status_code == 200
    assert response.json()["id"] == created["id"]


def test_get_inspection_invalid_id_returns_404(client):
    response = client.get("/api/inspections/INSP-9999-9999")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_list_inspections(client):
    client.post("/api/inspections", json={"source_type": "live", "road": "Anna Salai"})
    client.post("/api/inspections", json={"source_type": "live", "road": "OMR Road"})

    response = client.get("/api/inspections")
    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 2
    assert len(body["items"]) == 2


def test_list_inspections_filters_by_search(client):
    client.post("/api/inspections", json={"source_type": "live", "road": "Anna Salai"})
    client.post("/api/inspections", json={"source_type": "live", "road": "OMR Road"})

    response = client.get("/api/inspections", params={"search": "Anna"})
    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["road"] == "Anna Salai"


def test_upload_valid_video(client):
    response = client.post(
        "/api/inspections/upload",
        files={"file": ("road_trip.mp4", b"fake video bytes", "video/mp4")},
        data={"road": "GST Road", "area": "Chromepet"},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "pending"
    assert body["inspection_id"].startswith("INSP-")
    assert body["message"] == "Video uploaded successfully"

    # The created inspection should be retrievable and carry the upload metadata.
    detail = client.get(f"/api/inspections/{body['inspection_id']}").json()
    assert detail["source_type"] == "upload"
    assert detail["original_filename"] == "road_trip.mp4"


def test_upload_rejects_invalid_file_type(client):
    response = client.post(
        "/api/inspections/upload",
        files={"file": ("notes.txt", b"not a video", "text/plain")},
    )
    assert response.status_code == 400
    assert "unsupported file type" in response.json()["detail"].lower()


def test_delete_inspection(client):
    created = client.post("/api/inspections", json={"source_type": "live", "road": "Mount Road"}).json()
    response = client.delete(f"/api/inspections/{created['id']}")
    assert response.status_code == 204

    follow_up = client.get(f"/api/inspections/{created['id']}")
    assert follow_up.status_code == 404
