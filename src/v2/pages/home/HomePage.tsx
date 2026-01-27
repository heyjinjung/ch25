import { useLayoutEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useSound } from "../../../hooks/useSound";
import gsap from "gsap";
import "./HomeRedesign.css";
import { EncryptedText } from "../../components/ui/EncryptedText";

export default function HomePage() {
  const { playTabTouch } = useSound();
  const navigate = useNavigate();
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
          filter: `drop-shadow(0 0 ${glow}px rgba(182, 255, 0, 0.55)) drop-shadow(0 0 ${glow * 0.45}px rgba(37, 173, 130, 0.45))`,
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
        <div className="home-featured-section">
          <div className="featured-header" />
          <div className="featured-card overflow-hidden">
            <div className="flex flex-col items-center justify-center gap-4">
              <img
                src="/assets/logo_cc_v2.png"
                alt="CC Logo"
                className="h-12 w-auto object-contain drop-shadow-[0_0_15px_rgba(210,253,156,0.4)]"
              />
              <EncryptedText
                text="CC CASINO ONLINE"
                className="featured-sub-text !mb-0 text-white font-black tracking-[0.2em]"
              />
            </div>
          </div>
        </div>

        <div className="home-bento-grid">
          <div
            className="bento-tile bento-tile--wide"
            onClick={() => {
              playTabTouch();
              navigate("/game/dice");
            }}
          >
            <div className="tile-content">
              <span className="tile-title">DICE BATTLE</span>
              <img src="/assets/01home/1.png" alt="dice" className="tile-img" />
            </div>
            <div className="tile-shine" />
          </div>

          <div
            className="bento-tile bento-tile--tall"
            onClick={() => {
              playTabTouch();
              navigate("/game/roulette");
            }}
          >
            <div className="tile-content vertical">
              <span className="tile-title">ROULETTE</span>
              <img
                src="/assets/01home/2.png"
                alt="roulette"
                className="tile-img"
              />
            </div>
          </div>

          <div
            className="bento-tile bento-tile--square"
            onClick={() => {
              playTabTouch();
              navigate("/game/lottery");
            }}
          >
            <img
              src="/assets/01home/3.png"
              alt="lottery"
              className="tile-img-small"
            />
          </div>

          {/* Item 4: Square Card (All Games) */}
          <div
            className="bento-tile bento-tile--square"
            onClick={() => {
              playTabTouch();
              navigate("/game");
            }}
          >
            <img
              src="/assets/01home/8.png"
              alt="all"
              className="tile-img-small"
            />
          </div>
        </div>

        {/* New 3D CTA Buttons Row */}
        <div className="home-cta-row flex gap-4 mt-6">
          <button
            onClick={() => {
              playTabTouch();
              window.open("https://t.me/example_casino", "_blank");
            }}
            className="cta-button cta-button--primary flex items-center gap-2 px-5 py-3 text-lg font-bold"
          >
            <img
              src="/assets/logo_cc_v2.webp"
              alt="CC로고"
              className="h-7 w-7 object-contain mr-1"
            />
            CC카지노
          </button>
          <button
            onClick={() => {
              playTabTouch();
              window.open("https://t.me/example_official", "_blank");
            }}
            className="cta-button cta-button--secondary flex items-center gap-2 px-5 py-3 text-lg font-bold"
          >
            <img
              src="/assets/icon_telegram_button.png"
              alt="텔레그램"
              className="h-7 w-7 object-contain mr-1"
            />
            CC공식텔레
          </button>
        </div>
      </div>
    </div>
  );
}
