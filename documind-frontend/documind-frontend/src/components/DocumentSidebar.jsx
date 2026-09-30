import { useRef, useState } from "react";
import { FileText, Upload, Trash2, Loader2, FileUp, Crown } from "lucide-react";

export default function DocumentSidebar({
  documents,
  activeId,
  onSelect,
  onUpload,
  onDelete,
  uploading,
}) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = (files) => {
    if (files && files[0]) onUpload(files[0]);
  };

  return (
    <aside className="w-full md:w-80 shrink-0 border-r border-amber-400/20 bg-ink-950/60 backdrop-blur-xl flex flex-col h-full z-10">
      {/* Upload Zone */}
      <div className="p-4 border-b border-amber-400/20">
        <input
          ref={inputRef}
          type="file"
          hidden
          onChange={(e) => handleFiles(e.target.files)}
        />
        <button
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFiles(e.dataTransfer.files);
          }}
          disabled={uploading}
          className={`relative overflow-hidden w-full rounded-2xl border-2 border-dashed px-4 py-6 flex flex-col items-center gap-2 text-xs cursor-pointer transition-all duration-300 ${
            dragOver
              ? "border-amber-400 bg-amber-500/20 scale-[1.02] shadow-[0_0_25px_rgba(247,210,104,0.3)]"
              : "border-amber-400/30 bg-ink-900/60 hover:border-amber-400/60 hover:bg-amber-500/10 shadow-sm"
          }`}
        >
          {dragOver && (
            <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent animate-pulse" />
          )}
          {uploading ? (
            <Loader2 size={24} className="animate-spin text-amber-400" />
          ) : (
            <Upload size={24} className={`text-amber-400 transition-transform duration-300 ${dragOver ? "scale-125" : ""}`} />
          )}
          <span className="text-amber-200 font-semibold tracking-wide">
            {uploading ? "Parsing any format…" : "Upload Any File"}
          </span>
          <span className="text-ink-400 text-[11px] text-center">
            All Formats Supported (PDF, Office, Sheets, Slides, CSV, Code, Text)
          </span>
        </button>
      </div>

      {/* Document Items List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        <div className="flex items-center justify-between px-2 py-1 mb-1">
          <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
            Document Library
          </span>
          <span className="text-[10px] text-ink-400 font-mono">
            {documents.length} {documents.length === 1 ? "file" : "files"}
          </span>
        </div>

        {documents.length === 0 ? (
          <div className="px-3 py-10 text-center text-xs text-ink-400 flex flex-col items-center gap-2 animate-fade-in-up">
            <FileUp size={22} className="text-amber-400/40 animate-bounce" />
            <p className="text-ink-300 font-medium">No documents yet</p>
            <p className="text-[11px] text-ink-400">Upload your first document above</p>
          </div>
        ) : (
          <ul className="space-y-1.5">
            {documents.map((doc, idx) => (
              <li key={doc.id} className="animate-fade-in-up" style={{ animationDelay: `${idx * 0.04}s` }}>
                <button
                  onClick={() => onSelect(doc.id)}
                  className={`group w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs cursor-pointer transition-all duration-200 ${
                    activeId === doc.id
                      ? "bg-amber-400/15 text-amber-200 border border-amber-400/50 shadow-[0_0_20px_rgba(247,210,104,0.15)]"
                      : "text-ink-200 hover:bg-white/5 border border-white/5 hover:border-amber-400/20"
                  }`}
                >
                  <FileText
                    size={15}
                    className={`shrink-0 transition-colors ${
                      activeId === doc.id ? "text-amber-400" : "text-ink-400 group-hover:text-amber-300"
                    }`}
                  />
                  <span className="flex-1 truncate font-medium">{doc.filename || doc.name}</span>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(doc.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 text-ink-400 hover:text-red-400 transition-all hover:scale-110"
                    aria-label={`Delete ${doc.filename || doc.name}`}
                  >
                    <Trash2 size={13} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
