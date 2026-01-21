// src/v2/pages/home/HomePage.tsx
// V2 홈 화면 - 설날(Seollal) 테마
import { useRef, useEffect } from "react";
import gsap from "gsap";
import { SeollalHeroBanner } from "./components/SeollalHeroBanner";
import { GameCardGrid } from "./components/GameCardGrid";

export default function HomePage() {
  const containerRef = useRef<HTMLDivElement>(null);

  // 페이지 진입 애니메이션
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: { ease: "power2.out" },
      });

      tl
        // Step 3: 히어로 배너 페이드 + 슬라이드
        .from(
          ".hero-banner",
          {
            y: 30,
            opacity: 0,
            duration: 0.5,
          },
          "-=0.1",
        )
        // Step 4: CTA 버튼 stagger
        .from(
          ".cta-buttons button",
          {
            y: 20,
            opacity: 0,
            duration: 0.3,
            stagger: 0.1,
          },
          "-=0.2",
        )
        // Step 5: 게임 카드 그리드 stagger (핵심!)
        .from(
          ".game-card",
          {
            y: 40,
            opacity: 0,
            scale: 0.95,
            duration: 0.4,
            stagger: {
              each: 0.1,
              from: "start",
              grid: [2, 3],
            },
            ease: "back.out(1.2)",
          },
          "-=0.2",
        );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="min-h-full bg-[#0A0A0C]">
      {/* 메인 콘텐츠 */}
      <div className="px-4 pb-0 space-y-4">
        {/* 설날 히어로 배너 */}
        <div className="hero-banner">
          <SeollalHeroBanner />
        </div>

        {/* CTA 버튼 */}
        <div className="cta-buttons flex gap-2 justify-center">
          <button className="flex items-center gap-2 px-4 py-2 rounded-full border border-zinc-700 bg-zinc-900/50 text-zinc-300 text-sm hover:bg-zinc-800 transition-colors">
            <img
              src="/assets/logo_cc_v2.png"
              alt="CC"
              className="h-5 w-5 object-contain"
            />
            씨씨카지노
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-full border border-zinc-700 bg-zinc-900/50 text-zinc-300 text-sm hover:bg-zinc-800 transition-colors">
            <img
              src="/assets/logo_cc_v2.png"
              alt="CC"
              className="h-5 w-5 object-contain"
            />
            씨씨 공식채널
          </button>
        </div>

        {/* 게임 카드 그리드 */}
        <GameCardGrid />
      </div>

      {/* 하단 탭 네비게이션 (V2AppLayout에서 처리) */}
    </div>
  );
}
