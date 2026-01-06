// src/pages/EventDashboardPage.tsx
import React from "react";
import { Link } from "react-router-dom";
import { useHaptic } from "../hooks/useHaptic";
import { useMissionStore } from "../stores/missionStore";
import { useSeasonPassStatus } from "../hooks/useSeasonPass";
import { AlertCircle } from "lucide-react";

const EventDashboardPage: React.FC = () => {
  const { impact } = useHaptic();
  const { hasUnclaimed: missionsUnclaimed } = useMissionStore();
  const { data: seasonData } = useSeasonPassStatus();

  const seasonUnclaimed = React.useMemo(() => {
    if (!seasonData?.levels) return false;
    return seasonData.levels.some((l) => l.is_unlocked && !l.is_claimed);
  }, [seasonData]);
  const cardClass =
    "group relative block w-full overflow-hidden rounded-[2rem] border border-white/10 bg-black transition-all duration-300 active:scale-[0.98] hover:-translate-y-1 hover:border-figma-accent/20";
  const cardImageClass =
    "absolute inset-0 z-0 h-full w-full object-cover object-left-top transition-transform duration-500 group-hover:scale-[1.03]";
  const cardContentClass =
    "relative z-10 flex h-56 items-end p-5";
  const cardPanelClass =
    "w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-4 shadow-sm";

  const handleCardClick = () => {
    impact("medium");
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-black relative overflow-hidden flex flex-col">
      {/* Background Effects Removed per user request */}

      <div className="relative z-10 w-full px-2 pt-4 pb-8 max-w-xl mx-auto flex-1 flex flex-col">
        {/* Dashboard Grid */}
        <div className="space-y-6">
          {/* Level Tower Section */}
          <Link
            to="/season-pass"
            onClick={handleCardClick}
            className={cardClass}
          >
            {/* Background Image */}
            <img
              src="/assets/welcome/levelup_v3.png"
              className={cardImageClass}
              alt="Level Tower"
            />

            <div className={cardContentClass}>
              <div className={cardPanelClass}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-figma-accent animate-pulse" />
                    <div className="truncate text-base font-black text-white tracking-wide">시즌패스</div>
                    {seasonUnclaimed && <AlertCircle className="w-4 h-4 text-red-500 animate-pulse" />}
                  </div>
                  <div className="shrink-0 inline-flex items-center justify-center rounded-xl bg-figma-accent/10 px-4 py-2.5 text-sm font-black text-figma-accent ring-1 ring-inset ring-figma-accent/20">
                    보상 받기
                  </div>
                </div>
              </div>
            </div>
          </Link>

          {/* Daily Missions Section */}
          <Link
            to="/missions"
            onClick={handleCardClick}
            className={cardClass}
          >
            {/* Background Image */}
            <img
              src="/assets/welcome/mission_v3.png"
              className={cardImageClass}
              alt="Daily Missions"
            />

            <div className={cardContentClass}>
              <div className={cardPanelClass}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <div className="truncate text-base font-black text-white tracking-wide">미션</div>
                    {missionsUnclaimed && <AlertCircle className="w-4 h-4 text-red-500 animate-pulse" />}
                  </div>
                  <div className="shrink-0 inline-flex items-center justify-center rounded-xl bg-emerald-500/15 px-4 py-2.5 text-sm font-black text-emerald-400 ring-1 ring-inset ring-emerald-500/20">
                    미션 진행
                  </div>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default EventDashboardPage;
