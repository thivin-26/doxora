# DocuMind — AI Document Studio

An AI-powered workspace for working with documents: upload a file and summarize it,
ask it questions, pull structured data out of it, or generate a new document from it.
Includes a modern React landing page, Supabase-backed login/signup, and a dashboard
with an AI chat interface per document.

## Features

- **Landing page** — hero, features (flip cards), how-it-works, testimonials, pricing/CTA
- **Auth** — Supabase email/password login & signup
- **Dashboard** — upload/list/delete documents, chat with any document (AI chat app)
- **Upload & parse** — PDF, DOCX, TXT, and Markdown files
- **Summarize** — concise, detailed, bulleted, or executive-style summaries
- **Chat / Q&A** — ask questions about an uploaded document, with conversation memory per document
- **Extract structured data** — pulls dates, entities, amounts, and tables out as JSON or CSV
- **Generate documents** — draft a new report, memo, letter, or proposal from a prompt, optionally
  based on an uploaded document, exported as DOCX, PDF, or TXT

## Tech stack

- **Frontend:** React + Vite + Tailwind CSS v4, React Router, `@supabase/supabase-js`, `lucide-react`
- **Backend:** Python 3, Flask, `flask-cors`, `PyJWT` (verifies Supabase session tokens)
- **Auth:** Supabase Auth (email/password)
- **Database:** Supabase Postgres (optional metadata/chat persistence — see below)
- **Document parsing:** `pypdf`, `python-docx`
- **Document generation:** `python-docx`, `fpdf2`
- **AI:** OpenRouter API (OpenAI-compatible chat completions), called directly via `requests`

## Project structure

```
documind/                       # Flask backend
├── app.py                      # Flask app & all API routes (now auth-protected)
├── requirements.txt
├── .env.example                 # copy to .env and fill in
├── supabase/
│   └── schema.sql               # Postgres schema + RLS policies for documents/chat
├── utils/
│   ├── document_parser.py      # PDF/DOCX/TXT → plain text + metadata
│   ├── ai_service.py           # Claude API calls: summarize, chat, extract, generate
│   ├── document_generator.py   # plain text → DOCX/PDF/TXT/JSON/CSV
│   ├── auth.py                 # Verifies Supabase JWTs on every /api request
│   └── supabase_store.py       # Optional: mirrors document/chat metadata into Postgres
├── templates/ static/           # legacy vanilla-JS UI (still served at "/", optional)
├── uploads/ generated/          # gitignored

documind-frontend/               # React app (landing, login, dashboard)
├── src/
│   ├── pages/                  # Landing.jsx, Login.jsx, Dashboard.jsx
│   ├── components/             # Navbar, Footer, Button, FlipCard, ChatPanel, DocumentSidebar...
│   ├── context/AuthContext.jsx # Supabase session state
│   └── lib/                    # supabaseClient.js, api.js (talks to the Flask backend)
├── .env.example                 # copy to .env, fill in Supabase project URL/anon key
└── vite.config.js               # proxies /api to http://localhost:5000 in dev
```

## Setup

### 1. Create a Supabase project

Go to [supabase.com](https://supabase.com/), create a project, then:

- **Enable email/password auth**: Authentication → Providers → Email (on by default).
- **Run the schema** (optional, for persistent document/chat metadata): open the SQL
  Editor and run `documind/supabase/schema.sql`.
- Grab three values from **Project Settings → API**:
  - `Project URL`
  - `anon public` key
  - `service_role` key (secret — backend only)
  - and from **Project Settings → API → JWT Settings**: the `JWT Secret`

### 2. Backend

```bash
cd documind
pip install -r requirements.txt
cp .env.example .env
```

Edit `.env`:

```
OPENROUTER_API_KEY=your-actual-key          # required for AI features
SUPABASE_JWT_SECRET=your-jwt-secret        # verifies frontend session tokens
SUPABASE_URL=https://your-project.supabase.co   # optional, enables Postgres persistence
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key # optional, pairs with SUPABASE_URL
```

Leaving `SUPABASE_JWT_SECRET` empty is fine for local development — the backend
falls back to a single shared "local-dev" user so you can test without Supabase
wired up yet. Leaving `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` empty just keeps
document/chat storage in-memory only (same as before).

```bash
python app.py
```

Runs on **http://localhost:5000**.

### 3. Frontend

```bash
cd documind-frontend
npm install
cp .env.example .env
```

Edit `.env`:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

```bash
npm run dev
```

Runs on **http://localhost:5173** and proxies `/api/*` to the Flask backend on
port 5000, so run both at once.

## API overview

All endpoints are under `/api` and (unless `SUPABASE_JWT_SECRET` is unset) require
an `Authorization: Bearer <supabase-access-token>` header, which the frontend sends
automatically once a user is logged in.

| Method | Endpoint                     | Purpose                                   |
|--------|-------------------------------|--------------------------------------------|
| GET    | `/api/health`                 | Health check + whether an API key is set  |
| POST   | `/api/upload`                 | Upload a document (multipart `file` field)|
| GET    | `/api/documents`              | List the current user's uploaded documents |
| DELETE | `/api/documents/<id>`         | Remove a document (owner only)             |
| POST   | `/api/summarize`               | `{doc_id, style}` → summary text           |
| POST   | `/api/chat`                    | `{doc_id, question}` → answer, with memory |
| GET    | `/api/chat/<id>/history`      | Chat history for a document                |
| POST   | `/api/extract`                 | `{doc_id, fields_hint, format}` → JSON/CSV |
| POST   | `/api/generate`                | `{prompt, doc_type, output_format, source_doc_id}` → new file |
| GET    | `/api/download/<filename>`    | Download a generated file                  |

## Notes on the current implementation

- **Document text lives in-memory** in the Flask process (a Python dict), scoped per
  authenticated user. Restarting the server clears it. Setting `SUPABASE_URL` /
  `SUPABASE_SERVICE_ROLE_KEY` mirrors *metadata* (filename, word count, chat messages)
  into Postgres via `utils/supabase_store.py` so the library and chat history survive a
  restart — but the full document text isn't persisted there today; wiring that up (e.g.
  Supabase Storage for the source file + re-parsing on load) is a natural next step.
- **CORS** is open (`*`) by default for local dev — set `FRONTEND_ORIGIN` in `.env` to
  your deployed frontend URL before shipping anywhere public.
- **Large documents are truncated** (~60k characters) before being sent to the model to
  stay within a safe context budget; see `MAX_DOC_CHARS` in `utils/ai_service.py`.
- **Scanned/image-only PDFs** won't extract text (no OCR is included) — the upload will
  return a clear error in that case rather than silently producing an empty document.

## Testing it yourself

```bash
curl http://localhost:5000/api/health
curl -X POST -F "file=@/path/to/some.pdf" http://localhost:5000/api/upload
```

Verified end-to-end during development: health check, upload/parse (PDF/DOCX/TXT),
document list/delete, chat history, clean error responses when `OPENROUTER_API_KEY` is
missing, JWT rejection on missing/invalid/expired tokens, JWT acceptance on a validly
signed Supabase-style token, and the Vite dev proxy reaching the Flask API end-to-end.

