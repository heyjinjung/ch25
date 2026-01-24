// src/pages/MissionPage.tsx
import React, { useEffect, useState } from "react";
import clsx from "clsx";

import MissionCard from "../components/mission/MissionCard";
import TodayMissionCard from "../components/mission/TodayMissionCard";
import StreakTrack from "../components/mission/StreakTrack";
import { useHaptic } from "../hooks/useHaptic";
import { MissionData, useMissionStore } from "../stores/missionStore";

const TABS = ["DAILY", "WEEKLY", "NEW_USER"] as const;
type MissionTab = (typeof TABS)[number];

const TAB_LABELS: Record<MissionTab, string> = {
  DAILY: "?�일 미션",
  WEEKLY: "주간 미션",
  NEW_USER: "?�규 미션",
};

const MissionPage: React.FC = () => {
  const { missions, fetchMissions, isLoading } = useMissionStore();
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

  const featuredMissions = filteredMissions.filter(m => m.mission.is_featured && !m.progress.is_claimed);
  const normalMissions = filteredMissions.filter(m => !m.mission.is_featured || m.progress.is_claimed);

  const tabIcon = (tab: MissionTab) => {
    switch (tab) {
      case "DAILY":
        return <img src="/assets/icons/fire-dynamic-color.png" className="w-4 h-4 object-contain" alt="" />;
      case "WEEKLY":
        return <img src="/assets/icons/icon_clock.webp" className="w-4 h-4 object-contain" alt="" />;
      case "NEW_USER":
        return <img src="/assets/icons/rocket-dynamic-color.png" className="w-4 h-4 object-contain" alt="" />;
      default:
        return null;
    }
  };

  return (
    <div className="mx-auto w-full max-w-lg pb-24 pt-3">
      {/* Streak Summary Header */}
      {/* Streak Track Component */}
      <StreakTrack />

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
                  "flex-1 rounded-xl px-3 py-2 text-sm font-black transition-all",
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
          <>
            {/* Featured Section */}
            {activeTab === "DAILY" && featuredMissions.map((item) => (
              <TodayMissionCard key={item.mission.id} data={item} />
            ))}

            {/* Normal Missions */}
            {normalMissions.map((item) => <MissionCard key={item.mission.id} data={item} />)}
          </>
        ) : (
          <div className="rounded-[24px] border border-white/10 bg-white/10 p-5 text-center">
            <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-black/40 ring-1 ring-white/10">
              <img src="/assets/icons/rocket-dynamic-color.png" className="w-10 h-10 object-contain" alt="" />
            </div>
            <div className="text-sm font-black text-white/90">No missions</div>
            <div className="mt-1 text-[11px] font-semibold text-white/70">?�재 카테고리???�성 미션???�습?�다.</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MissionPage;

