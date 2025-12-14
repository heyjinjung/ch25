import React, { useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTodayRanking } from "../hooks/useRanking";
import { useSeasonPassStatus, useInternalWinStatus, useClaimSeasonReward } from "../hooks/useSeasonPass";
import FeatureGate from "../components/feature/FeatureGate";
import { useToast } from "../components/common/ToastProvider";

const formatCurrency = (value: number) => value.toLocaleString();

const SeasonPassPage: React.FC = () => {
  const navigate = useNavigate();
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
    if (season.isLoading) return { detail: "레벨 불러오는 중", progressPct: 0 };
    if (season.isError || !season.data) return { detail: "레벨 정보를 불러오지 못했습니다", progressPct: 0 };
    const { current_xp, next_level_xp, current_level, max_level } = season.data;
    const isMax = current_level >= max_level;
    const progressPct = isMax
      ? 100
      : next_level_xp > 0
      ? Math.min(100, Math.round((current_xp / next_level_xp) * 100))
      : 0;
    const remaining = next_level_xp > current_xp ? next_level_xp - current_xp : 0;
    return {
      detail: isMax ? "최대 레벨 달성" : `다음 레벨까지 ${remaining.toLocaleString()} XP`,
      progressPct,
    };
  }, [season.data, season.isError, season.isLoading]);

  const cards = [
    {
      icon: "🎄",
      title: "CC랭킹 TOP10",
      desc: "순위가 10위 안에 들면 스탬프 1개",
      status: external?.rank ? `현재 ${external.rank}위${top10Needed > 0 ? `, ${top10Needed}위 상승 필요` : " (완료)"}` : "랭킹 데이터 없음",
    },
    {
      icon: "❄️",
      title: "CC사이트 일일이용",
        desc: "10만원 단위 플레이 시 20XP 지급",
      status: playDone ? "완료" : "미완료",
    },
    {
      icon: "🎁",
      title: "CC 입금 10만원마다",
      desc: "10만원 달성할 때마다 스탬프 1개",
      status: `누적 ${formatCurrency(deposit)}원 / 다음까지 ${depositRemainder === 100_000 ? "0" : formatCurrency(depositRemainder)}원`,
    },
    {
      icon: "⛄",
      title: "크리스마스게임 승리 50회",
      desc: "승리 누적 50회 달성 시 스탬프 1개",
      status: internalWins.data
        ? `누적 승리 ${internalWins.data.total_wins}회 / 남은 ${internalWins.data.remaining}회`
        : internalWins.isLoading
        ? "집계 중..."
        : "집계 실패",
    },
  ];

  if (season.isLoading) {
    return (
      <FeatureGate feature="SEASON_PASS">
        <section className="flex flex-col items-center justify-center rounded-3xl border border-emerald-800/30 bg-slate-950/80 p-10">
          <div className="h-12 w-12 animate-spin rounded-full border-3 border-emerald-500/70 border-t-transparent" />
          <p className="mt-4 text-base font-semibold text-emerald-100">시즌패스 불러오는 중...</p>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="mt-4 rounded-full border border-emerald-600/60 px-4 py-2 text-xs font-semibold text-emerald-100 hover:bg-emerald-900/40"
          >
            홈으로
          </button>
        </section>
      </FeatureGate>
    );
  }

  if (season.isError || !season.data) {
    return (
      <FeatureGate feature="SEASON_PASS">
        <section className="rounded-3xl border border-red-800/40 bg-slate-950/85 p-8 text-center">
          <div className="mb-3 text-4xl">☃️</div>
          <p className="text-lg font-bold text-red-100">시즌패스를 불러오지 못했습니다.</p>
          <p className="mt-2 text-sm text-slate-300">잠시 후 다시 시도하거나 지민이에게 문의해주세요.</p>
          <div className="mt-4 flex justify-center gap-2">
            <button
              type="button"
              onClick={() => levelXp.refetch()}
              className="rounded-full border border-slate-600 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800"
            >
              다시 시도
            </button>
            <button
              type="button"
              onClick={() => navigate("/")}
              className="rounded-full border border-emerald-600/60 px-4 py-2 text-xs font-semibold text-emerald-100 hover:bg-emerald-900/40"
            >
              홈으로
            </button>
          </div>
        </section>
      </FeatureGate>
    );
  }

  const data = season.data;
  const stampXp = (data as any)?.base_xp_per_stamp ?? 0;
  const snowPattern = {
    backgroundImage:
      "radial-gradient(circle at 10% 20%, rgba(255,255,255,0.05) 1px, transparent 1px)," +
      "radial-gradient(circle at 80% 10%, rgba(255,255,255,0.06) 1px, transparent 1px)," +
      "radial-gradient(circle at 30% 70%, rgba(255,255,255,0.05) 1px, transparent 1px)",
    backgroundSize: "120px 120px, 160px 160px, 140px 140px",
  } as React.CSSProperties;

  return (
    <FeatureGate feature="SEASON_PASS">
      <section className="space-y-8 rounded-3xl border border-emerald-800/40 bg-slate-950/90 p-6 md:p-8" style={snowPattern}>
        <header className="space-y-3 text-center">
          <p className="text-xs uppercase tracking-[0.28em] text-emerald-200">Season Pass</p>
          <h1 className="text-3xl font-bold text-white">🎄 크리스마스 시즌패스</h1>
          <p className="text-sm text-slate-300">지민이와 함께하는 겨울 시즌 패스</p>
          <div className="mx-auto max-w-2xl space-y-2">
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-slate-200">
              <span className="rounded-full border border-emerald-600/50 px-3 py-1">스탬프당 {stampXp.toLocaleString()} XP</span>
              <button
                type="button"
                onClick={() => season.refetch()}
                className="rounded-full border border-slate-700 px-3 py-1 text-[11px] text-slate-200 hover:bg-slate-800"
              >
                새로고침
              </button>
              <button
                type="button"
                onClick={() => navigate("/")}
                className="rounded-full border border-emerald-600/60 px-3 py-1 text-[11px] text-emerald-100 hover:bg-emerald-900/40"
              >
                홈으로
              </button>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-emerald-500"
                style={{ width: `${seasonLevelSummary.progressPct ?? 0}%` }}
              />
            </div>
            <p className="text-xs text-slate-300">{seasonLevelSummary.detail}</p>
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-200">현재 레벨 {season.data?.current_level ?? "-"}</div>
              <div className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">MAX {data.max_level}레벨</div>
            </div>
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-white">레벨 보상</h2>
              <div className="grid gap-3 sm:grid-cols-2">
            {data.levels.map((level) => {
              const isAuto = !!level.auto_claim;
              const canClaim = !isAuto && level.is_unlocked && !level.is_claimed;
              // 시즌 2차 보상 표 (10레벨)
              const rewardOverride: Record<number, string> = {
                1: "룰렛 티켓 1장",
                2: "주사위 티켓 1장",
                3: "룰렛 1장 + 주사위 1장",
                4: "복권 티켓 1장",
                5: "CC 코인 1개",
                6: "주사위 2장 + 복권 1장",
                7: "CC 코인 2개",
                8: "쿠팡상품권 1만원",
                9: "CC 포인트 2만",
                10: "CC 포인트 5만",
              };
              const levelIcon: Record<number, string> = {
                1: "🎄",
                2: "⭐",
                3: "🎄",
                4: "⭐",
                5: "🎄",
                6: "⭐",
                7: "🎄",
                8: "⭐",
                9: "🎄",
                10: "⭐",
              };
              const displayReward = rewardOverride[level.level] ?? level.reward_label;
              const buttonLabel = level.is_claimed
                ? "지급완료"
                : isAuto && level.is_unlocked
                ? "자동지급"
                : canClaim
                ? "지민이 요청"
                : "잠금";
              return (
                <article
                  key={level.level}
                  className={`rounded-xl border p-4 transition ${
                    canClaim
                      ? "border-amber-400 bg-slate-900"
                      : level.is_claimed
                      ? "border-emerald-500/60 bg-slate-900"
                      : "border-slate-700 bg-slate-900"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-200">
                      <span className="mr-2" aria-hidden>{levelIcon[level.level] ?? "🎄"}</span>
                      레벨 {level.level}
                    </span>
                    <span className="text-xs text-slate-400">필요 XP {level.required_xp.toLocaleString()}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-100">{displayReward}</p>
                  <button
                    type="button"
                    disabled={!canClaim}
                    onClick={() => canClaim && claimMutation.mutate(level.level)}
                    className={`mt-3 w-full rounded-full px-3 py-2 text-sm font-bold transition ${
                      canClaim
                        ? "bg-amber-500 text-slate-950 hover:bg-amber-400"
                        : level.is_claimed
                        ? "bg-emerald-800/60 text-emerald-100 cursor-not-allowed"
                        : "bg-slate-800 text-slate-400 cursor-not-allowed"
                    }`}
                  >
                    {buttonLabel}
                  </button>
                  {isAuto && !level.is_claimed && (
                    <p className="mt-1 text-xs text-emerald-200">자동지급</p>
                  )}
                </article>
              );
            })}
              </div>
            </div>
          </div>

          <aside className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white">오늘 할 일</h2>
              <span className="text-xs text-emerald-200">스탬프 {data.today?.stamped ? "완료" : "미완료"}</span>
            </div>
            <div className="space-y-3">
              {cards.map((card) => (
                <div key={card.title} className="rounded-xl border border-slate-800 bg-slate-900/80 p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg" aria-hidden>{card.icon}</span>
                    <div>
                      <p className="text-sm font-semibold text-white">{card.title}</p>
                      <p className="text-xs text-slate-400">{card.desc}</p>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-emerald-200">{card.status}</p>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>
    </FeatureGate>
  );
};

export default SeasonPassPage;
