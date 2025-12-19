import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useSeasonPassStatus, useInternalWinStatus, useClaimSeasonReward } from "../../hooks/useSeasonPass";
import { useRouletteStatus } from "../../hooks/useRoulette";
import { useDiceStatus } from "../../hooks/useDice";
import { useLotteryStatus } from "../../hooks/useLottery";
import { useToast } from "../common/ToastProvider";

const baseAccent = "#d2fd9c";

const clampPct = (value: number) => Math.max(0, Math.min(100, value));

type TaskRow = {
  title: string;
  description: string;
  status: string;
  progressPct: number | null;
};

const PanelShell: React.FC<React.PropsWithChildren<{ title: string }>> = ({ title, children }) => (
  <motion.section
    className="rounded-[16px] border border-white/10 bg-black/30 p-5 backdrop-blur-sm"
    initial={{ opacity: 0, y: 14 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.35 }}
  >
    <div className="mb-4 flex items-center gap-3 border-b border-white/10 pb-3">
      <div className="h-8 w-[6px] rounded-full" style={{ backgroundColor: baseAccent }} />
      <h2 className="text-[20px] font-semibold text-white">{title}</h2>
    </div>
    {children}
  </motion.section>
);

const ProgressBar: React.FC<{ pct: number }> = ({ pct }) => (
  <div className="h-2 w-full overflow-hidden rounded-full border border-white/10 bg-black/40">
    <div className="h-full rounded-full" style={{ width: `${clampPct(pct)}%`, backgroundColor: baseAccent }} />
  </div>
);

