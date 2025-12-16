// src/admin/pages/UserAdminPage.tsx
import React, { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createUser, deleteUser, fetchUsers, updateUser, AdminUserPayload } from "../api/adminUserApi";
import Button from "../../components/common/Button";

type EditableUser = Partial<AdminUserPayload> & { id?: number };

const emptyUser: EditableUser = {
  external_id: "",
  nickname: "",
  level: 1,
  xp: 0,
  status: "ACTIVE",
  password: "",
  season_level: 1,
};

const UserAdminPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: fetchUsers,
  });

  const tableContainerRef = useRef<HTMLDivElement | null>(null);

  const [rows, setRows] = useState<EditableUser[]>([emptyUser]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (data) {
      const sorted = [...data].sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
      setRows(sorted.map((u) => ({ ...u, password: "" })));
    }
  }, [data]);

  const filteredRowsWithIndex = rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        row.external_id?.toLowerCase().includes(term) ||
        row.nickname?.toLowerCase().includes(term) ||
        (row.id && String(row.id).includes(term))
      );
    });

  const createMutation = useMutation({
    mutationFn: (payload: AdminUserPayload) => createUser(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      setRows([emptyUser]);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<AdminUserPayload> }) => updateUser(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteUser(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
  });

  const handleField = (index: number, field: keyof EditableUser, value: string | number) => {
    setRows((prev) =>
      prev.map((row, idx) =>
        idx === index
          ? {
              ...row,
              [field]: field === "level" || field === "xp" || field === "season_level" ? Number(value) : value,
            }
          : row
      )
    );
  };

  const addNewRow = () => {
    setSearchTerm("");
    setRows((prev) => [{ ...emptyUser }, ...prev]);
    tableContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submitExisting = (row: EditableUser) => {
    if (!row.id) return;
    const payload: Partial<AdminUserPayload> = {
      external_id: row.external_id,
      nickname: row.nickname,
      status: row.status,
      level: row.level,
      xp: row.xp,
      season_level: row.season_level,
    };
    if (row.password) payload.password = row.password;
    updateMutation.mutate({ id: row.id, payload });
  };

  const submitNew = (row: EditableUser) => {
    if (!row.external_id) return;
    const payload: AdminUserPayload = {
      external_id: row.external_id,
      nickname: row.nickname,
      status: row.status,
      level: row.level ?? 1,
      xp: row.xp ?? 0,
      password: row.password,
      season_level: row.season_level ?? 1,
    };
    createMutation.mutate(payload);
  };

  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold text-slate-100">회원 관리 (생성/수정/삭제)</h1>
        <p className="text-sm text-slate-300">
          외부 링크로 아이디/비밀번호를 전달해 접속시키는 시크릿 운영 모드입니다. 비밀번호는 최소 4자 이상 입력하세요.
        </p>
      </header>

      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="ID, 닉네임 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full max-w-sm rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
        />

        <Button variant="secondary" onClick={addNewRow}>
          행 추가
        </Button>
      </div>

      {isLoading && <div className="rounded-lg border border-emerald-800/40 bg-slate-900 p-3 text-slate-200">불러오는 중...</div>}
      {isError && (
        <div className="rounded-lg border border-red-700/40 bg-red-950 p-3 text-red-100">불러오기 실패: {(error as Error).message}</div>
      )}

      <div ref={tableContainerRef} className="overflow-auto rounded-lg border border-slate-800">
        <table className="min-w-full divide-y divide-slate-800 bg-slate-900 text-sm text-slate-100">
          <thead className="bg-slate-800/60">
            <tr>
              <th className="px-3 py-2 text-left">ID</th>
              <th className="px-3 py-2 text-left">닉네임</th>
              <th className="px-3 py-2 text-left">레벨(G)</th>
              <th className="px-3 py-2 text-left">시즌Lv</th>
              <th className="px-3 py-2 text-left">XP</th>
              <th className="px-3 py-2 text-left">상태</th>
              <th className="px-3 py-2 text-left">비밀번호(초기화)</th>
              <th className="px-3 py-2 text-right">액션</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filteredRowsWithIndex.map(({ row, index }) => (
              <tr key={row.id ?? index}>
                <td className="px-3 py-2">
                  <input
                    value={row.external_id ?? ""}
                    onChange={(e) => handleField(index, "external_id", e.target.value)}
                    className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-1"
                    placeholder="필수"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    value={row.nickname ?? ""}
                    onChange={(e) => handleField(index, "nickname", e.target.value)}
                    className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-1"
                    placeholder="닉네임"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    value={row.level ?? 1}
                    onChange={(e) => handleField(index, "level", Number(e.target.value))}
                    className="w-16 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-right"
                    min={1}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    value={row.season_level ?? 1}
                    onChange={(e) => handleField(index, "season_level", Number(e.target.value))}
                    className="w-16 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-right"
                    min={1}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    value={row.xp ?? 0}
                    onChange={(e) => handleField(index, "xp", Number(e.target.value))}
                    className="w-20 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-right"
                    min={0}
                  />
                </td>
                <td className="px-3 py-2">
                  <select
                    value={row.status ?? "ACTIVE"}
                    onChange={(e) => handleField(index, "status", e.target.value)}
                    className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-1"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                    <option value="BANNED">BANNED</option>
                  </select>
                </td>
                <td className="px-3 py-2">
                  <input
                    type="password"
                    value={row.password ?? ""}
                    onChange={(e) => handleField(index, "password", e.target.value)}
                    className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-1"
                    placeholder="변경 시 입력"
                  />
                </td>
                <td className="px-3 py-2 text-right space-x-2">
                  {row.id ? (
                    <>
                      <Button variant="secondary" onClick={() => submitExisting(row)} disabled={updateMutation.isPending}>
                        저장
                      </Button>
                      <Button variant="secondary" onClick={() => deleteMutation.mutate(row.id!)} disabled={deleteMutation.isPending}>
                        삭제
                      </Button>
                    </>
                  ) : (
                    <Button onClick={() => submitNew(row)} disabled={createMutation.isPending || !row.external_id}>
                      생성
                    </Button>
                  )}
                </td>
              </tr>
            ))}
            {filteredRowsWithIndex.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-4 text-center text-slate-400">
                  {searchTerm ? "검색 결과가 없습니다." : "데이터가 없습니다. 행 추가를 눌러 새 유저를 만드세요."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default UserAdminPage;
