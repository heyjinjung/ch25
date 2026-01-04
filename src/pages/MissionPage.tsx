// src/pages/MissionPage.tsx
import React, { useEffect, useState } from "react";
import clsx from "clsx";
import { Sparkles, Target, Trophy } from "lucide-react";

import MissionCard from "../components/mission/MissionCard";
import { useHaptic } from "../hooks/useHaptic";
import { MissionData, useMissionStore } from "../stores/missionStore";

const TABS = ["DAILY", "WEEKLY", "NEW_USER"] as const;
type MissionTab = (typeof TABS)[number];

const TAB_LABELS: Record<MissionTab, string> = {
  DAILY: "일일 미션",
  WEEKLY: "주간 미션",
  NEW_USER: "신규 유저",
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

  const filteredMissions: MissionData[] = missions.filter((item) => item.mission.category === activeTab);
  const unclaimedCount = missions.filter((m) => m.progress.is_completed && !m.progress.is_claimed).length;

  const tabIcon = (tab: MissionTab) => {
    switch (tab) {
      case "DAILY":
        return <Target size={14} />;
      case "WEEKLY":
        return <Trophy size={14} />;
      case "NEW_USER":
        return <Sparkles size={14} />;
      default:
        return null;
    }
  };

  return (
    <div className="mx-auto w-full max-w-lg pb-24">
      {/* Compact Tabs (Telegram in-app friendly) */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex flex-1 items-center gap-1 rounded-2xl border border-white/10 bg-white/10 p-1">
          {TABS.map((tab) => {
            const isActive = activeTab === tab;
            const hasClaimable = missions.some(
              (m) => m.mission.category === tab && m.progress.is_completed && !m.progress.is_claimed
            );

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
                  {hasClaimable && <span className="h-1.5 w-1.5 rounded-full bg-[var(--figma-accent-green)]" />}
                </span>
              </button>
            );
          })}
        </div>

        {unclaimedCount > 0 && (
          <div className="shrink-0 rounded-full border border-figma-accent bg-figma-accent/10 px-3 py-2 text-[10px] font-black text-figma-accent">
            {unclaimedCount} CLAIM
          </div>
        )}
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

