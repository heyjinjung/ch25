import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, Lock } from "lucide-react";

type TicketZeroRetentionModalProps = {
  vaultBalance: number;
  trialEnabled: boolean;
  isRequestingTrial: boolean;
  onClose: () => void;
  onGoVault: () => void;
  onRequestTrial: () => void;
};

const formatWon = (amount: number) => `${amount.toLocaleString("ko-KR")}`;

const TicketZeroRetentionModal: React.FC<TicketZeroRetentionModalProps> = ({
  vaultBalance,
  trialEnabled,
  isRequestingTrial,
  onClose,
  onGoVault,
  onRequestTrial,
}) => {
  const hasVault = vaultBalance > 0;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[10050] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: "spring", damping: 30, stiffness: 400 }}
          className="relative w-full max-w-[340px] bg-[#1a1c24] rounded-[28px] overflow-hidden shadow-2xl border border-white/5"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-colors z-10"
            aria-label="모달 닫기"
          >
            <X size={20} />
          </button>

          <div className="flex flex-col items-center pt-8 pb-6 px-6">
            {/* Header Image */}
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="relative w-28 h-28 mb-4 flex items-center justify-center"
            >
              <div className="absolute inset-0 bg-emerald-500/20 blur-[40px] rounded-full" />
              <img
                src="/assets/asset_ticket_green.png"
                alt="Ticket"
                className="w-full h-full object-contain drop-shadow-2xl relative z-10"
              />
              <div className="absolute -bottom-2 -right-2 w-9 h-9 bg-red-500 rounded-full flex items-center justify-center border-[3px] border-[#1a1c24] shadow-lg z-20">
                <span className="text-white font-bold text-sm">0</span>
              </div>
            </motion.div>

            {/* Content */}
            <div className="text-center space-y-2 mb-8 w-full">
              <h2 className="text-2xl font-bold text-white tracking-tight leading-tight">
                티켓이<br />0장이에요
              </h2>

              {hasVault ? (
                <div className="mt-3 bg-white/5 rounded-xl p-3 border border-white/5">
                  <div className="flex items-center justify-center gap-2 text-zinc-400 text-sm mb-1">
                    <Lock size={12} />
                    <span>잠긴 금고 잔액</span>
                  </div>
                  <div className="text-emerald-400 font-bold text-lg">
                    {formatWon(vaultBalance)}원
                  </div>
                </div>
              ) : (
                <p className="text-zinc-400 text-sm mt-2 leading-relaxed">
                  지금은 티켓이 없어서<br />게임을 시작하기 어려워요.
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="w-full space-y-3">
              {hasVault ? (
                <button
                  onClick={onGoVault}
                  className="w-full h-[52px] rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-[16px] flex items-center justify-center gap-1 transition-all active:scale-[0.98] shadow-[0_0_20px_-5px_rgba(16,185,129,0.4)]"
                >
                  금고로 티켓 채우기
                  <ChevronRight size={18} className="opacity-70" />
                </button>
              ) : (
                <button
                  onClick={onRequestTrial}
                  disabled={!trialEnabled || isRequestingTrial}
                  className="w-full h-[52px] rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-[16px] flex items-center justify-center transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_-5px_rgba(16,185,129,0.4)]"
                >
                  {!trialEnabled ? "체험 티켓 준비중" : isRequestingTrial ? "지급 중..." : "체험 티켓 받기"}
                </button>
              )}

              <div className="grid grid-cols-2 gap-3 pt-1">
                <a
                  href="https://ccc-010.com"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="h-[46px] flex items-center justify-center rounded-xl bg-zinc-800 text-zinc-400 font-medium text-xs hover:bg-zinc-700 hover:text-zinc-200 transition-colors"
                >
                  씨씨카지노
                </a>
                <a
                  href="https://t.me/jm956"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="h-[46px] flex items-center justify-center rounded-xl bg-zinc-800 text-zinc-400 font-medium text-xs hover:bg-zinc-700 hover:text-zinc-200 transition-colors"
                >
                  실장 문의
                </a>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default TicketZeroRetentionModal;
