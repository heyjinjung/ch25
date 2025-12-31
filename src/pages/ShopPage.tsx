import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchShopProducts, purchaseProduct, ShopProduct } from '../api/inventoryApi';
import { Loader2, ShoppingBag } from 'lucide-react'; // Diamond unused?
import { useToast } from '../components/common/ToastProvider';

const ShopPage: React.FC = () => {
    const queryClient = useQueryClient();
    const { addToast } = useToast();

    const { data: products, isLoading } = useQuery({
        queryKey: ['shopProducts'],
        queryFn: fetchShopProducts,
    });

    const purchaseMutation = useMutation({
        mutationFn: (sku: string) => purchaseProduct(sku),
        onSuccess: (data) => {
            addToast(`구매 완료: ${data.granted.item_type} x${data.granted.amount}`, "success");
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
            // Optionally invalidate wallet balance in header if it exists
            queryClient.invalidateQueries({ queryKey: ['walletStatus'] });
        },
        onError: (error: any) => {
            const msg = error.response?.data?.detail || "구매 실패";
            addToast(msg, "error");
        }
    });

    if (isLoading) {
        return <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin text-white" /></div>;
    }

    return (
        <div className="p-4 safe-area-bottom pb-24">
            <h1 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <ShoppingBag className="text-yellow-400" />
                상점 (Shop)
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 shadow-lg flex flex-col justify-between">
            <div>
                <h3 className="text-lg font-bold text-white mb-2">{product.title}</h3>
                <p className="text-gray-400 text-sm mb-4">
                    지급: <span className="text-green-400">{product.grant.item_type}</span> x{product.grant.amount}
                </p>
            </div>

            <button
                onClick={onBuy}
                disabled={isPending}
                className="w-full bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-white font-bold py-3 px-4 rounded-lg transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isPending ? <Loader2 className="animate-spin w-5 h-5" /> : <>
                    <span className="text-sm">구매</span>
                    <div className="flex items-center bg-black/20 px-2 py-0.5 rounded-full">
                        <span className="font-mono">{product.cost.amount}</span>
                        <span className="text-xs ml-1">{product.cost.token}</span>
                    </div>
                </>}
            </button>
        </div>
    );
};

export default ShopPage;
