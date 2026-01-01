// src/admin/pages/UserAdminPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Edit2, Plus, Save, Search, Trash2, Upload } from "lucide-react";
import { createUser, deleteUser, fetchUsers, updateUser, AdminUser, AdminUserPayload } from "../api/adminUserApi";
import { useToast } from "../../components/common/ToastProvider";
import UserImportModal from "../components/UserImportModal";

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
  };
  passwordReset?: string;
};

const ITEMS_PER_PAGE = 10;

type SortKey = "id" | "nickname" | "level" | "xp" | "status";
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

const statusBadgeClass = (status: string) => {
  if (status === "ACTIVE") return "bg-[#2D6B3B] text-[#91F402]";
  if (status === "INACTIVE") return "bg-red-900/60 text-red-200";
  return "bg-[#2C2C2E] text-gray-200";
};

const UserAdminPage: React.FC = () => {
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  // [Round 3] Search Logic: Prefer Backend Search
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState(""); // Debounced/Effective search term

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin", "users", searchTerm],
    queryFn: () => fetchUsers(searchTerm),
  });

  const [members, setMembers] = useState<MemberRow[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const [sortKey, setSortKey] = useState<SortKey>("nickname");
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

  const totalPages = Math.max(1, Math.ceil(sortedMembers.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * ITEMS_PER_PAGE;
  const currentMembers = sortedMembers.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const itemCountText = useMemo(() => {
    if (sortedMembers.length === 0) return "0개 항목 표시";
    const from = startIndex + 1;
    const to = Math.min(startIndex + ITEMS_PER_PAGE, sortedMembers.length);
    return `${from}-${to}/${sortedMembers.length}개 항목 표시`;
  }, [sortedMembers.length, startIndex]);

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
    <section className="space-y-5">
      <header>
        <h2 className="text-2xl font-bold text-[#91F402]">회원 관리 (생성/수정/삭제)</h2>
        <p className="mt-1 text-sm text-gray-400">
          외부 링크로 아이디/비밀번호를 전달해 접속시키는 시크릿 운영 모드입니다. 비밀번호는 최소 4자 이상 입력하세요.
        </p>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full max-w-lg items-center gap-2">
          <div className="relative w-full">
            <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="ID, 닉네임, TG Username 검색..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch();
              }}
              className="w-full rounded-md border border-[#333333] bg-[#111111] py-2 pl-10 pr-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#2D6B3B]"
            />
          </div>
          <button
            type="button"
            onClick={handleSearch}
            className="rounded-md border border-[#333333] bg-[#1A1A1A] px-4 py-2 text-sm text-gray-200 hover:bg-[#2D6B3B]"
          >
            검색
          </button>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={() => setShowImportModal(true)}
            className="flex w-full items-center justify-center rounded-md border border-[#333333] bg-[#1A1A1A] px-4 py-2 text-sm font-medium text-gray-200 hover:bg-[#2D6B3B] hover:text-white sm:w-auto"
          >
            <Upload size={18} className="mr-2" />
            일괄 등록
          </button>
          <button
            type="button"
            onClick={() => setShowAddForm((p) => !p)}
            className="flex w-full items-center justify-center rounded-md bg-[#2D6B3B] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#91F402] hover:text-black sm:w-auto"
          >
            <Plus size={18} className="mr-2" />
            행 추가
          </button>
        </div>
      </div>

      {
        showAddForm && (
          <div className="rounded-lg border border-[#333333] bg-[#111111] p-6 shadow-md">
            <h3 className="text-lg font-medium text-[#91F402]">새 회원 추가</h3>

            <form onSubmit={submitNewMember} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="nickname" className="mb-1 block text-sm font-medium text-gray-300">
                    닉네임
                  </label>
                  <input
                    id="nickname"
                    type="text"
                    value={newMember.nickname}
                    onChange={(e) => setNewMember((p) => ({ ...p, nickname: e.target.value }))}
                    className="w-full rounded-md border border-[#333333] bg-[#1A1A1A] p-2 text-white focus:outline-none focus:ring-2 focus:ring-[#2D6B3B]"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="level" className="mb-1 block text-sm font-medium text-gray-300">
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
                  <label htmlFor="xp" className="mb-1 block text-sm font-medium text-gray-300">
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
                  <label htmlFor="status" className="mb-1 block text-sm font-medium text-gray-300">
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
                  <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-300">
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
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-[#333333]">
                  <div className="space-y-1">
                    <label htmlFor="real_name" className="text-xs font-medium text-gray-400">실명</label>
                    <input
                      id="real_name"
                      type="text"
                      value={newMember.real_name}
                      onChange={(e) => setNewMember((p) => ({ ...p, real_name: e.target.value }))}
                      className="w-full rounded-md border border-[#333333] bg-[#1A1A1A] p-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#91F402]"
                      placeholder="홍길동"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="phone_number" className="text-xs font-medium text-gray-400">연락처</label>
                    <input
                      id="phone_number"
                      type="text"
                      value={newMember.phone_number}
                      onChange={(e) => setNewMember((p) => ({ ...p, phone_number: e.target.value }))}
                      className="w-full rounded-md border border-[#333333] bg-[#1A1A1A] p-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#91F402]"
                      placeholder="010-0000-0000"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="telegram_id" className="text-xs font-medium text-gray-400">텔레그램 ID (숫자)</label>
                    <input
                      id="telegram_id"
                      type="text"
                      value={newMember.telegram_id}
                      onChange={(e) => setNewMember((p) => ({ ...p, telegram_id: e.target.value }))}
                      className="w-full rounded-md border border-[#333333] bg-[#1A1A1A] p-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#91F402]"
                      placeholder="12345678"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="telegram_username" className="text-xs font-medium text-gray-400">텔레그램 닉네임 (@제외)</label>
                    <input
                      id="telegram_username"
                      type="text"
                      value={newMember.telegram_username}
                      onChange={(e) => setNewMember((p) => ({ ...p, telegram_username: e.target.value }))}
                      className="w-full rounded-md border border-[#333333] bg-[#1A1A1A] p-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#91F402]"
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
          <div className="rounded-lg border border-[#333333] bg-[#111111] shadow-md">
            <div className="max-h-[70vh] overflow-x-auto overflow-y-auto">
              <table className="w-full min-w-[620px] md:min-w-[980px]">
                <thead className="sticky top-0 z-10 border-b border-[#333333] bg-[#1A1A1A]">
                  <tr>
                    <th
                      className={`px-3 py-3 text-left text-xs font-medium uppercase tracking-wider sm:px-4 ${sortKey === "id" ? "bg-[#2D6B3B] text-[#91F402]" : "text-gray-400"
                        } cursor-pointer hover:bg-[#2D6B3B]`}
                      onClick={() => handleSort("id")}
                    >
                      ID{renderSortIcon("id")}
                    </th>
                    <th
                      className={`px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400 sm:px-4`}
                    >
                      External ID
                    </th>
                    <th
                      className={`hidden px-3 py-3 text-left text-xs font-medium uppercase tracking-wider sm:px-4 md:table-cell ${sortKey === "nickname" ? "bg-[#2D6B3B] text-[#91F402]" : "text-gray-400"
                        } cursor-pointer hover:bg-[#2D6B3B]`}
                      onClick={() => handleSort("nickname")}
                    >
                      닉네임{renderSortIcon("nickname")}
                    </th>
                    <th
                      className={`px-3 py-3 text-left text-xs font-medium uppercase tracking-wider sm:px-4 ${sortKey === "level" ? "bg-[#2D6B3B] text-[#91F402]" : "text-gray-400"
                        } cursor-pointer hover:bg-[#2D6B3B]`}
                      onClick={() => handleSort("level")}
                    >
                      레벨{renderSortIcon("level")}
                    </th>
                    <th
                      className={`px-3 py-3 text-left text-xs font-medium uppercase tracking-wider sm:px-4 ${sortKey === "xp" ? "bg-[#2D6B3B] text-[#91F402]" : "text-gray-400"
                        } cursor-pointer hover:bg-[#2D6B3B]`}
                      onClick={() => handleSort("xp")}
                    >
                      XP{renderSortIcon("xp")}
                    </th>
                    <th
                      className={`px-3 py-3 text-left text-xs font-medium uppercase tracking-wider sm:px-4 ${sortKey === "status" ? "bg-[#2D6B3B] text-[#91F402]" : "text-gray-400"
                        } cursor-pointer hover:bg-[#2D6B3B]`}
                      onClick={() => handleSort("status")}
                    >
                      상태{renderSortIcon("status")}
                    </th>
                    <th className="hidden px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400 sm:px-4 md:table-cell">실명/연락처</th>
                    <th className="hidden px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400 sm:px-4 md:table-cell">TG ID / Username</th>
                    <th className="hidden px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400 sm:px-4 lg:table-cell">메모/태그</th>
                    <th className="hidden px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400 sm:px-4 lg:table-cell text-center">비밀번호(V2 리렉)</th>
                    <th className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-400 sm:px-4">액션</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#333333]">
                  {currentMembers.map((member, index) => (
                    <tr key={member.id} className={index % 2 === 0 ? "bg-[#111111]" : "bg-[#1A1A1A]"}>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-400 sm:px-4">{member.id}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-white sm:px-4">
                        {/* [Round 3] Priority: Telegram Username -> Nickname -> External ID */}
                        {member.telegram_username ? (
                          <div>
                            <div className="text-base font-bold text-[#91F402]">@{member.telegram_username}</div>
                            <div className="text-xs text-gray-500">{member.nickname !== member.telegram_username ? member.nickname : member.external_id}</div>
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
                            className="w-full rounded-md border border-[#333333] bg-[#1A1A1A] p-1.5 text-white focus:outline-none focus:ring-2 focus:ring-[#2D6B3B]"
                          />
                        ) : (
                          <div className="text-sm font-medium text-white">{member.nickname || "-"}</div>
                        )}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-white sm:px-4">
                        {member.isEditing ? (
                          <input
                            type="number"
                            min={1}
                            value={member.draft?.level ?? 1}
                            onChange={(e) => updateDraftField(member.id, "level", e.target.value)}
                            className="w-24 rounded-md border border-[#333333] bg-[#1A1A1A] p-1.5 text-right text-white focus:outline-none focus:ring-2 focus:ring-[#2D6B3B]"
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
                            className="w-24 rounded-md border border-[#333333] bg-[#1A1A1A] p-1.5 text-right text-white focus:outline-none focus:ring-2 focus:ring-[#2D6B3B]"
                          />
                        ) : (
                          member.xp ?? 0
                        )}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm sm:px-4">
                        {member.isEditing ? (
                          <select
                            value={member.draft?.status ?? "ACTIVE"}
                            onChange={(e) => updateDraftField(member.id, "status", e.target.value)}
                            className="w-32 rounded-md border border-[#333333] bg-[#1A1A1A] p-1.5 text-white focus:outline-none focus:ring-2 focus:ring-[#2D6B3B]"
                          >
                            <option value="ACTIVE">ACTIVE</option>
                            <option value="INACTIVE">INACTIVE</option>
                            {member.status && member.status !== "ACTIVE" && member.status !== "INACTIVE" && (
                              <option value={member.status}>{member.status}</option>
                            )}
                          </select>
                        ) : (
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${statusBadgeClass(member.status ?? "ACTIVE")}`}>
                            {member.status ?? "ACTIVE"}
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
                            <div className="text-white font-mono">{member.telegram_id || "-"}</div>
                            <div className="text-xs text-[#91F402]">@{member.telegram_username || "no_username"}</div>
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
                            className="w-56 rounded-md border border-[#333333] bg-[#1A1A1A] p-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#2D6B3B]"
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
                              className="rounded-md p-2 text-[#91F402] hover:text-white"
                              title="저장"
                              aria-label="저장"
                            >
                              <Save size={16} />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => toggleEdit(member.id, true)}
                              className="rounded-md p-2 text-[#91F402] hover:text-white"
                              title="수정"
                              aria-label="수정"
                            >
                              <Edit2 size={16} />
                            </button>
                          )}
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

            {sortedMembers.length === 0 && (
              <div className="py-8 text-center text-gray-400">검색 결과가 없습니다.</div>
            )}

            {totalPages > 1 && (
              <div className="flex flex-col gap-2 border-t border-[#333333] bg-[#1A1A1A] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-gray-400 sm:text-sm">{itemCountText}</p>
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
                          ? "z-10 bg-[#2D6B3B] text-[#91F402]"
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
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["admin", "users"] })}
      />
    </section >
  );
};

export default UserAdminPage;
