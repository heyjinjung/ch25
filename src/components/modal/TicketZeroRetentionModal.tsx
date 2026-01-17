import React from "react";
import { motion } from "framer-motion";
import { X, AlertCircle } from "lucide-react";

type TicketZeroRetentionModalProps = {
  vaultBalance: number;
  trialEnabled: boolean;
  isRequestingTrial: boolean;
  onClose: () => void;
  onGoVault: () => void;
  onRequestTrial: () => void;
};

const formatWon = (amount: number) => `${amount.toLocaleString("ko-KR")}원`;

const TicketZeroRetentionModal: React.FC<TicketZeroRetentionModalProps> = ({
  vaultBalance,
  trialEnabled,
  isRequestingTrial,
  onClose,
  onGoVault,
  onRequestTrial,
}) => {
  const hasVault = vaultBalance > 0;

  const title = hasVault ? "티켓이 0장이에요" : "티켓이 0장이에요";
  const body = hasVault
    ? `잠긴 금고에 ${formatWon(vaultBalance)}이 있어요.\n지금 바로 티켓을 채우고 이어서 플레이할 수 있어요.`
    : "지금은 티켓이 없어서 게임을 시작하기 어려워요.\n체험 티켓으로 먼저 한 판 시작해볼까요?";

  return (
    <div className="fixed inset-0 z-[10050] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, rotateX: 10 }}
        animate={{ opacity: 1, scale: 1, rotateX: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="relative w-full max-w-md perspective-1000"
      >
        {/* Main Card with 3D depth */}
        <div className="relative rounded-[2rem] bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 shadow-[0_25px_60px_-12px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.05),inset_0_1px_0_rgba(255,255,255,0.1)] overflow-hidden border border-white/10">

          {/* Top decorative bar with gradient */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-lime-400 to-emerald-500" />

          {/* Animated background pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0" style={{
              backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(16,185,129,0.3) 10px, rgba(16,185,129,0.3) 20px)`,
              backgroundSize: '200% 200%',
              animation: 'shift 20s linear infinite'
            }} />
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2.5 rounded-xl bg-zinc-800/80 backdrop-blur-sm border border-white/10 hover:bg-zinc-700/80 transition-all shadow-lg z-10"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-white/60" />
          </button>

          <div className="relative p-8 pt-10">
            {/* Alert badge with 3D effect */}
            <div className="flex justify-center mb-6">
              <div className="relative inline-flex">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute inset-0 rounded-2xl bg-red-500/20 blur-xl"
                />
                <div className="relative flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-br from-red-500/20 to-orange-500/20 border-2 border-red-500/40 shadow-[0_8px_16px_rgba(239,68,68,0.2),inset_0_1px_0_rgba(255,255,255,0.2)]">
                  <AlertCircle size={16} className="text-red-400" />
                  <span className="text-xs font-black text-red-300 tracking-wider uppercase">Ticket Zero</span>
                </div>
              </div>
            </div>

            {/* Large 3D Ticket Display */}
            <div className="relative mb-8 flex justify-center">
              <div className="relative">
                {/* Shadow layers for depth */}
                <motion.div
                  animate={{
                    y: [0, 8, 0],
                    opacity: [0.3, 0.6, 0.3]
                  }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute top-8 left-1/2 -translate-x-1/2 w-32 h-32 rounded-3xl bg-emerald-500/40 blur-3xl"
                />

                {/* Main ticket card */}
                <motion.div
                  animate={{
                    y: [0, -8, 0],
                    rotateY: [0, 5, 0, -5, 0]
                  }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="relative w-36 h-36 rounded-3xl bg-gradient-to-br from-emerald-500/90 via-lime-400/90 to-emerald-600/90 shadow-[0_20px_50px_-12px_rgba(16,185,129,0.5),0_0_0_1px_rgba(255,255,255,0.2),inset_0_2px_0_rgba(255,255,255,0.3),inset_0_-2px_4px_rgba(0,0,0,0.2)] flex items-center justify-center transform-gpu"
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  {/* Ticket icon with emboss effect */}
                  <div className="relative">
                    <img
                      src="/assets/icons/ticket-dynamic-color.png"
                      alt="Ticket"
                      className="w-20 h-20 object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.4)]"
                      style={{ filter: 'brightness(1.2) contrast(1.1)' }}
                    />
                    {/* Zero overlay */}
                    <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-orange-600 border-[3px] border-white shadow-[0_4px_12px_rgba(239,68,68,0.6),inset_0_1px_0_rgba(255,255,255,0.4)] flex items-center justify-center">
                      <span className="text-xl font-black text-white">0</span>
                    </div>
                  </div>

                  {/* Shine effect */}
                  <motion.div
                    animate={{
                      x: ['-200%', '200%'],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      repeatDelay: 2,
                      ease: "easeInOut"
                    }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12"
                  />
                </motion.div>
              </div>
            </div>

            {/* Content */}
            <div className="text-center mb-8">
              <h2 className="text-3xl font-black text-white mb-3 tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                {title}
              </h2>
              <p className="text-base font-medium text-white/70 whitespace-pre-wrap leading-relaxed">
                {body}
              </p>
            </div>

            {/* Action Buttons with depth */}
            <div className="space-y-3">
              {hasVault ? (
                <motion.button
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onGoVault}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-400 via-lime-400 to-emerald-500 font-black text-lg text-black shadow-[0_12px_28px_-8px_rgba(16,185,129,0.5),0_0_0_1px_rgba(255,255,255,0.2),inset_0_2px_0_rgba(255,255,255,0.4),inset_0_-2px_4px_rgba(0,0,0,0.15)] transition-all"
                >
                  금고로 티켓 채우기
                </motion.button>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onRequestTrial}
                  disabled={!trialEnabled || isRequestingTrial}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-400 via-lime-400 to-emerald-500 font-black text-lg text-black shadow-[0_12px_28px_-8px_rgba(16,185,129,0.5),0_0_0_1px_rgba(255,255,255,0.2),inset_0_2px_0_rgba(255,255,255,0.4),inset_0_-2px_4px_rgba(0,0,0,0.15)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {!trialEnabled ? "체험 티켓 준비중" : isRequestingTrial ? "지급 중..." : "체험 티켓 받기"}
                </motion.button>
              )}

              {/* Secondary actions with glass effect */}
              <div className="grid grid-cols-2 gap-3">
                <a
                  href="https://ccc-010.com"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="py-3.5 text-center rounded-xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-sm border border-emerald-500/30 text-emerald-300 font-bold text-sm hover:from-emerald-500/10 hover:to-emerald-500/5 active:scale-[0.97] transition-all shadow-[0_4px_12px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.1)]"
                >
                  씨씨카지노
                </a>
                <a
                  href="https://t.me/jm956"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="py-3.5 text-center rounded-xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-sm border border-emerald-500/30 text-emerald-300 font-bold text-sm hover:from-emerald-500/10 hover:to-emerald-500/5 active:scale-[0.97] transition-all shadow-[0_4px_12px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.1)]"
                >
                  실장 문의
                </a>
              </div>

              <button
                onClick={onClose}
                className="w-full py-3.5 rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/10 text-white/60 font-bold text-sm hover:bg-zinc-700 active:scale-[0.98] transition-all shadow-[0_4px_12px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)]"
              >
                나중에 하기
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default TicketZeroRetentionModal;
