// src/v2/pages/game/GameHubPage.tsx
// V2 게임허브 페이지 - Framer Motion 기반 부드러운 애니메이션
import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import gsap from "gsap";
import { Trophy, Sparkles, Gift } from "lucide-react";
import "./GameHubPage.css";
import hubBg1 from "../../assets/png/hub (1).png";
import hubBg2 from "../../assets/png/hub (2).png";
import hubBg3 from "../../assets/png/hub (3).png";
import hubBg4 from "../../assets/png/hub (4).png";
import hub2Layer1 from "../../assets/svg/hub2 (1).svg";
import hub2Layer2 from "../../assets/svg/hub2 (2).svg";
import hub2Layer3 from "../../assets/svg/hub2 (3).svg";
import hub2Layer4 from "../../assets/svg/hub2 (4).svg";

// 게임 데이터
const GAMES = [
  {
    id: "roulette",
    title: "룰렛 경품",
    href: "/v2/game/roulette",
    bgImage: hubBg1,
    overlayImage: hub2Layer1,
    gradient:
      "linear-gradient(135deg, rgba(26, 77, 46, 0.7) 0%, rgba(13, 40, 24, 0.9) 100%)",
  },
  {
    id: "dice",
    title: "주사위 게임",
    href: "/v2/game/dice",
    bgImage: hubBg2,
    overlayImage: hub2Layer2,
    gradient:
      "linear-gradient(135deg, rgba(26, 61, 77, 0.7) 0%, rgba(13, 24, 40, 0.9) 100%)",
  },
  {
    id: "lottery",
    title: "복권",
    href: "/v2/game/lottery",
    bgImage: hubBg3,
    overlayImage: hub2Layer3,
    gradient:
      "linear-gradient(135deg, rgba(77, 61, 26, 0.7) 0%, rgba(40, 24, 8, 0.9) 100%)",
  },
  {
    id: "team-battle",
    title: "팀배틀",
    href: "/v2/team-battle",
    bgImage: hubBg4,
    overlayImage: hub2Layer4,
    gradient:
      "linear-gradient(135deg, rgba(45, 26, 77, 0.7) 0%, rgba(24, 8, 40, 0.9) 100%)",
  },
];

// Framer Motion 애니메이션 설정 - 매우 느리고 부드럽게
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.8, // 각 자식 요소 간격 0.8초
      delayChildren: 0.3,
    },
  },
};

const cardVariants = {
  hidden: {
    y: 80,
    opacity: 0,
    scale: 0.9,
  },
  visible: {
    y: 0,
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 40,
      damping: 15,
      duration: 1.2,
    },
  },
};

const infoCardVariants = {
  hidden: { y: 60, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 50,
      damping: 20,
      delay: 0.3,
    },
  },
};

