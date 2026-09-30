import { useEffect, useRef, useState } from "react";

export default function CustomEffects() {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [cursorPos, setCursorPos] = useState({ x: -100, y: -100 });
  const [isHovered, setIsHovered] = useState(false);
  const [isClicking, setIsClicking] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const canvasRef = useRef(null);
  const particlesRef = useRef([]);

  // Scroll Progress calculation
  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        const currentProgress = (window.scrollY / totalHeight) * 100;
        setScrollProgress(currentProgress);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Cursor Movement & Stardust Particle Spawner
  useEffect(() => {
    let lastX = -100;
    let lastY = -100;

    const handleMouseMove = (e) => {
      const { clientX: x, clientY: y } = e;
      setCursorPos({ x, y });
      if (!isVisible) setIsVisible(true);

      const dx = x - lastX;
      const dy = y - lastY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Spawn stardust sparkle particles on movement
      if (dist > 3) {
        const count = Math.min(3, Math.max(1, Math.floor(dist / 12)));
        for (let i = 0; i < count; i++) {
          const isStar = Math.random() > 0.45;
          particlesRef.current.push({
            x: x + (Math.random() - 0.5) * 8,
            y: y + (Math.random() - 0.5) * 8,
            size: isStar ? Math.random() * 4 + 2.5 : Math.random() * 2.5 + 1.2,
            alpha: 1,
            maxAlpha: Math.random() * 0.4 + 0.6,
            speedX: (Math.random() - 0.5) * 1.2 - dx * 0.04,
            speedY: (Math.random() - 0.5) * 1.2 - dy * 0.04 + 0.2,
            color: Math.random() > 0.35 ? "#f7d268" : Math.random() > 0.5 ? "#ffd700" : "#ffffff",
            decay: Math.random() * 0.025 + 0.02,
            rotation: Math.random() * Math.PI,
            rotSpeed: (Math.random() - 0.5) * 0.1,
            isStar,
          });
        }
        lastX = x;
        lastY = y;
      }

      // Check if hovering interactive elements
      const target = e.target;
      if (
        target &&
        (target.closest("button") ||
          target.closest("a") ||
          target.closest("input") ||
          target.closest("select") ||
          target.closest("[tabindex]") ||
          target.closest(".cursor-pointer") ||
          target.closest(".card-flip-scene"))
      ) {
        setIsHovered(true);
      } else {
        setIsHovered(false);
      }
    };

    const handleMouseLeave = () => setIsVisible(false);
    const handleMouseEnter = () => setIsVisible(true);

    const handleMouseDown = (e) => {
      setIsClicking(true);
      // Burst of sparkling stardust on click
      const { clientX: x, clientY: y } = e;
      for (let i = 0; i < 10; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 2.5 + 1;
        particlesRef.current.push({
          x,
          y,
          size: Math.random() * 4 + 2,
          alpha: 1,
          maxAlpha: 1,
          speedX: Math.cos(angle) * speed,
          speedY: Math.sin(angle) * speed,
          color: Math.random() > 0.3 ? "#f7d268" : "#ffffff",
          decay: Math.random() * 0.03 + 0.02,
          rotation: Math.random() * Math.PI,
          rotSpeed: (Math.random() - 0.5) * 0.15,
          isStar: true,
        });
      }
    };

    const handleMouseUp = () => setIsClicking(false);

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    document.body.addEventListener("mouseleave", handleMouseLeave);
    document.body.addEventListener("mouseenter", handleMouseEnter);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      document.body.removeEventListener("mouseleave", handleMouseLeave);
      document.body.removeEventListener("mouseenter", handleMouseEnter);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isVisible]);

  // High-performance 60fps Stardust Particle Canvas Loop
  useEffect(() => {
    let animId;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Draw 4-point star sparkle
    const drawStar = (cx, cy, spikes, outerRadius, innerRadius, color, alpha, rot) => {
      let rotStep = (Math.PI / spikes);
      let x = cx;
      let y = cy;

      ctx.save();
      ctx.beginPath();
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      ctx.moveTo(0, -outerRadius);

      for (let i = 0; i < spikes; i++) {
        x = Math.cos(i * 2 * rotStep - Math.PI / 2) * outerRadius;
        y = Math.sin(i * 2 * rotStep - Math.PI / 2) * outerRadius;
        ctx.lineTo(x, y);

        x = Math.cos((i * 2 + 1) * rotStep - Math.PI / 2) * innerRadius;
        y = Math.sin((i * 2 + 1) * rotStep - Math.PI / 2) * innerRadius;
        ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
      ctx.globalAlpha = alpha;
      ctx.fill();
      ctx.restore();
    };

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const particles = particlesRef.current;

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.speedX;
        p.y += p.speedY;
        p.rotation += p.rotSpeed;
        p.alpha -= p.decay;

        if (p.alpha <= 0) {
          particles.splice(i, 1);
          continue;
        }

        if (p.isStar) {
          drawStar(p.x, p.y, 4, p.size * 1.5, p.size * 0.4, p.color, p.alpha, p.rotation);
        } else {
          ctx.save();
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 6;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  // Dynamic Scroll Reveal Observer
  useEffect(() => {
    const observedElements = new WeakSet();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );

    const scanAndObserve = () => {
      const elements = document.querySelectorAll(".reveal-on-scroll");
      elements.forEach((el) => {
        if (!observedElements.has(el)) {
          observedElements.add(el);
          observer.observe(el);
        }
      });
    };

    scanAndObserve();
    const mutationObserver = new MutationObserver(scanAndObserve);
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutationObserver.disconnect();
    };
  }, []);

  return (
    <>
      {/* Scroll Progress Bar at the top of page */}
      <div className="fixed top-0 left-0 right-0 h-1 z-[9999] pointer-events-none bg-white/5">
        <div
          className="h-full bg-gradient-to-r from-amber-400 via-amber-300 to-amber-600 shadow-[0_0_15px_rgba(247,210,104,0.7)] transition-all duration-150 ease-out"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* Stardust Trail Particle Canvas */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-[9997]"
      />

      {/* Sleek Golden Stardust Cursor Core */}
      {isVisible && (
        <div
          className={`fixed top-0 left-0 rounded-full z-[9999] pointer-events-none -translate-x-1/2 -translate-y-1/2 transition-transform duration-75 hidden md:block ${
            isHovered
              ? "w-3.5 h-3.5 bg-amber-300 shadow-[0_0_20px_#f7d268] scale-125"
              : "w-2.5 h-2.5 bg-amber-400 shadow-[0_0_14px_#f7d268] scale-100"
          } ${isClicking ? "scale-75 brightness-150" : ""}`}
          style={{
            transform: `translate3d(${cursorPos.x}px, ${cursorPos.y}px, 0)`,
          }}
        />
      )}
    </>
  );
}
