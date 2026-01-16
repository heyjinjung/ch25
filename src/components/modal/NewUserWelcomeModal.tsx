import React, { useRef, useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { claimNewUserWelcome, getNewUserStatus } from "../../api/newUserApi";
import { useToast } from "../common/ToastProvider";
import { useHaptic } from "../../hooks/useHaptic";
import { Gift, ArrowRight, CheckCircle2, Gamepad2, X } from "lucide-react";
import clsx from "clsx";

interface NewUserWelcomeModalProps {
    onClose: () => void;
}

const NewUserWelcomeModal: React.FC<NewUserWelcomeModalProps> = ({ onClose }) => {
    const [isClaiming, setIsClaiming] = useState(false);
    const [hasClaimed, setHasClaimed] = useState(false);
    const { addToast } = useToast();
    const { notification, impact } = useHaptic();
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    // Store previous data to prevent modal flicker/disappearance during refetch
    const lastDataRef = useRef<any>(null);

    const { data: status, isFetching } = useQuery({
        queryKey: ["new-user-status"],
        queryFn: getNewUserStatus,
        staleTime: 10_000,
        retry: false,
    });

    useEffect(() => {
        if (status) {
            lastDataRef.current = status;
        }
    }, [status]);

    const activeData = status || lastDataRef.current;

    const handleClose = () => {
        onClose();
    };

    const handleClaim = async () => {
        if (isClaiming) return;

        impact("heavy");
        setIsClaiming(true);
        try {
            console.log("[NewUserWelcomeModal] Calling claimNewUserWelcome API...");
            const result = await claimNewUserWelcome();
            console.log("[NewUserWelcomeModal] API Response:", result);

            if (!result?.success) {
                console.error("[NewUserWelcomeModal] Claim failed - API returned success=false");
                console.error("[NewUserWelcomeModal] Reason:", result?.reason);
                console.error("[NewUserWelcomeModal] Rewards:", result?.rewards);
                notification("error");
                addToast(`웰컴 보상 지급에 실패했습니다. ${result?.reason || '잠시 후 다시 시도해주세요.'}`, "error");
                return;
            }

            console.log("[NewUserWelcomeModal] Claim succeeded! Rewards count:", result.rewards?.length);
            notification("success");
            setHasClaimed(true);

            // Refresh balances/inventory and welcome status.
            await queryClient.invalidateQueries({ queryKey: ["vault-status"] });
            await queryClient.invalidateQueries({ queryKey: ["inventory"] });
            await queryClient.invalidateQueries({ queryKey: ["new-user-status"] });

            addToast("정착 지원금이 지급되었습니다.", "success");
        } catch (error: unknown) {
            console.error("[NewUserWelcomeModal] Exception caught during claim:");
            console.error("[NewUserWelcomeModal] Error type:", (error as any)?.constructor?.name);
            console.error("[NewUserWelcomeModal] Error message:", (error as any)?.message);
            console.error("[NewUserWelcomeModal] Full error:", error);
            console.error("[NewUserWelcomeModal] Error response:", (error as any)?.response?.data);
            console.error("[NewUserWelcomeModal] Error status:", (error as any)?.response?.status);
            notification("error");
            const errorMsg = (error as any)?.response?.data?.detail || (error as any)?.message || "오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
            addToast(errorMsg, "error");
        } finally {
            setIsClaiming(false);
        }
    };

    if (!activeData) {
        if (isFetching) {
            return (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                    <div className="w-full max-w-[340px] rounded-[32px] border border-white/10 bg-zinc-950 p-10 text-center shadow-2xl">
                        <div className="mx-auto mb-6 h-12 w-12 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
                        <p className="text-white/60 font-bold tracking-tight">최고의 혜택을 준비 중...</p>
                    </div>
                </div>
            );
        }
        return null;
    }

    const { missions } = activeData;
    const safeMissions = Array.isArray(missions) ? missions : [];
    const cashMission = safeMissions.find((m: any) => m.logic_key === "NEW_USER_WELCOME_CASH");
    const ticketMission = safeMissions.find((m: any) => m.logic_key === "NEW_USER_WELCOME_TICKET");

    const isServerAlreadyClaimed = (!!cashMission?.is_claimed && !!ticketMission?.is_claimed);
    if (isServerAlreadyClaimed && !hasClaimed) return null;

    const cashAmount = Number(cashMission?.reward_amount ?? 2000);
    const ticketAmount = Number(ticketMission?.reward_amount ?? 5);

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/90 backdrop-blur-md animate-fadeIn px-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(1rem+env(safe-area-inset-bottom))]">
            {/* Modal Container: Max Height + Flex Col */}
            <div className="relative w-full max-w-[340px] max-h-[calc(100dvh-2rem)] flex flex-col bg-zinc-950 border border-emerald-500/30 rounded-[32px] shadow-[0_32px_64px_-16px_rgba(16,185,129,0.3)] overflow-hidden animate-scaleIn">
                {/* Background Textures (Absolute to container) */}
                <div className="absolute inset-0 bg-white/[0.02] pointer-events-none" />
                <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-emerald-500/10 to-transparent pointer-events-none" />

                {/* Close Button (Absolute z-20) */}
                <button
                    onClick={handleClose}
                    title="닫기"
                    className="absolute top-4 right-4 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all"
                >
                    <X size={18} />
                </button>

                {/* Scrollable Content Area */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {/* Hero Header */}
                    <div className="relative pt-10 pb-4 px-6 text-center">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-3 animate-bounce-subtle">
                            <Gift size={12} className="text-emerald-400" />
                            <span className="text-[10px] font-black text-emerald-400 tracking-widest uppercase">WELCOME SPECIAL</span>
                        </div>

                        <h2 className="text-2xl font-black text-white leading-[1.1] tracking-tight mb-2">
                            사장님,<br />
                            반가움의 선물입니다
                        </h2>
                        <p className="text-zinc-500 text-xs font-medium tracking-tight">
                            바로 게임을 시작하실 수 있도록 준비했습니다.
                        </p>
                    </div>

                    {/* Reward Showcase */}
                    <div className="px-6 pb-6">
                        <div className="grid grid-cols-2 gap-2 mb-6">
                            {/* Cash Card */}
                            <div className="relative group p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col items-center justify-center overflow-hidden aspect-[4/5]">
                                <div className="absolute inset-0 bg-emerald-500/5 blur-xl group-hover:opacity-100 transition-opacity" />
                                <div className="relative z-10 w-14 h-14 mb-3 bg-black/40 rounded-xl border border-white/5 flex items-center justify-center p-2.5 shadow-inner">
                                    <img src="/assets/asset_coin_gold.png" alt="coin" className="w-full h-full object-contain" />
                                </div>
                                <div className="relative z-10 text-[12px] font-bold text-zinc-500 mb-1 whitespace-nowrap">정착 지원금</div>
                                <div className="relative z-10 text-xl font-black text-white tabular-nums">
                                    {cashAmount.toLocaleString()}<span className="text-[12px] text-emerald-500 ml-0.5">P</span>
                                </div>
                            </div>

                            {/* Ticket Card */}
                            <div className="relative group p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col items-center justify-center overflow-hidden aspect-[4/5]">
                                <div className="absolute inset-0 bg-amber-500/5 blur-xl group-hover:opacity-100 transition-opacity" />
                                <div className="relative z-10 w-14 h-14 mb-3 bg-black/40 rounded-xl border border-white/5 flex items-center justify-center p-2.5 shadow-inner">
                                    <img src="/assets/asset_ticket_green.png" alt="ticket" className="w-full h-full object-contain" />
                                </div>
                                <div className="relative z-10 text-[12px] font-bold text-zinc-500 mb-1 whitespace-nowrap">룰렛 티켓</div>
                                <div className="relative z-10 text-xl font-black text-white tabular-nums">
                                    {ticketAmount}<span className="text-[12px] ml-0.5 text-amber-500">장</span>
                                </div>
                            </div>
                        </div>

                        {/* Action Area */}
                        {!hasClaimed ? (
                            <button
                                onClick={handleClaim}
                                disabled={isClaiming}
                                className={clsx(
                                    "w-full py-4 rounded-[18px] font-black text-base transition-all relative overflow-hidden group shrink-0",
                                    isClaiming
                                        ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                                        : "bg-emerald-500 text-black shadow-[0_12px_24px_-8px_rgba(16,185,129,0.5)] active:scale-[0.97] hover:brightness-110"
                                )}
                            >
                                <div className="relative z-10 flex items-center justify-center gap-2">
                                    {isClaiming ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-black/20 border-t-black animate-spin rounded-full" />
                                            <span>지급 중...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>지금 모두 받기</span>
                                            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </div>
                            </button>
                        ) : (
                            <div className="space-y-2 animate-fadeIn">
                                <div className="flex flex-col items-center justify-center py-2 text-emerald-400 gap-1 animate-bounce-subtle">
                                    <CheckCircle2 size={28} />
                                    <span className="font-black text-sm">지급 완료!</span>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => {
                                            handleClose();
                                            navigate("/games");
                                        }}
                                        className="w-full py-3.5 rounded-2xl bg-emerald-500 text-black font-black text-sm shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Gamepad2 size={16} />
                                        게임 시작
                                    </button>
                                    <button
                                        onClick={handleClose}
                                        className="w-full py-3.5 rounded-2xl bg-white/5 text-white/70 font-black text-sm border border-white/10 hover:bg-white/10 active:scale-95 transition-all"
                                    >
                                        나중에
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NewUserWelcomeModal;
