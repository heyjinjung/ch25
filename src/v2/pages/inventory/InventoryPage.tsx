import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useV2Inventory,
  useV2UseInventoryItem,
} from "../../hooks/useV2Inventory";
import { motion } from "framer-motion";
import { ShoppingBag, Package, Gift, Archive } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "../../components/ui/sheet";
import { Button } from "../../components/ui/button";
import { clsx } from "clsx";
import confetti from "canvas-confetti";

// ============================================================================
// Types & Constants
// ============================================================================

const TABS = [
  {
    id: "shop",
    label: "상점",
    icon: ShoppingBag,
    color: "from-amber-500 to-orange-500",
  },
  {
    id: "inventory",
    label: "인벤토리",
    icon: Package,
    color: "from-blue-500 to-cyan-500",
  },
  {
    id: "event",
    label: "이벤트",
    icon: Gift,
    color: "from-purple-500 to-pink-500",
  },
];

const VOUCHER_ITEM_TYPES = new Set([
  "VOUCHER_ROULETTE_COIN_1",
  "VOUCHER_DICE_TOKEN_1",
  "VOUCHER_LOTTERY_TICKET_1",
]);

const ITEM_NAME_MAP: Record<string, string> = {
  VOUCHER_GOLD_KEY_1: "골드키",
  VOUCHER_DIAMOND_KEY_1: "다이아키",
  VOUCHER_ROULETTE_COIN_1: "룰렛티켓",
  VOUCHER_DICE_TOKEN_1: "주사위티켓",
  VOUCHER_LOTTERY_TICKET_1: "복권티켓",
};

const getFriendlyItemName = (type: string) => {
  // 1. Map from table
  if (ITEM_NAME_MAP[type]) return ITEM_NAME_MAP[type];

  // 2. Gifticon Regex (BRAND_GIFTICON_AMOUNT)
  const gifticonRegex = /^([A-Z]+)_GIFTICON_(\d+)$/;
  const match = type.match(gifticonRegex);
  if (match) {
    const brand = match[1];
    const amount = parseInt(match[2]).toLocaleString();
    return `${brand} ${amount}원 깁콘`;
  }

  // 3. Fallback: Humanize
  return type
    .replace("VOUCHER_", "")
    .replace("_1", "")
    .replace(/_/g, " ")
    .toUpperCase();
};

// Helper to get image path (Keep existing logic)
const getItemImage = (type: string) => {
  const t = type.toLowerCase();
  if (t.includes("starbucks"))
    return "/assets/icons/takeaway-cup-dynamic-color.png";
  if (t.includes("diamond")) return "/assets/icons/diakey.png";
  if (t.includes("gold_key") || t.includes("goldkey"))
    return "/assets/icons/goldkey.png";
  if (t.includes("point") || t.includes("balance"))
    return "/assets/asset_coin_gold.png";
  if (t.includes("roulette") || t.includes("bundle"))
    return "/assets/asset_ticket_bundle.png";
  if (t.includes("dice")) return "/assets/icon_dice_silver.webp";
  if (t.includes("lottery") || t.includes("lotto"))
    return "/v2/assets/01home/7.png";
  if (t.includes("chicken") || t.includes("chiken"))
    return "/assets/icons/chiken.png";
  if (t.includes("pizza")) return "/assets/icons/pizza.png";
  return "/assets/06shop/Frame 9-3.png"; // Fallback
};

