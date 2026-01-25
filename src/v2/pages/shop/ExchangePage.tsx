import { useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useV2ShopProducts, useV2PurchaseProduct } from "../../hooks/useV2Shop";
import type { ShopProductDto } from "../../api/shopApi";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "./ExchangeRedesign.css";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const ASSET_PATH = "/assets/06shop";

const StarRating = () => (
  <div className="shop-card-stars">
    {[...Array(5)].map((_, i) => (
      <svg
        key={i}
        className="star-icon"
        xmlns="http://www.w3.org/2000/svg"
        width="10"
        height="10"
        viewBox="0 0 10 10"
        fill="none"
      >
        <path
          d="M9.99998 3.99907C9.99507 4.12198 9.9328 4.26235 9.81198 4.3732C9.32833 4.81661 8.84441 5.2596 8.36023 5.70218C8.13416 5.9092 7.90778 6.11589 7.68109 6.32227C7.6487 6.35164 7.64047 6.37769 7.65042 6.42328C7.82445 7.21689 7.99705 8.01083 8.16824 8.80509C8.20289 8.96471 8.23702 9.12462 8.27446 9.28369C8.32903 9.51925 8.25932 9.75205 8.0834 9.88382C7.88981 10.0288 7.68428 10.0382 7.47968 9.91153C6.82794 9.5072 6.17704 9.10125 5.52698 8.69368C5.37522 8.59904 5.2216 8.50662 5.07236 8.40851C5.02244 8.37567 4.98619 8.37539 4.93494 8.40754C4.14441 8.90278 3.35215 9.39496 2.56254 9.89006C2.39485 9.99509 2.22357 10.0346 2.03822 9.95518C1.79299 9.85015 1.66486 9.58105 1.72581 9.30143C1.89815 8.50994 2.07075 7.71845 2.24362 6.92697C2.28 6.76069 2.31253 6.59316 2.35197 6.42813C2.36338 6.38046 2.35542 6.35233 2.32076 6.32088C2.02371 6.05123 1.7274 5.78066 1.43185 5.50916C1.01772 5.12977 0.602011 4.75301 0.19028 4.37084C0.0221892 4.2151 -0.0415421 4.01625 0.0273673 3.78887C0.0962768 3.56148 0.250294 3.42458 0.479992 3.39991C0.887076 3.3564 1.29482 3.31996 1.7023 3.28102C2.10541 3.2425 2.50851 3.20426 2.91161 3.16629C3.04597 3.15368 3.18034 3.13955 3.31484 3.12888C3.35812 3.12555 3.38123 3.10574 3.39742 3.06458C3.76255 2.16917 4.1283 1.27413 4.49466 0.379457C4.59584 0.132117 4.77654 -0.00603314 5.00624 0.00020232C5.23594 0.00643778 5.40164 0.123526 5.49272 0.343707C5.74061 0.942727 5.98531 1.54313 6.23108 2.14326C6.35615 2.44811 6.48149 2.75378 6.60443 3.06001C6.62329 3.10712 6.65024 3.12541 6.69738 3.12929C7.02134 3.15793 7.34522 3.18795 7.66901 3.21936C8.14045 3.26407 8.61184 3.30915 9.08318 3.3546C9.23295 3.36846 9.38285 3.38232 9.53222 3.39977C9.80388 3.43331 10.0021 3.66984 9.99998 3.99907Z"
          fill="#B7C0D2"
        />
      </svg>
    ))}
  </div>
);

