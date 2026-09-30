"""
Optional Supabase persistence for document metadata and chat history.

The Flask app's source of truth for document *text* stays in-memory (see
DOCUMENTS in app.py) — that's unchanged. This module is a best-effort mirror
of metadata into Postgres via Supabase, using the tables defined in
supabase/schema.sql, so:

  - the document library and chat history survive a server restart
  - other tools (Supabase dashboard, other services) can see the same data

It's entirely optional. If SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY aren't
set, every function here becomes a no-op and the app behaves exactly as it
did before (in-memory only). Failures talking to Supabase are logged and
swallowed rather than breaking the request — this is a mirror, not the
critical path.
"""
import os
import logging

logger = logging.getLogger(__name__)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

_client = None
_enabled = bool(SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)

if _enabled:
    try:
        from supabase import create_client

        _client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    except Exception as e:  # pragma: no cover - defensive, optional feature
        logger.warning("Supabase persistence disabled (client init failed): %s", e)
        _enabled = False


def is_enabled() -> bool:
    return _enabled


def save_document(doc_id: str, user_id: str, filename: str, word_count, char_count, page_count):
    if not _enabled:
        return
    try:
        _client.table("documents").insert(
            {
                "id": doc_id,
                "user_id": user_id,
                "filename": filename,
                "word_count": word_count,
                "char_count": char_count,
                "page_count": page_count,
            }
        ).execute()
    except Exception as e:  # pragma: no cover
        logger.warning("Supabase: failed to save document %s: %s", doc_id, e)


def delete_document(doc_id: str):
    if not _enabled:
        return
    try:
        _client.table("documents").delete().eq("id", doc_id).execute()
    except Exception as e:  # pragma: no cover
        logger.warning("Supabase: failed to delete document %s: %s", doc_id, e)


def list_documents(user_id: str):
    """Returns rows from Postgres, or None if persistence is disabled."""
    if not _enabled:
        return None
    try:
        res = (
            _client.table("documents")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )
        return res.data
    except Exception as e:  # pragma: no cover
        logger.warning("Supabase: failed to list documents for %s: %s", user_id, e)
        return None


def save_chat_message(document_id: str, user_id: str, role: str, content: str):
    if not _enabled:
        return
    try:
        _client.table("chat_messages").insert(
            {
                "document_id": document_id,
                "user_id": user_id,
                "role": role,
                "content": content,
            }
        ).execute()
    except Exception as e:  # pragma: no cover
        logger.warning("Supabase: failed to save chat message for %s: %s", document_id, e)
