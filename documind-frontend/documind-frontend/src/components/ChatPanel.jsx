import { useEffect, useRef, useState, useCallback } from "react";
import {
  Send,
  Sparkles,
  Loader2,
  FileText,
  Crown,
  Zap,
  Volume2,
  VolumeX,
  Copy,
  Check,
  RotateCcw,
  BarChart2,
  Target,
  ShieldAlert,
  HelpCircle,
  Play,
  Square,
  Pause,
  Flame,
  MessageSquare,
  Bot,
  Mic,
  MicOff,
  Radio,
  Sliders,
  Headphones,
  Settings2,
  Languages,
  Globe,
  ChevronDown,
  X,
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
  { code: "Malayalam", label: "🇮🇳 Malayalam (മലയാളം)", native: "മലയാളം" },
  { code: "Arabic", label: "🇸🇦 Arabic (العربية)", native: "العربية" },
];

// Storage keys for persisting user's voice clarity preferences
const VOICE_PREF_KEY = "doxora_tts_voice_uri";
const RATE_PREF_KEY = "doxora_tts_rate";
const PITCH_PREF_KEY = "doxora_tts_pitch";
const MIC_LANG_KEY = "doxora_mic_lang";

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

  // Speech synthesis (Text-to-Speech)
  const [availableVoices, setAvailableVoices] = useState([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState(() => {
    return typeof window !== "undefined" ? localStorage.getItem(VOICE_PREF_KEY) || "" : "";
  });
  const [speechRate, setSpeechRate] = useState(() => {
    return typeof window !== "undefined" ? parseFloat(localStorage.getItem(RATE_PREF_KEY) || "1.0") : 1.0;
  });
  const [speechPitch, setSpeechPitch] = useState(() => {
    return typeof window !== "undefined" ? parseFloat(localStorage.getItem(PITCH_PREF_KEY) || "1.0") : 1.0;
  });

  const [speakingIndex, setSpeakingIndex] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const [testingVoice, setTestingVoice] = useState(false);

  // Speech recognition (Voice Typing / Mic input)
  const [micLang, setMicLang] = useState(() => {
    return typeof window !== "undefined" ? localStorage.getItem(MIC_LANG_KEY) || "en-US" : "en-US";
  });
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState("");
  const [showMicDiagnostic, setShowMicDiagnostic] = useState(false);

  const recognitionRef = useRef(null);
  const voiceTranscriptRef = useRef("");
  const isSubmittingVoiceRef = useRef(false);
  const executeCommandRef = useRef(null);
  const activeUtteranceRef = useRef(null);
  const ttsHeartbeatRef = useRef(null);

  const scrollRef = useRef(null);
  const utteranceQueueRef = useRef([]);

  // Handle Mic Language change
  const handleMicLangChange = (langCode) => {
    setMicLang(langCode);
    if (typeof window !== "undefined") localStorage.setItem(MIC_LANG_KEY, langCode);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.lang = langCode;
      } catch {}
    }
  };

  // Toggle Mic Language between English and Tamil
  const toggleMicLang = () => {
    const next = micLang === "ta-IN" ? "en-US" : "ta-IN";
    handleMicLangChange(next);
  };

  // Load and rank high-clarity natural voices (with Tamil voice detection)
  const populateVoices = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const voices = window.speechSynthesis.getVoices() || [];
    if (!voices.length) return;

    // Rank voices by clarity & neural capability
    const scoredVoices = voices.map((v) => {
      let score = 0;
      const name = v.name.toLowerCase();
      const lang = v.lang.toLowerCase();

      // Prioritize English & Tamil voices
      if (lang.startsWith("en")) score += 40;
      if (lang.startsWith("ta")) score += 55; // Prioritize Tamil voices for Tamil language
      if (lang === "en-us" || lang === "en_us") score += 15;
      if (lang === "ta-in" || lang === "ta_in") score += 20;

      // Prioritize Natural / Neural / Studio / Premium voices
      if (name.includes("natural") || name.includes("online (natural)")) score += 50;
      if (name.includes("neural") || name.includes("studio") || name.includes("premium") || name.includes("enhanced")) score += 45;
      if (name.includes("google") || name.includes("samantha") || name.includes("jenny") || name.includes("aria") || name.includes("guy") || name.includes("valluvar")) score += 30;
      if (name.includes("microsoft") || name.includes("apple") || name.includes("siri")) score += 20;

      return { voice: v, score };
    });

    scoredVoices.sort((a, b) => b.score - a.score);
    const sorted = scoredVoices.map((item) => item.voice);
    setAvailableVoices(sorted);

    setSelectedVoiceURI((current) => {
      if (current && sorted.some((v) => v.voiceURI === current)) return current;
      const best = sorted[0]?.voiceURI || "";
      if (typeof window !== "undefined" && best) {
        localStorage.setItem(VOICE_PREF_KEY, best);
      }
      return best;
    });
  }, []);

  useEffect(() => {
    populateVoices();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.onvoiceschanged = populateVoices;
    }
  }, [populateVoices]);

  // Voice Settings Handlers
  const handleVoiceChange = (uri) => {
    setSelectedVoiceURI(uri);
    if (typeof window !== "undefined") localStorage.setItem(VOICE_PREF_KEY, uri);
  };

  const handleRateChange = (r) => {
    const val = parseFloat(r);
    setSpeechRate(val);
    if (typeof window !== "undefined") localStorage.setItem(RATE_PREF_KEY, String(val));
  };

  const handlePitchChange = (p) => {
    const val = parseFloat(p);
    setSpeechPitch(val);
    if (typeof window !== "undefined") localStorage.setItem(PITCH_PREF_KEY, String(val));
  };

  // Robust Voice Microphone Toggle with Pre-flight Permission Verification
  const toggleVoiceTyping = async () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setShowMicDiagnostic(true);
      return;
    }

    if (isListening) {
      // User clicked stop on the mic: send transcribed question directly to AI search
      const recordedText = voiceTranscriptRef.current?.trim() || input.trim();
      voiceTranscriptRef.current = "";
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      setIsListening(false);
      if (recordedText && executeCommandRef.current && !isSubmittingVoiceRef.current) {
        isSubmittingVoiceRef.current = true;
        executeCommandRef.current(recordedText);
        setTimeout(() => {
          isSubmittingVoiceRef.current = false;
        }, 600);
      }
      return;
    }

    setSpeechError("");
    voiceTranscriptRef.current = "";
    setInput("");
    stopSpeech();

    // Step 1: Pre-flight check with getUserMedia to prompt browser permissions if not yet granted
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Immediately release tracks so SpeechRecognition has exclusive audio hardware access
        stream.getTracks().forEach((track) => track.stop());
      } catch (mediaErr) {
        console.warn("Pre-flight mic permission notice:", mediaErr);
        if (mediaErr.name === "NotAllowedError" || mediaErr.name === "PermissionDeniedError") {
          setSpeechError("Microphone permission blocked. Click the lock/site settings icon in your URL bar to allow microphone access, or open 'Test Mic'.");
          setShowMicDiagnostic(true);
          return;
        } else if (mediaErr.name === "NotFoundError" || mediaErr.name === "DevicesNotFoundError") {
          setSpeechError("No microphone hardware detected. Please connect a microphone or headset.");
          return;
        } else if (mediaErr.name === "NotReadableError") {
          setSpeechError("Microphone is currently in use by another application. Please close other voice apps.");
          return;
        }
      }
    }

    // Step 2: Cleanly abort any existing recognition session
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
        if (event.error === "not-allowed") {
          setSpeechError("Microphone access blocked. Click the lock icon 🔒 in your browser address bar to Allow, or use 'Test Mic'.");
          setIsListening(false);
        } else if (event.error === "audio-capture") {
          setSpeechError("No microphone audio detected. Check your mic cable and Windows microphone privacy settings.");
          setIsListening(false);
        } else if (event.error === "network") {
          setSpeechError("Speech recognition network error. Please check your internet connection.");
          setIsListening(false);
        } else if (event.error === "service-not-allowed") {
          setSpeechError("Browser speech recognition service is blocked.");
          setIsListening(false);
        } else if (event.error === "no-speech") {
          // Do not crash or terminate on brief pause
        } else if (event.error !== "aborted") {
          setSpeechError(`Speech recognition notice: ${event.error}`);
          setIsListening(false);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        const recordedText = voiceTranscriptRef.current?.trim();
        voiceTranscriptRef.current = "";
        if (recordedText && executeCommandRef.current && !isSubmittingVoiceRef.current) {
          isSubmittingVoiceRef.current = true;
          executeCommandRef.current(recordedText);
          setTimeout(() => {
            isSubmittingVoiceRef.current = false;
          }, 600);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn("Could not start recognition:", err);
      setSpeechError("Could not start microphone. Click 'Test Mic' to diagnose and allow access.");
      setIsListening(false);
    }
  };

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, []);

  // Load chat history and document-specific recommended questions
  useEffect(() => {
    if (!document) {
      setMessages([]);
      setSuggestedQuestions([]);
      stopSpeech();
      return;
    }
    let cancelled = false;
    setLoadingHistory(true);
    stopSpeech();

    // 1. Fetch Chat History
    api
      .chatHistory(document.id)
      .then((history) => {
        if (!cancelled) {
          const nextMessages = Array.isArray(history)
            ? history
            : Array.isArray(history?.messages)
            ? history.messages
            : [];
          setMessages(nextMessages);
        }
      })
      .catch(() => {
        if (!cancelled) setMessages([]);
      })
      .finally(() => !cancelled && setLoadingHistory(false));

    // 2. Load or Fetch Tailored Questions for this specific document
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
        .catch((err) => console.warn("Failed to load suggested questions:", err))
        .finally(() => !cancelled && setLoadingQuestions(false));
    }

    return () => {
      cancelled = true;
      stopSpeech();
      if (isListening && recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, [document]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  // Clean and phonetically format text for crystal-clear speech
  const formatTextForClearSpeech = (text) => {
    if (!text) return "";
    let clean = text;

    clean = clean.replace(/```[\s\S]*?```/g, "Code block omitted.");
    clean = clean.replace(/`([^`]+)`/g, "$1");
    clean = clean.replace(/#+\s/g, "");
    clean = clean.replace(/\*\*(.*?)\*\*/g, "$1");
    clean = clean.replace(/\*(.*?)\*/g, "$1");
    clean = clean.replace(/\[(.*?)\]\((.*?)\)/g, "$1");
    clean = clean.replace(/<[^>]*>/g, "");

    // Expand common abbreviations for natural speech
    clean = clean.replace(/\be\.g\.,?\s*/gi, "for example, ");
    clean = clean.replace(/\bi\.e\.,?\s*/gi, "that is, ");
    clean = clean.replace(/\betc\.,?\s*/gi, "and so on. ");
    clean = clean.replace(/\bvs\.?\s*/gi, "versus ");
    clean = clean.replace(/\bapprox\.?\s*/gi, "approximately ");

    clean = clean.replace(/%/g, " percent ");
    clean = clean.replace(/\$/g, " dollars ");
    clean = clean.replace(/&/g, " and ");
    clean = clean.replace(/@/g, " at ");

    clean = clean.replace(/^[\s*•\-–—]+\s*/gm, ". ");
    clean = clean.replace(/^\s*\d+\.\s*/gm, ". ");

    clean = clean.replace(/\s+/g, " ");
    clean = clean.replace(/\.{2,}/g, ".");
    clean = clean.trim();

    return clean;
  };

  const splitIntoSpeechChunks = (text) => {
    const rawSentences = text.match(/[^.!?\n]+[.!?\n]+|[^.!?\n]+$/g) || [text];
    const chunks = [];
    let current = "";

    for (const s of rawSentences) {
      const trimmed = s.trim();
      if (!trimmed) continue;
      if ((current + " " + trimmed).length < 180) {
        current = current ? current + " " + trimmed : trimmed;
      } else {
        if (current) chunks.push(current);
        current = trimmed;
      }
    }
    if (current) chunks.push(current);
    return chunks;
  };

  // Text-to-Speech Synthesizer (Auto-detects Tamil and routes to Tamil voice)
  const speakText = (text, index) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      alert("Text-to-speech is not supported in this browser.");
      return;
    }

    if (speakingIndex === index) {
      stopSpeech();
      return;
    }

    stopSpeech();

    const clean = formatTextForClearSpeech(text);
    if (!clean) return;

    const chunks = splitIntoSpeechChunks(clean);
    if (!chunks.length) return;

    // Detect if text contains Tamil characters
    const isTamilText = /[\u0B80-\u0BFF]/.test(text);

    const voices = window.speechSynthesis.getVoices() || [];
    let chosenVoice = null;

    if (isTamilText) {
      // Find dedicated Tamil voice
      chosenVoice = voices.find((v) => v.lang.startsWith("ta") || v.name.toLowerCase().includes("tamil")) ||
                    voices.find((v) => v.lang.startsWith("hi")) ||
                    availableVoices[0];
    } else {
      chosenVoice = voices.find((v) => v.voiceURI === selectedVoiceURI) ||
                    availableVoices[0] ||
                    voices.find((v) => v.lang.startsWith("en")) ||
                    voices[0];
    }

    utteranceQueueRef.current = chunks;
    setSpeakingIndex(index);
    setIsPaused(false);

    // Keep-alive heartbeat interval to prevent Chrome from silently stopping after 15 seconds
    if (ttsHeartbeatRef.current) clearInterval(ttsHeartbeatRef.current);
    ttsHeartbeatRef.current = setInterval(() => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        }
      }
    }, 10000);

    const speakChunkAtIndex = (chunkIdx) => {
      if (chunkIdx >= chunks.length) {
        stopSpeech();
        return;
      }

      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      const utterance = new SpeechSynthesisUtterance(chunks[chunkIdx]);
      activeUtteranceRef.current = utterance;
      if (typeof window !== "undefined") window.__doxoraUtterance = utterance;

      if (chosenVoice) utterance.voice = chosenVoice;
      if (isTamilText) {
        utterance.lang = "ta-IN";
      }
      utterance.rate = Math.max(0.7, Math.min(1.4, speechRate));
      utterance.pitch = Math.max(0.8, Math.min(1.2, speechPitch));
      utterance.volume = 1.0;

      utterance.onend = () => {
        speakChunkAtIndex(chunkIdx + 1);
      };

      utterance.onerror = (e) => {
        console.warn("TTS chunk playback notice:", e);
        if (chunkIdx + 1 < chunks.length) {
          speakChunkAtIndex(chunkIdx + 1);
        } else {
          stopSpeech();
        }
      };

      try {
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn("TTS speak error:", err);
        stopSpeech();
      }
    };

    speakChunkAtIndex(0);
  };

  const pauseResumeSpeech = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    } else {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  };

  const stopSpeech = () => {
    if (ttsHeartbeatRef.current) {
      clearInterval(ttsHeartbeatRef.current);
      ttsHeartbeatRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    activeUtteranceRef.current = null;
    if (typeof window !== "undefined") window.__doxoraUtterance = null;
    setSpeakingIndex(null);
    setIsPaused(false);
    setTestingVoice(false);
  };

  const testCurrentVoice = () => {
    stopSpeech();
    setTestingVoice(true);
    const sampleText = micLang.startsWith("ta")
      ? "வணக்கம்! நான் டாக்சோரா. உங்கள் ஆவணங்கள் மிகத் துல்லியமான குரலில் வாசிக்கப்படும்."
      : "Hello! I am Doxora. Your documents will now be read with crystal clear clarity and smooth natural pronunciation.";
    const clean = formatTextForClearSpeech(sampleText);
    const utterance = new SpeechSynthesisUtterance(clean);
    activeUtteranceRef.current = utterance;
    if (typeof window !== "undefined") window.__doxoraUtterance = utterance;

    const isTamilText = /[\u0B80-\u0BFF]/.test(sampleText);
    const voices = window.speechSynthesis.getVoices() || [];
    const chosenVoice = isTamilText
      ? voices.find((v) => v.lang.startsWith("ta")) || availableVoices[0]
      : voices.find((v) => v.voiceURI === selectedVoiceURI) || availableVoices[0];

    if (chosenVoice) utterance.voice = chosenVoice;
    if (isTamilText) utterance.lang = "ta-IN";
    utterance.rate = speechRate;
    utterance.pitch = speechPitch;

    utterance.onend = () => {
      setTestingVoice(false);
      activeUtteranceRef.current = null;
    };
    utterance.onerror = () => {
      setTestingVoice(false);
      activeUtteranceRef.current = null;
    };

    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
    window.speechSynthesis.speak(utterance);
  };

  const copyToClipboard = (text, index) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    }
  };

  const scrollToSpeakingMessage = () => {
    if (speakingIndex !== null) {
      const el = document.getElementById(`chat-msg-${speakingIndex}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  };

  // Main Command / Question Execution
  const executeCommand = async (commandText) => {
    if (!commandText || !commandText.trim() || !document || sending) return;
    const question = commandText.trim();
    stopSpeech();
    setInput("");
    voiceTranscriptRef.current = "";

    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      setIsListening(false);
    }

    setMessages((m) => [...m, { role: "user", content: question }]);
    setSending(true);

    try {
      const res = await api.chat(document.id, question);
      const answer = res.answer || res.response || res.message || "";
      setMessages((m) => [...m, { role: "assistant", content: answer }]);
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

  // Translate specific message into target language (e.g. Tamil)
  const handleTranslateMessage = async (messageContent, msgIndex, targetLang = "Tamil") => {
    setTranslatingIndex(msgIndex);
    setOpenTranslateMenuIndex(null);

    try {
      const prompt = `Translate the following text accurately and naturally into ${targetLang} (தமிழ் if Tamil). Provide only the translated output:\n\n${messageContent}`;
      const res = await api.chat(document.id, prompt);
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

  // Translate Entire Document into Tamil / Selected Language
  const handleTranslateEntireDocument = async (targetLang = "Tamil") => {
    if (!document || sending) return;
    setTranslatingDoc(true);
    const userPrompt = `Translate the core summary and key findings of this entire document into pure, natural ${targetLang} (${targetLang === "Tamil" ? "தமிழ்" : targetLang}).`;
    
    setMessages((m) => [...m, { role: "user", content: userPrompt }]);
    setSending(true);

    try {
      const res = await api.translate(document.id, targetLang);
      const translatedText = res.translated_text || res.answer || "";
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: `🌐 **${document.filename || "Document"} — Full ${targetLang} Translation (${targetLang === "Tamil" ? "முழு தமிழ் மொழியாக்கம்" : targetLang}):**\n\n${translatedText}`,
        },
      ]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: `⚠️ Translation error: ${err.message}`, error: true },
      ]);
    } finally {
      setSending(false);
      setTranslatingDoc(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    executeCommand(input);
  };

  // Filter questions by category
  const categories = ["All", ...new Set(suggestedQuestions.map((q) => q.category).filter(Boolean))];
  const filteredQuestions = activeCategory === "All"
    ? suggestedQuestions
    : suggestedQuestions.filter((q) => q.category === activeCategory);

  const isTamilDoc = Boolean(
    (document?.filename && /[\u0B80-\u0BFF]/.test(document.filename)) ||
    (suggestedQuestions && suggestedQuestions.some((q) => /[\u0B80-\u0BFF]/.test(q.question || "")))
  );

  const currentVoiceObj = availableVoices.find((v) => v.voiceURI === selectedVoiceURI) || availableVoices[0];
  const cleanVoiceName = (voice) => {
    if (!voice) return "Default Clear Voice";
    return voice.name.replace(/Microsoft|Google|Apple/gi, "").replace(/Online \(Natural\)/gi, "✨ Natural").trim() + ` (${voice.lang})`;
  };

  if (!document) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center px-8 text-ink-300 bg-ink-950/40 backdrop-blur-md">
        <div className="relative group mb-5">
          <div className="absolute -inset-2 rounded-3xl bg-radial-gradient from-amber-400/40 to-transparent blur-2xl opacity-70 group-hover:opacity-100 transition-opacity" />
          <div className="relative h-16 w-16 rounded-2xl bg-ink-900/90 border border-amber-400/40 flex items-center justify-center shadow-[0_0_25px_rgba(247,210,104,0.25)]">
            <Crown size={28} className="text-amber-400 animate-pulse" />
          </div>
        </div>
        <h3 className="font-display text-white text-xl font-bold mb-2 tracking-wide">
          Select a document to begin synthesis
        </h3>
        <p className="text-xs text-ink-300 max-w-md leading-relaxed mb-6">
          Upload any file format from the sidebar (PDF, DOCX, XLSX, PPTX, CSV, TXT, Code, Markdown, Data &amp; more). Doxora will
          automatically analyze your document, generate recommended questions in the document's native language (Tamil or English), provide voice typing, and clear voice readout.
        </p>

        {/* Quick Microphone Diagnostic & Setup Button */}
        <button
          type="button"
          onClick={() => setShowMicDiagnostic(true)}
          className="px-4 py-2 rounded-xl bg-ink-900/90 border border-amber-400/40 hover:border-amber-400 text-amber-300 text-xs font-semibold flex items-center gap-2 hover:bg-amber-400/15 transition cursor-pointer shadow-[0_0_15px_rgba(247,210,104,0.15)]"
        >
          <Mic size={15} className="text-amber-400" />
          <span>Test &amp; Calibrate Microphone (தமிழ் / EN)</span>
        </button>

        <MicDiagnosticModal
          isOpen={showMicDiagnostic}
          onClose={() => setShowMicDiagnostic(false)}
          currentMicLang={micLang}
          onSelectLang={handleMicLangChange}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-ink-950/40 backdrop-blur-md relative">
      {/* Active Document Header Bar */}
      <div className="border-b border-amber-400/20 px-5 py-3 flex items-center justify-between bg-ink-950/80 backdrop-blur-xl z-10 shadow-sm">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-300 shadow-[0_0_10px_rgba(247,210,104,0.15)]">
            <FileText size={16} />
          </div>
          <div className="min-w-0">
            <h2 className="font-display font-semibold text-white text-sm truncate tracking-wide flex items-center gap-2">
              <span>{document.filename || document.name}</span>
            </h2>
            <div className="flex items-center gap-2 text-[10px] text-amber-400/80 font-mono">
              <span>{document.word_count ? `${document.word_count.toLocaleString()} words` : "Document Context Active"}</span>
              {document.page_count && <span>· {document.page_count} pages</span>}
              {isTamilDoc && <span className="text-amber-300 bg-amber-400/15 px-1.5 py-0.2 rounded border border-amber-400/30 font-bold">தமிழ் PDF</span>}
            </div>
          </div>
        </div>

        {/* Right Header Actions: Translation & Voice Controls */}
        <div className="flex items-center gap-2">
          {/* Active Speaking Indicator with Pause & Stop */}
          {speakingIndex !== null && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400 text-amber-300 text-[11px] font-semibold shadow-[0_0_15px_rgba(247,210,104,0.3)] animate-pulse">
              <Volume2 size={13} className="animate-bounce" />
              <span>{isPaused ? "Paused" : "Speaking…"}</span>
              <button
                onClick={pauseResumeSpeech}
                className="hover:text-white p-0.5 cursor-pointer ml-1"
                title={isPaused ? "Resume speech" : "Pause speech"}
              >
                {isPaused ? <Play size={10} className="fill-current" /> : <Pause size={10} className="fill-current" />}
              </button>
              <button
                onClick={stopSpeech}
                className="hover:text-red-300 p-0.5 cursor-pointer"
                title="Stop reading aloud"
              >
                <Square size={10} className="fill-current" />
              </button>
            </div>
          )}

          {/* Quick Translation Toggle Button in Header */}
          {isTamilDoc ? (
            <button
              onClick={() => handleTranslateEntireDocument("English")}
              disabled={sending || translatingDoc}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-400/30 bg-amber-500/10 hover:bg-amber-400/25 text-amber-300 text-[11px] font-semibold transition-all cursor-pointer shadow-sm hover:scale-102"
              title="Translate Tamil document into English"
            >
              {translatingDoc ? <Loader2 size={12} className="animate-spin" /> : <Globe size={13} className="text-amber-400" />}
              <span>English Translation</span>
            </button>
          ) : (
            <button
              onClick={() => handleTranslateEntireDocument("Tamil")}
              disabled={sending || translatingDoc}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-400/30 bg-amber-500/10 hover:bg-amber-400/25 text-amber-300 text-[11px] font-semibold transition-all cursor-pointer shadow-sm hover:scale-102"
              title="Translate document into pure Tamil (தமிழில் மொழியாக்கம்)"
            >
              {translatingDoc ? <Loader2 size={12} className="animate-spin" /> : <Globe size={13} className="text-amber-400" />}
              <span>தமிழ் (Tamil)</span>
            </button>
          )}

          {/* Voice Clarity Settings Trigger Button */}
          <button
            onClick={() => setShowVoiceSettings(!showVoiceSettings)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-semibold transition-all cursor-pointer ${
              showVoiceSettings
                ? "bg-amber-400 text-ink-950 border-amber-300 shadow-[0_0_15px_rgba(247,210,104,0.35)] font-bold"
                : "bg-ink-900/80 border-amber-400/30 text-amber-300 hover:border-amber-400 hover:bg-amber-500/15"
            }`}
            title="Configure clear voice language, pitch, and speed"
          >
            <Headphones size={13} className="text-amber-400" />
            <span className="hidden sm:inline">Voice & Lang</span>
            <Sliders size={12} className="opacity-70" />
          </button>

          <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-400/10 border border-amber-400/25 text-[10px] font-medium text-amber-300">
            <Zap size={11} className="text-amber-400" /> Grounded AI
          </span>
        </div>
      </div>

      {/* Voice & Translation Settings Modal */}
      {showVoiceSettings && (
        <div className="absolute top-14 right-5 z-30 w-84 sm:w-96 rounded-2xl bg-ink-950/95 border border-amber-400/40 p-4 shadow-[0_10px_35px_rgba(0,0,0,0.8)] backdrop-blur-2xl animate-fade-in-up">
          <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
            <div className="flex items-center gap-2">
              <Languages size={16} className="text-amber-400" />
              <h4 className="font-display font-bold text-sm text-gold-royal">Language & Voice Clarity</h4>
            </div>
            <button
              onClick={() => setShowVoiceSettings(false)}
              className="text-ink-400 hover:text-white text-xs p-1 cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>

          <div className="space-y-3.5 text-xs">
            {/* Microphone Voice Typing Language Toggle */}
            <div>
              <label className="block text-[11px] font-semibold text-ink-200 mb-1.5 flex items-center justify-between">
                <span>Microphone Language (Voice Typing)</span>
                <span className="text-[10px] text-amber-400 font-mono">
                  {micLang === "ta-IN" ? "தமிழ் (Tamil)" : "English"}
                </span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleMicLangChange("en-US")}
                  className={`py-1.5 px-3 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                    micLang === "en-US"
                      ? "bg-amber-400 text-ink-950 border-amber-300 font-bold shadow-sm"
                      : "bg-ink-900 border-white/10 text-ink-300 hover:text-white hover:border-amber-400/30"
                  }`}
                >
                  🇬🇧 English (US/IN)
                </button>
                <button
                  type="button"
                  onClick={() => handleMicLangChange("ta-IN")}
                  className={`py-1.5 px-3 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                    micLang === "ta-IN"
                      ? "bg-amber-400 text-ink-950 border-amber-300 font-bold shadow-sm"
                      : "bg-ink-900 border-white/10 text-ink-300 hover:text-white hover:border-amber-400/30"
                  }`}
                >
                  🇮🇳 தமிழ் (Tamil)
                </button>
              </div>
            </div>

            {/* Read Aloud Voice Selection */}
            <div>
              <label className="block text-[11px] font-semibold text-ink-200 mb-1.5 flex items-center justify-between">
                <span>Read Aloud Voice</span>
                <span className="text-[10px] text-amber-400/80 font-mono">
                  {availableVoices.length} voices ready
                </span>
              </label>
              <select
                value={selectedVoiceURI}
                onChange={(e) => handleVoiceChange(e.target.value)}
                className="w-full h-9 rounded-xl bg-ink-900 border border-amber-400/30 px-3 text-xs text-amber-200 focus:outline-none focus:ring-1 focus:ring-amber-400 cursor-pointer"
              >
                {availableVoices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {cleanVoiceName(v)}
                  </option>
                ))}
              </select>
            </div>

            {/* Speaking Rate / Speed */}
            <div>
              <div className="flex items-center justify-between text-[11px] font-semibold text-ink-200 mb-1">
                <span>Speaking Speed</span>
                <span className="text-amber-400 font-mono">{speechRate.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.75"
                max="1.35"
                step="0.05"
                value={speechRate}
                onChange={(e) => handleRateChange(e.target.value)}
                className="w-full accent-amber-400 cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-ink-400 font-mono mt-0.5">
                <span>0.75x (Calm & Clear)</span>
                <span>1.0x (Standard)</span>
                <span>1.35x (Fast)</span>
              </div>
            </div>

            {/* Test Voice Audio Button */}
            <div className="pt-2 border-t border-white/10 flex items-center justify-between">
              <button
                type="button"
                onClick={testCurrentVoice}
                disabled={testingVoice}
                className="px-3 py-1.5 rounded-xl bg-amber-400/20 border border-amber-400/50 hover:bg-amber-400 text-amber-300 hover:text-ink-950 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                {testingVoice ? <Loader2 size={12} className="animate-spin" /> : <Play size={11} className="fill-current" />}
                <span>{testingVoice ? "Playing Sample…" : "Test Voice Clarity"}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowMicDiagnostic(true);
                  setShowVoiceSettings(false);
                }}
                className="px-2.5 py-1.5 rounded-xl bg-ink-900 border border-amber-400/30 text-amber-300 hover:bg-amber-400/20 text-xs font-semibold flex items-center gap-1 cursor-pointer transition"
              >
                <Mic size={11} className="text-amber-400" />
                <span>Test Mic</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recommended Questions Carousel Bar (Language Adaptive) */}
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

            {/* Category Filter Pills */}
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

          {/* Interactive Question Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-1 max-h-36 overflow-y-auto pr-1">
            {filteredQuestions.map((q, idx) => {
              const catClass = CATEGORY_COLORS[q.category] || "bg-ink-900/80 text-ink-200 border-white/10 hover:border-amber-400/40";
              return (
                <button
                  key={idx}
                  onClick={() => executeCommand(q.command || q.question)}
                  disabled={sending}
                  className={`group flex items-start gap-2.5 p-2.5 rounded-xl border text-left text-xs transition-all duration-200 cursor-pointer hover:scale-[1.01] hover:shadow-[0_4px_16px_rgba(247,210,104,0.15)] disabled:opacity-50 disabled:cursor-not-allowed ${catClass}`}
                  title={`Click to ask: "${q.question}"`}
                >
                  <div className="p-1 rounded-lg bg-black/40 border border-white/10 shrink-0 group-hover:border-amber-400/50 group-hover:scale-110 transition-all text-amber-400 mt-0.5">
                    {q.category === "Key Data" || q.category === "முக்கிய தரவு" ? (
                      <BarChart2 size={12} />
                    ) : q.category === "Action Items" || q.category === "அடுத்தகட்ட நடவடிக்கை" ? (
                      <Target size={12} />
                    ) : q.category === "Analysis" || q.category === "பகுப்பாய்வு" ? (
                      <Zap size={12} />
                    ) : (
                      <MessageSquare size={12} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="text-[9px] uppercase font-bold tracking-wider opacity-80">
                        {q.category || (isTamilDoc ? "கேள்வி" : "Question")}
                      </span>
                      <span className="text-[9px] text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity font-semibold flex items-center gap-0.5">
                        {isTamilDoc ? "கேட்க" : "Ask"} <Play size={8} className="fill-amber-400" />
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

      {/* Messages Scroll Viewport */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-6 space-y-5">
        {loadingHistory ? (
          <div className="flex justify-center items-center py-16 flex-col gap-2">
            <Loader2 className="animate-spin text-amber-400" size={28} />
            <span className="text-xs text-ink-300">
              {isTamilDoc ? "உரையாடல் வரலாறு ஏற்றப்படுகிறது…" : "Loading conversation history…"}
            </span>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-xs text-ink-300 pt-8 max-w-xl mx-auto animate-fade-in-up">
            <div className="relative inline-block mb-3">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-amber-300/10 border border-amber-400/30 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(247,210,104,0.2)]">
                <Sparkles size={22} className="text-amber-400 animate-pulse" />
              </div>
            </div>
            <h4 className="font-display font-bold text-white text-base mb-1">
              {isTamilDoc
                ? "இந்த ஆவணத்தைப் பற்றி நீங்கள் என்ன தெரிந்து கொள்ள விரும்புகிறீர்கள்?"
                : "What would you like to know from this document?"}
            </h4>
            <p className="text-xs text-ink-300 mb-5 leading-relaxed">
              {isTamilDoc
                ? "மேலே உள்ள பரிந்துரைக்கப்பட்ட கேள்விகளில் ஒன்றைக் கிளிக் செய்யவும், அல்லது மைக்ரோஃபோன் (🎙️) மூலம் தமிழில் கேட்கவும்."
                : "Ask questions, transcribe with microphone, or translate the entire document into Tamil (தமிழ்)."}
            </p>

            {/* Quick Starter Pills (Language Adaptive) */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              {isTamilDoc ? (
                <>
                  <button
                    onClick={() => executeCommand("இந்த ஆவணத்தின் முக்கிய குறிக்கோள்கள், முக்கிய கருத்துக்கள் மற்றும் சுருக்கத்தை 4 தெளிவான புள்ளிகளில் விளக்குங்கள்.")}
                    disabled={sending}
                    className="px-3.5 py-1.5 rounded-xl bg-ink-900/80 border border-amber-400/30 hover:border-amber-400 text-amber-300 text-xs font-medium transition-all hover:scale-105 cursor-pointer flex items-center gap-1.5 shadow-sm"
                  >
                    <Sparkles size={12} className="text-amber-400" />
                    <span>முக்கிய சுருக்கம் (Summary)</span>
                  </button>

                  <button
                    onClick={() => executeCommand("இந்த ஆவணத்தில் காணப்படும் அனைத்து முக்கிய எண்கள், தேதிகள் மற்றும் புள்ளிவிவரங்களை பட்டியலிடுங்கள்.")}
                    disabled={sending}
                    className="px-3.5 py-1.5 rounded-xl bg-ink-900/80 border border-emerald-400/30 hover:border-emerald-400 text-emerald-300 text-xs font-medium transition-all hover:scale-105 cursor-pointer flex items-center gap-1.5 shadow-sm"
                  >
                    <BarChart2 size={12} className="text-emerald-400" />
                    <span>முக்கிய எண்கள் & தரவுகள் (Key Data)</span>
                  </button>

                  <button
                    onClick={() => executeCommand("இந்த ஆவணத்தில் பரிந்துரைக்கப்பட்டுள்ள முக்கிய முடிவுகள் மற்றும் அடுத்தகட்ட நடவடிக்கைகளை பட்டியலிடுங்கள்.")}
                    disabled={sending}
                    className="px-3.5 py-1.5 rounded-xl bg-ink-900/80 border border-purple-400/30 hover:border-purple-400 text-purple-300 text-xs font-medium transition-all hover:scale-105 cursor-pointer flex items-center gap-1.5 shadow-sm"
                  >
                    <Target size={12} className="text-purple-400" />
                    <span>அடுத்தகட்ட நடவடிக்கை (Action Items)</span>
                  </button>

                  <button
                    onClick={() => handleTranslateEntireDocument("English")}
                    disabled={sending}
                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-amber-400/10 border border-amber-400/50 hover:border-amber-400 text-amber-300 text-xs font-semibold transition-all hover:scale-105 cursor-pointer flex items-center gap-1.5"
                  >
                    <Globe size={13} className="text-amber-400" />
                    <span>ஆங்கிலத்தில் மொழிபெயர்க்க (To English)</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => handleTranslateEntireDocument("Tamil")}
                    disabled={sending}
                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-amber-400/10 border border-amber-400/50 hover:border-amber-400 text-amber-300 text-xs font-semibold transition-all hover:scale-105 cursor-pointer flex items-center gap-1.5 shadow-[0_0_15px_rgba(247,210,104,0.2)]"
                  >
                    <Globe size={13} className="text-amber-400" />
                    <span>🇮🇳 Translate to Tamil (தமிழில் மொழியாக்கம்)</span>
                  </button>

                  <button
                    onClick={() => executeCommand("Provide a concise executive summary of this document with key takeaways.")}
                    disabled={sending}
                    className="px-3 py-1.5 rounded-xl bg-ink-900/80 border border-amber-400/30 hover:border-amber-400 text-amber-300 text-xs font-medium transition-all hover:scale-105 cursor-pointer flex items-center gap-1.5 shadow-sm"
                  >
                    <Sparkles size={12} className="text-amber-400" />
                    <span>Executive Summary</span>
                  </button>

                  <button
                    onClick={() => executeCommand("Extract all important figures, financial numbers, dates, and metrics from this document.")}
                    disabled={sending}
                    className="px-3 py-1.5 rounded-xl bg-ink-900/80 border border-emerald-400/30 hover:border-emerald-400 text-emerald-300 text-xs font-medium transition-all hover:scale-105 cursor-pointer flex items-center gap-1.5 shadow-sm"
                  >
                    <BarChart2 size={12} className="text-emerald-400" />
                    <span>Extract Key Figures</span>
                  </button>

                  <button
                    onClick={() => executeCommand("List the actionable next steps, key recommendations, and risks mentioned in this document.")}
                    disabled={sending}
                    className="px-3 py-1.5 rounded-xl bg-ink-900/80 border border-purple-400/30 hover:border-purple-400 text-purple-300 text-xs font-medium transition-all hover:scale-105 cursor-pointer flex items-center gap-1.5 shadow-sm"
                  >
                    <Target size={12} className="text-purple-400" />
                    <span>Action Items</span>
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          messages.map((m, i) => {
            const isSpeakingThis = speakingIndex === i;
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
                    <>
                      <span className="font-semibold text-amber-400">Your Command</span>
                    </>
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
                  className={`group relative max-w-[85%] sm:max-w-[78%] rounded-2xl px-4 py-3.5 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap shadow-lg transition-all ${
                    m.role === "user"
                      ? "bg-gradient-to-r from-amber-500 to-amber-600 text-ink-950 font-medium rounded-tr-xs shadow-[0_4px_20px_rgba(247,210,104,0.25)] border border-amber-300/40"
                      : m.error
                      ? "bg-red-500/15 border border-red-400/30 text-red-200 rounded-tl-xs backdrop-blur-xl"
                      : "bg-ink-900/90 border border-amber-400/25 text-ink-100 rounded-tl-xs backdrop-blur-xl shadow-[0_4px_25px_rgba(0,0,0,0.5)]"
                  }`}
                >
                  {m.content}

                  {/* Message Action Bar (Read Aloud 🔊, Translate 🌐, Copy 📋) */}
                  <div className={`mt-2.5 pt-2 border-t flex items-center justify-between gap-3 text-[11px] relative ${
                    m.role === "user" ? "border-ink-950/20 text-ink-900" : "border-white/10 text-ink-300"
                  }`}>
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Clear Read Aloud Button */}
                      <button
                        onClick={() => speakText(m.content, i)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                          isSpeakingThis
                            ? "bg-amber-400 text-ink-950 font-bold shadow-md animate-pulse"
                            : m.role === "user"
                            ? "hover:bg-ink-950/15 text-ink-950 font-semibold"
                            : "hover:bg-amber-400/15 text-amber-300 hover:text-amber-200 border border-amber-400/30"
                        }`}
                        title={isSpeakingThis ? "Stop reading aloud" : "Read this out loud"}
                      >
                        {isSpeakingThis ? (
                          <>
                            <Square size={11} className="fill-current" />
                            <span>Stop Speech</span>
                          </>
                        ) : (
                          <>
                            <Volume2 size={13} className="text-amber-400" />
                            <span>Read Aloud</span>
                          </>
                        )}
                      </button>

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

                          {/* Translation Languages Dropdown Menu */}
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

                      {/* Copy Button */}
                      <button
                        onClick={() => copyToClipboard(m.content, i)}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                          m.role === "user"
                            ? "hover:bg-ink-950/15 text-ink-950 font-semibold"
                            : "hover:bg-white/10 text-ink-300 hover:text-white"
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

                    {isSpeakingThis && (
                      <span className="text-[10px] font-mono text-amber-400 animate-pulse flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
                        Speaking
                      </span>
                    )}
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
                {translatingDoc ? "Translating Document into Tamil…" : "Analyzing Document…"}
              </span>
            </div>
            <div className="rounded-2xl rounded-tl-xs bg-ink-900/90 border border-amber-400/30 px-5 py-3.5 flex items-center gap-2 shadow-md backdrop-blur-xl">
              <span className="h-2 w-2 rounded-full bg-amber-400 typing-dot-1" />
              <span className="h-2 w-2 rounded-full bg-amber-400 typing-dot-2" />
              <span className="h-2 w-2 rounded-full bg-amber-400 typing-dot-3" />
              <span className="text-xs text-amber-300/80 font-medium ml-2 font-mono">
                {translatingDoc ? "Generating accurate Tamil translation…" : "Synthesizing document insights…"}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Voice Error Notification Banner */}
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
              Test &amp; Fix Mic
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

      {/* Persistent Docked Read Aloud Control Bar (Always visible even when scrolled down) */}
      {speakingIndex !== null && (
        <div className="border-t border-amber-400/30 bg-gradient-to-r from-ink-950 via-amber-950/40 to-ink-950 px-4 py-2.5 flex items-center justify-between gap-3 backdrop-blur-2xl shadow-[0_-8px_25px_rgba(0,0,0,0.6)] z-20 animate-fade-in-up">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative flex items-center justify-center h-8 w-8 rounded-xl bg-amber-400/20 border border-amber-400/50 text-amber-300 shrink-0">
              <Volume2 size={16} className={isPaused ? "" : "animate-bounce"} />
              {!isPaused && (
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400" />
                </span>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-300">
                  {isPaused ? "Reading Aloud (Paused)" : "Reading Aloud Active"}
                </span>
                {!isPaused && (
                  <div className="flex items-center gap-0.5 h-3">
                    <span className="w-0.5 h-full bg-amber-400 animate-pulse" />
                    <span className="w-0.5 h-2 bg-amber-400 animate-pulse delay-75" />
                    <span className="w-0.5 h-3 bg-amber-400 animate-pulse delay-150" />
                    <span className="w-0.5 h-1 bg-amber-400 animate-pulse delay-100" />
                  </div>
                )}
              </div>
              <p
                onClick={scrollToSpeakingMessage}
                className="text-[11px] text-ink-300 truncate max-w-[200px] sm:max-w-md md:max-w-lg hover:text-amber-200 cursor-pointer underline-offset-2 hover:underline transition-colors"
                title="Click to jump to this message in chat"
              >
                {messages[speakingIndex]?.content
                  ? messages[speakingIndex].content.slice(0, 100) + "…"
                  : "Listening to response"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={pauseResumeSpeech}
              className="px-2.5 py-1.5 rounded-xl border border-amber-400/30 hover:border-amber-400/60 bg-white/5 hover:bg-white/10 text-xs text-amber-200 flex items-center gap-1.5 cursor-pointer transition font-medium"
              title={isPaused ? "Resume speech" : "Pause speech"}
            >
              {isPaused ? (
                <>
                  <Play size={12} className="fill-current text-amber-400" />
                  <span className="hidden sm:inline">Resume</span>
                </>
              ) : (
                <>
                  <Pause size={12} className="fill-current text-amber-400" />
                  <span className="hidden sm:inline">Pause</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={stopSpeech}
              className="px-3.5 py-1.5 rounded-xl bg-red-500/25 hover:bg-red-500/40 border border-red-400 text-red-200 hover:text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition shadow-[0_0_15px_rgba(239,68,68,0.3)] hover:scale-105 active:scale-95"
              title="Stop reading aloud"
            >
              <Square size={12} className="fill-current text-red-400" />
              <span>Stop Read Aloud</span>
            </button>
          </div>
        </div>
      )}

      {/* Input Form Bar with Microphone & Voice Typing */}
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
                  ? "🎙️ தமிழில் பேசுங்கள்... பேசி முடித்ததும் தானாகவே தேடப்படும் (Auto-search on stop)..."
                  : "🎙️ Listening... Speak your question, will auto-search when you stop..."
                : micLang === "ta-IN"
                ? "தமிழில் கேளுங்கள் அல்லது தட்டச்சு செய்யுங்கள்…"
                : "Ask anything about this document, or click the mic to speak…"
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

        {/* Quick Mic Language Switcher Button */}
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

        {/* Voice Input Microphone Button */}
        <button
          type="button"
          onClick={toggleVoiceTyping}
          disabled={sending}
          className={`relative h-11 px-3.5 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-semibold cursor-pointer transition-all ${
            isListening
              ? "bg-red-500/25 border-red-400 text-red-300 shadow-[0_0_20px_rgba(239,68,68,0.4)] animate-pulse"
              : "bg-ink-900/90 border-amber-400/40 text-amber-300 hover:bg-amber-500/20 hover:border-amber-400 hover:scale-105 shadow-[0_0_12px_rgba(247,210,104,0.15)]"
          }`}
          title={isListening ? "Listening... Click to stop & send question directly to search" : `Click to speak (${micLang === "ta-IN" ? "தமிழ்" : "English"})`}
          aria-label="Voice typing"
        >
          {isListening ? (
            <>
              <span className="relative flex h-2.5 w-2.5 mr-0.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
              </span>
              <MicOff size={16} className="text-red-400" />
              <span className="hidden sm:inline text-[11px] text-red-300 font-bold">
                {micLang === "ta-IN" ? "தமிழ்" : "Auto-Send"}
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


        {/* Quick Stop Button right in form bar if reading aloud */}
        {speakingIndex !== null && (
          <button
            type="button"
            onClick={stopSpeech}
            className="h-11 px-3 sm:px-3.5 rounded-xl bg-red-500/25 hover:bg-red-500/35 border border-red-400 text-red-200 hover:text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition shadow-[0_0_15px_rgba(239,68,68,0.3)] shrink-0"
            title="Stop reading aloud"
          >
            <Square size={13} className="fill-current text-red-400" />
            <span className="hidden sm:inline">Stop Speech</span>
          </button>
        )}

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

      {/* Complete Microphone Diagnostic & Testing Modal */}
      <MicDiagnosticModal
        isOpen={showMicDiagnostic}
        onClose={() => setShowMicDiagnostic(false)}
        currentMicLang={micLang}
        onSelectLang={handleMicLangChange}
      />
    </div>
  );
}
