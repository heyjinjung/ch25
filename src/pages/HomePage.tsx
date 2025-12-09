import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/authStore";
import { useSeasonPassStatus } from "../hooks/useSeasonPass";
import { useRouletteStatus } from "../hooks/useRoulette";
import { useDiceStatus } from "../hooks/useDice";
import { useLotteryStatus } from "../hooks/useLottery";
import { useInternalWinStatus } from "../hooks/useSeasonPass";
import { useTodayRanking } from "../hooks/useRanking";
import { GAME_TOKEN_LABELS } from "../types/gameTokens";

interface GameCardProps {
  readonly title: string;
  readonly path: string;
  readonly tokenType?: string;
  readonly tokenBalance?: number | null;
  readonly state?: "idle" | "loading" | "error";
}

const GameCard: React.FC<GameCardProps> = ({ title, path, tokenType, tokenBalance, state = "idle" }) => {
  const navigate = useNavigate();
  const hasCoins = typeof tokenBalance === "number" && tokenBalance > 0;
  const tokenLabel = tokenType ? GAME_TOKEN_LABELS[tokenType as keyof typeof GAME_TOKEN_LABELS] ?? tokenType : "미지급";
  const statusBadge =
    state === "loading"
      ? "상태 로딩 중"
      : state === "error"
        ? "상태 조회 실패 - 티켓 지급 확인"
        : undefined;

  return (
    <div className="space-y-3 rounded-2xl border border-slate-700/50 bg-slate-900/50 p-5 shadow-lg shadow-emerald-900/10">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">{title}</h3>
        <span className="text-sm text-slate-300">{tokenLabel}</span>
      </div>
      <p className="text-sm text-slate-400">보유 티켓: {hasCoins ? tokenBalance : 0}</p>
      {statusBadge && <p className="text-xs text-amber-200">{statusBadge}</p>}
      <button
        type="button"
        onClick={() => navigate(path)}
        disabled={!hasCoins}
        className="w-full rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-500 px-4 py-2 text-sm font-bold text-white shadow transition hover:from-emerald-500 hover:to-emerald-400 disabled:cursor-not-allowed disabled:from-slate-700 disabled:to-slate-600"
      >
        {hasCoins ? "바로 입장" : "티켓 없음 - 관리자 문의"}
      </button>
    </div>
  );
};

