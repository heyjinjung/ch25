import { useLayoutEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
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

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      // Shimmer Effect Timeline
      const tlShimmer = gsap.timeline({ repeat: -1, repeatDelay: 3 });
      tlShimmer.fromTo(".card-shine", 
        { x: "-150%", skewX: -20 }, 
        { x: "400%", duration: 1.5, ease: "power2.inOut", stagger: 0.1 }
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
          delay: 2
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
              {/* Original 3 items */}
              <div className="notice-item"> ?¥Î≤àÏ£???Ç§Ï∞¨Ïä§ Ï∂îÍ? ?∞ÏºìÏ¶ùÏ†ï</div>
              <div className="notice-item"> ?ÖÎç∞?¥Ìä∏! ?é∞ ?¨ÎùºÏßÑÍ∑∏?òÌîΩ</div>
              <div className="notice-item"> ?íéÍ≥®Îìú?§Î? ?°ÏïÑ?? Í≥†Ïï°Î£∞Î†õ</div>
              {/* Duplicated for seamless loop (since 3 are visible, we need them to follow) */}
              <div className="notice-item"> ?¥Î≤àÏ£???Ç§Ï∞¨Ïä§ Ï∂îÍ? ?∞ÏºìÏ¶ùÏ†ï</div>
              <div className="notice-item"> ?ÖÎç∞?¥Ìä∏! ?é∞ ?¨ÎùºÏßÑÍ∑∏?òÌîΩ</div>
              <div className="notice-item">?íéÍ≥®Îìú?§Î? ?°ÏïÑ?? Í≥†Ïï°Î£∞Î†õ</div>
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
