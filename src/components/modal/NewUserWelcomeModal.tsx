import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
    const [dontShowAgain, setDontShowAgain] = useState(false);
    const { addToast } = useToast();
    const { notification, impact } = useHaptic();
    const queryClient = useQueryClient();

    const { data: status } = useQuery({
        queryKey: ["new-user-status"],
        queryFn: getNewUserStatus,
        staleTime: 10_000,
        retry: false,
    });

    const handleClose = () => {
        if (dontShowAgain) {
            localStorage.setItem("hideNewUserWelcome", "true");
        }
        onClose();
    };

    const handleMissionAction = async (missionId: string) => {
        if (missionId === "viral") {
            impact("medium");
            // Find the JOIN_CHANNEL mission from regular missions if possible, 
            // but for starter mission, we can try verifyChannelSubscription with dummy ID or 0 
            // and the backend should handle "JOIN_CHANNEL" action_type check.
            // Actually, backend verify_channel expects target_channel from env if mission_id is not useful.

            const result = await verifyChannelSubscription(0); // Using 0 as it's a generic check
            if (result.success) {
                notification("success");
                addToast("구독 인증 완료!", "success");
                queryClient.invalidateQueries({ queryKey: ["new-user-status"] });
            } else {
                const channelLink = "https://t.me/+LksI3XlSjLlhZmE0";
                const tg = window.Telegram?.WebApp;
                if (tg?.openTelegramLink) {
                    tg.openTelegramLink(channelLink);
                } else {
                    window.open(channelLink, "_blank");
                }
                addToast("채널에 입장하여 구독해 주세요.", "info");
            }
        }
    };

    if (!status?.eligible) {
        return null;
    }

    const missions = [
        {
            id: "play_1",
            title: "게임 1회",
            icon: "/assets/welcome/icon_play1.png",
            completed: status.progress.play_1,
            reward: 2500,
            hint: "게임을 1판 플레이하세요",
        },
        {
            id: "play_3",
            title: "게임 3회",
            icon: "/assets/welcome/icon_play3.png",
            completed: status.progress.play_3,
            reward: 2500,
            hint: "게임을 총 3판 플레이하세요",
        },
        {
            id: "viral",
            title: "채널 구독",
            icon: "/assets/welcome/icon_viral.png",
            completed: status.progress.share_or_join,
            reward: 2500,
            hint: "클릭하여 채널 구독 확인",
        },
        {
            id: "attendance",
            title: "출석 체크",
            icon: "/assets/welcome/icon_attendance.png",
            completed: status.progress.next_day_login,
            reward: 2500,
            hint: "내일 다시 로그인하세요",
        },
    ];

    const completedCount = missions.filter((m) => m.completed).length;

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
                        {missions.map((mission) => (
                            <div
                                key={mission.id}
                                className={`flex flex-col items-center gap-2 group cursor-pointer transition-transform active:scale-95`}
                                onClick={() => !mission.completed && handleMissionAction(mission.id)}
                            >
                                <div className={`relative w-full aspect-square rounded-2xl border-2 ${mission.completed ? "border-emerald-500 bg-emerald-500/10" : "border-white/20 bg-white/5 group-hover:border-white/40"} p-2 transition-all`}>
                                    <img
                                        src={mission.icon}
                                        alt={mission.title}
                                        className={`w-full h-full object-contain ${!mission.completed && "opacity-50 grayscale group-hover:opacity-80 group-hover:grayscale-0"}`}
                                    />
                                    {mission.completed && (
                                        <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                    )}
                                    {!mission.completed && mission.id === "viral" && (
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <div className="bg-emerald-500 text-white text-[8px] font-black px-1 rounded animate-pulse">CHECK</div>
                                        </div>
                                    )}
                                </div>
                                <div className="text-center">
                                    <p className="text-[10px] font-bold text-white/80">{mission.title}</p>
                                    <div className="flex items-center justify-center gap-1 mt-0.5">
                                        <img src="/assets/logo_cc_v2.png" alt="" className="w-3.5 h-3.5 object-contain" />
                                        <span className="text-[10px] font-bold text-emerald-400">{mission.reward.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Progress */}
                    <div className="text-center">
                        <p className="text-sm font-bold text-white/70">
                            미션 진행도: <span className="text-emerald-400">{completedCount}/4</span>
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
                            {formatSeconds(status.seconds_left)}
                        </span>
                    </div>

                    {/* Don't Show Again */}
                    <label className="flex items-center justify-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={dontShowAgain}
                            onChange={(e) => setDontShowAgain(e.target.checked)}
                            className="w-4 h-4 rounded border-white/20 bg-white/10 text-emerald-500 focus:ring-emerald-500"
                        />
                        <span className="text-xs text-white/50">다시 보지 않기</span>
                    </label>
                </div>
            </div>
        </div>
    );
};

export default NewUserWelcomeModal;
