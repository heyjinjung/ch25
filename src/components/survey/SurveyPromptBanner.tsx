import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useActiveSurveys } from "../../hooks/useSurvey";
import { X, ArrowRight, FileText } from "lucide-react";
import clsx from "clsx";

const SurveyPromptBanner: React.FC = () => {
  const { data, isLoading } = useActiveSurveys();
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);

  const surveys = data || [];

  // Find the most relevant survey (pending first, then any active)
  const primary = useMemo(() => {
    if (surveys.length === 0) return null;

    // Filter out completed surveys so they don't show in modal
    const incomplete = surveys.filter(s => !s.is_completed);
    if (incomplete.length === 0) return null;

    return incomplete.find((s) => s.pending_response_id) || incomplete[0];
  }, [surveys]);

  useEffect(() => {
    if (!primary) return;

    // Check if user dismissed this survey in this session
    const storageKey = `survey_dismissed_session_${primary.id}`;
    const dismissed = sessionStorage.getItem(storageKey);

    if (!dismissed) {
      // Small delay for better UX
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [primary]);

  const handleDismiss = () => {
    if (!primary) return;
    setIsVisible(false);
    sessionStorage.setItem(`survey_dismissed_session_${primary.id}`, "true");
  };

  const handleParticipate = () => {
    if (!primary) return;
    setIsVisible(false);
    navigate(`/surveys/${primary.id}`);
  };

  if (isLoading || !primary || !isVisible) return null;

  const reward = primary.reward_json;
  const hasReward = reward && (reward.amount || 0) > 0;
  const rewardAmount = reward?.amount ?? 0;
  const rewardType = reward?.reward_type === "TICKET" ? "티켓" : "P"; // Simple fallback
  const isCash = reward?.reward_type !== "TICKET"; // Basic check

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/90 backdrop-blur-md animate-fadeIn transition-all duration-300">
      <div className="relative w-full max-w-[340px] flex flex-col bg-zinc-950 border border-emerald-500/30 rounded-[32px] shadow-[0_32px_64px_-16px_rgba(16,185,129,0.3)] overflow-hidden animate-scaleIn">

        {/* Background Textures */}
        <div className="absolute inset-0 bg-[url('/assets/pattern_noise.png')] opacity-[0.03] pointer-events-none" />
        <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-emerald-500/10 to-transparent pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={handleDismiss}
          aria-label="설문 배너 닫기"
          className="absolute top-4 right-4 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all"
        >
          <X size={18} />
        </button>

        <div className="p-6 pt-10 text-center relative z-10">
          {/* Header Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-4 animate-bounce-subtle mx-auto">
            <FileText size={12} className="text-emerald-400" />
            <span className="text-[10px] font-black text-emerald-400 tracking-widest uppercase">SURVEY EVENT</span>
          </div>

          <h3 className="text-2xl font-black text-white leading-tight mb-2">
            {primary.title}
          </h3>
          <p className="text-zinc-500 text-xs font-medium tracking-tight mb-8">
            {primary.description || "잠깐! 설문에 참여하고 보상을 받아가세요."}
          </p>

          {/* Reward Card (Conditional) */}
          {hasReward && (
            <div className="mb-6 relative group p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center gap-4 overflow-hidden">
              <div className="absolute inset-0 bg-emerald-500/5 blur-xl group-hover:opacity-100 transition-opacity" />
              <div className="relative z-10 w-12 h-12 bg-black/40 rounded-xl border border-white/5 flex items-center justify-center shrink-0">
                <img
                  src={isCash ? "/assets/asset_coin_gold.png" : "/assets/asset_ticket_green.png"}
                  alt="reward"
                  className="w-8 h-8 object-contain"
                />
              </div>
              <div className="relative z-10 flex flex-col items-start">
                <span className="text-[10px] font-bold text-zinc-500">참여 보상</span>
                <span className="text-lg font-black text-white tabular-nums">
                  {rewardAmount.toLocaleString()}
                  <span className="text-xs text-emerald-500 ml-0.5">{rewardType}</span>
                </span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <button
              onClick={handleParticipate}
              className={clsx(
                "w-full py-4 rounded-[18px] bg-emerald-500 text-black font-black text-base shadow-[0_12px_24px_-8px_rgba(16,185,129,0.5)] active:scale-[0.97] hover:brightness-110 transition-all flex items-center justify-center gap-2 group"
              )}
            >
              <span>지금 참여하기</span>
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={handleDismiss}
              className="w-full py-3 rounded-2xl bg-transparent text-zinc-500 font-bold text-xs hover:text-zinc-300 transition-colors"
            >
              나중에 하기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SurveyPromptBanner;
