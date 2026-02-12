import { useState, useEffect, useCallback } from "react";
import {
  RefreshCw,
  ToggleLeft,
  ToggleRight,
  Users,
  Gift,
  Trophy,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import {
  getEventStats,
  toggleSecretCode,
  syncEvent,
  type EventStatsResponse,
} from "../../../api/adminEventApi";

// ============================================================================
// Admin Event Management Page — Valentine & Seol 2026
// ============================================================================

export default function AdminEventPage() {
  const [stats, setStats] = useState<EventStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getEventStats();
      setStats(data);
    } catch {
      setError("통계 데이터를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleToggleCode = async (codeId: number, currentActive: boolean) => {
    try {
      const result = await toggleSecretCode(codeId, !currentActive);
      setToast(result.message);
      fetchStats();
      setTimeout(() => setToast(null), 3000);
    } catch {
      setToast("코드 상태 변경 실패");
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await syncEvent();
      setToast(result.message);
      fetchStats();
      setTimeout(() => setToast(null), 3000);
    } catch {
      setToast("동기화 실패");
      setTimeout(() => setToast(null), 3000);
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="text-obsidian-accent animate-spin" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle size={40} className="text-red-400" />
        <p className="text-obsidian-muted">{error}</p>
        <button
          onClick={fetchStats}
          className="px-4 py-2 bg-obsidian-accent/20 text-obsidian-accent rounded-lg text-sm font-bold hover:bg-obsidian-accent/30"
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Toast */}
      {toast && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl bg-obsidian-accent/20 border border-obsidian-accent/30 text-obsidian-accent text-sm font-bold shadow-lg">
          <CheckCircle2 size={16} />
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            💝 발렌타인 & 설날 이벤트
          </h1>
          <p className="text-sm text-obsidian-muted mt-1">
            2026.02.14 — 02.17 | 이벤트 관리 및 모니터링
          </p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 px-4 py-2.5 bg-obsidian-accent/20 border border-obsidian-accent/30 rounded-xl text-sm font-bold text-obsidian-accent hover:bg-obsidian-accent/30 disabled:opacity-50 transition-all"
        >
          <RefreshCw size={16} className={syncing ? "animate-spin" : ""} />
          전역 동기화
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-obsidian-border bg-obsidian-surface p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Users size={20} className="text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-obsidian-muted">총 참여자</p>
              <p className="text-2xl font-bold text-white">
                {stats.total_participants.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-obsidian-border bg-obsidian-surface p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <Trophy size={20} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-obsidian-muted">스트릭 달성</p>
              <p className="text-2xl font-bold text-white">
                {stats.streak_completed_count.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-obsidian-border bg-obsidian-surface p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <Gift size={20} className="text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-obsidian-muted">코드 입력 총합</p>
              <p className="text-2xl font-bold text-white">
                {stats.secret_codes
                  .reduce((sum, c) => sum + c.claim_count, 0)
                  .toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Secret Codes Table */}
      <div className="rounded-2xl border border-obsidian-border bg-obsidian-surface overflow-hidden">
        <div className="px-5 py-4 border-b border-obsidian-border">
          <h2 className="text-lg font-bold text-white">비밀코드 관리</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-obsidian-border">
                <th className="text-left text-xs font-bold text-obsidian-muted px-5 py-3">
                  코드
                </th>
                <th className="text-left text-xs font-bold text-obsidian-muted px-5 py-3">
                  날짜
                </th>
                <th className="text-left text-xs font-bold text-obsidian-muted px-5 py-3">
                  보상
                </th>
                <th className="text-center text-xs font-bold text-obsidian-muted px-5 py-3">
                  입력 수
                </th>
                <th className="text-center text-xs font-bold text-obsidian-muted px-5 py-3">
                  만료
                </th>
                <th className="text-center text-xs font-bold text-obsidian-muted px-5 py-3">
                  상태
                </th>
              </tr>
            </thead>
            <tbody>
              {stats.secret_codes.map((code) => (
                <tr
                  key={code.id}
                  className="border-b border-obsidian-border/50 hover:bg-white/[0.02]"
                >
                  <td className="px-5 py-3">
                    <code className="text-sm font-mono font-bold text-white bg-white/5 px-2 py-1 rounded">
                      {code.code}
                    </code>
                  </td>
                  <td className="px-5 py-3 text-sm text-obsidian-muted">
                    {code.event_date}
                  </td>
                  <td className="px-5 py-3 text-sm text-white">
                    {code.reward_type} ×{code.reward_amount}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className="text-sm font-bold text-white">
                      {code.claim_count}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-center text-xs text-obsidian-muted">
                    {code.expires_at.split("T")[0] || code.expires_at.slice(0, 10)}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <button
                      onClick={() => handleToggleCode(code.id, code.is_active)}
                      className="inline-flex items-center gap-1.5 text-sm font-bold transition-colors"
                    >
                      {code.is_active ? (
                        <>
                          <ToggleRight size={20} className="text-emerald-400" />
                          <span className="text-emerald-400">활성</span>
                        </>
                      ) : (
                        <>
                          <ToggleLeft size={20} className="text-red-400" />
                          <span className="text-red-400">비활성</span>
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mission Stats Table */}
      <div className="rounded-2xl border border-obsidian-border bg-obsidian-surface overflow-hidden">
        <div className="px-5 py-4 border-b border-obsidian-border">
          <h2 className="text-lg font-bold text-white">미션 참여 현황</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-obsidian-border">
                <th className="text-left text-xs font-bold text-obsidian-muted px-5 py-3">
                  미션
                </th>
                <th className="text-center text-xs font-bold text-obsidian-muted px-5 py-3">
                  참여
                </th>
                <th className="text-center text-xs font-bold text-obsidian-muted px-5 py-3">
                  완료
                </th>
                <th className="text-center text-xs font-bold text-obsidian-muted px-5 py-3">
                  수령
                </th>
                <th className="text-center text-xs font-bold text-obsidian-muted px-5 py-3">
                  완료율
                </th>
              </tr>
            </thead>
            <tbody>
              {stats.missions.map((mission) => (
                <tr
                  key={mission.mission_id}
                  className="border-b border-obsidian-border/50 hover:bg-white/[0.02]"
                >
                  <td className="px-5 py-3">
                    <div>
                      <p className="text-sm font-bold text-white">
                        {mission.title}
                      </p>
                      <p className="text-xs text-obsidian-muted">
                        {mission.logic_key}
                      </p>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-center text-sm text-white font-bold">
                    {mission.total_participants}
                  </td>
                  <td className="px-5 py-3 text-center text-sm text-emerald-400 font-bold">
                    {mission.completed_count}
                  </td>
                  <td className="px-5 py-3 text-center text-sm text-blue-400 font-bold">
                    {mission.claimed_count}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-obsidian-border overflow-hidden">
                        <div
                          className="h-full rounded-full bg-obsidian-accent"
                          style={{ width: `${mission.completion_rate}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-obsidian-muted">
                        {mission.completion_rate}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
