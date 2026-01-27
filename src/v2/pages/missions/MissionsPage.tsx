import { useV2Missions, useV2ClaimMission } from "../../hooks/useV2Mission";
import { cn } from "../../lib/utils";
import { useSearchParams } from "react-router-dom";
import { useSound } from "../../../hooks/useSound";
import { triggerHaptic, triggerNotification } from "../../utils/haptic";
import { DailyStreakBoard } from "../../components/mission/DailyStreakBoard";
import { MissionCard } from "../../components/mission/MissionCard";
import { Loader2, AlertCircle } from "lucide-react";
import LevelTowerPage from "../game/LevelTowerPage";
import "./MissionRedesign.css"; 
// Keeping it for any specific animations not covered by Tailwind, but relying mostly on Tailwind

export default function MissionsPage() {
  const { playSmallWin } = useSound();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Categories: DAILY, WEEKLY, NEW_USER, LEVEL
  const activeCategory = searchParams.get("cat") || "DAILY";
  
  const { data, isLoading, error, refetch } = useV2Missions(
    activeCategory === "LEVEL" ? undefined : activeCategory
  );
  
  const claimMutation = useV2ClaimMission();

  const setCategory = (cat: string) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("cat", cat);
    setSearchParams(nextParams, { replace: true });
    triggerHaptic("medium");
  };

  const handleClaim = async (missionId: string) => {
    try {
      triggerHaptic("medium");
      await claimMutation.mutateAsync(missionId);
      triggerNotification("success");
      playSmallWin();
      refetch();
    } catch {
      triggerNotification("error");
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-tg items-center justify-center bg-[#121214]">
        <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-tg flex-col items-center justify-center bg-[#121214] px-6 text-center gap-4">
        <AlertCircle className="w-12 h-12 text-zinc-600" />
        <p className="text-zinc-400">
          미션을 불러올 수 없습니다. 잠시 후 다시 시도해주세요.
        </p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-white/5 rounded-lg text-sm text-white hover:bg-white/10"
        >
          다시 시도
        </button>
      </div>
    );
  }

  const { missions = [], streak_info } = data;

  return (
    <div className="relative min-h-tg w-full bg-[#121214] overflow-hidden text-white font-sans">
      {/* Aurora Background Effect */}
      <div className="fixed inset-0 pointer-events-none opacity-40">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/10 blur-[120px] rounded-full" />
      </div>

      {/* Main Content */}
      <div className="relative h-full flex flex-col pt-[var(--header-offset)] pb-[var(--nav-offset)]">
        {/* Sticky Header Hub */}
        <div className="px-5 pt-4 pb-2 space-y-4">
          <div className="space-y-0.5">
            <h1 className="text-2xl font-black tracking-tight bg-gradient-to-br from-white to-white/60 bg-clip-text text-transparent">
              Mission Hub
            </h1>
            <p className="text-[13px] text-zinc-500 font-medium">
              Join challenges and earn rewards every day
            </p>
          </div>

          {/* 4-Pill Category Navigation */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            {[
              { id: "DAILY", label: "일일", emoji: "📅" },
              { id: "WEEKLY", label: "주간", emoji: "🔥" },
              { id: "NEW_USER", label: "신규", emoji: "🎁" },
              { id: "LEVEL", label: "레벨", emoji: "🏆" },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={cn(
                  "flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[13px] font-bold transition-all duration-300 border backdrop-blur-md",
                  activeCategory === cat.id
                    ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/20"
                    : "bg-white/[0.03] border-white/5 text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.05]"
                )}
              >
                <span className="text-sm opacity-80">{cat.emoji}</span>
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Area */}
        <div className="flex-1 overflow-y-auto px-5 pt-2 pb-10 space-y-6 custom-scrollbar">
          {activeCategory === "LEVEL" ? (
            <LevelTowerPage />
          ) : (
            <>
              {/* Daily Streak only for DAILY category */}
              {activeCategory === "DAILY" && (
                <section className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <DailyStreakBoard
                    currentStreak={streak_info?.current_streak || 0}
                  />
                </section>
              )}

              {/* Mission List */}
              <section className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-[15px] font-bold text-white flex items-center gap-2">
                    <div className="w-1 h-4 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    {activeCategory === "DAILY" ? "일일 미션" : 
                     activeCategory === "WEEKLY" ? "주간 미션" : "신규 환영 미션"}
                  </h2>
                  <span className="text-[11px] font-bold text-zinc-500 bg-zinc-800/50 px-2 py-0.5 rounded-md border border-white/5">
                    {missions.filter((m) => m.is_completed).length} / {missions.length}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {missions.length === 0 ? (
                    <div className="py-16 text-center border border-dashed border-white/5 rounded-[24px] bg-white/[0.01] backdrop-blur-sm">
                      <p className="text-zinc-600 text-[13px] font-medium">
                        진행 가능한 미션이 없습니다.
                      </p>
                    </div>
                  ) : (
                    missions.map((mission) => (
                      <MissionCard
                        key={mission.id}
                        mission={mission}
                        onClaim={handleClaim}
                        isClaiming={claimMutation.isPending}
                      />
                    ))
                  )}
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
