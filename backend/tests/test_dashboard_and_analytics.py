def test_dashboard_stats_on_empty_db_is_honest_zeroes(client):
    """No fabricated numbers: an empty database means an empty dashboard,
    not sample data standing in for it."""
    response = client.get("/api/dashboard/stats")
    assert response.status_code == 200
    body = response.json()
    assert body["total_inspections_today"] == 0
    assert body["total_damages_today"] == 0
    assert body["critical_p1_today"] == 0
    assert body["average_road_health_score"] is None
    assert body["damage_by_type"] == []
    assert body["damage_by_priority"] == []


def test_dashboard_stats_counts_todays_inspection(client):
    client.post("/api/inspections", json={"source_type": "live", "road": "Anna Salai"})
    response = client.get("/api/dashboard/stats")
    assert response.json()["total_inspections_today"] == 1


def test_dashboard_alerts_empty_with_no_detections(client):
    response = client.get("/api/dashboard/alerts")
    assert response.status_code == 200
    assert response.json() == []


def test_recent_inspections(client):
    client.post("/api/inspections", json={"source_type": "live", "road": "Anna Salai"})
    response = client.get("/api/dashboard/recent-inspections")
    assert response.status_code == 200
    assert len(response.json()["items"]) == 1


def test_map_detections_empty_with_no_geotagged_detections(client):
    response = client.get("/api/map/detections")
    assert response.status_code == 200
    assert response.json() == []


def test_analytics_summary_on_empty_db(client):
    response = client.get("/api/analytics")
    assert response.status_code == 200
    body = response.json()
    assert body["kpis"]["total_inspections"] == 0
    assert body["kpis"]["total_damages"] == 0
    assert body["kpis"]["average_road_health_score"] is None
