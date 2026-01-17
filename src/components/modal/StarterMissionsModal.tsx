import React, { useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getNewUserStatus } from "../../api/newUserApi";
import { useToast } from "../common/ToastProvider";
import { useHaptic } from "../../hooks/useHaptic";
import { Gift, CheckCircle2, Gamepad2, Users, Calendar, X, ChevronRight, Zap } from "lucide-react";
import clsx from "clsx";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

interface StarterMissionsModalProps {
    onClose: () => void;
}

const StarterMissionsModal: React.FC<StarterMissionsModalProps> = ({ onClose }) => {
    const { addToast } = useToast();
    const { impact } = useHaptic();
    const navigate = useNavigate();
    const lastDataRef = useRef<any>(null);

    const { data: status } = useQuery({
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

    const handleAction = () => {
        impact("medium");
        addToast("미션을 완료하면 총 8,000원을 지급해 드려요! 🎁", "success");
        onClose();
        navigate("/missions");
    };

    if (!activeData) {
        // Data loading or not available yet
        return null;
    }

    const { missions } = activeData;
    const safeMissions = Array.isArray(missions) ? missions : [];

    {/* Filter only starter missions */}
    const starterMissions = safeMissions.filter((m: any) =>
        m.logic_key === "starter_play_1" ||
        m.logic_key === "starter_play_3" ||
        m.logic_key === "starter_channel_join" ||
        m.logic_key === "starter_attendance"
    );

    {/* If no starter missions or all claimed, we might still want to show them if the modal was triggered */}
    if (starterMissions.length === 0) return null;

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
        <div className="fixed inset-0 z-[10001] flex items-center justify-center px-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/90 backdrop-blur-xl"
            />

            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative w-full max-w-[340px] overflow-hidden rounded-[32px] border border-white/10 bg-[#121214] shadow-2xl"
            >
                {/* Header Decoration */}
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-purple-500/20 to-transparent pointer-events-none" />

                <div className="relative p-6 pb-2">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-black tracking-widest uppercase mb-2">
                                <Zap size={12} className="fill-current" />
                                Starter Pack
                            </div>
                            <h2 className="text-2xl font-black text-white tracking-tight leading-tight">
                                미션 달성하고<br />
                                <span className="text-purple-400">8,000원</span> 받기!
                            </h2>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-2 rounded-full bg-white/5 border border-white/10 text-white/40 hover:text-white transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Mission List */}
                    <div className="space-y-2 mb-6">
                        {starterMissions.map((mission: any, idx: number) => (
                            <motion.div
                                key={mission.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.1 + idx * 0.1 }}
                                onClick={() => {
                                    impact("light");
                                    onClose();
                                    navigate("/missions");
                                }}
                                className={clsx(
                                    "group relative flex items-center gap-3 p-3 rounded-2xl border transition-all cursor-pointer overflow-hidden",
                                    mission.is_claimed
                                        ? "bg-white/5 border-white/5 opacity-50"
                                        : "bg-white/5 border-white/10 hover:bg-purple-500/10 hover:border-purple-500/30"
                                )}
                            >
                                <div className={clsx(
                                    "relative z-10 flex items-center justify-center w-10 h-10 rounded-xl",
                                    mission.is_claimed ? "bg-white/10 text-white/20" : "bg-purple-500/20 text-purple-400"
                                )}>
                                    {mission.is_claimed ? <CheckCircle2 size={20} /> : getMissionIcon(mission.logic_key)}
                                </div>
                                <div className="relative z-10 flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-bold text-white truncate">
                                            {mission.title}
                                        </p>
                                        {!mission.is_claimed && (
                                            <span className="text-[10px] font-bold text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded">
                                                +{mission.reward_amount?.toLocaleString()}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-white/40 truncate">
                                        {mission.description || "미션 완료하고 보상 받기"}
                                    </p>
                                </div>
                                {!mission.is_claimed && (
                                    <ChevronRight className="relative z-10 w-4 h-4 text-white/20 group-hover:text-purple-400 transition-colors" />
                                )}
                            </motion.div>
                        ))}
                    </div>

                    {/* Total Reward & Action */}
                    <div className="pt-4 border-t border-white/10">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-xs font-bold text-white/40">예상 총 보상</span>
                            <span className="text-xl font-black text-purple-400">
                                {totalReward.toLocaleString()}원
                            </span>
                        </div>
                        
                        <button
                            onClick={handleAction}
                            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-base shadow-lg shadow-purple-900/40 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                        >
                            <span>전부 받으러 가기</span>
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default StarterMissionsModal;
