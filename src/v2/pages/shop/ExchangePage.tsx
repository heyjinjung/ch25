
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useV2ShopProducts, useV2PurchaseProduct } from "../../hooks/useV2Shop";
import type { ShopProductDto } from "../../api/shopApi";
import { motion } from "framer-motion";
import { 
  ShoppingBag, 
  Package, 
  Gift
} from "lucide-react";
import { Sheet, SheetContent } from "../../components/ui/sheet";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { clsx } from "clsx";
import confetti from "canvas-confetti";

// ============================================================================
// Types & Constants
// ============================================================================

const TABS = [
  { id: "shop", label: "상점", icon: ShoppingBag, color: "from-amber-500 to-orange-500" },
  { id: "inventory", label: "인벤토리", icon: Package, color: "from-blue-500 to-cyan-500" },
  { id: "event", label: "이벤트", icon: Gift, color: "from-purple-500 to-pink-500" },
];

// Helper to get image path (Keep existing logic)
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
  return "/assets/06shop/Frame 9-3.png"; // Fallback
};

export default function ExchangePage() {
  const navigate = useNavigate();
  const { data: products = [] } = useV2ShopProducts();
  const buyMutation = useV2PurchaseProduct();
  
  const [activeTab, setActiveTab] = useState("shop");
  const [selectedProduct, setSelectedProduct] = useState<ShopProductDto | null>(null);

  // Group products or filter based on tab
  // Currently we only have 'shop' products API. 
  // 'inventory' tab redirects to inventory page in original code.
  // We'll mimic that behavior or keep it in-page if desired. 
  // For now, adhere to original behavior: inventory -> navigate
  
  const handleTabClick = (tabId: string) => {
    if (tabId === "inventory") {
      navigate("/inventory");
      return;
    }
    setActiveTab(tabId);
  };

  const handleProductClick = (product: ShopProductDto) => {
    setSelectedProduct(product);
  };

  const handlePurchase = async () => {
    if (!selectedProduct) return;

    try {
      await buyMutation.mutateAsync({ sku: selectedProduct.sku });
      
      // Success Effect
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.8 },
        colors: ["#FFD700", "#FFA500", "#FF4500"],
      });
      
      alert("구매가 완료되었습니다!");
      setSelectedProduct(null);
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      if (detail === "INSUFFICIENT_BALANCE") alert("잔액이 부족합니다.");
      else if (detail === "PRODUCT_NOT_FOUND") alert("상품을 찾을 수 없습니다.");
      else alert("구매 실패. 다시 시도해주세요.");
    }
  };

  return (
    <div className="relative min-h-tg bg-[#121214] text-white overflow-hidden flex flex-col pt-[var(--header-offset)] pb-[var(--nav-offset)]">
      
      {/* Background Watermark */}
      <div className="fixed inset-0 pointer-events-none flex items-center justify-center opacity-[0.03]">
         <span className="text-[200px] font-black">CC</span>
      </div>

      {/* Hero Banner Section (Scrollable Area Top) */}
      <div className="flex-1 overflow-y-auto no-scrollbar relative z-10">
        
        {/* Banner */}
        <div className="px-4 mb-4">
            <div className="relative w-full rounded-2xl">
                {/* Image - Natural Height */}
                <img 
                    src="/assets/06shop/banner.png" 
                    alt="Event Banner" 
                    className="w-full h-auto object-contain rounded-2xl"
                />
            </div>
        </div>

        {/* Tabbed Panel Layout */}
        <div className="relative px-2">
            
            {/* Folder Tabs */}
            <div className="flex items-end px-4 gap-2 relative z-10 translate-y-1">
                {TABS.map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => handleTabClick(tab.id)}
                            className={clsx(
                                "relative px-4 py-3 rounded-t-2xl flex items-center gap-2 transition-all duration-300",
                                isActive 
                                    ? `bg-[#1E1E22] text-white pb-4` 
                                    : "bg-[#18181B] text-white/40 hover:text-white/60 hover:bg-[#1E1E22]/50 mb-1"
                            )}
                        >
                            {/* Top Highlight Logic for active tab */}
                            {isActive && (
                                <motion.div 
                                    layoutId="activeTabTop"
                                    className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${tab.color}`} 
                                />
                            )}
                            
                            <tab.icon size={16} className={isActive ? "text-white" : "text-current"} />
                            <span className={clsx("text-sm font-bold", isActive ? "text-white" : "text-current")}>
                                {tab.label}
                            </span>
                        </button>
                    )
                })}
            </div>

            {/* Main Content Panel */}
            <div className="relative bg-[#1E1E22] rounded-3xl min-h-[500px] p-2 shadow-xl border-t border-white/5 mx-1">
                <div className="grid grid-cols-3 gap-2">
                    {products.map((product) => {
                        const isPremium = product.reward_type.includes("key") || product.cost_amount >= 5000;
                        
                        return (
                            <motion.div
                                key={product.sku}
                                layout
                                whileHover={{ scale: 0.98 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleProductClick(product)}
                                className={clsx(
                                    "relative aspect-[4/5] rounded-2xl bg-[#27272A] border border-white/5 flex flex-col items-center justify-between p-2 overflow-hidden group cursor-pointer",
                                    isPremium && "ring-1 ring-yellow-500/30"
                                )}
                            >
                                {/* Premium Shine */}
                                {isPremium && (
                                    <div className="absolute inset-0 bg-gradient-to-tr from-yellow-500/10 to-transparent opacity-50" />
                                )}

                                {/* Image Area */}
                                <div className="flex-1 flex items-center justify-center w-full relative z-10">
                                    <div className={clsx(
                                        "w-14 h-14 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110",
                                        isPremium ? "bg-amber-500/10" : "bg-white/5"
                                    )}>
                                        <img 
                                            src={getItemImage(product.reward_type)} 
                                            alt={product.name}
                                            className="w-10 h-10 object-contain drop-shadow-lg"
                                        />
                                    </div>
                                </div>
                                
                                {/* Info Area */}
                                <div className="w-full text-center relative z-10 mt-1">
                                    <h3 className="text-[11px] font-bold text-white/90 truncate mb-1.5 px-1">
                                        {product.name}
                                    </h3>
                                    
                                    {/* Price Tag */}
                                    <div className={clsx(
                                        "w-full py-1 rounded-lg flex items-center justify-center gap-1",
                                        isPremium ? "bg-gradient-to-r from-amber-500 to-orange-600 shadow-lg shadow-orange-500/20" : "bg-[#52525B]"
                                    )}>
                                        <img src="/assets/asset_coin_gold.png" className="w-2.5 h-2.5" alt="C" />
                                        <span className="text-[11px] font-bold text-white">
                                            {product.cost_amount.toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
                
                {products.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-white/30 gap-4">
                        <ShoppingBag size={48} strokeWidth={1} />
                        <p>판매 중인 상품이 없습니다.</p>
                    </div>
                )}
            </div>
            
            {/* Bottom spacer for safe area */}
            <div className="h-10" />
        </div>
      </div>

      {/* Quick Buy Bottom Sheet */}
      <Sheet open={!!selectedProduct} onOpenChange={(open) => !open && setSelectedProduct(null)}>
        <SheetContent side="bottom" className="bg-[#18181B] border-t border-white/10 rounded-t-[32px] p-0">
            {selectedProduct && (
                <div className="flex flex-col p-6 pb-20">
                   {/* Header */}
                   <div className="flex items-center gap-4 mb-6">
                        <div className="w-20 h-20 rounded-2xl bg-[#27272A] flex items-center justify-center border border-white/10">
                             <img 
                                src={getItemImage(selectedProduct.reward_type)} 
                                alt={selectedProduct.name}
                                className="w-14 h-14 object-contain"
                            />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="text-xs border-white/20 text-white/60">
                                    {selectedProduct.sku}
                                </Badge>
                                {selectedProduct.reward_type.includes("key") && (
                                    <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-none">
                                        PREMIUM
                                    </Badge>
                                )}
                            </div>
                            <h2 className="text-xl font-bold text-white">
                                {selectedProduct.name}
                            </h2>
                            <p className="text-sm text-white/50">
                                구매 즉시 인벤토리로 지급됩니다.
                            </p>
                        </div>
                   </div>

                   {/* Price & Action */}
                   <div className="bg-[#27272A] rounded-2xl p-4 mb-6 flex items-center justify-between border border-white/5">
                        <span className="text-sm text-white/60">결제 금액</span>
                        <div className="flex items-center gap-2">
                             <img src="/assets/asset_coin_gold.png" className="w-5 h-5" alt="C" />
                             <span className="text-xl font-black text-white">
                                {selectedProduct.cost_amount.toLocaleString()}
                             </span>
                        </div>
                   </div>

                   <div className="flex gap-3">
                       <Button 
                            variant="outline" 
                            className="flex-1 h-12 rounded-xl border-white/10 hover:bg-white/5 text-white"
                            onClick={() => setSelectedProduct(null)}
                       >
                            취소
                       </Button>
                       <Button 
                            className="flex-[2] h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-600 hover:to-cyan-700 text-white font-bold text-base shadow-lg shadow-emerald-500/20"
                            onClick={handlePurchase}
                            disabled={buyMutation.isPending}
                       >
                            {buyMutation.isPending ? "처리 중..." : "구매하기"}
                       </Button>
                   </div>
                </div>
            )}
        </SheetContent>
      </Sheet>

    </div>
  );
}
