import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchShopProducts, purchaseProduct, ShopProduct } from '../api/inventoryApi';
import { Loader2, ShoppingBag } from 'lucide-react'; // Diamond unused?
import { useToast } from '../components/common/ToastProvider';

const ShopPage: React.FC = () => {
    const queryClient = useQueryClient();
    const { addToast } = useToast();

    const { data: products, isLoading, isError } = useQuery({
        queryKey: ['shopProducts'],
        queryFn: fetchShopProducts,
    });

    const purchaseMutation = useMutation({
        mutationFn: (sku: string) => purchaseProduct(sku),
        onSuccess: (data) => {
            addToast(`구매 완료: ${data.granted.item_type} x${data.granted.amount}`, "success");
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
            // Optionally invalidate wallet balance in header if it exists
            queryClient.invalidateQueries({ queryKey: ['vault-status'] });
        },
        onError: (error: any) => {
            const msg = error.response?.data?.detail || "구매 실패";
            addToast(msg, "error");
        }
    });

    if (isLoading) {
        return (
            <div className="mx-auto w-full max-w-lg py-16 flex flex-col items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-figma-accent" />
                <p className="mt-4 text-white/50 text-sm font-medium">상점 불러오는 중...</p>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="mx-auto w-full max-w-lg pb-[calc(96px+env(safe-area-inset-bottom))]">
                <div className="rounded-[24px] border border-white/10 bg-white/5 p-5 text-center">
                    <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-black/30 ring-1 ring-white/10">
                        <ShoppingBag className="h-5 w-5 text-white/40" />
                    </div>
                    <div className="text-sm font-black text-white/90">Failed to load</div>
                    <div className="mt-1 text-[11px] font-medium text-white/50">상점 정보를 불러오지 못했습니다.</div>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto w-full max-w-lg pb-[calc(96px+env(safe-area-inset-bottom))]">
            <div className="mb-4 flex items-center gap-3">
                <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                    <ShoppingBag className="w-6 h-6 text-figma-accent" />
                </div>
                <div>
                    <h1 className="text-xl font-black text-white">상점</h1>
                    <p className="text-[11px] text-white/40 tracking-wide">SHOP</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {products?.map((product) => (
                    <ProductCard key={product.sku} product={product} onBuy={() => purchaseMutation.mutate(product.sku)} isPending={purchaseMutation.isPending} />
                ))}
            </div>
        </div>
    );
};

interface ProductCardProps {
    product: ShopProduct;
    onBuy: () => void;
    isPending: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onBuy, isPending }) => {
    return (
        <div className="bg-white/5 rounded-2xl p-4 border border-white/10 flex flex-col justify-between">
            <div>
                <h3 className="text-base font-black text-white mb-2">{product.title}</h3>
                <p className="text-white/50 text-[12px] mb-4">
                    지급: <span className="text-figma-accent">{product.grant.item_type}</span> x{product.grant.amount}
                </p>
            </div>

            <button
                onClick={onBuy}
                disabled={isPending}
                className="w-full bg-figma-primary text-white font-black py-3 px-4 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isPending ? <Loader2 className="animate-spin w-5 h-5" /> : <>
                    <span className="text-sm">구매</span>
                    <div className="flex items-center bg-black/30 px-2 py-0.5 rounded-full border border-white/10">
                        <span className="font-mono">{product.cost.amount}</span>
                        <span className="text-xs ml-1 text-white/60">{product.cost.token}</span>
                    </div>
                </>}
            </button>
        </div>
    );
};

export default ShopPage;
