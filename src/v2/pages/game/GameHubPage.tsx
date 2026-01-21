// src/v2/pages/game/GameHubPage.tsx
// V2 게임허브 페이지 - 설날(Seollal) 테마
import { useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import { Ticket, Trophy, Sparkles, Dice1, Gift, Users } from "lucide-react";

// 설날 테마 컬러
const SEOLLAL = {
  background: "#0A0A0C",
  card: "#18181B",
  festiveRed: "#C41E3A",
  gold: "#D4AF37",
  lanternYellow: "#FFD700",
  textCream: "#F5F5DC",
  textMuted: "#71717A",
};

// 게임 데이터
const GAMES = [
  {
    id: "roulette",
    title: "룰렛 경품",
    subtitle: "행운의 바퀴를 돌려보세요!",
    icon: "🎰",
    href: "/v2/game/roulette",
    gradient: "linear-gradient(135deg, #1a4d2e 0%, #0d2818 100%)",
    badge: { text: "HOT", color: "#C41E3A" },
    description: "다양한 보상을 획득할 수 있는 룰렛",
    tickets: { type: "ROULETTE", icon: Ticket },
  },
  {
    id: "dice",
    title: "주사위 게임",
    subtitle: "딜러와 1:1 승부!",
    icon: "🎲",
    href: "/v2/game/dice",
    gradient: "linear-gradient(135deg, #1a3d4d 0%, #0d1828 100%)",
    badge: null,
    description: "딜러보다 높은 숫자를 굴려라",
    tickets: { type: "DICE", icon: Dice1 },
  },
  {
    id: "lottery",
    title: "복권",
    subtitle: "긁어서 보상 확인!",
    icon: "🎟️",
    href: "/v2/game/lottery",
    gradient: "linear-gradient(135deg, #4d3d1a 0%, #281808 100%)",
    badge: null,
    description: "퍼즐 조각을 모아 큰 상품 획득",
    tickets: { type: "LOTTERY", icon: Gift },
  },
  {
    id: "team-battle",
    title: "팀배틀",
    subtitle: "팀원들과 함께 승리하세요!",
    icon: "🤝",
    href: "/v2/team-battle",
    gradient: "linear-gradient(135deg, #2d1a4d 0%, #180828 100%)",
    badge: { text: "NEW", color: "#22C55E" },
    description: "팀 대전으로 순위 경쟁",
    tickets: { type: "TEAM", icon: Users },
  },
];

export default function GameHubPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  // GSAP 페이지 진입 애니메이션
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: { ease: "power2.out" },
      });

      // Step 1: 헤더 페이드 인
      tl.from(".page-header", {
        y: -60,
        opacity: 0,
        duration: 0.8,
      })
        // Step 2: 부제목 슬라이드
        .from(
          ".page-subtitle",
          {
            y: 20,
            opacity: 0,
            duration: 0.7,
          },
          "-=0.4",
        )
        // Step 3: 게임 카드 stagger (핵심!) - 더 길게
        .from(
          ".game-hub-card",
          {
            y: 50,
            opacity: 0,
            scale: 0.92,
            duration: 0.9,
            stagger: {
              each: 0.25,
              from: "start",
            },
            ease: "back.out(1.2)",
          },
          "-=0.3",
        )
        // Step 4: 배지 팝
        .from(
          ".game-badge",
          {
            scale: 0,
            duration: 0.5,
            stagger: 0.18,
            ease: "back.out(1.8)",
          },
          "-=0.5",
        );

      // 연등 효과 - 글로우 흔들림
      gsap.to(".lantern-glow", {
        opacity: gsap.utils.random(0.4, 0.8),
        scale: gsap.utils.random(0.98, 1.02),
        duration: gsap.utils.random(1.5, 2.5),
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  // 카드 호버 효과
  const handleCardEnter = (e: React.MouseEvent<HTMLAnchorElement>) => {
    gsap.to(e.currentTarget, {
      y: -8,
      scale: 1.02,
      boxShadow: `0 12px 40px rgba(212, 175, 55, 0.2)`,
      duration: 0.3,
      ease: "power2.out",
    });
  };

  const handleCardLeave = (e: React.MouseEvent<HTMLAnchorElement>) => {
    gsap.to(e.currentTarget, {
      y: 0,
      scale: 1,
      boxShadow: "0 4px 16px rgba(0, 0, 0, 0.3)",
      duration: 0.25,
      ease: "power1.in",
    });
  };

  return (
    <div
      ref={containerRef}
      className="min-h-screen px-4 py-6 pb-24 bg-[#0A0A0C]"
    >
      {/* 연등 글로우 배경 효과 */}
      <div
        className="lantern-glow fixed inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, rgba(255, 215, 0, 0.08) 0%, transparent 50%)`,
        }}
      />

      {/* 헤더 */}
      <header ref={headerRef} className="relative z-10 mb-8">
        <div className="flex items-center gap-3 page-header">
          <span className="text-3xl">🎮</span>
          <h1 className="text-2xl font-bold tracking-tight text-[#F5F5DC]">
            게임 허브
          </h1>
          <span className="text-2xl">🧧</span>
        </div>
        <p className="page-subtitle mt-2 text-sm text-[#71717A]">
          새해 복 많이 받으세요! 행운의 게임에 도전해보세요
        </p>
      </header>

      {/* 게임 카드 그리드 */}
      <div ref={cardsRef} className="relative z-10 space-y-4">
        {GAMES.map((game) => (
          <Link
            key={game.id}
            to={game.href}
            className="game-hub-card block relative overflow-hidden rounded-2xl transition-all"
            style={{
              background: game.gradient,
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.3)",
              border: `1px solid rgba(212, 175, 55, 0.15)`,
            }}
            onMouseEnter={handleCardEnter}
            onMouseLeave={handleCardLeave}
          >
            {/* 배지 */}
            {game.badge && (
              <span
                className="game-badge absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold text-white z-20"
                style={{ backgroundColor: game.badge.color }}
              >
                {game.badge.text}
              </span>
            )}

            {/* 전통 문양 패턴 (미묘한 배경) */}
            <div
              className="absolute inset-0 pointer-events-none opacity-5"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 0L30 10L20 20L10 10z' fill='%23D4AF37'/%3E%3C/svg%3E")`,
                backgroundSize: "20px 20px",
              }}
            />

            {/* 콘텐츠 */}
            <div className="relative z-10 p-5 flex items-center gap-4">
              {/* 아이콘 */}
              <div className="flex-shrink-0 w-16 h-16 rounded-xl flex items-center justify-center text-4xl bg-black/30 border-[1px] border-[rgba(212,175,55,0.2)]">
                {game.icon}
              </div>

              {/* 텍스트 */}
              <div className="flex-1 min-w-0">
                <h3
                  className="text-lg font-bold truncate"
                  style={{ color: SEOLLAL.textCream }}
                >
                  {game.title}
                </h3>
                <p className="text-sm truncate" style={{ color: SEOLLAL.gold }}>
                  {game.subtitle}
                </p>
                <p
                  className="text-xs mt-1 truncate"
                  style={{ color: SEOLLAL.textMuted }}
                >
                  {game.description}
                </p>
              </div>

              {/* 플레이 버튼 */}
              <div className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium bg-[#C41E3A] text-[#F5F5DC] shadow-[0_4px_12px_rgba(196,30,58,0.4)]">
                플레이
              </div>
            </div>

            {/* 하단 빛 효과 */}
            <div
              className="absolute bottom-0 left-0 right-0 h-1"
              style={{
                background: `linear-gradient(90deg, transparent, ${SEOLLAL.gold}30, transparent)`,
              }}
            />
          </Link>
        ))}
      </div>

      {/* 하단 정보 */}
      <div
        className="relative z-10 mt-8 p-4 rounded-xl text-center"
        style={{
          backgroundColor: SEOLLAL.card,
          border: `1px solid rgba(212, 175, 55, 0.1)`,
        }}
      >
        <div className="flex items-center justify-center gap-2 mb-2">
          <Sparkles className="w-4 h-4" style={{ color: SEOLLAL.gold }} />
          <span className="text-sm font-medium" style={{ color: SEOLLAL.gold }}>
            설날 특별 보너스
          </span>
          <Sparkles className="w-4 h-4" style={{ color: SEOLLAL.gold }} />
        </div>
        <p className="text-xs" style={{ color: SEOLLAL.textMuted }}>
          설날 기간 동안 모든 게임 보상이 20% 증가합니다!
        </p>
        <div className="flex justify-center gap-4 mt-3">
          <div
            className="flex items-center gap-1 text-xs"
            style={{ color: SEOLLAL.textMuted }}
          >
            <Trophy className="w-3 h-3" style={{ color: SEOLLAL.gold }} />
            <span>추가 XP</span>
          </div>
          <div
            className="flex items-center gap-1 text-xs"
            style={{ color: SEOLLAL.textMuted }}
          >
            <Gift className="w-3 h-3" style={{ color: SEOLLAL.festiveRed }} />
            <span>복주머니 드롭</span>
          </div>
        </div>
      </div>
    </div>
  );
}
