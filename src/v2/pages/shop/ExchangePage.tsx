import { useRef } from "react";
import { useV2ShopProducts, useV2PurchaseProduct } from "../../hooks/useV2Shop";
import "./ExchangePage.css";

// 06shop assets
import imgFrame127 from "../../assets/06shop/frame-10000031270.png";
import imgFrame129 from "../../assets/06shop/frame-10000031290.png";
import imgFrame130 from "../../assets/06shop/frame-10000031300.png";

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
    <div ref={containerRef} className="exchange-page-v2 scrollbar-hide overflow-y-auto">
      {/* Category Tabs */}
      <div className="exchange-tabs">
        <div className="exchange-tab active">전체</div>
        <div className="exchange-tab">게임키</div>
        <div className="exchange-tab">티켓</div>
        <div className="exchange-tab">선물</div>
      </div>

      {/* Featured Section */}
      <div className="mb-8">
        <div className="section-header px-4">
          <h2 className="section-title">인기 상품</h2>
          <span className="section-more">더보기</span>
        </div>
        
        <div className="exchange-products-container">
          <div className="exchange-products-grid">
            {sortedProducts.map((product, idx) => (
              <div 
                key={product.id} 
                className="exchange-product-card" 
                onClick={() => handlePurchase(product.id)}
              >
                <div className="exchange-card-title">{product.name || (idx === 0 ? "다이아열쇠" : idx === 1 ? "티켓패키지" : "치킨 깁콘")}</div>
                <div className="exchange-card-badge">{idx === 0 ? "최고 인기" : idx === 1 ? "10+2장" : "베스트"}</div>
                
                <div className="exchange-card-image-container">
                  <img 
                    className="exchange-card-image" 
                    src={idx === 0 ? imgFrame129 : idx === 1 ? imgFrame127 : imgFrame130} 
                    alt="" 
                  />
                </div>
                
                <div className="exchange-card-price">
                  <img src="/assets/asset_coin_gold.png" className="w-3 h-3" alt="" />
                  {(product.cost_amount || 0).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Another Section (Simulation) */}
      <div className="mb-32">
        <div className="section-header px-4">
          <h2 className="section-title">추천 상품</h2>
        </div>
        <div className="exchange-products-container text-white/20 text-xs px-4">
          새로운 상품들이 준비 중입니다...
        </div>
      </div>
    </div>
  );
}
