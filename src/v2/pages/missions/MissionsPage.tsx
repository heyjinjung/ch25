import { useV2Missions, useV2ClaimMission } from "../../hooks/useV2Mission";
import { useSound } from "../../../hooks/useSound";
import { triggerHaptic, triggerNotification } from "../../utils/haptic";
import { DailyStreakBoard } from "../../components/mission/DailyStreakBoard";
import { MissionCard } from "../../components/mission/MissionCard";
import { Loader2, AlertCircle } from "lucide-react";
import "./MissionRedesign.css"; // Keeping it for any specific animations not covered by Tailwind, but relying mostly on Tailwind

export default function MissionsPage() {
  const { playSmallWin } = useSound();
  const { data, isLoading, error, refetch } = useV2Missions();
  const claimMutation = useV2ClaimMission();

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
        <p className="text-zinc-400">미션을 불러올 수 없습니다. 잠시 후 다시 시도해주세요.</p>
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

  // Use CSS variable for safe area offset - standard 100px top, 120px bottom
  return (
    <div className="relative min-h-tg w-full bg-[#121214] overflow-hidden text-white">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px]" />
      </div>

      {/* Main Scrollable Content */}
      <div className="relative h-full overflow-y-auto px-4 pt-[var(--header-offset)] pb-[var(--nav-offset)] space-y-6">
        
        {/* Header Title */}
        <div className="space-y-1 pt-2">
            <h1 className="text-2xl font-black tracking-tight text-white">
                Mission Center
            </h1>
            <p className="text-sm text-zinc-400">
                일일 미션을 완료하고 특별한 보상을 받으세요.
            </p>
        </div>

        {/* 1. Daily Streak Board - Premium Glass Panel */}
        <section>
             <DailyStreakBoard currentStreak={streak_info?.current_streak || 0} />
        </section>

        {/* 2. Mission List - Bento Grid Style */}
        <section className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <span className="w-1 h-5 bg-emerald-500 rounded-full" />
                    Today's Missions
                </h2>
                <span className="text-xs text-zinc-500 font-mono">
                    {missions.filter(m => m.is_completed).length} / {missions.length} Complete
                </span>
            </div>

            <div className="grid grid-cols-1 gap-4 pb-10">
                {missions.length === 0 ? (
                    <div className="py-20 text-center border border-dashed border-zinc-800 rounded-2xl bg-white/[0.02]">
                        <p className="text-zinc-500 text-sm">현재 진행 가능한 미션이 없습니다.</p>
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
      </div>
    </div>
  );
}
