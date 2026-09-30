"""
Doxora — AI Document Studio
Flask backend: upload/parse, summarize, chat, extract, generate.
"""
import os
import uuid
import time
import glob
from datetime import datetime, timezone

from flask import Flask, request, jsonify, render_template, send_from_directory, g, Response
from flask_cors import CORS
from werkzeug.utils import secure_filename
from dotenv import load_dotenv

from utils.document_parser import parse_document, DocumentParseError
from utils.ai_service import (
    summarize_document,
    chat_about_document,
    extract_structured_data,
    generate_document,
    generate_suggested_questions,
    translate_document,
    AIServiceError,
)
from utils.document_generator import (
    generate_docx,
    generate_pdf,
    generate_txt,
    generate_json,
    generate_csv,
)
from utils.auth import require_auth, get_current_user_id
from utils import supabase_store
from utils import visitor_store

# Initialize persistent SQLite visitor tracking database
visitor_store.init_db()

load_dotenv()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
GENERATED_DIR = os.path.join(BASE_DIR, "generated")
MAX_CONTENT_LENGTH = 50 * 1024 * 1024  # 50 MB

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(GENERATED_DIR, exist_ok=True)

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = MAX_CONTENT_LENGTH

# Allow the Vite dev server / deployed frontend to call the API with the
# Supabase-issued Authorization header.
CORS(
    app,
    resources={r"/api/*": {"origins": os.getenv("FRONTEND_ORIGIN", "*")}},
    supports_credentials=True,
)

# --- In-memory store ---
# --- Document Store with Disk-Backed Persistence ---
DOCUMENTS = {}


def preload_documents_from_disk(user_id: str = None):
    """
    Scans UPLOAD_DIR and registers existing documents so they survive server restarts.
    """
    if not os.path.exists(UPLOAD_DIR):
        return

    pattern = os.path.join(UPLOAD_DIR, "*_*.*")
    for filepath in glob.glob(pattern):
        basename = os.path.basename(filepath)
        if "_" not in basename:
            continue
        doc_id, orig_name = basename.split("_", 1)
        if doc_id not in DOCUMENTS:
            # Register placeholder; full text is lazily loaded upon access
            DOCUMENTS[doc_id] = {
                "doc_id": doc_id,
                "user_id": user_id or "local-dev",
                "filename": orig_name,
                "filepath": filepath,
                "text": None,
                "word_count": None,
                "char_count": None,
                "page_count": None,
                "tables": None,
                "upload_time": os.path.getmtime(filepath),
                "chat_history": [],
                "suggested_questions": [],
            }


def get_document_or_404(doc_id: str = None, user_id: str = None):
    """
    Retrieves document from memory or automatically restores/parses it from disk.
    If doc_id is missing or not found, falls back to the most relevant/recent document.
    """
    # 1. Search in-memory
    if doc_id and doc_id in DOCUMENTS:
        doc = DOCUMENTS[doc_id]
        if doc.get("text") is None and os.path.exists(doc.get("filepath", "")):
            try:
                parsed = parse_document(doc["filepath"], doc["filename"])
                doc["text"] = parsed["text"]
                doc["word_count"] = parsed["word_count"]
                doc["char_count"] = parsed["char_count"]
                doc["page_count"] = parsed.get("page_count")
                doc["tables"] = parsed.get("tables")
            except Exception as e:
                print(f"Error lazy-loading document {doc_id}: {e}")
        return doc

    # 2. Search on disk in UPLOAD_DIR for doc_id
    if doc_id:
        pattern = os.path.join(UPLOAD_DIR, f"{doc_id}_*")
        matches = glob.glob(pattern)
        if matches:
            filepath = matches[0]
            basename = os.path.basename(filepath)
            safe_name = basename.split("_", 1)[1] if "_" in basename else basename
            try:
                parsed = parse_document(filepath, safe_name)
                doc = {
                    "doc_id": doc_id,
                    "user_id": user_id or "local-dev",
                    "filename": safe_name,
                    "filepath": filepath,
                    "text": parsed["text"],
                    "word_count": parsed["word_count"],
                    "char_count": parsed["char_count"],
                    "page_count": parsed.get("page_count"),
                    "tables": parsed.get("tables"),
                    "upload_time": os.path.getmtime(filepath),
                    "chat_history": [],
                    "suggested_questions": [],
                }
                DOCUMENTS[doc_id] = doc
                return doc
            except Exception as e:
                print(f"Failed to restore document {doc_id} from disk: {e}")

    # 3. Fallback: Search disk for any existing document (e.g. most recently uploaded)
    preload_documents_from_disk(user_id)
    if DOCUMENTS:
        sorted_docs = sorted(DOCUMENTS.values(), key=lambda x: -x.get("upload_time", 0))
        fallback_doc = sorted_docs[0]
        if fallback_doc.get("text") is None and os.path.exists(fallback_doc.get("filepath", "")):
            try:
                parsed = parse_document(fallback_doc["filepath"], fallback_doc["filename"])
                fallback_doc["text"] = parsed["text"]
                fallback_doc["word_count"] = parsed["word_count"]
                fallback_doc["char_count"] = parsed["char_count"]
                fallback_doc["page_count"] = parsed.get("page_count")
            except Exception:
                pass
        return fallback_doc

    return None



