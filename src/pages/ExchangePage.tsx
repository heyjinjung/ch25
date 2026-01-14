import React from 'react';
import clsx from 'clsx';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchShopProducts, purchaseProduct, ShopProduct, fetchInventory } from '../api/inventoryApi';
import { Loader2, Lock, ShoppingBag } from 'lucide-react';
import { useToast } from '../components/common/ToastProvider';
import { tryHaptic } from '../utils/haptics';
import { useNavigate } from 'react-router-dom';
import Button from '../components/common/Button';
import { getVaultStatus } from '../api/vaultApi';

// --- Components ---
const BalanceHero: React.FC<{ balance: number }> = ({ balance }) => (
    <div className="mx-4 mt-6 mb-8 relative group">
        {/* Glow Effect behind */}
        <div className="absolute inset-0 bg-emerald-500/20 blur-[60px] rounded-full opacity-50 pointer-events-none" />

        <div className="relative p-6 rounded-[2.5rem] bg-gradient-to-br from-[#0A0A0A] via-[#111] to-[#050505] border border-emerald-500/20 shadow-[0_20px_50px_-20px_rgba(16,185,129,0.3)] overflow-hidden">
            {/* Texture/Pattern Overlay */}
            <div className="absolute inset-0 bg-[url('/assets/noise.png')] opacity-[0.03]" />
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

            <div className="relative z-10 flex flex-col items-center">
                <div className="flex items-center gap-2 mb-4 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-md">
                    <Lock className="w-3 h-3 text-emerald-400" />
                    <span className="text-[10px] font-black text-emerald-400 tracking-widest uppercase">VAULT LOCKED BALANCE</span>
                </div>

                <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-5xl font-black tracking-tighter text-white drop-shadow-[0_2px_10px_rgba(16,185,129,0.5)] tabular-nums">
                        {balance.toLocaleString()}
                    </span>
                    <span className="text-xl font-bold text-emerald-500">P</span>
                </div>

                <div className="h-px w-12 bg-gradient-to-r from-transparent via-white/20 to-transparent my-4" />

                <p className="text-[11px] text-white/40 font-medium">
                    <span className="text-emerald-400">티켓 교환</span> 전용 재화입니다
                </p>
            </div>
        </div>
    </div>
);

const ProductCard: React.FC<{ product: ShopProduct; vaultBalance: number; onBuy: () => void; isPending: boolean }> = ({ product, vaultBalance, onBuy, isPending }) => {
    const cost = product.cost.amount;
    const canAfford = vaultBalance >= cost;

    const MAP: Record<string, { label: string, img: string }> = {
        'VOUCHER_ROULETTE_COIN_1': { label: "룰렛 티켓", img: "/assets/asset_ticket_green.png" },
        'VOUCHER_DICE_TOKEN_1': { label: "주사위 티켓", img: "/assets/icon_dice_silver.png" },
        'VOUCHER_LOTTERY_TICKET_1': { label: "복권 티켓", img: "/assets/lottery/icon_lotto_ball.webp" },
        'VOUCHER_GOLD_KEY_1': { label: "골드 키", img: "/assets/asset_ticket_gold.png" },
        'VOUCHER_DIAMOND_KEY_1': { label: "다이아 키", img: "/assets/asset_ticket_diamond.png" },
        'ROULETTE_COIN': { label: "룰렛 티켓", img: "/assets/asset_ticket_green.png" },
        'DICE_TOKEN': { label: "주사위 티켓", img: "/assets/icon_dice_silver.png" },
        'GOLD_KEY': { label: "골드 키", img: "/assets/asset_ticket_gold.png" },
        'DIAMOND_KEY': { label: "다이아 키", img: "/assets/asset_ticket_diamond.png" },
    };

    const info = MAP[product.grant.item_type] || MAP[product.cost.token] || { label: product.title, img: "/assets/lottery/icon_gift.png" };

    return (
        <div className={clsx(
            "relative group overflow-hidden bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/10 rounded-[22px] p-4 transition-all duration-300",
            !canAfford && "opacity-60 grayscale-[0.5]"
        )}>
            <div className="flex flex-col relative z-10 items-center text-center">
                {/* Icon Box */}
                <div className="relative mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-center p-2 shadow-inner group-hover:scale-110 transition-transform duration-300">
                        <img src={info.img} alt={info.label} className="w-full h-full object-contain" />
                    </div>
                    {product.grant.amount > 1 && (
                        <div className="absolute -top-1.5 -right-1.5 bg-figma-accent text-black text-[10px] font-black px-1.5 py-0.5 rounded-full ring-2 ring-black tabular-nums">
                            ×{product.grant.amount}
                        </div>
                    )}
                </div>

                {/* Title */}
                <div className="mb-3 w-full">
                    <div className="mx-auto max-w-full text-[14px] font-black text-white/90 leading-tight whitespace-normal break-keep overflow-hidden line-clamp-2 min-h-[34px]">
                        {info.label}
                    </div>
                </div>

                {/* Price Display */}
                <div className="mb-4 flex items-baseline justify-center gap-1">
                    <span className={clsx(
                        "text-2xl font-black tracking-tighter tabular-nums",
                        canAfford ? "text-white" : "text-white/30"
                    )}>
                        {cost.toLocaleString()}
                    </span>
                    {product.cost.token === 'DIAMOND' ? (
                        <img src="/assets/icon_diamond.png" className="w-3.5 h-3.5 object-contain" alt="" />
                    ) : (
                        <span className="text-[10px] font-bold text-emerald-500/50">P</span>
                    )}
                </div>

                {/* Action Button */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        if (!canAfford || isPending) return;
                        tryHaptic(10);
                        onBuy();
                    }}
                    disabled={isPending || !canAfford}
                    className={clsx(
                        "w-full h-9 flex items-center justify-center text-[12px] font-black rounded-xl transition-all border outline-none",
                        canAfford
                            ? "bg-figma-primary border-figma-primary text-white shadow-lg shadow-emerald-900/40 active:scale-[0.97] hover:brightness-110"
                            : "bg-white/5 border-white/5 text-white/20 cursor-not-allowed"
                    )}
                >
                    {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : (canAfford ? "교환하기" : (product.cost.token === 'DIAMOND' ? "다이아 부족" : "포인트 부족"))}
                </button>
            </div>

            {/* Subtle Gradient Glow */}
            <div className={clsx(
                "absolute -right-6 -bottom-6 w-24 h-24 blur-2xl rounded-full transition-colors duration-500",
                canAfford ? "bg-emerald-500/[0.05]" : "bg-white/[0.02]"
            )} />
        </div>
    );
};

