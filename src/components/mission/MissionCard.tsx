import React from "react";
import { MissionData, useMissionStore } from "../../stores/missionStore";
import { useToast } from "../common/ToastProvider";
import { useHaptic } from "../../hooks/useHaptic";
import { useSound } from "../../hooks/useSound";

import { useQueryClient } from "@tanstack/react-query";

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

        impact('medium');

        const result = await claimReward(mission.id);
        if (result.success) {
            notification('success');
            playToast();
            addToast(`Received ${result.amount} ${result.reward_type}!`, "success");

            // Immediate Update
            queryClient.invalidateQueries({ queryKey: ["vault-status"] });
            // Also refresh other assets if needed
            if (result.reward_type === 'TICKET_BUNDLE') {
                queryClient.invalidateQueries({ queryKey: ["lottery-status"] });
                queryClient.invalidateQueries({ queryKey: ["roulette-status"] });
                queryClient.invalidateQueries({ queryKey: ["dice-status"] });
            }

            // Optional: Refresh missions to match server state (redundancy check)
            // setTimeout(() => fetchMissions(), 500); 
            // We already updated local state in store, so fetching is optional but safe.

        } else {
            notification('error');
            addToast(result.message || "Failed to claim reward.", "error");
        }
    };

    const handleViralAction = async () => {
        // 1. Join Channel Verification
        if (mission.action_type === 'JOIN_CHANNEL') {
            impact('light');
            try {
                // Determine Channel Link (Hardcoded or from Env?)
                const channelLink = "https://t.me/cc_jm_2026_official";

                // First, try to verify
                const { userApi } = await import("../../api/httpClient");
                const res = await userApi.post('/viral/verify/channel', { mission_id: mission.id });

                if (res.data && res.data.success && res.data.message === "Verified and Updated") {
                    notification('success');
                    addToast("Verification Successful!", "success");
                    fetchMissions(); // Refresh to show claiming state or completed
                } else {
                    // If not verified, open the channel
                    notification('warning');
                    addToast("Please join the channel first.", "info");
                    window.Telegram?.WebApp?.openTelegramLink?.(channelLink) || window.open(channelLink, '_blank');
                }
            } catch (e) {
                console.error(e);
                addToast("Verification Failed", "error");
            }
        }

        // 2. Invite Friends
        if (mission.action_type === 'INVITE_FRIEND') {
            impact('light');
            // Trigger Telegram Share
            // Using switchInlineQuery is best for "Send to Chat"
            // For now just generic
            if (window.Telegram?.WebApp?.switchInlineQuery) {
                window.Telegram.WebApp.switchInlineQuery("share_ref", ["users", "groups"]);
            } else {
                addToast("Share feature not available", "error");
            }
        }

        // 3. Share Story (Unclaimed / Action Phase)
        if (mission.action_type === 'SHARE_STORY') {
            impact('light');
            // Similar to 'Claimed' logic but for Action
            if (window.Telegram?.WebApp?.shareToStory) {
                const appUrl = "https://t.me/jm956_bot/ccjm";
                window.Telegram.WebApp.shareToStory("https://placehold.co/1080x1920/png?text=Join+Me!", {
                    text: `Join the adventure!`,
                    widget_link: { url: appUrl, name: "Play Now" }
                });

                // Optimistically notify backend
                try {
                    const { userApi } = await import("../../api/httpClient");
                    await userApi.post('/viral/action/story', { action_type: 'SHARE_STORY' });
                    addToast("Story Shared! Checking progress...", "success");
                    setTimeout(() => fetchMissions(), 1000);
                } catch (e) { console.error(e); }

            } else {
                addToast("Story sharing not supported on this device", "error");
            }
        }
    };

    const percent = Math.min(100, Math.round((progress.current_value / mission.target_value) * 100));

    // Display Logic for Reward Icon
    const renderRewardIcon = () => {
        switch (mission.reward_type) {
            case 'DIAMOND': return <span className="text-lg">💎</span>;
            case 'GOLD_KEY': return <span className="text-lg">🔑</span>;
            case 'DIAMOND_KEY': return <span className="text-lg">🗝️</span>;
            default: return <div className="w-4 h-4 rounded-full bg-yellow-400" />;
        }
    };

    return (
        <div className="bg-slate-800/80 border border-slate-700/50 rounded-xl p-4 flex items-center gap-4 relative overflow-hidden">
            {/* Background Progress Bar */}
            <div
                className="absolute bottom-0 left-0 h-1 bg-indigo-500/20 transition-all duration-500"
                style={{ width: `${percent}%` }}
            />

            {/* Icon */}
            <div className="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center text-2xl shrink-0 border border-slate-600">
                {renderRewardIcon()}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1">
                    <h3 className="font-bold text-slate-100 text-sm truncate pr-2">{mission.title}</h3>
                    {/* Show Reward Amount + XP */}
                    <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 text-xs font-bold text-white bg-slate-700 px-1.5 py-0.5 rounded">
                            <img src="/assets/icon_diamond.png" alt="" className="w-4 h-4 object-contain" />
                            {mission.reward_amount}
                        </span>
                        {mission.xp_reward > 0 && (
                            <span className="text-xs font-bold text-amber-400">+{mission.xp_reward} XP</span>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                    <span>{progress.current_value}/{mission.target_value}</span>
                    <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                            style={{ width: `${percent}%` }}
                        />
                    </div>
                    <span>{percent}%</span>
                </div>
            </div>

            {/* Button */}
            <div className="shrink-0 flex items-center gap-2">
                {progress.is_claimed ? (
                    <>
                        {/* Re-share button for Viral Loop */}
                        <button
                            onClick={() => {
                                const appUrl = "https://t.me/jm956_bot/ccjm";
                                if (window.Telegram?.WebApp?.shareToStory) {
                                    window.Telegram.WebApp.shareToStory("https://placehold.co/1080x1920/png?text=I+Completed+Mission!", {
                                        text: `I just earned ${mission.reward_amount} ${mission.reward_type}!`,
                                        widget_link: {
                                            url: appUrl,
                                            name: "Play Now"
                                        }
                                    });
                                }
                            }}
                            className="p-2 bg-pink-500/20 text-pink-400 rounded-lg hover:bg-pink-500/30 transition-colors"
                            title="Share to Story"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                            </svg>
                        </button>
                        <button disabled className="px-4 py-2 bg-slate-700 text-slate-500 text-xs font-bold rounded-lg cursor-not-allowed">
                            Completed
                        </button>
                    </>
                ) : progress.is_completed ? (
                    <button
                        onClick={handleClaim}
                        className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white text-xs font-bold rounded-lg shadow-lg shadow-orange-500/20 animate-bounce-subtle"
                    >
                        Claim
                    </button>
                ) : (
                    <>
                        {/* Special Viral Actions when NOT completed */}
                        {mission.action_type === 'JOIN_CHANNEL' && (
                            <button
                                onClick={handleViralAction}
                                className="px-4 py-2 bg-[#0088cc] hover:bg-[#0077b5] text-white text-xs font-bold rounded-lg shadow-lg shadow-blue-500/20"
                            >
                                Check
                            </button>
                        )}
                        {mission.action_type === 'INVITE_FRIEND' && (
                            <button
                                onClick={handleViralAction}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow-lg"
                            >
                                Invite
                            </button>
                        )}
                        {mission.action_type === 'SHARE_STORY' && (
                            <button
                                onClick={handleViralAction}
                                className="px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold rounded-lg shadow-lg"
                            >
                                Share
                            </button>
                        )}

                        {/* Fallback for regular missions */}
                        {!['JOIN_CHANNEL', 'INVITE_FRIEND', 'SHARE_STORY'].includes(mission.action_type || '') && (
                            <button disabled className="px-4 py-2 bg-slate-700/50 text-slate-500 text-xs font-bold rounded-lg border border-slate-600">
                                In Progress
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default MissionCard;
