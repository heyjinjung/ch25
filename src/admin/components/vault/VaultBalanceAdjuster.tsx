import React, { useState } from "react";
import {
    Search,
    User,
    CreditCard,
    ShieldAlert,
    Save,
    RefreshCw,
    AlertCircle,
    X,
    Wallet
} from "lucide-react";
import { adminApi } from "../../api/httpClient";
import { useToast } from "../../../components/common/ToastProvider";
import { formatCurrency } from "../../utils/formatters";

interface VaultUserState {
    user_id: number;
    nickname?: string;
    locked_balance: number;
    available_balance: number;
    vault_balance: number;
    eligible: boolean;
}

interface VaultBalanceAdjusterProps {
    onUpdateSuccess?: () => void;
}

export const VaultBalanceAdjuster: React.FC<VaultBalanceAdjusterProps> = ({ onUpdateSuccess }) => {
    const [identifier, setIdentifier] = useState("");
    const [userState, setUserState] = useState<VaultUserState | null>(null);
    const [loading, setLoading] = useState(false);
    const [updating, setUpdating] = useState(false);
    const { addToast } = useToast();

    // Form states
    const [newLocked, setNewLocked] = useState<string>("");
    const [newAvailable, setNewAvailable] = useState<string>("");

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!identifier.trim()) return;

        setLoading(true);
        setUserState(null);
        try {
            // Using by-identifier endpoint for maximum flexibility
            const res = await adminApi.get(`/admin/api/vault/by-identifier/${encodeURIComponent(identifier.trim())}`);
            const data = res.data;
            setUserState(data);
            setNewLocked(data.locked_balance.toString());
            setNewAvailable(data.available_balance.toString());
            addToast("?¨Ïö©???ïÎ≥¥Î•?Ï°∞Ìöå?àÏäµ?àÎã§.", "success");
        } catch (error: any) {
            console.error("Search failed:", error);
            const msg = error.response?.data?.detail === "USER_NOT_FOUND"
                ? "?¨Ïö©?êÎ? Ï∞æÏùÑ ???ÜÏäµ?àÎã§."
                : "Ï°∞Ìöå Ï§??§Î•òÍ∞Ä Î∞úÏÉù?àÏäµ?àÎã§.";
            addToast(msg, "error");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async () => {
        if (!userState) return;

        const lockedVal = parseInt(newLocked);
        const availableVal = parseInt(newAvailable);

        if (isNaN(lockedVal) || isNaN(availableVal)) {
            addToast("?¨Î∞îÎ•?Í∏àÏï°???ÖÎ†•?¥Ï£º?∏Ïöî.", "error");
            return;
        }

        if (!window.confirm(`${userState.nickname || userState.user_id} ?†Ï????îÏï°??Í∞ïÏ†úÎ°??òÏ†ï?òÏãúÍ≤†Ïäµ?àÍπå?`)) {
            return;
        }

        setUpdating(true);
        try {
            // Using the setter endpoint
            await adminApi.post(`/admin/api/vault/${userState.user_id}/balance`, {
                locked_amount: lockedVal,
                available_amount: availableVal,
                reason: "ADMIN_MANUAL_SET_GENERIC"
            });

            addToast("?îÏï° ?òÏ†ï???ÑÎ£å?òÏóà?µÎãà??", "success");

            // Global synchronization
            if (onUpdateSuccess) onUpdateSuccess();

            // Refresh state
            await handleSearch();
        } catch (error) {
            console.error("Update failed:", error);
            addToast("?îÏï° ?òÏ†ï ?§Ìå®", "error");
        } finally {
            setUpdating(false);
        }
    };

    const clearInput = () => {
        setIdentifier("");
        setUserState(null);
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto p-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Search Section */}
            <div className="bg-admin-card border border-admin-border/50 rounded-2xl overflow-hidden shadow-xl shadow-black/20">
                <div className="p-6 space-y-4">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="h-10 w-10 rounded-xl bg-admin-brand/10 border border-admin-brand/20 flex items-center justify-center">
                            <Search className="h-5 w-5 text-admin-brand" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-white leading-tight">?¨Ïö©???êÏÇ∞ Ï°∞Ìöå</h2>
                            <p className="text-xs text-zinc-500">ID, ?âÎÑ§?? @?†Ï??§ÏûÑ ?±ÏúºÎ°?Í≤Ä??Í∞Ä?•Ìï©?àÎã§.</p>
                        </div>
                    </div>

                    <form onSubmit={handleSearch} className="relative group">
                        <input
                            type="text"
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            placeholder="?†Ï? ?ïÎ≥¥Î•??ÖÎ†•?òÏÑ∏??.. (?? tgid:123, nickname, @username)"
                            className="w-full h-14 bg-zinc-950/50 border border-zinc-800 rounded-xl pl-5 pr-32 text-sm text-white focus:border-admin-brand focus:ring-1 focus:ring-admin-brand/30 transition-all outline-none"
                        />
                        <div className="absolute right-2 top-2 bottom-2 flex gap-1">
                            {identifier && (
                                <button
                                    type="button"
                                    onClick={clearInput}
                                    title="?ÖÎ†• ÏßÄ?∞Í∏∞"
                                    className="px-3 text-zinc-500 hover:text-white transition-colors"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                            <button
                                type="submit"
                                disabled={loading || !identifier.trim()}
                                className="h-full px-6 bg-admin-brand text-white text-xs font-black rounded-lg hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition-all flex items-center gap-2"
                            >
                                {loading ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
                                Í≤Ä??
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Í≤∞Í≥º Î∞?Ï°∞Ï†ï ?πÏÖò */}
            {userState && (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 animate-in zoom-in-95 duration-200">
                    {/* ?†Ï? ?ÑÎ°ú??Ïπ¥Îìú */}
                    <div className="md:col-span-4 space-y-4">
                        <div className="bg-admin-card border border-admin-border/50 rounded-2xl p-6 flex flex-col items-center text-center space-y-4 shadow-xl">
                            <div className="h-20 w-20 rounded-full bg-zinc-900 border-2 border-zinc-800 flex items-center justify-center mb-2 shadow-inner">
                                <User className="h-10 w-10 text-zinc-500" />
                            </div>
                            <div className="space-y-1 w-full">
                                <div className="text-xl font-black text-white truncate px-2">{userState.nickname || "?????ÜÏùå"}</div>
                                <div className="text-xs font-mono text-admin-brand">UID: {userState.user_id}</div>
                            </div>
                            <div className="w-full pt-4 border-t border-zinc-800/50 flex flex-col gap-2">
                                <div className="flex justify-between items-center px-2">
                                    <span className="text-[10px] font-bold text-zinc-500">?ÅÌÉú</span>
                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${userState.eligible ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'}`}>
                                        {userState.eligible ? "?úÏÑ±" : "ÎπÑÌôú??}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ?îÏï° Í∞ïÏ†ú Ï°∞Ï†ï Ïπ¥Îìú */}
                    <div className="md:col-span-8">
                        <div className="bg-admin-card border border-admin-border/50 rounded-2xl overflow-hidden shadow-xl h-full flex flex-col">
                            <div className="px-6 py-4 border-b border-admin-border/50 bg-zinc-900/50 flex items-center justify-between">
                                <h3 className="text-sm font-black text-white flex items-center gap-2">
                                    <Wallet className="h-4 w-4 text-admin-brand" />
                                    Í∞ïÏ†ú ?îÏï° ?§Ï†ï
                                </h3>
                                <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                                    <ShieldAlert className="h-3 w-3 text-rose-500" />
                                    Ï£ºÏùò: ?§ÏãúÍ∞??êÏû•??Ï¶âÏãú Î∞òÏòÅ?©Îãà??
                                </div>
                            </div>

                            <div className="p-6 flex-1 space-y-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-zinc-500 tracking-widest pl-1">Í∏àÍ≥† ?†Í∏à Í∏àÏï°</label>
                                        <div className="relative group">
                                            <input
                                                type="number"
                                                value={newLocked}
                                                onChange={(e) => setNewLocked(e.target.value)}
                                                className="w-full h-12 bg-zinc-950/80 border border-zinc-800 rounded-xl px-4 text-lg font-bold text-admin-brand outline-none focus:border-admin-brand focus:ring-2 focus:ring-admin-brand/20 transition-all font-mono"
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-zinc-700 font-bold">KRW</span>
                                        </div>
                                        <div className="text-[10px] text-zinc-600 pl-1 italic">
                                            ?ÑÏû¨: {formatCurrency(userState.locked_balance)} KRW
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-zinc-500 tracking-widest pl-1">Í∞Ä???êÌôî ?îÏï°</label>
                                        <div className="relative group">
                                            <input
                                                type="number"
                                                value={newAvailable}
                                                onChange={(e) => setNewAvailable(e.target.value)}
                                                className="w-full h-12 bg-zinc-950/80 border border-zinc-800 rounded-xl px-4 text-lg font-bold text-admin-accent outline-none focus:border-admin-accent focus:ring-2 focus:ring-admin-accent/20 transition-all font-mono"
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-zinc-700 font-bold">KRW</span>
                                        </div>
                                        <div className="text-[10px] text-zinc-600 pl-1 italic">
                                            ?ÑÏû¨: {formatCurrency(userState.available_balance)} KRW
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-4 flex items-start gap-4">
                                    <div className="h-8 w-8 rounded-lg bg-rose-500/10 flex items-center justify-center shrink-0">
                                        <AlertCircle className="h-5 w-5 text-rose-500" />
                                    </div>
                                    <div className="text-[11px] text-zinc-400 leading-relaxed">
                                        ???ëÏóÖ?Ä ?†Ï????ÑÏû¨ ?îÏï°??Î¨¥Ïãú?òÍ≥† ?ÖÎ†•??Í∞íÏúºÎ°?<span className="text-white font-bold underline decoration-rose-500">Í∞ïÏ†ú ??ñ¥?∞Í∏∞</span>?©Îãà??
                                        ?òÏ†ï Ï¶âÏãú ?§ÏãúÍ∞?Î∞∞ÌåÖ Î∞?Í∏àÍ≥† ?ÅÎ¶Ω Î°úÏßÅ???ÅÌñ•??Ï£ºÎ©∞, Í¥ÄÎ¶¨Ïûê ?ïÏÇ∞ Î°úÍ∑∏???ÅÍµ¨ Í∏∞Î°ù?©Îãà??
                                    </div>
                                </div>
                            </div>

                            <div className="px-6 py-4 bg-zinc-900/30 border-t border-admin-border/50">
                                <button
                                    onClick={handleUpdate}
                                    disabled={updating || (newLocked === userState.locked_balance.toString() && newAvailable === userState.available_balance.toString())}
                                    className="w-full h-12 bg-admin-brand text-white font-black rounded-xl hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-admin-brand/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:grayscale disabled:active:scale-100"
                                >
                                    {updating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                    ?îÏï° Í∞ïÏ†ú ?òÏ†ï
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {!userState && !loading && (
                <div className="py-20 flex flex-col items-center justify-center text-zinc-700">
                    <div className="h-16 w-16 rounded-full bg-zinc-900/50 border border-zinc-800 flex items-center justify-center mb-4">
                        <CreditCard className="h-8 w-8 opacity-20" />
                    </div>
                    <p className="text-sm font-medium italic">?†Ï?Î•?Í≤Ä?âÌïò???êÏÇ∞ Í¥ÄÎ¶¨Î? ?úÏûë?òÏÑ∏??</p>
                </div>
            )}
        </div>
    );
};
