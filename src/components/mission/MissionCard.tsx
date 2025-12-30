import React from "react";
import { MissionData, useMissionStore } from "../../stores/missionStore";
import { useToast } from "../common/ToastProvider";
// import { useSound } from "../../hooks/useSound"; // Unused

interface MissionCardProps {
    data: MissionData;
}

const MissionCard: React.FC<MissionCardProps> = ({ data }) => {
    const { mission, progress } = data;
    const { claimReward } = useMissionStore();
    const { addToast } = useToast();
    // const { playSfx } = useSound(); // Unused

    const handleClaim = async () => {
        if (!progress.is_completed || progress.is_claimed) return;

        const success = await claimReward(mission.id);
        if (success) {
            addToast(`Received ${mission.reward_amount} ${mission.reward_type}!`, "success");
        } else {
            addToast("Failed to claim reward.", "error");
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
                        <span className="text-xs font-bold text-white bg-slate-700 px-1.5 py-0.5 rounded">
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
            <div className="shrink-0">
                {progress.is_claimed ? (
                    <button disabled className="px-4 py-2 bg-slate-700 text-slate-500 text-xs font-bold rounded-lg cursor-not-allowed">
                        Completed
                    </button>
                ) : progress.is_completed ? (
                    <button
                        onClick={handleClaim}
                        className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white text-xs font-bold rounded-lg shadow-lg shadow-orange-500/20 animate-bounce-subtle"
                    >
                        Claim
                    </button>
                ) : (
                    <button disabled className="px-4 py-2 bg-slate-700/50 text-slate-500 text-xs font-bold rounded-lg border border-slate-600">
                        In Progress
                    </button>
                )}
            </div>
        </div>
    );
};

export default MissionCard;
