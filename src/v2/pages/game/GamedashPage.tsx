// src/v2/pages/game/GamedashPage.tsx
import { useLayoutEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import gsap from "gsap";
import "./GamedashPage.css";

const ASSET_PATH = "/v2/assets/02gamedash";

const GAMES = [
  { id: "dice", to: "/v2/game/dice", icon: `${ASSET_PATH}/Vector-8.svg` },
  { id: "rocket", to: "/v2/game/lottery", icon: `${ASSET_PATH}/Vector-6.svg` },
  { id: "ball", to: "/v2/game/roulette", icon: `${ASSET_PATH}/Vector-7.svg` },
  { id: "crown", to: "/v2/team-battle", icon: `${ASSET_PATH}/Vector-5.svg` },
];

export default function GamedashPage() {
  const navigate = useNavigate();
  const spaceRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!spaceRef.current) return;

    gsap.to(spaceRef.current, {
      backgroundPosition: "0px 400px",
      duration: 18,
      repeat: -1,
      ease: "none",
    });
  }, []);

  return (
    <div className="gamedash-container">
      {/* Background SVG from Figma */}
      <svg
        className="gamedash-bg-svg"
        xmlns="http://www.w3.org/2000/svg"
        width="390"
        height="755"
        viewBox="0 0 388 750"
        fill="none"
      >
        <path
          d="M331.273 -1.02637H54.7273C23.3977 -1.02637 -2 21.6029 -2 49.5176V703.43C-2 731.344 23.3977 753.974 54.7273 753.974H331.273C362.602 753.974 388 731.344 388 703.43V49.5176C388 21.6029 362.602 -1.02637 331.273 -1.02637Z"
          fill="url(#paint0_linear_9_277)"
          fillOpacity="0.6"
        />
        <defs>
          <linearGradient
            id="paint0_linear_9_277"
            x1="193"
            y1="-1.02637"
            x2="193"
            y2="753.974"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#EBFF8F" stopOpacity="0.2" />
            <stop offset="0.375" stopColor="#F0FFBD" stopOpacity="0.62" />
            <stop offset="0.9999" stopColor="#BBCD80" stopOpacity="0.23" />
            <stop offset="1" stopColor="#BDE9BD" stopOpacity="0.67" />
          </linearGradient>
        </defs>
      </svg>

      <div className="gamedash-space-bg" ref={spaceRef} />

      <div className="gamedash-main-content">
        {/* Main Card (Notice Card) */}
        <div className="hero-card-container">
          <img
            src={`${ASSET_PATH}/Ellipse 374.svg`}
            className="character-img"
            alt="character"
          />
          <div className="notice-labels">
            <div className="notice-pill">NOTICE</div>
            <div className="notice-pill">NOTICE</div>
            <div className="notice-pill">NOTICE</div>
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
              {game.id === "ball" && (
                <span className="game-card-badge badge-hot">HOT</span>
              )}
              {game.id === "rocket" && (
                <span className="game-card-badge badge-new">NEW</span>
              )}
              <img src={game.icon} className="game-card-icon" alt={game.id} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
