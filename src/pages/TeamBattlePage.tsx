import React, { useEffect, useMemo, useState } from "react";
import {
  getActiveSeason,
  getLeaderboard,
  getContributors,
  autoAssignTeam,
  listTeams,
  getMyTeam,
} from "../api/teamBattleApi";
import { TeamSeason, Team, LeaderboardEntry, ContributorEntry } from "../types/teamBattle";

const formatDateTime = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  return date.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
};

const TeamBattlePage: React.FC = () => {
  const [season, setSeason] = useState<TeamSeason | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
  const [contributors, setContributors] = useState<ContributorEntry[]>([]);
  const [contributorsLoading, setContributorsLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [joinBusy, setJoinBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const joinWindow = useMemo(() => {
    if (!season?.starts_at) return { closed: true, label: "-" };
    const start = new Date(season.starts_at).getTime();
    const close = start + 2 * 60 * 60 * 1000;
    const now = Date.now();
    const remaining = close - now;
    if (remaining <= 0) return { closed: true, label: "마감" };
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining / (1000 * 60)) % 60);
    return { closed: false, label: `${hours}시간 ${minutes}분 남음` };
  }, [season?.starts_at]);

  const countdown = useMemo(() => {
    if (!season?.ends_at) return "-";
    const now = Date.now();
    const end = new Date(season.ends_at).getTime();
    const diff = end - now;
    if (diff <= 0) return "종료";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    return `${hours}시간 ${minutes}분`;
  }, [season?.ends_at]);

  const loadContributors = async (teamId: number, seasonId?: number) => {
    setContributorsLoading(true);
    try {
      const data = await getContributors(teamId, seasonId, 10, 0);
      setContributors(data);
    } catch (err) {
      console.error(err);
      setError("기여도를 불러오지 못했습니다");
    } finally {
      setContributorsLoading(false);
    }
  };

  const loadCore = async () => {
    setRefreshing(true);
    setError(null);
    try {
      const [seasonData, teamList, lb, myTeam] = await Promise.all([
        getActiveSeason(),
        listTeams(),
        getLeaderboard(undefined, 20, 0),
        getMyTeam(),
      ]);
      setSeason(seasonData);
      setTeams(teamList);
      setLeaderboard(lb);
      if (myTeam) {
        setSelectedTeam(myTeam.team_id);
        if (seasonData) {
          loadContributors(myTeam.team_id, seasonData.id);
        }
      }
      if (selectedTeam && seasonData) {
        loadContributors(selectedTeam, seasonData.id);
      }
    } catch (err) {
      console.error(err);
      setError("팀 배틀 정보를 불러오지 못했습니다");
    } finally {
      setRefreshing(false);
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    loadCore();
    const timer = setInterval(loadCore, 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  const handleAutoAssign = async () => {
    setJoinBusy(true);
    setMessage(null);
    setError(null);
    try {
      const res = await autoAssignTeam();
      setSelectedTeam(res.team_id);
      setMessage(`팀에 합류했습니다 (team #${res.team_id})`);
      if (season) {
        loadContributors(res.team_id, season.id);
      }
    } catch (err) {
      console.error(err);
      setError("팀 자동 배정에 실패했습니다");
    } finally {
      setJoinBusy(false);
    }
  };

  return (
    <div className="space-y-6 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-4 sm:p-6 rounded-3xl border border-emerald-900/30 shadow-[0_25px_80px_-40px_rgba(0,0,0,0.65)]">
      <div className="rounded-2xl border border-emerald-700/40 bg-gradient-to-r from-emerald-900 via-cyan-800 to-emerald-600 p-6 shadow-lg">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.25em] text-emerald-100">🛡️ Team Battle</p>
            <h1 className="text-3xl font-extrabold text-white">{season ? season.name : "활성 시즌 없음"}</h1>
            <p className="text-sm text-emerald-100">종료: {formatDateTime(season?.ends_at)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-emerald-100/80">남은 시간</p>
            <p className="text-xl font-bold text-white">{countdown}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-emerald-100/80">
        <div className="flex gap-2 items-center">
          <button
            className="px-3 py-1 rounded-full border border-emerald-500/50 bg-emerald-900/40 text-emerald-100 hover:border-emerald-300 transition"
            onClick={loadCore}
            disabled={refreshing}
          >
            {refreshing ? "새로고침 중..." : "데이터 새로고침"}
          </button>
          <span className="text-xs">모든 시각은 Asia/Seoul 기준</span>
        </div>
        {initialLoading && <span className="text-xs text-amber-200">초기 로딩 중...</span>}
      </div>

      <div className="rounded-2xl border border-emerald-700/40 bg-slate-900/70 p-4 text-emerald-100 text-sm space-y-1">
        <div className="font-semibold text-emerald-200">룰 안내</div>
        <div>• 목적: 2일간 팀 협력 배틀, 밸런스 기준 자동 배정(직접 선택 없음)</div>
        <div>• 구조: 시즌 길이 2일, 시작 후 2시간만 팀 선택/자동 배정, 모든 시각 Asia/Seoul</div>
        <div>• 점수: 게임 1회당 10점, 당일 플레이만 집계, 1인 하루 최대 500점</div>
        <div>• 자격: 최소 20회 플레이(200점) 시 보상 대상</div>
        <div>• 보상: 1위 팀 쿠폰 3만(수동), 2위 팀 포인트 100 자동, 팀별 TOP3 쿠폰 1만(수동)</div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2 rounded-2xl border border-emerald-700/40 bg-gradient-to-br from-slate-950/80 to-emerald-950/40 p-5 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-white">팀 선택</h2>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
            <div className="flex items-center gap-2">
              <button
                className="px-4 py-2 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400 text-slate-900 font-semibold hover:from-emerald-400 hover:to-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleAutoAssign}
                disabled={joinBusy || refreshing || joinWindow.closed}
              >
                {joinBusy ? "배정 중..." : "미스터리 팀 배정"}
              </button>
              <span className="text-xs text-emerald-100/80">밸런스 기준 자동 배정</span>
            </div>
            <div className="text-right text-xs text-amber-200">팀 선택 창: {joinWindow.label}</div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {teams.map((team) => (
              <div
                key={team.id}
                className={`rounded-xl border p-4 shadow-inner transition hover:-translate-y-0.5 hover:shadow-lg bg-slate-900/60 ${
                  selectedTeam === team.id ? "border-emerald-400/80" : "border-emerald-800/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-emerald-200/70">팀</p>
                    <p className="text-xl font-bold text-white">{team.name}</p>
                  </div>
                  <span className="text-[11px] text-emerald-100/70">자동 배정만 가능</span>
                </div>
              </div>
            ))}
            {teams.length === 0 && <p className="text-sm text-emerald-200/70">활성 팀이 없습니다.</p>}
          </div>
        </div>

        <div className="rounded-2xl border border-amber-600/40 bg-gradient-to-br from-slate-950/80 to-amber-950/30 p-5 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold text-white">내 팀 기여도</h2>
            {selectedTeam && <span className="text-[11px] text-amber-200">team #{selectedTeam}</span>}
          </div>
          {selectedTeam ? (
            contributorsLoading ? (
              <p className="text-sm text-amber-100">기여도 불러오는 중...</p>
            ) : (
              <ul className="space-y-2 text-sm text-amber-50">
                {contributors.map((c) => (
                  <li key={c.user_id} className="flex justify-between rounded-lg bg-amber-900/30 px-3 py-2 border border-amber-700/30">
                    <span className="text-amber-100">회원 #{c.user_id}</span>
                    <span className="font-semibold text-amber-200">+{c.points}</span>
                  </li>
                ))}
                {contributors.length === 0 && <p className="text-amber-100">데이터 없음</p>}
              </ul>
            )
          ) : (
            <p className="text-amber-100 text-sm">팀에 합류하면 기여도가 표시됩니다.</p>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-cyan-700/40 bg-gradient-to-br from-slate-950/80 to-cyan-900/40 p-5 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-white">리더보드</h2>
          <span className="text-xs text-cyan-100/80">실시간 점수 (플레이 횟수 기준)</span>
        </div>
        <div className="divide-y divide-slate-800/60">
          {leaderboard.map((row, idx) => (
            <div key={row.team_id} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-900/60 text-sm font-bold text-cyan-100">#{idx + 1}</span>
                <span className="text-sm font-semibold text-white">{row.team_name}</span>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-cyan-100/70">점수</p>
                <p className="text-lg font-semibold text-cyan-100">{row.points}</p>
              </div>
            </div>
          ))}
          {leaderboard.length === 0 && <p className="text-sm text-cyan-100/70 py-3">아직 점수가 없습니다.</p>}
        </div>
      </div>

      {message && <div className="p-3 rounded-xl border border-emerald-500/40 bg-emerald-900/40 text-emerald-100">{message}</div>}
      {error && <div className="p-3 rounded-xl border border-red-500/40 bg-red-900/40 text-red-100">{error}</div>}
    </div>
  );
};

export default TeamBattlePage;
