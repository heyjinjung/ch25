// src/v2/pages/home/components/GameCard.tsx
// 개별 게임 카드 - GSAP 호버 효과 포함
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { Link } from "react-router-dom";

interface GameCardProps {
  id: string;
  title: string;
  icon: string;
  gradientClass: string;
  badge?: string;
  badgeClass?: string;
  href: string;
  layers?: {
    main: string;
    fixed: string;
    effect: string;
    effectMotion: "expand" | "floatX" | "sparkle" | "fixed";
  };
  bgMain?: string;
  bgAccent?: string;
}

export function GameCard({
  id: _id,
  title,
  icon,
  gradientClass,
  badge,
  badgeClass,
  href,
  layers,
  bgMain,
  bgAccent,
}: GameCardProps) {
  const cardRef = useRef<HTMLAnchorElement>(null);
  const badgeRef = useRef<HTMLSpanElement>(null);
  const mainLayerRef = useRef<HTMLImageElement>(null);
  const effectLayerRef = useRef<HTMLImageElement>(null);

  // 호버 효과
  const handleMouseEnter = () => {
    if (!cardRef.current) return;
    gsap.to(cardRef.current, {
      y: -4,
      scale: 1.02,
      boxShadow: "0 8px 24px rgba(212, 175, 55, 0.15)",
      duration: 0.25,
      ease: "power2.out",
    });
  };

  const handleMouseLeave = () => {
    if (!cardRef.current) return;
    gsap.to(cardRef.current, {
      y: 0,
      scale: 1,
      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
      duration: 0.2,
      ease: "power1.in",
    });
  };

  useEffect(() => {
    if (badgeRef.current) {
      gsap.to(badgeRef.current, {
        scale: 1.1,
        duration: 0.5,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    }

    if (layers?.main && mainLayerRef.current) {
      gsap.to(mainLayerRef.current, {
        y: -6,
        duration: 1.4,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    }

    if (layers?.effect && effectLayerRef.current) {
      // 'fixed' 모션은 레이어 애니메이션을 생략합니다.
      if (layers.effectMotion === "fixed") {
        // 고정: 아무 애니메이션도 적용하지 않음
      } else if (layers.effectMotion === "expand") {
        gsap.to(effectLayerRef.current, {
          scale: 1.05,
          duration: 2.2,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });
      } else if (layers.effectMotion === "floatX") {
        gsap.to(effectLayerRef.current, {
          x: 6,
          duration: 2,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });
      } else if (layers.effectMotion === "sparkle") {
        gsap.to(effectLayerRef.current, {
          opacity: 0.4,
          duration: 1.2,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });
      }
    }

    return () => {
      if (badgeRef.current) gsap.killTweensOf(badgeRef.current);
      if (mainLayerRef.current) gsap.killTweensOf(mainLayerRef.current);
      if (effectLayerRef.current) gsap.killTweensOf(effectLayerRef.current);
    };
  }, [layers, badge]);

  return (
    <Link
      ref={cardRef}
      to={href}
      className={`game-card relative block rounded-2xl overflow-hidden aspect-square ${gradientClass} shadow-[0_2px_8px_rgba(0,0,0,0.3)]`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* 배지 */}
      {badge && (
        <span
          ref={badgeRef}
          className={`absolute top-3 right-3 px-2 py-0.5 rounded-full text-xs font-bold text-white ${badgeClass ?? "bg-zinc-700"}`}
        >
          {badge}
        </span>
      )}

      {/* 로고 */}
      <div className="absolute top-3 left-3 opacity-60">
        <span className="text-xs font-bold text-white/50">CC</span>
      </div>

      {/* 배경: 글라스 효과용 SVG 레이어 */}
      {(bgMain || bgAccent) && (
        <div className="absolute inset-0 z-0 overflow-hidden rounded-2xl">
          {bgMain && (
            <img
              src={bgMain}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-30 transform scale-105"
              draggable={false}
            />
          )}
          {bgAccent && (
            <img
              src={bgAccent}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-20 mix-blend-screen"
              draggable={false}
            />
          )}
          <div className="absolute inset-0 pointer-events-none rounded-2xl border border-white/8 bg-white/5 backdrop-blur-sm z-20" />
        </div>
      )}

      {/* 레이어 SVG */}
      {layers ? (
        <div className="absolute inset-0 z-10">
          <img
            src={layers.fixed}
            alt=""
            className="absolute inset-0 h-full w-full object-contain"
            draggable={false}
          />
          <img
            ref={mainLayerRef}
            src={layers.main}
            alt=""
            className="absolute inset-0 h-full w-full object-contain"
            draggable={false}
          />
          <img
            ref={effectLayerRef}
            src={layers.effect}
            alt=""
            className="absolute inset-0 h-full w-full object-contain"
            draggable={false}
          />
        </div>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
          <span className="text-4xl mb-2">{icon}</span>
          <h3 className="text-lg font-bold text-white">{title}</h3>
        </div>
      )}

      {/* CTA removed as requested */}

      {/* 미묘한 빛 효과 */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(180deg,_rgba(255,255,255,0.05)_0%,_transparent_30%)]" />
    </Link>
  );
}
