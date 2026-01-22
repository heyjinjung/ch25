// src/v2/pages/game/GamedashPage.tsx
import { useNavigate } from "react-router-dom";
import "./GamedashPage.css";

const ASSET_PATH = "/v2/assets/02gamedash";

const GAMES = [
  { id: "dice", to: "/v2/game/dice", icon: `${ASSET_PATH}/Vector-1.svg` },
  { id: "rocket", to: "/v2/game/lottery", icon: `${ASSET_PATH}/Vector-2.svg` }, // Assuming lottery for rocket
  { id: "ball", to: "/v2/game/roulette", icon: `${ASSET_PATH}/Vector.svg` }, // Assuming roulette for ball
  { id: "crown", to: "/v2/team-battle", icon: `${ASSET_PATH}/Vector-4.svg` }, // Assuming team-battle for crown
];

export default function GamedashPage() {
  const navigate = useNavigate();

  return (
    <div className="gamedash-container !pt-4">
      {/* Background SVG Overlay */}
      <img src={`${ASSET_PATH}/gamedash.svg`} className="gamedash-bg-overlay" alt="" />

      {/* 32px Live Feed moved to V2AppLayout */}

      <div className="hero-notice-section">
        {/* Hero Notice Card */}
        <div className="hero-card-container">
          <img src={`${ASSET_PATH}/Vector-5.svg`} className="character-img" alt="character" />
          <div className="notice-labels">
            <div className="notice-pill">notice</div>
            <div className="notice-pill">notice</div>
            <div className="notice-pill">notice</div>
          </div>
        </div>

        {/* Game Selection Grid */}
        <div className="game-action-grid mt-4">
          {GAMES.map((game) => (
            <div 
              key={game.id} 
              className="game-action-card"
              onClick={() => navigate(game.to)}
            >
              <div className="game-card-bg" />
              <img src={game.icon} className="game-card-icon" alt={game.id} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
