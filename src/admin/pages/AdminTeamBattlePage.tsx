import React, { useEffect, useState } from "react";
import {
  createSeason,
  setSeasonActive,
  createTeam,
  settleSeason,
  getActiveSeason,
  updateSeason,
  deleteSeason,
  listTeamsAdmin,
  updateTeam,
  deleteTeam,
  forceJoinTeam,
  getLeaderboard,
  getContributors,
} from "../../api/teamBattleApi";
import { Team, TeamSeason, LeaderboardEntry, ContributorEntry } from "../../types/teamBattle";

const formatDateTime = (iso?: string) => (iso ? new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }) : "-");

const AdminTeamBattlePage: React.FC = () => {
  const [season, setSeason] = useState<TeamSeason | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamEdits, setTeamEdits] = useState<Record<number, { name: string; icon: string; is_active: boolean }>>({});
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [contributors, setContributors] = useState<ContributorEntry[]>([]);
  const [selectedTeamForContrib, setSelectedTeamForContrib] = useState<number | "" | null>(null);
  const [contribLimit, setContribLimit] = useState(20);
  const [contribOffset, setContribOffset] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [seasonForm, setSeasonForm] = useState({ name: "", starts_at: "", ends_at: "", is_active: false });
  const [seasonEditForm, setSeasonEditForm] = useState({ name: "", starts_at: "", ends_at: "", is_active: false });
  const [teamForm, setTeamForm] = useState({ name: "", icon: "", leader_user_id: "" });
  const [forceJoinForm, setForceJoinForm] = useState({ user_id: "", team_id: "" });
  const [refreshing, setRefreshing] = useState(false);
  const [createSeasonBusy, setCreateSeasonBusy] = useState(false);
  const [activateBusy, setActivateBusy] = useState(false);
  const [createTeamBusy, setCreateTeamBusy] = useState(false);
  const [settleBusy, setSettleBusy] = useState(false);
  const [updateSeasonBusy, setUpdateSeasonBusy] = useState(false);
  const [deleteSeasonBusy, setDeleteSeasonBusy] = useState(false);
  const [teamBusy, setTeamBusy] = useState<number | null>(null);
  const [teamDeleteBusy, setTeamDeleteBusy] = useState<number | null>(null);
  const [forceJoinBusy, setForceJoinBusy] = useState(false);
  const [contributorsBusy, setContributorsBusy] = useState(false);

  const inputClass =
    "w-full rounded-lg border border-emerald-800/50 bg-slate-900/80 p-2 text-slate-100 placeholder-slate-500 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40";
  const cardClass = "rounded-xl border border-emerald-800/40 bg-slate-900/80 p-4 shadow-lg shadow-emerald-900/20";

  const refresh = async () => {
    setError(null);
    setRefreshing(true);
    try {
      const [s, t, lb] = await Promise.all([getActiveSeason(), listTeamsAdmin(true), getLeaderboard(undefined, 100, 0)]);
      setSeason(s);
      if (s) {
        setSeasonEditForm({
          name: s.name,
          starts_at: s.starts_at,
          ends_at: s.ends_at,
          is_active: s.is_active,
        });
      }
      setTeams(t);
      setLeaderboard(lb);
      if (lb.length && selectedTeamForContrib === null) {
        setSelectedTeamForContrib(lb[0].team_id);
      }
      const mapped = t.reduce<Record<number, { name: string; icon: string; is_active: boolean }>>((acc, team) => {
        acc[team.id] = { name: team.name, icon: team.icon || "", is_active: team.is_active };
        return acc;
      }, {});
      setTeamEdits(mapped);
    } catch (err) {
      console.error(err);
      setError("관리자 데이터를 불러오지 못했습니다.");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const loadContributors = async (teamId: number | "" | null, seasonId?: number) => {
    if (!teamId || !seasonId) {
      setContributors([]);
      return;
    }
    setContributorsBusy(true);
    try {
      const data = await getContributors(teamId as number, seasonId, contribLimit, contribOffset);
      setContributors(data);
    } catch (err) {
      console.error(err);
      setError("기여도 목록을 불러오지 못했습니다.");
    } finally {
      setContributorsBusy(false);
    }
  };

  useEffect(() => {
    if (season) {
      loadContributors(selectedTeamForContrib, season.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTeamForContrib, contribLimit, contribOffset, season?.id]);

  const handleCreateSeason = async () => {
    setError(null);
    setMessage(null);
    setCreateSeasonBusy(true);
    try {
      const payload = {
        name: seasonForm.name,
        starts_at: seasonForm.starts_at,
        ends_at: seasonForm.ends_at,
        is_active: seasonForm.is_active,
      };
      const res = await createSeason(payload);
      setSeason(res);
      setSeasonEditForm({ name: res.name, starts_at: res.starts_at, ends_at: res.ends_at, is_active: res.is_active });
      setMessage("시즌 생성 완료");
    } catch (err) {
      console.error(err);
      setError("시즌 생성 실패");
    } finally {
      setCreateSeasonBusy(false);
    }
  };

  const handleActivate = async () => {
    if (!season) return;
    setError(null);
    setMessage(null);
    setActivateBusy(true);
    try {
      const res = await setSeasonActive(season.id, true);
      setSeason(res);
      setMessage("시즌 활성화 완료");
    } catch (err) {
      console.error(err);
      setError("시즌 활성화 실패");
    } finally {
      setActivateBusy(false);
    }
  };

  const handleCreateTeam = async () => {
    setError(null);
    setMessage(null);
    setCreateTeamBusy(true);
    try {
      await createTeam({ name: teamForm.name, icon: teamForm.icon || null }, teamForm.leader_user_id ? Number(teamForm.leader_user_id) : undefined);
      setTeamForm({ name: "", icon: "", leader_user_id: "" });
      await refresh();
      setMessage("팀 생성 완료");
    } catch (err) {
      console.error(err);
      setError("팀 생성 실패");
    } finally {
      setCreateTeamBusy(false);
    }
  };

  const handleSettle = async () => {
    if (!season) return;
    if (!leaderboard.length) {
      setError("정산할 점수가 없습니다. 리더보드가 비어있습니다.");
      return;
    }
    setError(null);
    setMessage(null);
    setSettleBusy(true);
    try {
      await settleSeason(season.id);
      setMessage("정산 완료 (우승팀 CC 코인 지급)");
    } catch (err) {
      console.error(err);
      setError("정산 실패");
    } finally {
      setSettleBusy(false);
    }
  };

  const handleUpdateSeason = async () => {
    if (!season) return;
    setError(null);
    setMessage(null);
    setUpdateSeasonBusy(true);
    try {
      const res = await updateSeason(season.id, seasonEditForm);
      setSeason(res);
      setMessage("시즌 수정 완료");
    } catch (err) {
      console.error(err);
      setError("시즌 수정 실패");
    } finally {
      setUpdateSeasonBusy(false);
    }
  };

  const handleContribPrev = () => {
    setContribOffset(Math.max(contribOffset - contribLimit, 0));
  };

  const handleContribNext = () => {
    if (contributors.length < contribLimit) return;
    setContribOffset(contribOffset + contribLimit);
  };

  const handleDeleteSeason = async () => {
    if (!season) return;
    setError(null);
    setMessage(null);
    setDeleteSeasonBusy(true);
    try {
      await deleteSeason(season.id);
      setSeason(null);
      setMessage("시즌 삭제 완료");
    } catch (err) {
      console.error(err);
      setError("시즌 삭제 실패");
    } finally {
      setDeleteSeasonBusy(false);
    }
  };

  const handleTeamUpdate = async (teamId: number, overrides?: Partial<{ name: string; icon: string; is_active: boolean }>) => {
    const base = teamEdits[teamId];
    const edit = base ? { ...base, ...overrides } : undefined;
    if (!edit) return;
    setError(null);
    setMessage(null);
    setTeamBusy(teamId);
    try {
      await updateTeam(teamId, { name: edit.name, icon: edit.icon || null, is_active: edit.is_active });
      await refresh();
      setMessage("팀 수정 완료");
    } catch (err) {
      console.error(err);
      setError("팀 수정 실패");
    } finally {
      setTeamBusy(null);
    }
  };

  const handleTeamDelete = async (teamId: number) => {
    setError(null);
    setMessage(null);
    setTeamDeleteBusy(teamId);
    try {
      await deleteTeam(teamId);
      await refresh();
      setMessage("팀 삭제 완료");
    } catch (err) {
      console.error(err);
      setError("팀 삭제 실패");
    } finally {
      setTeamDeleteBusy(null);
    }
  };

  const handleForceJoin = async () => {
    if (!forceJoinForm.user_id || !forceJoinForm.team_id) return;
    setError(null);
    setMessage(null);
    setForceJoinBusy(true);
    try {
      await forceJoinTeam({ user_id: Number(forceJoinForm.user_id), team_id: Number(forceJoinForm.team_id) });
      setMessage("강제 배정 완료");
    } catch (err) {
      console.error(err);
      const detail = (err as any)?.response?.data?.detail;
      if (detail === "ALREADY_IN_TEAM") {
        setError("이미 팀에 속한 사용자입니다. 이동하려면 먼저 기존 팀에서 제거하세요.");
      } else if (detail === "TEAM_NOT_FOUND") {
        setError("팀을 찾을 수 없습니다.");
      } else {
        setError("강제 배정 실패");
      }
    } finally {
      setForceJoinBusy(false);
    }
  };

  return (
    <div className="p-4 space-y-4 text-slate-100">
      <h1 className="text-2xl font-bold text-emerald-100">팀 배틀 관리</h1>

      <div className={cardClass + " space-y-3"}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-emerald-100">시즌 생성</h2>
          <div className="text-xs text-slate-400">모든 시각은 Asia/Seoul 기준</div>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <input className={inputClass} placeholder="이름" value={seasonForm.name} onChange={(e) => setSeasonForm({ ...seasonForm, name: e.target.value })} />
          <label className="text-sm text-slate-400">Asia/Seoul 기준 ISO (예: 2025-12-12T00:00:00+09:00)</label>
          <input className={inputClass} placeholder="시작 시각" value={seasonForm.starts_at} onChange={(e) => setSeasonForm({ ...seasonForm, starts_at: e.target.value })} />
          <input className={inputClass} placeholder="종료 시각" value={seasonForm.ends_at} onChange={(e) => setSeasonForm({ ...seasonForm, ends_at: e.target.value })} />
          <label className="flex items-center gap-2 text-sm text-slate-200"><input type="checkbox" checked={seasonForm.is_active} onChange={(e) => setSeasonForm({ ...seasonForm, is_active: e.target.checked })} /> 활성화</label>
        </div>
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-60"
          onClick={handleCreateSeason}
          disabled={createSeasonBusy || !seasonForm.name || !seasonForm.starts_at || !seasonForm.ends_at}
        >
          {createSeasonBusy ? "생성 중..." : "시즌 생성"}
        </button>
      </div>

      <div className={cardClass + " space-y-3"}>
        <h2 className="text-lg font-semibold text-emerald-100">활성 시즌</h2>
        <p className="text-sm">{season ? `${season.name} (${formatDateTime(season.starts_at)} ~ ${formatDateTime(season.ends_at)})` : "없음"}</p>
        {season ? (
          <>
            <div className="grid md:grid-cols-2 gap-3">
              <input className={inputClass} placeholder="이름" value={seasonEditForm.name} onChange={(e) => setSeasonEditForm({ ...seasonEditForm, name: e.target.value })} />
              <label className="text-sm text-slate-400">Asia/Seoul 기준 ISO (예: 2025-12-12T00:00:00+09:00)</label>
              <input className={inputClass} placeholder="시작 시각" value={seasonEditForm.starts_at} onChange={(e) => setSeasonEditForm({ ...seasonEditForm, starts_at: e.target.value })} />
              <input className={inputClass} placeholder="종료 시각" value={seasonEditForm.ends_at} onChange={(e) => setSeasonEditForm({ ...seasonEditForm, ends_at: e.target.value })} />
              <label className="flex items-center gap-2 text-sm text-slate-200"><input type="checkbox" checked={seasonEditForm.is_active} onChange={(e) => setSeasonEditForm({ ...seasonEditForm, is_active: e.target.checked })} /> 활성화</label>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="px-3 py-2 bg-green-600 text-white rounded disabled:opacity-60" onClick={handleActivate} disabled={!season || activateBusy}>{activateBusy ? "활성화 중..." : "활성화"}</button>
              <button className="px-3 py-2 bg-indigo-600 text-white rounded disabled:opacity-60" onClick={handleSettle} disabled={!season || settleBusy}>{settleBusy ? "정산 중..." : "정산"}</button>
              <button className="px-3 py-2 bg-amber-600 text-white rounded disabled:opacity-60" onClick={handleUpdateSeason} disabled={!season || updateSeasonBusy}>{updateSeasonBusy ? "수정 중..." : "수정"}</button>
              <button className="px-3 py-2 bg-red-600 text-white rounded disabled:opacity-60" onClick={handleDeleteSeason} disabled={!season || deleteSeasonBusy}>{deleteSeasonBusy ? "삭제 중..." : "삭제"}</button>
              <button className="px-3 py-2 border rounded" onClick={refresh} disabled={refreshing}>{refreshing ? "새로고침 중..." : "새로고침"}</button>
            </div>
          </>
        ) : (
          <div className="flex gap-2">
            <button className="px-3 py-2 border rounded" onClick={refresh} disabled={refreshing}>{refreshing ? "새로고침 중..." : "새로고침"}</button>
          </div>
        )}
      </div>

      <div className={cardClass + " space-y-3"}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-emerald-100">팀 관리 (2팀 구성 권장)</h2>
          <button className="px-3 py-2 border rounded" onClick={refresh} disabled={refreshing}>{refreshing ? "새로고침 중..." : "새로고침"}</button>
        </div>
        <div className="grid md:grid-cols-3 gap-3">
          <input className={inputClass} placeholder="팀 이름" value={teamForm.name} onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })} />
          <input className={inputClass} placeholder="아이콘 URL (선택)" value={teamForm.icon} onChange={(e) => setTeamForm({ ...teamForm, icon: e.target.value })} />
          <input className={inputClass} placeholder="리더 user_id (선택)" value={teamForm.leader_user_id} onChange={(e) => setTeamForm({ ...teamForm, leader_user_id: e.target.value })} />
        </div>
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-60"
          onClick={handleCreateTeam}
          disabled={createTeamBusy || !teamForm.name}
        >
          {createTeamBusy ? "생성 중..." : "팀 생성"}
        </button>

        <div className="mt-3 grid sm:grid-cols-2 gap-2">
          {teams.map((t) => (
            <div key={t.id} className="rounded-lg border border-emerald-800/40 bg-slate-950/60 p-3 shadow-sm shadow-emerald-900/10 space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-semibold">{t.name}</p>
                <span className={`text-xs ${t.is_active ? "text-green-600" : "text-gray-500"}`}>{t.is_active ? "활성" : "비활성"}</span>
              </div>
              <p className="text-xs text-gray-500">ID: {t.id}</p>
              <input
                className={inputClass}
                value={teamEdits[t.id]?.name || ""}
                onChange={(e) => setTeamEdits({ ...teamEdits, [t.id]: { ...teamEdits[t.id], name: e.target.value, icon: teamEdits[t.id]?.icon || "", is_active: teamEdits[t.id]?.is_active ?? t.is_active } })}
                placeholder="팀 이름"
              />
              <input
                className={inputClass}
                value={teamEdits[t.id]?.icon || ""}
                onChange={(e) => setTeamEdits({ ...teamEdits, [t.id]: { ...teamEdits[t.id], name: teamEdits[t.id]?.name || t.name, icon: e.target.value, is_active: teamEdits[t.id]?.is_active ?? t.is_active } })}
                placeholder="아이콘 URL"
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={teamEdits[t.id]?.is_active ?? t.is_active}
                  onChange={(e) => setTeamEdits({ ...teamEdits, [t.id]: { ...teamEdits[t.id], name: teamEdits[t.id]?.name || t.name, icon: teamEdits[t.id]?.icon || t.icon || "", is_active: e.target.checked } })}
                />
                활성화
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  className="px-3 py-2 bg-amber-600 text-white rounded disabled:opacity-60"
                  onClick={() => handleTeamUpdate(t.id)}
                  disabled={teamBusy === t.id}
                >
                  {teamBusy === t.id ? "저장 중..." : "수정"}
                </button>
                <button
                  className="px-3 py-2 bg-slate-700 text-white rounded disabled:opacity-60"
                  onClick={() => {
                    const current = teamEdits[t.id]?.is_active ?? t.is_active;
                    const next = !current;
                    setTeamEdits({ ...teamEdits, [t.id]: { ...teamEdits[t.id], name: teamEdits[t.id]?.name || t.name, icon: teamEdits[t.id]?.icon || t.icon || "", is_active: next } });
                    handleTeamUpdate(t.id, { is_active: next });
                  }}
                  disabled={teamBusy === t.id}
                >
                  {teamBusy === t.id ? "처리 중..." : (teamEdits[t.id]?.is_active ?? t.is_active) ? "비활성" : "활성"}
                </button>
                <button
                  className="px-3 py-2 bg-red-600 text-white rounded disabled:opacity-60"
                  onClick={() => handleTeamDelete(t.id)}
                  disabled={teamDeleteBusy === t.id}
                >
                  {teamDeleteBusy === t.id ? "삭제 중..." : "삭제"}
                </button>
              </div>
            </div>
          ))}
          {teams.length === 0 && <p className="text-sm text-gray-500">팀 없음</p>}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className={cardClass + " space-y-3"}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-emerald-100">리더보드</h2>
            <button className="px-3 py-2 border rounded" onClick={refresh} disabled={refreshing}>{refreshing ? "새로고침 중..." : "새로고침"}</button>
          </div>
          {leaderboard.length === 0 && <p className="text-sm text-slate-400">점수가 없습니다.</p>}
          {leaderboard.length > 0 && (
            <div className="overflow-x-auto text-sm">
              <table className="min-w-full divide-y divide-emerald-900/60">
                <thead>
                  <tr className="text-left text-emerald-200">
                    <th className="py-2">순위</th>
                    <th className="py-2">팀</th>
                    <th className="py-2">점수</th>
                    <th className="py-2">인원</th>
                    <th className="py-2">최신 이벤트</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-900/40">
                  {leaderboard.map((row, idx) => (
                    <tr key={row.team_id}>
                      <td className="py-2">#{idx + 1}</td>
                      <td className="py-2">{row.team_name}</td>
                      <td className="py-2">{row.points.toLocaleString()}</td>
                      <td className="py-2">{row.member_count ?? 0}</td>
                      <td className="py-2 text-xs text-slate-300">{row.latest_event_at ? formatDateTime(row.latest_event_at) : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className={cardClass + " space-y-3"}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-emerald-100">팀별 기여도</h2>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <select
                value={selectedTeamForContrib ?? ""}
                onChange={(e) => {
                  setContribOffset(0);
                  setSelectedTeamForContrib(e.target.value === "" ? null : Number(e.target.value));
                }}
                className="rounded-lg border border-emerald-800/60 bg-slate-900/80 px-2 py-1 text-slate-100"
              >
                <option value="">팀 선택</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
              <select
                value={contribLimit}
                onChange={(e) => {
                  setContribOffset(0);
                  setContribLimit(Number(e.target.value));
                }}
                className="rounded-lg border border-emerald-800/60 bg-slate-900/80 px-2 py-1 text-slate-100"
              >
                {[10, 20, 50, 100].map((n) => (
                  <option key={n} value={n}>{n}개씩</option>
                ))}
              </select>
              <button
                onClick={() => {
                  if (season) {
                    loadContributors(selectedTeamForContrib, season.id);
                  }
                }}
                className="rounded-lg bg-emerald-700 px-3 py-1 font-semibold text-white hover:bg-emerald-600"
                disabled={contributorsBusy}
              >
                {contributorsBusy ? "불러오는 중" : "새로고침"}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto overflow-y-auto max-h-96 text-sm">
            <table className="min-w-full divide-y divide-emerald-900/60">
              <thead>
                <tr className="text-left text-emerald-200">
                  <th className="py-2">순위</th>
                  <th className="py-2">닉네임 / user_id</th>
                  <th className="py-2">점수</th>
                  <th className="py-2">최근 적립</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-900/40">
                {contributors.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-3 text-center text-slate-400">기여도 데이터가 없습니다.</td>
                  </tr>
                )}
                {contributors.map((c, idx) => (
                  <tr key={`${c.user_id}-${idx}`}>
                    <td className="py-2">{contribOffset + idx + 1}</td>
                    <td className="py-2">
                      <div className="font-semibold text-slate-100">{c.nickname || "닉네임 없음"}</div>
                      <div className="text-xs text-slate-400">#{c.user_id}</div>
                    </td>
                    <td className="py-2">{c.points.toLocaleString()}</td>
                    <td className="py-2 text-xs text-slate-300">{c.latest_event_at ? formatDateTime(c.latest_event_at) : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between text-sm text-slate-200">
            <div>표시: {contributors.length ? `${contribOffset + 1} - ${contribOffset + contributors.length}` : "0"}</div>
            <div className="flex gap-2">
              <button onClick={handleContribPrev} className="rounded border border-slate-700 px-3 py-1 hover:border-emerald-500">이전</button>
              <button onClick={handleContribNext} className="rounded border border-slate-700 px-3 py-1 hover:border-emerald-500">다음</button>
            </div>
          </div>
        </div>
      </div>

      <div className={cardClass + " space-y-3"}>
        <h2 className="text-lg font-semibold text-emerald-100">강제 팀 배정/이동</h2>
        <div className="grid md:grid-cols-2 gap-3">
          <input className={inputClass} placeholder="user_id" value={forceJoinForm.user_id} onChange={(e) => setForceJoinForm({ ...forceJoinForm, user_id: e.target.value })} />
          <input className={inputClass} placeholder="team_id" value={forceJoinForm.team_id} onChange={(e) => setForceJoinForm({ ...forceJoinForm, team_id: e.target.value })} />
        </div>
        <button className="px-4 py-2 bg-indigo-600 text-white rounded disabled:opacity-60" onClick={handleForceJoin} disabled={forceJoinBusy || !forceJoinForm.user_id || !forceJoinForm.team_id}>
          {forceJoinBusy ? "배정 중..." : "강제 배정"}
        </button>
      </div>

      {message && <div className="p-3 rounded bg-emerald-900/60 text-emerald-100 border border-emerald-700/60">{message}</div>}
      {error && <div className="p-3 rounded bg-red-900/60 text-red-100 border border-red-700/60">{error}</div>}
    </div>
  );
};

export default AdminTeamBattlePage;
