import React, { useState, useMemo } from "react";
import clsx from "clsx";
import { useQuery } from "@tanstack/react-query";
import { getVaultStatus } from "../../api/vaultApi";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronUp } from "lucide-react";

const formatWon = (amount: number) => `${amount.toLocaleString("ko-KR")}원`;

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

    if (vault.isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500/70 border-t-transparent" />
                <p className="text-white/60 text-sm">금고 정보 로딩 중...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center px-4 py-6 min-h-[calc(100vh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-120px)]">
            {/* Title Badge */}
            <div className="mb-4">
                <span className="px-4 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 text-[10px] font-black tracking-[0.15em] uppercase">
                    THE VAULT
                </span>
            </div>

            {/* Hero Vault Image - Compact */}
            <div className="relative w-[55%] max-w-[180px] aspect-square mb-2">
                <div className={clsx(
                    "absolute inset-0 rounded-full blur-[60px] opacity-40 animate-pulse",
                    view.eligible ? "bg-emerald-500" : "bg-emerald-900/60"
                )} />
                <img
                    src={view.eligible ? "/assets/vault/vault_open.png" : "/assets/vault/vault_closed.png"}
                    className="relative z-10 w-full h-full object-contain drop-shadow-[0_15px_40px_rgba(0,0,0,0.7)]"
                    alt="금고"
                />
                {/* Status Badge */}
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-20">
                    <div className={clsx(
                        "px-4 py-1 rounded-full border font-black text-[10px] tracking-[0.1em] uppercase backdrop-blur-md",
                        view.eligible
                            ? "bg-black border-emerald-400 text-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.3)]"
                            : "bg-black/80 border-white/20 text-white/50"
                    )}>
                        {view.eligible ? "해금 완료" : "잠금"}
                    </div>
                </div>
            </div>

            {/* Locked Amount - Hero Number */}
            <div className="text-center mt-6 mb-4">
                <div className="flex items-center justify-center gap-3">
                    <img
                        src="/assets/asset_coin_gold.webp"
                        alt="Coin"
                        className="w-8 h-8 drop-shadow-[0_0_10px_rgba(255,215,0,0.4)]"
                    />
                    <span className="text-4xl font-black text-white tracking-tight glow-gold">
                        {formatWon(view.vaultBalance)}
                    </span>
                </div>
                <p className="text-white/50 text-xs mt-2 font-medium">
                    {view.eligible ? "포인트 전환 가능" : "충전 시 해금됩니다"}
                </p>
            </div>

            {/* Collapsible Details */}
            <button
                onClick={() => setDetailsOpen(!detailsOpen)}
                className="w-full max-w-xs flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white/70 text-sm font-medium mb-4"
            >
                <span>📊 해금 조건 안내</span>
                {detailsOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>

            {detailsOpen && (
                <div className="w-full max-w-xs mb-4 rounded-xl border border-white/10 bg-white/5 p-4 space-y-2 animate-fade-in">
                    <div className="flex items-start gap-3">
                        <span className="text-emerald-400 text-lg">✓</span>
                        <p className="text-white/60 text-sm">외부 충전 1만원 이상 시 자동 해금</p>
                    </div>
                    <div className="flex items-start gap-3">
                        <span className="text-emerald-400 text-lg">✓</span>
                        <p className="text-white/60 text-sm">게임 플레이로 포인트 적립</p>
                    </div>
                    <div className="flex items-start gap-3">
                        <span className="text-emerald-400 text-lg">✓</span>
                        <p className="text-white/60 text-sm">해금 후 보유 머니로 자동 전환</p>
                    </div>
                </div>
            )}

            {/* CTA Buttons */}
            <div className="w-full max-w-xs space-y-3 mt-auto">
                <a
                    href="https://ccc-010.com"
                    target="_blank"
                    rel="noreferrer"
                    className="block w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-black text-center text-base shadow-lg shadow-emerald-500/30 hover:brightness-110 active:scale-[0.98] transition-all uppercase tracking-wide"
                >
                    🎰 씨씨카지노 충전하기
                </a>

                <Link
                    to="/home"
                    className="block w-full py-3 rounded-xl bg-white/5 border border-white/10 text-white/70 font-semibold text-center text-sm hover:bg-white/10 transition-all"
                >
                    게임으로 돌아가기
                </Link>
            </div>
        </div>
    );
};

export default VaultPageCompact;
