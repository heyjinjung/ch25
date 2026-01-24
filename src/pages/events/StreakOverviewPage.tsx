import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Loader2 } from "lucide-react";
import { fetchStreakRules, claimStreakReward } from "../../api/streakApi";
import { useMissionStore } from "../../stores/missionStore";
import StreakCard from "../../components/streak/StreakCard";
import StreakModal from "../../components/streak/StreakModal";
import { useToast } from "../../components/common/ToastProvider";
import { tryHaptic } from "../../utils/haptics";

const StreakOverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  // Store data
  const { streakInfo, fetchMissions } = useMissionStore();

  // API Data
  const { data: rules, isLoading } = useQuery({
    queryKey: ["streak-rules"],
    queryFn: fetchStreakRules,
    staleTime: 60000,
  });
  const rulesList = Array.isArray(rules) ? rules : [];

  const [isModalOpen, setIsModalOpen] = useState(false);

  // ensure 7 days map
  const days = Array.from({ length: 7 }, (_, i) => i + 1);

  const handleClaim = async () => {
    try {
      const res = await claimStreakReward();
      if (res.success) {
        addToast("보상을 획득했습니다!", "success");
        queryClient.invalidateQueries({ queryKey: ["streak-rules"] });
        fetchMissions(); // Refresh store
        return true;
      }
    } catch {
      addToast("보상 획득 실패", "error");
    }
    return false;
  };

  if (isLoading)
    return (
      <div className="flex justify-center items-center h-screen bg-black">
        <Loader2 className="animate-spin text-white w-8 h-8" />
      </div>
    );

  const currentStreak = streakInfo?.streak_days ?? 0;
  const claimableDay = streakInfo?.claimable_day ?? null;

  return (
    <div className="min-h-screen bg-black pb-20">
      {/* Simple Header */}
      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-white/5 px-4 h-14 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 text-white/50 hover:text-white transition-colors"
          aria-label="뒤로가기"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-lg font-bold text-white">스트릭 모아보기</h1>
      </div>

      <div className="p-4 space-y-6">
        {/* Summary Card */}
        <div className="p-8 rounded-[2rem] bg-gradient-to-br from-zinc-900 to-black border border-white/10 relative overflow-hidden flex flex-col items-center gap-2 shadow-2xl">
          <span className="relative z-10 text-xs font-black text-white/30 uppercase tracking-[0.2em]">
            Current Streak
          </span>
          <div className="relative z-10 text-7xl font-black text-white tabular-nums tracking-tighter drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]">
            {currentStreak}
          </div>
          <span className="relative z-10 text-sm font-bold text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
            Day Active
          </span>
        </div>

        {/* Horizontal Scroll */}
        <div>
          <h2 className="text-sm font-black text-white/50 mb-4 px-1 uppercase tracking-wider">
            Rewards Map
          </h2>
          <div className="flex gap-4 overflow-x-auto pb-8 snap-x snap-mandatory -mx-4 px-4 scrollbar-hide">
            {days.map((day) => {
              const rule = rulesList.find((r) => r.day === day);
              return (
                <StreakCard
                  key={day}
                  day={day}
                  rule={rule}
                  currentStreak={currentStreak}
                  claimableDay={claimableDay}
                  onClick={() => {
                    tryHaptic(10);
                    setIsModalOpen(true);
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>

      <StreakModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onClaim={handleClaim}
        currentStreak={currentStreak}
        claimableDay={claimableDay}
        rules={rulesList}
      />
    </div>
  );
};

export default StreakOverviewPage;
