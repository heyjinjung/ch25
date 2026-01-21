import { useRef, useEffect } from "react";
import gsap from "gsap";
import { useNavigate } from "react-router-dom";
import "./PokemonHomePage.css";
import imgDiv4 from "../../assets/01main/div0.png";
import img12V4 from "../../assets/01main/_11.png";
import img3V4 from "../../assets/01main/_30.png";
import svgVectorV4 from "../../assets/01main/vector-16720.svg";

export default function PokemonHomePage() {
  const navigate = useNavigate();
  const girlRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!girlRef.current) return;
    const anim = gsap.to(girlRef.current, {
      y: 16,
      x: 6,
      rotate: 2.5,
      duration: 2.2,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
    });
    return () => {
      anim.kill();
    };
  }, []);

  return (
    <div className="pokemon-home-page-v4" onClick={() => navigate("/v2/game")}>
      <div className="main-v4">
        <div className="_1-v4">
          <img className="div-v4" src={imgDiv4} alt="" />
          <img ref={girlRef} className="_12-v4" src={img12V4} alt="" />
          <img className="_3-v4" src={img3V4} alt="" />
          <div className="_4-v4"></div>
          <img className="vector-1672-v4" src={svgVectorV4} alt="" />
          <div className="_5-v4">
            평생주소
            <br />
            씨씨주소.COM
          </div>
        </div>
      </div>
    </div>
  );
}
