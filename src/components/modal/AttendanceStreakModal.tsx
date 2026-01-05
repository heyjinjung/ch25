import React from "react";
import { X, CheckCircle2, Lock, Star } from "lucide-react";
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

    const getKoreanRewardName = (g: Reward) => {
        if (g.item_type === "DIAMOND" || g.token_type === "DIAMOND") return "다이아";
        if (g.item_type === "PACKAGE" || g.token_type === "PACKAGE") return "패키지";
        if (g.token_type === "ROULETTE_COIN") return "룰렛 티켓";
        if (g.token_type === "DICE_TOKEN") return "주사위 티켓";
        if (g.token_type === "LOTTERY_TICKET") return "복권 티켓";
        if (g.token_type === "GOLD_KEY") return "골드 키";
        if (g.token_type === "DIAMOND_KEY") return "다이아 키";
        if (g.token_type === "TRIAL_TOKEN") return "체험 티켓";
        return g.item_type || g.token_type || "보상";
    };

    const getRewardIcon = (
        grants: Reward[],
        opts?: {
            isLastDay?: boolean;
            emphasize?: boolean;
        }
    ): React.ReactNode => {
        const isLastDay = opts?.isLastDay === true;
        const emphasize = opts?.emphasize === true;
        const sizeClass = isLastDay ? "h-12 w-12" : "h-9 w-9";
        const pulseClass = emphasize ? "animate-pulse" : "";

        if (grants.length > 1) {
            return <img src="/assets/lottery/icon_gift.png" alt="패키지" className={`${sizeClass} ${pulseClass} object-contain`} />;
        }
        const g = grants[0];
        if (!g) return <Star className={`${isLastDay ? "w-12 h-12" : "w-9 h-9"} text-gray-400 ${pulseClass}`} />;

        if (g.token_type === "ROULETTE_COIN") return <span className={`${isLastDay ? "text-4xl" : "text-3xl"} ${pulseClass}`}>🎯</span>;
        if (g.token_type === "DICE_TOKEN") return <span className={`${isLastDay ? "text-4xl" : "text-3xl"} ${pulseClass}`}>🎲</span>;
        if (g.token_type === "LOTTERY_TICKET") return <span className={`${isLastDay ? "text-4xl" : "text-3xl"} ${pulseClass}`}>🎫</span>;
        if (g.item_type === "DIAMOND" || g.token_type === "DIAMOND") {
            return <img src="/assets/icon_diamond.png" alt="다이아" className={`${sizeClass} ${pulseClass} object-contain`} />;
        }
        if (g.item_type === "PACKAGE" || g.token_type === "PACKAGE") {
            return <img src="/assets/lottery/icon_gift.png" alt="패키지" className={`${sizeClass} ${pulseClass} object-contain`} />;
        }
        return <img src="/assets/lottery/icon_gift.png" alt="선물" className={`${sizeClass} ${pulseClass} object-contain`} />;
    };

    const getRewardLabel = (grants: Reward[]) => {
        if (grants.length === 0) return "없음";
        if (grants.length > 1) return "패키지";
        const g = grants[0];
        const name = getKoreanRewardName(g);
        return `${g.amount} ${name}`;
    };

    return (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center px-4 bg-black/85 backdrop-blur-xl animate-fade-in">
            <div className="relative w-full max-w-md max-h-[85vh] flex flex-col rounded-[2.5rem] border border-white/10 bg-[#0A0A0A] p-1 shadow-2xl animate-zoom-in">

                {/* Glow Background */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 bg-gradient-to-b from-figma-primary/20 to-transparent blur-3xl pointer-events-none" />

                <div className="relative flex-1 overflow-y-auto rounded-[2.3rem] bg-gradient-to-b from-white/5 to-transparent p-5 flex flex-col items-center custom-scrollbar">

                    <button
                        onClick={() => { tryHaptic(10); onClose(); }}
                        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/20 hover:bg-white/10 border border-white/5 transition-colors"
                    >
                        <X className="w-5 h-5 text-white/60" />
                    </button>

                    <header className="text-center mb-5 mt-2 w-full">
                        <h2 className="text-2xl font-black text-white glow-green mb-3 tracking-tight">
                            연속 플레이 기록
                        </h2>
                        <div className="text-xs font-medium text-white/70 space-y-1.5 bg-white/5 rounded-xl p-3 text-left border border-white/5">
                            <p>• 하루에 한 번만 <span className="text-emerald-400 font-bold">플레이</span>하면 ‘연속 기록’이 1씩 올라가요.</p>
                            <p>• 단순 접속이 아니라 <span className="text-emerald-400 font-bold">매일 게임을 플레이</span>해야 기록이 유지돼요.</p>
                            <p className="text-white/40 pt-1.5 border-t border-white/10 mt-1.5">• 기준 시간: 매일 00:00</p>
                        </div>
                        <div className="mt-2 text-[10px] text-amber-400/90 font-bold animate-pulse">
                            [보상 안내] 오픈 기념 보상은 즉시 공개 예정이에요!
                        </div>
                    </header>

                    {/* 7-Day Grid */}
                    <div className="grid grid-cols-4 gap-2 w-full mb-6">
                        {Array.from({ length: 7 }).map((_, i) => {
                            const day = i + 1;
                            const rule = sortedRules.find(r => r.day === day);
                            const isToday = currentStreak === day;
                            const isPast = currentStreak > day;
                            const isFuture = currentStreak < day;

                            const isLastDay = day === 7;
                            const emphasize = isLastDay || isToday;

                            return (
                                <div
                                    key={day}
                                    className={clsx(
                                        "relative flex flex-col items-center justify-center aspect-square rounded-2xl border transition-all duration-300",
                                        isLastDay ? "col-span-2 aspect-auto py-2" : "col-span-1",
                                        isPast ? "bg-emerald-500/10 border-emerald-500/30" :
                                            isToday ? "bg-figma-primary border-figma-primary shadow-[0_0_20px_rgba(48,255,117,0.3)] scale-105 z-10" :
                                                "bg-white/5 border-white/10"
                                    )}
                                >
                                    {isLastDay ? (
                                        <span className="absolute left-2 top-2 rounded-lg bg-white/10 px-2 py-0.5 text-[9px] font-black text-figma-accent">
                                            최종 보상
                                        </span>
                                    ) : null}

                                    <span className={clsx(
                                        isLastDay ? "text-xs font-black mb-1" : "text-[10px] font-black mb-0.5",
                                        isToday ? "text-white" : "text-white/40"
                                    )}>
                                        {day}일차
                                    </span>

                                    <div className={clsx("mb-1 flex items-center justify-center", emphasize ? "drop-shadow" : "")}>
                                        {rule ? (
                                            getRewardIcon(rule.grants, { isLastDay, emphasize: isLastDay })
                                        ) : (
                                            <img
                                                src="/assets/lottery/icon_gift.png"
                                                alt="선물"
                                                className={clsx(isLastDay ? "h-10 w-10" : "h-8 w-8", "object-contain", isLastDay ? "animate-pulse" : "")}
                                            />
                                        )}
                                    </div>

                                    <span className={clsx(
                                        isLastDay ? "text-[10px] font-black truncate max-w-full px-2" : "text-[8px] font-bold truncate max-w-full px-1",
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

                    <div className="w-full space-y-3 mt-auto">
                        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">나의 현재 기록</p>
                                <p className="text-xl font-black text-white">🔥 {currentStreak}일 연속!</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black text-white/40 tracking-widest">다음 보상</p>
                                <p className="text-sm font-bold text-figma-accent">{currentStreak + 1}일차</p>
                            </div>
                        </div>

                        <Button
                            variant="figma-primary"
                            fullWidth
                            className="rounded-2xl py-3.5 shadow-emerald-500/30 text-base"
                            onClick={() => { tryHaptic(30); onClose(); }}
                        >
                            확인
                        </Button>
                    </div>

                    <p className="mt-4 text-[9px] font-black text-white/20 tracking-[0.2em]">출석 보상 v1.0</p>
                </div>
            </div>
        </div>
    );
};

export default AttendanceStreakModal;
