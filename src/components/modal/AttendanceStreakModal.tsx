import React from "react";
import { X, CheckCircle2, Lock, Gift, Star } from "lucide-react";
import clsx from "clsx";
import Button from "../common/Button";
import { tryHaptic } from "../../utils/haptics";

interface Reward {
    kind: "WALLET" | "INVENTORY";
    token_type?: string;
    item_type?: string;
    amount: number;
}

interface Rule {
    day: number;
    enabled: boolean;
    grants: Reward[];
}

interface AttendanceStreakModalProps {
    onClose: () => void;
    currentStreak: number;
    rules: Rule[];
}

const AttendanceStreakModal: React.FC<AttendanceStreakModalProps> = ({ onClose, currentStreak, rules }) => {
    // We expect rules for 1-7 days. If not provided, we won't show the full grid properly.
    const sortedRules = [...rules].sort((a, b) => a.day - b.day);

    const getRewardIcon = (grants: Reward[]) => {
        if (grants.length > 1) return <Gift className="w-8 h-8 text-amber-400" />;
        const g = grants[0];
        if (!g) return <Star className="w-8 h-8 text-gray-400" />;

        // Simple mapping for demonstration
        if (g.token_type === "ROULETTE_COIN") return "🎯";
        if (g.token_type === "DICE_TOKEN") return "🎲";
        if (g.token_type === "LOTTERY_TICKET") return "🎫";
        if (g.item_type === "DIAMOND" || g.token_type === "DIAMOND") return "💎";
        return <Gift className="w-8 h-8 text-amber-400" />;
    };

    const getRewardLabel = (grants: Reward[]) => {
        if (grants.length === 0) return "없음";
        if (grants.length > 1) return `총 ${grants.length}개`;
        const g = grants[0];
        return `${g.amount}${g.token_type === "ROULETTE_COIN" ? "코인" : g.token_type === "DICE_TOKEN" ? "티켓" : g.item_type || g.token_type}`;
    };

    return (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center px-4 bg-black/85 backdrop-blur-xl animate-fade-in">
            <div className="relative w-full max-w-md rounded-[2.5rem] border border-white/10 bg-[#0A0A0A] p-1 shadow-2xl overflow-hidden animate-zoom-in">

                {/* Glow Background */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 bg-gradient-to-b from-figma-primary/20 to-transparent blur-3xl pointer-events-none" />

                <div className="relative rounded-[2.3rem] bg-gradient-to-b from-white/5 to-transparent p-6 flex flex-col items-center">

                    <button
                        onClick={() => { tryHaptic(10); onClose(); }}
                        className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                    >
                        <X className="w-5 h-5 text-white/40" />
                    </button>

                    <header className="text-center mb-8">
                        <h2 className="text-2xl font-black text-white glow-green mb-1 uppercase italic tracking-tighter">
                            Daily Attendance
                        </h2>
                        <p className="text-sm font-bold text-white/40">
                            매일 접속하고 특별한 선물을 받으세요!
                        </p>
                    </header>

                    {/* 7-Day Grid */}
                    <div className="grid grid-cols-4 gap-3 w-full mb-8">
                        {Array.from({ length: 7 }).map((_, i) => {
                            const day = i + 1;
                            const rule = sortedRules.find(r => r.day === day);
                            const isToday = currentStreak === day;
                            const isPast = currentStreak > day;
                            const isFuture = currentStreak < day;

                            const isLastDay = day === 7;

                            return (
                                <div
                                    key={day}
                                    className={clsx(
                                        "relative flex flex-col items-center justify-center aspect-square rounded-2xl border transition-all duration-300",
                                        isLastDay ? "col-span-2 aspect-auto py-3" : "col-span-1",
                                        isPast ? "bg-emerald-500/10 border-emerald-500/30" :
                                            isToday ? "bg-figma-primary border-figma-primary shadow-[0_0_20px_rgba(48,255,117,0.3)] scale-105" :
                                                "bg-white/5 border-white/10"
                                    )}
                                >
                                    <span className={clsx(
                                        "text-[10px] font-black mb-1",
                                        isToday ? "text-white" : "text-white/40"
                                    )}>
                                        DAY {day}
                                    </span>

                                    <div className="text-xl mb-1">
                                        {rule ? (
                                            typeof getRewardIcon(rule.grants) === 'string' ?
                                                <span>{getRewardIcon(rule.grants)}</span> :
                                                getRewardIcon(rule.grants)
                                        ) : '🎁'}
                                    </div>

                                    <span className={clsx(
                                        "text-[8px] font-bold truncate max-w-full px-1",
                                        isToday ? "text-white" : "text-white/30"
                                    )}>
                                        {rule ? getRewardLabel(rule.grants) : '-'}
                                    </span>

                                    {/* Status Overlay */}
                                    {isPast && (
                                        <div className="absolute inset-x-0 bottom-1 flex justify-center">
                                            <CheckCircle2 className="w-3 h-3 text-emerald-400 fill-emerald-900" />
                                        </div>
                                    )}
                                    {isFuture && (
                                        <div className="absolute top-1 right-1">
                                            <Lock className="w-2.5 h-2.5 text-white/20" />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <div className="w-full space-y-3">
                        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">나의 현재 기록</p>
                                <p className="text-xl font-black text-white">🔥 {currentStreak}일 연속!</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">다음 보상</p>
                                <p className="text-sm font-bold text-figma-accent">Day {currentStreak + 1}</p>
                            </div>
                        </div>

                        <Button
                            variant="figma-primary"
                            fullWidth
                            className="rounded-2xl py-4 shadow-emerald-500/30"
                            onClick={() => { tryHaptic(30); onClose(); }}
                        >
                            확인
                        </Button>
                    </div>

                    <p className="mt-6 text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">
                        Streak Rewards System v1.0
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AttendanceStreakModal;
