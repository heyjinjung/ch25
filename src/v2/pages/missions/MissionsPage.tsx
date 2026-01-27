import { motion } from "framer-motion";
import { useV2Missions, useV2ClaimMission } from "../../hooks/useV2Mission";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useSound } from "../../../hooks/useSound";
import { triggerHaptic, triggerNotification } from "../../utils/haptic";
import { DailyStreakBoard } from "../../components/mission/DailyStreakBoard";
import { MissionCard } from "../../components/mission/MissionCard";
import { Loader2, AlertCircle, Home } from "lucide-react";
import LevelTowerPage from "../game/LevelTowerPage";
import { BackgroundPaths } from "../../components/effects/BackgroundPaths";
import { MorphicNavbar } from "../../components/layout/MorphicNavbar";
import { Meteors } from "../../components/effects/Meteors";
import "./MissionRedesign.css"; 

const CATEGORIES = [
  { id: "DAILY", label: "Daily", emoji: "🔥" },
  { id: "WEEKLY", label: "Weekly", emoji: "🏆" },
  { id: "NEW_USER", label: "New User", emoji: "🎁" },
  { id: "LEVEL", label: "Tower", emoji: "🏰" },
];

export default function MissionsPage() {
  const navigate = useNavigate();
  const { playSmallWin } = useSound();
  const [searchParams, setSearchParams] = useSearchParams();
  
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
      <div className="flex h-tg items-center justify-center bg-[#09090B]">
        <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-tg flex-col items-center justify-center bg-[#09090B] px-6 text-center gap-4">
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
    <div className="relative min-h-tg bg-[#09090B] overflow-x-hidden pt-[var(--header-offset)] pb-[var(--nav-offset)]">
      <BackgroundPaths count={25} />

      <div className="relative z-10 px-4 pb-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                <span className="text-[10px] font-black text-emerald-500/80 uppercase tracking-[0.2em]">
                  Agent Operations
                </span>
              </div>
              <h1 className="text-4xl font-black text-white tracking-tighter italic">
                MISSION <span className="text-emerald-500">HUB</span>
              </h1>
            </div>
            <button 
              onClick={() => navigate("/game")}
              className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
            >
              <Home size={24} />
            </button>
          </div>
        </motion.div>

        <motion.div
           initial={{ opacity: 0, scale: 0.95 }}
           animate={{ opacity: 1, scale: 1 }}
           className="mb-8"
        >
          <MorphicNavbar
            items={CATEGORIES}
            activeId={activeCategory}
            onChange={(id) => setCategory(id as string)}
            className="w-full max-w-md"
          />
        </motion.div>

        {activeCategory === "LEVEL" ? (
          <motion.div
            key="tower"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="relative"
          >
            <div className="absolute inset-x-0 -top-20 z-0 opacity-40">
                <Meteors number={15} />
            </div>
            <div className="relative z-10">
                <LevelTowerPage />
            </div>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {activeCategory === "DAILY" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <DailyStreakBoard currentStreak={streak_info?.current_streak || 0} />
              </motion.div>
            )}

            <div className="grid grid-cols-1 gap-4">
              {missions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-zinc-600 bg-white/[0.02] rounded-3xl border border-dashed border-white/10">
                  <p className="text-sm font-bold">No missions available</p>
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
          </div>
        )}
      </div>
    </div>
  );
}
