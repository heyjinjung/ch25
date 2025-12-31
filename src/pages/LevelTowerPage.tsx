import React, { useEffect, useMemo, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { useSeasonPassStatus } from "../hooks/useSeasonPass";
import { ChevronDown, ChevronUp, Gamepad2 } from "lucide-react";
import clsx from "clsx";
import AnimatedNumber from "../components/common/AnimatedNumber";
import { tryHaptic } from "../utils/haptics";

/* Assets - 기존 시즌패스 아이콘 재사용 */
const ICON_NODE_CURRENT = "/assets/season_pass/icon_node_current.png";
const ICON_NODE_LOCKED = "/assets/season_pass/icon_node_locked.png";
const ICON_NODE_CLEARED = "/assets/season_pass/icon_node_cleared.png";

const LevelTowerPage: React.FC = () => {
    const season = useSeasonPassStatus();
    const [missionsOpen, setMissionsOpen] = useState(false);
    const hasTriggeredHaptic = useRef(false);

    // 페이지 진입 시 진동
    useEffect(() => {
        if (!hasTriggeredHaptic.current) {
            tryHaptic(15); // light haptic
            hasTriggeredHaptic.current = true;
        }
    }, []);

    // 레벨업 임박 시 (80%+) 알림 진동
    useEffect(() => {
        if (season.data) {
            const { current_level, current_xp, levels } = season.data;
            const sortedLevels = [...levels].sort((a, b) => a.level - b.level);
            const currentLevelData = sortedLevels.find((l) => l.level === current_level);
            const nextLevelData = sortedLevels.find((l) => l.level === current_level + 1);
            const startXp = currentLevelData?.required_xp ?? 0;
            const endXp = nextLevelData?.required_xp ?? startXp + 100;
            const progressXp = Math.max(0, current_xp - startXp);
            const totalXp = Math.max(1, endXp - startXp);
            const pct = Math.min(100, Math.floor((progressXp / totalXp) * 100));
            if (pct >= 80 && pct < 100) {
                tryHaptic([50, 50, 50]); // notification pattern
            }
        }
    }, [season.data?.current_xp]);

    const view = useMemo(() => {
        if (!season.data) return null;

        const { current_level, current_xp, levels, max_level } = season.data;

        // Sort levels and get visible range
        const sortedLevels = [...levels].sort((a, b) => a.level - b.level);
        const currentIdx = sortedLevels.findIndex((l) => l.level === current_level);

        // Visible floors: current ± 2 (reversed for top-down display)
        const startIdx = Math.max(0, currentIdx - 1);
        const endIdx = Math.min(sortedLevels.length, currentIdx + 3);
        const visibleFloors = sortedLevels.slice(startIdx, endIdx).reverse();

        // Calculate XP progress
        const currentLevelData = sortedLevels.find((l) => l.level === current_level);
        const nextLevelData = sortedLevels.find((l) => l.level === current_level + 1);

        const startXp = currentLevelData?.required_xp ?? 0;
        const endXp = nextLevelData?.required_xp ?? startXp + 100;
        const progressXp = Math.max(0, current_xp - startXp);
        const totalXp = Math.max(1, endXp - startXp);
        const progressPct = Math.min(100, Math.floor((progressXp / totalXp) * 100));
        const remainingXp = Math.max(0, endXp - current_xp);

        return {
            currentLevel: current_level,
            currentXp: current_xp,
            maxLevel: max_level,
            progressPct,
            remainingXp,
            nextReward: nextLevelData?.reward_label ?? "MAX",
            visibleFloors,
            isMaxLevel: current_level >= max_level,
        };
    }, [season.data]);

    const handleMissionToggle = () => {
        tryHaptic(10); // selection changed
        setMissionsOpen(!missionsOpen);
    };

    const handleCtaClick = () => {
        tryHaptic(30); // medium impact
    };

    if (season.isPending) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500/70 border-t-transparent" />
                <p className="text-white/60 text-sm">레벨 정보 로딩 중...</p>
            </div>
        );
    }

    if (!view) return null;

    return (
        <div className="flex flex-col px-4 py-4 min-h-[calc(100vh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-120px)]">
            {/* Tower Container */}
            <div className="flex-1 flex flex-col justify-center">
                <div className="relative mx-auto w-full max-w-sm">
                    {/* Tower Floors */}
                    <div className="relative flex flex-col gap-0 border-2 border-white/10 bg-gradient-to-b from-black/40 to-black/60 rounded-2xl overflow-hidden">
                        {view.visibleFloors.map((floor) => {
                            const isCurrent = floor.level === view.currentLevel;
                            const isCompleted = floor.is_claimed || floor.level < view.currentLevel;
                            const isLocked = floor.level > view.currentLevel + 1;
                            const isNext = floor.level === view.currentLevel + 1;

                            return (
                                <div
                                    key={floor.level}
                                    className={clsx(
                                        "relative px-4 py-4 border-b border-white/10 transition-all duration-500",
                                        isCurrent && "bg-emerald-500/10",
                                        isCompleted && "bg-white/5 opacity-70",
                                        isLocked && "opacity-40",
                                        isNext && "bg-amber-500/5"
                                    )}
                                >
                                    {/* Current Floor Glow */}
                                    {isCurrent && (
                                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-emerald-500/20 to-emerald-500/10 animate-pulse" />
                                    )}

                                    <div className="relative z-10 flex items-center justify-between">
                                        {/* Left: Level Info */}
                                        <div className="flex items-center gap-3">
                                            {/* Status Icon */}
                                            <div
                                                className={clsx(
                                                    "w-10 h-10 rounded-full flex items-center justify-center border-2 overflow-hidden",
                                                    isCurrent && "border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.4)]",
                                                    isCompleted && "border-emerald-500/50",
                                                    isNext && "border-amber-400/50",
                                                    isLocked && "border-white/20"
                                                )}
                                            >
                                                <img
                                                    src={isCompleted ? ICON_NODE_CLEARED : isLocked ? ICON_NODE_LOCKED : ICON_NODE_CURRENT}
                                                    alt="Status"
                                                    className={clsx("w-6 h-6 object-contain", isCurrent && "animate-pulse")}
                                                />
                                            </div>

                                            {/* Level Number & Reward */}
                                            <div>
                                                <p
                                                    className={clsx(
                                                        "font-black",
                                                        isCurrent ? "text-emerald-400 text-lg" : "text-white/70 text-sm"
                                                    )}
                                                >
                                                    Lv.{floor.level}
                                                </p>
                                                <p
                                                    className={clsx(
                                                        "text-xs",
                                                        isCurrent ? "text-white font-bold" : "text-white/50"
                                                    )}
                                                >
                                                    {floor.reward_label}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Right: XP (for current floor only) */}
                                        {isCurrent && (
                                            <div className="text-right">
                                                <p className="text-xs text-emerald-400 font-bold uppercase tracking-wider">
                                                    {view.remainingXp} XP 남음
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* XP Progress Bar (Current Floor) */}
                                    {isCurrent && (
                                        <div className="mt-3 relative z-10">
                                            <div className="h-2 bg-black/50 rounded-full overflow-hidden border border-white/10">
                                                <div
                                                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(52,211,153,0.5)]"
                                                    style={{ width: `${view.progressPct}%` }}
                                                />
                                            </div>
                                            <div className="flex justify-between mt-1">
                                                <span className="text-[10px] text-white/40">
                                                    <AnimatedNumber value={view.currentXp} /> XP
                                                </span>
                                                <span className="text-[10px] text-emerald-400 font-bold">
                                                    {view.progressPct}%
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Elevator Indicator */}
                    <div className="absolute -left-6 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1">
                        <div className="w-1 h-8 bg-emerald-500/30 rounded-full" />
                        <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(52,211,153,0.6)] animate-bounce" />
                        <div className="w-1 h-8 bg-white/10 rounded-full" />
                    </div>
                </div>
            </div>

            <Link
                to="/home"
                onClick={handleCtaClick}
                className="mt-4 w-full max-w-sm mx-auto flex items-center justify-center gap-2 py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-black text-base shadow-lg shadow-emerald-500/30 hover:brightness-110 active:scale-[0.98] transition-all"
            >
                <Gamepad2 size={20} />
                게임하고 XP 받기
            </Link>

            {/* Collapsible Missions */}
            <div className="mt-4 w-full max-w-sm mx-auto">
                <button
                    onClick={handleMissionToggle}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white/70 text-sm font-medium"
                >
                    <span>📋 XP 획득 방법</span>
                    {missionsOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>

                {missionsOpen && (
                    <div className="mt-2 rounded-xl border border-white/10 bg-white/5 p-4 space-y-3 animate-fade-in">
                        <div className="flex items-center gap-3">
                            <span className="text-xl">💰</span>
                            <div>
                                <p className="text-sm font-bold text-white">외부 충전 (CC 카지노)</p>
                                <p className="text-xs text-white/50">10만원당 +20 XP</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-xl">🎁</span>
                            <div>
                                <p className="text-sm font-bold text-white">이벤트 참여</p>
                                <p className="text-xs text-white/50">이벤트 참여로 레벨 획득</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LevelTowerPage;
