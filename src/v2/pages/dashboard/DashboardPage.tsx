import { useLayoutEffect, useRef } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import "./DashboardPage.css";

// Background Assets
import imgBackground from "../../assets/gamehub.png";

// Game Icons
import imgRouletteRocket from "../../assets/home/source/rocket-dynamic-color.png";
import imgLotteryIcon from "../../assets/home/dashboard/source/lottory.png";
import imgDiceIcon from "../../assets/home/dashboard/source/maindice.png";
import imgGiftBoxIcon from "../../assets/home/dashboard/source/gift box.png";


export default function DashboardPage() {
  const rouletteRef = useRef(null);
  const lotteryRef = useRef(null);
  const diceRef = useRef(null);
  const giftRef = useRef(null);

  useLayoutEffect(() => {
    // 룰렛 로켓: 부드러운 대각선 부유
    gsap.to(rouletteRef.current, {
      y: -10,
      x: 5,
      duration: 2,
      repeat: -1,
      yoyo: true,
      ease: "power1.inOut",
    });

    // 복권: 미세한 회전
    gsap.to(lotteryRef.current, {
      rotation: 5,
      duration: 1.5,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
    });

    // 주사위: 부드러운 위아래 부유
    gsap.to(diceRef.current, {
      y: -8,
      duration: 1.8,
      repeat: -1,
      yoyo: true,
      ease: "power1.inOut",
    });

    // 선물함: 톡톡 튀는 느낌
    gsap.to(giftRef.current, {
      scale: 1.05,
      duration: 1.2,
      repeat: -1,
      yoyo: true,
      ease: "back.inOut(2)",
    });
  }, []);

  return (
    <div className="dashboard-page">
      {/* Background Layers */}
      <div className="dashboard-bg">
        <img className="dashboard-bg__main" src={imgBackground} alt="" />
      </div>

      {/* Game Grid - 2x2 */}
      <div className="dashboard-grid">
        {/* Roulette */}
        <Link to="/v2/game/roulette" className="dashboard-game-card">
          <div className="dashboard-game-card__icon-wrap">
            <img
              ref={rouletteRef}
              src={imgRouletteRocket}
              alt=""
              className="dashboard-game-card__icon"
            />
          </div>
        </Link>

        {/* Lucky Ball / Lottery */}
        <Link to="/v2/game/lottery" className="dashboard-game-card">
          <div className="dashboard-game-card__icon-wrap">
            <img
              ref={lotteryRef}
              src={imgLotteryIcon}
              alt=""
              className="dashboard-game-card__icon"
            />
          </div>
        </Link>

        {/* Dice */}
        <Link to="/v2/game/dice" className="dashboard-game-card">
          <div className="dashboard-game-card__icon-wrap">
            <img
              ref={diceRef}
              src={imgDiceIcon}
              alt=""
              className="dashboard-game-card__icon"
            />
          </div>
        </Link>

        {/* Gift / Missions */}
        <Link to="/v2/missions" className="dashboard-game-card">
          <div className="dashboard-game-card__icon-wrap">
            <img
              ref={giftRef}
              src={imgGiftBoxIcon}
              alt=""
              className="dashboard-game-card__icon"
            />
          </div>
        </Link>
      </div>
    </div>
  );
}
