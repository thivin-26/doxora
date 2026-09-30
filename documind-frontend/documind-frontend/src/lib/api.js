const API_HOST = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/$/, '') : "";
const BASE = `${API_HOST}/api`;

async function authHeaders() {
  if (typeof window === "undefined") return {};
  const token =
    window.localStorage.getItem("doxora-auth-token") ||
    window.localStorage.getItem("doxora-demo-token") ||
    window.localStorage.getItem("documind-demo-token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, options = {}) {
  const headers = await authHeaders();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      ...(options.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...headers,
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      message = data.error || data.message || message;
    } catch {
      // ignore non-JSON error bodies
    }
    throw new Error(message);
  }

  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return res.json();
  return res.blob();
}

export const api = {
  health: () => request("/health"),
  listDocuments: () => request("/documents"),
  deleteDocument: (id) => request(`/documents/${id}`, { method: "DELETE" }),
  upload: (file) => {
    const form = new FormData();
    form.append("file", file);
    return request("/upload", { method: "POST", body: form });
  },
  summarize: (doc_id, style) =>
    request("/summarize", {
      method: "POST",
      body: JSON.stringify({ doc_id, style }),
    }),
  translate: (doc_id, target_lang = "Tamil", text = null) =>
    request("/translate", {
      method: "POST",
      body: JSON.stringify({ doc_id, target_lang, text }),
    }),
  chat: (doc_id, question) =>
    request("/chat", {
      method: "POST",
      body: JSON.stringify({ doc_id, question }),
    }),
  chatHistory: (docId) => request(`/chat/${docId}/history`),
  getSuggestedQuestions: (docId) => request(`/documents/${docId}/suggested-questions`),
  extract: (doc_id, fields_hint, format) =>
    request("/extract", {
      method: "POST",
      body: JSON.stringify({ doc_id, fields_hint, format }),
    }),
  generate: (payload) =>
    request("/generate", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  downloadUrl: (filename) => `${BASE}/download/${filename}`,
  trackVisit: (payload) =>
    request("/track-visit", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getVisitorStats: (limit = 100) => request(`/analytics/visitors?limit=${limit}`),
  clearAllVisitors: () => request("/analytics/visitors", { method: "DELETE" }),
  deleteVisitorRecord: (id) => request(`/analytics/visitors/${id}`, { method: "DELETE" }),
  deleteVisitorUser: (visitorId) => request(`/analytics/visitors/user/${visitorId}`, { method: "DELETE" }),
  exportVisitorsUrl: `${BASE}/analytics/export`,
};

