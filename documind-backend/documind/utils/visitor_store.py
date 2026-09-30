"""
Doxora — Visitor Intelligence & Analytics Database
Persistent SQLite database for storing and querying all visitors and authenticated users to the Doxora platform.
"""
import os
import sqlite3
import re
from datetime import datetime, timezone

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
DB_PATH = os.path.join(DATA_DIR, "doxora_visitors.db")

os.makedirs(DATA_DIR, exist_ok=True)


def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Initialize the SQLite visitors table and indexes with automatic migration."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS visitors (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                visitor_id TEXT NOT NULL,
                user_email TEXT,
                user_name TEXT,
                auth_provider TEXT,
                ip_address TEXT,
                user_agent TEXT,
                browser TEXT,
                os TEXT,
                device TEXT,
                path TEXT DEFAULT '/',
                referrer TEXT,
                language TEXT,
                screen_res TEXT,
                visited_at TEXT NOT NULL
            )
            """
        )

        # Migrations for existing database instances
        for col_def in [
            ("user_email", "TEXT"),
            ("user_name", "TEXT"),
            ("auth_provider", "TEXT"),
        ]:
            try:
                cursor.execute(f"ALTER TABLE visitors ADD COLUMN {col_def[0]} {col_def[1]}")
            except sqlite3.OperationalError:
                pass  # Column already exists

        cursor.execute("CREATE INDEX IF NOT EXISTS idx_visitors_visited_at ON visitors(visited_at)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_visitors_visitor_id ON visitors(visitor_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_visitors_user_email ON visitors(user_email)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_visitors_path ON visitors(path)")
        conn.commit()


def parse_user_agent(ua_string: str):
    """Simple parser to deduce browser, OS, and device type from User-Agent."""
    ua = ua_string or ""
    
    # Device detection
    if re.search(r"Mobile|Android|iPhone|iPod", ua, re.I):
        device = "Mobile"
    elif re.search(r"iPad|Tablet", ua, re.I):
        device = "Tablet"
    else:
        device = "Desktop"

    # OS detection
    if "Windows" in ua:
        os_name = "Windows"
    elif "Macintosh" in ua or "Mac OS" in ua:
        os_name = "macOS"
    elif "iPhone" in ua or "iPad" in ua:
        os_name = "iOS"
    elif "Android" in ua:
        os_name = "Android"
    elif "Linux" in ua:
        os_name = "Linux"
    else:
        os_name = "Other"

    # Browser detection (order matters because Chrome UA includes Safari)
    if "Edg/" in ua or "Edge/" in ua:
        browser = "Microsoft Edge"
    elif "OPR/" in ua or "Opera/" in ua:
        browser = "Opera"
    elif "Chrome/" in ua and "Chromium" not in ua:
        browser = "Google Chrome"
    elif "Firefox/" in ua:
        browser = "Mozilla Firefox"
    elif "Safari/" in ua and "Chrome" not in ua:
        browser = "Apple Safari"
    else:
        browser = "Web Browser"

    return browser, os_name, device


def record_visit(
    visitor_id: str,
    ip_address: str,
    user_agent: str,
    path: str = "/",
    referrer: str = "",
    language: str = "",
    screen_res: str = "",
    user_email: str = None,
    user_name: str = None,
    auth_provider: str = None,
):
    """Store a visitor event in the database."""
    init_db()
    browser, os_name, device = parse_user_agent(user_agent)
    now_iso = datetime.now(timezone.utc).isoformat()

    # Clean up local IP representations
    if ip_address in ("::1", "127.0.0.1"):
        clean_ip = "127.0.0.1 (Localhost)"
    elif ip_address:
        clean_ip = ip_address.split(",")[0].strip()
    else:
        clean_ip = "Unknown IP"

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO visitors (
                visitor_id, user_email, user_name, auth_provider,
                ip_address, user_agent, browser, os, device,
                path, referrer, language, screen_res, visited_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                visitor_id or "anonymous",
                user_email or None,
                user_name or None,
                auth_provider or None,
                clean_ip,
                user_agent,
                browser,
                os_name,
                device,
                path or "/",
                referrer or "Direct / None",
                language or "Unknown",
                screen_res or "Unknown",
                now_iso,
            ),
        )
        conn.commit()
        return cursor.lastrowid


def get_visitor_stats(limit: int = 100):
    """Retrieve summarized analytics and latest visitor logs with user account details."""
    init_db()
    with get_db_connection() as conn:
        cursor = conn.cursor()

        # Total visits
        cursor.execute("SELECT COUNT(*) FROM visitors")
        total_visits = cursor.fetchone()[0]

        # Unique visitors
        cursor.execute("SELECT COUNT(DISTINCT visitor_id) FROM visitors")
        unique_visitors = cursor.fetchone()[0]

        # Logged-in accounts count
        cursor.execute("SELECT COUNT(DISTINCT user_email) FROM visitors WHERE user_email IS NOT NULL")
        unique_accounts = cursor.fetchone()[0]

        # Visits in last 24h
        cursor.execute(
            """
            SELECT COUNT(*) FROM visitors 
            WHERE datetime(visited_at) >= datetime('now', '-1 day')
            """
        )
        today_visits = cursor.fetchone()[0]

        # Device breakdown
        cursor.execute(
            "SELECT device, COUNT(*) as count FROM visitors GROUP BY device ORDER BY count DESC"
        )
        device_stats = [{"device": r["device"], "count": r["count"]} for r in cursor.fetchall()]

        # Browser breakdown
        cursor.execute(
            "SELECT browser, COUNT(*) as count FROM visitors GROUP BY browser ORDER BY count DESC LIMIT 5"
        )
        browser_stats = [{"browser": r["browser"], "count": r["count"]} for r in cursor.fetchall()]

        # OS breakdown
        cursor.execute(
            "SELECT os, COUNT(*) as count FROM visitors GROUP BY os ORDER BY count DESC LIMIT 5"
        )
        os_stats = [{"os": r["os"], "count": r["count"]} for r in cursor.fetchall()]

        # Top Pages
        cursor.execute(
            "SELECT path, COUNT(*) as count FROM visitors GROUP BY path ORDER BY count DESC LIMIT 6"
        )
        top_pages = [{"path": r["path"], "count": r["count"]} for r in cursor.fetchall()]

        # Latest visitor rows with user details
        cursor.execute(
            """
            SELECT id, visitor_id, user_email, user_name, auth_provider, ip_address, browser, os, device, path, referrer, language, screen_res, visited_at
            FROM visitors
            ORDER BY id DESC
            LIMIT ?
            """,
            (limit,),
        )
        recent_visits = [dict(r) for r in cursor.fetchall()]

        return {
            "total_visits": total_visits,
            "unique_visitors": unique_visitors,
            "unique_accounts": unique_accounts,
            "today_visits": today_visits,
            "device_stats": device_stats,
            "browser_stats": browser_stats,
            "os_stats": os_stats,
            "top_pages": top_pages,
            "recent_visits": recent_visits,
        }


def export_visits_csv() -> str:
    """Generate a clean CSV string of all visitor records for download."""
    init_db()
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, visitor_id, user_email, user_name, auth_provider, ip_address, browser, os, device, path, referrer, language, screen_res, visited_at
            FROM visitors
            ORDER BY id DESC
            """
        )
        rows = cursor.fetchall()

    import csv
    import io

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "ID",
        "Visitor UUID",
        "Account Email",
        "User Name",
        "Auth Provider",
        "IP Address",
        "Browser",
        "OS",
        "Device",
        "Path Visited",
        "Referrer",
        "Language",
        "Screen Resolution",
        "Timestamp (UTC)",
    ])
    for r in rows:
        writer.writerow([
            r["id"],
            r["visitor_id"],
            r["user_email"] or "Guest / Unauthenticated",
            r["user_name"] or "Anonymous",
            r["auth_provider"] or "Direct Visit",
            r["ip_address"],
            r["browser"],
            r["os"],
            r["device"],
            r["path"],
            r["referrer"],
            r["language"],
            r["screen_res"],
            r["visited_at"],
        ])

    return output.getvalue()


def clear_all_visitors():
    """Purge all visitor tracking records from the database."""
    init_db()
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM visitors")
        cursor.execute("DELETE FROM sqlite_sequence WHERE name='visitors'")
        conn.commit()
        return True


def delete_visitor_record(record_id: int):
    """Delete a single visitor tracking record by its ID."""
    init_db()
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM visitors WHERE id = ?", (record_id,))
        conn.commit()
        return cursor.rowcount > 0


def delete_visitor_by_uid(visitor_id: str):
    """Delete all visitor tracking records for a specific visitor UUID."""
    init_db()
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM visitors WHERE visitor_id = ?", (visitor_id,))
        conn.commit()
        return cursor.rowcount > 0
