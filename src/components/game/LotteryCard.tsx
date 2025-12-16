import { useMemo } from "react";

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
  const disabled = useMemo(() => isScratching || isRevealed, [isScratching, isRevealed]);

  return (
    <div className="relative mx-auto w-full max-w-sm">
      <div className="relative overflow-hidden rounded-3xl border-4 border-gold-500 bg-gradient-to-br from-red-900 via-red-800 to-green-900 p-8 shadow-[0_0_30px_rgba(234,179,8,0.3)]">
        <div className="absolute left-4 top-4 text-4xl opacity-20">🎄</div>
        <div className="absolute bottom-4 right-4 text-4xl opacity-20">🎁</div>
        <div className="absolute right-4 top-4 text-4xl opacity-20">⭐</div>
        <div className="absolute bottom-4 left-4 text-4xl opacity-20">❄️</div>

        <div className="relative min-h-[200px] rounded-2xl border-2 border-gold-400/50 bg-gradient-to-br from-slate-900 to-slate-800 p-6">
          <div
            className={`relative flex h-full min-h-[160px] flex-col items-center justify-center overflow-hidden rounded-xl bg-slate-900 ${
              disabled ? "cursor-not-allowed" : "cursor-pointer"
            }`}
            role="button"
            tabIndex={0}
            onClick={() => {
              if (!disabled) onScratch();
            }}
            onKeyDown={(e) => {
              if (disabled) return;
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onScratch();
              }
            }}
          >
            <div className="relative z-10 flex flex-col items-center text-center">
              {!isRevealed ? (
                <>
                  <div className="mb-4 text-5xl">🎫</div>
                  <p className="text-lg font-bold text-gold-300">{isScratching ? "뽑는 중..." : "카드를 눌러 바로 뽑기"}</p>
                </>
              ) : prize ? (
                <>
                  <div className="mb-2 text-5xl animate-bounce-in">🎉</div>
                  <p className="text-sm uppercase tracking-wider text-gold-400">축하합니다!</p>
                  <p className="mt-2 text-2xl font-bold text-white">{prize.label}</p>
                  <p className="mt-1 text-sm text-emerald-300">
                    {prize.reward_type} +{prize.reward_value}
                  </p>
                </>
              ) : (
                <>
                  <div className="mb-2 text-5xl animate-bounce-in">💨</div>
                  <p className="text-xl font-bold text-slate-300">다음 기회에!</p>
                  <p className="mt-2 text-sm text-slate-400">다시 시도해 주세요.</p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LotteryCard;
