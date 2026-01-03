import React from "react";
import { useMutation } from "@tanstack/react-query";

import { resolveAdminUser } from "../api/adminUserApi";
import type { AdminUserSummary } from "../types/adminUserSummary";

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  confirmLabel?: string;
  onConfirmed: (res: { identifier: string; user: AdminUserSummary }) => void;
  onCleared?: () => void;
};

type ResolveState =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "ok"; identifier: string; user: AdminUserSummary }
  | { state: "error"; message: string };

const UserIdentifierResolveConfirm: React.FC<Props> = ({
  label,
  value,
  onChange,
  placeholder,
  disabled,
  confirmLabel = "확정",
  onConfirmed,
  onCleared,
}) => {
  const [resolveState, setResolveState] = React.useState<ResolveState>({ state: "idle" });
  const [confirmed, setConfirmed] = React.useState<{ identifier: string; user: AdminUserSummary } | null>(null);

  const resolveMutation = useMutation({
    mutationFn: async (identifier: string) => resolveAdminUser(identifier),
    onSuccess: (data) => {
      setResolveState({ state: "ok", identifier: data.identifier, user: data.user });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail || err?.message || "사용자 조회 실패";
      setResolveState({ state: "error", message: String(msg) });
    },
  });

  const handleChange = (next: string) => {
    onChange(next);
    setResolveState({ state: "idle" });
    setConfirmed(null);
    onCleared?.();
  };

  const requestResolve = () => {
    const trimmed = String(value ?? "").trim();
    if (!trimmed) return;
    setResolveState({ state: "loading" });
    resolveMutation.mutate(trimmed);
  };

  const confirm = () => {
    if (resolveState.state !== "ok") return;
    const trimmed = String(value ?? "").trim();
    if (!trimmed) return;

    const payload = { identifier: trimmed, user: resolveState.user };
    setConfirmed(payload);
    onConfirmed(payload);
  };

  const inputBase =
    "w-full rounded-md border border-[#333333] bg-[#1A1A1A] px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#2D6B3B]";
  const labelClass = "mb-2 block text-sm font-medium text-gray-300";

  return (
    <div>
      <label className={labelClass}>{label}</label>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          className={inputBase}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          type="text"
          placeholder={placeholder}
          disabled={disabled}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              requestResolve();
            }
          }}
        />
        <button
          type="button"
          onClick={requestResolve}
          disabled={disabled || !String(value ?? "").trim() || resolveMutation.isPending}
          className="inline-flex items-center justify-center rounded-md border border-[#333333] bg-[#1A1A1A] px-4 py-2 text-sm font-medium text-gray-200 hover:bg-[#2C2C2E] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {resolveMutation.isPending || resolveState.state === "loading" ? "조회 중..." : "사용자 확인"}
        </button>
        <button
          type="button"
          onClick={confirm}
          disabled={disabled || resolveState.state !== "ok"}
          className="inline-flex items-center justify-center rounded-md bg-[#2D6B3B] px-4 py-2 text-sm font-medium text-white hover:bg-[#91F402] hover:text-black disabled:cursor-not-allowed disabled:opacity-60"
        >
          {confirmLabel}
        </button>
      </div>

      {resolveState.state === "ok" && (
        <div className="mt-3 rounded-lg border border-[#333333] bg-[#0A0A0A] p-4 text-gray-200">
          <p className="text-sm font-semibold text-[#91F402]">대상 사용자 확인</p>
          <p className="mt-1 text-sm">닉네임: {resolveState.user.nickname ?? "-"}</p>
          <p className="mt-1 text-sm">
            TG: {resolveState.user.tg_username ? `@${String(resolveState.user.tg_username).replace(/^@/, "")}` : resolveState.user.tg_id ?? "-"}
          </p>
          <p className="mt-1 text-xs text-gray-400">external_id: {resolveState.user.external_id ?? "-"}</p>
          {(resolveState.user.real_name || resolveState.user.phone_number) && (
            <p className="mt-1 text-xs text-gray-400">
              {[resolveState.user.real_name, resolveState.user.phone_number].filter(Boolean).join(" / ")}
            </p>
          )}
          {confirmed?.identifier && confirmed.identifier === String(value ?? "").trim() && (
            <p className="mt-2 text-xs text-gray-400">확정됨</p>
          )}
        </div>
      )}

      {resolveState.state === "error" && (
        <div className="mt-3 rounded-lg border border-red-500/40 bg-red-950 p-4 text-red-100">
          {resolveState.message}
        </div>
      )}
    </div>
  );
};

export default UserIdentifierResolveConfirm;
