import { useEffect, useRef, useState } from "react";
import {
  Send,
  Sparkles,
  Loader2,
  FileText,
  Crown,
  Zap,
  Copy,
  Check,
  RotateCcw,
  BarChart2,
  Target,
  ShieldAlert,
  Bot,
  Mic,
  MicOff,
  Languages,
  Globe,
  ChevronDown,
  Download,
  Presentation,
  Code2,
  CheckCircle2,
  ArrowRight,
  Terminal,
} from "lucide-react";
import { api } from "../lib/api";
import MicDiagnosticModal from "./MicDiagnosticModal";

const CATEGORY_COLORS = {
  Overview: "bg-amber-400/15 text-amber-300 border-amber-400/30 hover:bg-amber-400/25",
  "Key Data": "bg-emerald-400/15 text-emerald-300 border-emerald-400/30 hover:bg-emerald-400/25",
  "Deep Dive": "bg-cyan-400/15 text-cyan-300 border-cyan-400/30 hover:bg-cyan-400/25",
  "Action Items": "bg-purple-400/15 text-purple-300 border-purple-400/30 hover:bg-purple-400/25",
  Analysis: "bg-rose-400/15 text-rose-300 border-rose-400/30 hover:bg-rose-400/25",
};

const SUPPORTED_TRANSLATION_LANGUAGES = [
  { code: "Tamil", label: "🇮🇳 Tamil (தமிழ்)", native: "தமிழ்" },
  { code: "Hindi", label: "🇮🇳 Hindi (हिंदी)", native: "हिंदी" },
  { code: "Spanish", label: "🇪🇸 Spanish (Español)", native: "Español" },
  { code: "French", label: "🇫🇷 French (Français)", native: "Français" },
  { code: "German", label: "🇩🇪 German (Deutsch)", native: "Deutsch" },
  { code: "Japanese", label: "🇯🇵 Japanese (日本語)", native: "日本語" },
  { code: "Telugu", label: "🇮🇳 Telugu (తెలుగు)", native: "తెలుగు" },
  { code: "Malayalam", label: "🇮🇳 Malayalam (மலയാളம்)", native: "മലയാളം" },
  { code: "Arabic", label: "🇸🇦 Arabic (العربية)", native: "العربية" },
];

const MIC_LANG_KEY = "doxora_mic_lang";

/**
 * Subcomponent to render individual code blocks with language badges and copy button
 */
