import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchInventory, fetchShopProducts, purchaseProduct, ShopProduct } from '../api/inventoryApi';
import { Loader2, ShoppingBag } from 'lucide-react';
import { useToast } from '../components/common/ToastProvider';
import { tryHaptic } from '../utils/haptics';
import { useNavigate } from 'react-router-dom';
import Button from '../components/common/Button';

const ShopPage: React.FC = () => {
    const queryClient = useQueryClient();
    const { addToast } = useToast();
    const navigate = useNavigate();

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
            const token = data?.reward_token ?? data?.granted?.item_type;
            const amount = data?.reward_amount ?? data?.granted?.amount;
            addToast(`구매 완료: ${token} x${amount} 지급됨`, "success");
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
            <div className="mx-auto w-full max-w-lg pt-1.5 pb-[calc(96px+env(safe-area-inset-bottom))]">
                <div className="rounded-[24px] border border-white/10 bg-white/5 p-6 text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-black/40 ring-1 ring-white/10">
                        <ShoppingBag className="h-6 w-6 text-white/40" />
                    </div>
                    <div className="text-sm font-black text-white/90">연결 실패</div>
                    <div className="mt-1 text-[11px] font-medium text-white/50">상점 정보를 불러오지 못했습니다.</div>
                    <Button
                        onClick={() => { tryHaptic(10); refetch(); }}
                        variant="figma-primary"
                        className="mt-4 !px-6 !py-2.5 !text-sm"
                    >
                        다시 시도
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto w-full max-w-lg pt-1.5 pb-[calc(96px+env(safe-area-inset-bottom))]">
            {/* Header */}
            <div className="mb-4 flex items-center gap-3" data-tour="shop-link">
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center p-1.5 overflow-hidden">
                    <img src="/assets/icons/icon_cart.webp" alt="Shop" className="w-full h-full object-contain" />
                </div>
                <div>
                    <h1 className="text-xl font-black text-white">상점</h1>
                    <p className="text-[11px] text-white/40 tracking-wide">PREMIUM SHOP</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="mb-6">
                <div className="flex p-1 bg-white/5 rounded-2xl border border-white/10">
                    <button
                        type="button"
                        onClick={() => {
                            tryHaptic(10);
                            navigate('/rewards');
                        }}
                        className="flex-1 py-3 text-sm font-black rounded-xl transition-all text-white/60 hover:text-white hover:bg-white/5 active:scale-[0.98]"
                    >
                        보유함
                    </button>
                    <button
                        type="button"
                        disabled
                        className="flex-1 py-3 text-sm font-black rounded-xl transition-all bg-figma-primary text-white shadow-lg shadow-emerald-900/20"
                    >
                        상점
                    </button>
                </div>
            </div>

            {/* Products Grid - 2 columns */}
            <div className="grid grid-cols-2 gap-2.5">
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
                    <div className="col-span-2 rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
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
    'VOUCHER_GOLD_KEY_1': '골드키',
    'VOUCHER_DIAMOND_KEY_1': '다이아키',
    'VOUCHER_ROULETTE_COIN_1': '룰렛',
    'VOUCHER_DICE_TOKEN_1': '주사위',
    'VOUCHER_LOTTERY_TICKET_1': '복권',
    'GOLD_KEY': '골드키',
    'DIAMOND_KEY': '다이아키',
    'ROULETTE_COIN': '룰렛',
    'DICE_TOKEN': '주사위',
    'LOTTERY_TICKET': '복권',
};

// 아이콘 매핑 (복권 티켓 아이콘 수정)
const ITEM_ICONS: Record<string, string> = {
    'VOUCHER_GOLD_KEY_1': '/assets/asset_ticket_gold.png',
    'VOUCHER_DIAMOND_KEY_1': '/assets/asset_ticket_diamond.png',
    'VOUCHER_ROULETTE_COIN_1': '/assets/asset_ticket_green.png',
    'VOUCHER_DICE_TOKEN_1': '/assets/icon_dice_silver.png',
    'VOUCHER_LOTTERY_TICKET_1': '/assets/lottery/icon_lotto_ball.webp',
    'GOLD_KEY': '/assets/asset_ticket_gold.png',
    'DIAMOND_KEY': '/assets/asset_ticket_diamond.png',
    'ROULETTE_COIN': '/assets/asset_ticket_green.png',
    'DICE_TOKEN': '/assets/icon_dice_silver.png',
    'LOTTERY_TICKET': '/assets/lottery/icon_lotto_ball.webp',
};

const ProductCard: React.FC<ProductCardProps> = ({ product, diamondBalance, onBuy, isPending }) => {
    const requiresDiamond = String(product.cost?.token ?? '').toUpperCase() === 'DIAMOND';
    const hasEnoughDiamond = !requiresDiamond || diamondBalance >= Number(product.cost?.amount ?? 0);
    const isDisabled = isPending || !hasEnoughDiamond;
    const grantItemName = ITEM_NAMES[product.grant.item_type] || product.grant.item_type;
    const itemIcon = ITEM_ICONS[product.grant.item_type] || '/assets/lottery/icon_gift.png';

    return (
        <div className="group flex flex-col bg-white/5 border border-white/10 rounded-xl p-3 transition-all hover:bg-white/[0.07] hover:border-white/15">
            {/* Icon */}
            <div className="w-full aspect-square rounded-xl bg-black/30 border border-white/10 flex items-center justify-center p-3 mb-2">
                <img
                    src={itemIcon}
                    alt={grantItemName}
                    className="w-full h-full object-contain"
                />
            </div>

            {/* Title */}
            <h3 className="text-xs font-black text-white mb-0.5 truncate text-center">{product.title}</h3>

            {/* Description */}
            <p className="text-[9px] text-white/40 mb-2 text-center leading-tight">
                {grantItemName} x{product.grant.amount}
            </p>

            {/* Buy Button */}
            <button
                onClick={() => { tryHaptic(10); onBuy(); }}
                disabled={isDisabled}
                className="w-full py-2 rounded-lg bg-emerald-600/80 hover:bg-emerald-600 disabled:bg-white/10 disabled:text-white/30 text-white font-bold text-xs transition-all active:scale-[0.97] flex items-center justify-center gap-1.5 disabled:cursor-not-allowed"
            >
                {isPending ? (
                    <Loader2 className="animate-spin w-3.5 h-3.5" />
                ) : (
                    <>
                        <img src="/assets/icon_diamond.png" alt="" className="w-3.5 h-3.5" />
                        <span>{hasEnoughDiamond ? product.cost.amount : '부족'}</span>
                    </>
                )}
            </button>
        </div>
    );
};

export default ShopPage;
