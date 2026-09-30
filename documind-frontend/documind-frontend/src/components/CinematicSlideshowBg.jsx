import { useState, useEffect, useRef } from "react";
import RoyalVideoEngine from "./RoyalVideoEngine";

const defaultSlides = [
  {
    id: "neural-matrix",
    image: "/hero-bg-1.jpg",
    title: "Neural Matrix",
  },
  {
    id: "holographic-archives",
    image: "/hero-bg-2.jpg",
    title: "Holographic Archives",
  },
  {
    id: "sovereign-wave",
    image: "/hero-bg-3.jpg",
    title: "Sovereign Wave",
  },
];

export default function CinematicSlideshowBg({ opacity = "opacity-65", brightness = "brightness-[0.58]" }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const slideDuration = 6500;

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((curr) => (curr + 1) % defaultSlides.length);
    }, slideDuration);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden select-none">
      {/* 1. Cinematic Slideshow with Ken Burns Motion */}
      {defaultSlides.map((slide, index) => {
        const isActive = index === currentSlide;
        return (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              isActive ? opacity : "opacity-0"
            }`}
          >
            <img
              src={slide.image}
              alt={slide.title}
              className={`w-full h-full object-cover object-center filter ${brightness} contrast-[1.12] saturate-[1.15] transform transition-transform duration-[7500ms] ease-out ${
                isActive ? "scale-110 translate-y-[-1.5%]" : "scale-100"
              }`}
            />
          </div>
        );
      })}

      {/* 2. Interactive Real-Time Royal GPU Video Particle Engine */}
      <RoyalVideoEngine mode={currentSlide} isPlaying={true} />

      {/* 3. Dark Obsidian & Gold Atmospheric Vignettes */}
      <div className="absolute inset-0 bg-gradient-to-b from-ink-950/80 via-ink-950/50 to-ink-950/90" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_75%_65%_at_50%_35%,rgba(7,6,4,0.60)_0%,rgba(7,6,4,0.30)_50%,rgba(7,6,4,0.90)_100%)]" />
      <div className="absolute inset-0 bg-grid opacity-15 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_10%,black_50%,transparent_100%)]" />

      {/* Floating Ambient Glowing Lights */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-[500px] w-[750px] rounded-full bg-amber-500/10 blur-[140px] animate-pulse-glow pointer-events-none" />
      <div className="absolute top-40 -left-20 h-[300px] w-[300px] rounded-full bg-yellow-400/8 blur-[100px] animate-float-slow pointer-events-none" />
      <div className="absolute top-60 -right-20 h-[320px] w-[320px] rounded-full bg-amber-600/10 blur-[120px] animate-float-reverse pointer-events-none" />
    </div>
  );
}