const HomePage: React.FC = () => {
  const { user } = useAuth();
  const season = useSeasonPassStatus();
  const roulette = useRouletteStatus();
  const dice = useDiceStatus();
  const lottery = useLotteryStatus();
  const ranking = useTodayRanking();
  const internalWins = useInternalWinStatus();

  const seasonSummary = useMemo(() => {
    if (season.isLoading) return { label: "로딩 중", detail: "" };
    if (season.isError || !season.data) return { label: "시즌패스 상태를 불러오지 못했습니다", detail: "" };
    return {
      label: `레벨 ${season.data.current_level} / XP ${season.data.current_xp.toLocaleString()}`,
      detail: `다음 레벨까지 ${(season.data.next_level_xp - season.data.current_xp).toLocaleString()} XP 필요`,
    };
  }, [season.data, season.isError, season.isLoading]);

  const external = ranking.data?.my_external_entry;
  const top10Needed = external?.rank && external.rank > 10 ? external.rank - 10 : 0;
  const deposit = external?.deposit_amount ?? 0;
  const depositRemainder = 100_000 - (deposit % 100_000 || 100_000);
  const playDone = (external?.play_count ?? 0) > 0;

  const stampTips = [
    { title: "외부 랭킹 TOP10", status: external?.rank ? `현재 ${external.rank}위${top10Needed > 0 ? `, ${top10Needed}위 상승 필요` : " (완료)"}` : "랭킹 데이터 없음" },
    { title: "외부 사이트 첫 이용", status: playDone ? "완료" : "미완료" },
    { title: "외부 입금 10만원마다", status: `누적 ${deposit.toLocaleString()}원 / 다음까지 ${depositRemainder === 100_000 ? 0 : depositRemainder.toLocaleString()}원` },
    {
      title: "내부 게임 승리 50회",
      status: internalWins.data
        ? `누적 승리 ${internalWins.data.total_wins}회 / 남은 ${internalWins.data.remaining}회`
        : internalWins.isLoading
        ? "집계 중..."
        : "집계 실패",
    },
  ];

  const gameCards: GameCardProps[] = [
    {
      title: "룰렛",
      path: "/roulette",
      tokenType: roulette.data?.token_type,
      tokenBalance: roulette.data?.token_balance ?? null,
      state: roulette.isLoading ? "loading" : roulette.isError ? "error" : "idle",
    },
    {
      title: "주사위",
      path: "/dice",
      tokenType: dice.data?.token_type,
      tokenBalance: dice.data?.token_balance ?? null,
      state: dice.isLoading ? "loading" : dice.isError ? "error" : "idle",
    },
    {
      title: "복권",
      path: "/lottery",
      tokenType: lottery.data?.token_type,
      tokenBalance: lottery.data?.token_balance ?? null,
      state: lottery.isLoading ? "loading" : lottery.isError ? "error" : "idle",
    },
  ];

  const rankingSummary = ranking.data?.external_entries ? ranking.data.external_entries.slice(0, 3) : [];

  const displayName = (entryUserId: number, entryUserName?: string) => {
    if (entryUserName && entryUserName.trim().length > 0) return entryUserName;
    if (user && entryUserId === user.id && user.external_id) return user.external_id;
    return `ID ${entryUserId}`;
  };

  return (
    <section className="space-y-8">
      {/* 크리스마스 히어로 배너 */}
      <div className="relative overflow-hidden rounded-3xl border border-emerald-600/40 bg-gradient-to-br from-emerald-950 via-slate-900 to-amber-900 p-8 shadow-2xl">
        <div className="absolute -left-6 top-4 h-20 w-20 rounded-full bg-emerald-500/30 blur-3xl" />
        <div className="absolute right-6 -bottom-6 h-28 w-28 rounded-full bg-amber-400/20 blur-3xl" />
        <div className="relative flex flex-col gap-2 text-left">
          <p className="text-xs uppercase tracking-[0.35em] text-emerald-200">🎄 Christmas Week</p>
          <h1 className="text-3xl font-bold text-white">따뜻한 크리스마스 보상 허브</h1>
          <p className="text-sm text-emerald-100">
            매일 티켓을 모아 게임하고, 시즌패스 보상을 챙기세요. 눈꽃과 선물 상자가 곳곳에 숨겨져 있어요!
          </p>
        </div>
      </div>

      <div className="rounded-3xl border border-gold-600/30 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 p-8 shadow-2xl space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-gold-400">Season Pass</p>
            <h2 className="text-2xl font-bold text-white">시즌패스 요약</h2>
          </div>
          <div className="rounded-full bg-emerald-900/60 px-4 py-1 text-xs text-emerald-200">{seasonSummary.detail}</div>
        </div>
        <div className="rounded-xl border border-gold-600/40 bg-slate-900/60 p-4">
          <p className="text-sm font-semibold text-emerald-100">{seasonSummary.label}</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {stampTips.map((tip) => (
            <div key={tip.title} className="rounded-lg border border-slate-700/50 bg-slate-900/60 p-3">
              <p className="text-sm font-semibold text-white">{tip.title}</p>
              <p className="text-xs text-emerald-200">{tip.status}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-700/50 bg-slate-900/60 p-8 shadow-2xl">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-emerald-300">Games</p>
            <h2 className="text-2xl font-bold text-white">게임 선택</h2>
            <p className="text-sm text-slate-400">티켓이 있으면 바로 입장, 없으면 관리자에게 문의해 주세요.</p>
          </div>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {gameCards.map((card) => (
            <GameCard key={card.title} {...card} />
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-amber-600/30 bg-gradient-to-br from-slate-900 via-slate-800 to-amber-900/40 p-8 shadow-2xl">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-amber-300">Ranking</p>
            <h2 className="text-2xl font-bold text-white">외부 랭킹</h2>
            <p className="text-sm text-slate-300">입금액/플레이 수 기준. TOP10 진입 시 스탬프 1개.</p>
          </div>
          {external?.rank && (
            <div className="rounded-full bg-amber-900/50 px-4 py-1 text-xs text-amber-100">
              내 순위: {external.rank}위 / 입금 {deposit.toLocaleString()}원 / 플레이 {external.play_count}
            </div>
          )}
        </div>
        {rankingSummary.length === 0 ? (
          <p className="mt-3 text-sm text-slate-400">랭킹 데이터 없음</p>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {rankingSummary.map((entry) => (
              <div key={entry.user_id} className="rounded-xl border border-amber-500/40 bg-slate-900/60 p-4">
                <p className="text-sm font-semibold text-amber-200">{entry.rank}위</p>
                <p className="text-base font-bold text-white">
                  {displayName(entry.user_id, entry.user_name)}
                </p>
                <p className="text-xs text-slate-300">입금 {entry.deposit_amount.toLocaleString()}원 · 플레이 {entry.play_count}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default HomePage;
