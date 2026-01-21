import { useRef } from "react";
import { useV2ShopProducts, useV2PurchaseProduct } from "../../hooks/useV2Shop";
import "./ExchangePage.css";

// 06shop assets
import imgFrame127 from "../../assets/06shop/frame-10000031270.png";
import imgFrame129 from "../../assets/06shop/frame-10000031290.png";
import imgFrame130 from "../../assets/06shop/frame-10000031300.png";
import svgFire from "../../assets/06shop/noto-fire0.svg";
import svgStar1 from "../../assets/06shop/vector0.svg";
import svgStar2 from "../../assets/06shop/vector1.svg";

export default function ExchangePage() {
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: products, isLoading } = useV2ShopProducts();
  const purchaseMutation = useV2PurchaseProduct();

  const sortedProducts = products ? [...products].sort(
    (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)
  ) : [];

  const handlePurchase = (sku: string) => {
    purchaseMutation.mutate({ sku });
  };

  if (isLoading) {
    return (
      <div className="exchange-page-v2">
        <div style={{ 
          position: 'absolute', 
          top: '50%', 
          left: '50%', 
          transform: 'translate(-50%, -50%)',
          color: 'white',
          fontSize: '14px'
        }}>
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="exchange-page-v2">
      {/* Top filter tabs */}
      <div className="exchange-tabs">
        <div className="exchange-tab"></div>
        <div className="exchange-tab"></div>
        <div className="exchange-tab"></div>
        <div className="exchange-tab"></div>
      </div>

      {/* Product grid */}
      <div className="exchange-products-container">
        <div className="exchange-products-grid">
          {/* Card 1: Diamond Key / Premium Roulette */}
          <div className="exchange-product-card" onClick={() => sortedProducts[0] && handlePurchase(sortedProducts[0].id)}>
            <div className="exchange-card-bg"></div>
            <div className="exchange-card-title">다이아열쇠</div>
            <img className="exchange-card-icon-fire" src={svgFire} alt="" />
            <div className="exchange-card-badge">최고 고액룰렛</div>
            <div className="exchange-card-image-container">
              <div className="exchange-card-image-bg"></div>
            </div>
            <img className="exchange-card-image" src={imgFrame129} alt="" />
          </div>

          {/* Card 2: Ticket Package */}
          <div className="exchange-product-card" onClick={() => sortedProducts[1] && handlePurchase(sortedProducts[1].id)}>
            <div className="exchange-card-bg"></div>
            <div className="exchange-card-title">티켓패키지</div>
            <div className="exchange-card-badge">10+2장 더!</div>
            <img className="exchange-card-icon-star" src={svgStar1} alt="" />
            <div className="exchange-card-rating">4.4</div>
            <div className="exchange-card-image-container">
              <div className="exchange-card-image-bg"></div>
            </div>
            <img className="exchange-card-image-alt" src={imgFrame127} alt="" />
          </div>

          {/* Card 3: Chicken Gift */}
          <div className="exchange-product-card" onClick={() => sortedProducts[2] && handlePurchase(sortedProducts[2].id)}>
            <div className="exchange-card-bg"></div>
            <div className="exchange-card-title">치킨 깁콘</div>
            <img className="exchange-card-icon-star" src={svgStar2} alt="" />
            <div className="exchange-card-rating">4.5</div>
            <div className="exchange-card-badge">치킨먹쟝!</div>
            <div className="exchange-card-image-bg-alt"></div>
            <img className="exchange-card-image-third" src={imgFrame130} alt="" />
          </div>
        </div>
      </div>
    </div>
  );
}
