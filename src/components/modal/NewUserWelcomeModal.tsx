import React, { useRef, useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import Lottie from "lottie-react";
import { claimNewUserWelcome, getNewUserStatus } from "../../api/newUserApi";
import { useToast } from "../common/ToastProvider";
import { useHaptic } from "../../hooks/useHaptic";



interface NewUserWelcomeModalProps {
    onClose: () => void;
}

const NewUserWelcomeModal: React.FC<NewUserWelcomeModalProps> = ({ onClose }) => {
    const [isClaiming, setIsClaiming] = useState(false);
    const [hasClaimed, setHasClaimed] = useState(false);
    const [successAnimationData, setSuccessAnimationData] = useState<any>(null);
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
            console.log("[NewUserWelcomeModal] Status Data:", status);
            lastDataRef.current = status;
        }
    }, [status]);

    useEffect(() => {
        if (!hasClaimed) return;
        let isCancelled = false;
        (async () => {
            try {
                const res = await fetch("/assets/modals/welcome_claim_success.json", { cache: "no-cache" });
                if (!res.ok) return;
                const json = await res.json();
                if (!isCancelled) setSuccessAnimationData(json);
            } catch {
                // Ignore animation load failures (keep UX functional).
            }
        })();
        return () => {
            isCancelled = true;
        };
    }, [hasClaimed]);

    const activeData = status || lastDataRef.current;

    const handleClose = () => {
        onClose();
    };

    const handleClaim = async () => {
        if (isClaiming) return;

        impact("heavy");
        setIsClaiming(true);
        try {
            const result = await claimNewUserWelcome();
            if (!result?.success) {
                notification("error");
                addToast("웰컴 보상 지급에 실패했습니다. 잠시 후 다시 시도해주세요.", "error");
                return;
            }

            notification("success");
            setHasClaimed(true);

            // Refresh balances/inventory and welcome status.
            await queryClient.invalidateQueries({ queryKey: ["vault-status"] });
            await queryClient.invalidateQueries({ queryKey: ["inventory"] });
            await queryClient.invalidateQueries({ queryKey: ["new-user-status"] });

            addToast("정착 지원금이 지급되었습니다.", "success");
        } catch (error) {
            console.error("[NewUserWelcomeModal] Claim failed:", error);
            notification("error");
            addToast("오류가 발생했습니다. 잠시 후 다시 시도해주세요.", "error");
        } finally {
            setIsClaiming(false);
        }
    };

    // Show a loading shell instead of silently disappearing.
    if (!activeData) {
        if (isFetching) {
            return (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-3xl border border-white/10 bg-black/60 p-8 text-center text-white/70">
                        <div className="mx-auto mb-4 h-10 w-10 rounded-full border-2 border-white/10 border-t-figma-accent animate-spin" />
                        웰컴 미션을 불러오는 중...
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
            <div className="relative w-full max-w-md bg-gradient-to-b from-slate-900 to-black border-2 border-emerald-500/30 rounded-3xl shadow-2xl shadow-emerald-500/20 overflow-hidden animate-scaleIn">
                {/* Close Button */}
                <button
                    onClick={handleClose}
                    aria-label="닫기"
                    className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-red-500 hover:bg-red-600 transition-colors"
                >
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {/* Header Image */}
                <div className="relative w-full aspect-[2/1] max-h-48 bg-slate-800 flex items-center justify-center overflow-hidden">
                    <img
                        src="/assets/welcome/welcome2_header.png"
                        alt="WELCOME 신규보상받기"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            const img = e.currentTarget;
                            if (img.src.includes("/assets/welcome/welcome2_header.png")) {
                                img.src = "/assets/welcome/header_2026_newyear.png";
                            }
                        }}
                    />
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    <div className="text-center">
                        <h2 className="text-2xl font-black text-white mb-1 leading-tight">
                            사장님,<br />
                            오시느라 고생하셨습니다!
                        </h2>
                        <p className="text-sm font-bold text-white/60">묻지도 따지지도 않고 드립니다.</p>
                    </div>

                    {/* Reward Showcase */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
                            <img src="/assets/asset_coin_gold.png" alt="coin" className="mx-auto h-14 w-14 object-contain" />
                            <div className="mt-2 text-sm font-black text-white">금고 {cashAmount.toLocaleString()}P</div>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
                            <img
                                src="/assets/asset_ticket_bundle.png"
                                alt="ticket"
                                className="mx-auto h-14 w-14 object-contain"
                                onError={(e) => {
                                    const img = e.currentTarget;
                                    if (img.src.includes("/assets/asset_ticket_bundle.png")) {
                                        img.src = "/assets/asset_ticket_trial.png";
                                    }
                                }}
                            />
                            <div className="mt-2 text-sm font-black text-white">룰렛 티켓 {ticketAmount}장</div>
                        </div>
                    </div>

                    {!hasClaimed ? (
                        <button
                            onClick={handleClaim}
                            disabled={isClaiming}
                            className={
                                "w-full py-4 rounded-xl bg-figma-primary text-white font-black text-lg shadow-lg shadow-emerald-500/30 hover:brightness-110 active:scale-95 transition-all uppercase tracking-wide " +
                                (isClaiming ? "opacity-80" : "")
                            }
                        >
                            {isClaiming ? "지급 중..." : `정착 지원금 받기 (${cashAmount.toLocaleString()}P + 티켓 ${ticketAmount}장)`}
                        </button>
                    ) : (
                        <div className="space-y-3">
                            {successAnimationData ? (
                                <div className="mx-auto w-44 h-44">
                                    <Lottie animationData={successAnimationData} loop autoplay />
                                </div>
                            ) : (
                                <div className="text-center text-white/70 text-sm font-semibold">지급 완료!</div>
                            )}

                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => {
                                        handleClose();
                                        navigate("/games");
                                    }}
                                    className="w-full py-4 rounded-xl bg-figma-primary text-white font-black text-lg shadow-lg shadow-emerald-500/30 hover:brightness-110 active:scale-95 transition-all uppercase tracking-wide"
                                >
                                    게임방 이동
                                </button>
                                <button
                                    onClick={handleClose}
                                    className="w-full py-4 rounded-xl bg-white/10 text-white/90 font-black text-lg border border-white/10 hover:bg-white/15 active:scale-95 transition-all"
                                >
                                    닫기
                                </button>
                            </div>
                        </div>
                    )}



                </div>
            </div>
        </div>
    );
};

export default NewUserWelcomeModal;