export default function ExchangePage() {
  const navigate = useNavigate();
  const { data: products } = useV2ShopProducts();
  const buyMutation = useV2PurchaseProduct();
  const [activeTab, setActiveTab] = useState("shop");
  const containerRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      // Parallax Dots
      const handleMove = (e: MouseEvent) => {
        const { clientX, clientY } = e;
        const x = (clientX / window.innerWidth - 0.5) * 20;
        const y = (clientY / window.innerHeight - 0.5) * 20;
        gsap.to(dotRef.current, { x, y, duration: 1.5, ease: "power2.out" });
      };
      window.addEventListener("mousemove", handleMove);

      return () => {
        window.removeEventListener("mousemove", handleMove);
      };
    }, containerRef);
    return () => ctx.revert();
  }, [products]);

  const getItemImage = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes("starbucks")) return "/assets/icons/takeaway-cup-dynamic-color.png";
    if (t.includes("diamond")) return "/assets/icons/diakey.png";
    if (t.includes("gold_key") || t.includes("goldkey")) return "/assets/icons/goldkey.png";
    if (t.includes("point") || t.includes("balance")) return "/assets/asset_coin_gold.png";
    if (t.includes("roulette") || t.includes("bundle")) return "/assets/asset_ticket_bundle.png";
    if (t.includes("dice")) return "/assets/icon_dice_silver.webp";
    if (t.includes("lottery") || t.includes("lotto")) return "/v2/assets/01home/7.png";
    if (t.includes("chicken") || t.includes("chiken")) return "/assets/icons/chiken.png";
    if (t.includes("pizza")) return "/assets/icons/pizza.png";
    return `${ASSET_PATH}/Frame 9-3.png`;
  };

  const getErrorDetail = (error: unknown) =>
    (error as { response?: { data?: { detail?: string } } })?.response?.data
      ?.detail;

  const handlePurchase = (sku: string) => {
    buyMutation.mutate(
      { sku },
      {
        onError: (error) => {
          const detail = getErrorDetail(error);
          if (detail === "INSUFFICIENT_BALANCE") {
            alert("잔액이 부족합니다.");
            return;
          }
          if (detail === "PRODUCT_NOT_FOUND") {
            alert("상품을 찾을 수 없습니다.");
            return;
          }
          if (
            detail === "INVALID_COST_AMOUNT" ||
            detail === "INVALID_REWARD_AMOUNT" ||
            detail === "INVALID_COST_TYPE"
          ) {
            alert("상품 정보가 올바르지 않습니다.");
            return;
          }
          if (detail === "IDEMPOTENCY_KEY_REQUIRED") {
            alert("요청 키가 없습니다. 새로고침 후 다시 시도하세요.");
            return;
          }
          alert("구매에 실패했습니다. 잠시 후 다시 시도하세요.");
        },
      },
    );
  };

  const mainProducts = products?.slice(0, 3) ?? [];
  const subProducts = products?.slice(3, 11) ?? [];

  const SubCardBg = () => (
    <svg
      className="sub-card-bg-svg"
      xmlns="http://www.w3.org/2000/svg"
      width="82"
      height="82"
      viewBox="0 0 82 82"
      fill="none"
    >
      <g filter="url(#filter0_d_10_314)">
        <path
          d="M61.8415 0H20.1539C11.2324 0 4 7.23281 4 16.1549V57.8451C4 66.7672 11.2324 74 20.1539 74H61.8415C70.7631 74 77.9954 66.7672 77.9954 57.8451V16.1549C77.9954 7.23281 70.7631 0 61.8415 0Z"
          fill="url(#paint0_linear_10_314)"
          fillOpacity="0.5"
          shapeRendering="crispEdges"
        />
      </g>
      <defs>
        <filter
          id="filter0_d_10_314"
          x="0"
          y="0"
          width="81.9951"
          height="82"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset dy="4" />
          <feGaussianBlur stdDeviation="2" />
          <feComposite in2="hardAlpha" operator="out" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"
          />
          <feBlend
            mode="normal"
            in2="BackgroundImageFix"
            result="effect1_dropShadow_10_314"
          />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="effect1_dropShadow_10_314"
            result="shape"
          />
        </filter>
        <linearGradient
          id="paint0_linear_10_314"
          x1="40.9977"
          y1="0"
          x2="40.9977"
          y2="74"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#E1FF80" stopOpacity="0.2" />
          <stop offset="1" stopColor="#2A5B2E" stopOpacity="0.1" />
        </linearGradient>
      </defs>
    </svg>
  );

  return (
    <div className="exchange-page-v2" ref={containerRef}>
      <div className="branding-watermark">CC</div>
      
      {/* Background Dot Pattern (Parallax) */}
      <div className="shop-dot-pattern" ref={dotRef} />

      <div className="shop-tabs-container">
        <div
          className={`shop-tab-item ${activeTab === "shop" ? "active" : ""}`}
          onClick={() => setActiveTab("shop")}
        >
          <img src="/assets/icons/icon_cart.png" className="w-4 h-4 mr-1.5 opacity-60" alt="" />
          상점
        </div>
        <div
          className={`shop-tab-item ${activeTab === "inventory" ? "active" : ""}`}
          onClick={() => navigate("/inventory")}
        >
          인벤토리
        </div>
      </div>

      <div className="shop-main-area">
        {/* Event Banner */}
        <div className="shop-event-banner">
          <img
            src="/assets/06shop/banner.png"
            className="event-banner-img"
            alt="상점 메인 배너"
          />
          <div className="banner-info-btn">안내</div>
        </div>

        {/* Products Grid */}
        <div className="shop-products-section">
          <div className="shop-main-cards-row">
            {mainProducts.map((product: ShopProductDto) => {
              const isPremium = product.reward_type.includes("key");
              return (
                <div
                  key={product.sku}
                  className="shop-card-v2 shop-main-card"
                  onClick={() => handlePurchase(product.sku)}
                >
                  {isPremium && <div className="shimmer-effect" />}
                  <SubCardBg />
                  
                  <div className="shop-buy-btn">
                    <img src="/assets/asset_coin_gold.png" className="w-3 h-3 mr-1" alt="P" />
                    {product.cost_amount.toLocaleString()}
                  </div>

                  <div className="shop-card-img-container">
                    <img
                      src={getItemImage(product.reward_type)}
                      className="shop-card-img"
                      alt={product.name}
                    />
                  </div>
                  <div className="shop-card-info">
                    <div className="shop-card-title">{product.name}</div>
                    <StarRating />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="shop-sub-grid">
            {subProducts.map((product: ShopProductDto) => {
              const isPremium = product.reward_type.includes("key");
              return (
                <div
                  key={product.sku}
                  className="shop-card-v2 shop-sub-card"
                  onClick={() => handlePurchase(product.sku)}
                >
                  {isPremium && <div className="shimmer-effect" />}
                  <SubCardBg />
                  <div className="shop-buy-btn">
                    <img src="/assets/asset_coin_gold.png" className="w-3 h-3 mr-1" alt="P" />
                    {product.cost_amount.toLocaleString()}
                  </div>

                  <div className="shop-card-img-container">
                    <img
                      src={getItemImage(product.reward_type)}
                      className="shop-card-img"
                      alt={product.name}
                    />
                  </div>
                  <div className="shop-card-info">
                    <div className="shop-card-title">{product.name}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
