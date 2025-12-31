// src/components/mission/MissionCard.tsx
import React from "react";
import { MissionData, useMissionStore } from "../../stores/missionStore";
import { useToast } from "../common/ToastProvider";
import { useHaptic } from "../../hooks/useHaptic";
import { useSound } from "../../hooks/useSound";
import { useQueryClient } from "@tanstack/react-query";
import { Check, ChevronRight, Share2, Users, Bell, Star, Zap } from "lucide-react";
import clsx from "clsx";

interface MissionCardProps {
    data: MissionData;
}

const MissionCard: React.FC<MissionCardProps> = ({ data }) => {
    const { mission, progress } = data;
    const { claimReward, fetchMissions } = useMissionStore();
    const { addToast } = useToast();
    const { notification, impact } = useHaptic();
    const { playToast } = useSound();
    const queryClient = useQueryClient();

    const handleClaim = async () => {
        if (!progress.is_completed || progress.is_claimed) return;
        impact('heavy');
        const result = await claimReward(mission.id);
        if (result.success) {
            notification('success');
            playToast();
            addToast(`보상 수령 완료: ${result.amount} ${result.reward_type}!`, "success");
            queryClient.invalidateQueries({ queryKey: ["vault-status"] });
        } else {
            notification('error');
            addToast(result.message || "보상 수령 실패", "error");
        }
    };

    const handleAction = () => {
        impact('medium');
        if (mission.action_type === 'JOIN_CHANNEL') {
            const channelLink = "https://t.me/cc_jm_2026_official";
            window.Telegram?.WebApp?.openTelegramLink?.(channelLink) || window.open(channelLink, '_blank');
        } else if (mission.action_type === 'INVITE_FRIEND') {
            if (window.Telegram?.WebApp?.switchInlineQuery) {
                window.Telegram.WebApp.switchInlineQuery("share_ref", ["users", "groups"]);
            }
        } else if (mission.action_type === 'SHARE_STORY') {
            if (window.Telegram?.WebApp?.shareToStory) {
                const appUrl = "https://t.me/jm956_bot/ccjm";
                window.Telegram.WebApp.shareToStory("https://placehold.co/1080x1920/png?text=CCJM+Mission!", {
                    text: `CCJM에서 미션을 완료하고 보상을 받으세요!`,
                    widget_link: { url: appUrl, name: "지금 플레이" }
                });
            }
        }
    };

    const percent = Math.min(100, Math.round((progress.current_value / mission.target_value) * 100));
    const isCompleted = progress.is_completed;
    const isClaimed = progress.is_claimed;

    const renderIcon = () => {
        const iconClass = "w-5 h-5";
        switch (mission.action_type) {
            case 'JOIN_CHANNEL': return <Bell className={iconClass} />;
            case 'INVITE_FRIEND': return <Users className={iconClass} />;
            case 'SHARE_STORY': return <Share2 className={iconClass} />;
            case 'LOGIN': return <Star className={iconClass} />;
            default: return <Zap className={iconClass} />;
        }
    };

    return (
        <div className={clsx(
            "relative overflow-hidden rounded-[24px] transition-all duration-300 border backdrop-blur-md",
            isClaimed ? "bg-white/5 border-white/5 opacity-60" :
                isCompleted ? "bg-white/10 border-[#91F402]/30 shadow-[0_0_20px_rgba(145,244,2,0.1)]" :
                    "bg-white/5 border-white/10 hover:border-white/20"
        )}>
            <div className="p-4 flex items-center gap-4">
                {/* Visual Icon Box */}
                <div className={clsx(
                    "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform duration-500",
                    isClaimed ? "bg-gray-800 text-gray-500" :
                        isCompleted ? "bg-[#91F402] text-black scale-110" :
                            "bg-indigo-600/20 text-indigo-400"
                )}>
                    {isClaimed ? <Check size={24} /> : renderIcon()}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-sm font-black text-white truncate leading-tight mb-0.5">
                                {mission.title}
                            </h3>
                            <p className="text-[10px] text-gray-500 truncate max-w-[150px]">
                                {mission.description || "미션을 완료하고 보상을 받으세요"}
                            </p>
                        </div>
                        <div className="flex flex-col items-end shrink-0 ml-2">
                            <div className="flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded-full border border-white/5">
                                <img src="/assets/icon_diamond.png" alt="" className="w-3 h-3 object-contain" />
                                <span className="text-xs font-black text-[#91F402]">{mission.reward_amount}</span>
                            </div>
                            {mission.xp_reward > 0 && (
                                <span className="text-[10px] font-bold text-indigo-400 mt-0.5">+{mission.xp_reward} XP</span>
                            )}
                        </div>
                    </div>

                    {/* Progress Bar Area */}
                    {!isClaimed && (
                        <div className="mt-3">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-[10px] font-bold text-gray-400">Progress</span>
                                <span className="text-[10px] font-black text-white">{progress.current_value} / {mission.target_value}</span>
                            </div>
                            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                                <div
                                    className={clsx(
                                        "h-full rounded-full transition-all duration-1000 ease-out",
                                        isCompleted ? "bg-[#91F402]" : "bg-gradient-to-r from-indigo-500 to-purple-500"
                                    )}
                                    style={{ width: `${percent}%` }}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Dynamic Action Button */}
                <div className="shrink-0 ml-1">
                    {isClaimed ? (
                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-600 border border-white/5">
                            <Check size={20} />
                        </div>
                    ) : isCompleted ? (
                        <button
                            onClick={handleClaim}
                            className="w-12 h-12 rounded-2xl bg-[#91F402] text-black shadow-[0_0_15px_rgba(145,244,2,0.4)] flex items-center justify-center animate-pulse hover:scale-105 active:scale-95 transition-all"
                        >
                            <Trophy size={20} />
                        </button>
                    ) : (
                        <button
                            onClick={handleAction}
                            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all active:scale-90"
                        >
                            <ChevronRight size={20} />
                        </button>
                    )}
                </div>
            </div>

            {/* Glowing Accent for Completed but Unclaimed */}
            {isCompleted && !isClaimed && (
                <div className="absolute inset-0 bg-gradient-to-r from-[#91F402]/5 to-transparent pointer-events-none animate-pulse" />
            )}
        </div>
    );
};

export default MissionCard;
