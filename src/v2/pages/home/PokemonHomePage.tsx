import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./PokemonHomePage.css";

// Local Assets
import imgFrame1000001178 from "../../assets/home/Frame 1000001178.png";
import imgImage11 from "../../assets/home/image 11.png";
import imgImage12 from "../../assets/home/image 12.png";
import imgCharizard from "../../assets/home/1aa6febd88204d4eb7ff8592ed65a6c0 1.png";
import imgFrame1000001179 from "../../assets/home/Frame 1000001179.png";
import imgImage10 from "../../assets/home/image 10.png";
import imgImage9 from "../../assets/home/image 9.png";
import imgBlastoise from "../../assets/home/1aa6febd88204d4eb7ff8592ed65a6c0 2.png";
import imgArrowBack from "../../assets/home/arrow_back_ios_black_24dp (1) 1.svg";
import imgEllipse1 from "../../assets/home/Ellipse 1.svg";
import imgEllipse2 from "../../assets/home/Ellipse 2.svg";
import imgEllipse3 from "../../assets/home/Ellipse 3.svg";
import imgEllipse4 from "../../assets/home/Ellipse 4.svg";
import imgEllipse5 from "../../assets/home/Ellipse 5.svg";

export default function PokemonHomePage() {
  const navigate = useNavigate();
  const [activeCard, setActiveCard] = useState<"orange" | "blue" | "green">("orange");
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);

  const cardState = useMemo(() => {
    const order: Array<"orange" | "blue" | "green"> = ["orange", "blue", "green"];
    const activeIndex = order.indexOf(activeCard);
    return {
      center: order[activeIndex],
      next: order[(activeIndex + 1) % order.length],
      prev: order[(activeIndex + 2) % order.length],
    };
  }, [activeCard]);

  const handleOrangeCardClick = () => {
    // Group 3-1 (Orange/Fire Card) - 이벤트 모달 팝업 후 다음 카드로
    setIsEventModalOpen(true);
  };

  const handleCloseEventModal = () => {
    setIsEventModalOpen(false);
    // 모달 닫으면 다음 카드(블루)로 전환
    setActiveCard("blue");
  };

  const handleBlueCardClick = () => {
    // Group 3-2 (Blue Card) - 애니메이션으로 다음 카드(그린)로
    setActiveCard("green");
  };

  const handleGreenCardClick = () => {
    // 선물박스 카드 - 대시보드로 이동
    setTimeout(() => {
      navigate("/v2/game");
    }, 280);
  };

  return (
    <div className="pokemon-home-page">
      <div className="pokemon-home-frame" role="img" aria-label="Pokemon Home">
        {/* Back Button */}
        <button className="pokemon-back" type="button" aria-label="뒤로">
          <img src={imgArrowBack} alt="" />
        </button>

        {/* Top Info Links */}
        <a
          className="pokemon-topline"
          href="http://ccc-010.com"
          target="_blank"
          rel="noreferrer"
        >
          평생주소 씨씨주소.COM
        </a>
        
        <a href="http://ccc-010.com" target="_blank" rel="noreferrer">
          <img className="pokemon-logo" src={imgFrame1000001179} alt="CC Casino" />
        </a>

        {/* Copy Text - Links to Vault */}
        <Link className="pokemon-copy" to="/v2/vault">
          <p>매일매일</p>
          <p>혜택이</p>
          <p>쏟아지는 곳</p>
        </Link>

        {/* Scroll Indicators */}
        <div className="pokemon-scroll-indicators">
          <img src={imgEllipse1} alt="" />
          <img src={imgEllipse2} alt="" />
          <img src={imgEllipse3} alt="" />
          <img src={imgEllipse4} alt="" />
          <img src={imgEllipse5} alt="" />
        </div>

        {/* Hero Character */}
        <img className="pokemon-hero-character" src={imgCharizard} alt="" />

        {/* Card Stack - Green (Gift Box) */}
        <button
          type="button"
          className={`pokemon-card pokemon-card--green pokemon-card--interactive ${
            cardState.center === "green"
              ? "is-center"
              : cardState.next === "green"
                ? "is-next"
                : "is-prev"
          }`}
          onClick={handleGreenCardClick}
        >
          <div className="pokemon-card__surface pokemon-card__surface--green" />
          <img className="pokemon-card__texture" src={imgImage11} alt="" />
        </button>

        {/* Card Stack - Orange (Fire/Event) */}
        <button
          type="button"
          className={`pokemon-card pokemon-card--orange pokemon-card--interactive ${
            cardState.center === "orange"
              ? "is-center"
              : cardState.next === "orange"
                ? "is-next"
                : "is-prev"
          }`}
          onClick={handleOrangeCardClick}
        >
          <div className="pokemon-card__surface pokemon-card__surface--orange" />
          <img className="pokemon-card__texture" src={imgImage10} alt="" />
          <div className="pokemon-badge">
            <img src={imgImage9} alt="" />
            <span>Fire</span>
          </div>
          <img className="pokemon-card__character" src={imgBlastoise} alt="" />
        </button>

        {/* Card Stack - Blue (Ticket) */}
        <button
          type="button"
          className={`pokemon-card pokemon-card--blue pokemon-card--interactive ${
            cardState.center === "blue"
              ? "is-center"
              : cardState.next === "blue"
                ? "is-next"
                : "is-prev"
          }`}
          onClick={handleBlueCardClick}
        >
          <div className="pokemon-card__surface pokemon-card__surface--blue" />
          <img className="pokemon-card__texture" src={imgImage12} alt="" />
          <img className="pokemon-card__ticket" src={imgFrame1000001178} alt="" />
        </button>

        {/* Event Modal */}
        {isEventModalOpen && (
          <div className="pokemon-modal" role="dialog" aria-modal="true">
            <div className="pokemon-modal__panel">
              <h3>🔥 이벤트 안내</h3>
              <p>지금 참여 가능한 특별 이벤트를 확인하세요!</p>
              <button type="button" onClick={handleCloseEventModal}>
                확인
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