export default function GameHubPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRefs = useRef<Array<HTMLImageElement | null>>([]);

  useEffect(() => {
    const overlayElements = overlayRefs.current;

    overlayElements.forEach((el, index) => {
      if (!el) return;
      gsap.killTweensOf(el);
      gsap.set(el, { transformOrigin: "50% 50%" });

      if (index === 0) {
        gsap.to(el, {
          rotation: 360,
          duration: 16,
          ease: "none",
          repeat: -1,
        });
        return;
      }

      if (index === 1) {
        gsap.to(el, {
          y: -6,
          duration: 1.6,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
        });
        return;
      }

      if (index === 2) {
        gsap.fromTo(
          el,
          { scale: 0.7, opacity: 0.6 },
          {
            scale: 1,
            opacity: 1,
            duration: 1.4,
            ease: "power2.out",
            repeat: -1,
            yoyo: true,
          },
        );
        return;
      }

      gsap.to(el, {
        scale: 1.04,
        duration: 2.2,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
      });
    });

    return () => {
      overlayElements.forEach((el) => {
        if (el) gsap.killTweensOf(el);
      });
    };
  }, []);

  return (
    <motion.div
      ref={containerRef}
      className="min-h-full px-4 pb-6 bg-[#0A0A0C] overflow-hidden"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* 게임 카드 그리드 */}
      <div className="relative z-10 space-y-4">
        {GAMES.map((game) => (
          <motion.div
            key={game.id}
            variants={cardVariants}
            whileHover={{
              y: -8,
              scale: 1.02,
              boxShadow: "0 20px 60px rgba(212, 175, 55, 0.25)",
              transition: { duration: 0.3 },
            }}
            whileTap={{ scale: 0.98 }}
            className="flex justify-center"
          >
            <Link
              to={game.href}
              className={`gamehub-card gamehub-card--${game.id} block relative overflow-hidden rounded-3xl w-[375px] h-[130px]`}
            >
              {/* 배경 이미지 */}
              {game.bgImage && (
                <img
                  src={game.bgImage}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover opacity-60"
                  draggable={false}
                />
              )}
              {/* 글라스 하이라이트 오버레이 */}
              <div className="gamehub-card__highlight absolute inset-0 pointer-events-none" />

              {/* 중앙 레이어 이미지 */}
              {game.overlayImage && (
                <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                  <img
                    ref={(el) => {
                      overlayRefs.current[
                        game.id === "roulette"
                          ? 0
                          : game.id === "dice"
                            ? 1
                            : game.id === "lottery"
                              ? 2
                              : 3
                      ] = el;
                    }}
                    src={game.overlayImage}
                    alt=""
                    className="h-[85%] w-[85%] object-contain"
                    draggable={false}
                  />
                </div>
              )}

              {/* badge removed per request */}

              {/* 콘텐츠 */}
              <div className="relative z-20 p-5">
                {/* 텍스트 */}
                <h3 className="text-lg font-bold truncate text-[#F5F5DC]">
                  {game.title}
                </h3>

                {/* 플레이 버튼 (우측 하단 배치) */}
                <motion.div
                  className="gamehub-play-button absolute bottom-4 right-4 px-5 py-2 rounded-full text-xs font-black text-[#F5F5DC]"
                  whileHover={{
                    scale: 1.1,
                    boxShadow: "0 6px 24px rgba(196, 30, 58, 0.7)",
                  }}
                  whileTap={{ scale: 0.95 }}
                >
                  플레이
                </motion.div>
              </div>

              {/* 하단 빛 효과 */}
              <motion.div
                className="gamehub-card__line absolute bottom-0 left-0 right-0 h-[2px]"
                animate={{
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </Link>
          </motion.div>
        ))}
      </div>

      {/* 하단 정보 카드 - 글라스모피즘 */}
      <motion.div
        className="gamehub-info-card relative z-10 mt-8 p-5 rounded-2xl text-center overflow-hidden"
        variants={infoCardVariants}
      >
        {/* 글라스 하이라이트 */}
        <div className="gamehub-info-card__highlight absolute inset-0 pointer-events-none" />

        <div className="relative z-10">
          <motion.div
            className="flex items-center justify-center gap-2 mb-2"
            animate={{
              filter: [
                "drop-shadow(0 0 4px #D4AF37)",
                "drop-shadow(0 0 12px #D4AF37)",
                "drop-shadow(0 0 4px #D4AF37)",
              ],
            }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <Sparkles className="w-4 h-4 text-[#D4AF37]" />
            <span className="text-sm font-medium text-[#D4AF37]">
              설날 특별 보너스
            </span>
            <Sparkles className="w-4 h-4 text-[#D4AF37]" />
          </motion.div>
          {/* Seollal bonus note removed per request */}
          <div className="flex justify-center gap-4 mt-3">
            <div className="flex items-center gap-1 text-xs text-[#71717A]">
              <Trophy className="w-3 h-3 text-[#D4AF37]" />
              <span>추가 XP</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-[#71717A]">
              <Gift className="w-3 h-3 text-[#C41E3A]" />
              <span>복주머니 드롭</span>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
