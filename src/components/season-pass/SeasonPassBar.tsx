// src/components/season-pass/SeasonPassBar.tsx
import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useSeasonPassStatus } from "../../hooks/useSeasonPass";

const SeasonPassBar: React.FC = () => {
  const { data, isLoading, isError } = useSeasonPassStatus();
  const navigate = useNavigate();

  const progressPercent = useMemo(() => {
    if (!data) return 0;
    const totalXp = data.next_level_xp || 1;
    const clampedXp = Math.min(Math.max(data.current_xp, 0), totalXp);
    return Math.min(100, Math.round((clampedXp / totalXp) * 100));
  }, [data]);

  const label = useMemo(() => {
    if (isLoading) return "시즌 패스 정보를 불러오는 중...";
    if (isError) return "시즌 패스 정보를 가져올 수 없습니다.";
    if (!data) return "현재 활성화된 시즌 패스가 없습니다.";
    return `Lv.${data.current_level} / ${data.max_level} (XP ${data.current_xp} / ${data.next_level_xp})`;
  }, [data, isError, isLoading]);

  return (
    <button
      type="button"
      onClick={() => navigate("/season-pass")}
      className="flex w-full items-center gap-3 rounded-xl border border-emerald-700/50 bg-emerald-900/40 px-4 py-3 text-left shadow-md shadow-emerald-950/40 transition hover:border-emerald-400 hover:bg-emerald-800/40"
    >
      <span className="text-2xl" role="img" aria-label="season-pass">
        🎁
      </span>
      <div className="flex-1 space-y-1">
        <p className="text-sm font-semibold text-emerald-100">시즌 패스 진행도</p>
        <div className="flex items-center justify-between text-xs text-emerald-200">
          <span>{label}</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-emerald-950/80">
          <div
            className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
      <span className="text-sm font-semibold text-emerald-100">자세히 보기 →</span>
    </button>
  );
};

export default SeasonPassBar;
