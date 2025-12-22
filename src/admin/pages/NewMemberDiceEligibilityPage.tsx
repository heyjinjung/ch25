// src/admin/pages/NewMemberDiceEligibilityPage.tsx
import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Edit2, Plus, Search, Trash2, X } from "lucide-react";
import {
  AdminNewMemberDiceEligibility,
  fetchNewMemberDiceEligibilityByExternalId,
  upsertNewMemberDiceEligibility,
  deleteNewMemberDiceEligibilityByExternalId,
} from "../api/adminNewMemberDiceApi";
import { useToast } from "../../components/common/ToastProvider";

const ITEMS_PER_PAGE = 10;

const normalizeExternalId = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const toIsoOrNull = (value: string): string | null => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

const fromIsoToLocalInput = (iso?: string | null): string => {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const formatKoreanDateTime = (iso?: string | null): string => {
  if (!iso) return "-";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("ko-KR");
};

const mapErrorDetail = (error: unknown): string => {
  const detail = (error as any)?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  return (error as any)?.message ?? "요청 처리 중 오류가 발생했습니다.";
};

const NewMemberDiceEligibilityPage: React.FC = () => {
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const [searchInput, setSearchInput] = useState("");
  const [appliedExternalId, setAppliedExternalId] = useState<string | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(1);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<AdminNewMemberDiceEligibility | null>(null);
  const [form, setForm] = useState({
    external_id: "",
    expires_at: "",
    is_eligible: false,
  });

  const parsedFormExternalId = useMemo(() => normalizeExternalId(form.external_id), [form.external_id]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin", "new-member-dice", "eligibility", appliedExternalId],
    queryFn: () => fetchNewMemberDiceEligibilityByExternalId(appliedExternalId),
  });

  const upsertMutation = useMutation({
    mutationFn: async () => {
      if (!parsedFormExternalId) throw new Error("외부 ID는 필수입니다.");
      return upsertNewMemberDiceEligibility({
        external_id: parsedFormExternalId,
        is_eligible: form.is_eligible,
        expires_at: toIsoOrNull(form.expires_at),
        campaign_key: null,
        granted_by: null,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "new-member-dice", "eligibility"] });
      addToast("저장 완료", "success");
      setEditing(null);
      setForm({ external_id: "", expires_at: "", is_eligible: false });
      setShowForm(false);
    },
    onError: (err) => addToast(mapErrorDetail(err), "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: (externalId: string) => deleteNewMemberDiceEligibilityByExternalId(externalId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "new-member-dice", "eligibility"] });
      addToast("삭제 완료", "success");
    },
    onError: (err) => addToast(mapErrorDetail(err), "error"),
  });

  const rows = data ?? [];
  const totalPages = Math.max(1, Math.ceil(rows.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * ITEMS_PER_PAGE;
  const currentRows = rows.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handleSearch = () => {
    const trimmed = normalizeExternalId(searchInput);
    setAppliedExternalId(trimmed ?? undefined);
    setCurrentPage(1);
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ external_id: "", expires_at: "", is_eligible: false });
    setShowForm(true);
  };

  const openEdit = (row: AdminNewMemberDiceEligibility) => {
    setEditing(row);
    setForm({
      external_id: row.external_id ?? "",
      expires_at: fromIsoToLocalInput(row.expires_at),
      is_eligible: row.is_eligible,
    });
    setShowForm(true);
  };

  const handleDelete = (row: AdminNewMemberDiceEligibility) => {
    const externalId = row.external_id?.trim();
    if (!externalId) {
      addToast("외부 ID가 없는 항목은 삭제할 수 없습니다.", "error");
      return;
    }
    const ok = window.confirm("정말 삭제하시겠습니까?");
    if (!ok) return;
    deleteMutation.mutate(externalId);
  };

  const itemCountText = useMemo(() => {
    if (rows.length === 0) return "0개 항목 표시";
    const from = startIndex + 1;
    const to = Math.min(startIndex + ITEMS_PER_PAGE, rows.length);
    return `${from}-${to}/${rows.length}개 항목 표시`;
  }, [rows.length, startIndex]);

  return (
    <section className="space-y-5">
      <header>
        <h2 className="text-2xl font-bold text-[#91F402]">신규회원 판정</h2>
        <p className="mt-1 text-sm text-gray-400">신규회원 전용 이벤트를 위한 회원 자격 관리 페이지입니다.</p>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full max-w-lg items-center gap-2">
          <div className="relative w-full">
            <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="외부 ID로 검색"
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
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center justify-center rounded-md bg-[#2D6B3B] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#91F402] hover:text-black"
        >
          <Plus size={18} className="mr-2" />
          회원 추가
        </button>
      </div>

      {showForm && (
        <div className="rounded-lg border border-[#333333] bg-[#111111] p-6 shadow-md">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-medium text-[#91F402]">{editing ? "회원 정보 수정" : "신규회원 판정 등록"}</h3>
              <p className="mt-1 text-sm text-gray-400">외부 ID 기준으로 자격을 부여/회수합니다.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditing(null);
                setForm({ external_id: "", expires_at: "", is_eligible: false });
              }}
              className="rounded-md p-2 text-gray-300 hover:bg-[#1A1A1A]"
              aria-label="폼 닫기"
            >
              <X size={18} />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-300">외부 ID (필수)</label>
              <input
                type="text"
                value={form.external_id}
                onChange={(e) => setForm((p) => ({ ...p, external_id: e.target.value }))}
                placeholder="ext-56"
                className="w-full rounded-md border border-[#333333] bg-[#1A1A1A] p-2 text-white focus:outline-none focus:ring-2 focus:ring-[#2D6B3B]"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-300">만료일 (선택)</label>
              <input
                type="datetime-local"
                value={form.expires_at}
                onChange={(e) => setForm((p) => ({ ...p, expires_at: e.target.value }))}
                className="w-full rounded-md border border-[#333333] bg-[#1A1A1A] p-2 text-white focus:outline-none focus:ring-2 focus:ring-[#2D6B3B]"
              />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-200">
              <input
                type="checkbox"
                checked={form.is_eligible}
                onChange={(e) => setForm((p) => ({ ...p, is_eligible: e.target.checked }))}
                className="h-4 w-4 rounded border-[#333333] bg-[#1A1A1A] text-[#91F402] focus:ring-[#2D6B3B]"
              />
              자격 부여
            </label>
            <div className="flex-1" />
            <button
              type="button"
              onClick={() => upsertMutation.mutate()}
              disabled={upsertMutation.isPending || !parsedFormExternalId}
              className="rounded-md bg-[#2D6B3B] px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-[#91F402] hover:text-black disabled:cursor-not-allowed disabled:opacity-60"
            >
              {upsertMutation.isPending ? "저장 중..." : "저장"}
            </button>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="rounded-lg border border-[#333333] bg-[#111111] p-4 text-gray-200">불러오는 중...</div>
      )}
      {isError && (
        <div className="rounded-lg border border-red-500/40 bg-red-950 p-4 text-red-100">{mapErrorDetail(error)}</div>
      )}

      {!isLoading && !isError && (
        <div className="rounded-lg border border-[#333333] bg-[#111111] shadow-md">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-[#333333] bg-[#1A1A1A]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">외부ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">상태</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">만료</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">수정일</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-[#91F402]">기능</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#333333]">
                {currentRows.map((row, index) => (
                  <tr
                    key={row.id ?? row.external_id ?? `${row.updated_at}-${index}`}
                    className={index % 2 === 0 ? "bg-[#111111]" : "bg-[#1A1A1A]"}
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-400">{row.id}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-white">{row.external_id ?? "-"}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                          row.is_eligible ? "bg-[#2D6B3B] text-[#91F402]" : "bg-red-900/60 text-red-200"
                        }`}
                      >
                        {row.is_eligible ? "부여" : "미부여"}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-400">{formatKoreanDateTime(row.expires_at)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-400">{formatKoreanDateTime(row.updated_at)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <div className="flex justify-center space-x-3">
                        <button
                          type="button"
                          onClick={() => openEdit(row)}
                          className="text-[#91F402] hover:text-white"
                          title="수정"
                          aria-label="수정"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(row)}
                          className="text-red-500 hover:text-red-300"
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

          {rows.length === 0 && (
            <div className="py-8 text-center text-gray-400">검색 결과가 없습니다.</div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-[#333333] bg-[#1A1A1A] px-4 py-3">
              <p className="text-sm text-gray-400">{itemCountText}</p>
              <nav className="inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className={`relative inline-flex items-center rounded-l-md border border-[#333333] px-2 py-2 ${
                    safePage === 1 ? "cursor-not-allowed bg-[#111111] text-gray-500" : "bg-[#1A1A1A] text-gray-300 hover:bg-[#2D6B3B]"
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
                      className={`relative inline-flex items-center border border-[#333333] px-4 py-2 text-sm font-medium ${
                        safePage === pageNum
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
                  className={`relative inline-flex items-center rounded-r-md border border-[#333333] px-2 py-2 ${
                    safePage === totalPages
                      ? "cursor-not-allowed bg-[#111111] text-gray-500"
                      : "bg-[#1A1A1A] text-gray-300 hover:bg-[#2D6B3B]"
                  }`}
                >
                  <span className="sr-only">다음</span>
                  <ChevronRight className="h-5 w-5" aria-hidden="true" />
                </button>
              </nav>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default NewMemberDiceEligibilityPage;
