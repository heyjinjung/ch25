import React, { useState, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getNewUserStatus } from "../../api/newUserApi";
import { verifyChannelSubscription } from "../../api/viralApi";
import { useToast } from "../common/ToastProvider";
import { useHaptic } from "../../hooks/useHaptic";

const formatSeconds = (seconds: number | null | undefined) => {
    if (seconds == null) return "00:00:00";
    const s = Math.max(0, Math.floor(seconds));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const r = s % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${r.toString().padStart(2, "0")}`;
};

interface NewUserWelcomeModalProps {
    onClose: () => void;
}

const NewUserWelcomeModal: React.FC<NewUserWelcomeModalProps> = ({ onClose }) => {
    const [isVerifying, setIsVerifying] = useState(false);
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

    const activeData = status || lastDataRef.current;

    const handleClose = () => {
        onClose();
    };

    const handleMissionAction = async (missionId: number, actionType: string | null) => {
        if (isVerifying) return;

        impact("medium");

        try {
            if (actionType === "JOIN_CHANNEL") {
                setIsVerifying(true);
                const result = await verifyChannelSubscription(missionId);
                if (result.success) {
                    notification("success");
                    addToast("구독 인증 완료!", "success");
                    await queryClient.invalidateQueries({ queryKey: ["new-user-status"] });
                } else {
                    // 씨씨지민 또는 씨씨공식 채널 링크 (기존 코드 유지)
                    const channelLink = "https://t.me/+LksI3XlSjLlhZmE0";
                    const tg = window.Telegram?.WebApp;
                    if (tg?.openTelegramLink) {
                        tg.openTelegramLink(channelLink);
                    } else {
                        window.open(channelLink, "_blank");
                    }
                    addToast("채널에 입장하여 구독해 주세요.", "info");
                }
            } else if (actionType === "PLAY_GAME") {
                addToast("게임을 플레이하여 미션을 완료하세요!", "info");
                handleClose();
                navigate("/games");
            } else if (actionType === "LOGIN") {
                addToast("내일 다시 접속하면 자동으로 완료됩니다.", "info");
            }
        } catch (error) {
            console.error("[NewUserWelcomeModal] Mission action failed:", error);
            notification("error");
            addToast("오류가 발생했습니다. 잠시 후 다시 시도해주세요.", "error");
        } finally {
            setIsVerifying(false);
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

    const { missions, seconds_left } = activeData;

    if (!missions || missions.length === 0) {
        // Missions not configured yet; keep UX visible so 운영에서 문제를 인지할 수 있게 한다.
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                <div className="relative w-full max-w-md bg-gradient-to-b from-slate-900 to-black border-2 border-emerald-500/30 rounded-3xl shadow-2xl shadow-emerald-500/20 overflow-hidden">
                    <button
                        onClick={handleClose}
                        className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-red-500 hover:bg-red-600 transition-colors"
                    >
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                    <div className="p-8 text-center">
                        <h2 className="text-xl font-black text-white">웰컴 미션 준비중</h2>
                        <p className="mt-2 text-sm text-white/60">현재 NEW_USER 미션이 활성화되어 있지 않습니다.</p>
                        <button
                            onClick={handleClose}
                            className="mt-6 w-full py-4 rounded-xl bg-figma-primary text-white font-black text-lg shadow-lg shadow-emerald-500/30 hover:brightness-110 active:scale-95 transition-all uppercase tracking-wide"
                        >
                            확인
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const getMissionIcon = (actionType: string | null, targetValue: number) => {
        if (actionType === "JOIN_CHANNEL") return "/assets/welcome/icon_viral.png";
        if (actionType === "LOGIN") return "/assets/welcome/icon_attendance.png";
        if (actionType === "PLAY_GAME") {
            return targetValue >= 3 ? "/assets/welcome/icon_play3.png" : "/assets/welcome/icon_play1.png";
        }
        return "/assets/welcome/icon_play1.png"; // Fallback
    };

    const getMissionHint = (actionType: string | null, isCompleted: boolean) => {
        if (isCompleted) return "완료되었습니다";
        if (actionType === "JOIN_CHANNEL") return "클릭하여 채널 구독 확인";
        if (actionType === "LOGIN") return "내일 다시 로그인하세요";
        if (actionType === "PLAY_GAME") return "게임을 플레이하세요";
        return "미션을 완료하세요";
    };

    const completedCount = missions.filter((m: any) => m.is_completed).length;
    const totalCount = missions.length;

    // Requirement: keep showing until 4 missions are completed.
    // If 4+ missions exist, require completion of the first 4 by order.
    const requiredMissions = missions.slice(0, 4);
    const requiredCompletedCount = requiredMissions.filter((m: any) => m.is_completed).length;
    if (requiredMissions.length > 0 && requiredCompletedCount >= requiredMissions.length) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
            <div className="relative w-full max-w-md bg-gradient-to-b from-slate-900 to-black border-2 border-emerald-500/30 rounded-3xl shadow-2xl shadow-emerald-500/20 overflow-hidden animate-scaleIn">
                {/* Close Button */}
                <button
                    onClick={handleClose}
                    className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-red-500 hover:bg-red-600 transition-colors"
                >
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {/* Header Image */}
                <div className="relative h-32 bg-gradient-to-r from-emerald-600 to-cyan-600 flex items-center justify-center overflow-hidden">
                    <img src="/assets/welcome/header_2026_newyear.png" alt="2026 New Year" className="h-full w-auto object-contain" />
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    {/* Title */}
                    <div className="text-center">
                        <h2 className="text-2xl font-black text-white mb-1">
                            4개 미션 완료하고
                        </h2>
                        <p className="text-lg font-bold text-emerald-400">
                            💰 10,000원 받기
                        </p>
                    </div>

                    {/* Missions Grid */}
                    <div className="grid grid-cols-4 gap-3">
                        {missions.map((mission: any) => (
                            <div
                                key={mission.id}
                                className={`flex flex-col items-center gap-2 group cursor-pointer transition-transform active:scale-95 ${isVerifying ? "pointer-events-none opacity-80" : ""}`}
                                onClick={() => !mission.is_completed && handleMissionAction(mission.id, mission.action_type)}
                            >
                                <div className={`relative w-full aspect-square rounded-2xl border-2 ${mission.is_completed ? "border-emerald-500 bg-emerald-500/10" : "border-white/20 bg-white/5 group-hover:border-white/40"} p-2 transition-all`}>
                                    <img
                                        src={getMissionIcon(mission.action_type, mission.target_value)}
                                        alt={mission.title}
                                        title={getMissionHint(mission.action_type, mission.is_completed)}
                                        className={`w-full h-full object-contain ${!mission.is_completed && "opacity-50 grayscale group-hover:opacity-80 group-hover:grayscale-0"}`}
                                    />
                                    {mission.is_completed && (
                                        <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                    )}
                                    {!mission.is_completed && mission.action_type === "JOIN_CHANNEL" && (
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <div className="bg-emerald-500 text-white text-[8px] font-black px-1 rounded animate-pulse">CHECK</div>
                                        </div>
                                    )}
                                    {isVerifying && mission.action_type === "JOIN_CHANNEL" && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl">
                                            <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                                        </div>
                                    )}
                                </div>
                                <div className="text-center text-balance overflow-hidden w-full">
                                    <p className="text-[9px] font-bold text-white/80 truncate">{mission.title}</p>
                                    <div className="flex items-center justify-center gap-1 mt-0.5">
                                        <img src="/assets/logo_cc_v2.png" alt="" className="w-3.5 h-3.5 object-contain" />
                                        <span className="text-[10px] font-bold text-emerald-400">{mission.reward_amount.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Progress */}
                    <div className="text-center">
                        <p className="text-sm font-bold text-white/70">
                            미션 진행도: <span className="text-emerald-400">{completedCount}/{totalCount}</span>
                        </p>
                    </div>

                    {/* CTA Button */}
                    <button
                        onClick={handleClose}
                        className="w-full py-4 rounded-xl bg-figma-primary text-white font-black text-lg shadow-lg shadow-emerald-500/30 hover:brightness-110 active:scale-95 transition-all uppercase tracking-wide"
                    >
                        확인
                    </button>

                    {/* Timer */}
                    <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                        <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-lg font-black text-amber-400 font-mono">
                            {formatSeconds(seconds_left)}
                        </span>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default NewUserWelcomeModal;
