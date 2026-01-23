import { useLayoutEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import gsap from "gsap";
import "./GamedashPage.css";

const ASSET_PATH = "/v2/assets/02gamedash";

const GAMES = [
  { id: "dice", to: "/v2/game/dice", icon: `${ASSET_PATH}/Group 12.png` },
  { id: "rocket", to: "/v2/game/roulette", icon: `${ASSET_PATH}/Group 13.png` },
  { id: "ball", to: "/v2/game/lottery", icon: `${ASSET_PATH}/Group 14.png` },
  { id: "crown", to: "/v2/team-battle", icon: `${ASSET_PATH}/Group 15.png` },
];

export default function GamedashPage() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      // Shimmer Effect Timeline
      const tl = gsap.timeline({ repeat: -1, repeatDelay: 3 });
      tl.fromTo(".card-shine", 
        { x: "-150%", skewX: -20 }, 
        { x: "400%", duration: 1.5, ease: "power2.inOut", stagger: 0.1 }
      );
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
              <div className="card-shine" />
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
