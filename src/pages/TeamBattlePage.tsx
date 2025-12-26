import React, { useEffect, useMemo, useState } from "react";
import {
  getActiveSeason,
  getLeaderboard,
  getContributors,
  autoAssignTeam,
  listTeams,
  getMyTeam,
} from "../api/teamBattleApi";
import { TeamSeason, Team, LeaderboardEntry, ContributorEntry, TeamMembership } from "../types/teamBattle";
import { TreeIcon, GiftIcon, StarIcon, BellIcon } from "../components/common/ChristmasDecorations";

const normalizeIsoForDate = (value: string) => {
  const hasTimezone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(value);
  return hasTimezone ? value : value + "Z";
};

const TeamBattlePage: React.FC = () => {
  const [season, setSeason] = useState<TeamSeason | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
  const [contributors, setContributors] = useState<ContributorEntry[]>([]);
  const [, setMyTeam] = useState<TeamMembership | null>(null);
  const [contributorsLoading, setContributorsLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [joinBusy, setJoinBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lbLimit, setLbLimit] = useState(10);
  const [lbOffset, setLbOffset] = useState(0);
  const [contribLimit, setContribLimit] = useState(10);
  const [contribOffset, setContribOffset] = useState(0);

  const joinWindow = useMemo(() => {
    if (!season?.starts_at) return { closed: true, label: "-" };
    // Z/+09:00 모두 파싱, timezone 미표기만 UTC로 보정
    const start = new Date(normalizeIsoForDate(season.starts_at)).getTime();
    const now = Date.now();
    if (now < start) return { closed: true, label: "시작 전" };

    const close = start + 24 * 60 * 60 * 1000;
    const remaining = close - now;
    if (remaining <= 0) return { closed: true, label: "마감" };
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining / (1000 * 60)) % 60);
    return { closed: false, label: `${hours}시간 ${minutes}분 남음` };
  }, [season?.starts_at]);

  const countdown = useMemo(() => {
    if (!season?.ends_at) return "-";
    const now = Date.now();
    const end = new Date(normalizeIsoForDate(season.ends_at)).getTime();
    const diff = end - now;
    if (diff <= 0) return "종료";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    return `${hours}시간 ${minutes}분`;
  }, [season?.ends_at]);

  const loadContributors = async (teamId: number, seasonId?: number) => {
    setContributorsLoading(true);
    try {
      const data = await getContributors(teamId, seasonId, contribLimit, contribOffset);
      setContributors(data);
    } catch (err) {
      console.error(err);
      setError("기여도를 불러오지 못했습니다");
    } finally {
      setContributorsLoading(false);
    }
  };

  const loadLeaderboard = async (seasonId?: number) => {
    try {
      const lb = await getLeaderboard(seasonId, lbLimit, lbOffset);
      setLeaderboard(lb);
    } catch (err) {
      console.error(err);
      setError("리더보드를 불러오지 못했습니다");
    }
  };

  const loadCore = async () => {
    setRefreshing(true);
    setError(null);
    try {
      const [seasonData, teamList, myTeamRes] = await Promise.all([
        getActiveSeason(),
        listTeams(),
        getMyTeam(),
      ]);
      setSeason(seasonData);
      setTeams(teamList);
      setMyTeam(myTeamRes);
      // 서버 기준 현재 소속이 없으면(selectedTeam stale 방지) 클라이언트 상태도 명시적으로 초기화
      setSelectedTeam(myTeamRes ? myTeamRes.team_id : null);
      await loadLeaderboard(seasonData?.id);
      const targetTeamId = myTeamRes?.team_id ?? selectedTeam;
      if (targetTeamId && seasonData) {
        loadContributors(targetTeamId, seasonData.id);
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

  useEffect(() => {
    if (season) {
      loadLeaderboard(season.id);
    }
  }, [season?.id, lbLimit, lbOffset]);

  useEffect(() => {
    if (season && selectedTeam) {
      loadContributors(selectedTeam, season.id);
    }
  }, [season?.id, selectedTeam, contribLimit, contribOffset]);

  const handleAutoAssign = async () => {
    setJoinBusy(true);
    setMessage(null);
    setError(null);
    try {
      const res = await autoAssignTeam();
      setSelectedTeam(res.team_id);
      setContribOffset(0);
      setMyTeam({ team_id: res.team_id, role: res.role, joined_at: new Date().toISOString() });
      setMessage(`팀에 합류했습니다 (team #${res.team_id})`);
      if (season) {
        loadContributors(res.team_id, season.id);
      }
    } catch (err) {
      console.error(err);
      const detail = (err as any)?.response?.data?.detail;
      const status = (err as any)?.response?.status;
      if (detail === "TEAM_SELECTION_CLOSED") {
        setError("팀 선택 창이 닫혔습니다 (시작 후 24시간 제한)");
      } else if (detail === "ALREADY_IN_TEAM") {
        setError("이미 팀에 가입되어 있습니다");
      } else if (detail === "TEAM_LOCKED") {
        setError("팀이 잠금 상태입니다. 지민이에게 문의하세요.");
      } else if (status === 401) {
        setError("로그인이 필요합니다");
      } else {
        setError("팀 자동 배정에 실패했습니다");
      }
    } finally {
      setJoinBusy(false);
    }
  };

  const joinButtonLabel = joinWindow.closed ? "선택 마감" : joinBusy ? "배정 중..." : "미스터리 팀 배정";
  const myTeamName = useMemo(() => teams.find((t) => t.id === selectedTeam)?.name, [teams, selectedTeam]);
  const showTeamSelectPanel = !joinWindow.closed && selectedTeam === null;
  const showContribPanel = selectedTeam !== null;
  const showTopGrid = showTeamSelectPanel || showContribPanel;

  const handleLbPrev = () => setLbOffset(Math.max(lbOffset - lbLimit, 0));
  const handleLbNext = () => {
    if (leaderboard.length < lbLimit) return;
    setLbOffset(lbOffset + lbLimit);
  };
  const handleContribPrev = () => setContribOffset(Math.max(contribOffset - contribLimit, 0));
  const handleContribNext = () => {
    if (contributors.length < contribLimit) return;
    setContribOffset(contribOffset + contribLimit);
  };

  return (
    return (
    <div className="relative space-y-8">
      {/* Background Atmosphere: Battle Clash */}
      <div className="pointer-events-none absolute -left-[20%] -top-[20%] h-[800px] w-[800px] rounded-full bg-blue-600/10 blur-[120px] mix-blend-screen" />
      <div className="pointer-events-none absolute -right-[20%] top-[10%] h-[800px] w-[800px] rounded-full bg-red-600/10 blur-[120px] mix-blend-screen" />

      {/* Header Section: Digital Billboard Style */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/60 shadow-2xl backdrop-blur-md">
        <div className="pointer-events-none absolute inset-0 bg-[url('/images/pattern-grid.svg')] opacity-10" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        <div className="relative flex flex-col items-center justify-between gap-6 p-8 md:flex-row">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-white/10 to-transparent shadow-inner ring-1 ring-white/10">
              <span className="text-3xl">⚔️</span>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-white/40">Season Event</p>
              <h1 className="text-3xl font-black text-white italic tracking-tight">TEAM BATTLE</h1>
              <p className="flex items-center gap-2 text-sm text-white/60">
                <span className={`inline-block h-2 w-2 rounded-full ${joinWindow.closed ? "bg-red-500" : "bg-emerald-500 animate-pulse"}`} />
                {joinWindow.closed ? "팀 배정 마감" : "팀 배정 진행 중"}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1">
            <p className="text-xs font-bold uppercase tracking-widest text-white/40">Time Remaining</p>
            <div className="font-mono text-4xl font-black text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">
              {countdown}
            </div>
            <button
              onClick={loadCore}
              disabled={refreshing}
              className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white transition-colors"
            >
              <span className={`${refreshing ? "animate-spin" : ""}`}>↻</span>
              UPDATE DATA
            </button>
          </div>
        </div>
      </div>

      {/* Rule Ticker */}
      <div className="flex items-center gap-3 overflow-hidden rounded-full border border-white/5 bg-white/[0.02] px-4 py-2 text-xs text-white/50 backdrop-blur-sm">
        <span className="font-bold text-cc-lime">INFO</span>
        <div className="flex gap-4 overflow-hidden whitespace-nowrap">
          <span>• 자동 배정 (밸런스 기준)</span>
          <span>• 시작 후 24시간 내 배정 가능</span>
          <span>• 게임 1회당 10점 (일일 최대 500점)</span>
          <span>• 상위 팀 전원 보상 지급</span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          {/* Team Select / Status Card */}
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-xl backdrop-blur-md">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">MY TEAM STATUS</h2>
              {myTeamName && (
                <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-bold text-white">
                  {myTeamName}
                </span>
              )}
            </div>

            {!selectedTeam ? (
              // Join Interface (Mission Control Style)
              <div className="flex flex-col items-center justify-center gap-6 py-8 text-center">
                <div className="relative">
                  <div className="absolute inset-0 animate-ping rounded-full bg-white/10 opacity-50" />
                  <div className="relative flex h-24 w-24 items-center justify-center rounded-full border border-white/20 bg-black/50 text-4xl shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                    ❓
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-white">소속된 팀이 없습니다</h3>
                  <p className="text-sm text-white/50">시스템이 전력을 분석하여 최적의 팀으로 배정합니다.</p>
                </div>
                <button
                  onClick={handleAutoAssign}
                  disabled={joinBusy || refreshing || joinWindow.closed}
                  className="group relative overflow-hidden rounded-xl bg-white px-8 py-4 font-bold text-black transition-transform active:scale-95 disabled:opacity-50"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    {joinBusy ? "ANALYZING..." : "AUTO ASSIGN TEAM"}
                  </span>
                  <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-gray-200 to-transparent transition-transform group-hover:translate-x-full" />
                </button>
                {joinWindow.closed && (
                  <p className="text-xs font-bold text-red-400">※ 현재 팀 배정 기간이 종료되었습니다.</p>
                )}
              </div>
            ) : (
              // Contribution Stats
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm text-white/60">
                  <span>Recent Contributors</span>
                  <div className="flex gap-2">
                    <button onClick={handleContribPrev} disabled={contribOffset === 0} className="hover:text-white disabled:opacity-30">←</button>
                    <button onClick={handleContribNext} disabled={contributors.length < contribLimit} className="hover:text-white disabled:opacity-30">→</button>
                  </div>
                </div>
                <div className="grid gap-2">
                  {contributorsLoading ? (
                    <div className="py-8 text-center text-xs text-white/30">LOADING DATA...</div>
                  ) : contributors.length > 0 ? (
                    contributors.map((c, i) => (
                      <div key={i} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 hover:bg-white/[0.05]">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-xs font-bold text-white/70">
                            {contribOffset + i + 1}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white">{c.nickname || "Unknown"}</p>
                            <p className="text-[10px] text-white/40">USER ID: {c.user_id}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-lg font-bold text-cc-lime">+{c.points}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-xs text-white/30">기여 내역이 없습니다.</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Leaderboard */}
        <div className="h-full">
          <div className="sticky top-6 overflow-hidden rounded-3xl border border-white/10 bg-black/40 shadow-xl backdrop-blur-md">
            <div className="border-b border-white/5 bg-white/[0.02] p-4">
              <h3 className="font-bold text-white">LEADERBOARD</h3>
            </div>
            <div className="divide-y divide-white/5 p-2">
              {leaderboard.map((row, idx) => (
                <div key={row.team_id} className={`flex items-center justify-between rounded-xl p-3 ${selectedTeam === row.team_id ? "bg-white/10 ring-1 ring-white/20" : ""}`}>
                  <div className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-black shadow-inner ${idx === 0 ? "bg-yellow-500 text-black" :
                        idx === 1 ? "bg-gray-300 text-black" :
                          idx === 2 ? "bg-orange-700 text-white" :
                            "bg-white/10 text-white/50"
                      }`}>
                      {idx + 1}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{row.team_name}</p>
                      <p className="text-[10px] text-white/40">{row.member_count} Members</p>
                    </div>
                  </div>
                  <p className="font-mono font-bold text-white">{row.points.toLocaleString()}</p>
                </div>
              ))}
              {leaderboard.length === 0 && (
                <div className="py-8 text-center text-xs text-white/30">순위 데이터 없음</div>
              )}
            </div>

            <div className="flex justify-center border-t border-white/5 p-2">
              <div className="flex gap-4 text-xs text-white/40">
                <button onClick={handleLbPrev} disabled={lbOffset === 0} className="hover:text-white disabled:opacity-30">PREV</button>
                <span>{lbOffset + 1}-{lbOffset + leaderboard.length}</span>
                <button onClick={handleLbNext} disabled={leaderboard.length < lbLimit} className="hover:text-white disabled:opacity-30">NEXT</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {message && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-bounce-in rounded-full border border-cc-lime/20 bg-black/80 px-6 py-3 text-sm font-bold text-cc-lime backdrop-blur-xl shadow-2xl">
          ✅ {message}
        </div>
      )}
      {error && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-bounce-in rounded-full border border-red-500/20 bg-black/80 px-6 py-3 text-sm font-bold text-red-400 backdrop-blur-xl shadow-2xl">
          ⚠️ {error}
        </div>
      )}
    </div>
  );
  );
};

export default TeamBattlePage;
