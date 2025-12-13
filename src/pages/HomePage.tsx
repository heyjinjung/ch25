import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../auth/authStore";
import { useSeasonPassStatus } from "../hooks/useSeasonPass";
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
    <div className="space-y-3 rounded-2xl border border-red-800/40 bg-gradient-to-br from-slate-900/80 to-red-950/20 p-5 shadow-lg hover:border-gold-500/50 hover:shadow-gold-500/10 transition-all duration-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{gameIcons[title] ?? "🎮"}</span>
          <h3 className="text-lg font-bold text-white">{title}</h3>
        </div>
        <span className="text-sm text-gold-300">{tokenLabel}</span>
      </div>
      <p className="text-sm text-slate-300">
        보유 티켓: <span className="font-semibold text-emerald-300">{hasCoins ? tokenBalance : 0}</span>
      </p>
      {statusBadge && <p className="text-xs text-amber-200">{statusBadge}</p>}
      <button
        type="button"
        onClick={() => navigate(path)}
        disabled={!hasCoins}
        className="w-full rounded-lg bg-gradient-to-r from-red-700 to-red-600 px-4 py-2 text-sm font-bold text-white shadow transition hover:from-red-600 hover:to-red-500 disabled:cursor-not-allowed disabled:from-slate-700 disabled:to-slate-600"
      >
        {hasCoins ? "🎄 바로 입장" : "티켓 없음 - 관리자 문의"}
      </button>
    </div>
  );
};

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const season = useSeasonPassStatus();
  const roulette = useRouletteStatus();
  const dice = useDiceStatus();
  const lottery = useLotteryStatus();
  const ranking = useTodayRanking();
  const internalWins = useInternalWinStatus();
  const teamSeason = useQuery({ queryKey: ["team-battle-season"], queryFn: getActiveSeason });
  const teamLeaderboard = useQuery({ queryKey: ["team-battle-leaderboard"], queryFn: () => getLeaderboard(undefined, 50, 0) });
  const myTeam = useQuery({ queryKey: ["team-battle-me"], queryFn: getMyTeam });

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
    { title: "CC랭킹 TOP10", status: external?.rank ? `현재 ${external.rank}위${top10Needed > 0 ? `, ${top10Needed}위 상승 필요` : " (완료)"}` : "랭킹 데이터 없음" },
    { title: "CC사이트 일일이용", status: playDone ? "완료" : "미완료" },
    { title: "CC 입금 10만원마다", status: `누적 ${deposit.toLocaleString()}원 / 다음까지 ${depositRemainder === 100_000 ? 0 : depositRemainder.toLocaleString()}원` },
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

  return (
    <section className="space-y-8">
      <div className="rounded-3xl border border-red-700/40 bg-gradient-to-br from-slate-950 via-red-950/30 to-emerald-950 p-8 shadow-2xl space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-gold-400">🎄 Season Pass</p>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-gold-300 via-gold-400 to-gold-300 bg-clip-text text-transparent">시즌패스 요약</h2>
          </div>
          <div className="rounded-full bg-emerald-900/60 px-4 py-1 text-xs text-emerald-200">{seasonSummary.detail}</div>
        </div>
        <div className="rounded-xl border border-gold-600/40 bg-slate-900/60 p-4">
          <p className="text-sm font-semibold text-emerald-100">{seasonSummary.label}</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {stampTips.map((tip, idx) => {
            const tipIcons = ["🎄", "❄️", "🎁", "⛄"];
            return (
              <div key={tip.title} className="rounded-lg border border-red-800/40 bg-gradient-to-br from-slate-900/80 to-red-950/20 p-3 hover:border-gold-500/40 transition-all">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{tipIcons[idx] ?? "🎅"}</span>
                  <p className="text-sm font-semibold text-white">{tip.title}</p>
                </div>
                <p className="text-xs text-emerald-300 mt-1">{tip.status}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-3xl border border-amber-600/40 bg-gradient-to-br from-slate-950 via-indigo-950/40 to-emerald-950 p-8 shadow-[0_25px_80px_-30px_rgba(0,0,0,0.6)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.28em] text-amber-200">🛡️ Team Battle</p>
            <h2 className="text-2xl font-extrabold bg-gradient-to-r from-amber-200 via-emerald-200 to-cyan-300 bg-clip-text text-transparent">오늘의 팀 배틀</h2>
            <p className="text-sm text-slate-200">팀을 고르고 플레이 횟수로 경쟁하세요. 우승팀은 CC 포인트 보상!</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`rounded-full border border-amber-400/60 bg-amber-900/30 px-3 py-1 text-xs font-semibold ${seasonState.tone}`}>
              {seasonState.label}
            </span>
            <button
              type="button"
              onClick={() => navigate("/team-battle")}
              className="rounded-full border border-emerald-400/70 bg-emerald-900/30 px-4 py-2 text-sm font-semibold text-emerald-100 hover:border-emerald-300 hover:text-white"
            >
              팀 배틀 바로가기 →
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="md:col-span-1 rounded-2xl border border-amber-600/40 bg-gradient-to-br from-slate-900/80 to-amber-950/20 p-5 shadow-inner">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-amber-200">활성 시즌</p>
              <span className="text-[11px] text-slate-400">Asia/Seoul</span>
            </div>
            {teamSeason.isLoading && <p className="mt-2 text-sm text-slate-400">불러오는 중...</p>}
            {teamSeason.isError && <p className="mt-2 text-sm text-red-300">시즌 정보를 불러오지 못했습니다.</p>}
            {teamSeason.data && (
              <div className="mt-2 space-y-2 text-sm text-slate-100">
                <p className="text-base font-bold text-white">{teamSeason.data.name}</p>
                <p className="text-xs text-slate-300">종료: {formatEndsAt(teamSeason.data.ends_at)}</p>
                <div className="rounded-lg border border-emerald-700/40 bg-emerald-900/30 p-2 text-xs text-emerald-100">
                  <div className="font-semibold">내 팀 배정</div>
                  {myTeam.isLoading && <div>배정 정보 불러오는 중...</div>}
                  {myTeam.isError && <div className="text-red-200">배정 정보를 불러오지 못했습니다.</div>}
                  {myTeam.data ? (
                    <div className="space-y-1">
                      <div>팀: {myTeamName}</div>
                      <div>점수: {myTeamPoints !== null ? `${myTeamPoints} pts` : "점수 데이터 없음"}</div>
                      <div>인원: {myTeamMembers !== null ? `${myTeamMembers}명` : "-"}</div>
                    </div>
                  ) : (
                    !myTeam.isLoading && <div>아직 배정되지 않았습니다.</div>
                  )}
                </div>
              </div>
            )}
            {!teamSeason.data && !teamSeason.isLoading && !teamSeason.isError && (
              <p className="mt-2 text-sm text-slate-400">활성 시즌이 없습니다.</p>
            )}
          </div>

          <div className="md:col-span-2 rounded-2xl border border-emerald-600/40 bg-gradient-to-br from-slate-900/80 to-emerald-950/20 p-5 shadow-inner">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-emerald-200">상위 팀</p>
              <span className="text-xs text-slate-400">플레이 횟수 기준</span>
            </div>
            {teamLeaderboard.isLoading && <p className="mt-2 text-sm text-slate-400">리더보드 불러오는 중...</p>}
            {teamLeaderboard.isError && <p className="mt-2 text-sm text-red-300">리더보드를 불러오지 못했습니다.</p>}
            {teamLeaderboard.data && teamLeaderboard.data.length > 0 ? (
              <div className="mt-3 divide-y divide-slate-800/60">
                {teamLeaderboard.data.map((row, idx) => (
                  <div key={row.team_id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-900/50 text-sm font-bold text-emerald-200">#{idx + 1}</span>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-white">{row.team_name}</span>
                        <span className="text-[11px] text-slate-400">team_id: {row.team_id}</span>
                      </div>
                    </div>
                    <span className="rounded-full bg-emerald-800/50 px-3 py-1 text-sm font-semibold text-emerald-100">{row.points} pts</span>
                  </div>
                ))}
              </div>
            ) : (
              !teamLeaderboard.isLoading && <p className="mt-3 text-sm text-slate-400">아직 점수가 없습니다.</p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-red-700/40 bg-gradient-to-br from-slate-950 via-red-950/20 to-emerald-950 p-8 shadow-2xl">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-gold-400">🎮 Games</p>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-red-400 via-gold-400 to-emerald-400 bg-clip-text text-transparent">게임 선택</h2>
            <p className="text-sm text-slate-300">티켓이 있으면 바로 입장, 없으면 관리자에게 문의해 주세요.</p>
          </div>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {gameCards.map((card) => (
            <GameCard key={card.title} {...card} />
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-gold-600/40 bg-gradient-to-br from-slate-950 via-gold-950/20 to-red-950/30 p-8 shadow-2xl">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-gold-400">🏆 Ranking</p>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-gold-300 via-gold-400 to-gold-300 bg-clip-text text-transparent">CC랭킹</h2>
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
            {rankingSummary.map((entry, idx) => {
              const medals = ["🥇", "🥈", "🥉"];
              return (
                <div key={entry.user_id} className="rounded-xl border border-gold-500/50 bg-gradient-to-br from-slate-900/80 to-gold-950/20 p-4 hover:border-gold-400 transition-all">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{medals[idx] ?? "🏅"}</span>
                    <p className="text-sm font-semibold text-gold-300">{entry.rank}위</p>
                  </div>
                  <p className="text-base font-bold text-white mt-1">{displayName(entry.user_name)}</p>
                  <p className="text-xs text-slate-300">입금 {entry.deposit_amount.toLocaleString()}원 · 플레이 {entry.play_count}</p>
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
