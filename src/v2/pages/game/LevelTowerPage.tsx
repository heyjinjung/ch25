import React, { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronUp, Gamepad2, ExternalLink, Loader2 } from "lucide-react";
import { cn } from "../../lib/utils";
import { motion } from "framer-motion";

import AnimatedNumber from "../../components/common/AnimatedNumber";
import Button from "../../components/common/Button";
import { useV2LevelXPStatus } from "../../hooks/useV2Mission";
import { triggerHaptic } from "../../utils/haptic";
import "./LevelTowerPage.css";

const NODE_ICON_CLEARED = "/assets/season_pass/icon_node_cleared.webp";
const NODE_ICON_CURRENT = "/assets/season_pass/icon_node_current.webp";
const NODE_ICON_LOCKED = "/assets/season_pass/icon_node_locked.webp";

const LevelTowerPage: React.FC = () => {
  const navigate = useNavigate();
  // Switch to V2 Native Level XP Status (Unified Level System)
  const { data: levelStatus, isLoading, isError, refetch } = useV2LevelXPStatus();
  
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
      triggerHaptic("medium");
      hasTriggeredHaptic.current = true;
    }
  }, []);

  const view = useMemo(() => {
    if (!levelStatus) return null;

    const { current_level, current_xp, next_required_xp, levels } = levelStatus;

    const sortedLevels = [...levels].sort((a, b) => a.level - b.level);
    const currentIdx = sortedLevels.findIndex((l) => l.level === current_level);

    // Show a window of floors around the current level
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
    const endXp = next_required_xp ?? startXp + 1000;
    const progressXp = Math.max(0, current_xp - startXp);
    const totalXp = Math.max(1, endXp - startXp);
    const progressPct = Math.min(100, Math.floor((progressXp / totalXp) * 100));
    const remainingXp = Math.max(0, endXp - current_xp);

    return {
      currentLevel: current_level,
      currentXp: current_xp,
      maxLevel: sortedLevels[sortedLevels.length - 1]?.level ?? 20,
      progressPct,
      remainingXp,
      nextReward: nextLevelData?.reward_label ?? "MAX",
      visibleFloors,
      isMaxLevel: next_required_xp === null,
    };
  }, [levelStatus]);

  const handleMissionToggle = () => {
    triggerHaptic("light");
    setMissionsOpen(!missionsOpen);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-emerald-500/70" />
        <p className="text-white/60 text-sm font-bold">레벨 타워 로딩 중...</p>
      </div>
    );
  }

  if (isError || !levelStatus) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
        <p className="text-white/60 text-sm">레벨 정보를 불러올 수 없습니다.</p>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          다시 시도
        </Button>
      </div>
    );
  }

  if (!view) return null;

  return (
    <div className="relative flex flex-col px-2 py-2 min-h-tg bg-transparent overflow-hidden">
      {/* Aurora Background Effect - Blue Tone (Standalone Support) */}
      <div className="vault-aurora-bg">
        <div className="vault-aurora-blob blob-1" />
        <div className="vault-aurora-blob blob-2" />
        <div className="vault-aurora-blob blob-3" />
      </div>
      {/* Darken aurora one step for Obsidian theme */}
      <div className="level-tower-aurora-dim" />
      <div className="flex-1 flex flex-col justify-center">
        <div className="relative mx-auto w-full max-w-sm">
          {/* Tower Floors */}
          <div className="relative flex flex-col gap-0 border-2 border-white/15 bg-gradient-to-b from-zinc-900/90 to-black/95 rounded-2xl overflow-hidden backdrop-blur-md">
            {view.visibleFloors.map((floor) => {
              const isCurrent = floor.level === view.currentLevel;
              const isCompleted =
                floor.is_claimed || floor.level < view.currentLevel;
              const isLocked = floor.level > view.currentLevel + 1;
              const isNext = floor.level === view.currentLevel + 1;

              const nodeIconSrc =
                isCurrent || isNext
                  ? NODE_ICON_CURRENT
                  : isCompleted
                    ? NODE_ICON_CLEARED
                    : NODE_ICON_LOCKED;

              const nodeIconAlt =
                isCurrent || isNext
                  ? "current"
                  : isCompleted
                    ? "cleared"
                    : "locked";

              return (
                <div
                  key={floor.level}
                  className={cn(
                    "relative px-3 py-3 border-b border-white/5 transition-all duration-500",
                    isCurrent && "bg-emerald-500/10",
                    isCompleted && "bg-white/5 opacity-60",
                    isLocked && "opacity-30",
                    isNext && "bg-amber-500/5",
                  )}
                >
                  <div className="relative z-10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center border-2 overflow-hidden bg-black/40",
                          isCurrent
                            ? "border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.4)]"
                            : "border-white/10",
                        )}
                      >
                        <img
                          src={nodeIconSrc}
                          alt={nodeIconAlt}
                          className={cn(
                            "w-6 h-6 object-contain",
                            isCurrent || isNext ? "opacity-95" : "opacity-80",
                          )}
                          draggable={false}
                        />
                      </div>

                      <div>
                        <p
                          className={cn(
                            "font-black",
                            isCurrent
                              ? "text-emerald-300 text-xl"
                              : "text-white/80 text-base",
                          )}
                        >
                          Lv.{floor.level}
                        </p>
                        <p
                          className={cn(
                            "text-xs font-bold",
                            isCurrent ? "text-white" : "text-white/50",
                          )}
                        >
                          {floor.reward_label}
                        </p>
                      </div>
                    </div>

                    {isCurrent ? (
                      <div className="text-right">
                        <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                          {view.remainingXp.toLocaleString()} XP 남음
                        </p>
                      </div>
                    ) : (
                      !isCompleted && !isLocked && floor.is_unlocked && !floor.auto_grant && (
                        <Button
                          size="sm"
                          onClick={() => {
                            triggerHaptic("rigid");
                            // Explicit manual claim not yet implemented in V2 Level Service
                          }}
                          className="h-8 py-0 px-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-lg"
                        >
                          받기
                        </Button>
                      )
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
                          <AnimatedNumber value={Number(view.currentXp)} /> XP
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
        <Button
          onClick={() => navigate("/game")}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black h-14 text-lg rounded-xl shadow-lg shadow-emerald-900/20"
        >
          <Gamepad2 className="mr-2" /> 게임하기
        </Button>
      </div>

      {/* Collapsible Missions */}
      <div className="mt-4 w-full max-w-sm mx-auto">
        <button
          onClick={handleMissionToggle}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white/70 text-sm font-medium hover:bg-white/10 transition-colors"
        >
          <span>더 많은 XP 받기</span>
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
                <p className="text-sm font-black text-white">
                  이벤트 채널 입장
                </p>
                <p className="text-xs font-semibold text-white/60">
                  최신 공지와 XP 코드를 확인하세요
                </p>
              </div>
            </button>
            <div className="text-center text-zinc-500 text-xs py-2">
              더 많은 미션이 곧 추가됩니다
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LevelTowerPage;