# --- Pages -------------------------------------------------------------
@app.route("/")
def index():
    return render_template("index.html")


# --- API: health -------------------------------------------------------
@app.route("/api/health")
def health():
    return jsonify({
        "status": "ok",
        "ai_configured": bool(os.getenv("OPENROUTER_API_KEY") or os.getenv("ANTHROPIC_API_KEY")),
        "time": datetime.now(timezone.utc).isoformat(),
    })


# --- API: Visitor Intelligence & Tracking Database -----------------------
@app.route("/api/track-visit", methods=["POST"])
def track_visit():
    """Record a visitor browsing event into the persistent SQLite database."""
    try:
        data = request.get_json(silent=True) or {}
        visitor_id = data.get("visitor_id") or request.cookies.get("doxora_vid") or uuid.uuid4().hex[:16]
        path = data.get("path") or request.referrer or "/"
        referrer = data.get("referrer") or request.referrer or ""
        language = data.get("language") or request.headers.get("Accept-Language", "").split(",")[0]
        screen_res = data.get("screen_res") or ""

        # Retrieve client IP
        if request.headers.get("X-Forwarded-For"):
            ip_address = request.headers.get("X-Forwarded-For")
        elif request.headers.get("X-Real-IP"):
            ip_address = request.headers.get("X-Real-IP")
        else:
            ip_address = request.remote_addr or "127.0.0.1"

        user_agent = request.headers.get("User-Agent") or ""
        user_email = data.get("user_email")
        user_name = data.get("user_name")
        auth_provider = data.get("auth_provider")

        visit_id = visitor_store.record_visit(
            visitor_id=visitor_id,
            ip_address=ip_address,
            user_agent=user_agent,
            path=path,
            referrer=referrer,
            language=language,
            screen_res=screen_res,
            user_email=user_email,
            user_name=user_name,
            auth_provider=auth_provider,
        )

        resp = jsonify({
            "status": "recorded",
            "visit_id": visit_id,
            "visitor_id": visitor_id,
            "user_email": user_email,
        })
        # Set persistent cookie if not present
        if not request.cookies.get("doxora_vid"):
            resp.set_cookie("doxora_vid", visitor_id, max_age=365 * 24 * 3600, samesite="Lax")
        return resp
    except Exception as e:
        # Non-blocking: never fail user experience if tracking errors
        return jsonify({"status": "error", "message": str(e)}), 200


@app.route("/api/analytics/visitors", methods=["GET"])
def get_visitors_analytics():
    """Retrieve summarized visitor statistics and recent activity stream."""
    try:
        limit = request.args.get("limit", default=100, type=int)
        stats = visitor_store.get_visitor_stats(limit=limit)
        return jsonify({"status": "ok", "stats": stats})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/analytics/visitors", methods=["DELETE"])
