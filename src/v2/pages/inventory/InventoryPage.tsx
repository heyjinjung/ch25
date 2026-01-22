import { useRef } from "react";
import { useV2Inventory, useV2UseInventoryItem } from "../../hooks/useV2Inventory";
import "./InventoryPage.css";

// 06shop assets (reusing same images as shop)
import imgFrame127 from "../../assets/06shop/frame-10000031270.png";
import imgFrame129 from "../../assets/06shop/frame-10000031290.png";
import imgFrame130 from "../../assets/06shop/frame-10000031300.png";

export default function InventoryPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useV2Inventory();
  const useItemMutation = useV2UseInventoryItem();

  const items = data?.items ?? [];

  const handleUseItem = (itemType: string) => {
    useItemMutation.mutate({ item_type: itemType, quantity: 1 });
  };

  if (isLoading) {
    return (
      <div className="inventory-page-v2">
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

  // Map item types to images (simple mapping for v2)
  const getItemImage = (index: number) => {
    const images = [imgFrame129, imgFrame127, imgFrame130];
    return images[index % images.length];
  };

  return (
    <div ref={containerRef} className="inventory-page-v2 scrollbar-hide overflow-y-auto">
      <div className="section-header px-4 pt-4 mb-6">
        <h2 className="section-title">나의 가방</h2>
        <span className="text-white/40 text-[10px] font-bold uppercase">{items.length} Items</span>
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
              <div className="inventory-item-quantity">수량: {item.quantity}</div>
              
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
          <p className="text-[10px] font-bold text-white/40 uppercase mb-1">Tip</p>
          <p className="text-xs text-white/60 leading-relaxed">
            아이템을 사용하여 게임에서 특별한 보너스를 받을 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
}