export default function InventoryPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useV2Inventory();
  const useItemMutation = useV2UseInventoryItem();

  const [activeTab, setActiveTab] = useState("inventory");
  const [selectedItem, setSelectedItem] = useState<{
    item_type: string;
    quantity: number;
  } | null>(null);

  const items = data?.items ?? [];

  const handleTabClick = (tabId: string) => {
    if (tabId === "shop") {
      navigate("/shop");
      return;
    }
    setActiveTab(tabId);
  };

  const handleItemClick = (item: { item_type: string; quantity: number }) => {
    setSelectedItem(item);
  };

  const handleUseItem = async () => {
    if (!selectedItem) return;

    // Check if usable
    if (!VOUCHER_ITEM_TYPES.has(selectedItem.item_type)) {
      alert("이 아이템은 직접 사용할 수 없습니다. (보유 효과 적용 중)");
      return;
    }

    try {
      await useItemMutation.mutateAsync({
        item_type: selectedItem.item_type,
        quantity: 1,
      });

      // Success Effect
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.8 },
        colors: ["#30FF75", "#00FFFF"],
      });

      alert("아이템을 사용했습니다!");
      setSelectedItem(null);
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      if (detail === "INVALID_VOUCHER_TYPE")
        alert("사용할 수 없는 아이템입니다.");
      else if (detail === "INSUFFICIENT_ITEM_QUANTITY")
        alert("수량이 부족합니다.");
      else alert("아이템 사용 실패. 다시 시도해주세요.");
    }
  };

  return (
    <div className="relative min-h-tg bg-[#121214] text-white overflow-hidden flex flex-col pt-[var(--header-offset)] pb-[var(--nav-offset)]">
      {/* Background Watermark */}
      <div className="fixed inset-0 pointer-events-none flex items-center justify-center opacity-[0.03]">
        <span className="text-[200px] font-black">CC</span>
      </div>

      {/* Scrollable Area */}
      <div className="flex-1 overflow-y-auto no-scrollbar relative z-10">
        {/* Banner (Reuse Shop Banner style) */}
        <div className="px-4 mb-4">
          <div className="relative w-full rounded-2xl">
            {/* Image - Natural Height */}
            <img
              src="/assets/06shop/banner.png"
              alt="Inventory Banner"
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
                      : "bg-[#18181B] text-white/50 hover:text-white/70 hover:bg-[#1E1E22]/50 mb-1",
                  )}
                >
                  {/* Top Highlight Logic for active tab */}
                  {isActive && (
                    <motion.div
                      layoutId="activeTabTop"
                      className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${tab.color}`}
                    />
                  )}

                  <tab.icon
                    size={16}
                    className={isActive ? "text-white" : "text-current"}
                  />
                  <span
                    className={clsx(
                      "text-sm font-bold",
                      isActive ? "text-white" : "text-current",
                    )}
                  >
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Main Content Panel */}
          <div className="relative bg-[#1E1E22] rounded-3xl min-h-[500px] p-2 shadow-xl border-t border-white/5 mx-1">
            {isLoading ? (
              <div className="flex items-center justify-center h-[300px]">
                <div className="w-10 h-10 border-4 border-white/10 border-t-emerald-500 rounded-full animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {items.map((item) => {
                  const isPremium = item.item_type
                    .toLowerCase()
                    .includes("key");

                  return (
                    <motion.div
                      key={item.item_type}
                      layout
                      whileHover={{ scale: 0.98 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleItemClick(item)}
                      className={clsx(
                        "relative aspect-[4/5] rounded-2xl bg-[#27272A] border border-white/5 flex flex-col items-center justify-between p-2 overflow-hidden group cursor-pointer",
                        isPremium && "ring-1 ring-emerald-500/30",
                      )}
                    >
                      {/* Premium Shine */}
                      {isPremium && (
                        <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/10 to-transparent opacity-50" />
                      )}

                      {/* Image Area */}
                      <div className="flex-1 flex items-center justify-center w-full relative z-10">
                        <div
                          className={clsx(
                            "w-14 h-14 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110",
                            isPremium ? "bg-emerald-500/10" : "bg-white/5",
                          )}
                        >
                          <img
                            src={getItemImage(item.item_type)}
                            alt={item.item_type}
                            className="w-10 h-10 object-contain drop-shadow-lg"
                          />
                        </div>
                      </div>

                      {/* Info Area */}
                      <div className="w-full text-center relative z-10 mt-1">
                        <h3 className="text-[11px] font-bold text-white/90 truncate mb-1.5 px-1">
                          {getFriendlyItemName(item.item_type)}
                        </h3>

                        {/* Quantity Badge */}
                        <div className="w-full py-1.5 rounded-lg bg-[#52525B] flex items-center justify-center gap-1">
                          <span className="text-[10px] text-white/60">
                            보유량
                          </span>
                          <span className="text-[11px] font-bold text-white">
                            {item.quantity}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {!isLoading && items.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-white/50 gap-4">
                <Archive size={48} strokeWidth={1} />
                <p>보유 중인 아이템이 없습니다.</p>
              </div>
            )}
          </div>

          {/* Bottom spacer for safe area */}
          <div className="h-10" />
        </div>
      </div>

      {/* Item Detail & Use Sheet */}
      <Sheet
        open={!!selectedItem}
        onOpenChange={(open) => !open && setSelectedItem(null)}
      >
        <SheetContent
          side="bottom"
          className="bg-[#18181B] border-t border-white/10 rounded-t-[32px] p-0"
        >
          {selectedItem && (
            <>
              <SheetTitle className="sr-only">
                {selectedItem.item_type}
              </SheetTitle>
              <div className="flex flex-col p-6 pb-40">
                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-20 h-20 rounded-2xl bg-[#27272A] flex items-center justify-center border border-white/10">
                    <img
                      src={getItemImage(selectedItem.item_type)}
                      alt={selectedItem.item_type}
                      className="w-14 h-14 object-contain"
                    />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      {getFriendlyItemName(selectedItem.item_type)}
                    </h2>
                    <p className="text-sm text-white/50">
                      보유 수량:{" "}
                      <span className="text-emerald-400 font-bold">
                        {selectedItem.quantity}개
                      </span>
                    </p>
                  </div>
                </div>

                {/* Description */}
                <div className="bg-[#27272A] rounded-2xl p-4 mb-6 border border-white/5">
                  <p className="text-sm text-white/70 leading-relaxed">
                    {VOUCHER_ITEM_TYPES.has(selectedItem.item_type)
                      ? "이 아이템을 사용하여 게임 내 재화나 특별한 효과를 얻을 수 있습니다."
                      : "이 아이템은 자동으로 효과가 적용되거나, 특정 조건에서 사용됩니다."}
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 h-12 rounded-xl border border-green-900/60 bg-white/10 backdrop-blur-md text-green-900 font-bold text-base shadow-md hover:bg-green-100/30 hover:text-green-900 focus-visible:ring-2 focus-visible:ring-green-700/80 transition-all duration-200"
                    style={{
                      background: "rgba(20,40,20,0.18)",
                      border: "1.5px solid rgba(20,40,20,0.35)",
                      boxShadow: "0 4px 24px 0 rgba(20,40,20,0.10)",
                      color: "#133a13",
                    }}
                    onClick={() => setSelectedItem(null)}
                  >
                    닫기
                  </Button>

                  {VOUCHER_ITEM_TYPES.has(selectedItem.item_type) && (
                    <Button
                      className="flex-[2] h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold text-base shadow-lg shadow-emerald-500/20 inventory-glass-btn"
                      onClick={handleUseItem}
                      disabled={useItemMutation.isPending}
                    >
                      {useItemMutation.isPending ? "사용 중..." : "사용하기"}
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Inventory Glassmorphism Button Style */}
      <style>{`
        @import './InventoryRedesign.css';
      `}</style>
    </div>
  );
}
