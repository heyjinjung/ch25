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
    onClaim?: () => Promise<boolean>;
    currentStreak: number;
    claimableDay?: number | null;
    rules: Rule[];
}

const AttendanceStreakModal: React.FC<AttendanceStreakModalProps> = ({ onClose, onClaim, currentStreak, claimableDay, rules }) => {
    const [isClaiming, setIsClaiming] = React.useState(false);
    const isZeroStreak = currentStreak === 0;

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

    const getRewardLabel = (day: number, grants?: Reward[]) => {
        // 요구사항: 보상명 표기는 일차별로 고정 (띄어쓰기 없이)
        // 1일차 룰렛1개
        // 2일차 주사위1개
        // 3일차 패키지
        // 4일차 다이아N개 (기본 1)
        // 5일차 패키지
        // 6일차 다이아N개 (기본 2)
        // 7일차 다이아N개 (기본 5, 수량은 어드민 룰 우선)

        if (day === 1) return "룰렛1개";
        if (day === 2) return "주사위1개";
        if (day === 3) return "패키지";
        if (day === 5) return "패키지";

        const defaultDiamondAmountByDay: Record<number, number> = { 4: 1, 6: 2, 7: 5 };
        const defaultDiamondAmount = defaultDiamondAmountByDay[day] ?? 1;

        const diamondGrant = grants?.find(
            (g) => g?.item_type === "DIAMOND" || g?.token_type === "DIAMOND"
        );
        const diamondAmount = typeof diamondGrant?.amount === "number" ? diamondGrant.amount : defaultDiamondAmount;

        if (day === 4 || day === 6 || day === 7) return `다이아${diamondAmount}개`;

        // Fallback (shouldn't happen for 1~7 days)
        if (!grants || grants.length === 0) return "-";
        if (grants.length > 1) return "패키지";
        const g = grants[0];
        const name = (getKoreanRewardName(g) || "").replace(/\s+/g, "");
        return `${name}${g.amount}개`;
    };

    const handleAction = async () => {
        tryHaptic(30);
        if (claimableDay && onClaim) {
            setIsClaiming(true);
            const success = await onClaim();
            setIsClaiming(false);
            if (success) {
                onClose();
            }
        } else {
            onClose();
        }
    };

    const isClaimable = !!claimableDay;

    return (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
            <div className="relative w-full max-w-md max-h-[90vh] flex flex-col rounded-3xl border border-white/10 bg-[#0A0A0A] p-1 shadow-2xl animate-zoom-in">

                {/* Glow Background */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 bg-gradient-to-b from-figma-primary/20 to-transparent blur-3xl pointer-events-none" />

                <div className="relative flex-1 overflow-y-auto rounded-2xl bg-gradient-to-b from-white/5 to-transparent flex flex-col items-center custom-scrollbar">
                    {/* Header Banner */}
                    <div className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-black/40">
                        <img
                            src="/assets/welcome/header_2026_newyear.webp"
                            alt=""
                            className="w-full h-28 object-cover"
                        />

                        <button
                            onClick={() => { tryHaptic(10); onClose(); }}
                            className="absolute top-3 right-3 z-10 p-2 rounded-full bg-black/30 hover:bg-white/10 border border-white/10 transition-colors"
                            disabled={isClaiming}
                        >
                            <X className="w-5 h-5 text-white/80" />
                        </button>
                    </div>

                    <div className="w-full p-5 flex flex-col items-center">
                        <header className="text-center mb-5 mt-2 w-full">
                            <div className="mx-auto -mt-10 mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-black/60 border border-white/10 shadow-lg">
                                <img src="/assets/icons/icon_fire.webp" alt="" className="h-10 w-10 object-contain" />
                            </div>
                            <h2 className="text-2xl font-black text-white glow-green mb-3 tracking-tight">
                                {isZeroStreak ? "🎮 게임 시작 후 보상 시작!" : (isClaimable ? "🎁 보상 수령 대기" : "연속 플레이 기록")}
                            </h2>
                            <div className="text-xs font-medium text-white/70 space-y-1.5 bg-white/5 rounded-xl p-3 text-left border border-white/5">
                                <p>• 하루 한 번 <span className="text-emerald-400 font-bold">플레이</span> - ‘연속 기록’</p>
                                <p>• <span className="text-emerald-400 font-bold">매일 게임 플레이</span>시 기록이 유지</p>
                                <p className="text-white/40 pt-1.5 border-t border-white/10 mt-1.5">• 기준 시간: 매일 00:00</p>
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

                            // Highlight the day being claimed
                            const isClaimTarget = day === claimableDay;

                            const isLastDay = day === 7;
                            const emphasize = isLastDay || isToday || isClaimTarget;

                            return (
                                <div
                                    key={day}
                                    className={clsx(
                                        "relative flex flex-col items-center justify-center aspect-square rounded-2xl border transition-all duration-300",
                                        isLastDay ? "col-span-2 aspect-auto py-2" : "col-span-1",
                                        isPast ? "bg-emerald-500/10 border-emerald-500/30" :
                                            (isToday || isClaimTarget) ? "bg-figma-primary border-figma-primary shadow-[0_0_20px_rgba(48,255,117,0.3)] scale-105 z-10" :
                                                "bg-white/5 border-white/10"
                                    )}
                                >
                                    {isLastDay ? (
                                        <img
                                            src="/assets/modals/7days.webp"
                                            alt=""
                                            className="absolute inset-0 w-full h-full object-cover opacity-30 pointer-events-none"
                                        />
                                    ) : null}

                                    {isLastDay ? (
                                        <span className="absolute left-2 top-2 rounded-lg bg-white/10 px-2 py-0.5 text-[9px] font-black text-figma-accent">
                                            최종 보상
                                        </span>
                                    ) : null}

                                    <span className={clsx(
                                        isLastDay ? "text-xs font-black mb-1" : "text-[10px] font-black mb-0.5",
                                        (isToday || isClaimTarget) ? "text-white" : "text-white/40"
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
                                        (isToday || isClaimTarget) ? "text-white" : "text-white/30"
                                    )}>
                                        {getRewardLabel(day, rule?.grants)}
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
                                <p className="text-xl font-black text-white">
                                    {isZeroStreak ? "⏳ 게임 플레이 대기" : `🔥 ${currentStreak}일 연속!`}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black text-white/40 tracking-widest">
                                    {isZeroStreak ? "첫 보상" : "다음 보상"}
                                </p>
                                <p className="text-sm font-bold text-figma-accent">{isZeroStreak ? "1일차" : `${currentStreak + 1}일차`}</p>
                            </div>
                        </div>

                        {isZeroStreak ? (
                            <>
                                <p className="text-center text-xs text-white/60 py-2">
                                    게임을 플레이하면 <span className="text-figma-accent font-bold">1일차 보상</span>을 받을 수 있어요!
                                </p>
                                <Button
                                    variant="figma-secondary"
                                    fullWidth
                                    className="rounded-2xl py-3.5 text-base"
                                    onClick={onClose}
                                >
                                    게임 하러 가기 🎮
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button
                                    variant={isClaimable ? "figma-primary" : "figma-secondary"}
                                    fullWidth
                                    className="rounded-2xl py-3.5 text-base"
                                    onClick={handleAction}
                                    disabled={isClaiming || !isClaimable}
                                >
                                    {isClaiming
                                        ? "처리 중..."
                                        : isClaimable
                                            ? "🎁 보상 받기"
                                            : "다음 보상 대기"}
                                </Button>
                                {!isClaimable && (
                                    <button onClick={onClose} className="w-full py-2 text-xs font-medium text-white/40 hover:text-white transition-colors">
                                        닫기
                                    </button>
                                )}
                            </>
                        )}
                        </div>

                        <p className="mt-4 text-[9px] font-black text-white/20 tracking-[0.2em]">출석 보상 v1.0</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AttendanceStreakModal;
