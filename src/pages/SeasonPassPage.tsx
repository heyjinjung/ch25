// TODO: [VERIFY] Ensure XP Bar DOES NOT move on Game Win/Mission Complete (Ref: L-03 Strict).
// TODO: [VERIFY] Ensure XP Bar updates ONLY when Admin inputs Deposit Data (Ref: L-01).
import React, { useEffect, useMemo, useRef } from "react";
import { useTodayRanking } from "../hooks/useRanking";
import { useSeasonPassStatus, useInternalWinStatus, useClaimSeasonReward } from "../hooks/useSeasonPass";
import FeatureGate from "../components/feature/FeatureGate";
import { useToast } from "../components/common/ToastProvider";
import clsx from "clsx";

/* Assets */
const ICON_NODE_CURRENT = "/assets/season_pass/icon_node_current.png";
const ICON_NODE_LOCKED = "/assets/season_pass/icon_node_locked.png";
const ICON_NODE_CLEARED = "/assets/season_pass/icon_node_cleared.png";

const formatCurrency = (value: number) => value.toLocaleString();

const SeasonPassPage: React.FC = () => {
  const season = useSeasonPassStatus();
  const ranking = useTodayRanking();
  const internalWins = useInternalWinStatus();
  const claimMutation = useClaimSeasonReward();
  const { addToast } = useToast();
  const lastSeasonLevelRef = useRef<number | null>(null);
  const lastClaimCountRef = useRef<number>(0);

  useEffect(() => {
    if (!season.data) return;
    const currentLevel = season.data.current_level;
    const claimedLevels = season.data.levels.filter((l) => l.is_claimed);

    if (lastSeasonLevelRef.current !== null && currentLevel > lastSeasonLevelRef.current) {
      addToast(`시즌 레벨 ${currentLevel} 달성!`, "success");
    }

    if (claimedLevels.length > lastClaimCountRef.current) {
      const latest = claimedLevels.sort((a, b) => a.level - b.level)[claimedLevels.length - 1];
      if (latest) addToast(`레벨 ${latest.level} 보상 지급`, "info");
    }

    lastSeasonLevelRef.current = currentLevel;
    lastClaimCountRef.current = claimedLevels.length;
  }, [season.data, addToast]);

  const external = ranking.data?.my_external_entry;
  const top10Needed = external?.rank && external.rank > 10 ? external.rank - 10 : 0;
  const deposit = external?.deposit_amount ?? 0;
  const depositRemainder = 100_000 - (deposit % 100_000 || 100_000);
  const playDone = (external?.play_count ?? 0) > 0;

  const seasonLevelSummary = useMemo(() => {
    if (season.isPending) return { title: "LV.--", detail: "레벨 불러오는 중", progressPct: 0 };
    if (season.isError || !season.data) return { title: "LV.ERR", detail: "데이터 로드 실패", progressPct: 0 };
    const { current_xp, current_level, max_level, levels } = season.data;
    const totalXp = Math.max(0, current_xp ?? 0);
    const maxRequired = Math.max(0, ...levels.map((l) => l.required_xp ?? 0));
    const isMax = current_level >= max_level || totalXp >= maxRequired;

    if (isMax) {
      return {
        title: "MAX LEVEL",
        detail: "모든 보상 달성!",
        progressPct: 100,
      };
    }

    const sortedByReq = [...levels].sort((a, b) => (a.required_xp ?? 0) - (b.required_xp ?? 0));
    const nextRow = sortedByReq.find((l) => (l.required_xp ?? 0) > totalXp);
    const prevRow = [...sortedByReq].reverse().find((l) => (l.required_xp ?? 0) <= totalXp);

    const startXp = Math.max(0, prevRow?.required_xp ?? 0);
    const endXp = Math.max(startXp + 1, nextRow?.required_xp ?? maxRequired);
    const targetLevel = nextRow?.level ?? Math.min(max_level, current_level + 1);

    const segmentXp = Math.max(0, totalXp - startXp);
    const segmentTotal = Math.max(1, endXp - startXp);
    const remaining = Math.max(0, endXp - totalXp);

    let progressPct = Math.floor((segmentXp / segmentTotal) * 100);
    if (remaining > 0) progressPct = Math.min(99, Math.max(0, progressPct));

    return {
      title: `Lv.${targetLevel}`,
      detail: `${remaining.toLocaleString()} XP 남음`,
      progressPct,
    };
  }, [season.data, season.isError, season.isPending]);

  const cards = [
    {
      icon: "👑",
      title: "랭킹 TOP10 달성",
      desc: "순위권 진입 시 스탬프 1개",
      status: external?.rank ? `현재 ${external.rank}위${top10Needed > 0 ? `, ${top10Needed}위 UP 필요` : " (완료)"}` : "랭킹 없음",
    },
    {
      icon: "📅",
      title: "매일 출석 플레이",
      desc: "게임 플레이 시 다이아 지급",
      status: playDone ? "완료" : "미완료",
    },
    {
      icon: "💎",
      title: "입금 미션",
      desc: "10만원 달성마다 XP 대량 지급",
      status: `${formatCurrency(depositRemainder)}원 남음`,
    },
    {
      icon: "🎮",
      title: "게임 승리 50회",
      desc: "누적 50승 시 다이아/키 지급",
      status: internalWins.data ? `남은 승리 ${internalWins.data.remaining}회` : "...",
    },
  ];

  if (season.isPending) return <div className="p-10 text-center text-white/50">Loading Pass...</div>;
  if (!season.data) return null;

  const data = season.data;

  return (
    <FeatureGate feature="SEASON_PASS">
      {/* Main Container: Even more distinct Khaki/Moss tint for background */}
      <div className="relative mx-auto max-w-lg min-h-screen bg-[#242714] pb-32 px-4 shadow-[0_0_100px_rgba(0,0,0,0.9)] border-x border-white/10">

        {/* --- 1. Premium Header: Darker, deeper gradient for contrast --- */}
        <section className="relative pt-8 group">
          <div className="absolute -inset-1 bg-gradient-to-r from-emerald-600 to-cyan-600 rounded-[2.5rem] blur-xl opacity-30"></div>
          <div className="relative rounded-[2rem] bg-[#0A0F0B] p-8 shadow-2xl border border-white/20 overflow-hidden">
            <div className="absolute inset-0 bg-[url('/images/pattern-vip.svg')] opacity-15 mix-blend-overlay" />
            <div className="absolute -right-16 -top-16 w-64 h-64 bg-emerald-500/20 blur-[90px] rounded-full" />

            <div className="relative z-10 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-3 py-1.5 rounded-full bg-gold-400 text-black text-[10px] font-black tracking-[0.2em] uppercase shadow-[0_0_20px_rgba(251,191,36,0.6)]">
                    내 레벨 확인
                  </span>
                </div>
                <h1 className="text-4xl font-black italic text-white leading-none tracking-tighter">
                  LEVEL <span className="text-figma-accent text-5xl">{data.current_level}</span>
                </h1>
                <div className="flex items-center gap-2 mt-2">
                  <div className="w-2 h-2 rounded-full bg-figma-accent animate-pulse shadow-[0_0_10px_#30FF75]" />
                  <p className="text-white font-black uppercase tracking-wider text-xs">{seasonLevelSummary.detail}</p>
                </div>
              </div>

              {/* Central Gauge */}
              <div className="relative w-24 h-24 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="48" cy="48" r="42" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/10" />
                  <circle
                    cx="48" cy="48" r="42"
                    stroke="currentColor" strokeWidth="8" fill="transparent"
                    className="text-figma-accent"
                    strokeDasharray={263.8}
                    strokeDashoffset={263.8 - (seasonLevelSummary.progressPct / 100) * 263.8}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)' }}
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-2xl font-black text-white">{seasonLevelSummary.progressPct}</span>
                  <span className="text-[10px] font-extrabold text-white/50 tracking-widest uppercase">%</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* --- 2. Dynamic Connected Timeline --- */}
        <div className="grid lg:grid-cols-1 gap-12 mt-12">
          <div className="relative pl-2">
            <div className="space-y-0 relative z-10">
              {data.levels.map((level, idx) => {
                const isClaimed = level.is_claimed;
                const isCurrent = data.current_level === level.level;
                const isNext = data.current_level + 1 === level.level;
                const isLockedState = isLocked(level, data.current_level);
                const isLast = idx === data.levels.length - 1;

                return (
                  <div key={level.level} className="relative flex flex-col">
                    {/* Vertical Segment Line - Runs from circle center to next circle center */}
                    {!isLast && (
                      <div className="absolute left-[28px] top-[24px] w-[4px] h-[calc(100%+16px)] z-0">
                        <div className={clsx(
                          "w-full h-full rounded-full transition-all duration-700",
                          isClaimed ? "bg-[#30FF75]" :
                            isCurrent ? "bg-gradient-to-b from-[#30FF75] to-white/10" : "bg-white/10"
                        )} />
                      </div>
                    )}

                    <div className="grid grid-cols-[60px_1fr] gap-0 items-start mb-8 overflow-hidden">
                      {/* Node Column - 60px width */}
                      <div className="relative flex items-center justify-center h-full min-h-[120px] pt-1">

                        {/* Connector Arm to Card */}
                        <div className={clsx(
                          "absolute left-[42px] top-[24px] h-[2px] w-[20px] z-0 transition-opacity rounded-full",
                          (isCurrent || isClaimed) ? "bg-[#30FF75]/80 shadow-[0_0_10px_#30FF75]" : "bg-white/10"
                        )} />



                        {/* Main Circle Node */}
                        <div className={clsx(
                          "relative w-12 h-12 rounded-full border-[3px] flex items-center justify-center transition-all z-20 shrink-0",
                          isCurrent ? "bg-black border-figma-accent shadow-[0_0_20px_#30FF75] scale-105" :
                            isClaimed ? "bg-black border-emerald-500" : "bg-[#111] border-white/10 opacity-80"
                        )}>
                          <img
                            src={isClaimed ? ICON_NODE_CLEARED : isLockedState ? ICON_NODE_LOCKED : (isCurrent || isNext) ? ICON_NODE_CURRENT : ICON_NODE_LOCKED}
                            alt="Status"
                            className={clsx("w-6 h-6 object-contain transition-all duration-500", isCurrent && "animate-pulse")}
                          />
                        </div>
                      </div>

                      {/* Reward Card: Robust responsive sizing */}
                      <div className={clsx(
                        "flex flex-col rounded-[1.75rem] p-5 border transition-all duration-700 relative overflow-hidden group/card shadow-[0_15px_40px_-5px_rgba(0,0,0,0.8)] min-w-0",
                        isCurrent ? "bg-black border-figma-accent shadow-[0_0_40px_rgba(48,255,117,0.05)]" :
                          isClaimed ? "bg-black/90 border-emerald-500/30 opacity-95" : "bg-black/40 border-white/5 opacity-50"
                      )}>
                        {/* Subtle internal shine */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none" />

                        <div className="flex justify-between items-start mb-4 gap-2">
                          <div className="flex flex-col gap-1 min-w-0 flex-1">
                            <span className={clsx(
                              "text-[9px] font-black uppercase tracking-[0.2em] truncate",
                              isCurrent ? "text-figma-accent" : "text-white/20"
                            )}>
                              MILESTONE {level.level}
                            </span>
                            <h3 className="text-xl font-black text-white leading-[1.1] tracking-tight break-keep">
                              {level.reward_label}
                            </h3>
                          </div>
                          {level.auto_claim && (
                            <div className="flex-shrink-0 flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full mt-1">
                              <span className="w-1 h-1 bg-emerald-400 rounded-full animate-pulse" />
                              <span className="text-[8px] font-black text-emerald-400 tracking-tighter uppercase">AUTO</span>
                            </div>
                          )}
                        </div>

                        {/* Progress Tracker Core */}
                        <div className="space-y-1.5 mb-5 mt-auto">
                          <div className="flex justify-between items-end">
                            <p className="text-[8px] font-black text-white/20 uppercase tracking-widest">EXP PROGRESS</p>
                            <p className="text-[10px] font-black text-white/80">{level.required_xp.toLocaleString()} <span className="text-white/20">XP</span></p>
                          </div>
                          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 relative">
                            <div
                              className={clsx("h-full rounded-full transition-all duration-[2s] ease-out shadow-lg", isClaimed ? "bg-emerald-500" : isCurrent ? "bg-figma-accent" : "bg-white/10")}
                              style={{ width: isClaimed ? '100%' : isCurrent ? `${seasonLevelSummary.progressPct}%` : '0%' }}
                            />
                          </div>
                        </div>

                        <button
                          disabled={!canClaim(level) || claimMutation.isPending}
                          onClick={() => claimMutation.mutate(level.level)}
                          className={clsx(
                            "w-full py-3.5 rounded-xl font-black text-xs transition-all tracking-[0.05em] relative overflow-hidden active:scale-[0.98] active:brightness-90",
                            canClaim(level) ? "bg-figma-primary text-white shadow-lg shadow-emerald-900/30" :
                              isClaimed ? "bg-white/5 text-white/30 border border-white/5" : "bg-white/5 text-white/10 border border-transparent"
                          )}
                        >
                          <span className="relative z-10 flex items-center justify-center gap-1.5 uppercase italic">
                            {isClaimed && <svg className="w-3.5 h-3.5 text-figma-accent" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                            {isClaimed ? "COLLECTED" : canClaim(level) ? "CLAIM REWARD" : "LOCKED"}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* --- 3. Mission Box: Higher Contrast --- */}
          <section className="space-y-8 mt-12 px-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-2 h-8 bg-figma-accent rounded-full shadow-[0_0_15px_#30FF75]" />
                <h3 className="text-2xl font-black italic text-white tracking-tight uppercase">Daily Missions</h3>
              </div>
              <span className="text-[10px] font-bold text-white/30 tracking-[0.2em] uppercase">Refreshes in 4h</span>
            </div>
            <div className="grid gap-6">
              {cards.map((card, i) => (
                <div key={i} className="group flex items-start gap-4 bg-black/50 p-4 rounded-2xl border border-white/5 hover:border-white/20 hover:bg-black/80 transition-all shadow-xl">
                  <div className="w-12 h-12 shrink-0 rounded-xl bg-[#111] flex items-center justify-center text-2xl border border-white/10 group-hover:scale-110 transition-all shadow-inner">
                    {card.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-white tracking-wide truncate">{card.title}</p>
                    <p className="text-[10px] text-white/40 font-bold mt-1 truncate">{card.desc}</p>
                    <div className={clsx(
                      "inline-flex text-[9px] font-black px-2.5 py-1 rounded-lg border uppercase tracking-wider mt-2",
                      card.status.includes("완료") ? "text-figma-accent bg-emerald-500/10 border-emerald-500/20" : "text-white/40 bg-white/5 border-white/10"
                    )}>
                      {card.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

      </div>
    </FeatureGate>
  );
};

// Helpers
function isLocked(level: any, currentLevel: number) {
  return level.level > currentLevel + 1; // Show next level as active-ish
}

function canClaim(level: any) {
  return level.is_unlocked && !level.is_claimed && !level.auto_claim;
}

export default SeasonPassPage;
