import React from "react";
import { motion } from "framer-motion";
import Button from "../common/Button";
import { X } from "lucide-react";

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
    <div className="fixed inset-0 z-[10050] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-sm rounded-3xl border border-emerald-500/30 bg-[#070D0A] p-1 shadow-[0_0_60px_rgba(16,185,129,0.25)] overflow-hidden animate-zoom-in">

        {/* Animated Background Rays */}
        <div className="absolute inset-0 opacity-30 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] bg-[conic-gradient(from_0deg,transparent,rgba(16,185,129,0.4),transparent)] animate-spin-slow" />
        </div>

        <div className="relative rounded-[1.3rem] bg-gradient-to-b from-emerald-500/10 to-transparent p-6 flex flex-col items-center text-center">

          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-white/40" />
          </button>

          {/* Icon Section */}
          <div className="relative mb-6">
            <motion.div
              className="absolute inset-0 rounded-full border border-emerald-400/40"
              animate={{ scale: [1, 1.25, 1], opacity: [0.2, 0.6, 0.2] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute inset-0 rounded-full blur-2xl bg-emerald-500/50"
              animate={{ scale: [1, 1.35, 1], opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-300 via-emerald-400 to-lime-400 shadow-[0_0_40px_rgba(16,185,129,0.6)]"
              animate={{ scale: [1, 1.08, 1], rotate: [0, 3, -3, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <motion.img
                src="/assets/icons/ticket-dynamic-color.png"
                alt=""
                className="h-12 w-12 object-contain drop-shadow-[0_0_12px_rgba(0,0,0,0.6)]"
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              />
            </motion.div>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-red-500/15 border border-red-500/40 mb-3">
            <span className="text-xs font-black text-red-300 animate-pulse">TICKET ZERO</span>
          </div>

          <h2 className="text-2xl font-black text-white tracking-tight mb-2">
            {title}
          </h2>

          <p className="text-sm font-medium text-white/70 whitespace-pre-wrap leading-relaxed mb-6">
            {body}
          </p>

          <div className="w-full space-y-2">
            {hasVault ? (
              <Button
                variant="figma-primary"
                onClick={onGoVault}
                className="w-full rounded-xl py-3.5 bg-gradient-to-r from-emerald-400 via-lime-400 to-emerald-500 border-none shadow-[0_10px_30px_rgba(16,185,129,0.35)] text-base text-black font-black"
              >
                금고로 티켓 채우기
              </Button>
            ) : (
              <Button
                variant="figma-primary"
                onClick={onRequestTrial}
                disabled={!trialEnabled || isRequestingTrial}
                className="w-full rounded-xl py-3.5 bg-gradient-to-r from-emerald-400 via-lime-400 to-emerald-500 border-none shadow-[0_10px_30px_rgba(16,185,129,0.35)] text-base text-black font-black disabled:opacity-50"
              >
                {!trialEnabled ? "체험 티켓 준비중" : isRequestingTrial ? "지급 중..." : "체험 티켓 받기"}
              </Button>
            )}

            <div className="grid grid-cols-2 gap-2">
              <a
                href="https://ccc-010.com"
                target="_blank"
                rel="noreferrer noopener"
                className="py-3 text-center rounded-xl bg-white/5 border border-emerald-500/20 text-emerald-300 font-black text-sm hover:bg-emerald-500/10 active:scale-[0.99] transition"
              >
                씨씨카지노
              </a>
              <a
                href="https://t.me/jm956"
                target="_blank"
                rel="noreferrer noopener"
                className="py-3 text-center rounded-xl bg-white/5 border border-emerald-500/20 text-emerald-300 font-black text-sm hover:bg-emerald-500/10 active:scale-[0.99] transition"
              >
                실장 문의
              </a>
            </div>

            <Button
              variant="figma-secondary"
              onClick={onClose}
              className="w-full rounded-xl py-3 bg-white/5 border-emerald-500/20 text-white/80 hover:bg-white/10"
            >
              나중에 하기
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketZeroRetentionModal;
