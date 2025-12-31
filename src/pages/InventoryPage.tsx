import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchInventory, useInventoryItem, InventoryItem } from '../api/inventoryApi';
import { Loader2, Package, Coins } from 'lucide-react';
import { useToast } from '../components/common/ToastProvider';

const InventoryPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'wallet' | 'items'>('items');
    const queryClient = useQueryClient();
    const { addToast } = useToast();

    const { data, isLoading } = useQuery({
        queryKey: ['inventory'],
        queryFn: fetchInventory,
    });

    const useMutationAction = useMutation({
        mutationFn: ({ item_type, amount }: { item_type: string; amount: number }) => useInventoryItem(item_type, amount),
        onSuccess: (data) => {
            addToast(`사용 완료: ${data.reward_token} x${data.reward_amount} 지급됨`, "success");
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
            queryClient.invalidateQueries({ queryKey: ['walletStatus'] });
        },
        onError: (error: any) => {
            const msg = error.response?.data?.detail || "사용 실패";
            addToast(msg, "error");
        }
    });

    if (isLoading) {
        return <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin text-white" /></div>;
    }

    const { items, wallet } = data || { items: [], wallet: {} };

    return (
        <div className="p-4 safe-area-bottom pb-24 text-white">
            <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Package className="text-blue-400" />
                인벤토리 (Inventory)
            </h1>

            {/* Tabs */}
            <div className="flex border-b border-gray-700 mb-6">
                <button
                    className={`flex-1 py-3 text-center font-medium transition-colors ${activeTab === 'items' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-200'}`}
                    onClick={() => setActiveTab('items')}
                >
                    아이템 (Items)
                </button>
                <button
                    className={`flex-1 py-3 text-center font-medium transition-colors ${activeTab === 'wallet' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-200'}`}
                    onClick={() => setActiveTab('wallet')}
                >
                    재화 (Wallet)
                </button>
            </div>

            {/* Content */}
            {activeTab === 'items' && (
                <div className="grid grid-cols-1 gap-4">
                    {items.length === 0 ? (
                        <div className="text-center text-gray-500 py-10">보유한 아이템이 없습니다.</div>
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
            )}

            {activeTab === 'wallet' && (
                <div className="bg-gray-800/50 rounded-xl p-4 space-y-3">
                    {Object.entries(wallet).length === 0 ? (
                        <div className="text-center text-gray-500 py-4">지갑 정보가 없습니다.</div>
                    ) : (
                        Object.entries(wallet).map(([key, value]) => (
                            <div key={key} className="flex justify-between items-center p-3 bg-gray-700/50 rounded-lg">
                                <div className="flex items-center gap-2">
                                    <span className="bg-gray-600 p-1.5 rounded-full"><Coins size={16} /></span>
                                    <span className="font-medium text-gray-200">{key}</span>
                                </div>
                                <span className="font-mono font-bold text-yellow-400 text-lg">{value.toLocaleString()}</span>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

interface ItemCardProps {
    item: InventoryItem;
    onUse: () => void;
    isPending: boolean;
}

const ItemCard: React.FC<ItemCardProps> = ({ item, onUse, isPending }) => {
    // Simple mapping for display titles
    const TITLES: Record<string, string> = {
        "VOUCHER_GOLD_KEY_1": "골드키 교환권",
        "VOUCHER_DIAMOND_KEY_1": "다이아키 교환권",
    };

    return (
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 flex justify-between items-center">
            <div>
                <h3 className="font-bold">{TITLES[item.item_type] || item.item_type}</h3>
                <div className="text-xs text-gray-500 mt-1">
                    보유 수량: <span className="text-white font-bold text-sm bg-blue-900/50 px-2 py-0.5 rounded">{item.quantity}</span>
                </div>
                {/* <div className="text-[10px] text-gray-600 mt-1">{format(new Date(item.created_at), 'yyyy-MM-dd')}</div> */}
            </div>

            <button
                onClick={onUse}
                disabled={item.quantity <= 0 || isPending}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors min-w-[80px] flex justify-center"
            >
                {isPending ? <Loader2 className="animate-spin w-4 h-4" /> : "사용"}
            </button>
        </div>
    );
};

export default InventoryPage;
