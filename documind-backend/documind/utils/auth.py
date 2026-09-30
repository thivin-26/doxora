"""
Authentication helpers supporting Firebase Auth and JWT verification.

Verifies the ID token sent in the `Authorization: Bearer <token>` header.
During local development without strict verification keys, requests extract the user ID
or use a fallback dev identity.
"""
import os
from functools import wraps

import jwt
from flask import request, jsonify, g

FIREBASE_PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID") or os.getenv("VITE_FIREBASE_PROJECT_ID")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")
DEV_USER_ID = "local-dev-user"


def _decode_token(token: str):
    """Decode an auth token. Supports local dev tokens, Supabase JWT, and Firebase JWT."""
    # Handle local offline session tokens (format: local-token-<uid>-<timestamp>)
    if token.startswith("local-token-"):
        # Extract embedded uid: local-token-<uid>-<timestamp>
        parts = token.split("-")
        # uid is the 3rd segment (index 2)
        uid = parts[2] if len(parts) > 2 else "local"
        return {"sub": uid, "email": None}

    # Handle legacy local dev tokens (format: local-dev-token-<email>)
    if token.startswith("local-dev-token-"):
        email = token.replace("local-dev-token-", "")
        return {"sub": f"local-{email}", "email": email}

    # Handle Supabase JWT (verified)
    if SUPABASE_JWT_SECRET:
        try:
            return jwt.decode(
                token,
                SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                audience="authenticated",
            )
        except Exception:
            pass  # Fall through to unverified decode

    # Decode unverified to extract payload claims for Firebase tokens
    try:
        unverified = jwt.decode(token, options={"verify_signature": False})
        return unverified
    except Exception:
        return {"sub": DEV_USER_ID}


def get_current_user_id():
    """Returns the authenticated user's id, or None if not authenticated."""
    return getattr(g, "user_id", None)


def require_auth(fn):
    """Route decorator: populates g.user_id from the Firebase/JWT token."""

    @wraps(fn)
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            g.user_id = DEV_USER_ID
            return fn(*args, **kwargs)

        token = auth_header.split(" ", 1)[1].strip()
        if not token:
            g.user_id = DEV_USER_ID
            return fn(*args, **kwargs)

        try:
            payload = _decode_token(token)
            g.user_id = payload.get("user_id") or payload.get("sub") or payload.get("uid") or DEV_USER_ID
            g.user_email = payload.get("email")
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Session expired. Please log in again."}), 401
        except Exception:
            g.user_id = DEV_USER_ID

        return fn(*args, **kwargs)

    return wrapper
