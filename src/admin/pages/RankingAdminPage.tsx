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
          <h1 className="text-admin-title text-admin-text-primary">??‚¹ ?œìŠ¤??ê´€ë¦?/h1>
          <p className="text-admin-body text-admin-text-secondary font-medium">
            ? ì§œë³???‚¹ ?°ì´?°ë? ì¡°íšŒ?˜ê³  ?˜ë™?¼ë¡œ ?¸ì§‘?©ë‹ˆ??
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ["admin", "ranking"] })}
            disabled={isLoading}
            className="btn-admin-secondary flex items-center gap-2 px-5 py-2.5 h-auto disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} /> ?ˆë¡œê³ ì¹¨
          </button>
          {editingRanking.length > 0 && (
            <button
              onClick={handleSave}
              disabled={upsertMutation.isPending}
              className="btn-admin-primary flex items-center gap-2 px-5 py-2.5 h-auto shadow-admin-glow disabled:opacity-50"
            >
              {upsertMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" /> ?€??ì¤?..
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" /> ë³€ê²½ì‚¬???€??
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
            ì¡°íšŒ ? ì§œ
          </label>
          <input
            id="ranking-admin-selected-date"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="admin-input h-11 w-full md:w-64"
            aria-label="ì¡°íšŒ ? ì§œ"
            title="ì¡°íšŒ ? ì§œ"
          />
        </div>
        <button
          onClick={handleAddRank}
          type="button"
          className="btn-admin-secondary px-4 py-2 h-auto text-xs font-black"
          aria-label="?œìœ„ ì¶”ê?"
          title="?œìœ„ ì¶”ê?"
        >
          + ?œìœ„ ì¶”ê?
        </button>
      </div>

      {/* Ranking Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="admin-card-premium p-6 flex flex-col justify-between h-32">
          <p className="text-[10px] font-black text-admin-text-muted uppercase tracking-widest">ì´??œìœ„ ??/p>
          <div className="flex items-end justify-between">
            <p className="text-3xl font-black text-admin-text-primary">{(ranking?.length || 0) + editingRanking.length}</p>
            <Trophy className="h-5 w-5 text-admin-warning mb-1" />
          </div>
        </div>
        <div className="admin-card-premium p-6 flex flex-col justify-between h-32">
          <p className="text-[10px] font-black text-admin-text-muted uppercase tracking-widest">ìµœê³  ?ìˆ˜</p>
          <div className="flex items-end justify-between">
            <p className="text-3xl font-black text-admin-accent tabular-nums">
              {Math.max(...(ranking?.map(r => r.score || 0) || [0]), ...editingRanking.map(r => r.score || 0)).toLocaleString()}
            </p>
            <ChevronUp className="h-5 w-5 text-admin-accent mb-1" />
          </div>
        </div>
        <div className="admin-card-premium p-6 flex flex-col justify-between h-32 border-l-4 border-admin-warning">
          <p className="text-[10px] font-black text-admin-text-muted uppercase tracking-widest">? íƒ??? ì§œ</p>
          <p className="text-lg font-black text-admin-text-primary">{selectedDate}</p>
        </div>
      </div>

      {/* Ranking Table */}
      <div className="admin-card-premium overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-4">
            <RefreshCw className="h-8 w-8 text-admin-brand animate-spin" />
            <p className="text-admin-meta text-admin-text-secondary">?°ì´??ë¡œë”© ì¤?..</p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="admin-table">
              <thead>
                <tr className="admin-th">
                  <th className="px-4 py-3.5 text-center w-20">?œìœ„</th>
                  <th className="px-4 py-3.5 text-left">?¬ìš©?ëª…</th>
                  <th className="px-4 py-3.5 text-right">?ìˆ˜</th>
                  <th className="px-4 py-3.5 text-center">?¡ì…˜</th>
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
                        aria-label="??‚¹ ??ª© ?? œ"
                        title="??‚¹ ??ª© ?? œ"
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
                        aria-label="?œìœ„"
                        title="?œìœ„"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <input
                        type="text"
                        value={entry.user_name}
                        onChange={(e) => handleUpdateRank(index, "user_name", e.target.value)}
                        placeholder="?¬ìš©?ëª…"
                        className="admin-input h-10 w-full"
                        aria-label="?¬ìš©?ëª…"
                        title="?¬ìš©?ëª…"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <input
                        type="number"
                        value={entry.score}
                        onChange={(e) => handleUpdateRank(index, "score", Number(e.target.value))}
                        placeholder="?ìˆ˜"
                        className="admin-input h-10 w-full text-right font-black"
                        aria-label="?ìˆ˜"
                        title="?ìˆ˜"
                      />
                    </td>
                    <td className="px-4 py-4 text-center">
                      <button
                        onClick={() => setEditingRanking(editingRanking.filter((_, i) => i !== index))}
                        type="button"
                        className="p-2 rounded-lg hover:bg-admin-danger/10 text-admin-danger transition-colors"
                        aria-label="?¸ì§‘ ???? œ"
                        title="?¸ì§‘ ???? œ"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}

                {ranking?.length === 0 && editingRanking.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-admin-text-muted text-sm">
                      ? íƒ??? ì§œ????‚¹ ?°ì´?°ê? ?†ìŠµ?ˆë‹¤.
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
