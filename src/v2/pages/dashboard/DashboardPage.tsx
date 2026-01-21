import { Link } from "react-router-dom";
import { useV2Vault } from "../../hooks/useV2Vault";
import { useV2Inventory } from "../../hooks/useV2Inventory";
import { useMemo } from "react";
import "./DashboardPage.css";

// Dashboard Assets  
import imgDiceAnimation from "../../assets/dashboard/source/maindice.png";
import imgImage19 from "../../assets/dashboard/source/lottory.png";
import imgMissionEvent from "../../assets/dashboard/source/gift box.png";

// Dashboard Icons
import imgRouletteAnimation from "../../assets/dashboard/#2 dashboard_icon/룰렛애니메이션.svg";
import imgArrowBack from "../../assets/dashboard/#2 dashboard_icon/arrow_back_ios_black_24dp (1) 1.svg";
import { Coins, Ticket } from "lucide-react";

export default function DashboardPage() {
  const { useVaultStatus } = useV2Vault();
  const { data: vault } = useVaultStatus();
  const { data: inventory } = useV2Inventory();

  const totalTickets = useMemo(() => {
    if (!inventory?.wallet) return 0;
    return Object.values(inventory.wallet).reduce((sum, count) => sum + count, 0);
  }, [inventory]);

  return (
    <div className="dashboard-page">
      <div className="dashboard-frame">
        {/* App Header */}
        <div className="dashboard-header">
          <Link to="/v2/home" className="dashboard-back">
            <img src={imgArrowBack} alt="뒤로" />
          </Link>
          
          <div className="dashboard-header__user">
            <div className="dashboard-header__avatar">👤</div>
            <div className="dashboard-header__info">
              <div className="dashboard-header__nickname">트레이너</div>
              <div className="dashboard-header__level">Lv.1</div>
            </div>
          </div>

          <div className="dashboard-header__balances">
            <div className="dashboard-header__balance">
              <Coins size={16} />
              <span>{(vault?.vaultBalance ?? 0).toLocaleString()}</span>
            </div>
            <div className="dashboard-header__balance">
              <Ticket size={16} />
              <span>{totalTickets}</span>
            </div>
          </div>
        </div>

        {/* Hero Banner / Title */}
        <div className="dashboard-hero">
          <h1 className="dashboard-title">게임 허브</h1>
          <p className="dashboard-subtitle">원하는 게임을 선택하세요</p>
        </div>

        {/* Game Grid */}
        <div className="dashboard-grid">
          {/* Mission/Event Card */}
          <Link to="/v2/missions" className="dashboard-card dashboard-card--mission">
            <div className="dashboard-card__content">
              <img className="dashboard-card__icon" src={imgMissionEvent} alt="" />
              <div className="dashboard-card__title">미션 & 이벤트</div>
              <div className="dashboard-card__subtitle">데일리 미션 완료</div>
            </div>
          </Link>

          {/* Roulette Card */}
          <Link to="/v2/game/roulette" className="dashboard-card dashboard-card--roulette">
            <div className="dashboard-card__content">
              <img className="dashboard-card__icon" src={imgRouletteAnimation} alt="" />
              <div className="dashboard-card__title">룰렛</div>
              <div className="dashboard-card__subtitle">행운의 바퀴를 돌려보세요</div>
            </div>
          </Link>

          {/* Dice Card */}
          <Link to="/v2/game/dice" className="dashboard-card dashboard-card--dice">
            <div className="dashboard-card__content">
              <img className="dashboard-card__icon" src={imgDiceAnimation} alt="" />
              <div className="dashboard-card__title">주사위</div>
              <div className="dashboard-card__subtitle">딜러와 1:1 승부</div>
            </div>
          </Link>

          {/* Lottery Card */}
          <Link to="/v2/game/lottery" className="dashboard-card dashboard-card--lottery">
            <div className="dashboard-card__content">
              <img className="dashboard-card__icon" src={imgImage19} alt="" />
              <div className="dashboard-card__title">복권</div>
              <div className="dashboard-card__subtitle">긁어서 보상 확인</div>
            </div>
          </Link>
        </div>

        {/* Bottom Navigation Hint */}
        <div className="dashboard-footer">
          <div className="dashboard-footer__text">더 많은 게임이 곧 추가됩니다!</div>
        </div>
      </div>
    </div>
  );
}
