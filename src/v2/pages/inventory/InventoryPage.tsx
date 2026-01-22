import { useRef } from "react";
import {
  useV2Inventory,
  useV2UseInventoryItem,
} from "../../hooks/useV2Inventory";
import { useV2Vault } from "../../hooks/useV2Vault";
import "./InventoryPage.css";

// 06shop assets (reusing same images as shop)
const ASSET_PATH = "/v2/assets/06shop";
const imgFrame127 = `${ASSET_PATH}/Frame 9-1.png`;
const imgFrame129 = `${ASSET_PATH}/Frame 9.png`;
const imgFrame130 = `${ASSET_PATH}/Frame 9-2.png`;

export default function InventoryPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useV2Inventory();
  const useItemMutation = useV2UseInventoryItem();
  const { useVaultStatus } = useV2Vault();
  const { data: vaultStatus } = useVaultStatus();

  const items = data?.items ?? [];

  const handleUseItem = (itemType: string) => {
    useItemMutation.mutate({ item_type: itemType, quantity: 1 });
  };

  if (isLoading) {
    return (
      <div className="inventory-page-v2">
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            color: "white",
            fontSize: "14px",
          }}
        >
          Loading...
        </div>
      </div>
    );
  }

  // Map item types to images (simple mapping for v2)
  const getItemImage = (index: number) => {
    // 누락된 이미지 대신 placeholder 배열 사용
    const images = [imgFrame129, imgFrame127, imgFrame130];
    return images[index % images.length];
  };

  return (
    <div
      ref={containerRef}
      className="inventory-page-v2 scrollbar-hide overflow-y-auto"
    >
      {/* Wallet Balance Display */}
      <div className="exchange-wallet-strip px-4 mt-4 mb-6">
        <div className="flex justify-between items-center bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-md">
          <div className="flex flex-col">
            <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider mb-1">
              보관금 (VAULT)
            </span>
            <span className="text-lg font-black text-white italic">
              {(vaultStatus?.vaultBalance || 0).toLocaleString()}{" "}
              <span className="text-[10px] not-italic opacity-50 ml-0.5">
                P
              </span>
            </span>
          </div>
          <div className="w-px h-8 bg-white/10 mx-2" />
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider mb-1">
              보유 토큰
            </span>
            <span className="text-lg font-black text-[#FF7A00] italic">
              {(vaultStatus?.ticketCount || 0).toLocaleString()}{" "}
              <span className="text-[10px] not-italic opacity-50 ml-0.5">
                T
              </span>
            </span>
          </div>
        </div>
      </div>

      <div className="section-header px-4 mb-6">
        <h2 className="section-title">나의 가방</h2>
        <span className="text-white/40 text-[10px] font-bold uppercase">
          {items.length} Items
        </span>
      </div>

      <div className="inventory-items-container">
        <div className="inventory-items-grid">
          {items.length === 0 && (
            <div className="w-full text-center py-20 text-white/30 text-sm font-bold">
              보유 아이템이 없습니다
            </div>
          )}
          {items.map((item, index) => (
            <div
              key={item.item_type}
              className="inventory-item-card"
              onClick={() => handleUseItem(item.item_type)}
            >
              <div className="inventory-item-name">{item.item_type}</div>
              <div className="inventory-item-quantity">
                수량: {item.quantity}
              </div>

              <div className="inventory-item-image-container">
                <img
                  className="inventory-item-image"
                  src={getItemImage(index)}
                  alt={item.item_type}
                />
              </div>

              <div className="inventory-item-use-hint">사용하기</div>
            </div>
          ))}
        </div>
      </div>

      {/* Placeholder for future sections */}
      <div className="px-4 mt-8 pb-32">
        <div className="rounded-2xl bg-white/5 border border-white/5 p-4">
          <p className="text-[10px] font-bold text-white/40 uppercase mb-1">
            Tip
          </p>
          <p className="text-xs text-white/60 leading-relaxed">
            아이템을 사용하여 게임에서 특별한 보너스를 받을 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
}
