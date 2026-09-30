import { useEffect, useState, useCallback } from "react";
import { FileText, LogOut, Home, Crown, Sparkles } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import DocumentSidebar from "../components/DocumentSidebar";
import ChatPanel from "../components/ChatPanel";
import CinematicSlideshowBg from "../components/CinematicSlideshowBg";
import { api } from "../lib/api";
import { useAuth } from "../context/useAuth";

export default function Dashboard() {
  const [documents, setDocuments] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const { user, isOwner, signOut } = useAuth();
  const navigate = useNavigate();

  const loadDocuments = useCallback(() => {
    api
      .listDocuments()
      .then((res) => {
        const docs = res.documents || res || [];
        setDocuments(docs);
        setLoadError("");
      })
      .catch((err) => setLoadError(err.message));
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleUpload = async (file) => {
    setUploading(true);
    try {
      const res = await api.upload(file);
      const doc = res.document || res;
      setDocuments((docs) => [...docs, doc]);
      setActiveId(doc.id);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteDocument(id);
      setDocuments((docs) => docs.filter((d) => d.id !== id));
      if (activeId === id) setActiveId(null);
    } catch (err) {
      setLoadError(err.message);
    }
  };

  const activeDoc = documents.find((d) => d.id === activeId) || null;

  return (
    <div className="h-dvh flex flex-col bg-ink-950 relative overflow-hidden select-none">
      {/* Cinematic Slideshow Background & Royal Particle Engine */}
      <CinematicSlideshowBg opacity="opacity-65" brightness="brightness-[0.58]" />

      {/* Header with Royal Glassmorphism */}
      <header className="h-14 shrink-0 border-b border-amber-400/20 px-5 flex items-center justify-between bg-ink-950/70 backdrop-blur-xl z-20 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
        <Link to="/" className="flex items-center gap-2.5 group">
          <img
            src="/doxora-logo.png"
            alt="DOXORA Logo"
            className="h-7 w-auto object-contain mix-blend-screen group-hover:scale-105 transition-transform filter drop-shadow-[0_0_12px_rgba(230,184,59,0.5)]"
          />
          <div className="flex items-center gap-2">
            <span className="font-display font-extrabold text-gold-royal text-base tracking-[0.15em]">
              DOXORA
            </span>
            <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-amber-400/15 border border-amber-400/30 text-[10px] font-semibold text-amber-300 tracking-wider uppercase">
              STUDIO
            </span>
          </div>
        </Link>
        <div className="flex items-center gap-4">
          {isOwner && (
            <Link
              to="/analytics"
              className="text-xs text-amber-300 hover:text-amber-200 transition-colors hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-lg border border-amber-400/40 bg-amber-500/15 hover:border-amber-400/70 shadow-[0_0_12px_rgba(247,210,104,0.2)] animate-pulse"
              title="Only visible to website owner"
            >
              <Crown size={13} className="text-amber-400" />
              <span>Owner DB</span>
            </Link>
          )}
          <span className="text-xs text-ink-300 hidden md:inline">{user?.email}</span>
          <Link
            to="/"
            className="text-ink-400 hover:text-amber-300 transition-colors"
            aria-label="Home"
          >
            <Home size={16} />
          </Link>
          <button
            onClick={async () => {
              await signOut();
              navigate("/");
            }}
            className="text-ink-400 hover:text-red-400 transition-colors cursor-pointer"
            aria-label="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {loadError && (
        <div className="bg-red-500/15 border-b border-red-400/30 text-red-200 text-xs text-center py-2 px-4 z-20 backdrop-blur-md">
          {loadError}
        </div>
      )}

      {/* Main Workspace with Glassmorphic Panels */}
      <div className="flex-1 flex min-h-0 flex-col md:flex-row z-10">
        <DocumentSidebar
          documents={documents}
          activeId={activeId}
          onSelect={setActiveId}
          onUpload={handleUpload}
          onDelete={handleDelete}
          uploading={uploading}
        />
        <ChatPanel document={activeDoc} />
      </div>
    </div>
  );
}
