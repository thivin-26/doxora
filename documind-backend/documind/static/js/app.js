(() => {
  "use strict";

  const state = {
    documents: [],      // [{doc_id, filename, word_count, page_count, upload_time}]
    activeDocId: null,
  };

  // ---------- Element refs ----------
  const fileInput = document.getElementById("fileInput");
  const uploadDrop = document.getElementById("uploadDrop");
  const docListEl = document.getElementById("docList");
  const statusDot = document.getElementById("statusDot");
  const statusText = document.getElementById("statusText");

  const emptyState = document.getElementById("emptyState");
  const docWorkspace = document.getElementById("docWorkspace");
  const activeDocName = document.getElementById("activeDocName");
  const activeDocMeta = document.getElementById("activeDocMeta");
  const closeDocBtn = document.getElementById("closeDocBtn");

  const tabs = document.querySelectorAll(".tab");
  const panels = document.querySelectorAll(".panel");

  // ---------- Helpers ----------
  function fmtNumber(n) {
    if (n === null || n === undefined) return "—";
    return n.toLocaleString();
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  async function api(path, options = {}) {
    const res = await fetch(path, options);
    let data;
    try {
      data = await res.json();
    } catch {
      data = {};
    }
    if (!res.ok) {
      throw new Error(data.error || `Request failed (${res.status})`);
    }
    return data;
  }

  function activeDoc() {
    return state.documents.find(d => d.doc_id === state.activeDocId) || null;
  }

  // ---------- Health check ----------
  async function checkHealth() {
    try {
      const data = await api("/api/health");
      if (data.ai_configured) {
        statusDot.className = "status-dot ok";
        statusText.textContent = "AI connected";
      } else {
        statusDot.className = "status-dot error";
        statusText.textContent = "No API key set (.env)";
      }
    } catch {
      statusDot.className = "status-dot error";
      statusText.textContent = "Backend unreachable";
    }
  }

  // ---------- Document list ----------
  async function refreshDocList() {
    const docs = await api("/api/documents");
    state.documents = docs;
    renderDocList();
  }

  function renderDocList() {
    if (state.documents.length === 0) {
      docListEl.innerHTML = `<p class="doc-list-empty">No documents yet. Upload one to get started.</p>`;
      return;
    }
    docListEl.innerHTML = state.documents.map(d => `
      <div class="doc-card ${d.doc_id === state.activeDocId ? "active" : ""}" data-doc-id="${d.doc_id}">
        <button class="doc-remove" data-remove="${d.doc_id}" title="Remove">✕</button>
        <p class="doc-title">${escapeHtml(d.filename)}</p>
        <p class="doc-sub">${fmtNumber(d.word_count)} words${d.page_count ? " · " + d.page_count + " pg" : ""}</p>
      </div>
    `).join("");

    docListEl.querySelectorAll(".doc-card").forEach(card => {
      card.addEventListener("click", (e) => {
        if (e.target.closest(".doc-remove")) return;
        openDocument(card.dataset.docId);
      });
    });
    docListEl.querySelectorAll(".doc-remove").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        await removeDocument(btn.dataset.remove);
      });
    });
  }

  async function removeDocument(docId) {
    await api(`/api/documents/${docId}`, { method: "DELETE" });
    if (state.activeDocId === docId) {
      state.activeDocId = null;
      showEmptyState();
    }
    await refreshDocList();
  }

  // ---------- Upload ----------
  async function handleFiles(files) {
    if (!files || files.length === 0) return;
    const file = files[0];
    const formData = new FormData();
    formData.append("file", file);

    uploadDrop.querySelector("span:not(.upload-icon)").textContent = "Uploading…";
    try {
      const result = await api("/api/upload", { method: "POST", body: formData });
      await refreshDocList();
      openDocument(result.doc_id);
    } catch (err) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      uploadDrop.querySelector("span:not(.upload-icon)").textContent = "Upload a document";
    }
  }

  fileInput.addEventListener("change", (e) => handleFiles(e.target.files));

  ["dragover", "dragenter"].forEach(evt => {
    uploadDrop.addEventListener(evt, (e) => {
      e.preventDefault();
      uploadDrop.classList.add("dragover");
    });
  });
  ["dragleave", "drop"].forEach(evt => {
    uploadDrop.addEventListener(evt, (e) => {
      e.preventDefault();
      uploadDrop.classList.remove("dragover");
    });
  });
  uploadDrop.addEventListener("drop", (e) => handleFiles(e.dataTransfer.files));

  // ---------- Workspace open/close ----------
  function showEmptyState() {
    emptyState.classList.remove("hidden");
    docWorkspace.classList.add("hidden");
  }

  function openDocument(docId) {
    state.activeDocId = docId;
    const doc = activeDoc();
    if (!doc) return;

    emptyState.classList.add("hidden");
    docWorkspace.classList.remove("hidden");
    activeDocName.textContent = doc.filename;
    activeDocMeta.textContent = `${fmtNumber(doc.word_count)} words${doc.page_count ? " · " + doc.page_count + " pages" : ""} · ID ${doc.doc_id}`;

    // Reset panels to a clean state for the newly opened doc
    resetPanel("summarize");
    resetPanel("chat");
    resetPanel("extract");
    resetPanel("generate");

    renderDocList();
  }

  function resetPanel(name) {
    if (name === "summarize") {
      document.getElementById("summaryResult").innerHTML = `<p class="placeholder">Your summary will appear here.</p>`;
      document.getElementById("summarizeStamp").style.display = "none";
    } else if (name === "chat") {
      document.getElementById("chatWindow").innerHTML = `<p class="placeholder">Ask anything about this document — "What's the main argument?", "Summarize section 2", "Does this mention a deadline?"</p>`;
    } else if (name === "extract") {
      document.getElementById("extractResult").innerHTML = `<p class="placeholder">Structured data pulled from the document will appear here, with a download link.</p>`;
      document.getElementById("extractStamp").style.display = "none";
    } else if (name === "generate") {
      document.getElementById("generateResult").innerHTML = `<p class="placeholder">Generated content preview and a download link will appear here.</p>`;
      document.getElementById("generateStamp").style.display = "none";
    }
  }

  closeDocBtn.addEventListener("click", () => {
    state.activeDocId = null;
    showEmptyState();
    renderDocList();
  });

  // ---------- Tabs ----------
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      panels.forEach(p => p.classList.remove("active"));
      tab.classList.add("active");
      document.querySelector(`.panel[data-panel="${tab.dataset.tab}"]`).classList.add("active");
    });
  });

  // ---------- Summarize ----------
  document.getElementById("runSummarize").addEventListener("click", async () => {
    const doc = activeDoc();
    if (!doc) return;
    const btn = document.getElementById("runSummarize");
    const resultBox = document.getElementById("summaryResult");
    const stamp = document.getElementById("summarizeStamp");
    const style = document.getElementById("summaryStyle").value;

    btn.disabled = true;
    btn.textContent = "Summarizing…";
    stamp.style.display = "none";
    resultBox.innerHTML = `<p class="placeholder">Reading the document…</p>`;

    try {
      const data = await api("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doc_id: doc.doc_id, style }),
      });
      resultBox.textContent = data.summary;
      stamp.style.display = "inline-block";
    } catch (err) {
      resultBox.innerHTML = `<p class="error-text">${escapeHtml(err.message)}</p>`;
    } finally {
      btn.disabled = false;
      btn.textContent = "Summarize";
    }
  });

  // ---------- Chat ----------
  document.getElementById("chatForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const doc = activeDoc();
    if (!doc) return;

    const input = document.getElementById("chatInput");
    const question = input.value.trim();
    if (!question) return;

    const chatWindow = document.getElementById("chatWindow");
    if (chatWindow.querySelector(".placeholder")) chatWindow.innerHTML = "";

    chatWindow.insertAdjacentHTML("beforeend", `<div class="chat-msg user">${escapeHtml(question)}</div>`);
    input.value = "";
    chatWindow.scrollTop = chatWindow.scrollHeight;

    const thinkingId = `thinking-${Date.now()}`;
    chatWindow.insertAdjacentHTML("beforeend", `<div class="chat-msg assistant" id="${thinkingId}">Thinking…</div>`);
    chatWindow.scrollTop = chatWindow.scrollHeight;

    try {
      const data = await api("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doc_id: doc.doc_id, question }),
      });
      document.getElementById(thinkingId).textContent = data.answer;
    } catch (err) {
      const el = document.getElementById(thinkingId);
      el.textContent = err.message;
      el.classList.add("error-text");
    }
    chatWindow.scrollTop = chatWindow.scrollHeight;
  });

  // ---------- Extract ----------
  document.getElementById("runExtract").addEventListener("click", async () => {
    const doc = activeDoc();
    if (!doc) return;
    const btn = document.getElementById("runExtract");
    const resultBox = document.getElementById("extractResult");
    const stamp = document.getElementById("extractStamp");
    const fieldsHint = document.getElementById("fieldsHint").value.trim();
    const format = document.getElementById("extractFormat").value;

    btn.disabled = true;
    btn.textContent = "Extracting…";
    stamp.style.display = "none";
    resultBox.innerHTML = `<p class="placeholder">Pulling out structured data…</p>`;

    try {
      const data = await api("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doc_id: doc.doc_id, fields_hint: fieldsHint, format }),
      });
      resultBox.innerHTML = `
        <pre class="json-view">${escapeHtml(JSON.stringify(data.data, null, 2))}</pre>
        <a class="download-link" href="${data.download_url}" download>⬇ Download ${format.toUpperCase()}</a>
      `;
      stamp.style.display = "inline-block";
    } catch (err) {
      resultBox.innerHTML = `<p class="error-text">${escapeHtml(err.message)}</p>`;
    } finally {
      btn.disabled = false;
      btn.textContent = "Extract";
    }
  });

  // ---------- Generate ----------
  document.getElementById("runGenerate").addEventListener("click", async () => {
    const doc = activeDoc();
    const btn = document.getElementById("runGenerate");
    const resultBox = document.getElementById("generateResult");
    const stamp = document.getElementById("generateStamp");
    const prompt = document.getElementById("generatePrompt").value.trim();
    const docType = document.getElementById("docType").value;
    const outputFormat = document.getElementById("outputFormat").value;
    const useAsSource = document.getElementById("useAsSource").checked;

    if (!prompt) {
      resultBox.innerHTML = `<p class="error-text">Describe what you'd like generated first.</p>`;
      return;
    }

    btn.disabled = true;
    btn.textContent = "Drafting…";
    stamp.style.display = "none";
    resultBox.innerHTML = `<p class="placeholder">Drafting your document…</p>`;

    try {
      const data = await api("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          doc_type: docType,
          output_format: outputFormat,
          source_doc_id: (useAsSource && doc) ? doc.doc_id : null,
        }),
      });
      resultBox.innerHTML = `
        <p>${escapeHtml(data.content_preview)}${data.content_preview.length >= 500 ? "…" : ""}</p>
        <a class="download-link" href="${data.download_url}" download>⬇ Download ${data.format.toUpperCase()}</a>
      `;
      stamp.style.display = "inline-block";
    } catch (err) {
      resultBox.innerHTML = `<p class="error-text">${escapeHtml(err.message)}</p>`;
    } finally {
      btn.disabled = false;
      btn.textContent = "Generate";
    }
  });

  // ---------- Init ----------
  checkHealth();
  refreshDocList();
  showEmptyState();
})();
