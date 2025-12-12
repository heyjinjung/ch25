import React, { useEffect, useState } from "react";
import { createSeason, setSeasonActive, createTeam, settleSeason, listTeams, getActiveSeason } from "../../api/teamBattleApi";
import { Team, TeamSeason } from "../../types/teamBattle";

const formatDateTime = (iso?: string) => (iso ? new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }) : "-");

const AdminTeamBattlePage: React.FC = () => {
  const [season, setSeason] = useState<TeamSeason | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [seasonForm, setSeasonForm] = useState({ name: "", starts_at: "", ends_at: "", is_active: false });
  const [teamForm, setTeamForm] = useState({ name: "", icon: "", leader_user_id: "" });
  const [refreshing, setRefreshing] = useState(false);
  const [createSeasonBusy, setCreateSeasonBusy] = useState(false);
  const [activateBusy, setActivateBusy] = useState(false);
  const [createTeamBusy, setCreateTeamBusy] = useState(false);
  const [settleBusy, setSettleBusy] = useState(false);

  const refresh = async () => {
    setError(null);
    setRefreshing(true);
    try {
      const [s, t] = await Promise.all([getActiveSeason(), listTeams()]);
      setSeason(s);
      setTeams(t);
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

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">팀 배틀 관리</h1>

      <div className="bg-white p-4 rounded shadow space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">시즌 생성</h2>
          <div className="text-xs text-gray-500">모든 시각은 Asia/Seoul 기준</div>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <input className="border p-2 rounded" placeholder="이름" value={seasonForm.name} onChange={(e) => setSeasonForm({ ...seasonForm, name: e.target.value })} />
          <label className="text-sm text-gray-500">Asia/Seoul 기준 ISO (예: 2025-12-12T00:00:00+09:00)</label>
          <input className="border p-2 rounded" placeholder="시작 시각" value={seasonForm.starts_at} onChange={(e) => setSeasonForm({ ...seasonForm, starts_at: e.target.value })} />
          <input className="border p-2 rounded" placeholder="종료 시각" value={seasonForm.ends_at} onChange={(e) => setSeasonForm({ ...seasonForm, ends_at: e.target.value })} />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={seasonForm.is_active} onChange={(e) => setSeasonForm({ ...seasonForm, is_active: e.target.checked })} /> 활성화</label>
        </div>
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-60"
          onClick={handleCreateSeason}
          disabled={createSeasonBusy || !seasonForm.name || !seasonForm.starts_at || !seasonForm.ends_at}
        >
          {createSeasonBusy ? "생성 중..." : "시즌 생성"}
        </button>
      </div>

      <div className="bg-white p-4 rounded shadow space-y-3">
        <h2 className="text-lg font-semibold">활성 시즌</h2>
        <p className="text-sm">{season ? `${season.name} (${formatDateTime(season.starts_at)} ~ ${formatDateTime(season.ends_at)})` : "없음"}</p>
        <div className="flex gap-2">
          <button className="px-3 py-2 bg-green-600 text-white rounded disabled:opacity-60" onClick={handleActivate} disabled={!season || activateBusy}>{activateBusy ? "활성화 중..." : "활성화"}</button>
          <button className="px-3 py-2 bg-indigo-600 text-white rounded disabled:opacity-60" onClick={handleSettle} disabled={!season || settleBusy}>{settleBusy ? "정산 중..." : "정산"}</button>
          <button className="px-3 py-2 border rounded" onClick={refresh} disabled={refreshing}>{refreshing ? "새로고침 중..." : "새로고침"}</button>
        </div>
      </div>

      <div className="bg-white p-4 rounded shadow space-y-3">
        <h2 className="text-lg font-semibold">팀 관리 (2팀 구성 권장)</h2>
        <div className="grid md:grid-cols-3 gap-3">
          <input className="border p-2 rounded" placeholder="팀 이름" value={teamForm.name} onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })} />
          <input className="border p-2 rounded" placeholder="아이콘 URL (선택)" value={teamForm.icon} onChange={(e) => setTeamForm({ ...teamForm, icon: e.target.value })} />
          <input className="border p-2 rounded" placeholder="리더 user_id (선택)" value={teamForm.leader_user_id} onChange={(e) => setTeamForm({ ...teamForm, leader_user_id: e.target.value })} />
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
            <div key={t.id} className="border rounded p-3">
              <p className="font-semibold">{t.name}</p>
              <p className="text-xs text-gray-500">ID: {t.id}</p>
            </div>
          ))}
          {teams.length === 0 && <p className="text-sm text-gray-500">팀 없음</p>}
        </div>
      </div>

      {message && <div className="p-3 bg-green-50 text-green-800 rounded">{message}</div>}
      {error && <div className="p-3 bg-red-50 text-red-800 rounded">{error}</div>}
    </div>
  );
};

export default AdminTeamBattlePage;
