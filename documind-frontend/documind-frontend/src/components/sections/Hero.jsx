import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { 
  ArrowRight, Crown, FileSearch, MessagesSquare, Zap, Activity, 
  ChevronLeft, ChevronRight, Play, Pause, Film, Sparkles, Maximize2, 
  X, CheckCircle2, Sliders, Layers
} from "lucide-react";
import Button from "../Button";
import RoyalVideoEngine from "../RoyalVideoEngine";

const heroSlides = [
  {
    id: "neural-matrix",
    image: "/hero-bg-1.jpg",
    title: "Neural Matrix",
    tagline: "Live Holographic Document Parsing",
    desc: "Autonomous deep-layer OCR and vector mapping across enterprise knowledge bases.",
    accent: "Amber Gold",
    badge: "SCENE 01 // 60 FPS GPU ENGINE",
    stats: { speed: "0.24s", accuracy: "99.8%", mode: "Vector Matrix" }
  },
  {
    id: "holographic-archives",
    image: "/hero-bg-2.jpg",
    title: "Holographic Archives",
    tagline: "Conversational Document Intelligence",
    desc: "Multi-document synthesized dialogue with zero hallucination and verifiable citations.",
    accent: "Imperial Yellow",
    badge: "SCENE 02 // NEURAL CHAT",
    stats: { speed: "0.18s", accuracy: "100%", mode: "Sovereign Context" }
  },
  {
    id: "sovereign-wave",
    image: "/hero-bg-3.jpg",
    title: "Sovereign Wave",
    tagline: "Structured Sovereign Data Engine",
    desc: "Real-time automated briefing generation, entity extraction, and executive summaries.",
    accent: "Royal Gold",
    badge: "SCENE 03 // GENERATIVE SUITE",
    stats: { speed: "0.32s", accuracy: "99.9%", mode: "Executive Synthesis" }
  },
];

