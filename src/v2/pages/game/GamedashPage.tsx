import { useLayoutEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "../../lib/utils";
import {
  useV2DiceStatus,
  useV2RouletteStatus,
  useV2LotteryStatus,
} from "../../hooks/useV2Game";
import gsap from "gsap";
import "./GamedashPage.css";

import { motion } from "framer-motion";
import { MatrixText } from "../../components/ui/MatrixText";
import { MouseEffectCard } from "../../components/ui/MouseEffectCard";
import { BackgroundPaths } from "../../components/effects/BackgroundPaths";
import { Meteors } from "../../components/effects/Meteors";
import { BorderBeam } from "../../components/ui/BorderBeam";

const ASSET_PATH = "/assets/02gamedash";

const GAMES = [
  { id: "dice", to: "/game/dice", icon: `${ASSET_PATH}/Group 12.png`, color: "from-blue-500/20" },
  { id: "rocket", to: "/game/roulette", icon: `${ASSET_PATH}/Group 13.png`, color: "from-purple-500/20" },
  { id: "ball", to: "/game/lottery", icon: `${ASSET_PATH}/Group 14.png`, color: "from-emerald-500/20" },
  { id: "crown", to: "/team-battle", icon: `${ASSET_PATH}/Group 15.png`, color: "from-amber-500/20" },
  { id: "missions", to: "/v2/missions?cat=DAILY", icon: `/assets/01login/treasure.png`, label: "Mission Hub", color: "from-emerald-500/20" },
  { id: "tower", to: "/v2/missions?cat=LEVEL", icon: `/assets/01login/Ellipse 374.svg`, label: "Glory Tower", color: "from-blue-600/20" },
];

export default function GamedashPage() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const diceStatusQuery = useV2DiceStatus();
  const rouletteStatusQuery = useV2RouletteStatus();
  const lotteryStatusQuery = useV2LotteryStatus();

  const noticeItems = useMemo(() => {
    const diceRemaining = diceStatusQuery.data?.remaining_plays;
    const rouletteRemaining = rouletteStatusQuery.data?.remaining_spins;
    const lotteryRemaining = lotteryStatusQuery.data?.remaining_tickets;

    const toText = (label: string, value?: number) =>
      `${label} 잔여 ${
        typeof value === "number" ? value.toLocaleString() : "-"
      }회`;

    return [
      toText("룰렛", rouletteRemaining),
      toText("주사위", diceRemaining),
      toText("복권", lotteryRemaining),
    ];
  }, [
    diceStatusQuery.data?.remaining_plays,
    rouletteStatusQuery.data?.remaining_spins,
    lotteryStatusQuery.data?.remaining_tickets,
  ]);

  const getGameBadge = (gameId: string) => {
    if (gameId === "dice") return diceStatusQuery.data?.remaining_plays;
    if (gameId === "rocket") return rouletteStatusQuery.data?.remaining_spins;
    if (gameId === "ball") return lotteryStatusQuery.data?.remaining_tickets;
    return undefined;
  };

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      // Shimmer Effect Timeline
      const tlShimmer = gsap.timeline({ repeat: -1, repeatDelay: 3 });
      tlShimmer.fromTo(
        ".card-shine",
        { x: "-150%", skewX: -20 },
        { x: "400%", duration: 1.5, ease: "power2.inOut", stagger: 0.1 },
      );

      // Vertical Notice Animation (3 lines visible, rotating)
      const itemHeight = 32; // Changed to match css
      const totalItems = 3;
      const tlNotice = gsap.timeline({ repeat: -1 });

      // Animate up by one item at a time
      for (let i = 1; i <= totalItems; i++) {
        tlNotice.to(".notice-wrapper", {
          y: -itemHeight * i,
          duration: 1,
          ease: "power2.inOut",
          delay: 2,
        });
      }

      // Seamless reset to top (items are duplicated in JSX)
      tlNotice.set(".notice-wrapper", { y: 0 });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div className="relative min-h-tg bg-[#09090B] overflow-x-hidden pt-[var(--header-offset)] pb-[var(--nav-offset)]" ref={containerRef}>
      <BackgroundPaths count={30} className="fixed inset-0 opacity-60 pointer-events-none" />
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_0%,rgba(16,185,129,0.08),transparent_70%)]" />
      <div className="fixed inset-0 pointer-events-none bg-gradient-to-b from-transparent via-emerald-950/2 to-[#09090B]" />

      <div className="relative z-10 px-5 pb-10 max-w-lg mx-auto h-full flex flex-col">
        {/* Magic UI Hero Card */}
        <motion.div 
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           className="relative mt-2 mb-6"
        >
          <div className="magic-hero-card !bg-neutral-900/40 !border-white/10 overflow-hidden backdrop-blur-md">
            <div className="absolute inset-0 z-0 opacity-20">
                <Meteors number={12} />
            </div>
            <BorderBeam size={250} duration={15} colorFrom="#10b981" colorTo="#3b82f6" />
            
            <div className="magic-hero-content relative z-10 pt-6 pb-4">
              <div className="magic-hero-left">
                <motion.span 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-[10px] font-black text-emerald-500/80 uppercase tracking-[0.3em] mb-2 block"
                >
                  <MatrixText text="CC CASINO V2" />
                </motion.span>
                <h1 className="text-3xl font-black text-white leading-[1.1] mb-4">
                    <MatrixText text="GRAND OPEN" /><br/>
                    <span className="text-[#9AFFFA] italic">
                        <MatrixText text="SUPER EVENT" />
                    </span>
                </h1>
                
                <div className="magic-stat-row">
                   <div className="notice-container" style={{ width: '100%', background: 'transparent', height: '32px' }}>
                      <div className="notice-wrapper">
                        {noticeItems.map((text, idx) => (
                          <div key={`notice-${idx}`} className="notice-item" style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>
                            {text}
                          </div>
                        ))}
                      </div>
                    </div>
                </div>
              </div>

              <motion.img
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.3 }}
                src={`${ASSET_PATH}/Ellipse 374.svg`}
                className="character-img"
                alt="character"
                style={{ width: '110px', filter: 'drop-shadow(0 0 20px rgba(154,255,250,0.3))' }}
              />
            </div>
          </div>
        </motion.div>

        {/* Gaming Bento Grid */}
        <div className="grid grid-cols-2 gap-3 mb-10">
          {GAMES.map((game, idx) => (
            <motion.div
              key={game.id}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <MouseEffectCard
                onClick={() => navigate(game.to)}
                className={cn(
                  "aspect-[4/5] flex flex-col p-4 group",
                  "bg-neutral-900 border-white/5 shadow-2xl"
                )}
              >
                {/* Background Color Glow */}
                <div className={cn("absolute inset-0 bg-gradient-to-br transition-opacity opacity-0 group-hover:opacity-100", game.color)} />
                
                <div className="relative z-10 h-full flex flex-col">
                    <div className="flex justify-between items-start mb-auto">
                        <span className="text-[9px] font-black text-white/30 tracking-widest uppercase">
                            Level: 01
                        </span>
                        {(() => {
                            const remaining = getGameBadge(game.id);
                            const label = (game.id === 'crown' || (typeof remaining === "number" && remaining > 0)) ? "HOT" : "NEW";
                            return (
                                <span className={cn(
                                    "px-2 py-0.5 rounded text-[9px] font-black",
                                    label === "HOT" ? "bg-red-500 text-white" : "bg-emerald-500 text-black"
                                )}>
                                    {label}
                                </span>
                            );
                        })()}
                    </div>

                    <div className="mt-auto flex flex-col items-center">
                        <img 
                            src={game.icon} 
                            className={cn(
                                "object-contain transition-transform group-hover:scale-110 group-hover:-translate-y-2 duration-500",
                                (game.id === 'missions' || game.id === 'tower') ? "w-16 h-16" : "w-24 h-24"
                            )} 
                            alt={game.id} 
                        />
                        {(game.id === 'missions' || game.id === 'tower') && (
                            <span className="mt-3 text-[10px] font-black text-white/80 tracking-widest uppercase italic bg-black/40 px-2 py-0.5 rounded border border-white/5">
                                {game.label}
                            </span>
                        )}
                    </div>
                </div>
              </MouseEffectCard>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
