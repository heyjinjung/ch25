import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchInventory, useInventoryItem, InventoryItem } from '../api/inventoryApi';
import { Loader2, Package, Coins, Ticket } from 'lucide-react';
import { useToast } from '../components/common/ToastProvider';
import { clsx } from 'clsx';
import { tryHaptic } from '../utils/haptics';

const InventoryPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'items' | 'wallet'>('items');
    const queryClient = useQueryClient();
    const { addToast } = useToast();

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

    const handleTabChange = (tab: 'items' | 'wallet') => {
        tryHaptic(10);
        setActiveTab(tab);
    };

    if (isLoading) {
        return (
            <div className="mx-auto w-full max-w-lg py-16 flex flex-col items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-figma-accent" />
                <p className="mt-4 text-white/50 text-sm font-medium">인벤토리 불러오는 중...</p>
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
                    <div className="text-sm font-black text-white/90">Failed to load</div>
                    <div className="mt-1 text-[11px] font-medium text-white/50">인벤토리 정보를 불러오지 못했습니다.</div>
                </div>
            </div>
        );
    }

    const items = Array.isArray(data?.items) ? data.items : [];
    const wallet = data?.wallet && typeof data.wallet === "object" && !Array.isArray(data.wallet) ? data.wallet : {};

    return (
        <div className="mx-auto w-full max-w-lg pb-[calc(96px+env(safe-area-inset-bottom))]">
            {/* Title */}
            <div className="mb-4 flex items-center gap-3">
                <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                    <Package className="w-6 h-6 text-figma-accent" />
                </div>
                <div>
                    <h1 className="text-xl font-black text-white">인벤토리</h1>
                    <p className="text-[11px] text-white/40 tracking-wide">MY INVENTORY</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="mb-6">
                <div className="flex p-1 bg-white/5 rounded-2xl border border-white/10">
                    <button
                        className={clsx(
                            "flex-1 py-3 text-sm font-black rounded-xl transition-all",
                            "active:scale-[0.98]",
                            activeTab === 'items'
                                ? "bg-figma-primary text-white shadow-lg shadow-emerald-900/20"
                                : "text-white/60 hover:text-white hover:bg-white/5"
                        )}
                        onClick={() => handleTabChange('items')}
                    >
                        보유 아이템
                    </button>
                    <button
                        className={clsx(
                            "flex-1 py-3 text-sm font-black rounded-xl transition-all",
                            "active:scale-[0.98]",
                            activeTab === 'wallet'
                                ? "bg-white/10 text-gold-400 border border-white/10"
                                : "text-white/60 hover:text-white hover:bg-white/5"
                        )}
                        onClick={() => handleTabChange('wallet')}
                    >
                        재화 지갑
                    </button>
                </div>
            </div>

            {/* Content */}
            {activeTab === 'items' && (
                <div className="space-y-3 animate-fadeIn">
                    {items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 opacity-50 space-y-4">
                            <Package className="w-16 h-16 text-white/10 stroke-1" />
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
            )}

            {activeTab === 'wallet' && (
                <div className="grid grid-cols-1 gap-3 animate-fadeIn">
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
            )}
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
            icon: <Ticket className="w-5 h-5 text-amber-300" />
        },
        "VOUCHER_DIAMOND_KEY_1": {
            title: "다이아키 교환권",
            desc: "다이아키 1개로 즉시 교환",
            icon: <Ticket className="w-5 h-5 text-cyan-300" />
        },
        "DIAMOND": {
            title: "다이아몬드",
            desc: "프리미엄 재화",
            icon: <div className="w-4 h-4 bg-cyan-400 rotate-45 rounded-[2px]" />
        }
    };

    // Fallback info
    const info = INFO[item.item_type] || {
        title: item.item_type,
        desc: "일반 아이템",
        icon: <Package className="w-5 h-5 text-gray-400" />
    };

    return (
        <div className="group relative overflow-hidden bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-2xl p-4 transition-all active:scale-[0.98]">
            <div className="flex justify-between items-center relative z-10">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-black/40 flex items-center justify-center border border-white/5 shadow-inner">
                        {info.icon}
                    </div>
                    <div>
                        <h3 className="font-bold text-base text-gray-100">{info.title}</h3>
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
                            if (item.item_type === "DIAMOND") return; // 다이아몬드는 사용 불가
                            onUse();
                        }}
                        disabled={item.quantity <= 0 || isPending || item.item_type === "DIAMOND"}
                        className="bg-white/10 hover:bg-white/20 disabled:bg-black/20 disabled:text-white/20 disabled:cursor-not-allowed text-white text-[11px] font-bold px-3 py-1.5 rounded-lg border border-white/5 transition-colors"
                    >
                        {item.item_type === "DIAMOND" ? "보유중" : (isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "사용하기")}
                    </button>
                </div>
            </div>

            {/* Background Glow */}
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-br from-emerald-500/10 to-transparent blur-2xl rounded-full pointer-events-none group-hover:from-emerald-500/20 transition-all duration-500" />
        </div>
    );
};

const WalletCard: React.FC<{ tokenType: string; amount: number }> = ({ tokenType, amount }) => {
    return (
        <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-black/30 border border-white/10 flex items-center justify-center text-gold-400">
                    <Coins size={18} />
                </div>
                <div>
                    <span className="text-xs font-bold text-white/60 block mb-0.5 tracking-wider">{tokenType}</span>
                    <span className="text-lg font-black text-white tracking-tight">{amount.toLocaleString()}</span>
                </div>
            </div>
        </div>
    );
};

export default InventoryPage;
