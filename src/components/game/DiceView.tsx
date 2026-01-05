import { useMemo } from "react";
import clsx from "clsx";

interface DiceViewProps {
  readonly userDice: number[];
  readonly dealerDice: number[];
  readonly result: "WIN" | "LOSE" | "DRAW" | null;
  readonly isRolling?: boolean;
}

const DiceFace: React.FC<{ value: number; isRolling?: boolean; delay?: string }> = ({ value, isRolling, delay = "0s" }) => {
  return (
    <div className={clsx(
      "relative h-[72px] w-[72px] sm:h-24 sm:w-24 flex items-center justify-center transition-all duration-500",
      isRolling && "animate-[bounce_0.5s_infinite_alternate]"
    )} style={{ animationDelay: delay }}>

      {/* No soft glow for higher contrast */}

      <img
        src={isRolling ? "/assets/dice/dice_1.png" : `/assets/dice/dice_${value || 1}.png`}
        alt={`Dice ${value}`}
        className={clsx(
          "h-full w-full object-contain filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.6)] transition-all duration-300",
          isRolling && "animate-[spin_0.3s_linear_infinite] scale-110 rotate-12"
        )}
      />
    </div>
  );
};

const DiceView: React.FC<DiceViewProps> = ({ userDice, dealerDice, result, isRolling }) => {
  const userSum = userDice.reduce((a, b) => a + b, 0);
  const dealerSum = dealerDice.reduce((a, b) => a + b, 0);

  const resultConfig = useMemo(() => {
    if (!result) return { text: "전투 준비!", color: "text-white/40", bg: "bg-white/5" };
    switch (result) {
      case "WIN":
        return { text: "승리", color: "text-figma-accent", bg: "bg-figma-accent/10" };
      case "LOSE":
        return { text: "패배", color: "text-red-500", bg: "bg-red-500/10" };
      case "DRAW":
        return { text: "무승부", color: "text-amber-400", bg: "bg-amber-500/10" };
    }
  }, [result]);

  return (
    <div className="space-y-4">
      {/* Battle Columns */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 relative h-full">

        {/* VS Label (sm+ shown, compact on small screens) */}
        <div className="hidden sm:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-black border border-white/10 flex items-center justify-center shadow-[0_0_30px_rgba(0,0,0,0.8)]">
            <span className="text-lg sm:text-2xl font-black italic text-white/20">VS</span>
          </div>
        </div>

        {/* User Side */}
        <div className={clsx(
          "relative rounded-[2rem] border p-3 transition-all duration-700 shadow-2xl",
          result === "WIN" ? "bg-figma-accent/10 border-figma-accent/40" : "bg-black/60 border-white/10"
        )}>
          <div className="flex flex-col items-center">
            <div className="mb-4 flex items-center gap-2 px-4 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <span className="text-xs font-black uppercase tracking-[0.2em] text-figma-accent">내 스쿼드</span>
            </div>

            <div className="flex justify-center gap-4 min-h-[80px]">
              {userDice.length > 0 || isRolling ? (
                (isRolling ? [1, 1] : userDice).map((val, i) => (
                  <DiceFace key={i} value={val} isRolling={isRolling} delay={`${i * 0.1}s`} />
                ))
              ) : (
                <>
                  <div className="h-[72px] w-[72px] sm:h-24 sm:w-24 rounded-[2rem] border-2 border-dashed border-white/5 bg-white/5 animate-pulse" />
                  <div className="h-[72px] w-[72px] sm:h-24 sm:w-24 rounded-[2rem] border-2 border-dashed border-white/5 bg-white/5 animate-pulse" />
                </>
              )}
            </div>

            <div className="mt-4 flex flex-col items-center">
              <span className="text-[2rem] sm:text-[3.5rem] font-black text-white leading-none tracking-tighter">
                {isRolling ? "?" : (userDice.length > 0 ? userSum : "-")}
              </span>
              <span className="text-xs font-bold text-white/30 uppercase mt-2">전투력</span>
            </div>
          </div>
        </div>

        {/* Dealer Side */}
        <div className={clsx(
          "relative rounded-[2rem] border p-3 transition-all duration-700 shadow-2xl",
          result === "LOSE" ? "bg-red-500/10 border-red-500/40" : "bg-black/60 border-white/10"
        )}>
          <div className="flex flex-col items-center">
            <div className="mb-4 flex items-center gap-2 px-4 py-1 rounded-full bg-white/5 border border-white/10">
              <span className="text-xs font-black uppercase tracking-[0.2em] text-white/60">딜러</span>
            </div>

            <div className="flex justify-center gap-4 min-h-[80px]">
              {dealerDice.length > 0 || isRolling ? (
                (isRolling ? [1, 1] : dealerDice).map((val, i) => (
                  <DiceFace key={i} value={val} isRolling={isRolling} delay={`${i * 0.15}s`} />
                ))
              ) : (
                <>
                  <div className="h-[72px] w-[72px] sm:h-24 sm:w-24 rounded-[2rem] border-2 border-dashed border-white/5 bg-white/5 opacity-50" />
                  <div className="h-[72px] w-[72px] sm:h-24 sm:w-24 rounded-[2rem] border-2 border-dashed border-white/5 bg-white/5 opacity-50" />
                </>
              )}
            </div>

            <div className="mt-4 flex flex-col items-center">
              <span className="text-[2rem] sm:text-[3.5rem] font-black text-white/90 leading-none tracking-tighter">
                {isRolling ? "?" : (dealerDice.length > 0 ? dealerSum : "-")}
              </span>
              <span className="text-xs font-bold text-white/30 uppercase mt-2">위협 수준</span>
            </div>
          </div>
        </div>
      </div>

      {/* Result Display: Compact and Premium */}
      <div className={clsx(
        "rounded-2xl border p-3 text-center shadow-xl transition-all duration-1000",
        "min-h-[52px]",
        resultConfig.bg,
        result ? "border-current/20 scale-100 opacity-100" : "border-white/5 scale-95 opacity-50"
      )}>
        <p className={clsx(
          "text-lg sm:text-2xl font-black tracking-[0.08em] italic uppercase drop-shadow-lg",
          resultConfig.color
        )}>
          {resultConfig.text}
        </p>
      </div>
    </div>
  );
};

export default DiceView;
