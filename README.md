# 📄 Doxora — Intelligent AI Document Studio

<div align="center">

![Doxora Banner](documind-frontend/documind-frontend/public/doxora-logo-full.png)

### *Transform, Chat, Analyze, and Generate Documents with Next-Generation AI*

[![React](https://img.shields.io/badge/Frontend-React%2019%20%7C%20Vite-61dafb?logo=react&logoColor=black)](https://react.dev/)
[![Flask](https://img.shields.io/badge/Backend-Python%20%7C%20Flask-000000?logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![OpenRouter](https://img.shields.io/badge/AI%20Engine-OpenRouter%20API-6366f1)](https://openrouter.ai/)
[![Firebase](https://img.shields.io/badge/Auth-Firebase-ffca28?logo=firebase&logoColor=black)](https://firebase.google.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

[Features](#-key-features) • [Tech Stack](#-technology-stack) • [Quick Start](#-quick-start) • [Project Structure](#-project-structure) • [Deployment](#-production-deployment) • [Author](#-author)

</div>

---

## 🌟 Overview

**Doxora** is an end-to-end full-stack AI Document Studio designed for rapid document comprehension, content synthesis, deep question-answering, and automated document generation. 

Built with a **React 19 Vite** frontend and a **Python Flask** backend powered by **OpenRouter AI models**, Doxora turns complex documents (PDFs, Word documents, text files, and images) into interactive, actionable intelligence with a cinematic glassmorphism user interface.

---

## ✨ Key Features

- **📑 Multi-Format Document Ingestion**  
  Upload and parse PDF, DOCX, TXT, and scanned image documents with automatic text extraction and chunking.
- **💬 Conversational Document Q&A**  
  Chat directly with your documents with context-aware references, citations, and instant semantic search.
- **⚡ Automated Smart Summaries**  
  Generate executive summaries, key highlights, bullet breakdowns, and action items in seconds.
- **🔍 Structured Data & Entity Extraction**  
  Extract tables, dates, monetary values, key personnel, agreements, and action items automatically.
- **📝 AI Document Generation**  
  Create formatted briefs, professional summaries, contracts, reports, and export them as ready-to-use files.
- **🎙️ Voice & Audio Integration**  
  Built-in voice input for natural hands-free prompting and text-to-speech audio playback.
- **📊 Real-Time Visitor & Analytics Dashboard**  
  Track user interactions, document processing metrics, and platform usage with interactive visual charts.
- **🔐 Secure Authentication**  
  Firebase Authentication supporting Google Sign-In, Email/Password, and guest exploration mode.
- **🎨 Cinematic Royal UI**  
  Custom dark-mode aesthetics, fluid glassmorphism, responsive controls, and reactive particle backgrounds.

---

## 🛠️ Technology Stack

### Frontend
- **Framework:** React 19 with Vite
- **Styling:** Custom CSS Design System, Glassmorphic components, Responsive Grid & Flexbox
- **Icons:** Lucide React
- **Authentication:** Firebase Auth SDK
- **Routing:** Single Page Application (SPA) with custom history-state routing

### Backend
- **Framework:** Python 3.10+ & Flask
- **Server:** Gunicorn (Production WSGI) / Werkzeug (Local Development)
- **AI Integrations:** OpenRouter API (Claude, GPT-4.1, Gemini, DeepSeek, and Llama models)
- **Document Processing:** PyPDF2, python-docx, Pillow (PIL), pdfplumber
- **CORS & Environment:** flask-cors, python-dotenv

---

## 📁 Project Structure

```bash
doxora/
├── documind-backend/
│   └── documind/
│       ├── app.py                # Main Flask API endpoints & routes
│       ├── wsgi.py               # Production WSGI entry point for Gunicorn
│       ├── requirements.txt      # Python dependencies
│       ├── .env.example          # Backend environment template
│       ├── data/                 # Local data storage (.gitkeep)
│       ├── uploads/              # Temporary upload directory (.gitkeep)
│       ├── generated/            # Output documents (.gitkeep)
│       └── utils/
│           ├── ai_service.py     # OpenRouter API client & prompt engine
│           ├── document_parser.py# Multi-format document parser (PDF, DOCX, TXT)
│           ├── document_generator.py # File creation & export utilities
│           └── visitor_store.py  # Visitor logging & analytics store
│
├── documind-frontend/
│   └── documind-frontend/
│       ├── index.html            # Main HTML entry with SEO tags
│       ├── package.json          # Node dependencies & build scripts
│       ├── vite.config.js        # Vite build & server configuration
│       ├── vercel.json           # Vercel SPA routing configuration
│       ├── .env.example          # Frontend environment template
│       ├── public/               # Logos, icons, and background assets
│       └── src/
│           ├── main.jsx          # React DOM mounting
│           ├── App.jsx           # Root application router & view switcher
│           ├── index.css         # Design tokens, variables & glassmorphic styling
│           ├── components/       # UI Components (ChatPanel, DocumentSidebar, etc.)
│           ├── context/          # Auth & Application State providers
│           ├── lib/              # API Client & Firebase integrations
│           └── pages/            # Views (Landing, Dashboard, Login, VisitorAnalytics)
│
├── run_app.bat                   # 1-Click local launch script for Windows
├── .gitignore                    # Git rules excluding secrets, node_modules & db
└── README.md                     # Project documentation
```

---

## 🚀 Quick Start (Local Setup)

### Option 1: 1-Click Launch (Windows)
Double-click `run_app.bat` in the project root to automatically start both the backend and frontend dev servers.

---

### Option 2: Manual Setup

#### 1. Clone the Repository
```bash
git clone https://github.com/thivin-26/doxora.git
cd doxora
```

#### 2. Backend Setup
```bash
cd documind-backend/documind

# Create and activate Python virtual environment
python -m venv venv
# Windows:
.\venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env and insert your OPENROUTER_API_KEY

# Start backend server
python app.py
```
*Backend runs on `http://localhost:5000`*

#### 3. Frontend Setup
Open a new terminal window:
```bash
cd documind-frontend/documind-frontend

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env and insert your Firebase configuration (optional for local guest mode)

# Start Vite development server
npm run dev
```
*Frontend runs on `http://localhost:5173`*

---

## ⚙️ Environment Variables

### Backend (`documind-backend/documind/.env`)
| Variable | Description | Default |
| :--- | :--- | :--- |
| `OPENROUTER_API_KEY` | OpenRouter API Key for AI features (**Required**) | — |
| `OPENROUTER_MODEL` | Default model ID | `openai/gpt-4.1-mini` |
| `PORT` | Flask server port | `5000` |
| `FRONTEND_ORIGIN` | Allowed CORS origin in production | `*` |
| `FLASK_DEBUG` | Flask debug mode | `false` |

### Frontend (`documind-frontend/documind-frontend/.env`)
| Variable | Description |
| :--- | :--- |
| `VITE_API_URL` | Backend URL (e.g. `https://your-doxora-api.onrender.com` in production) |
| `VITE_FIREBASE_API_KEY` | Firebase Web API Key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Authentication Domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase Project ID |

---

## 🌐 Production Deployment

### Backend (Render Free Web Service)
1. Link your GitHub repository `thivin-26/doxora` to [Render](https://render.com).
2. Choose **Web Service** with the following settings:
   - **Root Directory:** `documind-backend/documind`
   - **Runtime:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `gunicorn wsgi:app --bind 0.0.0.0:$PORT --workers 2 --timeout 120`
3. Add Environment Variable:
   - `OPENROUTER_API_KEY`: *(Your OpenRouter Key)*
   - `FRONTEND_ORIGIN`: *(Your deployed Vercel frontend URL)*

### Frontend (Vercel Free Hosting)
1. Import `thivin-26/doxora` in [Vercel](https://vercel.com).
2. Select **Root Directory:** `documind-frontend/documind-frontend`.
3. Set Framework Preset: **Vite**.
4. Add Environment Variable:
   - `VITE_API_URL`: *(Your deployed Render backend URL)*
5. Click **Deploy**.

---

## 👨‍💻 Author

**Thivin Priya**  
- GitHub: [@thivin-26](https://github.com/thivin-26)  
- Repository: [https://github.com/thivin-26/doxora](https://github.com/thivin-26/doxora)

---

## 📜 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
