import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchInventory, useInventoryItem, InventoryItem } from '../api/inventoryApi';
import { Loader2, Coins } from 'lucide-react';
import { useToast } from '../components/common/ToastProvider';
import { tryHaptic } from '../utils/haptics';
import { useNavigate } from 'react-router-dom';

const InventoryPage: React.FC = () => {
    const queryClient = useQueryClient();
    const { addToast, addToastNode } = useToast();
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
    const wallet = (data?.wallet && typeof data.wallet === "object" && !Array.isArray(data.wallet) ? data.wallet : {}) as Record<string, number>;
    const diamondCount = items.find((i) => i.item_type === "DIAMOND")?.quantity ?? 0;

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
                    <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-black/30 ring-1 ring-white/10">
                        <img src="/assets/icons/locker-dynamic-color.png" className="w-10 h-10 object-contain" alt="" />
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
                    <img src="/assets/icon_inventory_wallet.png" alt="보상함" className="w-full h-full object-contain" />
                </div>
                <div>
                    <h1 className="text-xl font-black text-white">보상함</h1>
                    <div className="mt-1 flex items-center gap-1.5 text-[11px] font-black text-white/60">
                        <img src="/assets/icon_diamond.png" alt="" className="w-3.5 h-3.5 object-contain" />
                        <span className="tabular-nums">{diamondCount.toLocaleString()}개</span>
                    </div>
                </div>
                <div className="ml-auto">
                    <button
                        type="button"
                        onClick={() => {
                            tryHaptic(10);
                            addToastNode(
                                <div className="text-center space-y-1">
                                    <p>배민 2만부터 기프트콘 지급</p>
                                    <p>씨씨코인 지민문의</p>
                                </div>,
                                { tone: "info" }
                            );
                        }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-[11px] font-black text-white/70 active:scale-[0.98]"
                    >
                        <img src="/assets/logo_cc_v2.png" className="w-4 h-4 object-contain" alt="" />
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
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        {items.filter(it => it.quantity > 0).length === 0 ? (
                            <div className="col-span-2 flex flex-col items-center justify-center py-12 opacity-80 space-y-4">
                                <img src="/assets/icons/icon_rocket.png" className="w-24 h-24 object-contain animate-bounce" alt="" />
                                <p className="text-white/30 font-medium tracking-tight">보유한 아이템이 없습니다</p>
                            </div>
                        ) : (
                            items
                                .filter(it => it.quantity > 0)
                                .map((item) => (
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
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            'ROULETTE_COIN',
                            'DICE_TOKEN',
                            'TRIAL_TOKEN',
                            'LOTTERY_TICKET',
                            'GOLD_KEY',
                            'DIAMOND_KEY'
                        ].map((tokenType) => (
                            <WalletCard
                                key={tokenType}
                                tokenType={tokenType}
                                amount={Number(wallet[tokenType] ?? 0)}
                            />
                        ))}
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
    const GIFTICON_BRAND_LABEL: Record<string, string> = {
        CC_COIN: "씨씨코인",
        BAEMIN: "배민",
        STARBUCKS: "스타벅스",
        CU: "CU",
        GS25: "GS25",
        COMPOSE_AMERICANO: "컴포즈 아아",
    };

    const getGifticonInfo = (itemType: string) => {
        if (!/GIFTICON/i.test(itemType)) return null;

        const amountMatch = itemType.match(/^(.+)_GIFTICON_(\d+)$/i);
        const plainMatch = itemType.match(/^(.+)_GIFTICON$/i);

        const brandCodeRaw = (amountMatch?.[1] ?? plainMatch?.[1] ?? "").toUpperCase();
        const amount = amountMatch ? Number(amountMatch[2]) : null;

        const brandLabel = GIFTICON_BRAND_LABEL[brandCodeRaw] ?? "기프티콘";
        const title = amount
            ? `${brandLabel}`
            : `${brandLabel}`;

        const sub = amount ? `${amount.toLocaleString()}원` : "기프티콘";

        const desc = brandCodeRaw === "CC_COIN"
            ? "대기 중"
            : "수기 지급";

        let iconPath = "/assets/icons/icon_cart.png";
        if (brandCodeRaw === "CC_COIN") {
            iconPath = "/assets/asset_coin_gold.webp";
        } else if (brandCodeRaw === "BAEMIN") {
            iconPath = "/assets/icons/baemin.png";
        } else if (brandCodeRaw === "COMPOSE_AMERICANO") {
            iconPath = "/assets/icons/takeaway-cup-dynamic-color.png";
        }

        return {
            title,
            sub,
            desc,
            icon: <img src={iconPath} className="w-8 h-8 object-contain" alt="" />,
        };
    };

    const INFO: Record<string, { title: string; sub: string; desc: string; icon: React.ReactNode }> = {
        "VOUCHER_GOLD_KEY_1": {
            title: "골드키",
            sub: "",
            desc: "즉시 교환",
            icon: <img src="/assets/icons/goldkey.png" className="w-8 h-8 object-contain" alt="" />
        },
        "VOUCHER_DIAMOND_KEY_1": {
            title: "다이아키",
            sub: "",
            desc: "즉시 교환",
            icon: <img src="/assets/icons/diakey.png" className="w-8 h-8 object-contain" alt="" />
        },
        "VOUCHER_DICE_TOKEN_1": {
            title: "주사위",
            sub: "",
            desc: "즉시 교환",
            icon: <img src="/assets/icon_dice_silver.png" className="w-8 h-8 object-contain" alt="" />
        },
        "VOUCHER_ROULETTE_COIN_1": {
            title: "룰렛 티켓",
            sub: "",
            desc: "즉시 교환",
            icon: <img src="/assets/asset_ticket_green.png" className="w-8 h-8 object-contain" alt="" />
        },
        "VOUCHER_LOTTERY_TICKET_1": {
            title: "복권 티켓",
            sub: "",
            desc: "즉시 교환",
            icon: <img src="/assets/lottery/icon_lotto_ball.webp" className="w-8 h-8 object-contain" alt="" />
        },
        "DIAMOND": {
            title: "다이아",
            sub: "",
            desc: "상점 재화",
            icon: <img src="/assets/icon_diamond.png" className="w-8 h-8 object-contain" alt="" />
        }
    };

    const gifticonInfo = getGifticonInfo(item.item_type);
    const isPendingFulfillment = Boolean(gifticonInfo);

    const info = INFO[item.item_type] || gifticonInfo || {
        title: item.item_type,
        sub: "",
        desc: "보유 중",
        icon: <img src="/assets/icons/locker-dynamic-color.png" className="w-5 h-5 object-contain opacity-50" alt="" />
    };

    return (
        <div className="relative group overflow-hidden bg-gradient-to-tr from-white/[0.08] to-white/[0.02] border border-white/10 rounded-[22px] p-4 transition-all active:scale-[0.98] hover:border-white/20">
            <div className="flex flex-col relative z-10 h-full items-center text-center">
                <div className="relative mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-center p-2 shadow-inner">
                        {info.icon}
                    </div>
                    <div className="absolute -top-1.5 -right-1.5 bg-figma-accent text-black text-[10px] font-black px-1.5 py-0.5 rounded-full ring-2 ring-black tabular-nums">
                        ×{item.quantity.toLocaleString()}
                    </div>
                </div>

                <div className="mb-4 flex-grow w-full">
                    <div className="mx-auto max-w-full text-[14px] font-black text-white/90 leading-tight whitespace-normal break-keep overflow-hidden line-clamp-2 min-h-[34px]">
                        {info.title}
                    </div>
                </div>

                <div className="mb-2 flex items-baseline justify-center gap-1">
                    <span className="text-lg font-black text-white tracking-tighter tabular-nums">
                        {item.quantity.toLocaleString()}
                    </span>
                    <span className="text-[10px] font-bold text-white/30">개 보유</span>
                </div>

                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        if (item.item_type === "DIAMOND" || isPendingFulfillment) return;
                        onUse();
                    }}
                    disabled={item.quantity <= 0 || isPending || item.item_type === "DIAMOND" || isPendingFulfillment}
                    className="w-full h-8 flex items-center justify-center bg-white/10 hover:bg-white/20 disabled:bg-black/20 disabled:text-white/20 disabled:cursor-not-allowed text-white text-[11px] font-bold rounded-xl border border-white/5 transition-colors"
                >
                    {item.item_type === "DIAMOND" ? "보유중" : (isPendingFulfillment ? "지급대기" : (isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "사용하기"))}
                </button>
            </div>

            <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-emerald-500/[0.03] blur-2xl rounded-full" />
        </div>
    );
};

const WalletCard: React.FC<{ tokenType: string; amount: number }> = ({ tokenType, amount }) => {
    const WALLET_INFO: Record<string, { title: string; icon: string }> = {
        "ROULETTE_COIN": { title: "룰렛 티켓", icon: "/assets/asset_ticket_green.png" },
        "DICE_TOKEN": { title: "주사위 티켓", icon: "/assets/icon_dice_silver.png" },
        "LOTTERY_TICKET": { title: "복권 티켓", icon: "/assets/lottery/icon_lotto_ball.webp" },
        "GOLD_KEY": { title: "골드 키", icon: "/assets/icons/goldkey.png" },
        "DIAMOND_KEY": { title: "다이아 키", icon: "/assets/icons/diakey.png" },
        "TRIAL_TOKEN": { title: "체험 티켓", icon: "/assets/asset_ticket_trial.png" }
    };

    const info = WALLET_INFO[tokenType] || { title: tokenType, icon: "" };

    return (
        <div className="relative group overflow-hidden bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/10 rounded-[22px] p-4 transition-all active:scale-[0.98] hover:border-white/20">
            <div className="flex flex-col relative z-10 items-center text-center">
                <div className="mb-4 w-12 h-12 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-center p-2 shadow-inner">
                    {info.icon ? (
                        <img src={info.icon} alt={info.title} className="w-full h-full object-contain" />
                    ) : (
                        <Coins size={24} className="text-white/20" />
                    )}
                </div>

                <div className="mb-3 w-full">
                    <div className="mx-auto max-w-full text-[14px] font-black text-white/90 leading-tight whitespace-normal break-keep overflow-hidden line-clamp-2 min-h-[34px]">
                        {info.title}
                    </div>
                </div>

                <div className="flex items-baseline justify-center gap-1">
                    <span className="text-2xl font-black text-white tracking-tighter tabular-nums">
                        {amount.toLocaleString()}
                    </span>
                    <span className="text-[10px] font-bold text-white/30">개</span>
                </div>
            </div>

            {/* Subtle Gradient Glow */}
            <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/[0.03] blur-2xl rounded-full" />
        </div>
    );
};

export default InventoryPage;
