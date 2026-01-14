import React from "react";
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
    <div className="fixed inset-0 z-[10050] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-[#0A0A0A] shadow-2xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-500/10 via-transparent to-transparent pointer-events-none" />

        <button
          onClick={onClose}
          aria-label="닫기"
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/40 hover:bg-white/10 border border-white/10 transition-colors"
        >
          <X className="w-5 h-5 text-white/80" />
        </button>

        <div className="relative p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-black tracking-widest uppercase text-white/40">Ticket-Zero</div>
              <h2 className="mt-1 text-2xl font-black text-white tracking-tight">{title}</h2>
            </div>
          </div>

          <p className="mt-4 text-sm font-medium text-white/70 whitespace-pre-wrap leading-relaxed">{body}</p>

          <div className="mt-6 space-y-2">
            {hasVault ? (
              <Button variant="figma-primary" onClick={onGoVault} className="w-full !py-3 !text-base">
                금고로 티켓 채우기
              </Button>
            ) : (
              <Button
                variant="figma-primary"
                onClick={onRequestTrial}
                disabled={!trialEnabled || isRequestingTrial}
                className="w-full !py-3 !text-base"
              >
                {!trialEnabled ? "체험 티켓 준비중" : isRequestingTrial ? "지급 중..." : "체험 티켓 받기"}
              </Button>
            )}

            <div className="grid grid-cols-2 gap-2">
              <a
                href="https://ccc-010.com"
                target="_blank"
                rel="noreferrer noopener"
                className="w-full py-3 text-center rounded-xl bg-white/5 border border-white/10 text-white/80 font-black text-sm hover:bg-white/10 active:scale-[0.99] transition"
              >
                씨씨카지노
              </a>
              <a
                href="https://t.me/jm956"
                target="_blank"
                rel="noreferrer noopener"
                className="w-full py-3 text-center rounded-xl bg-white/5 border border-white/10 text-white/80 font-black text-sm hover:bg-white/10 active:scale-[0.99] transition"
              >
                실장 문의
              </a>
            </div>

            <Button variant="figma-secondary" onClick={onClose} className="w-full !py-3 !text-sm">
              나중에 하기
            </Button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default TicketZeroRetentionModal;
