import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchShopProducts, purchaseProduct, ShopProduct, fetchInventory } from '../api/inventoryApi';
import { Loader2, Lock } from 'lucide-react';
import { useToast } from '../components/common/ToastProvider';
import { tryHaptic } from '../utils/haptics';
import { useNavigate } from 'react-router-dom';
import Button from '../components/common/Button';
import { getVaultStatus } from '../api/vaultApi';
import { motion, useMotionValue, useTransform } from 'framer-motion';

// --- Components ---
const BalanceHero: React.FC<{ balance: number }> = ({ balance }) => (
    <div className="mx-4 mt-6 mb-8 relative group">
        {/* Glow Effect behind */}
        <div className="absolute inset-0 bg-emerald-500/20 blur-[60px] rounded-full opacity-50 pointer-events-none" />

        <div className="relative p-6 rounded-[2.5rem] bg-gradient-to-br from-[#0A0A0A] via-[#111] to-[#050505] border border-emerald-500/20 shadow-[0_20px_50px_-20px_rgba(16,185,129,0.3)] overflow-hidden">
            {/* Texture/Pattern Overlay */}
            <div className="absolute inset-0 bg-black/20" />
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
            </div>
        </div>
    </div>
);

const ProductCard: React.FC<{ product: ShopProduct; vaultBalance: number; onBuy: () => void; isPending: boolean }> = ({ product, vaultBalance, onBuy, isPending }) => {
    const cost = product.cost.amount;
    const canAfford = vaultBalance >= cost;

    const MAP: Record<string, { label: string, img: string, rarity: 'common' | 'rare' | 'epic' | 'legendary' }> = {
        'VOUCHER_ROULETTE_COIN_1': { label: "룰렛 ?�켓", img: "/assets/asset_ticket_green.png", rarity: 'rare' },
        'VOUCHER_DICE_TOKEN_1': { label: "주사???�켓", img: "/assets/icon_dice_silver.png", rarity: 'rare' },
        'VOUCHER_LOTTERY_TICKET_1': { label: "복권 ?�켓", img: "/assets/lottery/icon_lotto_ball.webp", rarity: 'rare' },
        'VOUCHER_GOLD_KEY_1': { label: "골드 ??, img: "/assets/icons/goldkey.png", rarity: 'epic' },
        'VOUCHER_DIAMOND_KEY_1': { label: "?�이????, img: "/assets/icons/diakey.png", rarity: 'legendary' },
        'ROULETTE_COIN': { label: "룰렛 ?�켓", img: "/assets/asset_ticket_green.png", rarity: 'rare' },
        'DICE_TOKEN': { label: "주사???�켓", img: "/assets/icon_dice_silver.png", rarity: 'rare' },
        'LOTTERY_TICKET': { label: "복권 ?�켓", img: "/assets/lottery/icon_lotto_ball.webp", rarity: 'rare' },
        'GOLD_KEY': { label: "골드 ??, img: "/assets/icons/goldkey.png", rarity: 'epic' },
        'DIAMOND_KEY': { label: "?�이????, img: "/assets/icons/diakey.png", rarity: 'legendary' },
    };

    const info = MAP[product.grant.item_type] || MAP[product.cost.token] || { label: product.title, img: "/assets/lottery/icon_gift.png", rarity: 'common' };

    // 3D Tilt Logic (Shared from InventoryPage)
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
            className={`relative group h-[200px] overflow-visible rounded-[24px] border bg-gradient-to-br transition-all duration-300 perspective-1000 ${rarityStyles[info.rarity as keyof typeof rarityStyles] || rarityStyles.common} ${!canAfford ? 'opacity-60 grayscale' : 'hover:scale-[1.02]'}`}
            onClick={() => {
                if (!canAfford || isPending) {
                    tryHaptic(50);
                    return;
                }
                tryHaptic(10);
                onBuy();
            }}
        >
            <div className="absolute inset-0 rounded-[24px] overflow-hidden" style={{ transform: "translateZ(0px)" }}>
                <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none mix-blend-overlay" />

                <div className="flex flex-col relative z-10 h-full items-center text-center p-4">
                    {/* Icon Section */}
                    <div className="relative mb-4 mt-2" style={{ transform: "translateZ(20px)" }}>
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center p-1 shadow-inner backdrop-blur-md ${info.rarity === 'legendary' ? 'bg-amber-500/20 border border-amber-500/30' : 'bg-black/40 border border-white/5'}`}>
                            <img src={info.img} alt={info.label} className="w-full h-full object-contain filter drop-shadow-[0_5px_5px_rgba(0,0,0,0.5)]" />
                        </div>
                        <div className="absolute -top-1.5 -right-1.5 bg-white text-black text-[10px] font-black px-1.5 py-0.5 rounded-full ring-2 ring-black tabular-nums shadow-lg z-10">
                            ×{product.grant.amount.toLocaleString()}
                        </div>
                    </div>

                    {/* Title Section */}
                    <div className="mb-auto w-full" style={{ transform: "translateZ(10px)" }}>
                        <div className="mx-auto max-w-full text-sm font-black text-white/90 leading-tight whitespace-normal break-keep overflow-hidden line-clamp-2">
                            {info.label}
                        </div>
                        <div className={`text-[10px] font-bold mt-1 uppercase tracking-wider ${info.rarity === 'legendary' ? 'text-amber-400' : 'text-white/40'}`}>
                            {info.rarity === 'common' ? 'Basic Item' : `${info.rarity} Item`}
                        </div>
                    </div>

                    {/* Price/Buy Section */}
                    <div className="w-full mt-2" style={{ transform: "translateZ(20px)" }}>
                        <div className={`
                            w-full h-9 rounded-xl text-[11px] font-black flex items-center justify-center gap-1.5 transition-all
                            ${canAfford
                                ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-black shadow-lg"
                                : "bg-white/5 border border-white/10 text-white/20"}
                        `}>
                            {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : (
                                <>
                                    <span className={`tabular-nums text-xs ${canAfford ? "" : "line-through opacity-50"}`}>
                                        {cost.toLocaleString()}
                                    </span>
                                    {product.cost.token === 'DIAMOND' ? (
                                        <img src="/assets/icon_diamond.png" className="w-3 h-3 object-contain" alt="" />
                                    ) : (
                                        <span className="text-[9px] opacity-75">P</span>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* Subtle Glow at bottom right */}
                    <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/[0.03] blur-2xl rounded-full pointer-events-none" />
                </div>
            </div>
        </motion.div>
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
        retry: false,
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
            addToast(`교환 ?�료! ${data?.reward_token ?? "?�이??}??지급되?�습?�다.`, "success"); // Simple Toast
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
            queryClient.invalidateQueries({ queryKey: ['vault-status'] });
        },
        onError: (error: any) => {
            tryHaptic(50);
            const msg = error.response?.data?.detail || "교환 ?�패";
            addToast(msg, "error");
        }
    });

    // Filter Logic
    const vaultProducts = (products ?? []).filter((p) => {
        const token = String(p.cost?.token ?? "").toUpperCase();
        return token === "VAULT" && p.is_active !== false;
    });
    const diamondProducts = (products ?? []).filter((p) => {
        const token = String(p.cost?.token ?? "").toUpperCase();
        return token === "DIAMOND" && p.is_active !== false;
    });

    if (isLoading) return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>;
    if (isError) return (
        <div className="flex flex-col items-center justify-center h-[50vh] text-white/50 gap-4">
            <p>?�품 ?�보�?불러?????�습?�다.</p>
            <Button onClick={() => refetch()} variant="figma-secondary">?�시 ?�도</Button>
        </div>
    );

    return (
        <div className="mx-auto w-full max-w-lg min-h-screen bg-black pb-[calc(96px+env(safe-area-inset-bottom))]">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-black/80 backdrop-blur-xl border-b border-white/5 px-4 h-14 flex items-center justify-between">
                <h1 className="text-[15px] font-bold text-white flex items-center gap-1.5 tracking-tight">
                    <img src="/assets/icons/icon_cart.png" className="w-5 h-5 object-contain" alt="" />
                    교환??
                </h1>

                <button
                    onClick={() => navigate('/inventory')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 active:scale-95 transition-all text-[15px] font-bold text-white/70 border border-white/5"
                >
                    <img src="/assets/icon_inventory_wallet.png" className="w-5 h-5 object-contain opacity-70" alt="" />
                    보상??
                </button>
            </div>

            {/* Hero Balance */}
            <BalanceHero balance={lockedBalance} />

            {/* Vault Products Grid */}
            <div className="px-4">
                <div className="flex items-center gap-2 mb-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]" />
                    <h2 className="text-sm font-black text-white">?�켓 교환</h2>
                    <span className="text-[10px] text-emerald-400/70 font-medium ml-auto">금고 ?�인???�용</span>
                </div>

                {vaultProducts.length > 0 ? (
                    <div className="flex gap-3 overflow-x-auto pb-3 snap-x snap-mandatory scrollbar-hide -mx-1 px-1">
                        {vaultProducts.map(p => (
                            <div className="flex-shrink-0 w-[45%] snap-start" key={p.sku}>
                                <ProductCard
                                    product={p}
                                    vaultBalance={lockedBalance}
                                    onBuy={() => purchaseMutation.mutate(p.sku)}
                                    isPending={purchaseMutation.isPending}
                                />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-12 text-center text-white/30 text-xs bg-white/5 rounded-2xl border border-white/5">
                        교환 가?�한 ?�품???�습?�다.
                    </div>
                )}
            </div>

            {/* Diamond (Mileage) Section */}
            {diamondProducts.length > 0 && (
                <div className="mt-10 px-4 pb-8">
                    <div className="flex items-center gap-2 mb-3 border-t border-white/10 pt-6">
                        <img src="/assets/icon_diamond.png" className="w-4 h-4" alt="" />
                        <h2 className="text-sm font-black text-white">?�이????/h2>
                    </div>
                    <div className="flex gap-3 overflow-x-auto pb-3 snap-x snap-mandatory scrollbar-hide -mx-1 px-1">
                        {diamondProducts.map(p => (
                            <div className="flex-shrink-0 w-[45%] snap-start" key={p.sku}>
                                <ProductCard
                                    product={p}
                                    vaultBalance={p.cost.token === 'DIAMOND'
                                        ? diamondBalance // Used diamondBalance variable
                                        : lockedBalance
                                    }
                                    onBuy={() => purchaseMutation.mutate(p.sku)}
                                    isPending={purchaseMutation.isPending}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExchangePage;
