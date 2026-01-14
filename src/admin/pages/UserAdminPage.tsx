// src/admin/pages/UserAdminPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Edit2, Plus, Save, Search, Trash2, Upload, Skull } from "lucide-react";
import { createUser, deleteUser, fetchUsers, purgeUser, updateUser, AdminUser, AdminUserPayload } from "../api/adminUserApi";
import { useToast } from "../../components/common/ToastProvider";
import UserImportModal from "../components/UserImportModal";
import { fetchUserMissions, updateUserMission, AdminUserMissionDetail, AdminUserMissionUpdatePayload } from "../api/adminUserMissionApi";
import { Check, ClipboardList, History, Package, Ticket, X } from "lucide-react";
import UserInventoryModal from "../components/UserInventoryModal";
import UserGameTokenModal from "../components/UserGameTokenModal";
import UserAuditLogModal from "../components/UserAuditLogModal";
import VaultHistoryTable from "../components/VaultHistoryTable";

type MemberRow = AdminUser & {
  isEditing?: boolean;
  draft?: {
    nickname: string;
    level: number;
    xp: number;
    status: string;
    // Profile fields
    real_name: string;
    phone_number: string;
    telegram_id: string;
    telegram_username: string;
    memo: string;
    tags: string;
    login_streak: number;
  };
  passwordReset?: string;
};



type SortKey = "id" | "nickname" | "level" | "xp" | "status" | "login_streak";
type SortDirection = "asc" | "desc";

const mapErrorDetail = (error: unknown): string => {
  const detail = (error as any)?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  return (error as any)?.message ?? "요청 처리 중 오류가 발생했습니다.";
};

const clampNumber = (value: unknown, fallback: number, minValue: number) => {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(minValue, Math.floor(num));
};

