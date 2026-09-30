import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/useAuth";

const VISITOR_ID_KEY = "doxora_visitor_uuid";
// Session-level dedup: tracks keys already sent this browser session
const _sentKeys = new Set();

function getOrCreateVisitorId() {
  if (typeof window === "undefined") return "anon";
  let vid = localStorage.getItem(VISITOR_ID_KEY);
  if (!vid) {
    vid = "dx_" + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    try {
      localStorage.setItem(VISITOR_ID_KEY, vid);
    } catch {
      // storage unavailable
    }
  }
  return vid;
}

export default function VisitorTracker() {
  const location = useLocation();
  const { user } = useAuth();
  const timerRef = useRef(null);

  useEffect(() => {
    const currentPath = location.pathname + location.search;
    const trackingKey = `${currentPath}|${user?.uid || "anon"}`;

    // Global session-level dedup — prevents StrictMode double-fire AND tab dups
    if (_sentKeys.has(trackingKey)) return;

    // Debounce 400ms so rapid navigation doesn't flood
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      // Double-check after debounce
      if (_sentKeys.has(trackingKey)) return;
      _sentKeys.add(trackingKey);

      const visitorId = getOrCreateVisitorId();

      let authProvider = null;
      if (user?.email) {
        if (user.photoURL || user.isLocal === false) {
          authProvider = "Google Account";
        } else if (user.isLocal) {
          authProvider = "Local Account";
        } else {
          authProvider = "Email / Password";
        }
      }

      const payload = {
        visitor_id: visitorId,
        path: currentPath,
        referrer: typeof document !== "undefined" ? document.referrer || "Direct" : "Direct",
        language: typeof navigator !== "undefined" ? navigator.language : "en",
        screen_res:
          typeof window !== "undefined"
            ? `${window.screen.width}x${window.screen.height}`
            : "unknown",
        user_email: user?.email || null,
        user_name: user?.displayName || (user?.email ? user.email.split("@")[0] : null),
        auth_provider: authProvider,
      };

      // Send tracking asynchronously; non-blocking
      api.trackVisit(payload).catch((err) => {
        // Silently ignore tracking errors so application flow is never disrupted
        console.debug("Doxora visitor telemetry sync:", err.message);
      });
    }, 400);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [location, user]);

  return null;
}
