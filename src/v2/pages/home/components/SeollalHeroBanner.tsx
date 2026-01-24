// src/pages/home/components/SeollalHeroBanner.tsx
// ?�날 ?�마 ?�어�?배너 - ?�등 ?�과 ?�함
import { useRef, useEffect } from "react";
import gsap from "gsap";
import styles from "./SeollalHeroBanner.module.css";

export function SeollalHeroBanner() {
  const bannerRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  // ?�등 ?�과 - ?�?�??�??�들�?
  useEffect(() => {
    if (!glowRef.current) return;

    const anim = gsap.to(glowRef.current, {
      opacity: gsap.utils.random(0.6, 1),
      scale: gsap.utils.random(0.98, 1.02),
      duration: gsap.utils.random(1.5, 2.5),
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
    });

    return () => {
      anim.kill();
    };
  }, []);

  return (
    <div
      ref={bannerRef}
      className={`relative overflow-hidden rounded-2xl ${styles.banner}`}
    >
      {/* ?�등 글로우 ?�과 */}
      <div
        ref={glowRef}
        className={`absolute inset-0 pointer-events-none ${styles.glow}`}
      />

      {/* ?�통 문양 ?�턴 (미묘??배경) */}
      <div
        className={`absolute inset-0 pointer-events-none opacity-5 ${styles.pattern}`}
      />

      {/* 콘텐�?*/}
      <div className="relative z-10 p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {/* 로고 */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">?��</span>
              <span
                className={`text-xs font-bold tracking-widest ${styles.logoText}`}
              >
                CC CASINO
              </span>
            </div>

            {/* ?�?��? */}
            <h2 className={`text-xl font-bold mb-1 ${styles.title}`}>
              ?�날 ?�별 ?�벤??
            </h2>
            <p className="text-sm text-zinc-400">?�해 �?많이 받으?�요! ?��</p>

            {/* XP ?�시 */}
            <div className="flex items-center gap-2 mt-3">
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${styles.xpBadge}`}
              >
                +20 XP
              </span>
            </div>
          </div>

          {/* CTA 버튼 */}
          <button
            className={`flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium transition-all hover:scale-105 ${styles.ctaButton}`}
          >
            ?�� 복주머니 받기
          </button>
        </div>
      </div>

      {/* 금박 ?�두�??�과 */}
      <div
        className={`absolute inset-0 pointer-events-none rounded-2xl ${styles.goldFrame}`}
      />
    </div>
  );
}
