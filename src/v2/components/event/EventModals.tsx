import React from "react";
import {
  X,
  CheckCircle2,
  Clock,
  Gift,
  Users,
  CreditCard,
  Sparkles,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { MatrixText } from "../ui/MatrixText";
import { Button } from "../ui/button";
import {
  useV2Missions,
  useV2StreakRules,
  useV2ClaimStreakReward,
} from "../../hooks/useV2Mission";
import { tryHaptic } from "../../utils/haptics";
import type { V2StreakRule, MissionListResponse } from "../../api/missionApi";

interface AttendanceReward {
  label: string;
  icon: string;
}

interface EventModalsProps {
  selectedId: string | null;
  onClose: () => void;
}

const AttendanceModalContent: React.FC = () => {
  const { data: missionData, isLoading: missionsLoading } = useV2Missions(
    "DAILY",
  ) as { data: MissionListResponse | undefined; isLoading: boolean };
  const { data: rules = [], isLoading: rulesLoading } = useV2StreakRules() as {
    data: V2StreakRule[] | undefined;
    isLoading: boolean;
  };
  const claimMutation = useV2ClaimStreakReward();

  if (missionsLoading || rulesLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
        <p className="text-zinc-500 text-sm font-bold italic">동기화 중...</p>
      </div>
    );
  }

  const streakInfo = missionData?.streak_info;
  const currentStreak = streakInfo?.current_streak ?? 0;
  const claimableDay = streakInfo?.claimable_rewards?.[0] ?? null;

  const handleClaim = async () => {
    try {
      tryHaptic(50);
      await claimMutation.mutateAsync();
    } catch (e) {
      console.error("Claim failed", e);
    }
  };

  const getRewardInfo = (rule: V2StreakRule): AttendanceReward => {
    const grant = rule.grants[0];
    if (!grant) return { label: "Reward", icon: "🎁" };

    // Aligned with docs/v2_specs/01_core/v2_reward_type_standard_sot_ko.md
    if (grant.token_type === "ROULETTE_TICKET")
      return { label: "룰렛 티켓", icon: "🎯" };
    if (grant.token_type === "DICE_TICKET")
      return { label: "다이스 티켓", icon: "🎲" };
    if (grant.token_type === "LOTTERY_TICKET")
      return { label: "복권 티켓", icon: "🎫" };
    if (grant.token_type === "GOLD_KEY_TICKET")
      return { label: "골드 키", icon: "🔑" };
    if (grant.token_type === "DIAMOND_TICKET")
      return { label: "다이아 티켓", icon: "💎" };
    if (grant.token_type === "DIAMOND" || grant.item_type === "DIAMOND")
      return { label: "다이아몬드", icon: "💎" };

    return { label: "특별 보상", icon: "🎁" };
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 flex items-center justify-center mb-4 relative">
          <Sparkles size={32} className="text-emerald-500" />
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#121214]"
          />
        </div>
        <h2 className="text-2xl font-black text-white italic mb-1">
          연속출석 보너스
        </h2>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs font-black text-emerald-500 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 uppercase tracking-widest">
            Current Streak: {currentStreak} Days
          </span>
        </div>
        <p className="text-[13px] text-white/50 px-8 leading-relaxed">
          매일 접속만 해도 쏟아지는 혜택!
          <br />
          7일 연속 달성 시 잭팟 기회가 주어집니다.
        </p>
      </div>

      <div className="max-h-[380px] overflow-y-auto no-scrollbar pr-1">
        <div className="grid grid-cols-1 gap-2.5">
          {rules
            .slice()
            .sort((a, b) => a.day - b.day)
            .map((rule) => {
              const isCompleted = currentStreak >= rule.day;
              const isTarget = claimableDay === rule.day;
              const reward = getRewardInfo(rule);

              return (
                <div
                  key={rule.day}
                  className={`flex items-center gap-4 p-4 rounded-3xl border transition-all ${
                    isTarget
                      ? "bg-emerald-500/10 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.1)]"
                      : isCompleted
                        ? "bg-white/5 border-white/10 opacity-60"
                        : "bg-white/5 border-white/5"
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xl ${
                      isCompleted
                        ? "bg-emerald-500 text-black"
                        : "bg-emerald-500/10"
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 size={18} strokeWidth={3} />
                    ) : (
                      reward.icon
                    )}
                  </div>

                  <div className="flex-1">
                    <div
                      className={`text-[13px] font-bold ${isCompleted ? "text-white" : "text-white/60"}`}
                    >
                      {rule.day}일차 출석
                    </div>
                    <div
                      className={`text-[11px] font-black ${isTarget ? "text-emerald-400" : isCompleted ? "text-emerald-500/50" : "text-emerald-500/80"}`}
                    >
                      {reward.label}
                      {rule.grants[0]?.amount &&
                        rule.grants[0].amount > 1 &&
                        ` x${rule.grants[0].amount}`}{" "}
                      지급
                    </div>
                  </div>

                  <div className="text-[10px] font-black text-white/20 uppercase tracking-tighter">
                    DAY 0{rule.day}
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {claimableDay && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <Button
            onClick={handleClaim}
            disabled={claimMutation.isPending}
            className="w-full h-14 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-black font-black text-lg italic shadow-[0_8px_24px_rgba(16,185,129,0.3)] transition-all active:scale-95"
          >
            {claimMutation.isPending ? "RECEIVING..." : "CLAIM REWARD!"}
          </Button>
        </motion.div>
      )}
    </div>
  );
};

export const EventModals: React.FC<EventModalsProps> = ({
  selectedId,
  onClose,
}) => {
  const renderModalContent = () => {
    switch (selectedId) {
      case "attendance":
        return <AttendanceModalContent />;

      case "golden":
        return (
          <div className="space-y-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-yellow-500/20 flex items-center justify-center mb-4">
                <Clock size={32} className="text-yellow-500" />
              </div>
              <h2 className="text-2xl font-black text-white italic mb-2">
                골든아워 이벤
              </h2>
              <p className="text-sm text-white/50 px-4">
                언제 터질지 모르는 황금빛 찬스!
                <br />
                이벤트는 랜덤으로 발생하며 발생 시 알림이 전송됩니다.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-gradient-to-br from-yellow-500/10 to-amber-600/10 border border-yellow-500/20 relative overflow-hidden">
              <div className="relative z-10 text-center">
                <span className="text-[10px] font-black text-yellow-500 uppercase tracking-[0.3em] mb-2 block">
                  Current Status
                </span>
                <div className="text-3xl font-black text-white mb-2 italic">
                  STAND-BY
                </div>
                <p className="text-xs text-white/40">
                  알림 설정을 켜두시면 누구보다 빠르게
                  <br />
                  참여하실 수 있습니다.
                </p>
              </div>
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <MatrixText text="GOLDEN" />
              </div>
            </div>
          </div>
        );

      case "newuser":
        return (
          <div className="space-y-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-[24px] bg-emerald-500/20 flex items-center justify-center mb-4 relative">
                <Gift size={32} className="text-emerald-500" />
                <div className="absolute -top-1 -right-1 px-2 py-0.5 rounded-full bg-emerald-500 text-[10px] font-black text-black shadow-lg">
                  7 DAYS
                </div>
              </div>
              <h2 className="text-2xl font-black text-white italic mb-2">
                신규유저 웰컴팩
              </h2>
              <p className="text-[13px] text-white/50 px-4 leading-relaxed">
                가입 후{" "}
                <span className="text-emerald-500 font-bold">168시간(7일)</span>{" "}
                동안만 제공되는
                <br />
                신규 회원 전용 특별 미션 패키지입니다.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {[
                { t: "신규 가입 축하", b: "3,000 포인트", icon: "🎊" },
                { t: "첫 게임 플레이", b: "2,000 포인트", icon: "🕹️" },
                { t: "가입 다음날 로그인", b: "1,000 포인트", icon: "🌅" },
                {
                  t: "텔레그램 공식채널 가입",
                  b: "1만원 상당 기프티콘",
                  icon: "📱",
                },
              ].map((step, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 p-4 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                >
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-xl">
                    {step.icon}
                  </div>
                  <div className="flex-1">
                    <div className="text-[13px] font-bold text-white">
                      {step.t}
                    </div>
                    <div className="text-[11px] font-black text-emerald-500/80">
                      {step.b} 지급
                    </div>
                  </div>
                  <div className="text-[10px] font-black text-white/20 uppercase tracking-tighter">
                    STEP 0{i + 1}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case "deposit":
        return (
          <div className="space-y-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-[24px] bg-blue-500/20 flex items-center justify-center mb-4 relative">
                <CreditCard size={32} className="text-blue-500" />
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="absolute -top-1 -right-1 text-lg"
                >
                  ⚡
                </motion.div>
              </div>
              <h2 className="text-2xl font-black text-white italic mb-1">
                입금반영이 늦나요?
              </h2>
              <p className="text-[13px] text-zinc-400 px-6 leading-relaxed">
                기다리게 해서 죄송해요! 코드지갑에서 입금반영이 늦어질 경우,
                <br />
                즐겁게 게임하시라고 보너스를 드립니다.
              </p>
            </div>

            <div className="bg-blue-500/5 rounded-[40px] p-8 border border-blue-500/10 text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />
              <h3 className="text-xs font-black text-blue-500/80 uppercase tracking-widest mb-4">
                지연보상 선물
              </h3>
              <div className="inline-flex items-center gap-3 py-3 px-8 rounded-full bg-blue-500/10 border border-blue-500/20 mb-6 group hover:scale-105 transition-transform">
                <span className="text-3xl">🎁</span>
                <span className="text-2xl font-black text-white tracking-tighter">
                  룰렛 티켓 3장
                </span>
              </div>
              <div className="space-y-2">
                <p className="text-[12px] font-bold text-white/90">
                  입금 신청후 30분이 지났다면?
                </p>
                <p className="text-[11px] text-white/40 leading-relaxed">
                  지민이한테 살짝 말씀해주세요.
                  <br />
                  확인 후 반영해 드릴게요!
                </p>
              </div>
            </div>
          </div>
        );

      case "teambattle":
        return (
          <div className="space-y-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-purple-500/20 flex items-center justify-center mb-4">
                <Users size={32} className="text-purple-500" />
              </div>
              <h2 className="text-2xl font-black text-white italic mb-2">
                팀배틀 이벤
              </h2>
              <p className="text-sm text-white/50 px-4">
                함께해서 더 즐겁고 확실한 승리!
                <br />팀 배틀 이벤트가 곧 공개될 예정입니다.
              </p>
            </div>

            <div className="relative aspect-video rounded-3xl overflow-hidden bg-neutral-900 border border-white/10 group">
              <div className="absolute inset-0 bg-[url('/assets/bg_pattern.png')] opacity-20 bg-repeat bg-center" />
              <div className="absolute inset-0 bg-gradient-to-t from-purple-900/50 to-transparent" />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">
                  🎪
                </div>
                <div className="text-xl font-black text-white uppercase tracking-widest italic mb-2">
                  COMING SOON
                </div>
                <p className="text-[11px] text-white/40">
                  역대급 상금과 짜릿한 대결을 준비 중입니다.
                  <br />
                  조금만 더 기다려 주세요!
                </p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <AnimatePresence>
      {selectedId && (
        <div className="fixed inset-0 z-[1000] flex items-end justify-center px-4 pb-[env(safe-area-inset-bottom)] sm:items-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-xl"
          />
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="relative w-full max-w-sm max-h-[85vh] overflow-y-auto no-scrollbar rounded-t-[40px] sm:rounded-[40px] border border-white/10 bg-[#121214] p-6 shadow-2xl shadow-black/50"
          >
            {/* Handle Bar on Mobile */}
            <div className="w-12 h-1 bg-white/10 rounded-full mx-auto mb-6 sm:hidden" />

            <button
              onClick={onClose}
              aria-label="닫기"
              className="absolute top-6 right-6 p-2 rounded-full bg-white/5 border border-white/10 text-white/40 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            {renderModalContent()}

            <div className="mt-8 pt-6 border-t border-white/5">
              <Button
                onClick={onClose}
                className="w-full h-14 rounded-2xl bg-white text-black font-black text-lg hover:bg-neutral-200 transition-colors"
              >
                확인
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
