import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchInventory, useInventoryItem, InventoryItem } from '../api/inventoryApi';
import { Loader2, Package, Coins } from 'lucide-react';
import { useToast } from '../components/common/ToastProvider';
import { tryHaptic } from '../utils/haptics';
import { useNavigate } from 'react-router-dom';

const InventoryPage: React.FC = () => {
    const queryClient = useQueryClient();
    const { addToast } = useToast();
    const navigate = useNavigate();

    const { data, isLoading, isError } = useQuery({
        queryKey: ['inventory'],
        queryFn: fetchInventory,
    });

    const useMutationAction = useMutation({
        mutationFn: ({ item_type, amount }: { item_type: string; amount: number }) => useInventoryItem(item_type, amount),
        onSuccess: (data) => {
            tryHaptic(20);
            addToast(`사용 완료: ${data.reward_token} x${data.reward_amount} 지급됨`, "success");
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
            queryClient.invalidateQueries({ queryKey: ['vault-status'] });
        },
        onError: (error: any) => {
            const msg = error.response?.data?.detail || "사용 실패";
            tryHaptic(50); // Error heavy haptic
            addToast(msg, "error");
        }
    });

    const items = Array.isArray(data?.items) ? data.items : [];
    const wallet = data?.wallet && typeof data.wallet === "object" && !Array.isArray(data.wallet) ? data.wallet : {};

    if (isLoading) {
        return (
            <div className="mx-auto w-full max-w-lg py-16 flex flex-col items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-figma-accent" />
                <p className="mt-4 text-white/50 text-sm font-medium">인벤토리 불러오는 중...</p>
                {/* Joyride 타겟 프리홀더 (로딩 중에도 크래시 방지) */}
                <div className="sr-only" data-tour="inventory-items-tab" />
                <div className="sr-only" data-tour="inventory-wallet-tab" />
                <div className="sr-only" data-tour="inventory-shop-btn" />
            </div>
        );
    }

    if (isError) {
        return (
            <div className="mx-auto w-full max-w-lg pb-[calc(96px+env(safe-area-inset-bottom))]">
                <div className="rounded-[24px] border border-white/10 bg-white/5 p-5 text-center">
                    <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-black/30 ring-1 ring-white/10">
                        <Package className="h-5 w-5 text-white/40" />
                    </div>
                    <div className="text-sm font-black text-white/90">데이터 로딩 실패</div>
                    <div className="mt-1 text-[11px] font-medium text-white/50">인벤토리 정보를 불러오지 못했습니다.</div>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto w-full max-w-lg pt-1.5 pb-[calc(96px+env(safe-area-inset-bottom))]">
            {/* Title */}
            <div className="mb-4 flex items-center gap-3" data-tour="inventory-link">
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center p-1.5 overflow-hidden">
                    <img src="/assets/icon_inventory_wallet.png" alt="Inventory" className="w-full h-full object-contain" />
                </div>
                <div>
                    <h1 className="text-xl font-black text-white">보상함</h1>
                    <p className="text-[11px] text-white/40 tracking-wide">REWARDS</p>
                </div>
                <div className="ml-auto">
                    <button
                        type="button"
                        onClick={() => {
                            tryHaptic(10);
                            addToast("교환권/티켓은 ‘사용하기’를 누르면 지갑/키로 반영돼요. 기프티콘은 지급대기 후 운영자가 발송합니다.", "info");
                        }}
                        className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-[11px] font-black text-white/70 active:scale-[0.98]"
                    >
                        안내
                    </button>
                </div>
            </div>

            {/* Tabs (route) */}
            <div className="mb-6" data-tour="inventory-tabs">
                <div className="flex p-1 bg-white/5 rounded-2xl border border-white/10">
                    <button
                        type="button"
                        data-tour="inventory-items-tab"
                        disabled
                        className="flex-1 py-3 text-sm font-black rounded-xl transition-all bg-figma-primary text-white shadow-lg shadow-emerald-900/20"
                    >
                        보유함
                    </button>
                    <button
                        type="button"
                        data-tour="inventory-wallet-tab"
                        onClick={() => {
                            tryHaptic(10);
                            navigate('/shop');
                        }}
                        className="flex-1 py-3 text-sm font-black rounded-xl transition-all text-white/60 hover:text-white hover:bg-white/5 active:scale-[0.98]"
                    >
                        상점
                    </button>
                </div>
                <div className="sr-only" data-tour="inventory-shop-btn" />
            </div>

            {/* Content */}
            <div className="space-y-6 animate-fadeIn">
                <div>
                    <div className="mb-3 flex items-baseline justify-between">
                        <h2 className="text-sm font-black text-white/90">보유 아이템</h2>
                        <div className="text-[10px] font-medium text-white/35">ITEMS</div>
                    </div>
                    <div className="space-y-3">
                        {items.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 opacity-50 space-y-4">
                                <Package className="w-14 h-14 text-white/10 stroke-1" />
                                <p className="text-white/30 font-medium">보유한 아이템이 없습니다</p>
                            </div>
                        ) : (
                            items.map((item) => (
                                <ItemCard
                                    key={item.item_type}
                                    item={item}
                                    onUse={() => useMutationAction.mutate({ item_type: item.item_type, amount: 1 })}
                                    isPending={useMutationAction.isPending}
                                />
                            ))
                        )}
                    </div>
                </div>

                <div>
                    <div className="mb-3 flex items-baseline justify-between">
                        <h2 className="text-[14px] font-black text-white/90">티켓 지갑</h2>
                        <div className="text-[10px] font-medium text-white/35">WALLET</div>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                        {Object.entries(wallet).length === 0 ? (
                            <div className="rounded-[24px] border border-white/10 bg-white/5 p-5 text-center text-white/50 text-sm font-medium">
                                지갑 정보가 없습니다.
                            </div>
                        ) : (
                            Object.entries(wallet).map(([key, value]) => (
                                <WalletCard key={key} tokenType={key} amount={Number(value ?? 0)} />
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Sub Components ---

interface ItemCardProps {
    item: InventoryItem;
    onUse: () => void;
    isPending: boolean;
}

const ItemCard: React.FC<ItemCardProps> = ({ item, onUse, isPending }) => {
    // Mapping for user-friendly display
    const INFO: Record<string, { title: string; desc: string; icon: React.ReactNode }> = {
        "VOUCHER_GOLD_KEY_1": {
            title: "골드키 교환권",
            desc: "골드키 1개로 즉시 교환",
            icon: <img src="/assets/asset_ticket_gold.png" className="w-8 h-8 object-contain" alt="" />
        },
        "VOUCHER_DIAMOND_KEY_1": {
            title: "다이아키 교환권",
            desc: "다이아키 1개로 즉시 교환",
            icon: <img src="/assets/asset_ticket_diamond.png" className="w-8 h-8 object-contain" alt="" />
        },
        "VOUCHER_DICE_TOKEN_1": {
            title: "주사위 티켓",
            desc: "주사위 티켓 1개로 즉시 교환",
            icon: <img src="/assets/icon_dice_silver.png" className="w-8 h-8 object-contain" alt="" />
        },
        "VOUCHER_ROULETTE_COIN_1": {
            title: "룰렛 티켓",
            desc: "일반 룰렛 티켓 1개로 즉시 교환",
            icon: <img src="/assets/asset_ticket_green.png" className="w-8 h-8 object-contain" alt="" />
        },
        "VOUCHER_LOTTERY_TICKET_1": {
            title: "복권 티켓",
            desc: "복권 티켓 1개로 즉시 교환",
            icon: <img src="/assets/icon_ticket.png" className="w-8 h-8 object-contain" alt="" />
        },
        "BAEMIN_GIFTICON_5000": {
            title: "배민 기프티콘 5,000원",
            desc: "지급 대기(관리자 수기 지급)",
            icon: <img src="/assets/lottery/icon_gift.png" className="w-8 h-8 object-contain" alt="" />
        },
        "BAEMIN_GIFTICON_10000": {
            title: "배민 기프티콘 10,000원",
            desc: "지급 대기(관리자 수기 지급)",
            icon: <img src="/assets/lottery/icon_gift.png" className="w-8 h-8 object-contain" alt="" />
        },
        "BAEMIN_GIFTICON_20000": {
            title: "배민 기프티콘 20,000원",
            desc: "지급 대기(관리자 수기 지급)",
            icon: <img src="/assets/lottery/icon_gift.png" className="w-8 h-8 object-contain" alt="" />
        },
        "COMPOSE_AMERICANO_GIFTICON_3000": {
            title: "컴포즈 아이스 아메리카노 3,000원",
            desc: "지급 대기(관리자 수기 지급)",
            icon: <img src="/assets/lottery/icon_gift.png" className="w-8 h-8 object-contain" alt="" />
        },
        "CC_COIN_GIFTICON": {
            title: "씨씨코인깁콘",
            desc: "지급 대기(관리자 승인 후 외부플랫폼 처리)",
            icon: <img src="/assets/lottery/icon_gift.png" className="w-8 h-8 object-contain" alt="" />
        },
        "DIAMOND": {
            title: "다이아몬드",
            desc: "프리미엄 재화",
            icon: <img src="/assets/icon_diamond.png" className="w-8 h-8 object-contain" alt="" />
        }
    };

    const isPendingFulfillment =
        item.item_type.startsWith("BAEMIN_GIFTICON_")
        || item.item_type.startsWith("COMPOSE_AMERICANO_GIFTICON_")
        || item.item_type === "CC_COIN_GIFTICON";

    // Fallback info
    const info = INFO[item.item_type] || {
        title: item.item_type,
        desc: "일반 아이템",
        icon: <Package className="w-5 h-5 text-white/40" />
    };

    return (
        <div className="group relative overflow-hidden bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-2xl p-4 transition-all active:scale-[0.98]">
            <div className="flex justify-between items-center relative z-10">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-black/40 flex items-center justify-center border border-white/5 shadow-inner">
                        {info.icon}
                    </div>
                    <div>
                        <h3 className="font-bold text-base text-white">{info.title}</h3>
                        <p className="text-xs text-white/40 mt-0.5">{info.desc}</p>
                    </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                    <span className="text-xl font-black text-figma-accent tracking-tight">
                        x{item.quantity.toLocaleString()}
                    </span>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (item.item_type === "DIAMOND" || isPendingFulfillment) return; // 사용 불가
                            onUse();
                        }}
                        disabled={item.quantity <= 0 || isPending || item.item_type === "DIAMOND" || isPendingFulfillment}
                        className="bg-white/10 hover:bg-white/20 disabled:bg-black/20 disabled:text-white/20 disabled:cursor-not-allowed text-white text-[11px] font-bold px-3 py-1.5 rounded-lg border border-white/5 transition-colors"
                    >
                        {item.item_type === "DIAMOND" ? "보유중" : (isPendingFulfillment ? "지급대기" : (isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "사용하기"))}
                    </button>
                </div>
            </div>

            {/* Background Glow */}
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-br from-emerald-500/10 to-transparent blur-2xl rounded-full pointer-events-none group-hover:from-emerald-500/20 transition-all duration-500" />
        </div>
    );
};

const WalletCard: React.FC<{ tokenType: string; amount: number }> = ({ tokenType, amount }) => {
    const WALLET_INFO: Record<string, { title: string; icon: string }> = {
        "ROULETTE_COIN": { title: "룰렛 티켓", icon: "/assets/asset_ticket_green.png" },
        "DICE_TOKEN": { title: "주사위 티켓", icon: "/assets/icon_dice_silver.png" },
        "LOTTERY_TICKET": { title: "복권 티켓", icon: "/assets/lottery/icon_lotto_ball.png" },
        "GOLD_KEY": { title: "골드 키", icon: "/assets/asset_ticket_gold.png" },
        "DIAMOND_KEY": { title: "다이아몬드 키", icon: "/assets/asset_ticket_diamond.png" },
        "TRIAL_TOKEN": { title: "체험 티켓", icon: "/assets/asset_ticket_trial.png" }
    };

    const info = WALLET_INFO[tokenType] || { title: tokenType, icon: "" };

    return (
        <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-black/30 border border-white/10 flex items-center justify-center p-2">
                    {info.icon ? (
                        <img src={info.icon} alt={info.title} className="w-full h-full object-contain" />
                    ) : (
                        <Coins size={18} className="text-gold-400" />
                    )}
                </div>
                <div>
                    <span className="text-xs font-bold text-white/60 block mb-0.5 tracking-wider">{info.title}</span>
                    <span className="text-lg font-black text-white tracking-tight">{amount.toLocaleString()}</span>
                </div>
            </div>
        </div>
    );
};

export default InventoryPage;
