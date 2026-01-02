import React, { useMemo } from "react";
import clsx from "clsx";
import { useQuery } from "@tanstack/react-query";
import { getVaultStatus } from "../../api/vaultApi";
import { Link } from "react-router-dom";
import { tryHaptic } from "../../utils/haptics";

const formatWon = (amount: number) => `${amount.toLocaleString("ko-KR")}원`;

// FloatingCoin: removed as per compacting/UX update — was used for decorative particles.

const VaultPageCompact: React.FC = () => {
    const vault = useQuery({
        queryKey: ["vault-status"],
        queryFn: getVaultStatus,
        staleTime: 30_000,
        retry: false,
    });

    const view = useMemo(() => {
        const data = vault.data;
        const vaultBalance = data?.vaultBalance ?? 0;
        const eligible = !!data?.eligible;
        return { vaultBalance, eligible };
    }, [vault.data]);

    if (vault.isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500/70 border-t-transparent" />
                <p className="text-white/60 text-sm">금고 정보 로딩 중...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center px-4 py-6 min-h-[calc(100vh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-120px)] relative overflow-hidden">
            {/* Floating Coin Particles removed */}

            {/* Title Badge with Pulse */}
            <div className="mb-4 z-10">
                <span className="px-4 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 text-[10px] font-black tracking-[0.15em] uppercase animate-pulse-slow">
                    THE VAULT
                </span>
            </div>

            {/* Hero Vault Image with Breathing Effect */}
            <div className="relative w-[55%] max-w-[180px] aspect-square mb-2 z-10">
                {/* Pulsing Glow Background */}
                <div className={clsx(
                    "absolute inset-0 rounded-full blur-[60px] animate-breathe",
                    view.eligible ? "bg-emerald-500 opacity-50" : "bg-emerald-900/60 opacity-40"
                )} />

                {/* Rotating Ring (locked state only) */}
                {!view.eligible && (
                    <div className="absolute inset-[-10%] rounded-full border-2 border-dashed border-white/10 animate-spin-slow" />
                )}

                <img
                    src={view.eligible ? "/assets/vault/vault_open.png" : "/assets/vault/vault_closed.png"}
                    className={clsx(
                        "relative z-10 w-full h-full object-contain drop-shadow-[0_15px_40px_rgba(0,0,0,0.7)] transition-transform duration-500",
                        view.eligible && "animate-bounce-subtle"
                    )}
                    alt="금고"
                />

                {/* Status Badge */}
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-20">
                    <div className={clsx(
                        "px-4 py-1 rounded-full border font-black text-[10px] tracking-[0.1em] uppercase backdrop-blur-md transition-all",
                        view.eligible
                            ? "bg-black/90 border-emerald-400 text-emerald-400 ring-2 ring-emerald-400/30 shadow-[0_0_24px_rgba(52,211,153,0.45)] animate-pulse"
                            : "bg-black/80 border-white/20 text-white/50"
                    )}>
                        {view.eligible ? "내돈찾기" : "잠금"}
                    </div>
                </div>
            </div>

            {/* Locked Amount with Shimmer Effect */}
            <div className="text-center mt-6 mb-4 z-10">
                <div className="flex items-center justify-center gap-3 relative">
                    <img
                        src="/assets/asset_coin_gold.webp"
                        alt="Coin"
                        className="w-8 h-8 drop-shadow-[0_0_10px_rgba(255,215,0,0.4)] animate-spin-slow"
                    />
                    <div className="relative overflow-hidden">
                        <span className="text-4xl font-black text-white tracking-tight">
                            {formatWon(view.vaultBalance)}
                        </span>
                        {/* Shimmer Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                    </div>
                </div>
                <p className={clsx(
                    "text-xs mt-2 font-medium transition-colors",
                    view.eligible ? "text-emerald-400 animate-pulse" : "text-white/50"
                )}>
                    {view.eligible ? "✨ 포인트 전환 가능" : "충전 시 금고해제됩니다"}
                </p>
            </div>


            {/* VIP Progress Section */}
            <div className="w-full max-w-xs mb-4">
                {(vault.data?.totalChargeAmount ?? 0) >= 100000 ? (
                    <div className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-xl">👑</span>
                            <div>
                                <p className="text-amber-400 font-black text-base">VIP 금고 해금 완료</p>
                                <p className="text-amber-200/70 text-xs font-bold">모든 보관금이 즉시 출금 가능해집니다.</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="w-full p-4 rounded-xl bg-white/5 border border-white/10">
                        <div className="flex justify-between items-end mb-2">
                            <span className="text-white/90 text-sm font-black">VIP 금고 진행도</span>
                            <span className="text-amber-400 text-sm font-black">
                                {Math.floor(((vault.data?.totalChargeAmount ?? 0) / 100000) * 100)}%
                            </span>
                        </div>
                        <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden mb-2">
                            <div
                                className="h-full bg-gradient-to-r from-amber-600 to-yellow-400 transition-all duration-1000"
                                style={{ width: `${Math.min(100, ((vault.data?.totalChargeAmount ?? 0) / 100000) * 100)}%` }}
                            />
                        </div>
                        <p className="text-center text-xs text-white/55 font-bold leading-relaxed">
                            총 충전 <span className="text-amber-400">{formatWon(vault.data?.totalChargeAmount ?? 0)}</span> / 100,000 달성 시 <br />
                            <span className="text-white/80">보관금 전액이 즉시 잠금 해제됩니다.</span>
                        </p>
                    </div>
                )}
            </div>

            {/* Cash Balance & Withdraw Section */}
            <div className="w-full max-w-xs mb-4">
                <div className="flex justify-between items-center text-sm mb-2 px-1">
                    <span className="text-white/60">출금 가능 금액</span>
                    <span className="font-bold text-amber-400">{formatWon(vault.data?.cashBalance ?? 0)}</span>
                </div>

                {/* Withdraw Button: Always show if balance > 0, disable if < 10000 */}
                {(vault.data?.cashBalance ?? 0) > 0 && (
                    <div className="w-full">
                        <button
                            disabled={(vault.data?.cashBalance ?? 0) < 10000}
                            onClick={async () => {
                                if ((vault.data?.cashBalance ?? 0) < 10000) return;
                                if (!window.confirm("출금을 신청하시겠습니까?")) return;
                                tryHaptic(20);
                                const { requestWithdrawal } = await import("../../api/vaultApi");
                                const res = await requestWithdrawal(vault.data?.cashBalance ?? 0);
                                if (res.success) {
                                    alert(res.message);
                                    vault.refetch();
                                } else {
                                    alert(res.message);
                                }
                            }}
                            className={clsx(
                                "w-full py-4 rounded-xl font-black text-center text-base uppercase tracking-wide transition-all flex items-center justify-center gap-2",
                                (vault.data?.cashBalance ?? 0) >= 10000
                                    ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/30 hover:brightness-110 active:scale-[0.98]"
                                    : "bg-gray-800 border border-white/10 text-white/30 cursor-not-allowed"
                            )}
                        >
                            <img src={(vault.data?.cashBalance ?? 0) >= 10000 ? "/assets/asset_coin_gold.webp" : "/assets/asset_coin_gray.webp"} alt="Coin" className="w-5 h-5 drop-shadow-sm" />
                            출금 신청하기
                        </button>
                        {(vault.data?.cashBalance ?? 0) < 10000 && (
                            <p className="text-[10px] text-center text-red-400/80 mt-1">
                                * 최소 10,000원부터 출금 가능합니다.
                            </p>
                        )}
                        {(vault.data?.cashBalance ?? 0) >= 10000 && (
                            <p className="text-[10px] text-center text-amber-500/80 mt-1">
                                * 보유 중인 전액 신청됩니다.
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* CTA Buttons */}
            <div className="w-full max-w-xs space-y-3 mt-auto z-10">
                <a
                    href="https://ccc-010.com"
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => tryHaptic(30)}
                    className="group block w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-black text-center text-base shadow-lg shadow-emerald-500/30 hover:brightness-110 active:scale-[0.98] transition-all uppercase tracking-wide relative overflow-hidden"
                >
                    {/* Button Shimmer */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                    <span className="relative z-10 flex items-center justify-center">
                        <img src="/assets/logo_cc_v2.png" alt="CC" className="inline-block w-5 h-5 mr-2" />
                        씨씨카지노 충전하기
                    </span>
                </a>

                <div className="flex gap-2">
                    <Link
                        to="/inventory"
                        onClick={() => tryHaptic(10)}
                        className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-white/90 font-bold text-center text-sm hover:bg-white/10 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                        <img src="/assets/icon_inventory_wallet.png" className="w-4 h-4 object-contain" alt="" />
                        인벤토리 확인
                    </Link>
                    <Link
                        to="/home"
                        onClick={() => tryHaptic(10)}
                        className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-white/70 font-semibold text-center text-sm hover:bg-white/10 active:scale-[0.98] transition-all"
                    >
                        게임으로
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default VaultPageCompact;
