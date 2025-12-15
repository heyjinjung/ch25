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
      className={`grid h-16 w-16 grid-cols-3 grid-rows-3 gap-1 rounded-xl border-2 border-gold-500/50 bg-gradient-to-br from-slate-100 to-slate-300 p-2 shadow-lg ${
        isRolling ? "animate-spin-fast" : ""
      }`}
    >
      {dots.map((pos, i) => (
        <div key={i} className={`${pos} flex items-center justify-center`}>
          <div className="h-2.5 w-2.5 rounded-full bg-slate-900 shadow-inner" />
        </div>
      ))}
    </div>
  );
};

const DiceView: React.FC<DiceViewProps> = ({ userDice, dealerDice, result, isRolling }) => {
  const userSum = userDice.reduce((a, b) => a + b, 0);
  const dealerSum = dealerDice.reduce((a, b) => a + b, 0);

  const resultConfig = useMemo(() => {
    if (!result) return { text: "주사위를 굴려보세요!", color: "text-slate-300", bg: "bg-slate-800/60" };
    switch (result) {
      case "WIN": return { text: "🎉 승리!", color: "text-emerald-400", bg: "bg-emerald-900/40" };
      case "LOSE": return { text: "😢 패배", color: "text-red-400", bg: "bg-red-900/40" };
      case "DRAW": return { text: "🤝 무승부", color: "text-gold-400", bg: "bg-gold-900/40" };
    }
  }, [result]);

  return (
    <div className="space-y-6">
      {/* Battle area */}
      <div className="grid gap-6 sm:grid-cols-2">
        {/* User dice */}
        <div className="rounded-2xl border border-emerald-700/40 bg-gradient-to-br from-emerald-950/80 to-slate-900/80 p-6 text-center shadow-lg">
          <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-emerald-300">👤 나의 주사위</p>
          <div className="flex justify-center gap-3">
            {userDice.length > 0 ? (
              userDice.map((val, i) => <DiceFace key={i} value={val} isRolling={isRolling} />)
            ) : (
              <>
                <div className="h-16 w-16 rounded-xl border-2 border-dashed border-slate-600 bg-slate-800/40" />
                <div className="h-16 w-16 rounded-xl border-2 border-dashed border-slate-600 bg-slate-800/40" />
              </>
            )}
          </div>
          <p className="mt-3 text-2xl font-bold text-white">{userDice.length > 0 ? userSum : "-"}</p>
        </div>

        {/* Dealer dice */}
        <div className="rounded-2xl border border-red-700/40 bg-gradient-to-br from-red-950/80 to-slate-900/80 p-6 text-center shadow-lg">
          <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-red-300">🎰 딜러 주사위</p>
          <div className="flex justify-center gap-3">
            {dealerDice.length > 0 ? (
              dealerDice.map((val, i) => <DiceFace key={i} value={val} isRolling={isRolling} />)
            ) : (
              <>
                <div className="h-16 w-16 rounded-xl border-2 border-dashed border-slate-600 bg-slate-800/40" />
                <div className="h-16 w-16 rounded-xl border-2 border-dashed border-slate-600 bg-slate-800/40" />
              </>
            )}
          </div>
          <p className="mt-3 text-2xl font-bold text-white">{dealerDice.length > 0 ? dealerSum : "-"}</p>
        </div>
      </div>

      {/* Result display */}
      <div className={`rounded-2xl border border-gold-600/30 ${resultConfig.bg} p-6 text-center shadow-lg`}>
        <p className={`text-3xl font-bold ${resultConfig.color}`}>{resultConfig.text}</p>
        {result && userDice.length > 0 && (
          <p className="mt-2 text-sm text-slate-300">
            {userSum} vs {dealerSum}
          </p>
        )}
      </div>
    </div>
  );
};

export default DiceView;
