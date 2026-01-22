// src/v2/pages/shop/ExchangePage.tsx
import { useRef } from "react";
import { useV2ShopProducts, useV2PurchaseProduct } from "../../hooks/useV2Shop";
import { useV2Vault } from "../../hooks/useV2Vault";
import "./ExchangeRedesign.css";
import { triggerHaptic } from "../../utils/haptic";

const ASSET_PATH = "/src/v2/public/assets/06shop";

export default function ExchangePage() {
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: products, isLoading } = useV2ShopProducts();
  const purchaseMutation = useV2PurchaseProduct();
  const { useVaultStatus } = useV2Vault();
  const { data: vaultStatus } = useVaultStatus();

  const handlePurchase = (sku: string) => {
    triggerHaptic("medium");
    purchaseMutation.mutate({ sku });
  };

  if (isLoading) {
    return (
      <div className="exchange-redesign-container flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  // Assets mapping for demo/simulation based on display order or name
  // In a real app, these would come from the product metadata
  const getProductImage = (idx: number) => {
    if (idx === 0) return `${ASSET_PATH}/Frame 9.png`;    // Gift
    if (idx === 1) return `${ASSET_PATH}/Frame 9-1.png`;  // Key
    if (idx === 2) return `${ASSET_PATH}/Frame 9-2.png`;  // Tickets
    return `${ASSET_PATH}/Frame 9-3.png`;
  };

  return (
    <div ref={containerRef} className="exchange-redesign-container scrollbar-hide">
      {/* Wallet Strip */}
      <div className="shop-wallet-strip">
        <div className="shop-wallet-card">
          <div className="wallet-item">
            <span className="wallet-label">Vault Balance</span>
            <span className="wallet-value">
              {(vaultStatus?.vaultBalance || 0).toLocaleString()} <span className="text-[10px] opacity-40">P</span>
            </span>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="wallet-item">
            <span className="wallet-label">My Tickets</span>
            <span className="wallet-value tokens">
              {(vaultStatus?.ticketCount || 0).toLocaleString()} <span className="text-[10px] opacity-40">T</span>
            </span>
          </div>
        </div>
      </div>

      {/* Main Products Section */}
      <div className="shop-products-section mt-4">
        <div className="shop-grid-header">
            <h2 className="shop-grid-title uppercase tracking-widest text-[11px] opacity-60">Featured Items</h2>
            <span className="text-[10px] opacity-40">View All</span>
        </div>

        <div className="shop-grid">
          {products?.map((product, idx) => (
            <div 
              key={product.id} 
              className="shop-product-card"
              onClick={() => handlePurchase(product.id)}
            >
              <span className="product-name-label">{product.name}</span>
              <img 
                src={getProductImage(idx)} 
                className="product-item-img" 
                alt="" 
              />
              <div className="product-buy-btn">
                {(product.cost_amount || 0).toLocaleString()} P
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Category Quick Row (Icons) */}
      <div className="shop-categories-row">
        {[
          { icon: "Vector.svg", label: "Key" },
          { icon: "Vector-1.svg", label: "Coffee" },
          { icon: "Vector-2.svg", label: "Secret" },
          { icon: "Vector-3.svg", label: "Bag" }
        ].map((cat, i) => (
          <div key={i} className="category-quick-item">
            <div className="category-icon-circle">
              <img src={`${ASSET_PATH}/${cat.icon}`} className="category-icon-img" alt="" />
            </div>
            <span className="text-[10px] opacity-40 uppercase tracking-tighter">{cat.label}</span>
          </div>
        ))}
      </div>

      {/* Decorative Vectors or Banners can go here as per Figma */}
      <div className="mt-auto items-center justify-center flex pb-8 opacity-10">
         <img src={`${ASSET_PATH}/Element.svg`} className="w-48" alt="" />
      </div>
    </div>
  );
}
