import React from "react";
import clsx from "clsx";

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
const LotteryCard: React.FC<LotteryCardProps> = React.memo(({ prize, isRevealed, isScratching, onScratch }) => {
  const disabled = isScratching || isRevealed;

  return (
    <div className="relative mx-auto w-full max-w-sm">
      {/* Premium Outer Frame */}
<div className="relative overflow-hidden rounded-[2.5rem] border border-white/20 bg-black/60 p-3 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)] backdrop-blur-3xl group transition-all duration-500 hover:border-amber-500/30">

        {/* Animated Background Glows */}
        <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-amber-500/10 blur-[100px] animate-pulse" />
        <div className="pointer-events-none absolute -right-20 -bottom-20 h-64 w-64 rounded-full bg-yellow-500/5 blur-[100px]" />

        {/* The Card Body */}
        <div className="relative aspect-[3/4] sm:aspect-[4/5] w-full rounded-[2rem] border border-white/10 bg-gradient-to-br from-slate-900 to-black overflow-hidden group/card shadow-2xl">

          <div
            className={clsx(
              "relative h-full w-full flex flex-col items-center justify-center transition-all duration-700 focus:outline-none",
              !disabled && "cursor-pointer hover:scale-[1.02]",
              disabled && "cursor-default"
            )}
            role="button"
            tabIndex={0}
            onClick={() => { if (!disabled) onScratch(); }}
          >
            {/* 1. UNREVEALED STATE (Gold Foil) */}
            {!isRevealed && (
              <div className="absolute inset-0 z-20 group-hover:scale-105 transition-transform duration-700">
                <img
                  src="/assets/lottery/gold_foil.jpg"
                  className="h-full w-full object-cover brightness-110 saturate-[1.2]"
                  alt="Gold Foil"
                />
                {/* Overlay Text - High Contrast for Gold Background */}
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[1px]">
                  <div className="w-20 h-20 rounded-full bg-white/10 border border-white/20 flex items-center justify-center mb-4 backdrop-blur-md animate-bounce">
                    <img src="/assets/lottery/icon_lotto_ball.png" className="w-16 h-16 object-contain filter drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]" alt="" />
                  </div>
                  <h3 className="text-white text-3xl font-black italic tracking-tighter uppercase drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]">
                    {isScratching ? "열리는 중..." : "탭하여 확인"}
                  </h3>
                  <p className="mt-2 text-amber-200/90 text-[10px] font-black tracking-[0.2em] uppercase drop-shadow-md">
                    CC CAZINO PREMIUM TICKET
                  </p>
                </div>
              </div>
            )}

            {/* 2. REVEALED PRIZE STATE */}
            {isRevealed && prize && (
              <div className="relative z-10 w-full h-full flex flex-col items-center justify-center p-5 text-center animate-in zoom-in-90 fade-in duration-500">
                {/* Simplified Visual Effects */}
                <div className="absolute inset-0 bg-gradient-to-b from-amber-500/10 via-transparent to-emerald-500/10 opacity-50" />
                <img
                  src="/assets/lottery/star_rays.png"
                  className="absolute inset-0 w-full h-full object-contain opacity-20 animate-spin-slow mix-blend-screen"
                  alt=""
                />

                <div className="relative z-20 flex flex-col items-center">
                  <span className="inline-block px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-black tracking-widest uppercase mb-6 shadow-[0_0_20px_rgba(48,255,117,0.2)]">
                    축하합니다!
                  </span>

                  {/* Result Logic Fix */}
                  {prize.reward_type === 'NONE' || (Number(prize.reward_value) === 0 && prize.reward_type === 'POINT') ? (
                    <>
                      <span className="text-6xl mb-4">💨</span>
                      <h2 className="text-white text-3xl font-black tracking-tight uppercase italic">{prize.label}</h2>
                      <p className="mt-2 text-white/40 font-bold uppercase tracking-widest text-[10px]">다음 기회에!</p>
                    </>
                  ) : (
                    <div className="flex flex-col items-center">
                      <h2 className={clsx(
                        "text-white font-black tracking-tight uppercase mb-2",
                        (prize.reward_type === 'POINT' || prize.reward_type === 'CURRENCY' || prize.reward_type === 'CASH')
                          ? "text-2xl"
                          : "text-4xl italic"
                      )}>
                        {prize.label}
                      </h2>
                      {(prize.reward_type === 'POINT' || prize.reward_type === 'CURRENCY' || prize.reward_type === 'CASH') && (
                        <div className="flex items-baseline justify-center gap-1">
                          <h3 className="text-figma-accent text-3xl sm:text-5xl font-black tracking-tighter italic">
                            {Number(prize.reward_value).toLocaleString()}
                          </h3>
                          <span className="text-figma-accent text-lg sm:text-xl font-black italic">
                            {prize.reward_type === 'POINT' ? 'P' : '원'}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="h-px w-12 bg-white/20 mx-auto my-6" />

                  <p className="text-figma-accent text-[10px] font-black tracking-[0.3em] uppercase opacity-70">
                    {prize.reward_type === 'NONE' ? 'TRY AGAIN' : '지급 완료'}
                  </p>
                </div>
              </div>
            )}

            {/* 3. EMPTY STATE */}
            {isRevealed && !prize && (
              <div className="flex flex-col items-center text-center p-5 animate-in zoom-in-95">
                <span className="text-5xl mb-4">🌪️</span>
                <h3 className="text-white text-xl sm:text-2xl font-black tracking-tight uppercase italic">다음에 다시!</h3>
                <p className="mt-2 text-white/40 font-bold text-sm">운이 따르지 않았네요.</p>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Card Info */}
        <div className="mt-6 flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-[10px] font-black text-white/30 tracking-widest uppercase">Premium System</span>
          </div>
          <span className="text-[10px] font-black text-white/30 tracking-widest uppercase">CC-2025-GOLD</span>
        </div>
      </div>
    </div>
  );
});


export default LotteryCard;