function CodeBlock({ language, code }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const displayLang = (language || "code").toUpperCase();

  return (
    <div className="my-3 rounded-xl overflow-hidden border border-amber-400/25 bg-[#0b0f19] shadow-md font-mono text-xs">
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-ink-900/95 border-b border-white/10 text-[11px]">
        <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
          <Terminal size={12} />
          <span>{displayLang}</span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/5 hover:bg-white/15 text-ink-300 hover:text-white transition cursor-pointer text-[10px]"
        >
          {copied ? (
            <>
              <Check size={11} className="text-emerald-400" />
              <span className="text-emerald-400 font-bold">Copied!</span>
            </>
          ) : (
            <>
              <Copy size={11} />
              <span>Copy Code</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3.5 overflow-x-auto text-amber-100/90 leading-relaxed scrollbar-thin">
        <code>{code}</code>
      </pre>
    </div>
  );
}

/**
 * Rich message parser: handles code fences, slides, and extracts interactive next action chips
 */
function FormattedMessageContent({ content, onExecuteAction, onDownloadPptx }) {
  if (!content) return null;

  // 1. Extract suggested actions tag: [ACTIONS: "...", "..."]
  let cleanContent = content;
  let actions = [];
  const actionMatch = content.match(/\[ACTIONS:\s*(.+?)\]/s);
  if (actionMatch) {
    try {
      const rawActions = actionMatch[1];
      const items = rawActions.match(/"([^"]+)"|'([^']+)'/g);
      if (items) {
        actions = items.map((s) => s.replace(/^["']|["']$/g, "").trim());
      }
    } catch {}
    cleanContent = content.replace(/\[ACTIONS:\s*.+?\]/s, "").trim();
  }

  // Check if message is a slide deck presentation
  const isPresentation =
    cleanContent.includes("Slide 1:") ||
    cleanContent.includes("# Slide 1") ||
    cleanContent.includes("Slide 2:") ||
    cleanContent.includes("• Executive Strategic Presentation");

  // 2. Parse code blocks
  const parts = [];
  const codeRegex = /```([a-zA-Z0-9_\-\+]*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeRegex.exec(cleanContent)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", content: cleanContent.slice(lastIndex, match.index) });
    }
    parts.push({
      type: "code",
      language: match[1] || "text",
      code: match[2].trim(),
    });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < cleanContent.length) {
    parts.push({ type: "text", content: cleanContent.slice(lastIndex) });
  }

  return (
    <div className="space-y-2">
      {/* Presentation Header Banner if it's a slide deck */}
      {isPresentation && (
        <div className="flex items-center justify-between p-2.5 mb-2 rounded-xl bg-gradient-to-r from-amber-500/20 via-amber-400/10 to-transparent border border-amber-400/30">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
            <Presentation size={16} className="text-amber-400 animate-pulse" />
            <span>PowerPoint Slide Deck Ready</span>
          </div>
          <button
            type="button"
            onClick={() => onDownloadPptx(cleanContent)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-400 text-ink-950 text-xs font-bold hover:brightness-110 shadow-sm cursor-pointer transition"
          >
            <Download size={12} />
            <span>Download .pptx</span>
          </button>
        </div>
      )}

      {/* Main Content Segments */}
      {parts.map((p, idx) => {
        if (p.type === "code") {
          return <CodeBlock key={idx} language={p.language} code={p.code} />;
        }

        // Render formatted text
        const lines = p.content.split("\n");
        return (
          <div key={idx} className="space-y-1.5 text-xs sm:text-sm leading-relaxed">
            {lines.map((line, lineIdx) => {
              const trimmed = line.trim();
              if (!trimmed) return <div key={lineIdx} className="h-1.5" />;

              // Slide Heading Card
              if (
                trimmed.startsWith("# Slide ") ||
                trimmed.startsWith("## Slide ") ||
                trimmed.match(/^Slide \d+:/i)
              ) {
                return (
                  <div
                    key={lineIdx}
                    className="mt-3 mb-1.5 pt-2 border-t border-amber-400/20 flex items-center gap-2"
                  >
                    <span className="px-2 py-0.5 rounded-md bg-amber-400 text-ink-950 font-mono font-bold text-[10px] tracking-wide">
                      SLIDE
                    </span>
                    <h4 className="font-display font-bold text-amber-200 text-sm">
                      {trimmed.replace(/^[#\s]+/, "")}
                    </h4>
                  </div>
                );
              }

              // Standard Markdown Headings
              if (trimmed.startsWith("### ")) {
                return (
                  <h4 key={lineIdx} className="font-bold text-amber-300 text-sm mt-2 mb-1">
                    {trimmed.replace(/^###\s+/, "")}
                  </h4>
                );
              }
              if (trimmed.startsWith("## ")) {
                return (
                  <h3 key={lineIdx} className="font-display font-bold text-gold-royal text-base mt-2.5 mb-1">
                    {trimmed.replace(/^##\s+/, "")}
                  </h3>
                );
              }
              if (trimmed.startsWith("# ")) {
                return (
                  <h2 key={lineIdx} className="font-display font-bold text-white text-base mt-3 mb-1.5">
                    {trimmed.replace(/^#\s+/, "")}
                  </h2>
                );
              }

              // Bullet points
              if (trimmed.startsWith("• ") || trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
                return (
                  <div key={lineIdx} className="flex items-start gap-2 pl-1.5 text-ink-100">
                    <span className="text-amber-400 text-xs mt-0.5">•</span>
                    <span>{trimmed.replace(/^[\•\-\*]\s*/, "")}</span>
                  </div>
                );
              }

              // Plain paragraph
              return (
                <p key={lineIdx} className="text-ink-100">
                  {line}
                </p>
              );
            })}
          </div>
        );
      })}

      {/* ── Interactive Next Step Action Chips ("Tap Yes") ──────────────── */}
      {actions.length > 0 && (
        <div className="mt-4 pt-3 border-t border-white/10 space-y-2">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-400 tracking-wide uppercase">
            <Sparkles size={12} className="animate-spin" />
            <span>Recommended Next Actions (Tap to execute)</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap pt-0.5">
            {actions.map((act, actIdx) => {
              const isYes = act.toLowerCase().startsWith("yes") || act.toLowerCase().startsWith("ஆம்");
              return (
                <button
                  key={actIdx}
                  type="button"
                  onClick={() => onExecuteAction(act)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all duration-200 shadow-sm hover:scale-102 active:scale-98 ${
                    isYes
                      ? "bg-gradient-to-r from-amber-400 to-amber-500 text-ink-950 font-bold border border-amber-300 shadow-[0_0_15px_rgba(247,210,104,0.3)] hover:brightness-110"
                      : "bg-ink-900/90 border border-amber-400/30 text-amber-200 hover:bg-amber-400/20 hover:text-white"
                  }`}
                >
                  {isYes ? <CheckCircle2 size={13} className="text-ink-950" /> : <ArrowRight size={12} />}
                  <span>{act}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ChatPanel({ document }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All");

  // Translation states
  const [translatingIndex, setTranslatingIndex] = useState(null);
  const [openTranslateMenuIndex, setOpenTranslateMenuIndex] = useState(null);
  const [translatingDoc, setTranslatingDoc] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);

  // Speech recognition (Microphone Only)
  const [micLang, setMicLang] = useState(() => {
    return typeof window !== "undefined" ? localStorage.getItem(MIC_LANG_KEY) || "en-US" : "en-US";
  });
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState("");
  const [showMicDiagnostic, setShowMicDiagnostic] = useState(false);

  const recognitionRef = useRef(null);
  const shouldListenRef = useRef(false);
  const voiceTranscriptRef = useRef("");
  const executeCommandRef = useRef(null);
  const scrollRef = useRef(null);

  // Handle Mic Language toggle
  const handleMicLangChange = (langCode) => {
    setMicLang(langCode);
    if (typeof window !== "undefined") localStorage.setItem(MIC_LANG_KEY, langCode);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.lang = langCode;
      } catch {}
    }
  };

  const toggleMicLang = () => {
    const next = micLang === "ta-IN" ? "en-US" : "ta-IN";
    handleMicLangChange(next);
  };

  // Robust, rock-solid Microphone control (Speech-to-Text ONLY)
  const stopMicrophone = () => {
    shouldListenRef.current = false;
    setIsListening(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
  };

  const toggleVoiceTyping = async () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setShowMicDiagnostic(true);
      return;
    }

    if (isListening) {
      // User tapped mic to stop
      stopMicrophone();
      const spokenText = voiceTranscriptRef.current?.trim() || input.trim();
      voiceTranscriptRef.current = "";
      if (spokenText && executeCommandRef.current) {
        executeCommandRef.current(spokenText);
      }
      return;
    }

    setSpeechError("");
    voiceTranscriptRef.current = "";
    shouldListenRef.current = true;

    // Clean previous session if any
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = micLang || "en-US";

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechError("");
      };

      recognition.onresult = (event) => {
        let fullTranscript = "";
        for (let i = 0; i < event.results.length; i++) {
          fullTranscript += event.results[i][0].transcript;
        }
        if (fullTranscript) {
          voiceTranscriptRef.current = fullTranscript;
          setInput(fullTranscript);
        }
      };

      recognition.onerror = (event) => {
        console.warn("Speech recognition notice:", event.error);
        if (event.error === "no-speech") {
          // Do not terminate listening on brief pause while user thinks
          return;
        }
        if (event.error === "not-allowed") {
          setSpeechError("Microphone access blocked. Click the lock icon in your URL bar or use 'Test Mic'.");
          stopMicrophone();
          setShowMicDiagnostic(true);
          return;
        }
        if (event.error !== "aborted") {
          setSpeechError(`Microphone notice: ${event.error}`);
          stopMicrophone();
        }
      };

      recognition.onend = () => {
        // If user is still meant to be listening (e.g. Chrome 10-second pause), restart cleanly
        if (shouldListenRef.current) {
          try {
            recognition.start();
          } catch {
            setIsListening(false);
          }
        } else {
          setIsListening(false);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn("Could not start recognition:", err);
      setSpeechError("Could not start microphone. Click 'Test Mic' to diagnose.");
      setIsListening(false);
      shouldListenRef.current = false;
    }
  };

  useEffect(() => {
    return () => {
      stopMicrophone();
    };
  }, []);

  // Load chat history & questions
  useEffect(() => {
    let cancelled = false;
    const docId = document?.id || "general";
    setLoadingHistory(true);

    api
      .chatHistory(docId)
      .then((history) => {
        if (!cancelled) {
          const nextMessages = Array.isArray(history)
            ? history
            : Array.isArray(history?.messages)
            ? history.messages
            : Array.isArray(history?.history)
            ? history.history
            : [];
          setMessages(nextMessages);
        }
      })
      .catch(() => {
        if (!cancelled) setMessages([]);
      })
      .finally(() => !cancelled && setLoadingHistory(false));

    if (document) {
      if (document.suggested_questions && Array.isArray(document.suggested_questions) && document.suggested_questions.length > 0) {
        setSuggestedQuestions(document.suggested_questions);
      } else {
        setLoadingQuestions(true);
        api
          .getSuggestedQuestions(document.id)
          .then((res) => {
            if (!cancelled && res?.questions) {
              setSuggestedQuestions(res.questions);
            }
          })
          .catch((err) => console.warn("Failed to load questions:", err))
          .finally(() => !cancelled && setLoadingQuestions(false));
      }
    } else {
      setSuggestedQuestions([]);
    }

    return () => {
      cancelled = true;
      stopMicrophone();
    };
  }, [document]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  const copyToClipboard = (text, index) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    }
  };

  // Download PPTX
  const handleDownloadPptx = async (content, title = "Presentation") => {
    try {
      const res = await api.generatePptx(content, title);
      if (res?.download_url) {
        window.open(res.download_url, "_blank");
      }
    } catch (err) {
      alert(`Could not download PowerPoint: ${err.message}`);
    }
  };

  // Main Command / Question Execution
  const executeCommand = async (commandText) => {
    if (!commandText || !commandText.trim() || sending) return;
    const question = commandText.trim();
    stopMicrophone();
    setInput("");
    voiceTranscriptRef.current = "";

    setMessages((m) => [...m, { role: "user", content: question }]);
    setSending(true);

    const docId = document?.id || "general";
    try {
      const res = await api.chat(docId, question);
      const answer = res.answer || res.response || res.message || "";
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: answer,
          download_url: res.download_url,
          format: res.format,
        },
      ]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: `⚠️ ${err.message}`, error: true },
      ]);
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    executeCommandRef.current = executeCommand;
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    executeCommand(input);
  };

  // Translate specific message into target language
  const handleTranslateMessage = async (messageContent, msgIndex, targetLang = "Tamil") => {
    setTranslatingIndex(msgIndex);
    setOpenTranslateMenuIndex(null);

    const docId = document?.id || "general";
    try {
      const prompt = `Translate the following text accurately and naturally into ${targetLang} (தமிழ் if Tamil). Provide only the translated output:\n\n${messageContent}`;
      const res = await api.chat(docId, prompt);
      const translatedAnswer = res.answer || res.response || res.message || "";

      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: `🌐 **Translated to ${targetLang} (${targetLang === "Tamil" ? "தமிழ்" : targetLang}):**\n\n${translatedAnswer}`,
          translated: true,
          targetLang,
        },
      ]);
    } catch (err) {
      alert(`Translation to ${targetLang} failed: ${err.message}`);
    } finally {
      setTranslatingIndex(null);
    }
  };

  // Translate Entire Document into Tamil
  const handleTranslateEntireDocument = async (targetLang = "Tamil") => {
    if (!document || sending) return;
    setTranslatingDoc(true);
    setSending(true);

    try {
      const res = await api.translate(document.id, targetLang);
      const translated = res.translated_text || "";
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: `🌐 **${document.filename || "Document"} — Full ${targetLang} Translation (முழு மொழியாக்கம்):**\n\n${translated}`,
          translated: true,
          targetLang,
        },
      ]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: `⚠️ Document translation failed: ${err.message}`,
          error: true,
        },
      ]);
    } finally {
      setSending(false);
      setTranslatingDoc(false);
    }
  };

  const isTamilDoc = Boolean(
    (document?.filename && /[\u0B80-\u0BFF]/.test(document.filename)) ||
    (suggestedQuestions && suggestedQuestions.some((q) => /[\u0B80-\u0BFF]/.test(q.question || "")))
  );

  const categories = ["All", ...new Set(suggestedQuestions.map((q) => q.category).filter(Boolean))];
  const filteredQuestions =
    activeCategory === "All"
      ? suggestedQuestions
      : suggestedQuestions.filter((q) => q.category === activeCategory);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-ink-950/40 backdrop-blur-md relative">
      {/* ── Active Header Bar ─────────────────────────────────────────── */}
      <div className="border-b border-amber-400/20 px-5 py-3 flex items-center justify-between bg-ink-950/80 backdrop-blur-xl z-10 shadow-sm">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-300 shadow-[0_0_10px_rgba(247,210,104,0.15)]">
            {document ? <FileText size={16} /> : <Sparkles size={16} className="text-amber-400" />}
          </div>
          <div className="min-w-0">
            <h2 className="font-display font-semibold text-white text-sm truncate tracking-wide flex items-center gap-2">
              <span>{document ? document.filename || document.name : "Doxora AI Studio (General Intelligence)"}</span>
            </h2>
            <div className="flex items-center gap-2 text-[10px] text-amber-400/80 font-mono">
              <span>
                {document
                  ? document.word_count
                    ? `${document.word_count.toLocaleString()} words`
                    : "Document Context Active"
                  : "PPT Generation • Multi-Language Code • Voice Mic"}
              </span>
              {document?.page_count && <span>· {document.page_count} pages</span>}
              {isTamilDoc && (
                <span className="text-amber-300 bg-amber-400/15 px-1.5 py-0.2 rounded border border-amber-400/30 font-bold">
                  தமிழ் PDF
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-2">
          {document && (
            <button
              onClick={() => handleTranslateEntireDocument(isTamilDoc ? "English" : "Tamil")}
              disabled={sending || translatingDoc}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-400/30 bg-amber-500/10 hover:bg-amber-400/25 text-amber-300 text-[11px] font-semibold transition-all cursor-pointer shadow-sm hover:scale-102"
              title={isTamilDoc ? "Translate Tamil document into English" : "Translate document into pure Tamil (தமிழில் மொழியாக்கம்)"}
            >
              {translatingDoc ? <Loader2 size={12} className="animate-spin" /> : <Globe size={13} className="text-amber-400" />}
              <span>{isTamilDoc ? "English Translation" : "தமிழ் (Tamil)"}</span>
            </button>
          )}

          {/* Test & Calibrate Mic Button */}
          <button
            type="button"
            onClick={() => setShowMicDiagnostic(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-400/30 bg-ink-900/80 hover:bg-amber-400/15 text-amber-300 text-[11px] font-semibold transition-all cursor-pointer shadow-sm"
            title="Test and diagnose microphone permissions"
          >
            <Mic size={13} className="text-amber-400" />
            <span className="hidden sm:inline">Test Mic</span>
          </button>

          <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-400/10 border border-amber-400/25 text-[10px] font-medium text-amber-300">
            <Zap size={11} className="text-amber-400" /> Neural Studio
          </span>
        </div>
      </div>

      {/* ── Document Suggested Questions Carousel (if document active) ── */}
      {suggestedQuestions.length > 0 && (
        <div className="bg-ink-950/70 border-b border-amber-400/15 px-5 py-3 space-y-2 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-amber-400 animate-pulse" />
              <span className="text-xs font-semibold text-gold-royal tracking-wide uppercase">
                {isTamilDoc ? "ஆவணத்திற்கான பரிந்துரைக்கப்பட்ட கேள்விகள்" : "Recommended Questions For Your Document"}
              </span>
              <span className="text-[10px] px-2 py-0.2 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 font-mono">
                {filteredQuestions.length}
              </span>
            </div>

            {categories.length > 2 && (
              <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                      activeCategory === cat
                        ? "bg-amber-400 text-ink-950 font-bold shadow-sm"
                        : "text-ink-400 hover:text-ink-200 hover:bg-white/5"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-1 max-h-36 overflow-y-auto pr-1">
            {filteredQuestions.map((q, idx) => {
              const catClass = CATEGORY_COLORS[q.category] || "bg-ink-900/80 text-ink-200 border-white/10 hover:border-amber-400/40";
              return (
                <button
                  key={idx}
                  onClick={() => executeCommand(q.command || q.question)}
                  disabled={sending}
                  className={`group flex items-start gap-2.5 p-2.5 rounded-xl border text-left text-xs transition-all duration-200 cursor-pointer hover:scale-[1.01] hover:shadow-[0_4px_16px_rgba(247,210,104,0.15)] disabled:opacity-50 disabled:cursor-not-allowed ${catClass}`}
                >
                  <div className="p-1 rounded-lg bg-black/40 border border-white/10 shrink-0 group-hover:border-amber-400/50 group-hover:scale-110 transition-all text-amber-400 mt-0.5">
                    {q.category === "Key Data" || q.category === "முக்கிய தரவு" ? (
                      <BarChart2 size={12} />
                    ) : q.category === "Action Items" || q.category === "அடுத்தகட்ட நடவடிக்கை" ? (
                      <Target size={12} />
                    ) : (
                      <Zap size={12} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="text-[9px] uppercase font-bold tracking-wider opacity-80">
                        {q.category || (isTamilDoc ? "கேள்வி" : "Question")}
                      </span>
                    </div>
                    <p className="line-clamp-2 text-xs font-medium leading-snug group-hover:text-white transition-colors">
                      {q.question}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Messages Scroll Viewport ──────────────────────────────────── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-6 space-y-5">
        {loadingHistory ? (
          <div className="flex justify-center items-center py-16 flex-col gap-2">
            <Loader2 className="animate-spin text-amber-400" size={28} />
            <span className="text-xs text-ink-300">Loading conversation history…</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-xs text-ink-300 pt-8 max-w-xl mx-auto animate-fade-in-up">
            <div className="relative inline-block mb-3">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-amber-300/10 border border-amber-400/30 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(247,210,104,0.2)]">
                <Sparkles size={22} className="text-amber-400 animate-pulse" />
              </div>
            </div>
            <h4 className="font-display font-bold text-white text-base mb-1">
              {document
                ? isTamilDoc
                  ? "இந்த ஆவணத்தைப் பற்றி நீங்கள் என்ன தெரிந்து கொள்ள விரும்புகிறீர்கள்?"
                  : "What would you like to know from this document?"
                : "Welcome to Doxora AI Studio"}
            </h4>
            <p className="text-xs text-ink-300 mb-5 leading-relaxed">
              {document
                ? "Ask anything about this document, generate presentations, or write multi-language code."
                : "Generate PPT presentations, code for all programming languages, and chat in English or தமிழ்."}
            </p>

            {/* Quick Starter Chips */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
              <button
                type="button"
                onClick={() => executeCommand("Generate a complete 8-slide PPT presentation on Artificial Intelligence & Modern System Design")}
                className="p-3 rounded-xl bg-ink-900/80 border border-amber-400/25 hover:border-amber-400 text-ink-200 hover:text-white transition-all cursor-pointer flex items-center gap-2 group"
              >
                <Presentation size={16} className="text-amber-400 shrink-0 group-hover:scale-110 transition-transform" />
                <div className="min-w-0">
                  <div className="font-bold text-xs text-amber-300">Generate PPT Presentation</div>
                  <div className="text-[10px] text-ink-400 truncate">8-slide deck with direct .pptx download</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => executeCommand("Give me code for all programming languages for Binary Search with time complexity")}
                className="p-3 rounded-xl bg-ink-900/80 border border-amber-400/25 hover:border-amber-400 text-ink-200 hover:text-white transition-all cursor-pointer flex items-center gap-2 group"
              >
                <Code2 size={16} className="text-emerald-400 shrink-0 group-hover:scale-110 transition-transform" />
                <div className="min-w-0">
                  <div className="font-bold text-xs text-emerald-300">Code for All Programming Languages</div>
                  <div className="text-[10px] text-ink-400 truncate">Python, JavaScript, Java, C++, Go, Rust</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => executeCommand("Write a production-ready Python script to parse and extract data from documents")}
                className="p-3 rounded-xl bg-ink-900/80 border border-amber-400/25 hover:border-amber-400 text-ink-200 hover:text-white transition-all cursor-pointer flex items-center gap-2 group"
              >
                <Terminal size={16} className="text-cyan-400 shrink-0 group-hover:scale-110 transition-transform" />
                <div className="min-w-0">
                  <div className="font-bold text-xs text-cyan-300">Automated Python Script</div>
                  <div className="text-[10px] text-ink-400 truncate">High-speed file parsing and data extraction</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => executeCommand("வணக்கம்! இந்த அமைப்பின் சிறப்பம்சங்களை தமிழில் விளக்குங்கள்")}
                className="p-3 rounded-xl bg-ink-900/80 border border-amber-400/25 hover:border-amber-400 text-ink-200 hover:text-white transition-all cursor-pointer flex items-center gap-2 group"
              >
                <Languages size={16} className="text-amber-400 shrink-0 group-hover:scale-110 transition-transform" />
                <div className="min-w-0">
                  <div className="font-bold text-xs text-amber-300">தமிழ் உரையாடல் (Tamil Chat)</div>
                  <div className="text-[10px] text-ink-400 truncate">மைக் மூலம் தமிழில் பேசி கேள்வி கேட்கலாம்</div>
                </div>
              </button>
            </div>
          </div>
        ) : (
          messages.map((m, i) => {
            const isCopiedThis = copiedIndex === i;
            const isTranslatingThis = translatingIndex === i;
            const isMenuOpen = openTranslateMenuIndex === i;

            return (
              <div
                id={`chat-msg-${i}`}
                key={i}
                className={`flex flex-col animate-fade-in-up ${m.role === "user" ? "items-end" : "items-start"}`}
              >
                {/* Role Header */}
                <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-ink-400">
                  {m.role === "user" ? (
                    <span className="font-semibold text-amber-400">Your Command</span>
                  ) : (
                    <>
                      <Bot size={13} className="text-amber-400" />
                      <span className="font-semibold text-gold-royal">
                        {m.translated ? `Doxora AI (${m.targetLang})` : "Doxora AI"}
                      </span>
                    </>
                  )}
                </div>

                {/* Message Bubble */}
                <div
                  className={`group relative max-w-[90%] sm:max-w-[85%] rounded-2xl px-4 py-3.5 text-xs sm:text-sm leading-relaxed shadow-lg transition-all ${
                    m.role === "user"
                      ? "bg-gradient-to-r from-amber-500 to-amber-600 text-ink-950 font-medium rounded-tr-xs shadow-[0_4px_20px_rgba(247,210,104,0.25)] border border-amber-300/40"
                      : m.error
                      ? "bg-red-500/15 border border-red-400/30 text-red-200 rounded-tl-xs backdrop-blur-xl"
                      : "bg-ink-900/90 border border-amber-400/25 text-ink-100 rounded-tl-xs backdrop-blur-xl shadow-[0_4px_25px_rgba(0,0,0,0.5)]"
                  }`}
                >
                  {m.role === "user" ? (
                    <div className="whitespace-pre-wrap">{m.content}</div>
                  ) : (
                    <FormattedMessageContent
                      content={m.content}
                      onExecuteAction={executeCommand}
                      onDownloadPptx={(content) => handleDownloadPptx(content, "Presentation")}
                    />
                  )}

                  {/* Direct Download Button from Backend if generated */}
                  {m.download_url && (
                    <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-amber-300 font-semibold">
                        <Presentation size={14} className="text-amber-400" />
                        <span>Presentation Ready (.pptx)</span>
                      </div>
                      <a
                        href={m.download_url}
                        download
                        className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-400 text-ink-950 font-bold text-xs hover:brightness-110 transition shadow-sm"
                      >
                        <Download size={13} />
                        <span>Download Presentation</span>
                      </a>
                    </div>
                  )}

                  {/* Action Bar (Translate & Copy - NO Read Aloud) */}
                  <div
                    className={`mt-2.5 pt-2 border-t flex items-center justify-between gap-3 text-[11px] relative ${
                      m.role === "user" ? "border-ink-950/20 text-ink-900" : "border-white/10 text-ink-300"
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Translate Option (Assistant Messages only) */}
                      {m.role === "assistant" && !m.error && (
                        <div className="relative">
                          <button
                            onClick={() => setOpenTranslateMenuIndex(isMenuOpen ? null : i)}
                            disabled={isTranslatingThis}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                              isMenuOpen
                                ? "bg-amber-400 text-ink-950 border-amber-300 font-bold"
                                : "border-white/10 hover:border-amber-400/40 text-ink-300 hover:text-amber-300 hover:bg-white/5"
                            }`}
                            title="Translate this response into Tamil or other languages"
                          >
                            {isTranslatingThis ? (
                              <Loader2 size={12} className="animate-spin text-amber-400" />
                            ) : (
                              <Globe size={12} className={isMenuOpen ? "text-ink-950" : "text-amber-400"} />
                            )}
                            <span>{isTranslatingThis ? "Translating…" : "Translate"}</span>
                            <ChevronDown size={10} />
                          </button>

                          {isMenuOpen && (
                            <div className="absolute left-0 bottom-full mb-1 w-48 rounded-xl bg-ink-950 border border-amber-400/40 p-1.5 shadow-[0_10px_25px_rgba(0,0,0,0.8)] z-40 backdrop-blur-xl animate-fade-in-up">
                              <div className="px-2 py-1 text-[10px] font-bold text-gold-royal uppercase tracking-wider border-b border-white/10 mb-1">
                                Select Language
                              </div>
                              <div className="max-h-48 overflow-y-auto space-y-0.5">
                                {SUPPORTED_TRANSLATION_LANGUAGES.map((lang) => (
                                  <button
                                    key={lang.code}
                                    onClick={() => handleTranslateMessage(m.content, i, lang.code)}
                                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between cursor-pointer transition-colors ${
                                      lang.code === "Tamil"
                                        ? "bg-amber-400/20 text-amber-300 font-bold hover:bg-amber-400/30"
                                        : "text-ink-300 hover:text-white hover:bg-white/10"
                                    }`}
                                  >
                                    <span>{lang.label}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Copy Message Button */}
                      <button
                        onClick={() => copyToClipboard(m.content, i)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                          m.role === "user"
                            ? "hover:bg-ink-950/15 text-ink-950 font-semibold"
                            : "hover:bg-white/10 text-ink-300 hover:text-white border border-white/10"
                        }`}
                        title="Copy message text"
                      >
                        {isCopiedThis ? (
                          <>
                            <Check size={12} className="text-emerald-400" />
                            <span className="text-emerald-400 font-semibold">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy size={11} />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* AI Typing Indicator */}
        {sending && (
          <div className="flex flex-col items-start animate-fade-in-up">
            <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-ink-400">
              <Bot size={13} className="text-amber-400 animate-spin" />
              <span className="font-semibold text-gold-royal">
                {translatingDoc ? "Translating Document into Tamil…" : "Synthesizing AI Intelligence…"}
              </span>
            </div>
            <div className="rounded-2xl rounded-tl-xs bg-ink-900/90 border border-amber-400/30 px-5 py-3.5 flex items-center gap-2 shadow-md backdrop-blur-xl">
              <span className="h-2 w-2 rounded-full bg-amber-400 typing-dot-1" />
              <span className="h-2 w-2 rounded-full bg-amber-400 typing-dot-2" />
              <span className="h-2 w-2 rounded-full bg-amber-400 typing-dot-3" />
              <span className="text-xs text-amber-300/80 font-medium ml-2 font-mono">
                {translatingDoc ? "Generating accurate Tamil translation…" : "Processing your request & preparing answer…"}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Microphone Error Notification Banner ────────────────────────── */}
      {speechError && (
        <div className="bg-red-500/20 border-t border-red-400/40 text-red-200 text-xs px-4 py-2.5 flex items-center justify-between z-10 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <ShieldAlert size={15} className="text-red-400 shrink-0" />
            <span>{speechError}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowMicDiagnostic(true)}
              className="px-2.5 py-1 rounded-lg bg-amber-400 text-ink-950 font-bold text-[11px] hover:brightness-110 cursor-pointer transition shadow-sm"
            >
              Test & Fix Mic
            </button>
            <button
              onClick={() => setSpeechError("")}
              className="text-red-300 hover:text-white cursor-pointer ml-1 p-1"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* ── Input Form Bar with Dedicated Microphone ──────────────────── */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-amber-400/20 p-3 sm:p-4 flex items-center gap-2.5 bg-ink-950/80 backdrop-blur-xl z-10 shadow-[0_-4px_20px_rgba(0,0,0,0.4)]"
      >
        <div className="relative flex-1 flex items-center">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              isListening
                ? micLang === "ta-IN"
                  ? "🎙️ தமிழில் பேசுங்கள்... உங்கள் குரல் நேரடியாக தட்டச்சு செய்யப்படுகிறது..."
                  : "🎙️ Listening... Speak now, live speech is transcribed here..."
                : micLang === "ta-IN"
                ? "தமிழில் கேளுங்கள் அல்லது மைக்ரோஃபோன் (🎙️) கிளிக் செய்து பேசுங்கள்…"
                : "Ask anything, request PPT, code in all languages, or click mic to speak…"
            }
            disabled={sending}
            className={`w-full h-11 rounded-xl bg-ink-900/95 border px-4 pr-10 text-xs text-white placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all shadow-inner ${
              isListening ? "border-red-400/60 ring-2 ring-red-400/40 placeholder:text-red-300" : "border-amber-400/25"
            }`}
          />
          {input.trim() && (
            <button
              type="button"
              onClick={() => setInput("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-white text-xs cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* Quick Mic Language Switcher Button (English / தமிழ்) */}
        <button
          type="button"
          onClick={toggleMicLang}
          disabled={sending || isListening}
          className={`h-11 px-2.5 rounded-xl border flex items-center gap-1 text-[11px] font-semibold cursor-pointer transition-all ${
            micLang === "ta-IN"
              ? "bg-amber-400/20 border-amber-400 text-amber-300 shadow-sm"
              : "bg-ink-900/90 border-amber-400/30 text-ink-300 hover:text-white hover:border-amber-400/50"
          }`}
          title={micLang === "ta-IN" ? "Microphone set to Tamil. Click to switch to English" : "Microphone set to English. Click to switch to Tamil"}
          aria-label="Toggle mic language"
        >
          <Languages size={13} className="text-amber-400" />
          <span className="font-bold">{micLang === "ta-IN" ? "🇮🇳 தமிழ்" : "🇬🇧 EN"}</span>
        </button>

        {/* ── Rock-Solid Voice Microphone Button ──────────────────────── */}
        <button
          type="button"
          onClick={toggleVoiceTyping}
          disabled={sending}
          className={`relative h-11 px-3.5 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-semibold cursor-pointer transition-all ${
            isListening
              ? "bg-red-500/30 border-red-400 text-red-200 shadow-[0_0_20px_rgba(239,68,68,0.5)] animate-pulse"
              : "bg-ink-900/90 border-amber-400/40 text-amber-300 hover:bg-amber-500/20 hover:border-amber-400 hover:scale-105 shadow-[0_0_12px_rgba(247,210,104,0.15)]"
          }`}
          title={isListening ? "Listening... Click to stop speaking and send" : `Click to speak (${micLang === "ta-IN" ? "தமிழ்" : "English"})`}
          aria-label="Voice typing"
        >
          {isListening ? (
            <>
              <span className="relative flex h-2.5 w-2.5 mr-0.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
              </span>
              <MicOff size={16} className="text-red-400" />
              <span className="hidden sm:inline text-[11px] text-red-200 font-bold">
                {micLang === "ta-IN" ? "பேசுகிறீர்கள்..." : "Stop & Send"}
              </span>
            </>
          ) : (
            <>
              <Mic size={16} className="text-amber-400" />
              <span className="hidden sm:inline text-[11px] text-amber-200">
                {micLang === "ta-IN" ? "தமிழ் Mic" : "Mic"}
              </span>
            </>
          )}
        </button>

        {/* Send Command Button */}
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="h-11 px-5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-ink-950 font-bold text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110 shadow-[0_0_20px_rgba(247,210,104,0.3)] transition hover:scale-102 active:scale-98"
          aria-label="Send message"
        >
          <span>Ask</span>
          <Send size={15} />
        </button>
      </form>

      {/* Microphone Diagnostic & Troubleshooting Modal */}
      <MicDiagnosticModal
        isOpen={showMicDiagnostic}
        onClose={() => setShowMicDiagnostic(false)}
        currentMicLang={micLang}
        onSelectLang={handleMicLangChange}
      />
    </div>
  );
}
