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
  { id: "DAILY", label: "일일", emoji: "🔥" },
  { id: "WEEKLY", label: "주간", emoji: "🏆" },
  { id: "NEW_USER", label: "신규 유저", emoji: "🎁" },
  { id: "LEVEL", label: "레벨타워", emoji: "🏰" },
];

export default function MissionsPage() {
  const navigate = useNavigate();
  const { playSmallWin } = useSound();
  const [searchParams] = useSearchParams();

  const activeCategory = searchParams.get("cat") || "DAILY";

  const { data, isLoading, error, refetch } = useV2Missions(
    activeCategory === "LEVEL" ? undefined : activeCategory,
  );

  const claimMutation = useV2ClaimMission();

  const setCategory = (cat: string) => {
    navigate(`?cat=${cat}`, { replace: true });
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

  const { missions = [], streak_info } = data || {};

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
                  미션 가이드
                </span>
              </div>
              <h1 className="text-4xl font-black text-white tracking-tighter italic">
                CC<span className="text-emerald-500">미션</span>
              </h1>
            </div>
            <button
              onClick={() => navigate("/game")}
              className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
              title="게임 홈으로 이동"
              aria-label="게임 홈으로 이동"
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
            variant="grid-2"
            className="w-full max-w-md"
          />
        </motion.div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
            <p className="text-zinc-500 text-sm font-bold">
              미션 데이터 동기화 중...
            </p>
          </div>
        ) : error || !data ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-4 bg-white/[0.02] rounded-3xl border border-dashed border-white/10">
            <AlertCircle className="w-12 h-12 text-zinc-600" />
            <p className="text-zinc-400 text-sm">미션을 불러올 수 없습니다.</p>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-sm text-emerald-500 hover:bg-emerald-500/20"
            >
              다시 시도
            </button>
          </div>
        ) : activeCategory === "LEVEL" ? (
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
                <DailyStreakBoard
                  currentStreak={streak_info?.current_streak || 0}
                />
              </motion.div>
            )}

            <div className="grid grid-cols-1 gap-4">
              {missions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-zinc-600 bg-white/[0.02] rounded-3xl border border-dashed border-white/10">
                  <p className="text-sm font-bold">미션이 불가합니다</p>
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
