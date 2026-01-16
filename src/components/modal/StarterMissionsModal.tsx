import React, { useRef, useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { claimNewUserWelcome, getNewUserStatus } from "../../api/newUserApi";
import { useToast } from "../common/ToastProvider";
import { useHaptic } from "../../hooks/useHaptic";
import { Gift, CheckCircle2, Gamepad2, Users, Calendar } from "lucide-react";
import clsx from "clsx";

interface StarterMissionsModalProps {
    onClose: () => void;
}

const StarterMissionsModal: React.FC<StarterMissionsModalProps> = ({ onClose }) => {
    const [isClaiming, setIsClaiming] = useState(false);
    const [hasClaimed, setHasClaimed] = useState(false);
    const { addToast } = useToast();
    const { notification, impact } = useHaptic();
    const queryClient = useQueryClient();

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

    const handleClaim = async () => {
        if (isClaiming) return;

        impact("heavy");
        setIsClaiming(true);
        try {
            console.log("[StarterMissionsModal] Calling claimNewUserWelcome API...");
            const result = await claimNewUserWelcome();
            console.log("[StarterMissionsModal] API Response:", result);

            if (!result?.success) {
                console.error("[StarterMissionsModal] Claim failed - API returned success=false");
                console.error("[StarterMissionsModal] Reason:", result?.reason);
                notification("error");
                addToast(`스타터 보상 지급에 실패했습니다. ${result?.reason || '잠시 후 다시 시도해주세요.'}`, "error");
                return;
            }

            console.log("[StarterMissionsModal] Claim succeeded! Rewards count:", result.rewards?.length);
            notification("success");
            setHasClaimed(true);

            await queryClient.invalidateQueries({ queryKey: ["vault-status"] });
            await queryClient.invalidateQueries({ queryKey: ["inventory"] });
            await queryClient.invalidateQueries({ queryKey: ["new-user-status"] });

            addToast("🎉 스타터 미션 보상이 지급되었습니다!", "success");

            // Auto close after 1.5 seconds
            setTimeout(() => {
                onClose();
            }, 1500);
        } catch (error: unknown) {
            console.error("[StarterMissionsModal] Exception caught during claim:");
            console.error("[StarterMissionsModal] Full error:", error);
            notification("error");
            const errorMsg = (error as any)?.response?.data?.detail || (error as any)?.message || "오류가 발생했습니다.";
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
                        <p className="text-white/60 font-bold tracking-tight">스타터 미션 불러오는 중...</p>
                    </div>
                </div>
            );
        }
        return null;
    }

    const { missions } = activeData;
    const safeMissions = Array.isArray(missions) ? missions : [];

    // Filter only starter missions
    const starterMissions = safeMissions.filter((m: any) =>
        m.logic_key === "starter_play_1" ||
        m.logic_key === "starter_play_3" ||
        m.logic_key === "starter_channel_join" ||
        m.logic_key === "starter_attendance"
    );

    // Check if all starter missions are claimed
    const allClaimed = starterMissions.every((m: any) => m.is_claimed);
    if (allClaimed && !hasClaimed) return null;

    const totalReward = starterMissions.reduce((sum: number, m: any) => sum + (m.reward_amount || 0), 0);

    const getMissionIcon = (logicKey: string) => {
        switch (logicKey) {
            case "starter_play_1":
            case "starter_play_3":
                return <Gamepad2 className="w-5 h-5" />;
            case "starter_channel_join":
                return <Users className="w-5 h-5" />;
            case "starter_attendance":
                return <Calendar className="w-5 h-5" />;
            default:
                return <Gift className="w-5 h-5" />;
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/90 backdrop-blur-md animate-fadeIn px-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <div className="relative w-full max-w-[340px] max-h-[calc(100dvh-2rem)] flex flex-col bg-gradient-to-b from-zinc-900 to-black border border-purple-500/30 rounded-[32px] shadow-[0_32px_64px_-16px_rgba(168,85,247,0.4)] overflow-hidden animate-scaleIn">
                {/* Background */}
                <div className="absolute inset-0 bg-white/[0.02] pointer-events-none" />
                <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-purple-500/10 to-transparent pointer-events-none" />

                {/* Header */}
                <div className="relative pt-10 pb-6 px-6 text-center flex-shrink-0">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-500/10 border-2 border-purple-400/30 mb-4">
                        <Gift className="w-8 h-8 text-purple-400" />
                    </div>
                    <h2 className="text-2xl font-black text-white mb-2">
                        스타터 미션 🚀
                    </h2>
                    <p className="text-sm text-white/60 font-medium">
                        4가지 기본 미션으로 시작하세요
                    </p>
                </div>

                {/* Mission List */}
                <div className="relative flex-1 overflow-y-auto px-6 pb-4 space-y-2 custom-scrollbar">
                    {starterMissions.map((mission: any) => (
                        <div
                            key={mission.id}
                            className={clsx(
                                "flex items-center gap-3 p-3 rounded-xl border transition-all",
                                mission.is_claimed
                                    ? "bg-white/5 border-white/10 opacity-50"
                                    : "bg-purple-500/10 border-purple-400/30"
                            )}
                        >
                            <div className={clsx(
                                "flex items-center justify-center w-10 h-10 rounded-lg",
                                mission.is_claimed ? "bg-white/10" : "bg-purple-500/20"
                            )}>
                                {mission.is_claimed ? (
                                    <CheckCircle2 className="w-5 h-5 text-white/40" />
                                ) : (
                                    <div className="text-purple-400">
                                        {getMissionIcon(mission.logic_key)}
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className={clsx(
                                    "text-sm font-bold truncate",
                                    mission.is_claimed ? "text-white/40" : "text-white"
                                )}>
                                    {mission.title}
                                </p>
                                <p className="text-xs text-white/50 truncate">
                                    {mission.description || "미션 완료하고 보상 받기"}
                                </p>
                            </div>
                            <div className={clsx(
                                "text-xs font-black",
                                mission.is_claimed ? "text-white/30" : "text-purple-300"
                            )}>
                                +{mission.reward_amount.toLocaleString()}원
                            </div>
                        </div>
                    ))}
                </div>

                {/* Total Reward */}
                <div className="relative px-6 py-3 border-t border-white/10 flex-shrink-0">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-white/60 font-medium">총 보상</span>
                        <span className="text-2xl font-black text-purple-300">
                            {totalReward.toLocaleString()}원
                        </span>
                    </div>
                </div>

                {/* Action Button */}
                <div className="relative p-6 pt-3 flex-shrink-0">
                    <button
                        onClick={handleClaim}
                        disabled={isClaiming || hasClaimed}
                        className={clsx(
                            "w-full py-4 rounded-2xl font-black text-lg transition-all",
                            hasClaimed
                                ? "bg-purple-900/50 text-purple-300 cursor-default"
                                : isClaiming
                                    ? "bg-purple-600/50 text-white cursor-wait"
                                    : "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-[0_8px_24px_-4px_rgba(168,85,247,0.5)] hover:scale-105 active:scale-95"
                        )}
                    >
                        {isClaiming ? "보상 받는 중..." : hasClaimed ? "✓ 받기 완료" : "전부 받기"}
                    </button>

                    <button
                        onClick={onClose}
                        className="w-full mt-3 py-3 rounded-xl text-sm font-bold text-white/60 hover:text-white transition-colors"
                    >
                        닫기
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StarterMissionsModal;
