import React, { useMemo, useState } from "react";
import { X, Users } from "lucide-react";
import { UserWalletSummary } from "../api/adminGameTokenApi";
import { GAME_TOKEN_LABELS, GameTokenType } from "../../types/gameTokens";
// Assuming generic Dialog exists, or I will use a simple absolute div if no generic Dialog is readily available. 
// Wait, I should check if there is a generic Dialog component. 
// The codebase uses `AdminModal` or similar? 
// In `UserAdminPage.tsx`, it used `UserGameTokenModal`. 
// I'll check `UserGameTokenModal` implementation to see what UI primitives it uses.
// For now I will build a standard modal using fixed overlay.

interface UserAssetDetailModalProps {
    isVisible: boolean;
    onClose: () => void;
    userSummary: UserWalletSummary | null;
}

const TOKEN_TYPES: Array<{ value: GameTokenType; label: string }> = (Object.keys(GAME_TOKEN_LABELS) as GameTokenType[]).map(
    (value) => ({ value, label: GAME_TOKEN_LABELS[value] })
);

function sumBalances(balances: Record<string, number> | undefined) {
    if (!balances) return 0;
    return Object.values(balances).reduce((acc, v) => acc + (typeof v === "number" ? v : 0), 0);
}

function getBalanceByType(balances: Record<string, number> | undefined, tokenType: GameTokenType) {
    if (!balances) return 0;
    const v = balances[tokenType];
    return typeof v === "number" ? v : 0;
}

const UserAssetDetailModal: React.FC<UserAssetDetailModalProps> = ({ isVisible, onClose, userSummary }) => {
    const [tokenFilter, setTokenFilter] = useState<"ALL" | GameTokenType>("ALL");
    const [hideZero, setHideZero] = useState(true);

    const filteredBalances = useMemo(() => {
        if (!userSummary) return [];

        const balances = userSummary.balances ?? {};
        let entries = (Object.keys(GAME_TOKEN_LABELS) as GameTokenType[]).map((t) => ({
            tokenType: t,
            label: GAME_TOKEN_LABELS[t],
            balance: getBalanceByType(balances, t),
        }));

        if (tokenFilter !== "ALL") {
            entries = entries.filter((e) => e.tokenType === tokenFilter);
        }
        if (hideZero) {
            entries = entries.filter((e) => e.balance !== 0);
        }
        return entries;
    }, [userSummary, tokenFilter, hideZero]);

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Users className="h-5 w-5 text-admin-brand" />
                        유저 자산 상세
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                        aria-label="모달 닫기"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    {!userSummary ? (
                        <div className="text-center text-zinc-500 py-8">
                            유저 정보가 없습니다.
                        </div>
                    ) : (
                        <>
                            {/* User Info */}
                            <div className="bg-zinc-800/50 rounded-xl p-4 space-y-1">
                                <div className="text-base font-bold text-zinc-200">{userSummary.nickname || "(닉네임 없음)"}</div>
                                <div className="text-sm text-admin-text-muted font-mono">{userSummary.external_id || "(External ID 없음)"}</div>
                                {userSummary.telegram_username && (
                                    <div className="text-sm text-admin-text-muted font-mono">@{userSummary.telegram_username}</div>
                                )}
                            </div>

                            {/* Aggregates */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-black/20 border border-zinc-800 rounded-xl p-4">
                                    <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">총합</div>
                                    <div className="text-2xl font-black text-zinc-100 font-mono tabular-nums">
                                        {sumBalances(userSummary.balances).toLocaleString()}
                                    </div>
                                </div>
                                <div className="bg-black/20 border border-zinc-800 rounded-xl p-4">
                                    <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">선택 티켓</div>
                                    <div className="text-2xl font-black text-zinc-100 font-mono tabular-nums">
                                        {(tokenFilter === "ALL"
                                            ? sumBalances(userSummary.balances)
                                            : getBalanceByType(userSummary.balances, tokenFilter)
                                        ).toLocaleString()}
                                    </div>
                                </div>
                            </div>

                            {/* Filter Controls */}
                            <div className="flex flex-col gap-3">
                                <div className="grid grid-cols-2 gap-3 items-end">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-zinc-400">티켓 종류</label>
                                        <select
                                            className="w-full h-10 bg-zinc-800 border border-zinc-700 rounded-lg px-3 text-sm text-white focus:border-admin-brand outline-none transition-colors"
                                            value={tokenFilter}
                                            onChange={(e) => setTokenFilter(e.target.value as any)}
                                        >
                                            <option value="ALL">전체</option>
                                            {TOKEN_TYPES.map((t) => (
                                                <option key={t.value} value={t.value}>
                                                    {t.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <label className="flex items-center gap-2 text-sm text-zinc-300 font-bold select-none h-10 px-1 cursor-pointer hover:text-white transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={hideZero}
                                            onChange={(e) => setHideZero(e.target.checked)}
                                            className="w-4 h-4 rounded border-zinc-600 bg-zinc-700 text-admin-brand focus:ring-offset-0 focus:ring-transparent accent-admin-brand"
                                        />
                                        0 숨김
                                    </label>
                                </div>
                            </div>

                            {/* Table */}
                            <div className="border border-zinc-800 rounded-xl overflow-hidden max-h-[300px] overflow-y-auto custom-scrollbar bg-black/20">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-zinc-800/80 sticky top-0 backdrop-blur-sm">
                                        <tr>
                                            <th className="px-4 py-3 text-xs font-bold text-zinc-400 uppercase tracking-wider">티켓</th>
                                            <th className="px-4 py-3 text-xs font-bold text-zinc-400 uppercase tracking-wider text-right">잔여</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-800">
                                        {filteredBalances.length === 0 ? (
                                            <tr>
                                                <td className="px-4 py-8 text-center text-sm text-zinc-500" colSpan={2}>
                                                    표시할 티켓이 없습니다.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredBalances.map((row) => (
                                                <tr key={row.tokenType} className="group hover:bg-white/5 transition-colors">
                                                    <td className="px-4 py-3 text-sm text-zinc-200 font-bold">{row.label}</td>
                                                    <td className="px-4 py-3 text-sm text-right font-mono tabular-nums text-zinc-100 group-hover:text-white transition-colors">
                                                        {row.balance.toLocaleString()}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserAssetDetailModal;