def clear_all_visitors_route():
    """Purge all visitor tracking records."""
    try:
        visitor_store.clear_all_visitors()
        return jsonify({"status": "ok", "message": "All visitor records deleted successfully."})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/analytics/visitors/<int:record_id>", methods=["DELETE"])
def delete_visitor_record_route(record_id):
    """Delete a single visitor tracking record."""
    try:
        success = visitor_store.delete_visitor_record(record_id)
        if not success:
            return jsonify({"status": "error", "message": "Visitor record not found."}), 404
        return jsonify({"status": "ok", "message": f"Visitor record {record_id} deleted."})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/analytics/visitors/user/<visitor_id>", methods=["DELETE"])
def delete_visitor_user_route(visitor_id):
    """Delete all records for a specific visitor UUID."""
    try:
        success = visitor_store.delete_visitor_by_uid(visitor_id)
        if not success:
            return jsonify({"status": "error", "message": "Visitor UUID not found."}), 404
        return jsonify({"status": "ok", "message": f"All visits for visitor {visitor_id} deleted."})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/analytics/export", methods=["GET"])
def export_visitors():
    """Export the visitor database as a CSV file for download."""
    try:
        csv_data = visitor_store.export_visits_csv()
        return Response(
            csv_data,
            mimetype="text/csv",
            headers={"Content-Disposition": "attachment;filename=doxora_visitors_database.csv"},
        )
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# --- API: upload ---------------------------------------------------------
@app.route("/api/upload", methods=["POST"])
@require_auth
def upload():
    user_id = get_current_user_id()
    if "file" not in request.files:
        return jsonify({"error": "No file part in request."}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No file selected."}), 400

    original_name = file.filename or "uploaded_file"
    safe_name = secure_filename(original_name)
    if not safe_name or safe_name.startswith("."):
        ext = os.path.splitext(original_name)[1]
        safe_name = f"doc_{int(time.time())}{ext}"

    doc_id = uuid.uuid4().hex[:12]
    stored_name = f"{doc_id}_{safe_name}"
    filepath = os.path.join(UPLOAD_DIR, stored_name)
    file.save(filepath)

    try:
        parsed = parse_document(filepath, original_name)
    except DocumentParseError as e:
        if os.path.exists(filepath):
            try:
                os.remove(filepath)
            except OSError:
                pass
        return jsonify({"error": str(e)}), 422
    except Exception as e:
        if os.path.exists(filepath):
            try:
                os.remove(filepath)
            except OSError:
                pass
        return jsonify({"error": f"Failed to parse document: {e}"}), 500

    suggested_q = generate_suggested_questions(parsed["text"], filename=original_name)

    DOCUMENTS[doc_id] = {
        "doc_id": doc_id,
        "user_id": user_id,
        "filename": original_name,
        "filepath": filepath,
        "text": parsed["text"],
        "word_count": parsed["word_count"],
        "char_count": parsed["char_count"],
        "page_count": parsed.get("page_count"),
        "tables": parsed.get("tables"),
        "upload_time": time.time(),
        "chat_history": [],
        "suggested_questions": suggested_q,
    }
    supabase_store.save_document(
        doc_id, user_id, original_name, parsed["word_count"], parsed["char_count"], parsed.get("page_count")
    )

    return jsonify({
        "id": doc_id,
        "doc_id": doc_id,
        "filename": original_name,
        "word_count": parsed["word_count"],
        "page_count": parsed.get("page_count"),
        "preview": parsed["text"][:400],
        "suggested_questions": suggested_q,
    })



@app.route("/api/documents/<doc_id>/suggested-questions", methods=["GET"])
@require_auth
def get_document_suggested_questions(doc_id):
    """Retrieve or dynamically generate document-specific recommended questions."""
    user_id = get_current_user_id()
    doc = get_document_or_404(doc_id, user_id)
    if not doc:
        return jsonify({"error": "Document not found."}), 404

    questions = doc.get("suggested_questions")
    if not questions:
        questions = generate_suggested_questions(doc["text"], filename=doc.get("filename", ""))
        doc["suggested_questions"] = questions

    return jsonify({"doc_id": doc_id, "questions": questions})


@app.route("/api/documents", methods=["GET"])
@require_auth
def list_documents():
    user_id = get_current_user_id()
    docs = [d for d in DOCUMENTS.values() if d.get("user_id") == user_id]
    return jsonify([
        {
            "id": d["doc_id"],
            "doc_id": d["doc_id"],
            "filename": d["filename"],
            "word_count": d["word_count"],
            "page_count": d.get("page_count"),
            "upload_time": d["upload_time"],
        }
        for d in sorted(docs, key=lambda x: -x["upload_time"])
    ])


@app.route("/api/documents/<doc_id>", methods=["DELETE"])
@require_auth
def delete_document(doc_id):
    user_id = get_current_user_id()
    doc = get_document_or_404(doc_id, user_id)
    if not doc:
        return jsonify({"error": "Document not found."}), 404
    DOCUMENTS.pop(doc_id, None)
    supabase_store.delete_document(doc_id)
    try:
        if os.path.exists(doc["filepath"]):
            os.remove(doc["filepath"])
    except OSError:
        pass
    return jsonify({"ok": True})


# --- API: summarize --------------------------------------------------------
@app.route("/api/summarize", methods=["POST"])
@require_auth
def summarize():
    user_id = get_current_user_id()
    data = request.get_json(force=True, silent=True) or {}
    doc_id = data.get("doc_id")
    style = data.get("style", "concise")

    doc = get_document_or_404(doc_id, user_id)
    if not doc:
        return jsonify({"error": "Document not found."}), 404

    try:
        summary = summarize_document(doc["text"], style=style)
    except AIServiceError as e:
        return jsonify({"error": str(e)}), 502

    return jsonify({"doc_id": doc_id, "style": style, "summary": summary})


# --- API: translate --------------------------------------------------------
@app.route("/api/translate", methods=["POST"])
@require_auth
def translate_route():
    user_id = get_current_user_id()
    data = request.get_json(force=True, silent=True) or {}
    doc_id = data.get("doc_id")
    text = data.get("text")
    target_lang = data.get("target_lang", "Tamil")

    if not text and doc_id:
        doc = get_document_or_404(doc_id, user_id)
        if not doc:
            return jsonify({"error": "Document not found."}), 404
        text = doc["text"]

    if not text:
        return jsonify({"error": "No text or document provided for translation."}), 400

    try:
        translated = translate_document(text, target_lang=target_lang)
    except AIServiceError as e:
        return jsonify({"error": str(e)}), 502

    return jsonify({
        "doc_id": doc_id,
        "target_lang": target_lang,
        "translated_text": translated,
    })


# --- API: chat ---------------------------------------------------------
@app.route("/api/chat", methods=["POST"])
@require_auth
def chat():
    user_id = get_current_user_id()
    data = request.get_json(force=True, silent=True) or {}
    doc_id = data.get("doc_id")
    question = (data.get("question") or "").strip()

    if not question:
        return jsonify({"error": "Question is required."}), 400

    doc = get_document_or_404(doc_id, user_id)
    if not doc:
        return jsonify({"error": "Document not found."}), 404

    try:
        answer = chat_about_document(doc["text"], question, history=doc["chat_history"])
    except AIServiceError as e:
        return jsonify({"error": str(e)}), 502

    doc["chat_history"].append({"role": "user", "content": question})
    doc["chat_history"].append({"role": "assistant", "content": answer})
    # Keep history bounded so the context doesn't grow unbounded across a long session.
    doc["chat_history"] = doc["chat_history"][-20:]
    supabase_store.save_chat_message(doc_id, user_id, "user", question)
    supabase_store.save_chat_message(doc_id, user_id, "assistant", answer)

    return jsonify({"doc_id": doc_id, "answer": answer})


@app.route("/api/chat/<doc_id>/history", methods=["GET"])
@require_auth
def chat_history(doc_id):
    user_id = get_current_user_id()
    doc = get_document_or_404(doc_id, user_id)
    if not doc:
        return jsonify({"error": "Document not found."}), 404
    return jsonify({"doc_id": doc_id, "history": doc["chat_history"]})


# --- API: extract --------------------------------------------------------
@app.route("/api/extract", methods=["POST"])
@require_auth
def extract():
    user_id = get_current_user_id()
    data = request.get_json(force=True, silent=True) or {}
    doc_id = data.get("doc_id")
    fields_hint = data.get("fields_hint", "")
    fmt = data.get("format", "json")  # 'json' or 'csv'

    doc = get_document_or_404(doc_id, user_id)
    if not doc:
        return jsonify({"error": "Document not found."}), 404

    try:
        extracted = extract_structured_data(doc["text"], fields_hint=fields_hint)
    except AIServiceError as e:
        return jsonify({"error": str(e)}), 502

    gen_id = uuid.uuid4().hex[:10]
    if fmt == "csv":
        out_name = f"{gen_id}_extracted.csv"
        out_path = os.path.join(GENERATED_DIR, out_name)
        generate_csv(extracted, out_path)
    else:
        out_name = f"{gen_id}_extracted.json"
        out_path = os.path.join(GENERATED_DIR, out_name)
        generate_json(extracted, out_path)

    return jsonify({
        "doc_id": doc_id,
        "data": extracted,
        "download_url": f"/api/download/{out_name}",
    })


# --- API: generate -------------------------------------------------------
@app.route("/api/generate", methods=["POST"])
@require_auth
def generate():
    user_id = get_current_user_id()
    data = request.get_json(force=True, silent=True) or {}
    prompt = (data.get("prompt") or "").strip()
    doc_type = data.get("doc_type", "general")
    output_format = data.get("output_format", "docx")  # 'docx' | 'pdf' | 'txt'
    source_doc_id = data.get("source_doc_id")

    if not prompt:
        return jsonify({"error": "A prompt/instructions field is required."}), 400

    reference_text = None
    if source_doc_id:
        src = get_document_or_404(source_doc_id, user_id)
        if not src:
            return jsonify({"error": "Source document not found."}), 404
        reference_text = src["text"]

    try:
        content = generate_document(prompt, doc_type=doc_type, reference_text=reference_text)
    except AIServiceError as e:
        return jsonify({"error": str(e)}), 502

    gen_id = uuid.uuid4().hex[:10]
    out_name = f"{gen_id}_generated.{output_format}"
    out_path = os.path.join(GENERATED_DIR, out_name)

    if output_format == "pdf":
        generate_pdf(content, out_path)
    elif output_format == "txt":
        generate_txt(content, out_path)
    else:
        output_format = "docx"
        out_name = f"{gen_id}_generated.docx"
        out_path = os.path.join(GENERATED_DIR, out_name)
        generate_docx(content, out_path)

    return jsonify({
        "content_preview": content[:500],
        "download_url": f"/api/download/{out_name}",
        "format": output_format,
    })


# --- Downloads -------------------------------------------------------------
@app.route("/api/download/<path:filename>")
def download(filename):
    safe_name = secure_filename(filename)
    return send_from_directory(GENERATED_DIR, safe_name, as_attachment=True)


# --- Error handlers ----------------------------------------------------
@app.errorhandler(413)
def too_large(e):
    return jsonify({"error": "File too large. Maximum size is 20MB."}), 413


@app.errorhandler(500)
def server_error(e):
    return jsonify({"error": "Internal server error. Please try again."}), 500


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    debug = os.getenv("FLASK_DEBUG", "false").lower() == "true"
    print(f"Doxora starting on http://localhost:{port}")
    if not (os.getenv("OPENROUTER_API_KEY") or os.getenv("ANTHROPIC_API_KEY")):
        print("WARNING: OPENROUTER_API_KEY not set — AI features will return an error until configured.")
    app.run(
        host="0.0.0.0",
        port=port,
        debug=debug,
        use_reloader=debug,
        reloader_type="stat" if debug else None,
        extra_files=[
            os.path.join(BASE_DIR, "utils", f)
            for f in os.listdir(os.path.join(BASE_DIR, "utils"))
            if f.endswith(".py")
        ] if debug else [],
    )
