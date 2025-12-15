import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../auth/authStore";
import { useRouletteStatus } from "../hooks/useRoulette";
import { useDiceStatus } from "../hooks/useDice";
import { useLotteryStatus } from "../hooks/useLottery";
import { useInternalWinStatus } from "../hooks/useSeasonPass";
import { useTodayRanking } from "../hooks/useRanking";
import { GAME_TOKEN_LABELS } from "../types/gameTokens";
import { getActiveSeason, getLeaderboard, getMyTeam } from "../api/teamBattleApi";

interface GameCardProps {
  readonly title: string;
  readonly path: string;
  readonly tokenType?: string;
  readonly tokenBalance?: number | null;
  readonly state?: "idle" | "loading" | "error";
}

const gameIcons: Record<string, string> = {
  "룰렛": "🎰",
  "주사위": "🎲",
  "복권": "🎟️",
};

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
    <div className="rounded-2xl border border-emerald-700/35 bg-slate-950/70 p-5 shadow-lg transition hover:border-emerald-400/50">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{gameIcons[title] ?? "🎮"}</span>
            <h3 className="text-lg font-extrabold text-white">{title}</h3>
          </div>
          <p className="text-xs text-slate-300">{tokenLabel}</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">티켓</p>
          <p className="text-xl font-extrabold text-emerald-200">{hasCoins ? tokenBalance : 0}</p>
        </div>
      </div>

      {statusBadge && <p className="mt-3 text-xs text-amber-200">{statusBadge}</p>}

      <button
        type="button"
        onClick={() => navigate(path)}
        disabled={!hasCoins}
        className="mt-4 w-full rounded-xl border border-emerald-500/40 bg-emerald-900/30 px-4 py-3 text-sm font-extrabold text-emerald-50 transition hover:border-emerald-300/60 hover:bg-emerald-800/35 disabled:cursor-not-allowed disabled:border-slate-700/50 disabled:bg-slate-800/60 disabled:text-slate-300"
      >
        {hasCoins ? "바로 시작하기" : "티켓이 필요해요"}
      </button>
      {!hasCoins && <p className="mt-2 text-xs text-slate-400">티켓 지급 문의: 지민이</p>}
    </div>
  );
};

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const roulette = useRouletteStatus();
  const dice = useDiceStatus();
  const lottery = useLotteryStatus();
  const ranking = useTodayRanking();
  const internalWins = useInternalWinStatus();
  const teamSeason = useQuery({ queryKey: ["team-battle-season"], queryFn: getActiveSeason });
  const teamLeaderboard = useQuery({ queryKey: ["team-battle-leaderboard"], queryFn: () => getLeaderboard(undefined, 50, 0) });
  const myTeam = useQuery({ queryKey: ["team-battle-me"], queryFn: getMyTeam });

  const external = ranking.data?.my_external_entry;
  const deposit = external?.deposit_amount ?? 0;
  const depositRemainder = 100_000 - (deposit % 100_000 || 100_000);
  const playDone = (external?.play_count ?? 0) > 0;

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

  const myTeamRow = useMemo(() => {
    if (!myTeam.data || !teamLeaderboard.data) return null;
    return teamLeaderboard.data.find((row) => row.team_id === myTeam.data?.team_id) || null;
  }, [myTeam.data, teamLeaderboard.data]);
  const myTeamName = useMemo(() => myTeamRow?.team_name ?? (myTeam.data ? `team #${myTeam.data.team_id}` : "미배정"), [myTeamRow?.team_name, myTeam.data]);
  const myTeamPoints = myTeamRow?.points ?? null;
  const myTeamMembers = myTeamRow?.member_count ?? null;

  const displayName = (entryUserName?: string) => {
    if (entryUserName && entryUserName.trim().length > 0) return entryUserName;
    if (user?.external_id) return user.external_id;
    return "닉네임 없음";
  };

  const seasonState = useMemo(() => {
    if (teamSeason.isLoading) return { label: "시즌 불러오는 중", tone: "text-slate-300" };
    if (teamSeason.isError) return { label: "시즌 정보를 불러오지 못했습니다", tone: "text-red-300" };
    if (!teamSeason.data) return { label: "활성 시즌 없음", tone: "text-slate-300" };
    return { label: teamSeason.data.name, tone: "text-emerald-200" };
  }, [teamSeason.data, teamSeason.isError, teamSeason.isLoading]);

  const formatEndsAt = (iso?: string) => {
    if (!iso) return "종료 정보 없음";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "종료 정보 없음";
    return d.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
  };

  const topTeams = useMemo(() => {
    if (!teamLeaderboard.data) return [];
    return teamLeaderboard.data.slice(0, 3);
  }, [teamLeaderboard.data]);

  const missionSummary = useMemo(() => {
    const rank = external?.rank;
    const top10 = rank ? (rank <= 10 ? "TOP10 달성" : `TOP10까지 ${rank - 10}위`) : "랭킹 없음";
    const daily = playDone ? "오늘 이용 완료" : "오늘 이용 필요";
    const depositNext = depositRemainder === 100_000 ? "다음 10만까지 0" : `다음 10만까지 ${depositRemainder.toLocaleString()}`;
    const wins = internalWins.data
      ? `승리 ${internalWins.data.total_wins} (남은 ${internalWins.data.remaining})`
      : internalWins.isLoading
      ? "승리 집계 중"
      : "승리 집계 실패";
    return { top10, daily, depositNext, wins };
  }, [depositRemainder, external?.rank, internalWins.data, internalWins.isLoading, playDone]);

  return (
    <section className="space-y-10">
      {/* Hero */}
      <div className="rounded-3xl border border-emerald-700/35 bg-slate-950/70 p-7 shadow-2xl">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.28em] text-emerald-300">Christmas Event</p>
            <h2 className="text-3xl font-extrabold text-white md:text-4xl">
              {displayName(user?.external_id)}님,
              <br className="hidden sm:block" />
              오늘은 딱 3분만 즐기고 가세요.
            </h2>
            <p className="text-sm text-slate-300">복잡한 설명 없이, 티켓 있으면 바로 시작합니다.</p>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-emerald-500/40 bg-emerald-900/25 px-3 py-1 text-xs text-emerald-100">{missionSummary.top10}</span>
              <span className="rounded-full border border-slate-700/50 bg-slate-900/40 px-3 py-1 text-xs text-slate-200">{missionSummary.daily}</span>
              <span className="rounded-full border border-gold-500/35 bg-amber-900/20 px-3 py-1 text-xs text-amber-100">{missionSummary.depositNext}</span>
              <span className="rounded-full border border-slate-700/50 bg-slate-900/40 px-3 py-1 text-xs text-slate-200">{missionSummary.wins}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => document.getElementById("home-games")?.scrollIntoView()}
              className="rounded-full border border-emerald-400/70 bg-emerald-900/30 px-5 py-3 text-sm font-extrabold text-white hover:border-emerald-300/80 hover:bg-emerald-800/35"
            >
              게임 시작하기
            </button>
            <button
              type="button"
              onClick={() => navigate("/team-battle")}
              className="rounded-full border border-slate-600/60 bg-slate-900/50 px-5 py-3 text-sm font-semibold text-slate-100 hover:border-slate-400/70"
            >
              팀 배틀 참여
            </button>
            <a
              href="https://ccc-010.com"
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-gold-400/50 bg-amber-900/20 px-5 py-3 text-sm font-semibold text-amber-100 hover:border-gold-300/70"
            >
              CC 사이트 ↗
            </a>
          </div>
        </div>
      </div>

      {/* Games (Primary CTA area) */}
      <div id="home-games" className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-slate-300">Play</p>
            <h3 className="text-2xl font-extrabold text-white">바로 즐기는 게임</h3>
          </div>
          <p className="text-xs text-slate-400">티켓이 0이면 입장이 제한됩니다.</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {gameCards.map((card) => (
            <GameCard key={card.title} {...card} />
          ))}
        </div>
      </div>

      {/* Team battle (compact) */}
      <div className="rounded-3xl border border-amber-600/35 bg-slate-950/70 p-7 shadow-2xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.28em] text-amber-200">Team Battle</p>
            <h3 className="text-2xl font-extrabold text-white">팀 배틀</h3>
            <p className="text-sm text-slate-300">팀 선택 후 플레이 횟수로 경쟁합니다.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`rounded-full border border-amber-400/60 bg-amber-900/25 px-3 py-1 text-xs font-semibold ${seasonState.tone}`}>
              {seasonState.label}
            </span>
            <button
              type="button"
              onClick={() => navigate("/team-battle")}
              className="rounded-full border border-emerald-400/70 bg-emerald-900/30 px-4 py-2 text-sm font-semibold text-emerald-100 hover:border-emerald-300/80"
            >
              참여하기 →
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-emerald-700/30 bg-slate-950/70 p-5">
            <p className="text-xs font-semibold text-slate-300">내 팀</p>
            <p className="mt-2 text-lg font-extrabold text-white">{myTeamName}</p>
            <div className="mt-2 text-sm text-slate-300 space-y-1">
              <div>점수: {myTeamPoints !== null ? `${myTeamPoints} pts` : "-"}</div>
              <div>인원: {myTeamMembers !== null ? `${myTeamMembers}명` : "-"}</div>
              {teamSeason.data && <div className="text-xs text-slate-400">종료: {formatEndsAt(teamSeason.data.ends_at)}</div>}
              {myTeam.isLoading && <div className="text-xs text-slate-400">불러오는 중...</div>}
              {myTeam.isError && <div className="text-xs text-red-300">불러오기 실패</div>}
            </div>
          </div>

          <div className="md:col-span-2 rounded-2xl border border-emerald-700/30 bg-slate-950/70 p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-300">상위 팀 TOP3</p>
              {teamLeaderboard.isLoading && <span className="text-xs text-slate-400">불러오는 중...</span>}
              {teamLeaderboard.isError && <span className="text-xs text-red-300">불러오기 실패</span>}
            </div>
            {topTeams.length === 0 ? (
              !teamLeaderboard.isLoading && <p className="mt-3 text-sm text-slate-400">데이터 없음</p>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {topTeams.map((row, idx) => (
                  <div key={row.team_id} className="rounded-xl border border-emerald-700/25 bg-slate-900/50 p-4">
                    <p className="text-xs text-slate-300">#{idx + 1}</p>
                    <p className="mt-1 text-sm font-bold text-white truncate">{row.team_name}</p>
                    <p className="mt-2 text-sm font-extrabold text-emerald-200">{row.points} pts</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ranking (compact) */}
      <div className="rounded-3xl border border-gold-600/35 bg-slate-950/70 p-7 shadow-2xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-amber-200">Ranking</p>
            <h3 className="text-2xl font-extrabold text-white">CC 랭킹 TOP3</h3>
          </div>
          {external?.rank && (
            <div className="rounded-full border border-gold-500/35 bg-amber-900/20 px-4 py-2 text-xs text-amber-100">
              내 순위 {external.rank}위 · 입금 {deposit.toLocaleString()} · 플레이 {external.play_count}
            </div>
          )}
        </div>

        {rankingSummary.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400">랭킹 데이터 없음</p>
        ) : (
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {rankingSummary.map((entry, idx) => {
              const medals = ["🥇", "🥈", "🥉"];
              return (
                <div key={entry.user_id} className="rounded-2xl border border-gold-500/35 bg-slate-900/45 p-5">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{medals[idx] ?? "🏅"}</span>
                    <p className="text-sm font-semibold text-amber-200">{entry.rank}위</p>
                  </div>
                  <p className="mt-2 text-lg font-extrabold text-white truncate">{displayName(entry.user_name)}</p>
                  <p className="mt-1 text-xs text-slate-300">입금 {entry.deposit_amount.toLocaleString()} · 플레이 {entry.play_count}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default HomePage;
