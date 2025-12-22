import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getVaultStatus } from "../../api/vaultApi";
import VaultModal from "./VaultModal";

const formatWon = (amount: number) => `${amount.toLocaleString("ko-KR")}원`;

const formatDateTime = (iso: string | null | undefined): string | null => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;

  try {
    return new Intl.DateTimeFormat("ko-KR", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return d.toLocaleString();
  }
};

const VaultMainPanel: React.FC = () => {
  const [vaultModalOpen, setVaultModalOpen] = useState(false);

  const vault = useQuery({
    queryKey: ["vault-status"],
    queryFn: getVaultStatus,
    staleTime: 30_000,
    retry: false,
  });

  const view = useMemo(() => {
    const data = vault.data;
    const vaultBalance = data?.vaultBalance ?? 0;
    const cashBalance = data?.cashBalance ?? 0;
    const eligible = !!data?.eligible;
    const expiresAtLabel = formatDateTime(data?.expiresAt ?? null);
    const usedAtLabel = formatDateTime(data?.vaultFillUsedAt ?? null);

    const statusLabel = eligible ? "해금 대기" : "대기";
    const statusTone = eligible ? "text-cc-lime" : "text-white/70";

    return {
      vaultBalance,
      cashBalance,
      eligible,
      expiresAtLabel,
      usedAtLabel,
      statusLabel,
      statusTone,
    };
  }, [vault.data]);

  return (
    <section className="mx-auto w-full max-w-[980px] space-y-6">
      <header className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/60">Vault</p>
            <h1 className="mt-2 text-2xl font-extrabold text-white">내 금고</h1>
            <p className="mt-2 text-sm text-white/70">외부 충전 확인 시 잠긴 금고 금액이 해금되어 보유 머니에 합산됩니다.</p>
          </div>

          <div className="flex flex-col gap-2 sm:items-end">
            <button
              type="button"
              onClick={() => setVaultModalOpen(true)}
              className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white/85 hover:bg-white/10"
            >
              금고 안내 보기
            </button>
            <div className={`text-xs font-semibold ${view.statusTone}`}>{view.statusLabel}</div>
          </div>
        </div>

        {vault.isLoading ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="h-[92px] animate-pulse rounded-2xl border border-white/10 bg-white/5" />
            <div className="h-[92px] animate-pulse rounded-2xl border border-white/10 bg-white/5" />
          </div>
        ) : vault.isError ? (
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm font-semibold text-white">금고 상태를 불러오지 못했습니다.</p>
            <p className="mt-1 text-xs text-white/60">잠시 후 다시 시도해주세요.</p>
          </div>
        ) : (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/55">잠긴 금고</p>
              <p className="mt-2 text-2xl font-extrabold text-cc-lime">{formatWon(view.vaultBalance)}</p>
              <p className="mt-1 text-xs text-white/60">해금 전까지 금액은 잠금 상태입니다.</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/55">보유 머니</p>
              <p className="mt-2 text-2xl font-extrabold text-white">{formatWon(view.cashBalance)}</p>
              <p className="mt-1 text-xs text-white/60">해금된 금액은 보유 머니에 합산됩니다.</p>
            </div>
          </div>
        )}
      </header>

      <section className="grid gap-3 lg:grid-cols-3">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl lg:col-span-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-extrabold text-white">최근 활동 내역</p>
              <p className="mt-1 text-xs text-white/60">금고와 관련된 최근 상태를 확인합니다.</p>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-white/90">외부 충전 확인 상태</p>
                <p className={view.eligible ? "text-sm font-bold text-cc-lime" : "text-sm font-bold text-white/70"}>
                  {view.eligible ? "확인됨" : "미확인"}
                </p>
              </div>
              <p className="mt-1 text-xs text-white/60">확인되면 잠긴 금고 금액이 일부/전액 해금됩니다.</p>
            </div>

            {view.usedAtLabel ? (
              <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-white/90">금고 채우기 사용</p>
                  <p className="text-sm font-bold text-white/80">{view.usedAtLabel}</p>
                </div>
              </div>
            ) : null}

            {view.expiresAtLabel ? (
              <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-white/90">만료 예정</p>
                  <p className="text-sm font-bold text-white/80">{view.expiresAtLabel}</p>
                </div>
              </div>
            ) : null}

            {!view.usedAtLabel && !view.expiresAtLabel ? (
              <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
                <p className="text-sm font-semibold text-white/90">표시할 내역이 아직 없어요</p>
                <p className="mt-1 text-xs text-white/60">금고 이벤트 참여 후 내역이 표시됩니다.</p>
              </div>
            ) : null}
          </div>
        </div>

        <aside className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
          <p className="text-sm font-extrabold text-white">티켓이 부족해요</p>
          <p className="mt-1 text-xs text-white/60">씨씨카지노 이용 확인 후 금고 해금이 진행됩니다.</p>

          <div className="mt-4 flex flex-col gap-2">
            <a
              href="https://ccc-010.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-full items-center justify-center rounded-xl border border-black/15 bg-cc-lime px-4 py-3 text-sm font-extrabold text-black"
            >
              1만원 충전 ↗
            </a>
            <a
              href="https://ccc-010.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-full items-center justify-center rounded-xl border border-white/15 bg-white/8 px-4 py-3 text-sm font-extrabold text-white/90 hover:bg-white/12"
            >
              5만원 충전 ↗
            </a>
            <a
              href="https://t.me/jm956"
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-full items-center justify-center rounded-xl border border-white/15 bg-white/6 px-4 py-3 text-sm font-bold text-white/80 hover:bg-white/10"
            >
              실장 텔레 문의
            </a>
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs font-semibold text-white/80">금고 시스템 안내</p>
            <ul className="mt-2 space-y-1 text-xs text-white/60">
              <li>- 1만원 충전 확인: 5,000원 해금</li>
              <li>- 5만원 충전 확인: 전액 해금</li>
              <li>- 반영이 늦으면 관리자에게 문의해주세요</li>
            </ul>
          </div>
        </aside>
      </section>

      <VaultModal open={vaultModalOpen} onClose={() => setVaultModalOpen(false)} />
    </section>
  );
};

export default VaultMainPanel;
