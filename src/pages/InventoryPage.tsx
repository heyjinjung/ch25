import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchInventory, useInventoryItem, InventoryItem } from '../api/inventoryApi';
import { adminApi } from '../admin/api/httpClient';
import { Loader2, Coins } from 'lucide-react';
import { useToast } from '../components/common/ToastProvider';
import { tryHaptic } from '../utils/haptics';
import { useNavigate } from 'react-router-dom';
import { motion, useMotionValue, useTransform } from "framer-motion";

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

    const useCraftAction = useMutation({
        mutationFn: ({ target_token_type }: { target_token_type: string }) => adminApi.post("/api/exchange/craft", { target_token_type }),
        onSuccess: (data: any) => {
            tryHaptic(20);
            addToast(`제작 완료: ${data.reward_token} x${data.reward_amount}`, "success");
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
        },
        onError: (error: any) => {
            const msg = error.response?.data?.detail || "제작 실패";
            tryHaptic(50);
            addToast(msg, "error");
        }
    });

    const items = Array.isArray(data?.items) ? data.items : [];
    const wallet = (data?.wallet && typeof data.wallet === "object" && !Array.isArray(data.wallet) ? data.wallet : {}) as Record<string, number>;


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
        <div className="mx-auto w-full max-w-lg min-h-screen bg-black pb-[calc(96px+env(safe-area-inset-bottom))]">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-black/80 backdrop-blur-xl border-b border-white/5 px-4 h-14 flex items-center justify-between" data-tour="inventory-link">
                <h1 className="text-[15px] font-bold text-white flex items-center gap-1.5 tracking-tight">
                    <img src="/assets/icon_inventory_wallet.png" className="w-5 h-5 object-contain" alt="보상함" />
                    보상함
                </h1>
                <button
                    onClick={() => navigate('/shop')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 active:scale-95 transition-all text-[15px] font-bold text-white/70 border border-white/5"
                >
                    <img src="/assets/icons/icon_cart.png" className="w-5 h-5 object-contain opacity-70" alt="교환소" />
                    교환소
                </button>
            </div>

            {/* Tabs (route) */}
            <div className="mb-6" data-tour="inventory-tabs">
                <div className="relative flex p-1.5 bg-gradient-to-r from-white/5 to-white/[0.03] rounded-2xl border border-white/10 shadow-inner">
                    <button
                        type="button"
                        data-tour="inventory-items-tab"
                        disabled
                        className="relative flex-1 py-3.5 text-sm font-black rounded-xl transition-all bg-gradient-to-r from-figma-primary to-emerald-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.2)] overflow-hidden"
                    >
                        <span className="relative z-10">보유함</span>
                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 animate-shine" />
                    </button>
                    <button
                        type="button"
                        data-tour="inventory-wallet-tab"
                        onClick={() => {
                            tryHaptic(10);
                            navigate('/shop');
                        }}
                        className="flex-1 py-3.5 text-sm font-black rounded-xl transition-all text-white/60 hover:text-white hover:bg-white/10 active:scale-[0.98] hover:shadow-md"
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
                    <div className="flex gap-3 overflow-x-auto pb-3 snap-x snap-mandatory scrollbar-hide -mx-1 px-1">
                        {items.filter(it => it.quantity > 0).length === 0 ? (
                            <div className="w-full flex flex-col items-center justify-center py-12 space-y-3">
                                <div className="relative mb-2">
                                    <div className="absolute inset-0 bg-emerald-500/10 blur-3xl rounded-full" />
                                    <img
                                        src="/assets/icons/rocket-dynamic-color.png"
                                        className="relative z-10 w-20 h-20 object-contain opacity-20 grayscale"
                                        alt=""
                                    />
                                </div>
                                <p className="text-white/20 text-sm font-bold tracking-tight">보유한 아이템이 없습니다</p>
                            </div>
                        ) : (
                            items
                                .filter(it => it.quantity > 0)
                                .map((item) => (
                                    <div className="flex-shrink-0 w-[45%] snap-start">
                                        <ItemCard
                                            key={item.item_type}
                                            item={item}
                                            onUse={() => {
                                                if (item.item_type.includes("FRAGMENT")) {
                                                    const target = item.item_type === "GOLD_KEY_FRAGMENT" ? "GOLD_KEY" : "DIAMOND_KEY";
                                                    useCraftAction.mutate({ target_token_type: target });
                                                } else {
                                                    useMutationAction.mutate({ item_type: item.item_type, amount: 1 });
                                                }
                                            }}
                                            isPending={useMutationAction.isPending || useCraftAction.isPending}
                                        />
                                    </div>
                                ))
                        )}
                    </div>
                </div>

                <div>
                    <div className="mb-3 flex items-baseline justify-between">
                        <h2 className="text-[14px] font-black text-white/90">티켓 지갑</h2>
                    </div>
                    <div className="flex gap-3 overflow-x-auto pb-3 snap-x snap-mandatory scrollbar-hide -mx-1 px-1">
                        {[
                            'ROULETTE_COIN',
                            'DICE_TOKEN',
                            'TRIAL_TOKEN',
                            'LOTTERY_TICKET',
                            'GOLD_KEY',
                            'DIAMOND_KEY'
                        ].map((tokenType) => (
                            <div key={tokenType} className="flex-shrink-0 w-[45%] snap-start">
                                <WalletCard
                                    tokenType={tokenType}
                                    amount={Number(wallet[tokenType] ?? 0)}
                                />
                            </div>
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
            icon: <img src={iconPath} className="w-full h-full object-contain" alt="" />,
        };
    };

    const INFO: Record<string, { title: string; sub: string; desc: string; icon: React.ReactNode; rarity: 'common' | 'rare' | 'epic' | 'legendary' }> = {
        "VOUCHER_GOLD_KEY_1": {
            title: "골드키",
            sub: "",
            desc: "즉시 교환",
            icon: <img src="/assets/icons/goldkey.png" className="w-full h-full object-contain" alt="" />,
            rarity: 'epic'
        },
        "VOUCHER_DIAMOND_KEY_1": {
            title: "다이아키",
            sub: "",
            desc: "즉시 교환",
            icon: <img src="/assets/icons/diakey.png" className="w-full h-full object-contain" alt="" />,
            rarity: 'legendary'
        },
        "VOUCHER_DICE_TOKEN_1": {
            title: "주사위",
            sub: "",
            desc: "즉시 교환",
            icon: <img src="/assets/icon_dice_silver.png" className="w-full h-full object-contain" alt="" />,
            rarity: 'rare'
        },
        "VOUCHER_ROULETTE_COIN_1": {
            title: "룰렛 티켓",
            sub: "",
            desc: "즉시 교환",
            icon: <img src="/assets/asset_ticket_green.png" className="w-full h-full object-contain" alt="" />,
            rarity: 'rare'
        },
        "VOUCHER_LOTTERY_TICKET_1": {
            title: "복권 티켓",
            sub: "",
            desc: "즉시 교환",
            icon: <img src="/assets/lottery/icon_lotto_ball.webp" className="w-full h-full object-contain" alt="" />,
            rarity: 'rare'
        },
        "DIAMOND": {
            title: "다이아",
            sub: "",
            desc: "상점 재화",
            icon: <img src="/assets/icon_diamond.png" className="w-full h-full object-contain" alt="" />,
            rarity: 'legendary'
        },
        "GOLD_KEY_FRAGMENT": {
            title: "골드키 조각",
            sub: "10개 모아 제작",
            desc: "제작 재료",
            icon: <img src="/assets/icons/gold_key_fragment.png" className="w-full h-full object-contain" alt="" />,
            rarity: 'rare'
        },
        "DIAMOND_KEY_FRAGMENT": {
            title: "다이아키 조각",
            sub: "30개 모아 제작",
            desc: "제작 재료",
            icon: <img src="/assets/icons/diamond_key_fragment.png" className="w-full h-full object-contain" alt="" />,
            rarity: 'epic'
        }
    };

    const gifticonInfo = getGifticonInfo(item.item_type);
    const isPendingFulfillment = Boolean(gifticonInfo);

    const info = INFO[item.item_type] || (gifticonInfo ? { ...gifticonInfo, rarity: 'epic' } : {
        title: item.item_type,
        sub: "",
        desc: "보유 중",
        icon: <img src="/assets/icons/locker-dynamic-color.png" className="w-full h-full object-contain opacity-50" alt="" />,
        rarity: 'common'
    });

    // 3D Tilt Logic
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const rotateX = useTransform(y, [-0.5, 0.5], ["15deg", "-15deg"]);
    const rotateY = useTransform(x, [-0.5, 0.5], ["-15deg", "15deg"]);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const xPct = mouseX / width - 0.5;
        const yPct = mouseY / height - 0.5;
        x.set(xPct);
        y.set(yPct);
    };

    const handleMouseLeave = () => {
        x.set(0);
        y.set(0);
    };

    // Rarity Styles
    const rarityStyles = {
        common: "border-white/10 shadow-none from-white/[0.05] to-white/[0.01]",
        rare: "border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.15)] from-blue-900/20 to-blue-900/5",
        epic: "border-purple-500/40 shadow-[0_0_20px_rgba(168,85,247,0.2)] from-purple-900/30 to-purple-900/10",
        legendary: "border-amber-500/50 shadow-[0_0_25px_rgba(245,158,11,0.25)] from-amber-900/40 to-amber-900/10"
    };

    return (
        <motion.div
            style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className={`relative group h-[200px] overflow-visible rounded-[24px] border bg-gradient-to-br transition-colors duration-300 perspective-1000 ${rarityStyles[info.rarity as keyof typeof rarityStyles] || rarityStyles.common}`}
        >
            {/* Inner Content */}
            <div className="absolute inset-0 rounded-[24px] overflow-hidden" style={{ transform: "translateZ(0px)" }}>
                {/* Shine Effect */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none mix-blend-overlay" />

                <div className="flex flex-col relative z-10 h-full items-center text-center p-4">
                    <div className="relative mb-4 mt-2" style={{ transform: "translateZ(20px)" }}>
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center p-1 shadow-inner backdrop-blur-md ${info.rarity === 'legendary' ? 'bg-amber-500/20 border border-amber-500/30' : 'bg-black/40 border border-white/5'}`}>
                            {info.icon}
                        </div>
                        <div className="absolute -top-1.5 -right-1.5 bg-white text-black text-[10px] font-black px-1.5 py-0.5 rounded-full ring-2 ring-black tabular-nums shadow-lg">
                            ×{item.quantity.toLocaleString()}
                        </div>
                    </div>

                    <div className="mb-auto w-full" style={{ transform: "translateZ(10px)" }}>
                        <div className="mx-auto max-w-full text-sm font-black text-white/90 leading-tight whitespace-normal break-keep overflow-hidden line-clamp-2">
                            {info.title}
                        </div>
                        <div className={`text-[10px] font-bold mt-1 uppercase tracking-wider ${info.rarity === 'legendary' ? 'text-amber-400' : 'text-white/40'}`}>
                            {info.rarity === 'common' ? 'Basic Item' : `${info.rarity} Item`}
                        </div>
                    </div>

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (item.item_type === "DIAMOND" || isPendingFulfillment) return;
                            onUse();
                        }}
                        disabled={item.quantity <= 0 || isPending || item.item_type === "DIAMOND" || isPendingFulfillment}
                        className="w-full h-9 flex items-center justify-center bg-white/10 hover:bg-white/20 disabled:bg-black/20 disabled:text-white/20 disabled:cursor-not-allowed text-white text-[11px] font-bold rounded-xl border border-white/5 transition-colors shadow-lg"
                        style={{ transform: "translateZ(20px)" }}
                    >
                        {item.item_type === "DIAMOND" ? "보유중" : (item.item_type.includes("FRAGMENT") ? "제작하기 (Craft)" : (isPendingFulfillment ? "지급대기" : (isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "사용하기")))}
                    </button>
                </div>
            </div>
        </motion.div>
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
