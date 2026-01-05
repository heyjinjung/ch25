import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchInventory, fetchShopProducts, purchaseProduct, ShopProduct } from '../api/inventoryApi';
import { Loader2, ShoppingBag } from 'lucide-react';
import { useToast } from '../components/common/ToastProvider';
import { tryHaptic } from '../utils/haptics';

const ShopPage: React.FC = () => {
    const queryClient = useQueryClient();
    const { addToast } = useToast();

    const { data: products, isLoading, isError, refetch } = useQuery({
        queryKey: ['shopProducts'],
        queryFn: fetchShopProducts,
        retry: 3,
        staleTime: 30_000,
    });

    const { data: inventoryData } = useQuery({
        queryKey: ['inventory'],
        queryFn: fetchInventory,
    });

    const purchaseMutation = useMutation({
        mutationFn: (sku: string) => purchaseProduct(sku),
        onSuccess: (data) => {
            tryHaptic(20);
            addToast(`구매 완료: ${data.granted.item_type} x${data.granted.amount}`, "success");
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
            queryClient.invalidateQueries({ queryKey: ['vault-status'] });
        },
        onError: (error: any) => {
            tryHaptic(50);
            const msg = error.response?.data?.detail || "구매에 실패했습니다";
            addToast(msg, "error");
        }
    });

    if (isLoading) {
        return (
            <div className="mx-auto w-full max-w-lg py-16 flex flex-col items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-emerald-500/70" />
                <p className="mt-4 text-white/50 text-sm font-medium">상점 불러오는 중...</p>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="mx-auto w-full max-w-lg pb-[calc(96px+env(safe-area-inset-bottom))]">
                <div className="rounded-[24px] border border-white/10 bg-white/5 p-6 text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-black/40 ring-1 ring-white/10">
                        <ShoppingBag className="h-6 w-6 text-white/40" />
                    </div>
                    <div className="text-sm font-black text-white/90">연결 실패</div>
                    <div className="mt-1 text-[11px] font-medium text-white/50">상점 정보를 불러오지 못했습니다.</div>
                    <button
                        onClick={() => { tryHaptic(10); refetch(); }}
                        className="mt-4 px-6 py-2.5 bg-emerald-600/80 hover:bg-emerald-600 text-white text-sm font-bold rounded-xl active:scale-[0.98] transition-all"
                    >
                        다시 시도
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto w-full max-w-lg pb-[calc(96px+env(safe-area-inset-bottom))]">
            {/* Header */}
            <div className="mb-5 flex items-center gap-3" data-tour="shop-link">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center">
                    <ShoppingBag className="w-5 h-5 text-emerald-400/80" />
                </div>
                <div>
                    <h1 className="text-xl font-black text-white">상점</h1>
                    <p className="text-[10px] text-white/35 tracking-widest font-medium">PREMIUM SHOP</p>
                </div>
            </div>

            {/* Products Grid */}
            <div className="space-y-3">
                {Array.isArray(products) && products.length > 0 ? (
                    products.map((product) => (
                        <ProductCard
                            key={product.sku}
                            product={product}
                            diamondBalance={
                                Array.isArray(inventoryData?.items)
                                    ? (inventoryData.items.find((i) => i.item_type === 'DIAMOND')?.quantity ?? 0)
                                    : 0
                            }
                            onBuy={() => purchaseMutation.mutate(product.sku)}
                            isPending={purchaseMutation.isPending}
                        />
                    ))
                ) : (
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
                        <div className="text-sm font-bold text-white/70">상품 준비 중</div>
                        <div className="mt-1 text-[11px] font-medium text-white/40">곧 새로운 상품이 등록됩니다.</div>
                    </div>
                )}
            </div>
        </div>
    );
};

interface ProductCardProps {
    product: ShopProduct;
    diamondBalance: number;
    onBuy: () => void;
    isPending: boolean;
}

// 아이템 타입 한글화 매핑
const ITEM_NAMES: Record<string, string> = {
    'VOUCHER_GOLD_KEY_1': '골드키 교환권',
    'VOUCHER_DIAMOND_KEY_1': '다이아키 교환권',
    'VOUCHER_ROULETTE_COIN_1': '룰렛 티켓',
    'VOUCHER_DICE_TOKEN_1': '주사위 티켓',
    'GOLD_KEY': '골드 키',
    'DIAMOND_KEY': '다이아몬드 키',
    'ROULETTE_COIN': '룰렛 티켓',
    'DICE_TOKEN': '주사위 티켓',
};

const ProductCard: React.FC<ProductCardProps> = ({ product, diamondBalance, onBuy, isPending }) => {
    const requiresDiamond = String(product.cost?.token ?? '').toUpperCase() === 'DIAMOND';
    const hasEnoughDiamond = !requiresDiamond || diamondBalance >= Number(product.cost?.amount ?? 0);
    const isDisabled = isPending || !hasEnoughDiamond;
    const grantItemName = ITEM_NAMES[product.grant.item_type] || product.grant.item_type;

    return (
        <div className="group relative overflow-hidden bg-gradient-to-br from-white/[0.06] to-white/[0.02] rounded-2xl p-4 border border-white/10 transition-all hover:border-white/15">
            <div className="flex items-center justify-between gap-4">
                {/* Left: Product Info */}
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center shrink-0">
                        <img
                            src={
                                product.sku.includes('DIAMOND') ? "/assets/asset_ticket_diamond.png" :
                                    product.sku.includes('GOLD') ? "/assets/asset_ticket_gold.png" :
                                        product.sku.includes('COIN') ? "/assets/asset_ticket_green.png" :
                                            product.sku.includes('DICE') ? "/assets/icon_dice_silver.png" :
                                                "/assets/icon_ticket.png"
                            }
                            alt=""
                            className="w-7 h-7 object-contain"
                        />
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-base font-black text-white truncate">{product.title}</h3>
                        <p className="text-[11px] text-white/45 mt-0.5">
                            <span className="text-emerald-400/70">{grantItemName}</span> x{product.grant.amount} 지급
                        </p>
                    </div>
                </div>

                {/* Right: Buy Button */}
                <button
                    onClick={() => { tryHaptic(10); onBuy(); }}
                    disabled={isDisabled}
                    className="shrink-0 bg-emerald-600/80 hover:bg-emerald-600 disabled:bg-white/10 text-white font-bold py-2.5 px-4 rounded-xl transition-all active:scale-[0.97] flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isPending ? (
                        <Loader2 className="animate-spin w-4 h-4" />
                    ) : (
                        <>
                            <img src="/assets/icon_diamond.png" alt="" className="w-4 h-4" />
                            <span className="text-sm">{hasEnoughDiamond ? product.cost.amount : '부족'}</span>
                        </>
                    )}
                </button>
            </div>

            {/* Background Glow */}
            <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-gradient-to-br from-emerald-500/10 to-transparent blur-2xl rounded-full pointer-events-none group-hover:from-emerald-500/15 transition-all" />
        </div>
    );
};

export default ShopPage;

