import React from "react";
import { Target, ArrowRight, CheckCircle2, Star, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { useMissionStore } from "../../stores/missionStore";
import { tryHaptic } from "../../utils/haptics";
import { useToast } from "../common/ToastProvider";

interface TodayMissionCardProps {
    data: any;
}

const TodayMissionCard: React.FC<TodayMissionCardProps> = ({ data }) => {
    const { claimReward } = useMissionStore();
    const { addToast } = useToast();
    const [isClaiming, setIsClaiming] = React.useState(false);

    const { mission, progress } = data;
    const isCompleted = progress.is_completed;
    const isClaimed = progress.is_claimed;
    const progressPercent = Math.min(100, (progress.current_value / mission.target_value) * 100);

    const handleClaim = async () => {
        if (isClaiming || isClaimed || !isCompleted) return;
        tryHaptic(50);
        setIsClaiming(true);
        const res = await claimReward(mission.id);
        if (res.success) {
            const rewardMsg = res.amount ? `${res.amount}${res.reward_type || ""}을 수령했습니다!` : "보상을 수령했습니다!";
            addToast(rewardMsg, "success");
        } else {
            addToast(res.message || "보상 수령에 실패했습니다.", "error");
        }
        setIsClaiming(false);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full mb-6 rounded-[32px] bg-zinc-950 border border-white/10 overflow-hidden relative group"
        >
            {/* Glossy Background Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent opacity-50" />

            <div className="relative p-6">
                <div className="flex justify-between items-start mb-6">
                    <div className="flex flex-col gap-1">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black tracking-widest uppercase">
                            <Zap size={12} className="fill-current" />
                            Today's One Pick
                        </div>
                        <h3 className="text-2xl font-black text-white tracking-tight mt-2">{mission.title}</h3>
                        <p className="text-sm font-medium text-white/40">{mission.description || "지금 바로 도전하고 보상을 받으세요."}</p>
                    </div>

                    <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                        <Target size={24} />
                    </div>
                </div>

                {/* Progress Visual */}
                <div className="mb-8">
                    <div className="flex justify-between items-end mb-2">
                        <span className="text-[11px] font-black text-white/30 uppercase tracking-widest">Progress</span>
                        <span className="text-sm font-black text-white tabular-nums">
                            {progress.current_value.toLocaleString()} / {mission.target_value.toLocaleString()}
                        </span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPercent}%` }}
                            className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 relative"
                        >
                            <div className="absolute inset-0 bg-white/20 animate-shimmer bg-[length:200%_100%]" />
                        </motion.div>
                    </div>
                </div>

                {/* Footer / CTA */}
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                            <Star size={20} className="fill-current" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">Reward</p>
                            <p className="text-sm font-black text-white">
                                {mission.reward_amount.toLocaleString()} {mission.reward_type}
                            </p>
                        </div>
                    </div>

                    {isClaimed ? (
                        <div className="flex items-center gap-1.5 text-emerald-500 font-black text-sm px-4 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                            <CheckCircle2 size={18} />
                            수령 완료
                        </div>
                    ) : isCompleted ? (
                        <button
                            disabled={isClaiming}
                            onClick={handleClaim}
                            data-tour="mission-claim-btn"
                            className="px-6 py-3 rounded-2xl bg-emerald-500 text-black font-black text-sm shadow-[0_8px_16px_-4px_rgba(16,185,129,0.4)] active:scale-[0.95] transition-all flex items-center gap-2"
                        >
                            {isClaiming ? "처리 중..." : "보상 받기"}
                            {!isClaiming && <ArrowRight size={16} />}
                        </button>
                    ) : (
                        <div className="text-[11px] font-black text-white/30 px-4 py-3 rounded-2xl bg-white/5 border border-white/5">
                            진행 중...
                        </div>
                    )}
                </div>
            </div>

            {/* Background Decoration */}
            <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-emerald-500/10 blur-[40px] rounded-full pointer-events-none" />
        </motion.div>
    );
};

export default TodayMissionCard;
