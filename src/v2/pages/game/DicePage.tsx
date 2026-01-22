// src/v2/pages/game/DicePage.tsx
import { useState } from "react";
import "./DiceRedesign.css";

const ASSET_PATH = "/v2/assets/03dice";

const DicePage = () => {
  const [playerDice, setPlayerDice] = useState(1);
  const [opponentDice, setOpponentDice] = useState(1);
  const [isRolling, setIsRolling] = useState(false);

  const getDiceImage = (val: number) =>
    `${ASSET_PATH}/img_dice_side_{[${val}]}.png`;

  const rollDice = () => {
    if (isRolling) return;
    setIsRolling(true);

    let iterations = 0;
    const interval = setInterval(() => {
      setPlayerDice(Math.floor(Math.random() * 6) + 1);
      setOpponentDice(Math.floor(Math.random() * 6) + 1);
      iterations++;
      if (iterations > 15) {
        clearInterval(interval);
        setIsRolling(false);
      }
    }, 80);
  };

  return (
    <div className="dice-page-v2">
      <div className="dice-bg-overlay" />

      <div className="dice-main-container">
        {/* Battle Section */}
        <div className="battle-cards-grid">
          {/* Player Card */}
          <div className="battle-card">
            <div className="dice-display">
              <img
                src={getDiceImage(playerDice)}
                alt="player dice"
                className="dice-img"
              />
            </div>
            <div className="dice-sub-button">WAITING...</div>
          </div>

          {/* Opponent Card */}
          <div className="battle-card">
            <div className="dice-display">
              <img
                src={getDiceImage(opponentDice)}
                alt="opponent dice"
                className="dice-img"
              />
            </div>
            <div className="dice-sub-button">
              <img
                src={`${ASSET_PATH}/Frame 37.png`}
                alt="opponent"
                className="dice-character-small"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="dice-action-area">
          <button
            className="spin-button-v2"
            onClick={rollDice}
            disabled={isRolling}
          >
            {isRolling ? "ROLLING..." : "SPIN"}
          </button>

          <div className="item-board-card">
            <span className="item-board-text">아이템 준비중</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DicePage;
