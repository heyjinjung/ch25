import React, { useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTodayRanking } from "../hooks/useRanking";
import { useSeasonPassStatus, useInternalWinStatus, useClaimSeasonReward } from "../hooks/useSeasonPass";
import { useLevelXpStatus } from "../hooks/useLevelXp";
import FeatureGate from "../components/feature/FeatureGate";
import { useToast } from "../components/common/ToastProvider";

const formatCurrency = (value: number) => value.toLocaleString();

const SeasonPassPage: React.FC = () => {
  const navigate = useNavigate();
  const season = useSeasonPassStatus();
  const ranking = useTodayRanking();
  const internalWins = useInternalWinStatus();
  const claimMutation = useClaimSeasonReward();
  const levelXp = useLevelXpStatus();
  const { addToast } = useToast();

  const lastLevelRef = useRef<number | null>(null);
  const lastRewardCountRef = useRef<number>(0);

  useEffect(() => {
    if (!levelXp.data) return;
    const { current_level, rewards } = levelXp.data;
    if (lastLevelRef.current !== null && current_level > lastLevelRef.current) {
      addToast(`레벨 ${current_level} 달성!`, "success");
    }
    if (rewards.length > lastRewardCountRef.current) {
      const latest = rewards[rewards.length - 1];
      addToast(`레벨 ${latest.level} 보상 지급: ${latest.reward_type}`, "info");
    }
    lastLevelRef.current = current_level;
    lastRewardCountRef.current = rewards.length;
  }, [levelXp.data, addToast]);

  const external = ranking.data?.my_external_entry;
  const top10Needed = external?.rank && external.rank > 10 ? external.rank - 10 : 0;
  const deposit = external?.deposit_amount ?? 0;
  const depositRemainder = 100_000 - (deposit % 100_000 || 100_000);
  const playDone = (external?.play_count ?? 0) > 0;

  const globalLevelSummary = useMemo(() => {
    if (levelXp.isLoading) return { label: "레벨 불러오는 중", detail: "" };
    if (levelXp.isError || !levelXp.data) return { label: "레벨 정보를 불러오지 못했습니다", detail: "" };
    const xpToNext = levelXp.data.xp_to_next;
    return {
      label: `레벨 ${levelXp.data.current_level} / XP ${levelXp.data.current_xp.toLocaleString()}`,
      detail: xpToNext != null ? `다음 레벨까지 ${xpToNext.toLocaleString()} XP` : "최고 레벨 달성",
    };
  }, [levelXp.data, levelXp.isError, levelXp.isLoading]);

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
        <section className="flex flex-col items-center justify-center rounded-3xl border border-emerald-800/40 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 p-10 shadow-2xl">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          <p className="mt-4 text-lg font-semibold text-emerald-200">시즌패스 불러오는 중...</p>
        </section>
      </FeatureGate>
    );
  }

  if (season.isError || !season.data) {
    return (
      <FeatureGate feature="SEASON_PASS">
        <section className="rounded-3xl border border-red-800/40 bg-gradient-to-br from-red-950 to-slate-900 p-8 text-center shadow-2xl">
          <div className="mb-4 text-5xl">⚠️</div>
          <p className="text-xl font-bold text-red-100">시즌패스를 불러오지 못했습니다.</p>
          <p className="mt-2 text-sm text-red-200/70">잠시 후 다시 시도하거나 관리자에게 문의해주세요.</p>
        </section>
      </FeatureGate>
    );
  }

  const data = season.data;
  const stampXp = (data as any)?.base_xp_per_stamp ?? 0;

  return (
    <FeatureGate feature="SEASON_PASS">
      <section className="space-y-8 rounded-3xl border border-red-700/40 bg-gradient-to-br from-slate-950 via-red-950/30 to-emerald-950 p-8 shadow-2xl">
        <header className="text-center space-y-2">
          <p className="text-sm uppercase tracking-[0.3em] text-gold-400">Season Pass</p>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gold-300 via-gold-400 to-gold-300 bg-clip-text text-transparent">🎄 크리스마스 시즌패스</h1>
          <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-emerald-200">
            <span className="rounded-full border border-emerald-500/40 px-3 py-1">
              스탬프당 {stampXp.toLocaleString()} XP
            </span>
            <button
              type="button"
              onClick={() => navigate("/")}
              className="rounded-full border border-gold-400/50 px-4 py-1 text-amber-200 hover:border-gold-300 hover:text-amber-100"
            >
              홈으로 가기
            </button>
          </div>
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-gold-600/40 bg-slate-900/70 p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-amber-300">레벨</p>
                <p className="text-2xl font-black text-white">
                  {levelXp.data ? `레벨 ${levelXp.data.current_level}` : "-"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => levelXp.refetch()}
                className="rounded-full border border-amber-400/50 px-3 py-1 text-xs text-amber-100 hover:border-amber-300"
              >
                새로고침
              </button>
            </div>
            <p className="mt-2 text-sm text-amber-100">{globalLevelSummary.label}</p>
            <p className="text-xs text-slate-400">{globalLevelSummary.detail}</p>

            <div className="mt-3 space-y-2">
              <p className="text-xs font-semibold text-slate-300">최근 보상</p>
              <div className="space-y-2 text-sm text-slate-200">
                {levelXp.isLoading && <p className="text-slate-400">불러오는 중...</p>}
                {levelXp.isError && <p className="text-red-300">보상 기록을 불러오지 못했습니다.</p>}
                {levelXp.data && levelXp.data.rewards.slice(-4).reverse().map((reward) => (
                  <div key={`${reward.level}-${reward.granted_at}`} className="rounded-lg border border-amber-700/40 bg-amber-900/20 px-3 py-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-amber-200">레벨 {reward.level}</span>
                      <span className="text-[11px] text-slate-400">{new Date(reward.granted_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}</span>
                    </div>
                    <p className="text-sm font-semibold text-amber-100">{reward.reward_type}</p>
                  </div>
                ))}
                {levelXp.data && levelXp.data.rewards.length === 0 && <p className="text-slate-400">아직 지급된 보상이 없습니다.</p>}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">스탬프</h2>
            <span className="rounded-full bg-emerald-900/60 px-3 py-1 text-xs text-emerald-200">
              오늘 스탬프: {data.today?.stamped ? "완료" : "미완료"}
            </span>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {cards.map((card) => (
              <div key={card.title} className="rounded-xl border border-red-800/40 bg-gradient-to-br from-slate-900/80 to-red-950/20 p-4 shadow-lg hover:border-gold-500/50 hover:shadow-gold-500/10 transition-all duration-300">
                <div className="flex items-center gap-2">
                  <span className="text-2xl" aria-hidden>{card.icon}</span>
                  <h3 className="text-base font-semibold text-white">{card.title}</h3>
                </div>
                <p className="text-sm text-slate-300 mt-1">{card.desc}</p>
                <p className="mt-2 text-sm font-semibold text-emerald-300">{card.status}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-bold text-white">레벨 보상</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                1: "🎰",
                2: "🎲",
                3: "🎁",
                4: "🎟️",
                5: "🪙",
                6: "🎄",
                7: "💰",
                8: "🛒",
                9: "⭐",
                10: "👑",
              };
              const displayReward = rewardOverride[level.level] ?? level.reward_label;
              // 버튼 라벨: 자동지급 구분
              const buttonLabel = level.is_claimed
                ? "지급완료"
                : isAuto && level.is_unlocked
                ? "자동지급"
                : canClaim
                ? "관리자신청"
                : "잠금";
              return (
                <article
                  key={level.level}
                  className={`rounded-xl border p-4 shadow-lg transition-all duration-300 ${
                    canClaim
                      ? "border-gold-400 bg-gradient-to-br from-gold-900/30 to-red-900/20 animate-pulse shadow-gold-500/20"
                      : level.is_claimed
                      ? "border-emerald-500/50 bg-gradient-to-br from-emerald-900/30 to-slate-900/40"
                      : "border-slate-700/40 bg-slate-900/50 hover:border-red-800/40"
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
                        ? "bg-gradient-to-r from-gold-500 to-gold-600 text-white hover:from-gold-400 hover:to-gold-500"
                        : "bg-slate-700/60 text-slate-400 cursor-not-allowed"
                    }`}
                  >
                    {buttonLabel}
                  </button>
                  {isAuto && !level.is_claimed && (
                    <p className="mt-1 text-xs text-emerald-200">자동 지급 레벨입니다.</p>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </FeatureGate>
  );
};

export default SeasonPassPage;
