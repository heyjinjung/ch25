import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Gift, Clock, TrendingUp } from "lucide-react";
import { fetchSeasons, fetchSeasonLevels } from "../../api/adminSeasonApi";
import dayjs from "dayjs";
import styles from "./SeasonOpsBoard.module.css";

const SeasonOpsBoard: React.FC = () => {
  // Fetch active season
  const { data: seasonsData, isLoading: isSeasonLoading } = useQuery({
    queryKey: ["admin", "seasons", "active"],
    queryFn: () => fetchSeasons({ is_active: true, size: 1 }),
  });

  const activeSeason = seasonsData?.items?.[0];

  // Fetch season levels
  const { data: levelsData, isLoading: isLevelsLoading } = useQuery({
    queryKey: ["admin", "season", activeSeason?.id, "levels"],
    queryFn: () => fetchSeasonLevels(activeSeason!.id),
    enabled: !!activeSeason,
  });

  const timeLeft = useMemo(() => {
    if (!activeSeason) return null;
    const end = dayjs(activeSeason.end_date);
    const now = dayjs();
    const totalHours = end.diff(now, "hour");
    const days = end.diff(now, "day");
    const hours = ((totalHours % 24) + 24) % 24;
    return { days, hours };
  }, [activeSeason]);

  const progress = useMemo(() => {
    if (!activeSeason) return 0;
    const start = new Date(activeSeason.start_date).getTime();
    const end = new Date(activeSeason.end_date).getTime();
    const now = new Date().getTime();
    const total = end - start;
    const current = now - start;
    return Math.min(Math.max((current / total) * 100, 0), 100);
  }, [activeSeason]);

  if (isSeasonLoading || (activeSeason && isLevelsLoading)) {
    return (
      <div className="admin-card-premium p-6 flex items-center justify-center min-h-[300px]">
        <Clock className="h-8 w-8 text-admin-brand animate-spin" />
      </div>
    );
  }

  if (!activeSeason) {
    return (
      <div className="admin-card-premium p-6 flex flex-col items-center justify-center min-h-[300px] text-center gap-4">
        <div className="p-4 rounded-full bg-admin-sidebar border border-admin-border">
          <Calendar className="h-8 w-8 text-admin-text-muted" />
        </div>
        <div>
          <h3 className="text-admin-subtitle text-admin-text-primary">
            진행 중인 ?�즌 ?�음
          </h3>
          <p className="text-admin-body text-admin-text-secondary mt-1">
            ?�로???�즌???�약?�거???�성?�해주세??
          </p>
        </div>
        <button className="btn-admin-primary mt-2">?�즌 관�?바로가�?</button>
      </div>
    );
  }

  const levels = levelsData?.levels || [];
  const totalRewardsValue = levels.reduce(
    (acc, lvl) => acc + lvl.reward_amount,
    0,
  );

  return (
    <div className="bg-zinc-800/60 backdrop-blur-xl border border-white/5 rounded-xl p-8 h-full flex flex-col justify-between relative overflow-hidden group">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none group-hover:bg-indigo-500/10 transition-all duration-700"></div>

      {/* Header / Countdown */}
      <div className="flex flex-col gap-8 relative z-10 w-full">
        <div className="flex justify-between items-start">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="px-2 py-0.5 rounded bg-indigo-500/20 border border-indigo-500/30 text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
                Current Season
              </div>
              <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-widest">
                {activeSeason.name}
              </h2>
            </div>

            <div className="flex items-baseline gap-1">
              {timeLeft ? (
                <>
                  <span className="text-5xl font-light text-white tracking-tighter tabular-nums">
                    D-{timeLeft.days}
                  </span>
                  <span className="text-lg text-zinc-500 font-light ml-2">
                    {timeLeft.hours}?�간 ?�음
                  </span>
                </>
              ) : (
                <span className="text-4xl font-light text-zinc-500 tracking-tight">
                  ?�즌 종료
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Gradient Progress Bar */}
        <div className="space-y-3 w-full max-w-[920px]">
          <div className="h-3 bg-zinc-900 border border-white/5 rounded-full overflow-hidden relative">
            <progress
              value={progress}
              max={100}
              className={styles.progressBar}
              aria-label="시즌 진행률"
            />
          </div>
          <div className="flex justify-between text-[10px] font-light text-zinc-500">
            <span>
              ?�작 {dayjs(activeSeason.start_date).format("YYYY-MM-DD")}
            </span>
            <span>
              종료 {dayjs(activeSeason.end_date).format("YYYY-MM-DD")}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-6 mt-8 relative z-10 border-t border-white/5 pt-8">
        {/* Total Rewards */}
        <div className="flex flex-col gap-2 p-4 rounded-xl border border-white/5 bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <Gift className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
              ?�체 보상
            </span>
          </div>
          <span className="text-2xl font-black text-zinc-200">
            {totalRewardsValue.toLocaleString()}
          </span>
          <span className="text-[10px] text-zinc-600">총합</span>
        </div>

        {/* Participation */}
        <div className="flex flex-col gap-2 p-4 rounded-xl border border-white/5 bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
              참여
            </span>
          </div>
          <span className="text-2xl font-black text-zinc-200">--</span>
          <span className="text-[10px] text-zinc-600">?�성 ?�레?�어</span>
        </div>
      </div>
    </div>
  );
};

export default SeasonOpsBoard;
