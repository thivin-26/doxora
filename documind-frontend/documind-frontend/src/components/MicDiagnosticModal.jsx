import { useState, useEffect, useRef } from "react";
import {
  Mic,
  MicOff,
  Volume2,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Play,
  Square,
  X,
  Radio,
  Sliders,
  Sparkles,
  ShieldCheck,
  HelpCircle,
  ExternalLink
} from "lucide-react";

export default function MicDiagnosticModal({ isOpen, onClose, currentMicLang = "ta-IN", onSelectLang }) {
  const [activeTab, setActiveTab] = useState("hardware"); // "hardware" | "speech" | "echo" | "troubleshoot"
  
  // Hardware test states
  const [permState, setPermState] = useState("checking"); // "checking" | "granted" | "prompt" | "denied" | "unsupported"
  const [deviceList, setDeviceList] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [isCapturing, setIsCapturing] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0); // 0 to 100
  const [hardwareError, setHardwareError] = useState("");

  // Speech test states
  const [testLang, setTestLang] = useState(currentMicLang || "ta-IN");
  const [isTestingSpeech, setIsTestingSpeech] = useState(false);
  const [speechTranscript, setSpeechTranscript] = useState("");
  const [interimText, setInterimText] = useState("");
  const [speechStatus, setSpeechStatus] = useState("idle"); // "idle" | "listening" | "success" | "error"
  const [speechErrorMessage, setSpeechErrorMessage] = useState("");

  // Echo test states
  const [isRecordingEcho, setIsRecordingEcho] = useState(false);
  const [echoSecondsLeft, setEchoSecondsLeft] = useState(0);
  const [echoAudioUrl, setEchoAudioUrl] = useState(null);
  const [isPlayingEcho, setIsPlayingEcho] = useState(false);

  // Audio refs
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const animFrameRef = useRef(null);
  const speechRecRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const echoChunksRef = useRef([]);
  const echoAudioElementRef = useRef(null);

  // Check initial permission status if available
  useEffect(() => {
    if (!isOpen) return;

    if (typeof navigator === "undefined" || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setPermState("unsupported");
      setHardwareError("MediaDevices API is not supported in this browser environment.");
      return;
    }

    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: "microphone" })
        .then((result) => {
          setPermState(result.state);
          result.onchange = () => {
            setPermState(result.state);
          };
        })
        .catch(() => {
          setPermState("prompt");
        });
    } else {
      setPermState("prompt");
    }

    loadAudioDevices();

    return () => {
      stopHardwareCapture();
      stopSpeechTest();
      stopEchoRecording();
    };
  }, [isOpen]);

  const loadAudioDevices = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter((d) => d.kind === "audioinput");
        setDeviceList(audioInputs);
        if (audioInputs.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(audioInputs[0].deviceId);
        }
      }
    } catch (err) {
      console.warn("Could not list audio devices:", err);
    }
  };

  // --- HARDWARE & LIVE VOLUME TEST ---
  const startHardwareCapture = async () => {
    stopHardwareCapture();
    setHardwareError("");

    try {
      const constraints = {
        audio: selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : true,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      setPermState("granted");

      // Reload devices now that label access is permitted
      loadAudioDevices();

      // Setup Web Audio Analyser
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioContext();
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.6;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      setIsCapturing(true);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;
        const normalized = Math.min(100, Math.round((avg / 128) * 100));
        setVolumeLevel(normalized);

        animFrameRef.current = requestAnimationFrame(updateVolume);
      };

      updateVolume();
    } catch (err) {
      console.error("Hardware mic capture failed:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setPermState("denied");
        setHardwareError("Microphone permission was denied by your browser. Please allow microphone access in your browser address bar.");
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setHardwareError("No microphone hardware found on this computer. Please connect a microphone or headset.");
      } else if (err.name === "NotReadableError") {
        setHardwareError("Microphone is currently in use by another application (e.g. Zoom, Teams, Meet). Close that app and retry.");
      } else {
        setHardwareError(`Microphone access error: ${err.message || err.name}`);
      }
      setIsCapturing(false);
    }
  };

  const stopHardwareCapture = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setIsCapturing(false);
    setVolumeLevel(0);
  };

  // --- SPEECH RECOGNITION TEST ---
  const startSpeechTest = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechErrorMessage("Web Speech Recognition API is not supported in this browser. Please use Chrome, Edge, or Brave.");
      setSpeechStatus("error");
      return;
    }

    stopSpeechTest();
    setSpeechErrorMessage("");
    setSpeechTranscript("");
    setInterimText("");
    setSpeechStatus("listening");

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = testLang;

      recognition.onstart = () => {
        setIsTestingSpeech(true);
        setSpeechStatus("listening");
      };

      recognition.onresult = (event) => {
        let finalStr = "";
        let interimStr = "";
        for (let i = 0; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalStr += event.results[i][0].transcript + " ";
          } else {
            interimStr += event.results[i][0].transcript;
          }
        }
        setSpeechTranscript(finalStr);
        setInterimText(interimStr);
        if (finalStr.trim()) {
          setSpeechStatus("success");
        }
      };

      recognition.onerror = (event) => {
        console.warn("Speech test error:", event.error);
        if (event.error === "not-allowed") {
          setSpeechErrorMessage("Permission denied. Click the lock/site settings icon in your browser URL bar to allow microphone.");
          setSpeechStatus("error");
        } else if (event.error === "audio-capture") {
          setSpeechErrorMessage("No audio input detected. Check that your microphone is plugged in and unmuted.");
          setSpeechStatus("error");
        } else if (event.error === "network") {
          setSpeechErrorMessage("Network error: Chrome Web Speech requires an active internet connection.");
          setSpeechStatus("error");
        } else if (event.error !== "no-speech") {
          setSpeechErrorMessage(`Recognition error: ${event.error}`);
          setSpeechStatus("error");
        }
      };

      recognition.onend = () => {
        setIsTestingSpeech(false);
      };

      speechRecRef.current = recognition;
      recognition.start();
    } catch (err) {
      setSpeechErrorMessage(`Failed to start recognition: ${err.message}`);
      setSpeechStatus("error");
      setIsTestingSpeech(false);
    }
  };

  const stopSpeechTest = () => {
    if (speechRecRef.current) {
      try {
        speechRecRef.current.stop();
      } catch {}
      speechRecRef.current = null;
    }
    setIsTestingSpeech(false);
  };

  // --- HARDWARE ECHO & PLAYBACK TEST ---
  const startEchoRecording = async () => {
    if (echoAudioUrl) {
      URL.revokeObjectURL(echoAudioUrl);
      setEchoAudioUrl(null);
    }
    echoChunksRef.current = [];
    setEchoSecondsLeft(5);
    setIsRecordingEcho(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          echoChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(echoChunksRef.current, { type: mediaRecorder.mimeType || "audio/webm" });
        const url = URL.createObjectURL(blob);
        setEchoAudioUrl(url);
        stream.getTracks().forEach((t) => t.stop());
        setIsRecordingEcho(false);
      };

      mediaRecorder.start();

      let countdown = 5;
      const interval = setInterval(() => {
        countdown -= 1;
        setEchoSecondsLeft(countdown);
        if (countdown <= 0) {
          clearInterval(interval);
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
            mediaRecorderRef.current.stop();
          }
        }
      }, 1000);
    } catch (err) {
      console.error("Echo test failed:", err);
      alert(`Could not access microphone for echo test: ${err.message}`);
      setIsRecordingEcho(false);
    }
  };

  const stopEchoRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    setIsRecordingEcho(false);
  };

  const playEchoAudio = () => {
    if (!echoAudioUrl) return;
    if (echoAudioElementRef.current) {
      echoAudioElementRef.current.pause();
    }
    const audio = new Audio(echoAudioUrl);
    echoAudioElementRef.current = audio;
    setIsPlayingEcho(true);
    audio.onended = () => setIsPlayingEcho(false);
    audio.onerror = () => setIsPlayingEcho(false);
    audio.play().catch(() => setIsPlayingEcho(false));
  };

  if (!isOpen) return null;

  const isWebSpeechSupported = typeof window !== "undefined" && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/80 backdrop-blur-xl animate-fade-in">
      <div className="relative w-full max-w-2xl rounded-2xl bg-ink-950/95 border border-amber-400/40 shadow-[0_0_50px_rgba(247,210,104,0.15)] flex flex-col max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-amber-400/20 flex items-center justify-between bg-ink-900/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-400/15 border border-amber-400/30 text-amber-300 shadow-[0_0_12px_rgba(247,210,104,0.2)]">
              <Mic size={20} className="text-amber-400" />
            </div>
            <div>
              <h3 className="font-display font-bold text-white text-base sm:text-lg flex items-center gap-2">
                <span>Microphone Diagnostic & Audio Studio</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-300 font-mono uppercase tracking-wider">
                  Test & Fix
                </span>
              </h3>
              <p className="text-xs text-ink-300">
                Complete hardware verification, speech-to-text test (தமிழ் / EN), and 1-click permission repair.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-ink-300 hover:text-white transition cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-amber-400/20 bg-ink-950/60 px-4 sm:px-5 gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab("hardware")}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === "hardware"
                ? "border-amber-400 text-amber-300"
                : "border-transparent text-ink-400 hover:text-ink-200"
            }`}
          >
            <Radio size={14} />
            <span>1. Live Mic & Equalizer</span>
            {isCapturing && <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />}
          </button>

          <button
            onClick={() => setActiveTab("speech")}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === "speech"
                ? "border-amber-400 text-amber-300"
                : "border-transparent text-ink-400 hover:text-ink-200"
            }`}
          >
            <Sparkles size={14} />
            <span>2. Speech-to-Text Test (தமிழ் / EN)</span>
          </button>

          <button
            onClick={() => setActiveTab("echo")}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === "echo"
                ? "border-amber-400 text-amber-300"
                : "border-transparent text-ink-400 hover:text-ink-200"
            }`}
          >
            <Volume2 size={14} />
            <span>3. Voice Playback (Echo)</span>
          </button>

          <button
            onClick={() => setActiveTab("troubleshoot")}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === "troubleshoot"
                ? "border-amber-400 text-amber-300"
                : "border-transparent text-ink-400 hover:text-ink-200"
            }`}
          >
            <HelpCircle size={14} />
            <span>4. Fix Guide</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-ink-200 text-xs flex-1">
          {/* TAB 1: HARDWARE & LIVE EQUALIZER */}
          {activeTab === "hardware" && (
            <div className="space-y-4">
              {/* Permission & Status Banner */}
              <div className="p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-ink-900/60 border-amber-400/20">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl border ${
                    permState === "granted"
                      ? "bg-emerald-500/15 border-emerald-400/30 text-emerald-400"
                      : permState === "denied"
                      ? "bg-red-500/15 border-red-400/30 text-red-400"
                      : "bg-amber-500/15 border-amber-400/30 text-amber-400"
                  }`}>
                    {permState === "granted" ? <ShieldCheck size={20} /> : <AlertTriangle size={20} />}
                  </div>
                  <div>
                    <div className="font-semibold text-white text-xs flex items-center gap-2">
                      <span>Browser Microphone Permission:</span>
                      <span className={`px-2 py-0.5 rounded-md font-mono text-[10px] uppercase font-bold ${
                        permState === "granted"
                          ? "bg-emerald-400/20 text-emerald-300 border border-emerald-400/30"
                          : permState === "denied"
                          ? "bg-red-400/20 text-red-300 border border-red-400/30"
                          : "bg-amber-400/20 text-amber-300 border border-amber-400/30"
                      }`}>
                        {permState}
                      </span>
                    </div>
                    <p className="text-[11px] text-ink-300 mt-0.5">
                      {permState === "granted"
                        ? "Microphone access is authorized and ready for live transcription."
                        : permState === "denied"
                        ? "Microphone is blocked by browser. Click the lock icon in the URL bar to allow."
                        : "Click 'Start Live Mic Test' below to request microphone permission."}
                    </p>
                  </div>
                </div>

                <button
                  onClick={isCapturing ? stopHardwareCapture : startHardwareCapture}
                  className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md ${
                    isCapturing
                      ? "bg-red-500/20 border border-red-400 text-red-300 hover:bg-red-500/30"
                      : "bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-ink-950 hover:brightness-110 shadow-[0_0_15px_rgba(247,210,104,0.3)]"
                  }`}
                >
                  {isCapturing ? (
                    <>
                      <Square size={14} className="fill-current" />
                      <span>Stop Mic Test</span>
                    </>
                  ) : (
                    <>
                      <Mic size={14} />
                      <span>Start Live Mic Test</span>
                    </>
                  )}
                </button>
              </div>

              {hardwareError && (
                <div className="p-3 rounded-xl bg-red-500/20 border border-red-400/40 text-red-200 text-xs flex items-start gap-2.5">
                  <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-white mb-0.5">Access Notice</p>
                    <p className="leading-relaxed">{hardwareError}</p>
                  </div>
                </div>
              )}

              {/* Live Waveform Equalizer Display */}
              <div className="p-5 rounded-2xl bg-ink-900/80 border border-amber-400/30 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Radio size={15} className={isCapturing ? "text-amber-400 animate-pulse" : "text-ink-400"} />
                    <span className="font-semibold text-white text-xs">Live Audio Input Waveform</span>
                  </div>
                  <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full ${
                    isCapturing ? "bg-emerald-400/20 text-emerald-300 border border-emerald-400/30" : "bg-ink-800 text-ink-400"
                  }`}>
                    {isCapturing ? `Volume: ${volumeLevel}%` : "Inactive"}
                  </span>
                </div>

                {/* Animated Equalizer Bars */}
                <div className="h-20 rounded-xl bg-ink-950/80 border border-white/10 p-3 flex items-end justify-center gap-1 sm:gap-2">
                  {[...Array(24)].map((_, i) => {
                    const variance = isCapturing ? Math.max(8, Math.min(100, Math.round(volumeLevel * (0.4 + 0.6 * Math.sin(i * 0.45))))) : 6;
                    const isHigh = variance > 60;
                    const isMedium = variance > 25;
                    return (
                      <div
                        key={i}
                        style={{ height: `${variance}%` }}
                        className={`flex-1 rounded-t transition-all duration-75 ${
                          !isCapturing
                            ? "bg-white/10"
                            : isHigh
                            ? "bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.6)]"
                            : isMedium
                            ? "bg-amber-400 shadow-[0_0_8px_rgba(247,210,104,0.5)]"
                            : "bg-emerald-400/80"
                        }`}
                      />
                    );
                  })}
                </div>

                {/* Live Volume Meter Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-ink-400 font-mono">
                    <span>Mute (0%)</span>
                    <span>Optimal (30% - 70%)</span>
                    <span>Peak (100%)</span>
                  </div>
                  <div className="h-3 rounded-full bg-ink-950 border border-white/10 overflow-hidden relative">
                    <div
                      style={{ width: `${volumeLevel}%` }}
                      className={`h-full transition-all duration-100 ${
                        volumeLevel > 75
                          ? "bg-gradient-to-r from-amber-400 to-red-500"
                          : "bg-gradient-to-r from-emerald-400 via-amber-400 to-amber-500"
                      }`}
                    />
                  </div>
                </div>

                <p className="text-[11px] text-ink-300 text-center">
                  {isCapturing
                    ? "🗣️ Speak or tap your microphone — the gold & green bars above should animate in response."
                    : "Click 'Start Live Mic Test' above to verify your microphone responds in real-time."}
                </p>
              </div>

              {/* Hardware Device Selection */}
              {deviceList.length > 0 && (
                <div>
                  <label className="block text-[11px] font-semibold text-ink-300 mb-1">
                    Detected Audio Input Device
                  </label>
                  <select
                    value={selectedDeviceId}
                    onChange={(e) => {
                      setSelectedDeviceId(e.target.value);
                      if (isCapturing) {
                        setTimeout(() => startHardwareCapture(), 100);
                      }
                    }}
                    className="w-full h-9 rounded-xl bg-ink-900 border border-amber-400/30 px-3 text-xs text-amber-200 focus:outline-none focus:ring-1 focus:ring-amber-400 cursor-pointer"
                  >
                    {deviceList.map((dev, idx) => (
                      <option key={dev.deviceId || idx} value={dev.deviceId}>
                        {dev.label || `Microphone ${idx + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SPEECH-TO-TEXT TEST */}
          {activeTab === "speech" && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl border bg-ink-900/60 border-amber-400/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white text-xs">Web Speech Engine:</span>
                    <span className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold ${
                      isWebSpeechSupported
                        ? "bg-emerald-400/20 text-emerald-300 border border-emerald-400/30"
                        : "bg-red-400/20 text-red-300 border border-red-400/30"
                    }`}>
                      {isWebSpeechSupported ? "Supported (Chrome/Edge/Brave)" : "Unsupported Browser"}
                    </span>
                  </div>
                  <p className="text-[11px] text-ink-300">
                    Live speech recognition transcribes spoken Tamil & English into document search queries.
                  </p>
                </div>

                {/* Language Switcher for Speech Test */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTestLang("ta-IN");
                      if (onSelectLang) onSelectLang("ta-IN");
                      if (isTestingSpeech) stopSpeechTest();
                    }}
                    className={`py-1.5 px-3 rounded-xl border text-xs font-semibold cursor-pointer transition ${
                      testLang === "ta-IN"
                        ? "bg-amber-400 text-ink-950 border-amber-300 font-bold shadow-sm"
                        : "bg-ink-900 border-white/10 text-ink-300 hover:text-white"
                    }`}
                  >
                    🇮🇳 தமிழ் (Tamil)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTestLang("en-US");
                      if (onSelectLang) onSelectLang("en-US");
                      if (isTestingSpeech) stopSpeechTest();
                    }}
                    className={`py-1.5 px-3 rounded-xl border text-xs font-semibold cursor-pointer transition ${
                      testLang === "en-US"
                        ? "bg-amber-400 text-ink-950 border-amber-300 font-bold shadow-sm"
                        : "bg-ink-900 border-white/10 text-ink-300 hover:text-white"
                    }`}
                  >
                    🇬🇧 English
                  </button>
                </div>
              </div>

              {/* Speech Test Control & Live Box */}
              <div className="p-5 rounded-2xl bg-ink-900/80 border border-amber-400/30 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white text-xs flex items-center gap-1.5">
                    <Mic size={15} className={isTestingSpeech ? "text-red-400 animate-pulse" : "text-amber-400"} />
                    <span>Live Speech Recognition Stream ({testLang === "ta-IN" ? "தமிழ்" : "English"})</span>
                  </span>

                  <button
                    onClick={isTestingSpeech ? stopSpeechTest : startSpeechTest}
                    className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition cursor-pointer ${
                      isTestingSpeech
                        ? "bg-red-500/25 border border-red-400 text-red-300 animate-pulse"
                        : "bg-amber-400/20 border border-amber-400/50 hover:bg-amber-400 text-amber-300 hover:text-ink-950"
                    }`}
                  >
                    {isTestingSpeech ? (
                      <>
                        <Square size={13} className="fill-current" />
                        <span>Stop Listening</span>
                      </>
                    ) : (
                      <>
                        <Play size={13} className="fill-current" />
                        <span>Test Voice Recognition</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Live Transcript Output Container */}
                <div className={`min-h-24 p-4 rounded-xl bg-ink-950/90 border transition-all ${
                  isTestingSpeech ? "border-amber-400/60 ring-2 ring-amber-400/30" : "border-white/10"
                }`}>
                  {speechTranscript || interimText ? (
                    <div className="space-y-1">
                      <p className="text-white text-sm leading-relaxed font-medium">
                        {speechTranscript}
                        <span className="text-amber-400/80 italic">{interimText}</span>
                      </p>
                      <span className="inline-block text-[10px] text-emerald-400 font-mono mt-2">
                        ✓ Transcribed in real-time
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-6 text-center text-ink-400">
                      <p className="text-xs">
                        {isTestingSpeech
                          ? testLang === "ta-IN"
                            ? "🎙️ கேளுங்கள்... இப்போது தமிழில் பேசுங்கள் (எ.கா: 'வணக்கம், ஆவண சுருக்கம் என்ன?')"
                            : "🎙️ Listening... Speak now (e.g. 'What are the main insights?')"
                          : "Click 'Test Voice Recognition' above and speak into your microphone."}
                      </p>
                    </div>
                  )}
                </div>

                {/* Suggested Sample Phrases to Speak */}
                <div className="p-3 rounded-xl bg-ink-950/50 border border-white/5 space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                    Recommended Test Phrases to Try Speaking:
                  </span>
                  {testLang === "ta-IN" ? (
                    <div className="flex flex-wrap gap-2 text-[11px] text-amber-200/90">
                      <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10">
                        "வணக்கம் டாக்சோரா, இந்த ஆவணத்தின் சுருக்கம் என்ன?"
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10">
                        "முக்கிய புள்ளிவிவரங்களை விளக்குங்கள்"
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2 text-[11px] text-amber-200/90">
                      <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10">
                        "Summarize the key findings of this report"
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10">
                        "What are the main financial action items?"
                      </span>
                    </div>
                  )}
                </div>

                {speechErrorMessage && (
                  <div className="p-3 rounded-xl bg-red-500/20 border border-red-400/40 text-red-200 text-xs">
                    {speechErrorMessage}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: VOICE PLAYBACK (ECHO TEST) */}
          {activeTab === "echo" && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-ink-900/80 border border-amber-400/30 space-y-4">
                <div>
                  <h4 className="font-semibold text-white text-xs mb-1">
                    5-Second Voice Recording & Echo Check
                  </h4>
                  <p className="text-ink-300 text-[11px] leading-relaxed">
                    Record a 5-second audio clip and play it back through your speakers. If you can clearly hear your own voice, your microphone hardware, drivers, and browser permissions are working properly.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <button
                    onClick={isRecordingEcho ? stopEchoRecording : startEchoRecording}
                    className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition ${
                      isRecordingEcho
                        ? "bg-red-500 text-white animate-pulse"
                        : "bg-gradient-to-r from-amber-400 to-amber-600 text-ink-950 hover:brightness-110 shadow-[0_0_15px_rgba(247,210,104,0.3)]"
                    }`}
                  >
                    {isRecordingEcho ? (
                      <>
                        <Square size={14} className="fill-current" />
                        <span>Recording... ({echoSecondsLeft}s left)</span>
                      </>
                    ) : (
                      <>
                        <Mic size={14} />
                        <span>Record 5-Second Voice Sample</span>
                      </>
                    )}
                  </button>

                  {echoAudioUrl && (
                    <button
                      onClick={playEchoAudio}
                      disabled={isPlayingEcho || isRecordingEcho}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400 text-emerald-300 font-bold text-xs flex items-center justify-center gap-2 hover:bg-emerald-500/30 transition cursor-pointer"
                    >
                      <Play size={14} className="fill-current" />
                      <span>{isPlayingEcho ? "Playing Your Voice…" : "Listen to Recorded Voice"}</span>
                    </button>
                  )}
                </div>

                {echoAudioUrl && (
                  <div className="p-3 rounded-xl bg-ink-950/80 border border-emerald-400/30 flex items-center gap-3">
                    <CheckCircle size={18} className="text-emerald-400 shrink-0" />
                    <div>
                      <p className="font-semibold text-white text-xs">Audio Capture Confirmed</p>
                      <p className="text-[11px] text-ink-300">
                        Voice sample successfully recorded. Click 'Listen' above to confirm clarity.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: 1-CLICK FIX GUIDE */}
          {activeTab === "troubleshoot" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-ink-900/60 border border-amber-400/20 space-y-3">
                <h4 className="font-semibold text-white text-xs flex items-center gap-2">
                  <ShieldCheck size={16} className="text-amber-400" />
                  <span>How to Allow Microphone in Google Chrome / Edge</span>
                </h4>
                
                <ol className="list-decimal list-inside space-y-2 text-ink-200 text-xs leading-relaxed">
                  <li>
                    Look at the browser top URL address bar (left of <code className="text-amber-300 font-mono">{typeof window !== "undefined" ? window.location.origin : "URL"}</code>).
                  </li>
                  <li>
                    Click the <strong>Padlock (🔒)</strong> or <strong>Site Settings (🎚️)</strong> button.
                  </li>
                  <li>
                    Locate <strong>Microphone</strong> and switch it from <em>Block</em> to <strong className="text-emerald-400">Allow</strong>.
                  </li>
                  <li>
                    Refresh the page or click <strong>Start Live Mic Test</strong> on Tab 1.
                  </li>
                </ol>
              </div>

              <div className="p-4 rounded-xl bg-ink-900/60 border border-white/10 space-y-3">
                <h4 className="font-semibold text-white text-xs flex items-center gap-2">
                  <Sliders size={16} className="text-amber-400" />
                  <span>Windows 10 / 11 Microphone Privacy Settings</span>
                </h4>
                <p className="text-[11px] text-ink-300 leading-relaxed">
                  If your browser says microphone is allowed but no audio is received:
                </p>
                <ul className="list-disc list-inside space-y-1.5 text-ink-200 text-xs">
                  <li>Open Windows <strong>Settings &gt; Privacy &amp; security &gt; Microphone</strong>.</li>
                  <li>Ensure <strong>"Microphone access"</strong> is turned <strong>ON</strong>.</li>
                  <li>Ensure <strong>"Let desktop apps access your microphone"</strong> is turned <strong>ON</strong>.</li>
                  <li>Check that your headset or microphone is not muted via a physical inline mute switch.</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-amber-400/20 bg-ink-900/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-ink-400">Current Language:</span>
            <span className="text-xs font-bold text-amber-300 font-mono">
              {testLang === "ta-IN" ? "🇮🇳 தமிழ் (Tamil)" : "🇬🇧 English"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (onSelectLang) onSelectLang(testLang);
                onClose();
              }}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-ink-950 font-bold text-xs cursor-pointer hover:brightness-110 shadow-sm"
            >
              Done &amp; Ready
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
