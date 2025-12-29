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
      "relative h-24 w-24 flex items-center justify-center transition-all duration-500",
      isRolling && "animate-[bounce_0.5s_infinite_alternate]"
    )} style={{ animationDelay: delay }}>

      {/* Glow Effect */}
      <div className={clsx(
        "absolute inset-0 rounded-full blur-2xl transition-opacity duration-1000",
        isRolling ? "bg-figma-accent/20 opacity-100" : "bg-white/5 opacity-0"
      )} />

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
        return { text: "VICTORY", color: "text-[#30FF75]", bg: "bg-emerald-500/10" };
      case "LOSE":
        return { text: "DEFEAT", color: "text-red-500", bg: "bg-red-500/10" };
      case "DRAW":
        return { text: "DRAW", color: "text-amber-400", bg: "bg-amber-500/10" };
    }
  }, [result]);

  return (
    <div className="space-y-12">
      {/* Battle Columns */}
      <div className="grid gap-8 grid-cols-1 md:grid-cols-2 relative h-full">

        {/* VS Label for desktop */}
        <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          <div className="w-16 h-16 rounded-full bg-black border border-white/10 flex items-center justify-center shadow-[0_0_30px_rgba(0,0,0,0.8)]">
            <span className="text-2xl font-black italic text-white/20">VS</span>
          </div>
        </div>

        {/* User Side */}
        <div className={clsx(
          "relative rounded-[2rem] border p-8 transition-all duration-700",
          result === "WIN" ? "bg-[#30FF75]/5 border-[#30FF75]/30 shadow-[0_0_50px_rgba(48,255,117,0.1)]" : "bg-white/5 border-white/10"
        )}>
          <div className="flex flex-col items-center">
            <div className="mb-6 flex items-center gap-2 px-4 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <span className="text-xs font-black uppercase tracking-[0.2em] text-[#30FF75]">My Squad</span>
            </div>

            <div className="flex justify-center gap-4 min-h-[96px]">
              {userDice.length > 0 || isRolling ? (
                (isRolling ? [1, 1] : userDice).map((val, i) => (
                  <DiceFace key={i} value={val} isRolling={isRolling} delay={`${i * 0.1}s`} />
                ))
              ) : (
                <>
                  <div className="h-24 w-24 rounded-[2rem] border-2 border-dashed border-white/5 bg-white/5 animate-pulse" />
                  <div className="h-24 w-24 rounded-[2rem] border-2 border-dashed border-white/5 bg-white/5 animate-pulse" />
                </>
              )}
            </div>

            <div className="mt-8 flex flex-col items-center">
              <span className="text-[4rem] font-black text-white leading-none tracking-tighter">
                {isRolling ? "?" : (userDice.length > 0 ? userSum : "-")}
              </span>
              <span className="text-xs font-bold text-white/30 uppercase mt-2">Battle Power</span>
            </div>
          </div>
        </div>

        {/* Dealer Side */}
        <div className={clsx(
          "relative rounded-[2rem] border p-8 transition-all duration-700",
          result === "LOSE" ? "bg-red-500/5 border-red-500/30 shadow-[0_0_50px_rgba(239,68,68,0.1)]" : "bg-white/5 border-white/10"
        )}>
          <div className="flex flex-col items-center">
            <div className="mb-6 flex items-center gap-2 px-4 py-1 rounded-full bg-white/5 border border-white/10">
              <span className="text-xs font-black uppercase tracking-[0.2em] text-white/60">Dealer</span>
            </div>

            <div className="flex justify-center gap-4 min-h-[96px]">
              {dealerDice.length > 0 || isRolling ? (
                (isRolling ? [1, 1] : dealerDice).map((val, i) => (
                  <DiceFace key={i} value={val} isRolling={isRolling} delay={`${i * 0.15}s`} />
                ))
              ) : (
                <>
                  <div className="h-24 w-24 rounded-[2rem] border-2 border-dashed border-white/5 bg-white/5 opacity-50" />
                  <div className="h-24 w-24 rounded-[2rem] border-2 border-dashed border-white/5 bg-white/5 opacity-50" />
                </>
              )}
            </div>

            <div className="mt-8 flex flex-col items-center">
              <span className="text-[4rem] font-black text-white/90 leading-none tracking-tighter">
                {isRolling ? "?" : (dealerDice.length > 0 ? dealerSum : "-")}
              </span>
              <span className="text-xs font-bold text-white/30 uppercase mt-2">Threat Level</span>
            </div>
          </div>
        </div>
      </div>

      {/* Result Display: Simplified and Premium */}
      <div className={clsx(
        "rounded-[2rem] border p-6 text-center shadow-2xl transition-all duration-1000",
        resultConfig.bg,
        result ? "border-current/20 scale-100 opacity-100" : "border-white/5 scale-95 opacity-50"
      )}>
        <p className={clsx(
          "text-4xl font-[1000] tracking-[0.1em] italic uppercase drop-shadow-2xl",
          resultConfig.color
        )}>
          {resultConfig.text}
        </p>
      </div>
    </div>
  );
};

export default DiceView;
