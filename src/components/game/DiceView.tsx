// src/components/game/DiceView.tsx
import { useMemo } from "react";

interface DiceViewProps {
  readonly userDice: number[];
  readonly dealerDice: number[];
  readonly result: "WIN" | "LOSE" | "DRAW" | null;
  readonly isRolling?: boolean;
}

const DiceFace: React.FC<{ value: number; isRolling?: boolean }> = ({ value, isRolling }) => {
  const dots = useMemo(() => {
    const positions: Record<number, string[]> = {
      1: ["col-start-2 row-start-2"],
      2: ["col-start-1 row-start-1", "col-start-3 row-start-3"],
      3: ["col-start-1 row-start-1", "col-start-2 row-start-2", "col-start-3 row-start-3"],
      4: ["col-start-1 row-start-1", "col-start-3 row-start-1", "col-start-1 row-start-3", "col-start-3 row-start-3"],
      5: ["col-start-1 row-start-1", "col-start-3 row-start-1", "col-start-2 row-start-2", "col-start-1 row-start-3", "col-start-3 row-start-3"],
      6: ["col-start-1 row-start-1", "col-start-1 row-start-2", "col-start-1 row-start-3", "col-start-3 row-start-1", "col-start-3 row-start-2", "col-start-3 row-start-3"],
    };
    return positions[value] || [];
  }, [value]);

  return (
    <div
      className={`grid h-16 w-16 grid-cols-3 grid-rows-3 gap-1 rounded-2xl border-2 border-white/10 bg-gradient-to-br from-white to-cc-lime/70 p-2 shadow-[0_10px_24px_rgba(0,0,0,0.45)] ${
        isRolling ? "animate-spin-fast" : ""
      }`}
    >
      {dots.map((pos, i) => (
        <div key={i} className={`${pos} flex items-center justify-center`}>
          <div className="h-2.5 w-2.5 rounded-full bg-cc-olive shadow-inner" />
        </div>
      ))}
    </div>
  );
};

const DiceView: React.FC<DiceViewProps> = ({ userDice, dealerDice, result, isRolling }) => {
  const userSum = userDice.reduce((a, b) => a + b, 0);
  const dealerSum = dealerDice.reduce((a, b) => a + b, 0);

  const resultConfig = useMemo(() => {
    if (!result) return { text: "주사위를 굴려보세요!", color: "text-white/70", bg: "bg-white/5" };
    switch (result) {
      case "WIN":
        return { text: "🎉 승리!", color: "text-cc-lime", bg: "bg-cc-green/15" };
      case "LOSE":
        return { text: "😢 패배", color: "text-white/80", bg: "bg-white/5" };
      case "DRAW":
        return { text: "🤝 무승부", color: "text-cc-teal", bg: "bg-cc-teal/12" };
    }
  }, [result]);

  return (
    <div className="space-y-6">
      {/* Battle area */}
      <div className="grid gap-6 sm:grid-cols-2">
        {/* User dice */}
        <div className="rounded-3xl border border-white/15 bg-white/5 p-5 text-center shadow-[0_14px_40px_rgba(0,0,0,0.55)] sm:p-6">
          <p className="mb-4 text-[clamp(14px,2.6vw,16px)] font-extrabold uppercase tracking-[0.35em] text-cc-lime">👤 나의 주사위</p>
          <div className="flex justify-center gap-3">
            {userDice.length > 0 ? (
              userDice.map((val, i) => <DiceFace key={i} value={val} isRolling={isRolling} />)
            ) : (
              <>
                <div className="h-16 w-16 rounded-2xl border-2 border-dashed border-white/20 bg-white/5" />
                <div className="h-16 w-16 rounded-2xl border-2 border-dashed border-white/20 bg-white/5" />
              </>
            )}
          </div>
          <p className="mt-3 text-[clamp(22px,5vw,30px)] font-extrabold text-white">{userDice.length > 0 ? userSum : "-"}</p>
        </div>

        {/* Dealer dice */}
        <div className="rounded-3xl border border-white/15 bg-white/5 p-5 text-center shadow-[0_14px_40px_rgba(0,0,0,0.55)] sm:p-6">
          <p className="mb-4 text-[clamp(14px,2.6vw,16px)] font-extrabold uppercase tracking-[0.35em] text-white/90">🎰 딜러 주사위</p>
          <div className="flex justify-center gap-3">
            {dealerDice.length > 0 ? (
              dealerDice.map((val, i) => <DiceFace key={i} value={val} isRolling={isRolling} />)
            ) : (
              <>
                <div className="h-16 w-16 rounded-2xl border-2 border-dashed border-white/20 bg-white/5" />
                <div className="h-16 w-16 rounded-2xl border-2 border-dashed border-white/20 bg-white/5" />
              </>
            )}
          </div>
          <p className="mt-3 text-[clamp(22px,5vw,30px)] font-extrabold text-white">{dealerDice.length > 0 ? dealerSum : "-"}</p>
        </div>
      </div>

      {/* Result display */}
      <div className={`rounded-3xl border border-white/15 ${resultConfig.bg} p-6 text-center shadow-[0_14px_40px_rgba(0,0,0,0.55)]`}>
        <p className={`text-[clamp(22px,5vw,32px)] font-extrabold ${resultConfig.color}`}>{resultConfig.text}</p>
        {result && userDice.length > 0 && (
          <p className="mt-2 text-[clamp(12px,2.6vw,14px)] text-white/60">
            {userSum} vs {dealerSum}
          </p>
        )}
      </div>
    </div>
  );
};

export default DiceView;
