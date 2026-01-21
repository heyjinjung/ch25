// src/v2/pages/home/components/SeollalHeroBanner.tsx
// 설날 테마 히어로 배너 - 연등 효과 포함
import { useRef, useEffect } from "react";
import gsap from "gsap";

export function SeollalHeroBanner() {
  const bannerRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  // 연등 효과 - 은은한 빛 흔들림
  useEffect(
    () => {
      if (!glowRef.current) return;

      const anim = gsap.to(glowRef.current, {
        opacity: gsap.utils.random(0.6, 1),
        scale: gsap.utils.random(0.98, 1.02),
        duration: gsap.utils.random(1.5, 2.5),
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
      
      return () => { anim.kill(); };
    },
    []
  );

  return (
    <div
      ref={bannerRef}
      className="relative overflow-hidden rounded-2xl"
      style={{
        background: "linear-gradient(135deg, #1a1a1a 0%, #2d1f1f 50%, #1a1a1a 100%)",
        border: "1px solid rgba(212, 175, 55, 0.3)",
      }}
    >
      {/* 연등 글로우 효과 */}
      <div
        ref={glowRef}
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 30% 20%, rgba(255, 215, 0, 0.15) 0%, transparent 50%)",
        }}
      />

      {/* 전통 문양 패턴 (미묘한 배경) */}
      <div
        className="absolute inset-0 pointer-events-none opacity-5"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0L45 15L30 30L15 15z' fill='%23D4AF37'/%3E%3C/svg%3E")`,
          backgroundSize: "30px 30px",
        }}
      />

      {/* 콘텐츠 */}
      <div className="relative z-10 p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {/* 로고 */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">🧧</span>
              <span
                className="text-xs font-bold tracking-widest"
                style={{ color: "#D4AF37" }}
              >
                CC CASINO
              </span>
            </div>

            {/* 타이틀 */}
            <h2
              className="text-xl font-bold mb-1"
              style={{ color: "#F5F5DC" }}
            >
              설날 특별 이벤트
            </h2>
            <p className="text-sm text-zinc-400">
              새해 복 많이 받으세요! 🎊
            </p>

            {/* XP 표시 */}
            <div className="flex items-center gap-2 mt-3">
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: "rgba(212, 175, 55, 0.2)",
                  color: "#D4AF37",
                }}
              >
                +20 XP
              </span>
            </div>
          </div>

          {/* CTA 버튼 */}
          <button
            className="flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium transition-all hover:scale-105"
            style={{
              backgroundColor: "#C41E3A",
              color: "#F5F5DC",
              boxShadow: "0 4px 12px rgba(196, 30, 58, 0.4)",
            }}
          >
            🧧 복주머니 받기
          </button>
        </div>
      </div>

      {/* 금박 테두리 효과 */}
      <div
        className="absolute inset-0 pointer-events-none rounded-2xl"
        style={{
          border: "1px solid rgba(212, 175, 55, 0.2)",
          boxShadow: "inset 0 0 20px rgba(212, 175, 55, 0.05)",
        }}
      />
    </div>
  );
}
