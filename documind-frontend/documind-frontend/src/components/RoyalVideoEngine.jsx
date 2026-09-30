import { useEffect, useRef } from "react";

export default function RoyalVideoEngine({ mode = 0, isPlaying = true }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    // Particle System definition
    const particleCount = mode === 0 ? 110 : mode === 1 ? 80 : 130;
    const particles = [];
    const colors = ["#f7d268", "#e6b83b", "#ffd700", "#ffffff", "#c9971a"];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 2.8 + 0.8,
        speedX: (Math.random() - 0.5) * 0.8,
        speedY: mode === 1 ? -Math.random() * 0.9 - 0.2 : (Math.random() - 0.5) * 0.7,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: Math.random() * 0.7 + 0.2,
        pulseSpeed: Math.random() * 0.03 + 0.01,
        pulse: Math.random() * Math.PI,
        // Document / sheet properties for mode 1
        isDoc: mode === 1 && i % 4 === 0,
        docWidth: Math.random() * 32 + 24,
        docHeight: Math.random() * 42 + 32,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.01,
      });
    }

    let time = 0;

    const render = () => {
      if (!isPlaying) {
        animId = requestAnimationFrame(render);
        return;
      }

      time += 0.015;
      ctx.clearRect(0, 0, width, height);

      // Mode 2: Sovereign Wave dynamic gradient ribbons
      if (mode === 2) {
        ctx.save();
        ctx.lineWidth = 1.5;
        for (let j = 0; j < 3; j++) {
          ctx.beginPath();
          const gradient = ctx.createLinearGradient(0, 0, width, 0);
          gradient.addColorStop(0, "rgba(247, 210, 104, 0)");
          gradient.addColorStop(0.5, `rgba(230, 184, 59, ${0.12 - j * 0.03})`);
          gradient.addColorStop(1, "rgba(247, 210, 104, 0)");
          ctx.strokeStyle = gradient;

          for (let x = 0; x < width; x += 15) {
            const y =
              height * 0.45 +
              Math.sin(x * 0.003 + time + j * 0.8) * 80 +
              Math.cos(x * 0.002 - time * 0.5) * 40;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
        ctx.restore();
      }

      // Mode 0: Neural Network Constellations
      if (mode === 0) {
        ctx.lineWidth = 0.6;
        for (let i = 0; i < particles.length; i++) {
          for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x;
            const dy = particles[i].y - particles[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 110) {
              const alpha = (1 - dist / 110) * 0.18;
              ctx.strokeStyle = `rgba(247, 210, 104, ${alpha})`;
              ctx.beginPath();
              ctx.moveTo(particles[i].x, particles[i].y);
              ctx.lineTo(particles[j].x, particles[j].y);
              ctx.stroke();
            }
          }
        }
      }

      // Render Particles and Floating Document Holograms
      particles.forEach((p) => {
        p.x += p.speedX;
        p.y += p.speedY;
        p.pulse += p.pulseSpeed;
        const currentAlpha = Math.max(0.1, p.alpha + Math.sin(p.pulse) * 0.25);

        // Wrap around boundaries
        if (p.x < -40) p.x = width + 40;
        if (p.x > width + 40) p.x = -40;
        if (p.y < -40) p.y = height + 40;
        if (p.y > height + 40) p.y = -40;

        if (p.isDoc) {
          // Floating Holographic Document Page
          p.rotation += p.rotSpeed;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.strokeStyle = `rgba(247, 210, 104, ${currentAlpha * 0.7})`;
          ctx.fillStyle = `rgba(20, 16, 8, ${currentAlpha * 0.35})`;
          ctx.lineWidth = 1;

          // Draw document card
          ctx.beginPath();
          ctx.roundRect(-p.docWidth / 2, -p.docHeight / 2, p.docWidth, p.docHeight, 4);
          ctx.fill();
          ctx.stroke();

          // Document golden text lines
          ctx.strokeStyle = `rgba(247, 210, 104, ${currentAlpha * 0.4})`;
          ctx.lineWidth = 1.2;
          for (let l = 0; l < 3; l++) {
            ctx.beginPath();
            ctx.moveTo(-p.docWidth * 0.35, -p.docHeight * 0.2 + l * 8);
            ctx.lineTo(p.docWidth * 0.35, -p.docHeight * 0.2 + l * 8);
            ctx.stroke();
          }

          ctx.restore();
        } else {
          // Shimmering Golden Star / Particle with soft glow
          ctx.save();
          ctx.shadowBlur = 10;
          ctx.shadowColor = p.color;
          ctx.fillStyle = p.color;
          ctx.globalAlpha = currentAlpha;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      });

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
    };
  }, [mode, isPlaying]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-[1]"
    />
  );
}
