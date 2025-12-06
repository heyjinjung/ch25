// src/components/game/DiceView.tsx
import React from "react";

interface DiceViewProps {
  readonly userDice: number[];
  readonly dealerDice: number[];
  readonly result: "WIN" | "LOSE" | "DRAW" | null;
}

const DiceView: React.FC<DiceViewProps> = ({ userDice, dealerDice, result }) => {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-lg border border-emerald-800/40 bg-slate-900/70 p-4 text-center">
        <p className="text-sm text-emerald-200">내 주사위</p>
        <p className="mt-2 text-3xl font-bold text-white">{userDice.join(" · ") || "-"}</p>
      </div>
      <div className="rounded-lg border border-emerald-800/40 bg-slate-900/70 p-4 text-center">
        <p className="text-sm text-emerald-200">딜러 주사위</p>
        <p className="mt-2 text-3xl font-bold text-white">{dealerDice.join(" · ") || "-"}</p>
      </div>
      <div className="sm:col-span-2 rounded-lg border border-emerald-800/40 bg-slate-900/70 p-4 text-center">
        <p className="text-lg font-semibold text-emerald-100">결과</p>
        <p className="mt-2 text-2xl font-bold text-white">{result ?? "대기 중"}</p>
      </div>
    </div>
  );
};

export default DiceView;
