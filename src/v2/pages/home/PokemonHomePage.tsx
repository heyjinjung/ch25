import { useNavigate } from "react-router-dom";
import "./PokemonHomePage.css";
import imgDiv4 from "../../assets/01main/div0.png";
import img12V4 from "../../assets/01main/_11.png";
import img3V4 from "../../assets/01main/_30.png";
import svgVectorV4 from "../../assets/01main/vector-16720.svg";

export default function PokemonHomePage() {
  const navigate = useNavigate();

  return (
    <div className="pokemon-home-page-v4" onClick={() => navigate("/v2/game")}>
      <div className="main-v4">
        <div className="_1-v4">
          <img className="div-v4" src={imgDiv4} alt="" />
          <img className="_12-v4" src={img12V4} alt="" />
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
