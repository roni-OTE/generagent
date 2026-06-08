"use client";

import { useEffect, useRef } from "react";

type OrbSize = "hero" | "thinking" | "status";

interface OrbProps {
  size?: OrbSize;
  className?: string;
  /** When true, orb follows the cursor across the viewport */
  cursorFollow?: boolean;
}

/**
 * Aurora Orb — the signature visual element.
 * 5-layer volumetric sphere with breath, soul wander, and optional cursor tracking.
 * Pure CSS animations; cursor tracking is JS only (lerp).
 */
export default function Orb({ size = "hero", className = "", cursorFollow = true }: OrbProps) {
  const orbRef = useRef<HTMLDivElement>(null);
  const soulTrackRef = useRef<HTMLDivElement>(null);
  const specTrackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!cursorFollow) return;
    const orb = orbRef.current;
    const soul = soulTrackRef.current;
    const spec = specTrackRef.current;
    if (!orb || !soul || !spec) return;

    let tX = 0, tY = 0, cX = 0, cY = 0;
    let raf: number | null = null;

    function onMove(e: MouseEvent) {
      if (!orb) return;
      const r = orb.getBoundingClientRect();
      const ox = r.left + r.width / 2;
      const oy = r.top + r.height / 2;
      const dx = e.clientX - ox;
      const dy = e.clientY - oy;
      tX = Math.max(-1, Math.min(1, dx / (window.innerWidth * 0.5)));
      tY = Math.max(-1, Math.min(1, dy / (window.innerHeight * 0.5)));
      if (!raf) raf = requestAnimationFrame(loop);
    }

    function loop() {
      cX += (tX - cX) * 0.08;
      cY += (tY - cY) * 0.08;
      const tiltX = cY * -6;
      const tiltY = cX * 6;
      const moveX = cX * 14;
      const moveY = cY * 10;
      if (orb) {
        orb.style.transform = `perspective(900px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) translate3d(${moveX}px, ${moveY}px, 0)`;
      }
      if (soul) soul.style.transform = `translate3d(${cX * 14}%, ${cY * 10}%, 0)`;
      if (spec) spec.style.transform = `translate3d(${cX * 8}%, ${cY * 6}%, 0)`;
      if (Math.abs(tX - cX) > 0.002 || Math.abs(tY - cY) > 0.002) {
        raf = requestAnimationFrame(loop);
      } else {
        raf = null;
      }
    }
    function onLeave() {
      tX = 0; tY = 0;
      if (!raf) raf = requestAnimationFrame(loop);
    }
    window.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("mouseleave", onLeave);
    return () => {
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [cursorFollow]);

  return (
    <div
      ref={orbRef}
      className={`orb orb-${size} ${className}`}
      style={{ transformStyle: "preserve-3d", willChange: "transform" }}
    >
      <div className="orb-haze" />
      <div className="orb-rim" />
      <div className="orb-sphere" />
      <div ref={soulTrackRef} className="orb-track">
        <div className="orb-soul" />
      </div>
      <div className="orb-flow" />
      <div ref={specTrackRef} className="orb-track">
        <div className="orb-spec" />
      </div>
      <style jsx>{`
        .orb {
          position: relative;
          transition: transform 400ms var(--ease);
        }
        .orb-hero { width: 280px; height: 280px; }
        .orb-thinking { width: 38px; height: 38px; }
        .orb-status { width: 20px; height: 20px; }

        .orb-track {
          position: absolute; inset: 0;
          pointer-events: none;
          will-change: transform;
          transition: transform 150ms linear;
        }

        .orb-haze {
          position: absolute; inset: -120%;
          background: radial-gradient(circle, rgba(192,132,252,0.20) 0%, rgba(94,106,210,0.12) 30%, transparent 65%);
          border-radius: 50%; filter: blur(40px);
          animation: haze-pulse 4.5s ease-in-out infinite;
        }
        @keyframes haze-pulse {
          0%, 100% { transform: scale(0.85); opacity: 0.5; }
          50% { transform: scale(1.25); opacity: 1; }
        }

        .orb-rim {
          position: absolute; inset: -8%; border-radius: 50%;
          background: radial-gradient(circle, transparent 60%, rgba(192,132,252,0.30) 75%, rgba(94,106,210,0.18) 85%, transparent 100%);
          filter: blur(2px);
          animation: rim-pulse 4.5s ease-in-out infinite;
        }
        @keyframes rim-pulse {
          0%, 100% { opacity: 0.4; transform: scale(0.97); }
          50% { opacity: 1; transform: scale(1.04); }
        }

        .orb-sphere {
          position: absolute; inset: 0; border-radius: 50%;
          background:
            radial-gradient(circle at 38% 30%, rgba(255,255,255,0.35) 0%, transparent 18%),
            radial-gradient(circle at 38% 30%, rgba(245,230,211,0.45) 0%, rgba(192,132,252,0.20) 25%, transparent 50%),
            radial-gradient(circle at 50% 50%, #4B56B8 0%, #2E3478 50%, #1A1F4F 85%, #0A0E2A 100%);
          box-shadow:
            inset -25px -35px 80px rgba(0,0,0,0.7),
            inset 20px 20px 60px rgba(192,132,252,0.15),
            0 0 80px rgba(94,106,210,0.5),
            0 0 160px rgba(192,132,252,0.2);
          animation: orb-breathe 4.5s ease-in-out infinite;
        }
        @keyframes orb-breathe {
          0%, 100% { transform: scale(0.93); }
          50% { transform: scale(1.07); }
        }

        .orb-soul {
          position: absolute; inset: 18%; border-radius: 50%;
          background: radial-gradient(circle at 50% 50%, rgba(192,132,252,0.8) 0%, rgba(94,106,210,0.4) 40%, transparent 70%);
          filter: blur(8px); mix-blend-mode: screen;
          animation: soul-wander 5s ease-in-out infinite;
        }
        @keyframes soul-wander {
          0%, 100% { transform: translate(0%, 0%) scale(0.8); opacity: 0.6; }
          25% { transform: translate(15%, -10%) scale(1.0); opacity: 0.95; }
          50% { transform: translate(-8%, 12%) scale(1.1); opacity: 1.0; }
          75% { transform: translate(-15%, -5%) scale(0.9); opacity: 0.8; }
        }

        .orb-flow {
          position: absolute; inset: 2%; border-radius: 50%;
          background:
            radial-gradient(ellipse 60% 80% at 30% 70%, rgba(192,132,252,0.35) 0%, transparent 50%),
            radial-gradient(ellipse 50% 70% at 70% 30%, rgba(103,232,249,0.20) 0%, transparent 45%),
            radial-gradient(ellipse 70% 50% at 50% 80%, rgba(94,106,210,0.30) 0%, transparent 50%);
          mix-blend-mode: screen; filter: blur(4px);
          animation: flow-shift 6s linear infinite;
        }
        @keyframes flow-shift {
          0% { transform: rotate(0deg) scale(1.0); }
          50% { transform: rotate(180deg) scale(1.15); }
          100% { transform: rotate(360deg) scale(1.0); }
        }

        .orb-spec {
          position: absolute; top: 22%; left: 32%; width: 18%; height: 14%;
          background: radial-gradient(ellipse, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.4) 30%, transparent 60%);
          border-radius: 50%; filter: blur(3px);
          animation: spec-shimmer 4.5s ease-in-out infinite;
        }
        @keyframes spec-shimmer {
          0%, 100% { opacity: 0.5; transform: translate(0,0) scale(0.85); }
          50% { opacity: 1; transform: translate(8%, -4%) scale(1.1); }
        }
      `}</style>
    </div>
  );
}