export default function Hero() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [theaterMode, setTheaterMode] = useState(false);
  const [progress, setProgress] = useState(0);
  const slideDuration = 6500; // 6.5s per scene
  const progressIntervalRef = useRef(null);

  useEffect(() => {
    if (!isPlaying) {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      return;
    }

    const stepTime = 50; // update progress every 50ms
    const stepIncrement = (stepTime / slideDuration) * 100;

    progressIntervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setCurrentSlide((curr) => (curr + 1) % heroSlides.length);
          return 0;
        }
        return prev + stepIncrement;
      });
    }, stepTime);

    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [isPlaying, currentSlide]);

  const goToSlide = (idx) => {
    setCurrentSlide(idx);
    setProgress(0);
  };

  const nextSlide = () => {
    goToSlide((currentSlide + 1) % heroSlides.length);
  };

  const prevSlide = () => {
    goToSlide((currentSlide - 1 + heroSlides.length) % heroSlides.length);
  };

  const togglePlay = () => {
    setIsPlaying((prev) => !prev);
  };

  return (
    <section className="relative overflow-hidden pt-36 pb-28 px-5 sm:px-8 min-h-[95vh] flex flex-col justify-center">
      {/* 1. Cinematic Background Video Slideshow with Ken Burns Motion */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden select-none">
        {heroSlides.map((slide, index) => {
          const isActive = index === currentSlide;
          return (
            <div
              key={slide.id}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                isActive ? "opacity-65" : "opacity-0"
              }`}
            >
              <img
                src={slide.image}
                alt={slide.title}
                className={`w-full h-full object-cover object-center filter brightness-[0.58] contrast-[1.12] saturate-[1.15] transform transition-transform duration-[7500ms] ease-out ${
                  isActive && isPlaying ? "scale-110 translate-y-[-1.5%]" : "scale-100"
                }`}
              />
            </div>
          );
        })}

        {/* 2. Interactive Real-Time Royal GPU Video Engine (Canvas Particles & Waves) */}
        <RoyalVideoEngine mode={currentSlide} isPlaying={isPlaying} />

        {/* 3. Dark Obsidian & Gold Atmospheric Vignettes (Balanced for optimal legibility) */}
        <div className="absolute inset-0 bg-gradient-to-b from-ink-950/80 via-ink-950/50 to-ink-950/90" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_75%_65%_at_50%_35%,rgba(7,6,4,0.60)_0%,rgba(7,6,4,0.30)_50%,rgba(7,6,4,0.90)_100%)]" />
        <div className="absolute inset-0 bg-grid opacity-15 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_10%,black_50%,transparent_100%)]" />
      </div>

      {/* Floating Ambient Glowing Lights */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-[500px] w-[750px] rounded-full bg-amber-500/10 blur-[140px] animate-pulse-glow pointer-events-none" />
      <div className="absolute top-40 -left-20 h-[300px] w-[300px] rounded-full bg-yellow-400/8 blur-[100px] animate-float-slow pointer-events-none" />
      <div className="absolute top-60 -right-20 h-[320px] w-[320px] rounded-full bg-amber-600/10 blur-[120px] animate-float-reverse pointer-events-none" />

      {/* Main Content Area */}
      <div className="relative mx-auto max-w-4xl text-center z-10">
        
        {/* Royal Welcome Pill Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-500/10 backdrop-blur-md px-4 py-1.5 text-xs text-amber-200 mb-8 shadow-[0_0_25px_rgba(247,210,104,0.25)] hover:border-amber-400/80 transition-all duration-300 hover-wiggle cursor-pointer">
          <Crown size={15} className="text-amber-300 animate-wiggle" />
          <span className="font-medium tracking-wide uppercase">Welcome to Doxora — Royal AI Document Studio</span>
        </div>

        {/* Seamless Logo Showcase Emblem (NO rectangular cutoff box) */}
        <div className="flex items-center justify-center mb-6">
          <div className="relative group max-w-[260px] sm:max-w-[320px]">
            {/* Soft Radial Golden Halo behind emblem */}
            <div className="absolute inset-0 rounded-full bg-radial-gradient from-amber-400/40 via-yellow-400/20 to-transparent blur-3xl group-hover:scale-125 transition-transform duration-700 pointer-events-none" />
            
            {/* Emblem Image with Screen Blending & Feathered Radial Mask */}
            <img
              src="/doxora-logo.png"
              alt="DOXORA Royal Emblem"
              className="relative w-full h-auto object-contain mx-auto mix-blend-screen transition-all duration-500 group-hover:scale-105 filter drop-shadow-[0_0_30px_rgba(230,184,59,0.6)] [mask-image:radial-gradient(ellipse_75%_55%_at_center,black_45%,transparent_85%)]"
            />
          </div>
        </div>

        {/* Royal Welcome Headline */}
        <h1 className="font-display text-4xl sm:text-7xl font-extrabold tracking-[0.12em] leading-[1.1] text-gold-royal uppercase drop-shadow-[0_4px_24px_rgba(0,0,0,0.95)] drop-shadow-[0_0_40px_rgba(230,184,59,0.35)]">
          Welcome to Doxora
        </h1>

        <p className="mt-4 text-xs sm:text-sm font-semibold tracking-[0.3em] uppercase text-amber-300 drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]">
          The Royal AI Document Studio
        </p>

        <p className="mt-6 text-base sm:text-lg text-ink-200/95 max-w-2xl mx-auto leading-relaxed drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]">
          Upload any PDF, DOCX, or Markdown file. Doxora summarizes it, answers
          questions with deep context, pulls out structured data, and drafts new
          documents — with regal speed and intelligence.
        </p>

        {/* Call to Actions */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button size="lg" as={Link} to="/login?mode=signup" className="group shadow-[0_0_35px_rgba(230,184,59,0.6)] hover-shake border border-amber-300/40">
            Start for free <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform duration-200" />
          </Button>
          
          <button
            onClick={() => setTheaterMode(true)}
            className="flex items-center gap-2.5 px-6 py-3 rounded-xl border border-amber-400/40 bg-ink-900/80 backdrop-blur-md text-amber-200 text-sm font-semibold tracking-wider uppercase hover:border-amber-300 hover:bg-amber-500/15 hover:text-amber-100 transition-all duration-300 shadow-[0_0_20px_rgba(230,184,59,0.2)] hover-wiggle cursor-pointer"
          >
            <Film size={17} className="text-amber-400" />
            Watch Showreel
          </button>
        </div>

        {/* Feature Badges */}
        <div className="mt-14 flex items-center justify-center gap-8 text-ink-400 text-xs">
          <div className="flex items-center gap-2 hover:text-amber-200 transition-colors">
            <FileSearch size={16} className="text-amber-400" /> PDF · DOCX · TXT · Markdown
          </div>
          <div className="hidden sm:flex items-center gap-2 hover:text-amber-200 transition-colors">
            <MessagesSquare size={16} className="text-amber-400" /> Per-document chat memory
          </div>
        </div>
      </div>

      {/* Floating preview card with Doxora Royal Branding */}
      <div className="relative mx-auto mt-16 max-w-4xl animate-float-slow group z-10 w-full">
        {/* Glowing aura around card */}
        <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-amber-500/30 via-yellow-400/20 to-amber-600/30 blur-xl opacity-75 group-hover:opacity-100 transition duration-500" />

        <div className="relative rounded-2xl border border-amber-400/30 bg-ink-800/85 backdrop-blur-xl shadow-[var(--shadow-glow)] p-6 transition-all duration-300 group-hover:scale-[1.01]">
          <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <img src="/doxora-logo.png" alt="Doxora Logo" className="h-6 w-auto mix-blend-screen" />
              <span className="font-display font-bold text-xs text-amber-300 tracking-wider">DOXORA STUDIO</span>
            </div>
            
            {/* Live Mode Indicator */}
            <div className="flex items-center gap-2 text-xs text-amber-300/90 bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20">
              <Activity size={12} className="text-amber-400 animate-pulse" />
              <span>{heroSlides[currentSlide].stats.mode} Online</span>
            </div>
          </div>
          
          <div className="grid sm:grid-cols-2 gap-5 text-left">
            <div className="rounded-xl bg-ink-900/80 border border-amber-400/20 p-4 transition-all hover:border-amber-400/50">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-ink-200">Executive-Briefing.pdf</p>
                <span className="text-[10px] font-semibold text-amber-300 bg-amber-400/15 px-2 py-0.5 rounded border border-amber-400/30">Parsed</span>
              </div>
              <div className="space-y-2.5">
                <div className="h-2 rounded bg-gradient-to-r from-amber-400/40 to-white/10 w-full animate-pulse" />
                <div className="h-2 rounded bg-white/10 w-4/5" />
                <div className="h-2 rounded bg-white/10 w-3/5" />
              </div>
            </div>
            <div className="rounded-xl bg-ink-900/80 border border-amber-400/40 p-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 h-16 w-16 bg-amber-400/10 rounded-full blur-lg" />
              <p className="text-xs font-semibold text-amber-400 mb-2 flex items-center gap-1.5">
                <Zap size={13} className="text-amber-300" /> Doxora Summary
              </p>
              <p className="text-xs text-ink-200 leading-relaxed">
                Q4 revenue increased 24% YoY; Doxora extracted 48 structured entities and drafted the executive report in 12 seconds...
              </p>
            </div>
          </div>
        </div>

        {/* Floating pill highlight */}
        <div className="absolute -bottom-4 -right-4 hidden sm:flex items-center gap-2 rounded-full border border-amber-400/50 bg-ink-900/90 backdrop-blur-md px-3.5 py-1.5 text-xs text-amber-300 shadow-xl animate-float-reverse hover-wiggle cursor-pointer">
          <Crown size={14} className="text-amber-400" /> 100% Precision Intelligence
        </div>
      </div>

      {/* Slideshow plays automatically — no visible controls */}

      {/* Animated Scroll Down Indicator Prompt */}
      <a
        href="#features"
        className="mt-12 flex flex-col items-center justify-center gap-1.5 text-ink-400 hover:text-amber-400 transition-colors animate-bounce-down group cursor-pointer z-10"
        aria-label="Scroll down to features"
      >
        <span className="text-[11px] font-medium tracking-wider uppercase opacity-80 group-hover:opacity-100 text-amber-400/80">Scroll down</span>
        <div className="h-6 w-4 rounded-full border border-amber-500/40 flex items-start justify-center p-1 group-hover:border-amber-400 transition-colors">
          <div className="h-1.5 w-1 rounded-full bg-amber-400 animate-pulse" />
        </div>
      </a>

      {/* 5. Fullscreen Cinematic Theater Mode Modal */}
      {theaterMode && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center p-4 sm:p-8 animate-fade-in">
          {/* Header Controls */}
          <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-20">
            <div className="flex items-center gap-3">
              <img src="/doxora-logo.png" alt="Doxora Logo" className="h-8 w-auto mix-blend-screen" />
              <div>
                <p className="text-xs font-bold text-amber-300 tracking-widest uppercase">DOXORA CINEMATIC SHOWREEL</p>
                <p className="text-[10px] text-ink-400">4K Ultra-Definition AI Document Synthesis</p>
              </div>
            </div>

            <button
              onClick={() => setTheaterMode(false)}
              className="p-2 rounded-full bg-ink-900/80 border border-amber-400/40 text-amber-300 hover:bg-amber-400 hover:text-black transition-all cursor-pointer"
              aria-label="Close Showreel"
            >
              <X size={20} />
            </button>
          </div>

          {/* Cinematic Canvas & Video Viewport */}
          <div className="relative w-full max-w-5xl aspect-video rounded-3xl overflow-hidden border-2 border-amber-400/40 shadow-[0_0_80px_rgba(247,210,104,0.3)] bg-ink-950">
            {heroSlides.map((slide, index) => (
              <div
                key={slide.id}
                className={`absolute inset-0 transition-opacity duration-1000 ${
                  index === currentSlide ? "opacity-100 scale-105" : "opacity-0 scale-100"
                } transition-transform duration-[7000ms]`}
              >
                <img
                  src={slide.image}
                  alt={slide.title}
                  className="w-full h-full object-cover filter brightness-[0.85] contrast-105 saturate-105"
                />
              </div>
            ))}

            {/* Embedded Live Royal Video Particle Waves */}
            <RoyalVideoEngine mode={currentSlide} isPlaying={isPlaying} />

            {/* Cinematic Overlay Vignette */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/40 pointer-events-none" />

            {/* Live Text Overlay on Video */}
            <div className="absolute bottom-8 left-8 right-8 z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div className="max-w-xl">
                <span className="inline-block px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-xs font-semibold uppercase tracking-wider mb-2">
                  {heroSlides[currentSlide].badge}
                </span>
                <h3 className="font-display text-2xl sm:text-4xl font-bold text-white tracking-wide">
                  {heroSlides[currentSlide].title}
                </h3>
                <p className="text-amber-200/90 text-sm mt-1">{heroSlides[currentSlide].tagline}</p>
                <p className="text-ink-400 text-xs mt-2 leading-relaxed">{heroSlides[currentSlide].desc}</p>
              </div>

              {/* Real-time stats display */}
              <div className="flex items-center gap-4 bg-ink-900/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-amber-400/30">
                <div>
                  <p className="text-[10px] text-ink-400 uppercase">Processing</p>
                  <p className="text-sm font-bold text-amber-300">{heroSlides[currentSlide].stats.speed}</p>
                </div>
                <div className="h-6 w-px bg-amber-400/20" />
                <div>
                  <p className="text-[10px] text-ink-400 uppercase">Fidelity</p>
                  <p className="text-sm font-bold text-amber-300">{heroSlides[currentSlide].stats.accuracy}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Theater Bottom Bar */}
          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={togglePlay}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-600 text-ink-950 font-bold text-xs uppercase tracking-wider flex items-center gap-2 hover:brightness-110 transition cursor-pointer"
            >
              {isPlaying ? <Pause size={14} /> : <Play size={14} />}
              {isPlaying ? "Pause Scene" : "Resume Video"}
            </button>
            <button
              onClick={nextSlide}
              className="px-4 py-2.5 rounded-xl bg-ink-900 border border-amber-400/30 text-amber-300 text-xs font-semibold hover:border-amber-400 transition cursor-pointer"
            >
              Next Scene →
            </button>
          </div>
        </div>
      )}
    </section>
  );
}


