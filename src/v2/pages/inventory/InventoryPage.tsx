// src/pages/inventory/InventoryPage.tsx
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useV2Inventory,
  useV2UseInventoryItem,
} from "../../hooks/useV2Inventory";
import { useV2Vault } from "../../hooks/useV2Vault";
import "./InventoryPage.css";

const ASSET_PATH = "/assets/06shop";

export default function InventoryPage() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState("inventory");

  const { data, isLoading, error } = useV2Inventory();
  const useItemMutation = useV2UseInventoryItem();
  const { useVaultStatus } = useV2Vault();
  const { data: vaultStatus } = useVaultStatus();

  const items = data?.items ?? [];

  const handleUseItem = (itemType: string) => {
    if (window.confirm("?ÑÏù¥?úÏùÑ ?¨Ïö©?òÏãúÍ≤†Ïäµ?àÍπå?")) {
      useItemMutation.mutate({ item_type: itemType, quantity: 1 });
    }
  };

  const getItemImage = (type: string) => {
    switch (type) {
      case "gold_key":
        return `${ASSET_PATH}/Frame 9-1.png`;
      case "diamond_key":
        return `${ASSET_PATH}/Frame 9.png`;
      case "premium_ticket":
        return `${ASSET_PATH}/Frame 9-2.png`;
      default:
        return `${ASSET_PATH}/Frame 9-3.png`;
    }
  };

  const SubCardBg = () => (
    <svg className="sub-card-bg-svg" xmlns="http://www.w3.org/2000/svg" width="82" height="82" viewBox="0 0 82 82" fill="none">
      <g filter="url(#filter0_d_10_314)">
        <path d="M61.8415 0H20.1539C11.2324 0 4 7.23281 4 16.1549V57.8451C4 66.7672 11.2324 74 20.1539 74H61.8415C70.7631 74 77.9954 66.7672 77.9954 57.8451V16.1549C77.9954 7.23281 70.7631 0 61.8415 0Z" fill="url(#paint0_linear_10_314)" fillOpacity="0.5" shapeRendering="crispEdges"/>
      </g>
      <defs>
        <filter id="filter0_d_10_314" x="0" y="0" width="81.9951" height="82" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feFlood floodOpacity="0" result="BackgroundImageFix"/>
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
          <feOffset dy="4"/>
          <feGaussianBlur stdDeviation="2"/>
          <feComposite in2="hardAlpha" operator="out"/>
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"/>
          <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_10_314"/>
          <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_10_314" result="shape"/>
        </filter>
        <linearGradient id="paint0_linear_10_314" x1="40.9977" y1="0" x2="40.9977" y2="74" gradientUnits="userSpaceOnUse">
          <stop stopColor="#E1FF80" stopOpacity="0.2"/>
          <stop offset="1" stopColor="#2A5B2E" stopOpacity="0.1"/>
        </linearGradient>
      </defs>
    </svg>
  );

  if (isLoading) {
    return (
      <div className="exchange-page-v2 inventory-specific items-center justify-center">
        <div className="w-10 h-10 border-2 border-[#9AFFFA] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="exchange-page-v2 inventory-specific items-center justify-center px-6 text-center">
        <p className="text-white/40">?§Î•òÍ∞Ä Î∞úÏÉù?àÏäµ?àÎã§.</p>
      </div>
    );
  }

  return (
    <div className="exchange-page-v2 inventory-specific" ref={containerRef}>
      <div className="shop-tabs-container">
        <div
          className={`shop-tab-item ${activeTab === "shop" ? "active" : ""}`}
          onClick={() => navigate("/shop")}
        >
          ?ÅÏ†ê
        </div>
        <div
          className={`shop-tab-item ${activeTab === "inventory" ? "active" : ""}`}
          onClick={() => setActiveTab("inventory")}
        >
          ?∏Î≤§?†Î¶¨
        </div>
      </div>

      <div className="inventory-main-area">
        {/* Summary Banner (Mirrors shop banner style) */}
        <div className="inventory-summary-banner">
          <img
            src="/assets/06shop/banner.png"
            className="summary-banner-img"
            alt="inventory summary"
          />
          <div className="banner-info-btn">???∏Î≤§?†Î¶¨</div>
        </div>

        {/* Wallet Strip */}
        <div className="exchange-wallet-strip">
          <div className="flex justify-between items-center bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-md">
            <div className="flex flex-col">
              <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider mb-1">
                Î≥¥Í?Í∏?(VAULT)
              </span>
              <span className="text-lg font-black text-white italic">
                {(vaultStatus?.vaultBalance || 0).toLocaleString()} <span className="text-[10px] not-italic opacity-50 ml-0.5">P</span>
              </span>
            </div>
            <div className="w-px h-8 bg-white/10 mx-2" />
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider mb-1">
                Î≥¥Ïú† ?†ÌÅ∞
              </span>
              <span className="text-lg font-black text-[#FF7A00] italic">
                {(vaultStatus?.ticketCount || 0).toLocaleString()} <span className="text-[10px] not-italic opacity-50 ml-0.5">T</span>
              </span>
            </div>
          </div>
        </div>

        {/* Inventory Items Section */}
        <div className="inventory-sub-grid">
          {items.length === 0 && (
            <div className="col-span-3 text-center py-20 text-white/30 text-xs font-bold uppercase tracking-widest">
              No Items Found
            </div>
          )}
          {items.slice(0, 9).map((item) => (
            <div
              key={item.item_type}
              className="inventory-item-card-v2"
              onClick={() => handleUseItem(item.item_type)}
            >
              <SubCardBg />
              <div className="inventory-item-img-container">
                <img
                  className="inventory-item-img"
                  src={getItemImage(item.item_type)}
                  alt={item.item_type}
                />
              </div>
              {/* Quantity Indicator */}
              <div className="absolute top-1 right-1 bg-black/60 px-1.5 py-0.5 rounded-full border border-white/10 text-[8px] font-black text-white z-20">
                x{item.quantity}
              </div>
            </div>
          ))}
        </div>

        {/* Tip Section */}
        <div className="w-full max-w-[360px] mt-10 pb-32">
          <div className="rounded-2xl bg-white/5 border border-white/5 p-4 backdrop-blur-sm">
            <p className="text-[10px] font-bold text-white/40 uppercase mb-1 tracking-widest">
              Inventory Tip
            </p>
            <p className="text-[11px] text-white/60 leading-relaxed">
              ?ÑÏù¥?úÏùÑ ?¨Ïö©?òÏó¨ Í≤åÏûÑ?êÏÑú ?πÎ≥Ñ??Î≥¥ÎÑà?§Î? Î∞õÏùÑ ???àÏäµ?àÎã§.<br />
              ?¨Ïö©???ÑÏù¥?úÏ? Ï¶âÏãú ?åÎ™®?òÎ©∞ ?®Í≥ºÍ∞Ä Î∞úÏÉù?©Îãà??
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
