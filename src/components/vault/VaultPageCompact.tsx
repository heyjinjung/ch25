import React, { useState, useMemo } from "react";
import clsx from "clsx";
import { useQuery } from "@tanstack/react-query";
import { getVaultStatus } from "../../api/vaultApi";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronUp } from "lucide-react";
import { tryHaptic } from "../../utils/haptics";

const formatWon = (amount: number) => `${amount.toLocaleString("ko-KR")}원`;

// FloatingCoin: removed as per compacting/UX update — was used for decorative particles.

const VaultPageCompact: React.FC = () => {
    const [detailsOpen, setDetailsOpen] = useState(false);

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

    // Floating coin particles removed — no mount trigger required.

    const handleDetailsToggle = () => {
        tryHaptic(10);
        setDetailsOpen(!detailsOpen);
    };

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
                            ? "bg-black border-emerald-400 text-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.3)] animate-pulse"
                            : "bg-black/80 border-white/20 text-white/50"
                    )}>
                        {view.eligible ? "금고해제 완료" : "잠금"}
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

            {/* Collapsible Details */}
            <button
                onClick={handleDetailsToggle}
                className="w-full max-w-xs flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white/70 text-sm font-medium mb-4 z-10 active:scale-[0.98] transition-transform"
            >
                <span className="flex items-center gap-2">
                    <img src="/assets/season_pass/icon_node_locked.png" alt="" className="w-5 h-5 object-contain" />
                    금고해제 조건 안내
                </span>
                {detailsOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>

            {detailsOpen && (
                <div className="w-full max-w-xs mb-4 rounded-xl border border-white/10 bg-white/5 p-4 space-y-3 animate-slide-down z-10">
                    <div className="flex items-center gap-3">
                        <span className="text-emerald-400 text-lg">✓</span>
                        <p className="text-white/60 text-sm">씨씨 이용시 금고이용 가능</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-emerald-400 text-lg">✓</span>
                        <p className="text-white/60 text-sm">게임 플레이로 금고액 적립</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-emerald-400 text-lg">✓</span>
                        <p className="text-white/60 text-sm">금고 해제후 씨씨포인트 관리자 전환</p>
                    </div>
                </div>
            )}

            {/* Withdraw Request Button (Condition: Cash Balance >= 10,000) */}
            {view.vaultBalance === 0 && (vault.data?.cashBalance ?? 0) >= 10000 && (
                <div className="w-full max-w-xs mb-3 z-10">
                    <button
                        onClick={async () => {
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
                        className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-black text-center text-base shadow-lg shadow-amber-500/30 hover:brightness-110 active:scale-[0.98] transition-all uppercase tracking-wide"
                    >
                        <span className="flex items-center justify-center gap-2">
                            <img src="/assets/asset_coin_gold.webp" alt="Coin" className="w-5 h-5 drop-shadow-sm" />
                            출금 신청하기
                        </span>
                    </button>
                    <p className="text-[10px] text-center text-amber-500/80 mt-1">
                        * 보유 중인 {formatWon(vault.data?.cashBalance ?? 0)} 전액 신청됩니다.
                    </p>
                </div>
            )}

            {/* CTA Buttons */}
            <div className="w-full max-w-xs space-y-3 mt-auto z-10">
                <a
                    href="https://ccc-010.com"
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => tryHaptic(30)}
                    className="group block w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-black text-center text-base shadow-lg shadow-emerald-500/30 hover:brightness-110 active:scale-[0.98] transition-all uppercase tracking-wide relative overflow-hidden"
                >
                    {/* Button Shimmer */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                    <span className="relative z-10">
                        <img src="/assets/logo_cc_v2.png" alt="CC" className="inline-block w-5 h-5 mr-2 align-text-bottom" />
                        씨씨카지노 충전하기
                    </span>
                </a>

                <Link
                    to="/home"
                    onClick={() => tryHaptic(10)}
                    className="block w-full py-3 rounded-xl bg-white/5 border border-white/10 text-white/70 font-semibold text-center text-sm hover:bg-white/10 active:scale-[0.98] transition-all"
                >
                    게임으로 돌아가기
                </Link>
            </div>
        </div>
    );
};

export default VaultPageCompact;
