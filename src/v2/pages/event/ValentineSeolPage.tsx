import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Sparkles } from "lucide-react";
import { BackgroundPaths } from "../../components/effects/BackgroundPaths";
import ValentineSeolBanner from "../../components/event/ValentineSeolBanner";
import SecretCodeInput from "../../components/event/SecretCodeInput";
import { useValentineSeolStatus } from "../../hooks/useValentineSeol";
// import { KOREAN } from "./KoreanConstants"; // Removed

// ============================================================================
// Date helpers (KST)
// ============================================================================

type EventDay = "valentine" | "seol_day1" | "seol_day2" | "seol_day3";

interface EventDayInfo {
  day: EventDay;
}

function getEventDayInfo(): EventDayInfo | null {
  // KST 기준 + 운영일(오전 9시 리셋) 적용
  const kstNow = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" }),
  );
  const operational = new Date(kstNow);
  if (operational.getHours() < 9) {
    operational.setDate(operational.getDate() - 1);
  }

  const y = operational.getFullYear();
  const m = String(operational.getMonth() + 1).padStart(2, "0");
  const d = String(operational.getDate()).padStart(2, "0");
  const dateStr = `${y}-${m}-${d}`;

  // 실제 이벤트 기간 (2/14-17, KST 운영일 기준)
  if (dateStr === "2026-02-14") return { day: "valentine" };
  if (dateStr === "2026-02-15") return { day: "seol_day1" };
  if (dateStr === "2026-02-16") return { day: "seol_day2" };
  if (dateStr === "2026-02-17") return { day: "seol_day3" };
  return null;
}

// ============================================================================
// Reward label helpers
// ============================================================================

/** Bundle ID → 한국어 보상 설명 */
const BUNDLE_LABELS: Record<number, string> = {
  3: "룰렛1장+주사위1장+복권 1장",
  21: "복권1장+주사위3장",
  22: "2만P + 다이아카1장",
  23: "1만P + 룰렛 2장",
  25: "2만P + 골드키 1장",
};

/** reward_type 코드 → 한국어 단위명 */
const TICKET_LABELS: Record<string, string> = {
  ROULETTE_TICKET: "🎰룰렛",
  DICE_TICKET: "🎲주사위",
  LOTTERY_TICKET: "🎟️복권",
  GOLD_KEY_TICKET: "🔑골드키",
  DIAMOND_TICKET: "💎다이아키",
  TICKET_ROULETTE: "🎰룰렛",
  TICKET_DICE: "🎲주사위",
  TICKET_LOTTERY: "🎟️복권",
  TICKET_BUNDLE: "게임티켓번들",
  POINT: "💰포인트",
  CC_POINT: "💰포인트",
};

function getRewardLabel(
  rewardType: string | null,
  rewardAmount: number | null,
): string {
  if (!rewardType || !rewardAmount) return "";
  if (rewardType === "BUNDLE" || rewardType === "TICKET_BUNDLE") {
    return BUNDLE_LABELS[rewardAmount] ?? `번들 #${rewardAmount}`;
  }
  const label = TICKET_LABELS[rewardType];
  if (label) return `${label} ${rewardAmount.toLocaleString()}\uC7A5`;
  if (rewardType === "POINT" || rewardType === "CC_POINT")
    return `${rewardAmount.toLocaleString()}P`;
  return `${rewardType} × ${rewardAmount}`;
}

/** action_type → 유저가 해야 할 행동 설명 */
function getTaskDescription(
  logicKey: string | null,
  _actionType: string | null,
  targetValue: number,
): string {
  if (logicKey === "EVENT_VALENTINE_2026")
    return "어플게임 {n}판 플레이하세요".replace("{n}", String(targetValue));
  if (logicKey === "EVENT_SEOL_DAY2_2026")
    return "어플게임 {n}판 플레이하세요".replace("{n}", String(targetValue));
  if (logicKey === "EVENT_SEOL_DAY1_2026")
    return "오늘 {n}원 이상 입금하세요".replace(
      "{n}",
      targetValue.toLocaleString(),
    );
  if (logicKey === "EVENT_SEOL_DAY3_2026")
    return "오늘 {n}원 이상 입금하세요".replace(
      "{n}",
      targetValue.toLocaleString(),
    );
  if (logicKey === "EVENT_SEOL_STREAK_2026")
    return "4일간 모든 이벤트 미션을 완료하세요";
  return "";
}

