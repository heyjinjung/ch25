// src/pages/home/components/SeollalHeroBanner.tsx
// 설날 테마 히어로 배너 - 조명 효과 포함
import { useRef, useEffect } from "react";
import gsap from "gsap";
import styles from "./SeollalHeroBanner.module.css";

export function SeollalHeroBanner() {
  const bannerRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  // 조명 효과 - 랜덤 플리커
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
      {/* 조명 글로우 효과 */}
      <div
        ref={glowRef}
        className={`absolute inset-0 pointer-events-none ${styles.glow}`}
      />

      {/* 전통 문양 패턴 (미묘한 배경) */}
      <div
        className={`absolute inset-0 pointer-events-none opacity-5 ${styles.pattern}`}
      />

      {/* 콘텐츠 */}
      <div className="relative z-10 p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {/* 로고 */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">복</span>
              <span
                className={`text-xs font-bold tracking-widest ${styles.logoText}`}
              >
                CC CASINO
              </span>
            </div>

            {/* 타이틀 */}
            <h2 className={`text-xl font-bold mb-1 ${styles.title}`}>
              설날 특별 이벤트
            </h2>
            <p className="text-sm text-zinc-400">새해 복 많이 받으세요! 🧧</p>

            {/* XP 표시 */}
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
            🎁 복주머니 받기
          </button>
        </div>
      </div>

      {/* 금박 테두리 효과 */}
      <div
        className={`absolute inset-0 pointer-events-none rounded-2xl ${styles.goldFrame}`}
      />
    </div>
  );
}
