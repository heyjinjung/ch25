// src/admin/pages/RankingAdminPage.tsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Trophy,
  Calendar,
  RefreshCw,
  Save,
  Trash2,
  Medal,
  Crown,
  Award,
  ChevronUp,
} from "lucide-react";
import {
  fetchRankingByDate,
  upsertRanking,
  AdminRankingEntry,
  AdminRankingEntryPayload
} from "../api/adminRankingApi";

const RankingAdminPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [editingRanking, setEditingRanking] = useState<AdminRankingEntryPayload[]>([]);

  const { data: ranking, isLoading } = useQuery({
    queryKey: ["admin", "ranking", selectedDate],
    queryFn: () => fetchRankingByDate(selectedDate),
  });

  const upsertMutation = useMutation({
    mutationFn: (entries: AdminRankingEntryPayload[]) => upsertRanking(selectedDate, entries),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "ranking", selectedDate] });
      setEditingRanking([]);
    },
  });

  const handleAddRank = () => {
    const newRank: AdminRankingEntryPayload = {
      date: selectedDate,
      rank: (editingRanking.length || 0) + 1,
      user_name: "",
      score: 0,
    };
    setEditingRanking([...editingRanking, newRank]);
  };

  const handleUpdateRank = (index: number, field: keyof AdminRankingEntryPayload, value: any) => {
    const updated = [...editingRanking];
    updated[index] = { ...updated[index], [field]: value };
    setEditingRanking(updated);
  };

  const handleSave = () => {
    upsertMutation.mutate(editingRanking);
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="h-5 w-5 text-admin-warning" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-admin-text-secondary" />;
    if (rank === 3) return <Award className="h-5 w-5 text-admin-danger" />;
    return <Trophy className="h-5 w-5 text-admin-text-muted" />;
  };

  return (
    <section className="admin-page-container space-y-10 pb-20">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-admin-warning">
            <Trophy className="h-5 w-5" />
            <span className="text-admin-meta font-black uppercase tracking-[0.2em]">Ranking System Management</span>
          </div>
          <h1 className="text-admin-title text-admin-text-primary">랭킹 시스템 관리</h1>
          <p className="text-admin-body text-admin-text-secondary font-medium">
            날짜별 랭킹 데이터를 조회하고 수동으로 편집합니다.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ["admin", "ranking"] })}
            disabled={isLoading}
            className="btn-admin-secondary flex items-center gap-2 px-5 py-2.5 h-auto disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} /> 새로고침
          </button>
          {editingRanking.length > 0 && (
            <button
              onClick={handleSave}
              disabled={upsertMutation.isPending}
              className="btn-admin-primary flex items-center gap-2 px-5 py-2.5 h-auto shadow-admin-glow disabled:opacity-50"
            >
              {upsertMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" /> 저장 중...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" /> 변경사항 저장
                </>
              )}
            </button>
          )}
        </div>
      </header>

      {/* Date Selector */}
      <div className="admin-card-premium p-6 flex items-center gap-4">
        <Calendar className="h-5 w-5 text-admin-brand" />
        <div className="flex-1">
          <label
            htmlFor="ranking-admin-selected-date"
            className="text-admin-meta font-black text-admin-text-secondary uppercase tracking-widest block mb-2"
          >
            조회 날짜
          </label>
          <input
            id="ranking-admin-selected-date"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="admin-input h-11 w-full md:w-64"
            aria-label="조회 날짜"
            title="조회 날짜"
          />
        </div>
        <button
          onClick={handleAddRank}
          type="button"
          className="btn-admin-secondary px-4 py-2 h-auto text-xs font-black"
          aria-label="순위 추가"
          title="순위 추가"
        >
          + 순위 추가
        </button>
      </div>

      {/* Ranking Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="admin-card-premium p-6 flex flex-col justify-between h-32">
          <p className="text-[10px] font-black text-admin-text-muted uppercase tracking-widest">총 순위 수</p>
          <div className="flex items-end justify-between">
            <p className="text-3xl font-black text-admin-text-primary">{(ranking?.length || 0) + editingRanking.length}</p>
            <Trophy className="h-5 w-5 text-admin-warning mb-1" />
          </div>
        </div>
        <div className="admin-card-premium p-6 flex flex-col justify-between h-32">
          <p className="text-[10px] font-black text-admin-text-muted uppercase tracking-widest">최고 점수</p>
          <div className="flex items-end justify-between">
            <p className="text-3xl font-black text-admin-accent tabular-nums">
              {Math.max(...(ranking?.map(r => r.score || 0) || [0]), ...editingRanking.map(r => r.score || 0)).toLocaleString()}
            </p>
            <ChevronUp className="h-5 w-5 text-admin-accent mb-1" />
          </div>
        </div>
        <div className="admin-card-premium p-6 flex flex-col justify-between h-32 border-l-4 border-admin-warning">
          <p className="text-[10px] font-black text-admin-text-muted uppercase tracking-widest">선택된 날짜</p>
          <p className="text-lg font-black text-admin-text-primary">{selectedDate}</p>
        </div>
      </div>

      {/* Ranking Table */}
      <div className="admin-card-premium overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-4">
            <RefreshCw className="h-8 w-8 text-admin-brand animate-spin" />
            <p className="text-admin-meta text-admin-text-secondary">데이터 로딩 중...</p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="admin-table">
              <thead>
                <tr className="admin-th">
                  <th className="px-4 py-3.5 text-center w-20">순위</th>
                  <th className="px-4 py-3.5 text-left">사용자명</th>
                  <th className="px-4 py-3.5 text-right">점수</th>
                  <th className="px-4 py-3.5 text-center">액션</th>
                </tr>
              </thead>
              <tbody>
                {/* Existing Ranking */}
                {ranking?.map((entry: AdminRankingEntry, index: number) => (
                  <tr key={index} className="admin-td group">
                    <td className="px-4 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {getRankIcon(entry.rank)}
                        <span className="font-black text-admin-text-primary tabular-nums">{entry.rank}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-admin-text-primary font-bold">{entry.user_name}</td>
                    <td className="px-4 py-4 text-right text-admin-accent font-black tabular-nums text-lg">
                      {(entry.score || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <button
                        onClick={() => {
                          const newEditing = ranking.filter((_, i) => i !== index);
                          setEditingRanking(newEditing.map(e => ({
                            date: selectedDate,
                            rank: e.rank,
                            user_name: e.user_name,
                            score: e.score,
                            user_id: e.user_id,
                          })));
                        }}
                        type="button"
                        className="p-2 rounded-lg hover:bg-admin-danger/10 text-admin-danger transition-colors"
                        aria-label="랭킹 항목 삭제"
                        title="랭킹 항목 삭제"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}

                {/* Editing Ranking */}
                {editingRanking.map((entry, index) => (
                  <tr key={`edit-${index}`} className="admin-td bg-admin-brand/5">
                    <td className="px-4 py-4 text-center">
                      <input
                        type="number"
                        value={entry.rank}
                        onChange={(e) => handleUpdateRank(index, "rank", Number(e.target.value))}
                        className="admin-input h-10 w-16 text-center font-black"
                        aria-label="순위"
                        title="순위"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <input
                        type="text"
                        value={entry.user_name}
                        onChange={(e) => handleUpdateRank(index, "user_name", e.target.value)}
                        placeholder="사용자명"
                        className="admin-input h-10 w-full"
                        aria-label="사용자명"
                        title="사용자명"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <input
                        type="number"
                        value={entry.score}
                        onChange={(e) => handleUpdateRank(index, "score", Number(e.target.value))}
                        placeholder="점수"
                        className="admin-input h-10 w-full text-right font-black"
                        aria-label="점수"
                        title="점수"
                      />
                    </td>
                    <td className="px-4 py-4 text-center">
                      <button
                        onClick={() => setEditingRanking(editingRanking.filter((_, i) => i !== index))}
                        type="button"
                        className="p-2 rounded-lg hover:bg-admin-danger/10 text-admin-danger transition-colors"
                        aria-label="편집 행 삭제"
                        title="편집 행 삭제"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}

                {ranking?.length === 0 && editingRanking.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-admin-text-muted text-sm">
                      선택된 날짜에 랭킹 데이터가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
};

export default RankingAdminPage;