function getMissionTitle(
  logicKey: string | null,
  originalTitle: string,
): string {
  if (logicKey === "EVENT_VALENTINE_2026") return "💝발렌타인럭키박스";
  if (logicKey === "EVENT_SEOL_DAY1_2026")
    return "🧧설날세뱃돈 1일 — 10만원 입금";
  if (logicKey === "EVENT_SEOL_DAY2_2026") return "🎮설날세뱃돈 2일 — 게임 5판";
  if (logicKey === "EVENT_SEOL_DAY3_2026")
    return "💎설날세뱃돈 3일 — 30만원 입금";
  if (logicKey === "EVENT_SEOL_STREAK_2026") return "🏆4일 연속 달성 보너스";
  return originalTitle;
}

// ============================================================================
// Animation Variants
// ============================================================================

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 25,
    },
  },
  hover: {
    scale: 1.02,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    transition: { duration: 0.2 },
  },
  tap: { scale: 0.98 },
};

const badgeVariants = {
  initial: { scale: 1, opacity: 0.8 },
  animate: {
    scale: [1, 1.1, 1],
    opacity: [0.8, 1, 0.8],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

// ============================================================================
// Mission Card (inline)
// ============================================================================

interface MissionInfo {
  mission_id: number;
  title: string;
  logic_key: string | null;
  action_type?: string | null;
  target_value: number;
  current_value: number;
  is_completed: boolean;
  is_claimed: boolean;
  reward_type: string | null;
  reward_amount: number | null;
}

function EventMissionCard({ mission }: { mission: MissionInfo }) {
  const progress = Math.min(
    (mission.current_value / mission.target_value) * 100,
    100,
  );

  const rewardLabel = getRewardLabel(
    mission.reward_type,
    mission.reward_amount,
  );
  const taskDesc = getTaskDescription(
    mission.logic_key,
    mission.action_type ?? null,
    mission.target_value,
  );
  const title = getMissionTitle(mission.logic_key, mission.title);

  return (
    <motion.div
      variants={cardVariants}
      whileHover="hover"
      whileTap="tap"
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-5 group cursor-default"
    >
      {/* Magic UI Shimmer Effect */}
      <motion.div
        className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12 pointer-events-none"
        initial={{ x: "-150%" }}
        animate={{ x: "250%" }}
        transition={{
          repeat: Infinity,
          duration: 3,
          ease: "linear",
          repeatDelay: Math.random() * 2 + 1, // Random delay for natural feel
        }}
      />

      <div className="flex items-start justify-between mb-4 relative z-10">
        <div className="flex-1">
          <h4 className="text-[15px] leading-snug font-bold text-white group-hover:text-amber-200 transition-colors">
            {title}
          </h4>
          {(taskDesc || rewardLabel) && (
            <div className="mt-2 space-y-1.5">
              {taskDesc && (
                <p className="text-[12px] leading-relaxed text-zinc-400">
                  <span className="font-semibold text-zinc-500">미션</span>
                  <span className="mx-1 text-zinc-600">·</span>
                  {taskDesc}
                </p>
              )}
              {rewardLabel && (
                <p className="text-[12px] leading-relaxed text-emerald-400/80">
                  <span className="font-semibold text-zinc-500">보상</span>
                  <span className="mx-1 text-zinc-600">·</span>
                  {rewardLabel}
                </p>
              )}
            </div>
          )}
        </div>
        <div className="ml-3">
          {mission.is_completed ? (
            <motion.span
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-[10px] font-black px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 inline-block"
            >
              {mission.is_claimed ? "수령 완료" : "완료 ✓"}
            </motion.span>
          ) : (
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/5 text-zinc-500 border border-white/10">
              진행중
            </span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden relative z-10">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
          className={`h-full rounded-full relative overflow-hidden ${
            mission.is_completed
              ? "bg-emerald-500"
              : "bg-gradient-to-r from-purple-500 to-rose-500"
          }`}
        >
          {/* Progress bar glint */}
          <motion.div
            className="absolute inset-0 bg-white/30 w-full"
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
          />
        </motion.div>
      </div>
      <div className="flex items-center justify-between mt-2 relative z-10">
        <span className="text-[11px] font-medium text-zinc-500">
          {mission.is_completed ? "완료" : "진행"}
        </span>
        <span className="text-[11px] font-mono text-zinc-500">
          {mission.current_value} / {mission.target_value}
        </span>
      </div>
    </motion.div>
  );
}

// ============================================================================
// Main Page
// ============================================================================

export default function ValentineSeolPage() {
  const navigate = useNavigate();
  const dayInfo = getEventDayInfo();
  const isActive = dayInfo !== null;
  const { data: eventStatus, isLoading } = useValentineSeolStatus(isActive);

  return (
    <div className="relative min-h-tg bg-[#09090B] overflow-x-hidden pt-[var(--header-offset)] pb-[var(--nav-offset)]">
      <BackgroundPaths count={20} />

      <div className="relative z-10 px-4 pb-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <button
            onClick={() => navigate("/event")}
            className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft size={18} />
            <span className="text-xs font-bold">이벤트 목록</span>
          </button>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 mb-1">
              <motion.div
                variants={badgeVariants}
                initial="initial"
                animate="animate"
                className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]"
              />
            </div>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tighter">
            발렌타인/설날이벤트
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            02.14 — 02.17 | 4일 연속 달성시 특별 보너스!
          </p>
        </motion.div>

        {/* Not Active */}
        {!isActive && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center gap-4 bg-white/[0.02] rounded-3xl border border-dashed border-white/10"
          >
            <Sparkles size={40} className="text-zinc-600" />
            <div>
              <p className="text-lg font-bold text-zinc-400">이벤트 준비 중</p>
              <p className="text-sm text-zinc-600 mt-1">
                2026년 2월 14일 오전 9시부터 참여할 수 있습니다!
              </p>
            </div>
          </motion.div>
        )}

        {/* Active Content */}
        {isActive && dayInfo && (
          <div className="space-y-5">
            {/* Banner */}
            <ValentineSeolBanner
              eventDay={dayInfo.day}
              streakCurrent={eventStatus?.streak_current ?? 0}
              streakTarget={eventStatus?.streak_target ?? 4}
            />

            {/* Secret Code Input */}
            <SecretCodeInput claimedCodes={eventStatus?.secret_codes_claimed} />

            {/* Event Missions */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={16} className="text-amber-400" />
                <h2 className="text-base font-black text-white">이벤트 미션</h2>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-4 border-white/10 border-t-rose-500 rounded-full animate-spin" />
                </div>
              ) : eventStatus?.missions && eventStatus.missions.length > 0 ? (
                <motion.div className="space-y-3">
                  <AnimatePresence>
                    {eventStatus.missions.map((mission) => (
                      <EventMissionCard
                        key={mission.mission_id}
                        mission={mission}
                      />
                    ))}
                  </AnimatePresence>
                </motion.div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-zinc-600 bg-white/[0.02] rounded-3xl border border-dashed border-white/10">
                  <p className="text-sm font-bold">
                    미션 데이터를 불러오는 중...
                  </p>
                </div>
              )}
            </motion.div>

            {/* Streak Bonus Info */}
            {eventStatus?.streak_completed && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center"
              >
                <p className="text-lg font-black text-emerald-400">
                  🎊 4일 연속 달성 완료!
                </p>
                <p className="text-xs text-emerald-400/70 mt-1">
                  특별 보너스 보상이 지급되었습니다.
                </p>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
