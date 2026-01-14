// src/pages/MissionPage.tsx
import React, { useEffect, useState } from "react";
import clsx from "clsx";
import { ChevronRight, Target, Trophy } from "lucide-react";

import MissionCard from "../components/mission/MissionCard";
import { useHaptic } from "../hooks/useHaptic";
import { MissionData, useMissionStore } from "../stores/missionStore";

const TABS = ["DAILY", "WEEKLY"] as const;
type MissionTab = (typeof TABS)[number];

const TAB_LABELS: Record<MissionTab, string> = {
  DAILY: "일일 미션",
  WEEKLY: "주간 미션",
};

const MissionPage: React.FC = () => {
  const { missions, fetchMissions, isLoading, streakInfo } = useMissionStore();
  const [activeTab, setActiveTab] = useState<MissionTab>("DAILY");
  const { impact } = useHaptic();

  useEffect(() => {
    fetchMissions();
  }, [fetchMissions]);

  const handleTabChange = (tab: MissionTab) => {
    impact("light");
    setActiveTab(tab);
  };


  const filteredMissions: MissionData[] = missions
    .filter((item) => item.mission.category === activeTab)
    .sort((a, b) => {
      // 1. Sort by completed but unclaimed (priority 1)
      const aClaimable = a.progress.is_completed && !a.progress.is_claimed;
      const bClaimable = b.progress.is_completed && !b.progress.is_claimed;
      if (aClaimable && !bClaimable) return -1;
      if (!aClaimable && bClaimable) return 1;

      // 2. Sort by specific logic_key (Daily Gift always at top if it's DAILY tab)
      if (activeTab === "DAILY") {
        if (a.mission.logic_key === "daily_login_gift" || a.mission.logic_key === "daily_gift") return -1;
        if (b.mission.logic_key === "daily_login_gift" || b.mission.logic_key === "daily_gift") return 1;
      }

      // 3. Sort by claimed status (claimed at the bottom)
      if (a.progress.is_claimed && !b.progress.is_claimed) return 1;
      if (!a.progress.is_claimed && b.progress.is_claimed) return -1;

      return 0;
    });

  const tabIcon = (tab: MissionTab) => {
    switch (tab) {
      case "DAILY":
        return <Target size={14} />;
      case "WEEKLY":
        return <Trophy size={14} />;
      default:
        return null;
    }
  };

  return (
    <div className="mx-auto w-full max-w-lg pb-24">
      {/* Streak Summary Header */}
      {/* Streak Summary Header - Now Clickable */}
      {streakInfo && (
        <button
          onClick={() => {
            impact("light");
            useMissionStore.getState().fetchStreakRules(); // Ensure rules are loaded
            useMissionStore.getState().setStreakModalOpen(true);
          }}
          className="w-full mb-4 rounded-3xl bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/20 p-5 shadow-lg relative overflow-hidden group text-left transition-transform active:scale-[0.98]"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Trophy className="w-16 h-16 text-amber-500" />
          </div>
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                Attendance Streak <ChevronRight size={10} />
              </p>
              <h3 className="text-2xl font-black text-white glow-gold">🔥 {streakInfo.streak_days}일 연속</h3>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">다음 목표</p>
              <p className="text-sm font-bold text-amber-400">Day {streakInfo.streak_days + 1}</p>
            </div>
          </div>
          <progress
            value={Math.min(7, streakInfo.streak_days)}
            max={7}
            className="mt-4 h-1.5 w-full overflow-hidden rounded-full
              [&::-webkit-progress-bar]:bg-white/5
              [&::-webkit-progress-value]:bg-gradient-to-r [&::-webkit-progress-value]:from-amber-600 [&::-webkit-progress-value]:to-amber-400
              [&::-moz-progress-bar]:bg-gradient-to-r [&::-moz-progress-bar]:from-amber-600 [&::-moz-progress-bar]:to-amber-400"
          />
        </button>
      )}

      {/* Compact Tabs (Telegram in-app friendly) */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex flex-1 items-center gap-1 rounded-2xl border border-white/10 bg-white/10 p-1">
          {TABS.map((tab) => {
            const isActive = activeTab === tab;

            return (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                className={clsx(
                  "flex-1 rounded-xl px-3 py-2 text-[11px] font-black transition-all",
                  "active:scale-[0.98]",
                  isActive ? "bg-figma-primary text-white shadow-lg shadow-emerald-900/20" : "text-white/70 hover:text-white"
                )}
              >
                <span className="inline-flex items-center justify-center gap-1.5">
                  {tabIcon(tab)}
                  {TAB_LABELS[tab]}
                </span>
              </button>
            );
          })}
        </div>

        {/* unclaimedCount badge removed per user request */}
      </div>

      {/* Mission List */}
      <div className="space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-10 opacity-60">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-[var(--figma-accent-green)]" />
          </div>
        ) : filteredMissions.length > 0 ? (
          filteredMissions.map((item) => <MissionCard key={item.mission.id} data={item} />)
        ) : (
          <div className="rounded-[24px] border border-white/10 bg-white/10 p-5 text-center">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-black/40 ring-1 ring-white/10">
              <Target className="h-5 w-5 text-white/40" />
            </div>
            <div className="text-sm font-black text-white/90">No missions</div>
            <div className="mt-1 text-[11px] font-semibold text-white/70">현재 카테고리에 활성 미션이 없습니다.</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MissionPage;

