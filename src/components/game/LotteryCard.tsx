// src/components/game/LotteryCard.tsx
import { useState } from "react";

interface Prize {
  readonly id: number;
  readonly label: string;
  readonly reward_type: string;
  readonly reward_value: string | number;
  readonly stock?: number | null;
  readonly is_active?: boolean;
  readonly weight?: number;
}

interface LotteryCardProps {
  readonly prize?: Prize;
  readonly isRevealed: boolean;
  readonly isScratching: boolean;
  readonly onScratch: () => void;
}

const LotteryCard: React.FC<LotteryCardProps> = ({ prize, isRevealed, isScratching, onScratch }) => {
  const [scratchProgress, setScratchProgress] = useState(0);

  const handleMouseMove = () => {
    if (!isScratching) return;
    const progress = Math.min(100, scratchProgress + 2);
    setScratchProgress(progress);
  };

  return (
    <div className="relative mx-auto w-full max-w-sm">
      {/* Card container */}
      <div className="relative overflow-hidden rounded-3xl border-4 border-gold-500 bg-gradient-to-br from-red-900 via-red-800 to-green-900 p-8 shadow-[0_0_30px_rgba(234,179,8,0.3)]">
        {/* Decorative elements */}
        <div className="absolute left-4 top-4 text-4xl opacity-20">🎄</div>
        <div className="absolute bottom-4 right-4 text-4xl opacity-20">🎁</div>
        <div className="absolute right-4 top-4 text-4xl opacity-20">⭐</div>
        <div className="absolute bottom-4 left-4 text-4xl opacity-20">❄️</div>

        {/* Main content area */}
        <div
          className="relative min-h-[200px] rounded-2xl border-2 border-gold-400/50 bg-gradient-to-br from-slate-900 to-slate-800 p-6"
          onMouseMove={handleMouseMove}
          onClick={onScratch}
        >
          {!isRevealed ? (
            /* Scratch overlay */
            <div className="flex h-full min-h-[160px] flex-col items-center justify-center">
              <div className="mb-4 text-6xl">🎰</div>
              <p className="text-center text-lg font-bold text-gold-300">
                {isScratching ? "긁는 중..." : "터치하여 긁어보세요!"}
              </p>
              <p className="mt-2 text-sm text-slate-400">행운을 시험해보세요</p>
            </div>
          ) : (
            /* Prize reveal */
            <div className="flex h-full min-h-[160px] animate-bounce-in flex-col items-center justify-center">
              {prize ? (
                <>
                  <div className="mb-2 text-5xl">🎉</div>
                  <p className="text-sm uppercase tracking-wider text-gold-400">당첨!</p>
                  <p className="mt-2 text-2xl font-bold text-white">{prize.label}</p>
                  <p className="mt-1 text-sm text-emerald-300">
                    {prize.reward_type} +{prize.reward_value}
                  </p>
                </>
              ) : (
                <>
                  <div className="mb-2 text-5xl">😢</div>
                  <p className="text-xl font-bold text-slate-300">다음 기회에!</p>
                  <p className="mt-2 text-sm text-slate-400">내일 다시 도전하세요</p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Bottom label */}
        <div className="mt-4 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-gold-400">🎄 크리스마스 복권 🎄</p>
        </div>
      </div>
    </div>
  );
};

export default LotteryCard;
