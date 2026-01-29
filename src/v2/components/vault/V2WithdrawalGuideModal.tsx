// src/components/vault/V2WithdrawalGuideModal.tsx
import React, { useMemo } from "react";
import { X, ShieldCheck, TrendingUp, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { WithdrawalRulesChecklist } from "./WithdrawalRulesChecklist";
import { VaultStatusResponse } from "../../api/vaultApi";
import { useNavigate } from "react-router-dom";
import { EncryptedText } from "../ui/EncryptedText";

interface V2WithdrawalGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  vaultData: VaultStatusResponse;
}

const V2WithdrawalGuideModal: React.FC<V2WithdrawalGuideModalProps> = ({
  isOpen,
  onClose,
  vaultData,
}) => {
  const navigate = useNavigate();

  // Calculate completion status
  const completedCount = useMemo(() => {
    let count = 0;
    if (vaultData.daily_play_count >= vaultData.daily_play_target) count++;
    if (vaultData.daily_vault_spent >= vaultData.daily_vault_spent_target) count++;
    if (vaultData.daily_deposit_confirmed) count++;
    return count;
  }, [vaultData]);

  const totalConditions = 3;
  const completionPercent = Math.round((completedCount / totalConditions) * 100);
  const isFullyComplete = completedCount === totalConditions;

  // Motivational messages based on completion
  const getMotivationalMessage = () => {
    if (isFullyComplete) {
      return {
        icon: TrendingUp,
        text: "🎉 모든 조건 달성! 지금 바로 출금하세요",
        color: "text-emerald-400",
        bgColor: "bg-emerald-500/10",
        borderColor: "border-emerald-500/20",
      };
    }
    
    const remaining = totalConditions - completedCount;
    
    if (remaining === 1) {
      return {
        icon: AlertCircle,
        text: `💪 조금만 더! ${remaining}개 조건만 채우면 출금 가능`,
        color: "text-amber-400",
        bgColor: "bg-amber-500/10",
        borderColor: "border-amber-500/20",
      };
    }
    
    return {
      icon: AlertCircle,
      text: `이용할수록 쌓입니다. ${remaining}개 조건 달성 필요`,
      color: "text-cyan-400",
      bgColor: "bg-cyan-500/10",
      borderColor: "border-cyan-500/20",
    };
  };

  const motivationalMessage = getMotivationalMessage();

  const handlePlayGame = () => {
    onClose();
    navigate("/v2/game");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-[340px] bg-gradient-to-b from-[#1a1c1e] to-[#121214] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl"
          >
            {/* Header gradient accent */}
            <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-emerald-500/20 via-cyan-500/10 to-transparent pointer-events-none" />

            <div className="relative pt-6 pb-4 px-6">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-all z-10"
                aria-label="닫기"
                title="닫기"
              >
                <X size={18} />
              </button>

              <div className="flex flex-col items-center gap-3">
                {/* Icon with glow */}
                <motion.div
                  initial={{ scale: 0.8, rotate: -10 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 200 }}
                  className="relative"
                >
                  <div className="absolute inset-0 bg-emerald-400/20 rounded-2xl blur-xl" />
                  <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 flex items-center justify-center shadow-lg">
                    <ShieldCheck size={24} className="text-emerald-400" />
                  </div>
                </motion.div>

                {/* Title */}
                <h2 className="text-lg font-black text-white text-center">
                  <EncryptedText text="출금 준비 안내" />
                </h2>

                {/* Completion progress */}
                <div className="w-full space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/50">달성률</span>
                    <span className="font-bold text-emerald-400">
                      {completedCount} / {totalConditions} 완료
                    </span>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="relative h-2 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${completionPercent}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full"
                    >
                      {/* Shine effect */}
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                        animate={{
                          x: ["-100%", "200%"],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                      />
                    </motion.div>
                  </div>
                  
                  <p className="text-center text-xs text-white/40">
                    {completionPercent}% 달성
                  </p>
                </div>
              </div>
            </div>

            {/* Checklist Content */}
            <div className="px-5 pb-4">
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 overflow-y-auto max-h-[240px]">
                <WithdrawalRulesChecklist
                  playCount={vaultData.daily_play_count}
                  playTarget={vaultData.daily_play_target}
                  isPlayMet={vaultData.daily_play_count >= vaultData.daily_play_target}
                  spendAmount={vaultData.daily_vault_spent}
                  spendTarget={vaultData.daily_vault_spent_target}
                  isSpendMet={vaultData.daily_vault_spent >= vaultData.daily_vault_spent_target}
                  isAccountVerified={vaultData.daily_deposit_confirmed}
                />
              </div>
            </div>

            {/* Motivational message */}
            <div className="px-5 pb-5">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className={`flex items-center gap-3 p-4 rounded-2xl ${motivationalMessage.bgColor} border ${motivationalMessage.borderColor}`}
              >
                <motivationalMessage.icon className={`w-5 h-5 ${motivationalMessage.color} flex-shrink-0`} />
                <p className={`text-sm font-semibold ${motivationalMessage.color} leading-tight`}>
                  {motivationalMessage.text}
                </p>
              </motion.div>
            </div>

            {/* Action buttons */}
            {!isFullyComplete ? (
              <div className="px-5 pb-6 space-y-2">
                <button
                  onClick={handlePlayGame}
                  className="w-full h-12 rounded-[24px] bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold text-sm transition-all shadow-lg shadow-emerald-500/30"
                >
                  게임하러 가기 →
                </button>
                <button
                  onClick={onClose}
                  className="w-full h-10 rounded-[20px] bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs font-semibold transition-all"
                >
                  닫기
                </button>
              </div>
            ) : (
                <div className="px-5 pb-6 space-y-2">
                    <button
                        onClick={onClose}
                        className="w-full h-12 rounded-[24px] bg-white/10 hover:bg-white/20 text-white font-bold text-sm transition-all"
                    >
                        닫기
                    </button>
                </div>
            )}

            {/* Footer */}
            <div className="px-6 py-4 bg-white/[0.01] border-t border-white/5 flex items-center justify-center gap-2">
              <span className="text-[10px] text-white/30 uppercase tracking-widest font-bold">
                안전 출금 시스템 (Secure System)
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default V2WithdrawalGuideModal;
