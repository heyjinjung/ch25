import React, { useEffect, useMemo, useState } from "react";
import {
  getActiveSeason,
  getLeaderboard,
  getContributors,
  listTeams,
  joinTeam,
  leaveTeam,
} from "../api/teamBattleApi";
import { Team, TeamSeason, LeaderboardEntry, ContributorEntry } from "../types/teamBattle";

const formatDateTime = (iso?: string) => (iso ? new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }) : "-");

const TeamBattlePage: React.FC = () => {
  const [season, setSeason] = useState<TeamSeason | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
  const [contributors, setContributors] = useState<ContributorEntry[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [contributorsLoading, setContributorsLoading] = useState(false);
  const [joinBusy, setJoinBusy] = useState(false);
  const [leaveBusy, setLeaveBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadCore = async () => {
    setError(null);
    setRefreshing(true);
    try {
      const [s, t, lb] = await Promise.all([
        getActiveSeason(),
        listTeams(),
        getLeaderboard(undefined, 20, 0),
      ]);
      setSeason(s);
      setTeams(t);
      setLeaderboard(lb);
    } catch (err) {
      console.error(err);
      setError("팀 배틀 정보를 불러오지 못했습니다.");
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadCore();
  }, []);

  useEffect(() => {
    const loadContributors = async () => {
      if (!selectedTeam) return;
      setContributorsLoading(true);
      try {
        const data = await getContributors(selectedTeam, season?.id);
        setContributors(data);
      } catch (err) {
        console.error(err);
        setError("팀 기여도 불러오기에 실패했습니다.");
      } finally {
        setContributorsLoading(false);
      }
    };
    loadContributors();
  }, [selectedTeam, season?.id]);

  const handleJoin = async (teamId: number) => {
    setMessage(null);
    setError(null);
    setJoinBusy(true);
    try {
      await joinTeam(teamId);
      setSelectedTeam(teamId);
      setMessage("팀에 합류했습니다.");
      await loadCore();
    } catch (err) {
      console.error(err);
      setError("팀 합류에 실패했습니다.");
    } finally {
      setJoinBusy(false);
    }
  };

  const handleLeave = async () => {
    setMessage(null);
    setError(null);
    setLeaveBusy(true);
    try {
      await leaveTeam();
      setSelectedTeam(null);
      setContributors([]);
      setMessage("팀을 떠났습니다.");
      await loadCore();
    } catch (err) {
      console.error(err);
      setError("팀 탈퇴에 실패했습니다.");
    } finally {
      setLeaveBusy(false);
    }
  };

  const countdown = useMemo(() => {
    if (!season) return "-";
    const end = new Date(season.ends_at).getTime();
    const diff = end - Date.now();
    if (diff <= 0) return "종료";
    const hours = Math.floor(diff / 1000 / 3600);
    const minutes = Math.floor((diff / 1000 / 60) % 60);
    return `${hours}h ${minutes}m 남음`;
  }, [season]);

  return (
    <div className="p-4 space-y-4">
      <div className="bg-gradient-to-r from-blue-900 via-cyan-700 to-emerald-500 text-white rounded-xl p-4 shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm opacity-80">팀 배틀 (Asia/Seoul 기준)</p>
            <h1 className="text-2xl font-bold">{season ? season.name : "활성 시즌 없음"}</h1>
            <p className="text-sm">종료: {formatDateTime(season?.ends_at)}</p>
          </div>
          <div className="text-right">
            <p className="text-sm opacity-80">남은 시간</p>
            <p className="text-xl font-semibold">{countdown}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-600">
        <div className="flex gap-2 items-center">
          <button
            className="px-3 py-1 border rounded hover:bg-gray-50"
            onClick={loadCore}
            disabled={refreshing}
          >
            {refreshing ? "새로고침 중..." : "데이터 새로고침"}
          </button>
          <span className="text-xs">모든 시각은 Asia/Seoul 기준</span>
        </div>
        {initialLoading && <span className="text-xs text-gray-500">초기 로딩 중...</span>}
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2 bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">팀 선택</h2>
            <button className="text-sm text-red-500" onClick={handleLeave} disabled={!selectedTeam || leaveBusy}>
              {leaveBusy ? "탈퇴 중..." : "팀 탈퇴"}
            </button>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {teams.map((team) => (
              <div key={team.id} className={`border rounded-lg p-3 cursor-pointer ${selectedTeam === team.id ? "border-blue-500" : "border-gray-200"}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">팀</p>
                    <p className="text-lg font-semibold">{team.name}</p>
                  </div>
                  <button
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded"
                    onClick={() => handleJoin(team.id)}
                    disabled={joinBusy || refreshing}
                  >
                    {joinBusy ? "합류 중..." : "합류"}
                  </button>
                </div>
              </div>
            ))}
            {teams.length === 0 && <p className="text-sm text-gray-500">활성 팀이 없습니다.</p>}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold mb-2">내 팀 기여도</h2>
          {selectedTeam ? (
            contributorsLoading ? (
              <p className="text-sm text-gray-500">기여도 불러오는 중...</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {contributors.map((c) => (
                  <li key={c.user_id} className="flex justify-between">
                    <span>회원 #{c.user_id}</span>
                    <span className="font-semibold">+{c.points}</span>
                  </li>
                ))}
                {contributors.length === 0 && <p className="text-gray-500">데이터 없음</p>}
              </ul>
            )
          ) : (
            <p className="text-gray-500 text-sm">팀에 합류하면 기여도가 표시됩니다.</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">리더보드</h2>
          <span className="text-xs text-gray-500">실시간 점수 (플레이 횟수 기준)</span>
        </div>
        <div className="divide-y">
          {leaderboard.map((row, idx) => (
            <div key={row.team_id} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <span className="w-6 text-center font-semibold">{idx + 1}</span>
                <span className="font-semibold">{row.team_name}</span>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">점수</p>
                <p className="text-lg font-semibold">{row.points}</p>
              </div>
            </div>
          ))}
          {leaderboard.length === 0 && <p className="text-sm text-gray-500 py-3">아직 점수가 없습니다.</p>}
        </div>
      </div>

      {message && <div className="p-3 bg-green-50 text-green-800 rounded">{message}</div>}
      {error && <div className="p-3 bg-red-50 text-red-800 rounded">{error}</div>}
    </div>
  );
};

export default TeamBattlePage;
