import os
import io
import pytest
from unittest.mock import patch
from app import app, DOCUMENTS


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client
        DOCUMENTS.clear()


def test_health_check(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.get_json()
    assert data["status"] == "ok"
    assert "ai_configured" in data


def test_upload_invalid_extension(client):
    data = {"file": (io.BytesIO(b"dummy image content"), "test.png")}
    response = client.post("/api/upload", data=data, content_type="multipart/form-data")
    assert response.status_code == 400
    res_data = response.get_json()
    assert "Unsupported file type" in res_data["error"]


def test_upload_no_file(client):
    response = client.post("/api/upload", data={}, content_type="multipart/form-data")
    assert response.status_code == 400
    assert "No file part" in response.get_json()["error"]


def test_upload_txt_file_and_list_and_delete(client):
    file_content = b"DocuMind is an AI document assistant. It helps analyze text files, PDFs, and Word documents efficiently."
    data = {"file": (io.BytesIO(file_content), "sample_report.txt")}
    
    upload_res = client.post("/api/upload", data=data, content_type="multipart/form-data")
    assert upload_res.status_code == 200
    upload_data = upload_res.get_json()
    assert "doc_id" in upload_data
    assert upload_data["filename"] == "sample_report.txt"
    assert upload_data["word_count"] > 0
    doc_id = upload_data["doc_id"]

    # Test list documents
    list_res = client.get("/api/documents")
    assert list_res.status_code == 200
    docs = list_res.get_json()
    assert len(docs) == 1
    assert docs[0]["doc_id"] == doc_id

    # Test delete document
    del_res = client.delete(f"/api/documents/{doc_id}")
    assert del_res.status_code == 200
    assert del_res.get_json()["ok"] is True

    # Confirm list is now empty
    list_res2 = client.get("/api/documents")
    assert len(list_res2.get_json()) == 0


@patch("app.summarize_document")
def test_summarize_route(mock_summarize, client):
    mock_summarize.return_value = "This is a summary of the document."
    
    file_content = b"This is a test document with sample content for summarization test."
    upload_res = client.post("/api/upload", data={"file": (io.BytesIO(file_content), "test.txt")}, content_type="multipart/form-data")
    doc_id = upload_res.get_json()["doc_id"]

    res = client.post("/api/summarize", json={"doc_id": doc_id, "style": "concise"})
    assert res.status_code == 200
    assert res.get_json()["summary"] == "This is a summary of the document."


@patch("app.chat_about_document")
def test_chat_and_history_routes(mock_chat, client):
    mock_chat.return_value = "DocuMind is an AI assistant."
    
    file_content = b"DocuMind is an AI document assistant built with Flask and React."
    upload_res = client.post("/api/upload", data={"file": (io.BytesIO(file_content), "chat_test.txt")}, content_type="multipart/form-data")
    doc_id = upload_res.get_json()["doc_id"]

    chat_res = client.post("/api/chat", json={"doc_id": doc_id, "question": "What is DocuMind?"})
    assert chat_res.status_code == 200
    assert chat_res.get_json()["answer"] == "DocuMind is an AI assistant."

    history_res = client.get(f"/api/chat/{doc_id}/history")
    assert history_res.status_code == 200
    history = history_res.get_json()["history"]
    assert len(history) == 2
    assert history[0]["role"] == "user"
    assert history[0]["content"] == "What is DocuMind?"
    assert history[1]["role"] == "assistant"
    assert history[1]["content"] == "DocuMind is an AI assistant."


@patch("app.extract_structured_data")
def test_extract_route(mock_extract, client):
    mock_extract.return_value = {"title": "Invoice", "total": "$500"}

    file_content = b"Invoice #12345. Total amount due: $500."
    upload_res = client.post("/api/upload", data={"file": (io.BytesIO(file_content), "invoice.txt")}, content_type="multipart/form-data")
    doc_id = upload_res.get_json()["doc_id"]

    res = client.post("/api/extract", json={"doc_id": doc_id, "fields_hint": "total", "format": "json"})
    assert res.status_code == 200
    data = res.get_json()
    assert data["data"]["title"] == "Invoice"
    assert "download_url" in data


@patch("app.generate_document")
def test_generate_route(mock_generate, client):
    mock_generate.return_value = "# Executive Summary\n\nThis is a generated report draft."

    res = client.post("/api/generate", json={"prompt": "Write a report summary", "doc_type": "report", "output_format": "txt"})
    assert res.status_code == 200
    data = res.get_json()
    assert "download_url" in data
    assert data["format"] == "txt"

    # Test downloading the generated file
    download_url = data["download_url"]
    dl_res = client.get(download_url)
    assert dl_res.status_code == 200
    assert b"Executive Summary" in dl_res.data


def test_visitor_tracking_and_analytics(client):
    # 1. Track a visit
    track_res = client.post(
        "/api/track-visit",
        json={
            "visitor_id": "test-vid-100",
            "path": "/dashboard",
            "referrer": "https://google.com",
            "language": "en-US",
            "screen_res": "1920x1080",
        },
        headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"},
    )
    assert track_res.status_code == 200
    track_data = track_res.get_json()
    assert track_data["status"] == "recorded"
    assert "visit_id" in track_data

    # 2. Query analytics
    stats_res = client.get("/api/analytics/visitors")
    assert stats_res.status_code == 200
    stats_data = stats_res.get_json()
    assert stats_data["status"] == "ok"
    assert stats_data["stats"]["total_visits"] >= 1
    assert stats_data["stats"]["unique_visitors"] >= 1
    assert len(stats_data["stats"]["recent_visits"]) >= 1

    # 3. Export CSV
    export_res = client.get("/api/analytics/export")
    assert export_res.status_code == 200
    assert "text/csv" in export_res.content_type
    assert b"Visitor UUID" in export_res.data

