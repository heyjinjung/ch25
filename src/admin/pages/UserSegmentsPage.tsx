// src/admin/pages/UserSegmentsPage.tsx
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  Search,
  RefreshCw,
  Edit3,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Clock,
  Gamepad2,
  ChevronUp,
  ChevronDown
} from "lucide-react";
import {
  fetchUserSegments,
  upsertUserSegment,
  AdminUserSegmentRow
} from "../api/adminSegmentsApi";

type SortKey = "user_id" | "nickname" | "segment" | "recommended_segment" | "total_plays" | "last_login_at";

const UserSegmentsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [localSearchTerm, setLocalSearchTerm] = useState("");
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [newSegment, setNewSegment] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: "asc" | "desc" } | null>(null);
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null);
  const [recommendedSegmentFilter, setRecommendedSegmentFilter] = useState<string | null>(null);

  const { data: segments, isLoading } = useQuery({
    queryKey: ["admin", "segments", searchTerm],
    queryFn: () => fetchUserSegments(searchTerm ? { identifier: searchTerm } : undefined),
  });

  const sortedSegments = segments ? [...segments].sort((a, b) => {
    if (!sortConfig) return 0;
    const { key, direction } = sortConfig;

    let aValue: any;
    let bValue: any;

    switch (key) {
      case "total_plays":
        aValue = a.roulette_plays + a.dice_plays + a.lottery_plays;
        bValue = b.roulette_plays + b.dice_plays + b.lottery_plays;
        break;
      case "nickname":
        aValue = (a.nickname || "").toLowerCase();
        bValue = (b.nickname || "").toLowerCase();
        break;
      default:
        aValue = a[key as keyof AdminUserSegmentRow];
        bValue = b[key as keyof AdminUserSegmentRow];
    }

    if (aValue === bValue) return 0;
    if (aValue === null || aValue === undefined) return 1;
    if (bValue === null || bValue === undefined) return -1;

    const result = aValue < bValue ? -1 : 1;
    return direction === "asc" ? result : -result;
  }) : [];

  const filteredSegments = sortedSegments.filter(s => {
    // 1. Current Segment Filter
    if (selectedSegment && s.segment !== selectedSegment) return false;

    // 2. Recommended Segment Filter
    if (recommendedSegmentFilter && s.recommended_segment !== recommendedSegmentFilter) return false;

    // 3. Local Search (Nickname, Username, External ID, User ID)
    if (localSearchTerm) {
      const term = localSearchTerm.toLowerCase();
      const matchNickname = (s.nickname || "").toLowerCase().includes(term);
      const matchUsername = (s.telegram_username || "").toLowerCase().includes(term);
      const matchExternal = (s.external_id || "").toLowerCase().includes(term);
      const matchId = s.user_id.toString().includes(term);
      if (!matchNickname && !matchUsername && !matchExternal && !matchId) return false;
    }

    return true;
  });

  const handleSort = (key: SortKey) => {
    setSortConfig((prev) => {
      if (prev?.key === key) {
        if (prev.direction === "asc") return { key, direction: "desc" };
        return null;
      }
      return { key, direction: "asc" };
    });
  };

  const getSortIcon = (key: SortKey) => {
    if (sortConfig?.key !== key) return <RefreshCw className="h-3 w-3 opacity-0 group-hover:opacity-30" />;
    return sortConfig.direction === "asc" ? <ChevronUp className="h-3 w-3 text-admin-brand" /> : <ChevronDown className="h-3 w-3 text-admin-brand" />;
  };

  const updateMutation = useMutation({
    mutationFn: (payload: { user_id: number; segment: string }) => upsertUserSegment(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "segments"] });
      setEditingUserId(null);
      setNewSegment("");
    },
  });

  const handleUpdate = (userId: number) => {
    if (newSegment.trim()) {
      updateMutation.mutate({ user_id: userId, segment: newSegment });
    }
  };

  const resetFilters = () => {
    setLocalSearchTerm("");
    setSelectedSegment(null);
    setRecommendedSegmentFilter(null);
  };

  const getSegmentBadge = (segment: string) => {
    const colors: Record<string, string> = {
      VIP: "ring-1 ring-inset ring-amber-500/30 text-amber-500 bg-amber-500/5",
      WHALE: "ring-1 ring-inset ring-purple-500/30 text-purple-400 bg-purple-500/5",
      ACTIVE: "ring-1 ring-inset ring-emerald-500/30 text-emerald-400 bg-emerald-500/5",
      INACTIVE: "ring-1 ring-inset ring-zinc-700/30 text-zinc-500 bg-zinc-500/5",
      CHURN: "ring-1 ring-inset ring-rose-500/30 text-rose-500 bg-rose-500/5",
    };
    return colors[segment] || "ring-1 ring-inset ring-zinc-700/30 text-zinc-500 bg-zinc-500/5";
  };

  const segmentOptions = ["VIP", "WHALE", "ACTIVE", "INACTIVE", "CHURN"];

  return (
    <section className="admin-page-container space-y-10 pb-20">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-admin-title text-admin-text-primary">세그먼트 관리</h1>
        </div>
        <button
          onClick={() => queryClient.invalidateQueries({ queryKey: ["admin", "segments"] })}
          disabled={isLoading}
          className="btn-admin-secondary flex items-center gap-2 px-5 py-2.5 h-auto disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} /> 새로고침
        </button>
      </header>

      {/* Global Fetch Search Bar */}
      <div className="admin-card-premium p-6 flex items-center gap-4 border-b-2 border-admin-brand/30">
        <Search className="h-5 w-5 text-admin-brand" />
        <div className="flex-1">
          <label className="text-admin-meta font-black text-admin-text-secondary uppercase tracking-widest block mb-2">서버 검색 (ID/Nickname)</label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="서버에서 특정 회원 한 명을 찾으려면 입력 후 잠시 기다리세요..."
            className="admin-input h-11 w-full bg-zinc-900/50"
          />
        </div>
      </div>

      {/* Stats Cards - Quick Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div
          onClick={() => setSelectedSegment(null)}
          className={`admin-card-premium p-6 flex flex-col justify-between h-32 cursor-pointer transition-all hover:bg-zinc-800/50 ${selectedSegment === null ? "ring-2 ring-admin-brand bg-zinc-800/30" : ""}`}
        >
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">총 회원 수</p>
          <div className="flex items-end justify-between">
            <p className="text-3xl font-black text-white">{segments?.length || 0}</p>
            <Users className="h-5 w-5 text-zinc-500 mb-1" />
          </div>
        </div>
        <div
          onClick={() => setSelectedSegment("VIP")}
          className={`admin-card-premium p-6 flex flex-col justify-between h-32 cursor-pointer transition-all hover:bg-zinc-800/50 ${selectedSegment === "VIP" ? "ring-2 ring-amber-500 bg-amber-500/5" : ""}`}
        >
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">VIP 회원</p>
          <div className="flex items-end justify-between">
            <p className="text-3xl font-black text-amber-500">{segments?.filter(s => s.segment === "VIP").length || 0}</p>
            <TrendingUp className="h-5 w-5 text-amber-500 mb-1" />
          </div>
        </div>
        <div
          onClick={() => setSelectedSegment("ACTIVE")}
          className={`admin-card-premium p-6 flex flex-col justify-between h-32 cursor-pointer transition-all hover:bg-zinc-800/50 ${selectedSegment === "ACTIVE" ? "ring-2 ring-emerald-500 bg-emerald-500/5" : ""}`}
        >
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">활성 회원</p>
          <div className="flex items-end justify-between">
            <p className="text-3xl font-black text-emerald-400">{segments?.filter(s => s.segment === "ACTIVE").length || 0}</p>
            <CheckCircle2 className="h-5 w-5 text-emerald-400 mb-1" />
          </div>
        </div>
        <div
          onClick={() => setSelectedSegment("CHURN")}
          className={`admin-card-premium p-6 flex flex-col justify-between h-32 cursor-pointer transition-all hover:bg-zinc-800/50 border-l-4 border-rose-500 ${selectedSegment === "CHURN" ? "ring-2 ring-rose-500 bg-rose-500/5" : ""}`}
        >
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">이탈 회원</p>
          <div className="flex items-end justify-between">
            <p className="text-3xl font-black text-rose-500">{segments?.filter(s => s.segment === "CHURN").length || 0}</p>
            <AlertCircle className="h-5 w-5 text-rose-500 mb-1" />
          </div>
        </div>
      </div>

      {/* Advanced Filter Controls */}
      <div className="admin-card-premium p-6 space-y-6">
        <div className="flex flex-wrap items-end gap-6">
          <div className="flex-1 min-w-[240px]">
            <label className="text-admin-meta font-black text-admin-text-secondary uppercase tracking-widest block mb-2">로컬 리스트 검색</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <input
                type="text"
                value={localSearchTerm}
                onChange={(e) => setLocalSearchTerm(e.target.value)}
                placeholder="현재 리스트 내 식별자 검색..."
                className="admin-input h-10 w-full pl-10"
              />
            </div>
          </div>

          <div className="w-48">
            <label className="text-admin-meta font-black text-admin-text-secondary uppercase tracking-widest block mb-2">현재 세그먼트</label>
            <select
              value={selectedSegment || ""}
              onChange={(e) => setSelectedSegment(e.target.value || null)}
              className="admin-input h-10 w-full text-sm"
            >
              <option value="">전체 보기</option>
              {segmentOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>

          <div className="w-48">
            <label className="text-admin-meta font-black text-admin-text-secondary uppercase tracking-widest block mb-2">추천 세그먼트</label>
            <select
              value={recommendedSegmentFilter || ""}
              onChange={(e) => setRecommendedSegmentFilter(e.target.value || null)}
              className="admin-input h-10 w-full text-sm"
            >
              <option value="">전체 보기</option>
              {segmentOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>

          <button
            onClick={resetFilters}
            className="h-10 px-4 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold uppercase tracking-wider transition-colors border border-zinc-700"
          >
            필터 초기화
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <Users className="h-3 w-3" />
          <span>필터링된 결과: <b className="text-admin-brand">{filteredSegments.length}</b> / {segments?.length || 0} 명</span>
        </div>
      </div>

      {/* Segments Table */}
      <div className="admin-card-premium overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-4">
            <RefreshCw className="h-8 w-8 text-admin-brand animate-spin" />
            <p className="text-admin-meta text-admin-text-secondary">데이터 로딩 중...</p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10 bg-zinc-900 border-b border-zinc-800">
                <tr>
                  <th className="px-4 py-3 text-sm font-bold text-zinc-400 uppercase tracking-wider cursor-pointer group hover:text-zinc-200" onClick={() => handleSort("user_id")}>
                    <div className="flex items-center gap-1">
                      User ID {getSortIcon("user_id")}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-sm font-bold text-zinc-400 uppercase tracking-wider cursor-pointer group hover:text-zinc-200" onClick={() => handleSort("nickname")}>
                    <div className="flex items-center gap-1">
                      식별자 {getSortIcon("nickname")}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-sm font-bold text-zinc-400 uppercase tracking-wider cursor-pointer group hover:text-zinc-200" onClick={() => handleSort("segment")}>
                    <div className="flex items-center gap-1">
                      현재 세그먼트 {getSortIcon("segment")}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-sm font-bold text-zinc-400 uppercase tracking-wider cursor-pointer group hover:text-zinc-200" onClick={() => handleSort("recommended_segment")}>
                    <div className="flex items-center gap-1">
                      추천 세그먼트 {getSortIcon("recommended_segment")}
                    </div>
                  </th>
                  <th className="px-4 py-3.5 text-right text-sm font-bold text-zinc-400 cursor-pointer group hover:text-zinc-200" onClick={() => handleSort("total_plays")}>
                    <div className="flex items-center justify-end gap-1">
                      게임 플레이 {getSortIcon("total_plays")}
                    </div>
                  </th>
                  <th className="px-4 py-3.5 text-right text-sm font-bold text-zinc-400 cursor-pointer group hover:text-zinc-200" onClick={() => handleSort("last_login_at")}>
                    <div className="flex items-center justify-end gap-1">
                      최근 활동 {getSortIcon("last_login_at")}
                    </div>
                  </th>
                  <th className="px-4 py-3.5 text-center text-sm font-bold text-zinc-400">액션</th>
                </tr>
              </thead>
              <tbody>
                {filteredSegments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-admin-text-muted text-sm">
                      조회된 회원이 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredSegments.map((seg: AdminUserSegmentRow) => (
                    <tr key={seg.user_id} className="admin-td group">
                      <td className="px-4 py-4 font-mono text-sm text-admin-text-primary">{seg.user_id}</td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-admin-text-primary font-bold text-base">{seg.nickname || "-"}</span>
                          <span className="text-zinc-400 text-sm">@{seg.telegram_username || seg.external_id}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {editingUserId === seg.user_id ? (
                          <input
                            type="text"
                            value={newSegment}
                            onChange={(e) => setNewSegment(e.target.value)}
                            placeholder="새 세그먼트"
                            className="admin-input h-9 w-32 text-xs"
                            autoFocus
                          />
                        ) : (
                          <span className={`px-2 py-0.5 rounded-full text-sm font-bold uppercase ${getSegmentBadge(seg.segment)}`}>
                            {seg.segment}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {seg.recommended_segment ? (
                          <div className="flex flex-col gap-0.5">
                            <span className={`px-2 py-0.5 rounded-full text-sm font-bold uppercase w-fit ${getSegmentBadge(seg.recommended_segment)}`}>
                              {seg.recommended_segment}
                            </span>
                            <span className="text-sm text-zinc-400">{seg.recommended_rule_name}</span>
                          </div>
                        ) : (
                          <span className="text-zinc-500 text-sm">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Gamepad2 className="h-3 w-3 text-admin-brand" />
                          <span className="text-admin-text-primary font-black tabular-nums text-sm">
                            {seg.roulette_plays + seg.dice_plays + seg.lottery_plays}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Clock className="h-4 w-4 text-zinc-400" />
                          <span className="text-zinc-300 text-sm tabular-nums">
                            {seg.last_login_at ? new Date(seg.last_login_at).toLocaleDateString() : "-"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        {editingUserId === seg.user_id ? (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleUpdate(seg.user_id)}
                              disabled={updateMutation.isPending}
                              title="세그먼트 저장"
                              className="p-2 rounded-lg hover:bg-admin-accent/10 text-admin-accent transition-colors disabled:opacity-50"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingUserId(null);
                                setNewSegment("");
                              }}
                              title="취소"
                              className="p-2 rounded-lg hover:bg-admin-danger/10 text-admin-danger transition-colors"
                            >
                              <AlertCircle className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingUserId(seg.user_id);
                              setNewSegment(seg.segment);
                            }}
                            title="세그먼트 수정"
                            className="p-2 rounded-lg hover:bg-admin-brand/10 text-admin-brand transition-colors"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
};

export default UserSegmentsPage;
