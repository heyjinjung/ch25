import React, { useEffect, useMemo, useState, useRef } from "react";
// Link removed
import { ChevronDown, ChevronUp, Gamepad2, Coins, ExternalLink } from "lucide-react";
import clsx from "clsx";
import { motion } from "framer-motion";

import AnimatedNumber from "../../components/common/AnimatedNumber";
import Button from "../../components/common/Button";

// Mock haptics
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const tryHaptic = (_pattern: any) => {}; 

// Mock Hook - Replace with actual V2 hook
const useSeasonPassStatus = () => {
    // TODO: Implement actual data fetching via React Query
    return {
        data: {
            current_level: 5,
            current_xp: 4500,
            max_level: 50,
            levels: Array.from({ length: 10 }, (_, i) => ({
                level: i + 1,
                required_xp: (i + 1) * 1000,
                reward_label: `${(i + 1) * 10} Point`,
                is_claimed: i < 4
            }))
        },
        isPending: false
    }
}

const LevelTowerPage: React.FC = () => {
  const season = useSeasonPassStatus();
  const [missionsOpen, setMissionsOpen] = useState(false);
  const hasTriggeredHaptic = useRef(false);

  const openExternal = (url: string) => {
    const tg = (window as any)?.Telegram?.WebApp;
    if (
      typeof tg?.openTelegramLink === "function" &&
      url.startsWith("https://t.me")
    ) {
      tg.openTelegramLink(url);
      return;
    }
    if (typeof tg?.openLink === "function") {
      tg.openLink(url);
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  useEffect(() => {
    if (!hasTriggeredHaptic.current) {
      tryHaptic(15); 
      hasTriggeredHaptic.current = true;
    }
  }, []);

  const view = useMemo(() => {
    if (!season.data) return null;

    const { current_level, current_xp, levels, max_level } = season.data;

    const sortedLevels = [...levels].sort((a, b) => a.level - b.level);
    const currentIdx = sortedLevels.findIndex((l) => l.level === current_level);

    const startIdx = Math.max(0, currentIdx - 1);
    const endIdx = Math.min(sortedLevels.length, currentIdx + 3);
    const visibleFloors = sortedLevels.slice(startIdx, endIdx).reverse();

    const currentLevelData = sortedLevels.find(
      (l) => l.level === current_level,
    );
    const nextLevelData = sortedLevels.find(
      (l) => l.level === current_level + 1,
    );

    const startXp = currentLevelData?.required_xp ?? 0;
    const endXp = nextLevelData?.required_xp ?? startXp + 1000;
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
    tryHaptic(10);
    setMissionsOpen(!missionsOpen);
  };

  if (season.isPending) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500/70 border-t-transparent" />
        <p className="text-white/60 text-sm">Loading Level Tower...</p>
      </div>
    );
  }

  if (!view) return null;

  return (
    <div className="flex flex-col px-4 py-4 min-h-[calc(100vh-120px)] bg-[#0A0A0A]">
      <div className="flex-1 flex flex-col justify-center">
        <div className="relative mx-auto w-full max-w-sm">
          {/* Tower Floors */}
          <div className="relative flex flex-col gap-0 border-2 border-white/15 bg-gradient-to-b from-zinc-900/90 to-black/95 rounded-2xl overflow-hidden backdrop-blur-md">
            {view.visibleFloors.map((floor) => {
              const isCurrent = floor.level === view.currentLevel;
              const isCompleted = floor.is_claimed || floor.level < view.currentLevel;
              const isLocked = floor.level > view.currentLevel + 1;
              const isNext = floor.level === view.currentLevel + 1;

              return (
                <div
                  key={floor.level}
                  className={clsx(
                    "relative px-4 py-4 border-b border-white/5 transition-all duration-500",
                    isCurrent && "bg-emerald-500/10",
                    isCompleted && "bg-white/5 opacity-60",
                    isLocked && "opacity-30",
                    isNext && "bg-amber-500/5",
                  )}
                >
                  <div className="relative z-10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={clsx(
                          "w-10 h-10 rounded-full flex items-center justify-center border-2 overflow-hidden bg-black/40",
                          isCurrent ? "border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.4)]" : "border-white/10"
                        )}
                      >
                         <Coins className={clsx("w-5 h-5", isCurrent ? "text-emerald-400" : "text-zinc-500")} />
                      </div>

                      <div>
                        <p className={clsx("font-black", isCurrent ? "text-emerald-300 text-xl" : "text-white/80 text-base")}>
                          Lv.{floor.level}
                        </p>
                        <p className={clsx("text-xs font-bold", isCurrent ? "text-white" : "text-white/50")}>
                          {floor.reward_label}
                        </p>
                      </div>
                    </div>

                    {isCurrent && (
                      <div className="text-right">
                        <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                          {view.remainingXp.toLocaleString()} XP Left
                        </p>
                      </div>
                    )}
                  </div>

                  {isCurrent && (
                    <div className="mt-3 relative z-10">
                      <div className="h-1.5 bg-black/50 rounded-full overflow-hidden border border-white/10">
                        <motion.div 
                           initial={{ width: 0 }}
                           animate={{ width: `${view.progressPct}%` }}
                           className="h-full bg-emerald-500 rounded-full"
                        />
                      </div>
                      <div className="flex justify-between mt-1.5">
                        <span className="text-[10px] text-white/40 font-mono">
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
        </div>
      </div>

      <div className="mt-8 w-full max-w-sm mx-auto">
         <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black h-14 text-lg rounded-xl shadow-lg shadow-emerald-900/20">
             <Gamepad2 className="mr-2" /> Play Games
         </Button>
      </div>
      
       {/* Collapsible Missions */}
      <div className="mt-4 w-full max-w-sm mx-auto">
        <button
          onClick={handleMissionToggle}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white/70 text-sm font-medium hover:bg-white/10 transition-colors"
        >
          <span>Get More XP</span>
          {missionsOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>

        {missionsOpen && (
          <div className="mt-2 rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
             <button
              onClick={() => openExternal("https://t.me/+LksI3XlSjLlhZmE0")}
              className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-white/5 active:bg-white/10"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-black/30">
                <ExternalLink className="w-5 h-5 text-zinc-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-white">Join Event Channel</p>
                <p className="text-xs font-semibold text-white/60">
                   Get latest news & XP codes
                </p>
              </div>
            </button>
             <div className="text-center text-zinc-500 text-xs py-2">
                 More missions coming soon
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LevelTowerPage;
