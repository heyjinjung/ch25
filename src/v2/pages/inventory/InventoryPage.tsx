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
    <div ref={containerRef} className="inventory-page-v2">
      {/* Items grid */}
      <div className="inventory-items-container">
        <div className="inventory-items-grid">
          {items.length === 0 && (
            <div style={{ 
              color: 'white', 
              fontSize: '14px',
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)',
              top: '50px'
            }}>
              보유 아이템이 없습니다
            </div>
          )}
          {items.map((item, index) => (
            <div 
              key={item.item_type} 
              className="inventory-item-card"
              onClick={() => handleUseItem(item.item_type)}
            >
              <div className="inventory-card-bg"></div>
              <div className="inventory-item-name">{item.item_type}</div>
              <div className="inventory-item-quantity">수량: {item.quantity}</div>
              <div className="inventory-item-image-container">
                <div className="inventory-item-image-bg"></div>
              </div>
              <img className="inventory-item-image" src={getItemImage(index)} alt="" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
