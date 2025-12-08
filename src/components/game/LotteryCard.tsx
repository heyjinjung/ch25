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

  const startScratch = () => {
    if (isScratching || isRevealed) return;
    setScratchProgress(0);
    onScratch();
  };

  const overlayStyle = {
    width: `${100 - Math.min(100, scratchProgress)}%`,
  };

  return (
    <div className="relative mx-auto w-full max-w-sm">
      <div className="relative overflow-hidden rounded-3xl border-4 border-gold-500 bg-gradient-to-br from-red-900 via-red-800 to-green-900 p-8 shadow-[0_0_30px_rgba(234,179,8,0.3)]">
        <div className="absolute left-4 top-4 text-4xl opacity-20">🎄</div>
        <div className="absolute bottom-4 right-4 text-4xl opacity-20">🎁</div>
        <div className="absolute right-4 top-4 text-4xl opacity-20">⭐</div>
        <div className="absolute bottom-4 left-4 text-4xl opacity-20">❄️</div>

        <div className="relative min-h-[200px] rounded-2xl border-2 border-gold-400/50 bg-gradient-to-br from-slate-900 to-slate-800 p-6">
          {!isRevealed ? (
            <div className="relative flex h-full min-h-[160px] flex-col items-center justify-center overflow-hidden rounded-xl bg-slate-900">
              <div
                className={`absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)] bg-[length:20px_20px] transition-all duration-700 ease-out ${
                  isScratching ? "animate-pulse" : ""
                }`}
                style={overlayStyle}
              />
              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="mb-4 text-5xl">🎫</div>
                <p className="text-lg font-bold text-gold-300">{isScratching ? "긁는 중..." : "긁어서 결과를 확인하세요"}</p>
                <p className="mt-2 text-sm text-slate-400">터치/클릭하면 스크래치가 시작됩니다.</p>
              </div>
              {!isScratching && (
                <button
                  type="button"
                  onClick={startScratch}
                  className="relative z-10 mt-4 rounded-full bg-gradient-to-r from-gold-500 to-gold-600 px-5 py-2 text-sm font-semibold text-white shadow hover:from-gold-400 hover:to-gold-500"
                >
                  긁기 시작
                </button>
              )}
            </div>
          ) : (
            <div className="flex h-full min-h-[160px] animate-bounce-in flex-col items-center justify-center text-center">
              {prize ? (
                <>
                  <div className="mb-2 text-5xl">🎉</div>
                  <p className="text-sm uppercase tracking-wider text-gold-400">축하합니다!</p>
                  <p className="mt-2 text-2xl font-bold text-white">{prize.label}</p>
                  <p className="mt-1 text-sm text-emerald-300">
                    {prize.reward_type} +{prize.reward_value}
                  </p>
                </>
              ) : (
                <>
                  <div className="mb-2 text-5xl">💨</div>
                  <p className="text-xl font-bold text-slate-300">다음 기회에!</p>
                  <p className="mt-2 text-sm text-slate-400">다시 시도해 주세요.</p>
                </>
              )}
            </div>
          )}
        </div>

        <div className="mt-4 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-gold-400">스크래치 해서 경품 확인</p>
        </div>
      </div>
    </div>
  );
};

export default LotteryCard;
