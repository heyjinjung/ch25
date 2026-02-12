// src/v2/pages/event/SeoMissionPage.tsx
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Search, Gift, ArrowLeft, Loader2, CheckCircle2,
} from "lucide-react";
import { useSeoMissionStatus, useClaimSeoCode } from "../../hooks/useSeoMission";
import { triggerHaptic, triggerNotification } from "../../utils/haptic";
import { useToast } from "../../components/common/ToastProvider";
import { BackgroundPaths } from "../../components/effects/BackgroundPaths";

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_CODE: "유효하지 않은 코드입니다",
  CODE_EXPIRED: "코드가 만료되었습니다 (오전 9시에 갱신)",
  ALREADY_CLAIMED: "이미 사용한 코드입니다",
  DAILY_LIMIT_REACHED: "오늘은 이미 미션을 완료하셨습니다",
};

const STEPS = [
  {
    num: 1,
    title: "구글 검색",
    desc: '"씨씨카지노" 또는 "씨씨지민"을 구글에서 검색하세요.',
    tip: "Wi-Fi 대신 LTE/5G 사용 시 검색 결과가 더 빨리 반영됩니다.",
  },
  {
    num: 2,
    title: "랜딩 페이지 방문",
    desc: "검색 결과에서 씨씨카지노 공식 페이지(cc-jm.com)를 클릭하세요.",
    tip: "페이지 맨 아래에 오늘의 미션 코드가 표시됩니다.",
  },
  {
    num: 3,
    title: "코드 입력",
    desc: "확인한 코드를 아래 입력창에 입력하고 보상을 받으세요! (대소문자 구분 없음)",
    tip: "매일 오전 9시에 새로운 코드가 생성됩니다.",
  },
];

export default function SeoMissionPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [code, setCode] = useState("");
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const { data: status } = useSeoMissionStatus();
  const claimMutation = useClaimSeoCode();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || claimMutation.isPending) return;

    triggerHaptic("medium");
    setFeedback(null);

    try {
      const result = await claimMutation.mutateAsync(code);
      triggerNotification("success");
      setFeedback({
        type: "success",
        message: result.message || "보상이 지급되었습니다!",
      });
      addToast({
        type: "success",
        message: result.message || "검색 미션 보상 지급 완료!",
      });
      setCode("");
    } catch (error: any) {
      triggerNotification("error");
      const detail = error?.response?.data?.detail || "";
      setFeedback({
        type: "error",
        message: ERROR_MESSAGES[detail] || "코드 입력에 실패했습니다.",
      });
    }
  };

  const alreadyClaimed = status?.has_claimed_today === true;

  return (
    <div className="relative min-h-tg bg-[#09090B] overflow-x-hidden pt-[var(--header-offset)] pb-[var(--nav-offset)]">
      <BackgroundPaths count={15} />

      <div className="relative z-10 px-4 pb-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-zinc-500 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft size={18} />
            <span className="text-sm font-medium">돌아가기</span>
          </button>

          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
            <span className="text-[10px] font-black text-blue-500/80 uppercase tracking-[0.2em]">
              일일 검색 미션
            </span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tighter">
            검색하고 <span className="text-blue-500">포인트</span> 받기
          </h1>
          <p className="text-sm text-zinc-400 mt-2">
            매일 구글에서 씨씨카지노를 검색하고 코드를 입력하면 3,000 ~ 5,000P를 받을 수 있습니다.
          </p>
        </motion.div>

        {/* 완료 상태 */}
        {alreadyClaimed && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 rounded-3xl border border-emerald-500/30 bg-emerald-500/5 p-5 backdrop-blur-sm"
          >
            <div className="flex items-center gap-3">
              <CheckCircle2 size={28} className="text-emerald-400" />
              <div>
                <p className="font-bold text-emerald-400">오늘 미션 완료!</p>
                <p className="text-sm text-zinc-400">
                  {status?.reward_amount
                    ? `${status.reward_amount.toLocaleString()}P 지급됨`
                    : "보상이 지급되었습니다"}
                  {" · 내일 오전 9시에 새 코드가 생성됩니다."}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* 3단계 안내 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6 space-y-3"
        >
          {STEPS.map((step) => (
            <div
              key={step.num}
              className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 backdrop-blur-sm"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-sm font-black text-blue-400">
                  {step.num}
                </div>
                <div>
                  <h3 className="font-bold text-white">{step.title}</h3>
                  <p className="text-sm text-zinc-400 mt-1">{step.desc}</p>
                  <p className="text-xs text-zinc-600 mt-1.5">
                    TIP: {step.tip}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </motion.div>

        {/* 코드 입력 폼 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-3xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-cyan-500/5 p-5 backdrop-blur-sm"
        >
          <div className="flex items-center gap-2 mb-3">
            <Search size={18} className="text-blue-400" />
            <h3 className="text-base font-black text-white">코드 입력</h3>
          </div>

          <form onSubmit={handleSubmit} className="flex gap-3 mb-3">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="코드 입력 (예: seo4k2b1)"
              maxLength={20}
              disabled={claimMutation.isPending || alreadyClaimed}
              className="flex-1 rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm font-mono text-white placeholder:text-white/30 focus:border-blue-500/50 focus:outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!code.trim() || claimMutation.isPending || alreadyClaimed}
              className="rounded-xl bg-white px-5 py-3 text-sm font-black text-blue-600 transition-all hover:bg-white/90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {claimMutation.isPending ? (
                <Loader2 size={18} className="animate-spin" />
              ) : alreadyClaimed ? (
                "완료"
              ) : (
                "보상 받기"
              )}
            </button>
          </form>

          {/* 피드백 메시지 */}
          <AnimatePresence>
            {feedback && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className={`rounded-xl p-3 text-sm font-medium ${
                  feedback.type === "success"
                    ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                    : "bg-rose-500/10 border border-rose-500/30 text-rose-400"
                }`}
              >
                {feedback.message}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* 보상 안내 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] p-4 backdrop-blur-sm"
        >
          <h3 className="font-bold text-white mb-2 flex items-center gap-2">
            <Gift size={16} className="text-amber-400" />
            보상 안내
          </h3>
          <div className="space-y-1.5 text-sm text-zinc-400">
            <p>일일 미션: 3,000 ~ 5,000P (랜덤)</p>
            <p>갱신 시간: 매일 오전 9시 (KST)</p>
            <p>참여 제한: 계정당 하루 1회</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