const UserAdminPage: React.FC = () => {
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get("search") || "";

  // [Round 3] Search Logic: Prefer Backend Search
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [searchTerm, setSearchTerm] = useState(initialSearch); // Debounced/Effective search term

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin", "users", searchTerm],
    queryFn: () => fetchUsers(searchTerm),
  });

  const [members, setMembers] = useState<MemberRow[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUserForMissions, setSelectedUserForMissions] = useState<AdminUser | null>(null);
  const [selectedUserForInventory, setSelectedUserForInventory] = useState<AdminUser | null>(null);
  const [selectedUserForGameTokens, setSelectedUserForGameTokens] = useState<{ user: AdminUser; tab: "wallets" | "ledger" } | null>(null);
  const [selectedUserForAuditLogs, setSelectedUserForAuditLogs] = useState<AdminUser | null>(null);
  const [selectedUserForVaultHistory, setSelectedUserForVaultHistory] = useState<AdminUser | null>(null);

  const [sortKey, setSortKey] = useState<SortKey>("nickname");
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Update handleSearch to trigger refetch
  const handleSearch = () => {
    setSearchTerm(searchInput.trim());
    setCurrentPage(1);
  };

  const [newMember, setNewMember] = useState({
    nickname: "",
    level: 1,
    xp: 0,
    status: "ACTIVE",
    password: "",
    real_name: "",
    phone_number: "",
    telegram_id: "",
    telegram_username: "",
    memo: "",
    tags: "",
  });

  const createMutation = useMutation({
    mutationFn: (payload: AdminUserPayload) => createUser(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      addToast("생성 완료", "success");
      setShowAddForm(false);
      setNewMember({ nickname: "", level: 1, xp: 0, status: "ACTIVE", password: "", real_name: "", phone_number: "", telegram_id: "", telegram_username: "", memo: "", tags: "" });
    },
    onError: (err) => addToast(mapErrorDetail(err), "error"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<AdminUserPayload> }) => updateUser(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      addToast("수정 완료", "success");
    },
    onError: (err) => addToast(mapErrorDetail(err), "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteUser(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      addToast("삭제 완료", "success");
    },
    onError: (err) => addToast(mapErrorDetail(err), "error"),
  });

  const purgeMutation = useMutation({
    mutationFn: (id: number) => purgeUser(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      addToast("하드 퍼지 완료", "success");
    },
    onError: (err) => addToast(mapErrorDetail(err), "error"),
  });

  // Trigger search on Enter

  // Sync data to member state
  useEffect(() => {
    if (!data) {
      setMembers([]);
      return;
    }
    setMembers(data as MemberRow[]);
  }, [data]);

  // NOTE: filteredMembers previously did client-side filtering. 
  // Now backend does it, so we just use members directly (or client-side sort).
  const filteredMembers = members; // Pass-through as filtering is done upstream

  const sortedMembers = useMemo(() => {
    const list = [...filteredMembers];

    const dir = sortDirection === "asc" ? 1 : -1;
    const compareText = (a: string, b: string) => a.localeCompare(b, "ko") * dir;
    const compareNumber = (a: number, b: number) => (a - b) * dir;

    list.sort((a, b) => {
      if (sortKey === "id") return compareNumber(a.id ?? 0, b.id ?? 0);
      if (sortKey === "nickname") {
        const an = (a.nickname ?? a.external_id ?? "").trim();
        const bn = (b.nickname ?? b.external_id ?? "").trim();
        const res = compareText(an, bn);
        return res !== 0 ? res : compareNumber(a.id ?? 0, b.id ?? 0);
      }
      if (sortKey === "status") return compareText(String(a.status ?? ""), String(b.status ?? ""));
      if (sortKey === "level") return compareNumber(a.season_level ?? a.level ?? 1, b.season_level ?? b.level ?? 1);
      if (sortKey === "xp") return compareNumber(a.xp ?? 0, b.xp ?? 0);
      if (sortKey === "login_streak") return compareNumber(a.login_streak ?? 0, b.login_streak ?? 0);
      return 0;
    });
    return list;
  }, [filteredMembers, sortDirection, sortKey]);

  const handleSort = (key: SortKey) => {
    setCurrentPage(1);
    setSortKey((prevKey) => {
      if (prevKey !== key) {
        setSortDirection(key === "nickname" ? "asc" : "desc");
        return key;
      }
      setSortDirection((prevDir) => (prevDir === "asc" ? "desc" : "asc"));
      return prevKey;
    });
  };

  const renderSortIcon = (key: SortKey) => {
    if (sortKey !== key) return null;
    return sortDirection === "asc" ? (
      <ChevronUp className="ml-1 inline-block h-4 w-4" />
    ) : (
      <ChevronDown className="ml-1 inline-block h-4 w-4" />
    );
  };

  const totalPages = Math.max(1, Math.ceil(sortedMembers.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * itemsPerPage;
  const currentMembers = sortedMembers.slice(startIndex, startIndex + itemsPerPage);

  const itemCountText = useMemo(() => {
    if (sortedMembers.length === 0) return "0개 항목 표시";
    const from = startIndex + 1;
    const to = Math.min(startIndex + itemsPerPage, sortedMembers.length);
    return `${from}-${to}/${sortedMembers.length}개 항목 표시`;
  }, [sortedMembers.length, startIndex, itemsPerPage]);

  const toggleEdit = (id: number, next: boolean) => {
    setMembers((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m;
        if (next) {
          return {
            ...m,
            isEditing: true,
            draft: {
              nickname: m.nickname ?? m.external_id ?? "",
              level: m.season_level ?? m.level ?? 1,
              xp: m.xp ?? 0,
              status: m.status ?? "ACTIVE",
              real_name: m.admin_profile?.real_name ?? "",
              phone_number: m.admin_profile?.phone_number ?? "",
              telegram_id: String(m.telegram_id ?? m.admin_profile?.telegram_id ?? ""),
              telegram_username: m.telegram_username ?? "",
              memo: m.admin_profile?.memo ?? "",
              tags: (m.admin_profile?.tags ?? []).join(", "),
              login_streak: m.login_streak ?? 0,
            },
          };
        }
        return { ...m, isEditing: false, draft: undefined };
      })
    );
  };

  const updateDraftField = (id: number, field: keyof NonNullable<MemberRow["draft"]>, value: string | number) => {
    setMembers((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m;
        const base = m.draft ?? {
          nickname: m.nickname ?? m.external_id,
          level: m.season_level ?? m.level ?? 1,
          xp: m.xp ?? 0,
          status: m.status ?? "ACTIVE",
          real_name: m.admin_profile?.real_name ?? "",
          phone_number: m.admin_profile?.phone_number ?? "",
          telegram_id: String(m.telegram_id ?? m.admin_profile?.telegram_id ?? ""),
          telegram_username: m.telegram_username ?? "",
          memo: m.admin_profile?.memo ?? "",
          tags: (m.admin_profile?.tags ?? []).join(", "),
        };
        const nextDraft = { ...base } as any;
        if (field === "level") nextDraft.level = clampNumber(value, 1, 1);
        else if (field === "xp") nextDraft.xp = clampNumber(value, 0, 0);
        else if (field === "login_streak") nextDraft.login_streak = clampNumber(value, 0, 0);
        else nextDraft[field] = String(value);
        return { ...m, draft: nextDraft };
      })
    );
  };

  const saveRow = (row: MemberRow) => {
    if (!row.draft) return;
    const payload: Partial<AdminUserPayload> = {
      nickname: row.draft.nickname,
      level: row.draft.level,
      season_level: row.draft.level, // Sync both for backend compatibility
      xp: row.draft.xp,
      login_streak: row.draft.login_streak,
      status: row.draft.status,
      telegram_id: row.draft.telegram_id ? parseInt(row.draft.telegram_id) : null,
      telegram_username: row.draft.telegram_username,
      admin_profile: {
        real_name: row.draft.real_name,
        phone_number: row.draft.phone_number,
        telegram_id: row.draft.telegram_id,
        memo: row.draft.memo,
        tags: row.draft.tags.split(",").map((t) => t.trim()).filter((t) => t.length > 0),
      },
    };
    updateMutation.mutate({ id: row.id, payload });
    toggleEdit(row.id, false);
  };

  const setPasswordReset = (id: number, value: string) => {
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, passwordReset: value } : m)));
  };

  const resetPassword = (row: MemberRow) => {
    const nextPassword = (row.passwordReset ?? "").trim();
    if (nextPassword.length < 4) {
      addToast("비밀번호는 최소 4자 이상 입력하세요.", "error");
      return;
    }
    updateMutation.mutate({ id: row.id, payload: { password: nextPassword } });
    setPasswordReset(row.id, "");
  };

  const removeRow = (row: MemberRow) => {
    const ok = window.confirm("정말 삭제하시겠습니까?");
    if (!ok) return;
    deleteMutation.mutate(row.id);
  };

  const purgeRow = (row: MemberRow) => {
    const ok = window.confirm(
      "[하드 퍼지] 유저 및 관련 기록(텔레그램/로그/이벤트 등)을 가능한 범위에서 전부 삭제합니다. 되돌릴 수 없습니다. 진행할까요?"
    );
    if (!ok) return;
    purgeMutation.mutate(row.id);
  };

  // handleCopyMagicLink removed (Telegram-only v3 transition)

  const submitNewMember = (e: React.FormEvent) => {
    e.preventDefault();
    const provided = (newMember.nickname ?? "").trim();
    const nickname = provided || (newMember.telegram_username ?? "").trim();
    if (!nickname) {
      addToast("닉네임은 필수입니다.", "error");
      return;
    }
    if (newMember.password && newMember.password.trim().length < 4) {
      addToast("비밀번호는 최소 4자 이상 입력하세요.", "error");
      return;
    }

    // 스크린샷 UX에 맞춰: 입력 닉네임을 external_id로도 사용
    const payload: AdminUserPayload = {
      external_id: nickname,
      nickname,
      level: clampNumber(newMember.level, 1, 1),
      season_level: clampNumber(newMember.level, 1, 1), // Sync both for backend compatibility
      xp: clampNumber(newMember.xp, 0, 0),
      status: newMember.status,
      password: newMember.password ? newMember.password.trim() : undefined,
      telegram_id: newMember.telegram_id ? parseInt(newMember.telegram_id) : undefined,
      telegram_username: newMember.telegram_username,
      admin_profile: {
        real_name: newMember.real_name,
        phone_number: newMember.phone_number,
        telegram_id: newMember.telegram_id,
        memo: newMember.memo,
        tags: newMember.tags.split(",").map((t) => t.trim()).filter((t) => t.length > 0),
      },
    };
    createMutation.mutate(payload);
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-100">
      {/* Top Bar */}
      <div className="flex-none p-4 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-white">회원 관리 (User Admin)</h2>
            <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-[10px] text-zinc-400 font-mono">
              Total {data?.length ?? 0}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-300 border border-zinc-700 transition-all"
            >
              <Upload size={14} />
              일괄 등록
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm((p) => !p)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-admin-brand hover:brightness-110 text-xs font-bold text-white shadow-lg shadow-admin-brand/20 transition-all"
            >
              <Plus size={14} />
              회원 추가
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="w-full max-w-xl">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 group-focus-within:text-admin-brand transition-colors" />
            <input
              type="text"
              placeholder="ID, 닉네임, TG Username, 실명 검색..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch();
              }}
              className="w-full h-10 bg-zinc-900/50 border border-zinc-800 rounded-xl pl-10 pr-4 text-sm text-zinc-200 outline-none focus:border-admin-brand/50 focus:bg-zinc-900 transition-all"
            />
          </div>
        </div>
      </div>

      {
        showAddForm && (
          <div className="admin-card p-6">
            <h3 className="text-admin-subtitle text-admin-text-primary">새 회원 추가</h3>

            <form onSubmit={submitNewMember} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="nickname" className="admin-label">
                    닉네임
                  </label>
                  <input
                    id="nickname"
                    type="text"
                    value={newMember.nickname}
                    onChange={(e) => setNewMember((p) => ({ ...p, nickname: e.target.value }))}
                    className="admin-input w-full"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="level" className="admin-label">
                    레벨
                  </label>
                  <input
                    id="level"
                    type="number"
                    min={1}
                    value={newMember.level}
                    onChange={(e) => setNewMember((p) => ({ ...p, level: clampNumber(e.target.value, 1, 1) }))}
                    className="w-full rounded-md border border-[#333333] bg-[#1A1A1A] p-2 text-white focus:outline-none focus:ring-2 focus:ring-[#2D6B3B]"
                  />
                </div>
                <div>
                  <label htmlFor="xp" className="admin-label">
                    XP
                  </label>
                  <input
                    id="xp"
                    type="number"
                    min={0}
                    value={newMember.xp}
                    onChange={(e) => setNewMember((p) => ({ ...p, xp: clampNumber(e.target.value, 0, 0) }))}
                    className="w-full rounded-md border border-[#333333] bg-[#1A1A1A] p-2 text-white focus:outline-none focus:ring-2 focus:ring-[#2D6B3B]"
                  />
                </div>
                <div>
                  <label htmlFor="status" className="admin-label">
                    상태
                  </label>
                  <select
                    id="status"
                    value={newMember.status}
                    onChange={(e) => setNewMember((p) => ({ ...p, status: e.target.value }))}
                    className="w-full rounded-md border border-[#333333] bg-[#1A1A1A] p-2 text-white focus:outline-none focus:ring-2 focus:ring-[#2D6B3B]"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="password" className="admin-label">
                    초기 비밀번호 (선택)
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={newMember.password}
                    onChange={(e) => setNewMember((p) => ({ ...p, password: e.target.value }))}
                    placeholder="최소 4자 이상"
                    className="w-full rounded-md border border-[#333333] bg-[#1A1A1A] p-2 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#2D6B3B]"
                  />
                </div>
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-admin-border">
                  <div className="space-y-1">
                    <label htmlFor="real_name" className="admin-label">실명</label>
                    <input
                      id="real_name"
                      type="text"
                      value={newMember.real_name}
                      onChange={(e) => setNewMember((p) => ({ ...p, real_name: e.target.value }))}
                      className="admin-input w-full"
                      placeholder="홍길동"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="phone_number" className="admin-label">연락처</label>
                    <input
                      id="phone_number"
                      type="text"
                      value={newMember.phone_number}
                      onChange={(e) => setNewMember((p) => ({ ...p, phone_number: e.target.value }))}
                      className="admin-input w-full"
                      placeholder="010-0000-0000"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="telegram_id" className="admin-label">텔레그램 ID (숫자)</label>
                    <input
                      id="telegram_id"
                      type="text"
                      value={newMember.telegram_id}
                      onChange={(e) => setNewMember((p) => ({ ...p, telegram_id: e.target.value }))}
                      className="admin-input w-full"
                      placeholder="12345678"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="telegram_username" className="admin-label">텔레그램 닉네임 (@제외)</label>
                    <input
                      id="telegram_username"
                      type="text"
                      value={newMember.telegram_username}
                      onChange={(e) => setNewMember((p) => ({ ...p, telegram_username: e.target.value }))}
                      className="admin-input w-full"
                      placeholder="username"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="tags" className="text-xs font-medium text-gray-400">태그 (쉼표 구분)</label>
                    <input
                      id="tags"
                      type="text"
                      value={newMember.tags}
                      onChange={(e) => setNewMember((p) => ({ ...p, tags: e.target.value }))}
                      className="w-full rounded-md border border-[#333333] bg-[#1A1A1A] p-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#91F402]"
                      placeholder="VIP, 보너스, 신규"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <label htmlFor="memo" className="text-xs font-medium text-gray-400">메모</label>
                    <textarea
                      id="memo"
                      value={newMember.memo}
                      onChange={(e) => setNewMember((p) => ({ ...p, memo: e.target.value }))}
                      className="w-full rounded-md border border-[#333333] bg-[#1A1A1A] p-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#91F402]"
                      placeholder="특이사항 입력"
                      rows={2}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setNewMember({ nickname: "", level: 1, xp: 0, status: "ACTIVE", password: "", real_name: "", phone_number: "", telegram_id: "", telegram_username: "", memo: "", tags: "" });
                  }}
                  className="rounded-md border border-[#333333] bg-[#1A1A1A] px-4 py-2 text-sm text-gray-200 hover:bg-[#2C2C2E]"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="rounded-md bg-[#2D6B3B] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#91F402] hover:text-black disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {createMutation.isPending ? "저장 중..." : "저장"}
                </button>
              </div>
            </form>
          </div>
        )
      }

      {
        isLoading && (
          <div className="rounded-lg border border-[#333333] bg-[#111111] p-4 text-gray-200">불러오는 중...</div>
        )
      }
      {
        isError && (
          <div className="rounded-lg border border-red-500/40 bg-red-950 p-4 text-red-100">{mapErrorDetail(error)}</div>
        )
      }

      {
        !isLoading && !isError && (
          <div className="flex-1 overflow-hidden relative flex flex-col">
            <div className="flex-1 overflow-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-10 bg-zinc-900 border-b border-zinc-800">
                  <tr>
                    <th
                      className={`px-4 py-3 text-left text-sm font-bold uppercase tracking-wider ${sortKey === "id" ? "text-white" : "text-zinc-400 hover:text-zinc-300"
                        } cursor-pointer transition-colors`}
                      onClick={() => handleSort("id")}
                    >
                      <div className="flex items-center gap-1">ID{renderSortIcon("id")}</div>
                    </th>
                    <th
                      className={`px-4 py-3 text-left text-sm font-bold uppercase tracking-wider text-zinc-400`}
                    >
                      External ID
                    </th>
                    <th
                      className={`hidden md:table-cell px-4 py-3 text-left text-sm font-bold uppercase tracking-wider ${sortKey === "nickname" ? "text-white" : "text-zinc-400 hover:text-zinc-300"
                        } cursor-pointer transition-colors`}
                      onClick={() => handleSort("nickname")}
                    >
                      <div className="flex items-center gap-1">닉네임{renderSortIcon("nickname")}</div>
                    </th>
                    <th
                      className={`px-4 py-3 text-left text-sm font-bold uppercase tracking-wider ${sortKey === "level" ? "text-white" : "text-zinc-400 hover:text-zinc-300"
                        } cursor-pointer transition-colors`}
                      onClick={() => handleSort("level")}
                    >
                      <div className="flex items-center gap-1">레벨{renderSortIcon("level")}</div>
                    </th>
                    <th
                      className={`px-4 py-3 text-left text-sm font-bold uppercase tracking-wider ${sortKey === "xp" ? "text-white" : "text-zinc-400 hover:text-zinc-300"
                        } cursor-pointer transition-colors`}
                      onClick={() => handleSort("xp")}
                    >
                      <div className="flex items-center gap-1">XP{renderSortIcon("xp")}</div>
                    </th>
                    <th
                      className={`px-4 py-3 text-left text-sm font-bold uppercase tracking-wider ${sortKey === "login_streak" ? "text-white" : "text-zinc-400 hover:text-zinc-300"
                        } cursor-pointer transition-colors`}
                      onClick={() => handleSort("login_streak")}
                    >
                      <div className="flex items-center gap-1">Streak{renderSortIcon("login_streak")}</div>
                    </th>

                    <th className="hidden md:table-cell px-4 py-3 text-left text-sm font-bold uppercase tracking-wider text-zinc-400">실명/연락처</th>
                    <th className="hidden md:table-cell px-4 py-3 text-left text-sm font-bold uppercase tracking-wider text-zinc-400">TG ID / Username</th>
                    <th className="hidden lg:table-cell px-4 py-3 text-left text-sm font-bold uppercase tracking-wider text-zinc-400">메모/태그</th>
                    <th className="hidden lg:table-cell px-4 py-3 text-left text-sm font-bold uppercase tracking-wider text-zinc-400">비밀번호(V2 리렉)</th>
                    <th className="px-4 py-3 text-center text-sm font-bold uppercase tracking-wider text-zinc-400">액션</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {currentMembers.map((member) => (
                    <tr key={member.id} className="group hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-zinc-500 font-mono">{member.id}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-white sm:px-4">
                        {/* [Round 3] Priority: Telegram Username -> Nickname -> External ID */}
                        {member.telegram_username ? (
                          <div>
                            <div className="text-base font-bold text-admin-brand">@{String(member.telegram_username).replace(/^@/, "")}</div>
                            <div className="text-xs text-zinc-500">{member.nickname !== member.telegram_username ? member.nickname : member.external_id}</div>
                          </div>
                        ) : (
                          <div>
                            <div className="text-sm font-medium text-white">{member.nickname || "-"}</div>
                            <div className="text-xs text-gray-500">{member.external_id}</div>
                          </div>
                        )}
                      </td>
                      <td className="hidden px-3 py-3 whitespace-nowrap sm:px-4 md:table-cell">
                        {member.isEditing ? (
                          <input
                            type="text"
                            value={member.draft?.nickname ?? ""}
                            onChange={(e) => updateDraftField(member.id, "nickname", e.target.value)}
                            className="w-full h-8 bg-zinc-900 border border-zinc-700 rounded-md px-2 text-sm text-zinc-200 outline-none focus:border-admin-brand"
                            placeholder="닉네임"
                          />
                        ) : (
                          <div className="text-sm font-medium text-zinc-200">{member.nickname || "-"}</div>
                        )}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-white sm:px-4">
                        {member.isEditing ? (
                          <input
                            type="number"
                            min={1}
                            value={member.draft?.level ?? 1}
                            onChange={(e) => updateDraftField(member.id, "level", e.target.value)}
                            className="admin-input w-24 h-9 text-right"
                            title="레벨"
                            aria-label="레벨"
                          />
                        ) : (
                          member.season_level ?? member.level ?? 1
                        )}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-white sm:px-4">
                        {member.isEditing ? (
                          <input
                            type="number"
                            min={0}
                            value={member.draft?.xp ?? 0}
                            onChange={(e) => updateDraftField(member.id, "xp", e.target.value)}
                            className="admin-input w-24 h-9 text-right"
                            title="XP"
                            aria-label="XP"
                          />
                        ) : (
                          member.xp ?? 0
                        )}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-white sm:px-4">
                        {member.isEditing ? (
                          <input
                            type="number"
                            min={0}
                            value={member.draft?.login_streak ?? 0}
                            onChange={(e) => updateDraftField(member.id, "login_streak", e.target.value)}
                            className="admin-input w-16 h-9 text-right"
                            title="Streak"
                            aria-label="Streak"
                          />
                        ) : (
                          <span className={`${(member.login_streak || 0) >= 3 ? "text-admin-brand font-bold" : "text-gray-400"}`}>
                            {member.login_streak ?? 0}
                          </span>
                        )}
                      </td>

                      <td className="hidden px-3 py-3 whitespace-nowrap text-sm text-gray-400 sm:px-4 md:table-cell">
                        {member.isEditing ? (
                          <div className="flex flex-col gap-1">
                            <input
                              type="text"
                              value={member.draft?.real_name ?? ""}
                              onChange={(e) => updateDraftField(member.id, "real_name", e.target.value)}
                              placeholder="실명"
                              className="w-full rounded-md border border-[#333333] bg-[#1A1A1A] p-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#2D6B3B]"
                            />
                            <input
                              type="text"
                              value={member.draft?.phone_number ?? ""}
                              onChange={(e) => updateDraftField(member.id, "phone_number", e.target.value)}
                              placeholder="연락처"
                              className="w-full rounded-md border border-[#333333] bg-[#1A1A1A] p-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#2D6B3B]"
                            />
                          </div>
                        ) : (
                          <>
                            <div className="text-white">{member.admin_profile?.real_name || "-"}</div>
                            <div className="text-xs text-gray-500">{member.admin_profile?.phone_number || "-"}</div>
                          </>
                        )}
                      </td>
                      <td className="hidden px-3 py-3 whitespace-nowrap text-sm text-gray-400 sm:px-4 md:table-cell">
                        {member.isEditing ? (
                          <div className="flex flex-col gap-1">
                            <input
                              type="text"
                              value={member.draft?.telegram_id ?? ""}
                              onChange={(e) => updateDraftField(member.id, "telegram_id", e.target.value)}
                              placeholder="TG ID"
                              className="w-full rounded-md border border-[#333333] bg-[#1A1A1A] p-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#2D6B3B]"
                            />
                            <input
                              type="text"
                              value={member.draft?.telegram_username ?? ""}
                              onChange={(e) => updateDraftField(member.id, "telegram_username", e.target.value)}
                              placeholder="TG Username"
                              className="w-full rounded-md border border-[#333333] bg-[#1A1A1A] p-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#2D6B3B]"
                            />
                          </div>
                        ) : (
                          <>
                            <div className="text-zinc-200 font-mono">{member.telegram_id || "-"}</div>
                            <div className="text-xs text-admin-brand">
                              {member.telegram_username ? `@${String(member.telegram_username).replace(/^@/, "")}` : "-"}
                            </div>
                          </>
                        )}
                      </td>
                      <td className="hidden px-3 py-3 text-sm text-gray-400 sm:px-4 lg:table-cell">
                        {member.isEditing ? (
                          <div className="flex flex-col gap-1">
                            <textarea
                              value={member.draft?.memo ?? ""}
                              onChange={(e) => updateDraftField(member.id, "memo", e.target.value)}
                              placeholder="메모"
                              rows={1}
                              className="w-full rounded-md border border-[#333333] bg-[#1A1A1A] p-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#2D6B3B]"
                            />
                            <input
                              type="text"
                              value={member.draft?.tags ?? ""}
                              onChange={(e) => updateDraftField(member.id, "tags", e.target.value)}
                              placeholder="태그 (쉼표 구분)"
                              className="w-full rounded-md border border-[#333333] bg-[#1A1A1A] p-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#2D6B3B]"
                            />
                          </div>
                        ) : (
                          <>
                            <div className="text-xs text-gray-400 truncate max-w-[120px]" title={member.admin_profile?.memo}>
                              {member.admin_profile?.memo || "-"}
                            </div>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {member.admin_profile?.tags?.map((tag, i) => (
                                <span key={i} className="inline-block rounded bg-[#333333] px-1.5 py-0.5 text-[10px] text-gray-300">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </>
                        )}
                      </td>
                      <td className="hidden px-3 py-3 whitespace-nowrap sm:px-4 lg:table-cell">
                        <div className="flex items-center gap-2">
                          <input
                            type="password"
                            value={member.passwordReset ?? ""}
                            onChange={(e) => setPasswordReset(member.id, e.target.value)}
                            placeholder="변경 시 입력"
                            className="w-32 rounded-md border border-[#333333] bg-[#1A1A1A] p-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#2D6B3B]"
                          />
                          <button
                            type="button"
                            onClick={() => resetPassword(member)}
                            disabled={updateMutation.isPending}
                            className="rounded-md border border-[#333333] bg-[#111111] px-3 py-2 text-sm text-gray-200 hover:bg-[#2C2C2E] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            변경
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-center sm:px-4">
                        <div className="flex justify-center gap-1 sm:gap-3">
                          {member.isEditing ? (
                            <button
                              type="button"
                              onClick={() => saveRow(member)}
                              className="rounded-md p-2 text-admin-brand hover:text-white"
                              title="저장"
                              aria-label="저장"
                            >
                              <Save size={16} />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => toggleEdit(member.id, true)}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                              title="수정"
                            >
                              <Edit2 size={14} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setSelectedUserForMissions(member)}
                            className="rounded-md p-2 text-cyan-500 hover:text-white"
                            title="미션 관리"
                            aria-label="미션 관리"
                          >
                            <ClipboardList size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedUserForInventory(member)}
                            className="rounded-md p-2 text-admin-brand hover:text-white"
                            title="인벤 CS"
                            aria-label="인벤 CS"
                          >
                            <Package size={16} />
                          </button>

                          <button
                            type="button"
                            onClick={() => setSelectedUserForGameTokens({ user: member, tab: "wallets" })}
                            className="rounded-md p-2 text-amber-500 hover:text-white"
                            title="잔액 티켓"
                            aria-label="잔액 티켓"
                          >
                            <Ticket size={16} />
                          </button>

                          <button
                            type="button"
                            onClick={() => setSelectedUserForGameTokens({ user: member, tab: "ledger" })}
                            className="rounded-md p-2 text-gray-300 hover:text-white"
                            title="잔액 로그"
                            aria-label="잔액 로그"
                          >
                            <History size={16} />
                          </button>

                          <button
                            type="button"
                            onClick={() => setSelectedUserForVaultHistory(member)}
                            className="rounded-md p-2 text-yellow-500 hover:text-white"
                            title="금고 내역"
                            aria-label="금고 내역"
                          >
                            <span className="font-bold text-xs">V</span>
                          </button>


                          <button
                            type="button"
                            onClick={() => purgeRow(member)}
                            className="rounded-md p-2 text-red-500 hover:text-red-300 hover:bg-red-900/30"
                            title="하드 퍼지(완전 초기화)"
                            aria-label="하드 퍼지(완전 초기화)"
                          >
                            <Skull size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeRow(member)}
                            className="rounded-md p-2 text-red-500 hover:text-red-300"
                            title="삭제"
                            aria-label="삭제"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {selectedUserForMissions && (
              <UserMissionModal
                user={selectedUserForMissions}
                onClose={() => setSelectedUserForMissions(null)}
              />
            )}

            {selectedUserForInventory && (
              <UserInventoryModal
                memberId={selectedUserForInventory!.id}
                nickname={selectedUserForInventory!.nickname ?? selectedUserForInventory!.external_id ?? String(selectedUserForInventory!.id)}
                isOpen={true}
                onClose={() => setSelectedUserForInventory(null)}
              />
            )}

            {selectedUserForGameTokens && (
              <UserGameTokenModal
                memberId={selectedUserForGameTokens!.user.id}
                nickname={selectedUserForGameTokens!.user.nickname ?? selectedUserForGameTokens!.user.external_id ?? String(selectedUserForGameTokens!.user.id)}
                isOpen={true}
                defaultTab={selectedUserForGameTokens.tab === "ledger" ? "history" : "grant"}
                onClose={() => setSelectedUserForGameTokens(null)}
              />
            )}

            {selectedUserForAuditLogs && (
              <UserAuditLogModal
                user={selectedUserForAuditLogs!}
                onClose={() => setSelectedUserForAuditLogs(null)}
              />
            )}

            {selectedUserForVaultHistory && (
              <VaultHistoryTable
                user={selectedUserForVaultHistory}
                onClose={() => setSelectedUserForVaultHistory(null)}
              />
            )}

            {sortedMembers.length === 0 && (
              <div className="py-8 text-center text-gray-400">검색 결과가 없습니다.</div>
            )}

            {totalPages > 0 && (
              <div className="flex flex-col gap-2 border-t border-[#333333] bg-[#1A1A1A] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <p className="text-xs text-gray-400 sm:text-sm">{itemCountText}</p>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="h-8 rounded-md border border-[#333333] bg-[#111111] px-2 text-xs text-gray-300 focus:border-admin-brand outline-none"
                  >
                    <option value={20}>20개씩</option>
                    <option value={50}>50개씩</option>
                    <option value={100}>100개씩</option>
                  </select>
                </div>
                <nav className="relative z-0 inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={safePage === 1}
                    className={`relative inline-flex items-center rounded-l-md border border-[#333333] px-2 py-2 ${safePage === 1 ? "cursor-not-allowed bg-[#111111] text-gray-500" : "bg-[#1A1A1A] text-gray-300 hover:bg-[#2D6B3B]"
                      }`}
                  >
                    <span className="sr-only">이전</span>
                    <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                  </button>

                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const startPage = Math.max(1, Math.min(safePage - 2, totalPages - 4));
                    const pageNum = startPage + i;
                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setCurrentPage(pageNum)}
                        className={`relative inline-flex items-center border border-[#333333] px-3 py-2 text-sm font-medium sm:px-4 ${safePage === pageNum
                          ? "z-10 bg-[#2D6B3B] text-admin-brand"
                          : "bg-[#1A1A1A] text-gray-300 hover:bg-[#2C2C2E]"
                          }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safePage === totalPages}
                    className={`relative inline-flex items-center rounded-r-md border border-[#333333] px-2 py-2 ${safePage === totalPages ? "cursor-not-allowed bg-[#111111] text-gray-500" : "bg-[#1A1A1A] text-gray-300 hover:bg-[#2D6B3B]"
                      }`}
                  >
                    <span className="sr-only">다음</span>
                    <ChevronRight className="h-5 w-5" aria-hidden="true" />
                  </button>
                </nav>
              </div>
            )}
          </div>
        )
      }

      <UserImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
      />
    </div>
  );
};

// --- Sub Components ---

interface UserMissionModalProps {
  user: AdminUser;
  onClose: () => void;
}

const UserMissionModal: React.FC<UserMissionModalProps> = ({ user, onClose }) => {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const { data: missions = [], isLoading, refetch } = useQuery<AdminUserMissionDetail[]>({
    queryKey: ["admin", "user-missions", user.id],
    queryFn: () => fetchUserMissions(user.id),
    enabled: !!user.id,
  });

  const updateMutation = useMutation({
    mutationFn: ({ missionId, payload }: { missionId: number; payload: AdminUserMissionUpdatePayload }) =>
      updateUserMission(user.id, missionId, payload),
    onSuccess: () => {
      refetch();
      addToast("상태가 업데이트되었습니다.", "success");
      queryClient.invalidateQueries({ queryKey: ["vault-status"] }); // Invalidate vault if rewards are claimed
    },
    onError: (err: any) => {
      addToast(`수정 실패: ${err.message}`, "error");
    },
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl border border-[#333333] bg-[#111111] shadow-2xl flex flex-col">
        <div className="flex items-center justify-between border-b border-[#333333] p-4 sm:p-6 bg-[#1A1A1A]">
          <div>
            <h3 className="text-xl font-bold text-admin-brand">
              User Missions: {user.nickname || user.external_id}
            </h3>
            <p className="text-xs text-gray-400 mt-1">ID: {user.id} / {user.external_id}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-admin-text-secondary hover:bg-admin-hover hover:text-admin-text-primary"
            title="닫기"
            aria-label="닫기"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {isLoading ? (
            <div className="py-20 text-center text-gray-500 font-medium">Loading mission data...</div>
          ) : missions.length === 0 ? (
            <div className="py-20 text-center text-gray-500 font-medium">활성화된 미션이 없습니다.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {missions.map((m) => (
                <div key={m.mission_id} className="rounded-xl border border-[#333333] bg-[#1A1A1A] p-4 flex flex-col gap-3 group hover:border-[#91F402]/30 transition-all">
                  <div className="flex justify-between items-start">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold bg-[#333333] text-gray-400 px-1.5 py-0.5 rounded">ID: {m.mission_id}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${m.category === "NEW_USER" ? "bg-emerald-900 text-emerald-200" : "bg-blue-900 text-blue-200"}`}>{m.category}</span>
                      </div>
                      <h4 className="font-bold text-white truncate" title={m.title}>{m.title}</h4>
                      <p className="text-[10px] text-gray-500 font-mono mt-0.5">{m.logic_key}</p>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                      <span className={`text-xs font-black px-2 py-0.5 rounded-full ${m.is_completed ? "bg-[#2D6B3B] text-admin-brand" : "bg-red-900/30 text-red-400"}`}>
                        {m.is_completed ? "COMPLETED" : "IN-PROGRESS"}
                      </span>
                      <span className={`text-[10px] font-bold ${m.is_claimed ? "text-amber-500" : "text-gray-600"}`}>
                        {m.is_claimed ? "REWARD CLAIMED" : "UNCLAIMED"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-2 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">진행도: {m.current_value} / {m.target_value}</span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => updateMutation.mutate({ missionId: m.mission_id, payload: { current_value: m.target_value, is_completed: true } })}
                          className="text-[10px] font-bold bg-[#333333] hover:bg-[#2D6B3B] text-white px-2 py-1 rounded transition-colors"
                        >
                          강제 완료
                        </button>
                        <button
                          onClick={() => updateMutation.mutate({ missionId: m.mission_id, payload: { current_value: 0, is_completed: false, is_claimed: false } })}
                          className="text-[10px] font-bold bg-[#333333] hover:bg-red-900/50 text-white px-2 py-1 rounded transition-colors"
                        >
                          초기화
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => updateMutation.mutate({ missionId: m.mission_id, payload: { is_completed: !m.is_completed } })}
                        className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${m.is_completed ? "bg-[#2D6B3B] text-admin-brand" : "bg-[#333333] text-gray-400 hover:text-white"}`}
                      >
                        <Check size={14} />
                        {m.is_completed ? "완료됨" : "미완료"}
                      </button>
                      <button
                        onClick={() => updateMutation.mutate({ missionId: m.mission_id, payload: { is_claimed: !m.is_claimed } })}
                        className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${m.is_claimed ? "bg-amber-600 text-white" : "bg-[#333333] text-gray-400 hover:text-white"}`}
                      >
                        <Plus size={14} />
                        {m.is_claimed ? "지급 완료" : "수동 지급"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 sm:p-6 border-t border-[#333333] bg-[#1A1A1A] flex justify-end">
          <button onClick={onClose} className="rounded-lg bg-[#333333] px-6 py-2 text-sm font-bold text-white hover:bg-[#444444]">
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserAdminPage;
