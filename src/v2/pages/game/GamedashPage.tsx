import { useLayoutEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  useV2DiceStatus,
  useV2RouletteStatus,
  useV2LotteryStatus,
} from "../../hooks/useV2Game";
import gsap from "gsap";
import "./GamedashPage.css";

const ASSET_PATH = "/assets/02gamedash";

const GAMES = [
  { id: "dice", to: "/game/dice", icon: `${ASSET_PATH}/Group 12.png` },
  { id: "rocket", to: "/game/roulette", icon: `${ASSET_PATH}/Group 13.png` },
  { id: "ball", to: "/game/lottery", icon: `${ASSET_PATH}/Group 14.png` },
  { id: "crown", to: "/team-battle", icon: `${ASSET_PATH}/Group 15.png` },
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
    <div className="gamedash-container" ref={containerRef}>
      <div className="gamedash-flyer-bg" />

      <div className="gamedash-main-content">
        {/* Main Card (Notice Card) */}
        <div className="hero-card-container">
          <div className="card-shine" />
          <img
            src={`${ASSET_PATH}/Ellipse 374.svg`}
            className="character-img"
            alt="character"
          />
          <div className="notice-container">
            <div className="notice-wrapper">
              {noticeItems.map((text, idx) => (
                <div key={`notice-${idx}`} className="notice-item">
                  {text}
                </div>
              ))}
              {noticeItems.map((text, idx) => (
                <div key={`notice-dup-${idx}`} className="notice-item">
                  {text}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Game Selection Grid (2x2) */}
        <div className="game-action-grid">
          {GAMES.map((game) => (
            <div
              key={game.id}
              className="game-action-card"
              onClick={() => navigate(game.to)}
            >
              <div className="card-shine" />
              {(() => {
                const remaining = getGameBadge(game.id);
                if (typeof remaining !== "number") return null;
                const label = remaining > 0 ? "READY" : "WAIT";
                const badgeClass = remaining > 0 ? "badge-hot" : "badge-new";
                return (
                  <span className={`game-card-badge ${badgeClass}`}>
                    {label}
                  </span>
                );
              })()}
              <img src={game.icon} className="game-card-icon" alt={game.id} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