const ExchangePage: React.FC = () => {
    const queryClient = useQueryClient();
    const { addToast } = useToast();
    const navigate = useNavigate();

    // 1. Vault Balance (Source of Funds)
    const { data: vault } = useQuery({
        queryKey: ["vault-status"],
        queryFn: getVaultStatus,
        refetchInterval: 5000,
    });
    const lockedBalance = vault?.vaultBalance ?? 0; // Use LOCKED balance

    // 2. Inventory (to get Diamond balance)
    const { data: inventory } = useQuery({
        queryKey: ['inventory'],
        queryFn: fetchInventory,
        refetchInterval: 10000,
    });
    const diamondBalance = inventory?.items?.find((i: any) => i.item_type === 'DIAMOND')?.quantity ?? 0;

    // 3. Products
    const { data: products, isLoading, isError, refetch } = useQuery({
        queryKey: ['shopProducts'],
        queryFn: fetchShopProducts,
        staleTime: 60 * 1000,
    });

    const purchaseMutation = useMutation({
        mutationFn: (sku: string) => purchaseProduct(sku),
        onSuccess: (data) => {
            tryHaptic(20);
            addToast(`교환 완료! ${data?.reward_token ?? "아이템"}이 지급되었습니다.`, "success"); // Simple Toast
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
            queryClient.invalidateQueries({ queryKey: ['vault-status'] });
        },
        onError: (error: any) => {
            tryHaptic(50);
            const msg = error.response?.data?.detail || "교환 실패";
            addToast(msg, "error");
        }
    });

    // Filter Logic
    const vaultProducts = products?.filter(p => p.cost.token === 'VAULT') || [];
    const diamondProducts = products?.filter(p => p.cost.token === 'DIAMOND') || [];

    if (isLoading) return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>;
    if (isError) return (
        <div className="flex flex-col items-center justify-center h-[50vh] text-white/50 gap-4">
            <p>상품 정보를 불러올 수 없습니다.</p>
            <Button onClick={() => refetch()} variant="figma-secondary">다시 시도</Button>
        </div>
    );

    return (
        <div className="mx-auto w-full max-w-lg min-h-screen bg-black pb-[calc(96px+env(safe-area-inset-bottom))]">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-black/80 backdrop-blur-xl border-b border-white/5 px-4 h-14 flex items-center justify-between">
                <h1 className="text-lg font-black text-white flex items-center gap-2 tracking-tight">
                    <ShoppingBag className="w-5 h-5 text-emerald-500" />
                    교환소
                </h1>

                <button
                    onClick={() => navigate('/inventory')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 active:scale-95 transition-all text-[11px] font-bold text-white/70 border border-white/5"
                >
                    <img src="/assets/icon_inventory_wallet.png" className="w-3.5 h-3.5 object-contain opacity-70" alt="" />
                    보상함
                </button>
            </div>

            {/* Hero Balance */}
            <BalanceHero balance={lockedBalance} />

            {/* Vault Products Grid */}
            <div className="px-4">
                <div className="flex items-center gap-2 mb-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]" />
                    <h2 className="text-sm font-black text-white">티켓 교환</h2>
                    <span className="text-[10px] text-emerald-400/70 font-medium ml-auto">금고 포인트 사용</span>
                </div>

                {vaultProducts.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3">
                        {vaultProducts.map(p => (
                            <ProductCard
                                key={p.sku}
                                product={p}
                                vaultBalance={lockedBalance}
                                onBuy={() => purchaseMutation.mutate(p.sku)}
                                isPending={purchaseMutation.isPending}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="py-12 text-center text-white/30 text-xs bg-white/5 rounded-2xl border border-white/5">
                        교환 가능한 상품이 없습니다.
                    </div>
                )}
            </div>

            {/* Diamond (Mileage) Section */}
            {diamondProducts.length > 0 && (
                <div className="mt-10 px-4 pb-8">
                    <div className="flex items-center gap-2 mb-3 border-t border-white/10 pt-6">
                        <img src="/assets/icon_diamond.png" className="w-4 h-4" alt="" />
                        <h2 className="text-sm font-black text-white">다이아 샵</h2>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        {diamondProducts.map(p => (
                            <ProductCard
                                key={p.sku}
                                product={p}
                                vaultBalance={p.cost.token === 'DIAMOND'
                                    ? diamondBalance
                                    : lockedBalance
                                }
                                onBuy={() => purchaseMutation.mutate(p.sku)}
                                isPending={purchaseMutation.isPending}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExchangePage;