export const SeasonPassRewardsAndTasks: React.FC = () => {
  const { addToast } = useToast();
  const season = useSeasonPassStatus();
  const internalWins = useInternalWinStatus();
  const roulette = useRouletteStatus();
  const dice = useDiceStatus();
  const lottery = useLotteryStatus();
  const claimReward = useClaimSeasonReward();
  const [pendingClaimLevel, setPendingClaimLevel] = useState<number | null>(null);

  const rewards = useMemo(() => {
    const levels = season.data?.levels ?? [];
    const currentLevel = season.data?.current_level ?? 0;
    const currentXp = season.data?.current_xp ?? 0;
    return levels
      .slice()
      .sort((a, b) => a.level - b.level)
      .map((lvl) => {
        const isCurrent = lvl.level === currentLevel;
        const isPast = lvl.level < currentLevel;
        const isUnlocked = lvl.is_unlocked || currentXp >= lvl.required_xp;
        return {
          ...lvl,
          isCurrent,
          isPast,
          isUnlocked,
        };
      });
  }, [season.data]);

  const tasks: TaskRow[] = useMemo(() => {
    const rows: TaskRow[] = [];

    const stamped = season.data?.today?.stamped;
    rows.push({
      title: "오늘 스탬프",
      description: "오늘 스탬프를 완료하면 보상이 진행됩니다.",
      status: stamped == null ? "데이터 없음" : stamped ? "완료" : "미완료",
      progressPct: stamped == null ? null : stamped ? 100 : 0,
    });

    const win = internalWins.data;
    if (win) {
      const done = Math.max(0, (win.threshold ?? 0) - (win.remaining ?? 0));
      const denom = Math.max(1, win.threshold ?? 1);
      rows.push({
        title: "겨울 게임 승리",
        description: "내부 승리 누적 목표 달성",
        status: `${done.toLocaleString()} / ${denom.toLocaleString()} (남은 ${Math.max(0, win.remaining ?? 0).toLocaleString()})`,
        progressPct: clampPct((done / denom) * 100),
      });
    } else {
      rows.push({
        title: "겨울 게임 승리",
        description: "내부 승리 누적 목표 달성",
        status: internalWins.isLoading ? "불러오는 중" : "데이터 없음",
        progressPct: null,
      });
    }

    const r = roulette.data?.remaining_spins;
    rows.push({
      title: "룰렛 경품",
      description: "남은 룰렛 이용 횟수",
      status: r == null ? (roulette.isLoading ? "불러오는 중" : "데이터 없음") : `${r}회`,
      progressPct: null,
    });

    const d = dice.data?.remaining_plays;
    rows.push({
      title: "레벨 주사위",
      description: "남은 주사위 이용 횟수",
      status: d == null ? (dice.isLoading ? "불러오는 중" : "데이터 없음") : `${d}회`,
      progressPct: null,
    });

    const l = lottery.data?.remaining_plays;
    rows.push({
      title: "랜덤 복권",
      description: "남은 복권 이용 티켓",
      status: l == null ? (lottery.isLoading ? "불러오는 중" : "데이터 없음") : `${l}장`,
      progressPct: null,
    });

    return rows;
  }, [season.data?.today?.stamped, internalWins.data, internalWins.isLoading, roulette.data?.remaining_spins, roulette.isLoading, dice.data?.remaining_plays, dice.isLoading, lottery.data?.remaining_plays, lottery.isLoading]);

  return (
    <div className="w-full">
      <div className="mx-auto flex w-full max-w-[980px] flex-col gap-5 lg:flex-row">
        <div className="w-full lg:w-3/5">
          <PanelShell title="레벨 보상">
            {season.isLoading ? (
              <p className="text-[12px] text-white/60">불러오는 중...</p>
            ) : season.isError ? (
              <p className="text-[12px] text-white/60">보상 정보를 불러오지 못했습니다.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {rewards.map((reward) => {
                  const stateTone = reward.isCurrent
                    ? "border border-white/20 bg-[#394508]/30"
                    : reward.isPast
                      ? "border border-white/10 bg-black/30"
                      : "border border-white/10 bg-black/50";

                  const labelTone = reward.isCurrent
                    ? "text-[#d2fd9c]"
                    : reward.isPast
                      ? "text-white"
                      : "text-white/60";

                  const canClaim = reward.isUnlocked && !reward.is_claimed && !reward.auto_claim;
                  const isPending = pendingClaimLevel === reward.level && claimReward.isPending;

                  return (
                    <motion.div
                      key={reward.level}
                      className={`rounded-[14px] p-4 ${stateTone}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.22 }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`text-[14px] font-semibold ${labelTone}`}>레벨 {reward.level}</p>
                            {reward.isCurrent && (
                              <span className="rounded-full bg-[#d2fd9c] px-2 py-0.5 text-[11px] font-bold text-black">
                                현재
                              </span>
                            )}
                            {!reward.isUnlocked && (
                              <span className="rounded-full border border-white/10 bg-black/30 px-2 py-0.5 text-[11px] text-white/60">
                                잠금
                              </span>
                            )}
                            {reward.auto_claim && (
                              <button
                                type="button"
                                className="rounded-full border border-white/10 bg-black/30 px-2 py-0.5 text-[11px] text-white/70 hover:border-white/20"
                                onClick={() => {
                                  addToast(
                                    "자동지급 보상입니다. 레벨 달성 후 자동 반영돼요. 지금은 룰렛/주사위/복권으로 XP를 더 모아보세요.",
                                    "info"
                                  );
                                }}
                              >
                                자동지급
                              </button>
                            )}
                          </div>
                          <p className="mt-2 truncate text-[13px] text-white/85">{reward.reward_label}</p>
                        </div>

                        <div className="shrink-0 text-right">
                          <p className="text-[12px] text-white/60">필요 XP</p>
                          <p className="text-[12px] font-semibold text-white/80">{reward.required_xp.toLocaleString()}</p>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          {reward.is_claimed ? (
                            <span className="text-[12px] font-semibold" style={{ color: baseAccent }}>
                              지급완료
                            </span>
                          ) : reward.isUnlocked ? (
                            <span className="text-[12px] text-white/70">획득 가능</span>
                          ) : (
                            <span className="text-[12px] text-white/50">잠금</span>
                          )}
                        </div>

                        {canClaim ? (
                          <button
                            type="button"
                            disabled={isPending}
                            className={
                              "rounded-[10px] px-3 py-2 text-[12px] font-semibold " +
                              (isPending
                                ? "cursor-not-allowed bg-white/10 text-white/50"
                                : "bg-[#d2fd9c] text-black hover:brightness-95")
                            }
                            onClick={async () => {
                              try {
                                setPendingClaimLevel(reward.level);
                                const res = await claimReward.mutateAsync(reward.level);
                                const msg = res.message || `${res.level}레벨 보상 지급 완료`;
                                addToast(msg, "success");
                              } catch (e) {
                                addToast("보상 지급에 실패했습니다. 잠시 후 다시 시도해 주세요.", "error");
                              } finally {
                                setPendingClaimLevel(null);
                              }
                            }}
                          >
                            {isPending ? "지급 중..." : "보상 받기"}
                          </button>
                        ) : null}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </PanelShell>
        </div>

        <div className="w-full lg:w-2/5">
          <PanelShell title="오늘 할 일">
            <div className="flex flex-col gap-4">
              {tasks.map((task) => (
                <div key={task.title} className="rounded-[14px] border border-white/10 bg-black/35 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold" style={{ color: baseAccent }}>
                        {task.title}
                      </p>
                      <p className="mt-1 text-[12px] text-white/70">{task.description}</p>
                    </div>
                    <p className="shrink-0 text-[12px] text-white/70">{task.status}</p>
                  </div>

                  {typeof task.progressPct === "number" && (
                    <div className="mt-3">
                      <ProgressBar pct={task.progressPct} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </PanelShell>
        </div>
      </div>
    </div>
  );
};

export default SeasonPassRewardsAndTasks;
