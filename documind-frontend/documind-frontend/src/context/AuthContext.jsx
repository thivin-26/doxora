// @refresh reset
import { createContext, useEffect, useState } from "react";
import {
  auth,
  googleProvider,
  hasFirebaseConfig,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  fbSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from "../lib/firebase";

export const AuthContext = createContext(null);
const STORAGE_KEY = "doxora-firebase-session";
const USERS_KEY = "doxora-local-users-v2";
const TOKEN_KEY = "doxora-auth-token";

// ─── Local storage helpers ────────────────────────────────────────────────────

function readStoredSession() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeStoredSession(session, token) {
  if (typeof window === "undefined") return;
  if (session) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
  } else {
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(TOKEN_KEY);
  }
}

function readLocalUsers() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeLocalUsers(users) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

// Simple deterministic hash so passwords aren't stored in plain text locally
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "doxora-salt-2024");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function buildLocalSession(email, displayName = null) {
  const name = displayName || email.split("@")[0];
  const user = {
    uid: `local-${btoa(email).replace(/[^a-zA-Z0-9]/g, "").slice(0, 20)}`,
    email,
    displayName: name,
    photoURL: null,
    isLocal: true,
  };
  const token = `local-token-${user.uid}-${Date.now()}`;
  return { user, token };
}

// ─── Firebase error message formatter ─────────────────────────────────────────

// Returns null to signal "use local fallback", or a string error message
function formatFirebaseError(errCode) {
  const code = typeof errCode === "string" ? errCode : "";
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "INVALID_CREDENTIALS"; // special marker — check local db
    case "auth/email-already-in-use":
      return "This email address is already registered. Please sign in instead.";
    case "auth/weak-password":
      return "Password should be at least 6 characters long.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/popup-closed-by-user":
      return "Google sign-in popup was closed before completing.";
    case "auth/cancelled-popup-request":
      return "Sign in request was cancelled.";
    case "auth/too-many-requests":
      return "Too many failed attempts. Please try again later or reset your password.";
    // All of these → silently use local fallback
    case "auth/network-request-failed":
    case "auth/operation-not-allowed":
    case "auth/configuration-not-found":
    case "auth/internal-error":
      return null;
    default:
      // Also catch Firebase REST OPERATION_NOT_ALLOWED
      if (code.includes("OPERATION_NOT_ALLOWED") || code.includes("network") || code.includes("fetch")) {
        return null;
      }
      return code || "Authentication error. Please try again.";
  }
}

