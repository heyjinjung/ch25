import { useLayoutEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useSound } from "../../../hooks/useSound";
import gsap from "gsap";
import "./HomeRedesign.css";

export default function HomePage() {
  const { playTabTouch } = useSound();
  const gridRef = useRef<HTMLDivElement>(null);

  const gridCols = 18;
  const gridRows = 14;

  const verticalLinePositions = [
    "left-[0%]",
    "left-[5.88%]",
    "left-[11.76%]",
    "left-[17.65%]",
    "left-[23.53%]",
    "left-[29.41%]",
    "left-[35.29%]",
    "left-[41.18%]",
    "left-[47.06%]",
    "left-[52.94%]",
    "left-[58.82%]",
    "left-[64.71%]",
    "left-[70.59%]",
    "left-[76.47%]",
    "left-[82.35%]",
    "left-[88.24%]",
    "left-[94.12%]",
    "left-[100%]",
  ];

  const horizontalLinePositions = [
    "top-[0%]",
    "top-[7.69%]",
    "top-[15.38%]",
    "top-[23.08%]",
    "top-[30.77%]",
    "top-[38.46%]",
    "top-[46.15%]",
    "top-[53.85%]",
    "top-[61.54%]",
    "top-[69.23%]",
    "top-[76.92%]",
    "top-[84.62%]",
    "top-[92.31%]",
    "top-[100%]",
  ];

  const verticalLines = useMemo(
    () => Array.from({ length: gridCols }, (_, idx) => idx),
    [],
  );
  const horizontalLines = useMemo(
    () => Array.from({ length: gridRows }, (_, idx) => idx),
    [],
  );

  useLayoutEffect(() => {
    if (!gridRef.current) return;

    const root = gridRef.current;
    const vLines = Array.from(
      root.querySelectorAll<HTMLElement>(".gridwave-line--v"),
    );
    const hLines = Array.from(
      root.querySelectorAll<HTMLElement>(".gridwave-line--h"),
    );
    const allLines = [...vLines, ...hLines];

    let rafId = 0;

    const ctx = gsap.context(() => {
      gsap.set(allLines, { willChange: "transform,opacity,filter" });

      const animateWave = (progress: number) => {
        const p = Math.min(1, Math.max(0, progress));
        const wobble = 5 + 9 * Math.abs(Math.sin(p * Math.PI));
        const glow = 8 + 14 * Math.abs(Math.sin(p * Math.PI));

        gsap.killTweensOf(allLines);

        gsap.to(vLines, {
          x: (i) => Math.sin(p * 6 + i * 0.38) * wobble,
          opacity: (i) => 0.18 + 0.3 * Math.abs(Math.sin(p * 4 + i * 0.11)),
          duration: 0.55,
          ease: "sine.out",
          stagger: { each: 0.01, from: "center" },
        });

        gsap.to(hLines, {
          y: (i) => Math.sin(p * 6 + i * 0.38) * (wobble * 0.9),
          opacity: (i) => 0.18 + 0.3 * Math.abs(Math.sin(p * 4 + i * 0.11)),
          duration: 0.55,
          ease: "sine.out",
          stagger: { each: 0.01, from: "center" },
        });

        gsap.to(allLines, {
          filter: `drop-shadow(0 0 ${glow}px rgba(182, 255, 0, 0.55)) drop-shadow(0 0 ${
            glow * 0.45
          }px rgba(37, 173, 130, 0.45))`,
          duration: 0.55,
          ease: "sine.out",
        });
      };

      const onScroll = () => {
        const doc = document.documentElement;
        const max = Math.max(1, doc.scrollHeight - window.innerHeight);
        const progress = window.scrollY / max;
        animateWave(progress);
      };

      const onScrollRaf = () => {
        if (rafId) return;
        rafId = window.requestAnimationFrame(() => {
          rafId = 0;
          onScroll();
        });
      };

      window.addEventListener("scroll", onScrollRaf, { passive: true });
      onScroll();

      return () => {
        window.removeEventListener("scroll", onScrollRaf);
        if (rafId) window.cancelAnimationFrame(rafId);
      };
    }, gridRef);

    return () => ctx.revert();
  }, []);

  const navigate = useNavigate();

  return (
    <div className="home-container-v2">
      <div className="home-bg-overlay" />

      <div className="home-gridwave" ref={gridRef} aria-hidden="true">
        {verticalLines.map((idx) => (
          <div
            key={`v-${idx}`}
            className={`gridwave-line gridwave-line--v ${verticalLinePositions[idx]}`}
          />
        ))}
        {horizontalLines.map((idx) => (
          <div
            key={`h-${idx}`}
            className={`gridwave-line gridwave-line--h ${horizontalLinePositions[idx]}`}
          />
        ))}
      </div>

      <div className="home-content">
        {/* Featured Section (Now at top) */}
        <div className="home-featured-section">
          <div className="featured-header">
            {/* STREAK EVENT label removed */}
          </div>
          <div className="featured-card">
            <div className="featured-content-inner">
              <span className="featured-sub-text">CC CASINO</span>
              <h2 className="featured-main-title">NEW UPDATE 2026 FEB</h2>
            </div>
          </div>
        </div>

        {/* Quick Access Tiles */}
        <div className="home-quick-grid">
          <div
            className="quick-card"
            onClick={() => {
              playTabTouch();
              navigate("/v2/game/dice");
            }}
          >
            <img
              src="/v2/assets/01home/1.png"
              alt="quick access 1"
              className="quick-card-img"
            />
          </div>
          <div
            className="quick-card"
            onClick={() => {
              playTabTouch();
              navigate("/v2/game/roulette");
            }}
          >
            <img
              src="/v2/assets/01home/2.png"
              alt="quick access 2"
              className="quick-card-img"
            />
          </div>
          <div
            className="quick-card"
            onClick={() => {
              playTabTouch();
              navigate("/v2/game/lottery");
            }}
          >
            <img
              src="/v2/assets/01home/3.png"
              alt="quick access 3"
              className="quick-card-img"
            />
          </div>
          <div
            className="quick-card"
            onClick={() => {
              playTabTouch();
              navigate("/v2/game");
            }}
          >
            <img
              src="/v2/assets/01home/8.png"
              alt="quick access 4"
              className="quick-card-img"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
