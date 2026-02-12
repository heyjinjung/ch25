import { motion } from "framer-motion";
import { useV2Missions, useV2ClaimMission } from "../../hooks/useV2Mission";
import { useModalVisibility } from "../../hooks/useModalVisibility";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useSound } from "../../../hooks/useSound";
import { triggerHaptic, triggerNotification } from "../../utils/haptic";
import { DailyStreakBoard } from "../../components/mission/DailyStreakBoard";
import V2StreakModalContainer from "../../components/mission/V2StreakModalContainer";
import { MissionCard } from "../../components/mission/MissionCard";
import { Loader2, AlertCircle, Home } from "lucide-react";
import LevelTowerPage from "../game/LevelTowerPage";
import { BackgroundPaths } from "../../components/effects/BackgroundPaths";
import { MorphicNavbar } from "../../components/layout/MorphicNavbar";
import { Meteors } from "../../components/effects/Meteors";
import "./MissionRedesign.css";
import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { useValentineSeolStatus } from "../../hooks/useValentineSeol";
import ValentineSeolBanner from "../../components/event/ValentineSeolBanner";
import SecretCodeInput from "../../components/event/SecretCodeInput";

const FloatingTimer = ({ deadline }: { deadline: string }) => {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = +new Date(deadline) - +new Date();
      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((difference / 1000 / 60) % 60);
        const seconds = Math.floor((difference / 1000) % 60);
        return `${String(days).padStart(2, "0")}일 ${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
      }
      return "00일 00:00:00";
    };

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);
    setTimeLeft(calculateTimeLeft()); // Initial call

    return () => clearInterval(timer);
  }, [deadline]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: 20 }}
      className="fixed bottom-[calc(var(--nav-offset)+1.5rem)] right-4 z-50 pointer-events-none"
    >
      <div className="flex items-center gap-3 px-4 py-2.5 rounded-full bg-black/90 backdrop-blur-xl border border-rose-500/50 shadow-[0_4px_20px_rgba(244,63,94,0.3)] shadow-rose-900/20">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-rose-500 animate-ping opacity-20" />
          <div className="relative w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
        </div>
        <div className="flex flex-col items-start leading-none">
          <span className="text-[9px] font-bold text-rose-400/80 uppercase tracking-widest mb-1">
            혜택 종료까지
          </span>
          <span className="text-sm font-black text-white font-mono tabular-nums tracking-tight">
            {timeLeft}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

type EventDay = "valentine" | "seol_day1" | "seol_day2" | "seol_day3" | null;

function getEventDay(): EventDay {
  const kst = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" }),
  );
  const y = kst.getFullYear();
  const m = String(kst.getMonth() + 1).padStart(2, "0");
  const d = String(kst.getDate()).padStart(2, "0");
  const dateStr = `${y}-${m}-${d}`;

  if (dateStr === "2026-02-14") return "valentine";
  if (dateStr === "2026-02-15") return "seol_day1";
  if (dateStr === "2026-02-16") return "seol_day2";
  if (dateStr === "2026-02-17") return "seol_day3";
  return null;
}

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
  const { attendance_streak_enabled } = useModalVisibility();
  const [isStreakModalOpen, setIsStreakModalOpen] = useState(false);

  const activeCategory = searchParams.get("cat") || "DAILY";

  const { data, isLoading, error, refetch } = useV2Missions(
    activeCategory === "LEVEL" ? undefined : activeCategory,
  );

  const claimMutation = useV2ClaimMission();

  const eventDay = getEventDay();
  const isEventPeriod = eventDay !== null;
  const { data: eventStatus } = useValentineSeolStatus(isEventPeriod);

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
  const claimableDay = streak_info?.claimable_day ?? null;

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

        {/* Valentine & Seol Event (2026-02-14 ~ 2026-02-17) */}
        {isEventPeriod && eventDay && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 space-y-4"
          >
            <ValentineSeolBanner
              eventDay={eventDay}
              streakCurrent={eventStatus?.streak_current ?? 0}
              streakTarget={eventStatus?.streak_target ?? 4}
            />
            <SecretCodeInput
              claimedCodes={eventStatus?.secret_codes_claimed}
            />
          </motion.div>
        )}

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
                className="space-y-3"
              >
                <DailyStreakBoard
                  currentStreak={streak_info?.current_streak || 0}
                />
                <div className="text-xs text-zinc-400">
                  <p>매일 접속 시 출석 인정됩니다. (오전 9시 기준갱신)</p>
                </div>
                {attendance_streak_enabled && streak_info && (
                  <button
                    onClick={() => setIsStreakModalOpen(true)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-2 text-sm font-bold text-white/80 hover:bg-white/10"
                  >
                    {claimableDay ? "오늘 보상 받기" : "보상/규칙 보기"}
                  </button>
                )}
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
        <AnimatePresence>
          {activeCategory === "NEW_USER" && data?.new_user_deadline && (
            <FloatingTimer deadline={data.new_user_deadline} />
          )}
        </AnimatePresence>
        {attendance_streak_enabled && isStreakModalOpen && streak_info && (
          <V2StreakModalContainer
            open={isStreakModalOpen}
            onClose={() => setIsStreakModalOpen(false)}
            currentStreak={streak_info.current_streak ?? 0}
            claimableDay={claimableDay}
          />
        )}
      </div>
    </div>
  );
}