// ─── Auth Provider ─────────────────────────────────────────────────────────────

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(() => readStoredSession());
  const [loading, setLoading] = useState(true);

  // Restore session from localStorage on mount
  useEffect(() => {
    if (!hasFirebaseConfig || !auth) {
      const stored = readStoredSession();
      if (stored?.user) {
        setUser(stored.user);
        setSession(stored);
      }
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          const token = await fbUser.getIdToken();
          const sessionData = {
            user: {
              uid: fbUser.uid,
              email: fbUser.email,
              displayName: fbUser.displayName || fbUser.email?.split("@")[0] || "User",
              photoURL: fbUser.photoURL || null,
            },
            token,
          };
          setUser(sessionData.user);
          setSession(sessionData);
          writeStoredSession(sessionData, token);
        } catch (err) {
          console.error("Firebase token error:", err);
          // Restore from local cache if available
          const stored = readStoredSession();
          if (stored?.user) {
            setUser(stored.user);
            setSession(stored);
          } else {
            setUser(null);
            setSession(null);
            writeStoredSession(null);
          }
        }
      } else {
        // Check if we have a local session to restore (for offline/local accounts)
        const stored = readStoredSession();
        if (stored?.user?.isLocal) {
          setUser(stored.user);
          setSession(stored);
        } else {
          setUser(null);
          setSession(null);
          writeStoredSession(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // ── Sign Up ──────────────────────────────────────────────────────────────────
  const signUp = async (email, password) => {
    const normalizedEmail = String(email || "").trim().toLowerCase();

    if (!normalizedEmail || !password || password.length < 6) {
      return {
        data: null,
        error: { message: "Please enter a valid email and a password of at least 6 characters." },
      };
    }

    // Try Firebase first
    if (hasFirebaseConfig && auth) {
      try {
        const credential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
        const token = await credential.user.getIdToken();
        const sessionData = {
          user: {
            uid: credential.user.uid,
            email: credential.user.email,
            displayName: credential.user.displayName || normalizedEmail.split("@")[0],
            photoURL: credential.user.photoURL || null,
          },
          token,
        };
        setUser(sessionData.user);
        setSession(sessionData);
        writeStoredSession(sessionData, token);
        return { data: sessionData, error: null };
      } catch (err) {
        const msg = formatFirebaseError(err.code || err.message);
        // If Firebase says email already in use → hard error, don't fall through
        if (err.code === "auth/email-already-in-use") {
          return { data: null, error: { message: "This email is already registered. Please sign in instead." } };
        }
        // For network/config issues → fall through to local mode silently
        if (msg !== null) {
          return { data: null, error: { message: msg } };
        }
        // msg === null means network/operation-not-allowed → use local mode
        console.warn("Firebase unavailable, using local session:", err.code);
      }
    }

    // ── Local fallback (offline / Firebase not configured / network failed) ───
    const users = readLocalUsers();
    const exists = users.some((u) => u.email === normalizedEmail);
    if (exists) {
      return { data: null, error: { message: "This email is already registered. Please sign in instead." } };
    }

    const hashed = await hashPassword(password);
    writeLocalUsers([...users, { email: normalizedEmail, passwordHash: hashed }]);

    const local = buildLocalSession(normalizedEmail);
    writeStoredSession(local, local.token);
    setUser(local.user);
    setSession(local);
    return { data: local, error: null };
  };

  // ── Sign In ──────────────────────────────────────────────────────────────────
  const signInWithPassword = async (email, password) => {
    const normalizedEmail = String(email || "").trim().toLowerCase();

    if (!normalizedEmail || !password) {
      return { data: null, error: { message: "Please enter your email and password." } };
    }

    // Try Firebase first
    if (hasFirebaseConfig && auth) {
      try {
        const credential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
        const token = await credential.user.getIdToken();
        const sessionData = {
          user: {
            uid: credential.user.uid,
            email: credential.user.email,
            displayName: credential.user.displayName || normalizedEmail.split("@")[0],
            photoURL: credential.user.photoURL || null,
          },
          token,
        };
        setUser(sessionData.user);
        setSession(sessionData);
        writeStoredSession(sessionData, token);
        return { data: sessionData, error: null };
      } catch (err) {
        const msg = formatFirebaseError(err.code || err.message);
        // msg === "INVALID_CREDENTIALS" means bad password/email → check local db
        if (msg === "INVALID_CREDENTIALS" || msg === null) {
          // Check if we have a local account for this email
          const users = readLocalUsers();
          const localUser = users.find((u) => u.email === normalizedEmail);
          if (!localUser) {
            return { data: null, error: { message: "No account found with this email. Please sign up first." } };
          }
          // Verify local password hash
          const hashed = await hashPassword(password);
          if (localUser.passwordHash !== hashed) {
            return { data: null, error: { message: "Incorrect password. Please try again." } };
          }
          // Local credentials match → create local session
          const local = buildLocalSession(normalizedEmail);
          writeStoredSession(local, local.token);
          setUser(local.user);
          setSession(local);
          return { data: local, error: null };
        }
        if (msg !== null) {
          return { data: null, error: { message: msg } };
        }
        // Network/config failure → try local
        console.warn("Firebase unavailable for sign-in, trying local:", err.code);
      }
    }

    // ── Local fallback ────────────────────────────────────────────────────────
    const users = readLocalUsers();
    const localUser = users.find((u) => u.email === normalizedEmail);

    if (!localUser) {
      return { data: null, error: { message: "No account found with this email. Please sign up first." } };
    }

    const hashed = await hashPassword(password);
    if (localUser.passwordHash !== hashed) {
      return { data: null, error: { message: "Incorrect password. Please try again." } };
    }

    const local = buildLocalSession(normalizedEmail);
    writeStoredSession(local, local.token);
    setUser(local.user);
    setSession(local);
    return { data: local, error: null };
  };

  // ── Google Sign In ───────────────────────────────────────────────────────────
  const signInWithGoogle = async () => {
    if (!hasFirebaseConfig || !auth || !googleProvider) {
      // Local demo Google session
      const demo = buildLocalSession("google-user@doxora.ai", "Google User");
      writeStoredSession(demo, demo.token);
      setUser(demo.user);
      setSession(demo);
      return { data: demo, error: null };
    }

    try {
      const credential = await signInWithPopup(auth, googleProvider);
      const token = await credential.user.getIdToken();
      const sessionData = {
        user: {
          uid: credential.user.uid,
          email: credential.user.email,
          displayName: credential.user.displayName || credential.user.email?.split("@")[0],
          photoURL: credential.user.photoURL || null,
        },
        token,
      };
      setUser(sessionData.user);
      setSession(sessionData);
      writeStoredSession(sessionData, token);
      return { data: sessionData, error: null };
    } catch (err) {
      if (err.code === "auth/popup-closed-by-user" || err.code === "auth/cancelled-popup-request") {
        return { data: null, error: { message: "Sign in was cancelled." } };
      }
      // Network failure → local demo Google
      const demo = buildLocalSession("google-user@doxora.ai", "Google User");
      writeStoredSession(demo, demo.token);
      setUser(demo.user);
      setSession(demo);
      return { data: demo, error: null };
    }
  };

  // ── Reset Password ───────────────────────────────────────────────────────────
  const resetPassword = async (email) => {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    if (!hasFirebaseConfig || !auth) {
      return { data: true, error: null };
    }
    try {
      await sendPasswordResetEmail(auth, normalizedEmail);
      return { data: true, error: null };
    } catch (err) {
      const msg = formatFirebaseError(err.code || err.message);
      return { data: null, error: { message: msg || "Password reset failed. Please try again." } };
    }
  };

  // ── Sign Out ─────────────────────────────────────────────────────────────────
  const signOut = async () => {
    if (hasFirebaseConfig && auth) {
      try {
        await fbSignOut(auth);
      } catch (err) {
        console.error("Firebase signOut error:", err);
      }
    }
    writeStoredSession(null);
    setUser(null);
    setSession(null);
    return { error: null };
  };

  const isOwner = (() => {
    if (!user || !user.email) return false;
    const adminList = [
      "thivinpriya26@gmail.com",
      (import.meta.env.VITE_ADMIN_EMAIL || "").toLowerCase(),
    ].filter(Boolean);
    const userEmail = String(user.email).trim().toLowerCase();
    return adminList.some((adm) => userEmail === adm || userEmail.startsWith("admin@"));
  })();

  const value = {
    session,
    user,
    loading,
    isOwner,
    isDemoMode: !hasFirebaseConfig,
    signInWithPassword,
    signUp,
    signInWithGoogle,
    resetPassword,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
