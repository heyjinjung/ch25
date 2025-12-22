import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getVaultStatus } from "../../api/vaultApi";
import { getUiConfig } from "../../api/uiConfigApi";
import VaultModal from "./VaultModal";

type RewardPreviewItem = {
  label: string;
  amount: number | undefined;
  unit: string | undefined;
};

type RewardPreviewProgress = {
  currentPoints: number;
  nextPoints: number;
  unitLabel: string;
};

const formatWon = (amount: number) => `${amount.toLocaleString("ko-KR")}원`;

const parseDate = (iso: string | null | undefined): Date | null => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d;
};

const formatDateTime = (d: Date | null): string | null => {
  if (!d) return null;
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

const CountdownTimer: React.FC<{ expiresAt: Date }> = ({ expiresAt }) => {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [isWarning, setIsWarning] = useState(false);

  useEffect(() => {
    const calculate = () => {
      const difference = expiresAt.getTime() - new Date().getTime();
      if (difference <= 0) {
        setIsWarning(false);
        return { hours: 0, minutes: 0, seconds: 0 };
      }

      setIsWarning(difference < 60 * 60 * 1000);
      return {
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    };

    setTimeLeft(calculate());
    const timer = setInterval(() => setTimeLeft(calculate()), 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  return (
    <div className={`inline-flex items-center ${isWarning ? "text-red-300" : "text-white/70"} text-sm font-medium`}>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="mr-1 h-4 w-4">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
          clipRule="evenodd"
        />
      </svg>
      <span className={isWarning ? "font-bold" : ""}>
        {String(timeLeft.hours).padStart(2, "0")}:{String(timeLeft.minutes).padStart(2, "0")}:{String(timeLeft.seconds).padStart(2, "0")} 후 소멸
      </span>
    </div>
  );
};

const VaultMainPanel: React.FC = () => {
  const [vaultModalOpen, setVaultModalOpen] = useState(false);

  const vault = useQuery({
    queryKey: ["vault-status"],
    queryFn: getVaultStatus,
    staleTime: 30_000,
    retry: false,
  });

  const ui = useQuery({
    queryKey: ["ui-config", "ticket_zero"],
    queryFn: () => getUiConfig("ticket_zero"),
    staleTime: 0,
  });

  const view = useMemo(() => {
    const data = vault.data;
    const vaultBalance = data?.vaultBalance ?? 0;
    const cashBalance = data?.cashBalance ?? 0;
    const eligible = !!data?.eligible;
    const expiresAt = parseDate(data?.expiresAt ?? null);
    const usedAt = parseDate(data?.vaultFillUsedAt ?? null);

    const statusLabel = vaultBalance > 0 ? (eligible ? "해금 대기" : "잠금") : "비어있음";
    const statusTone = eligible ? "text-cc-lime" : "text-white/70";

    return {
      vaultBalance,
      cashBalance,
      eligible,
      expiresAt,
      usedAt,
      statusLabel,
      statusTone,
    };
  }, [vault.data]);

  const rewardPreview = useMemo(() => {
    const value = ui.data?.value ?? null;
    const v = value as Record<string, unknown> | null;

    const rawItems: unknown[] | null = Array.isArray(v?.reward_preview_items)
      ? (v?.reward_preview_items as unknown[])
      : Array.isArray(v?.rewardPreviewItems)
        ? (v?.rewardPreviewItems as unknown[])
        : null;

    const items: RewardPreviewItem[] | null = rawItems
      ? rawItems
          .map((item) => {
            if (!item || typeof item !== "object") return null;
            const r = item as Record<string, unknown>;
            if (typeof r.label !== "string" || !r.label) return null;
            const amount = typeof r.amount === "number" ? r.amount : undefined;
            const unit = typeof r.unit === "string" ? r.unit : undefined;
            return { label: r.label, amount, unit };
          })
          .filter((item): item is RewardPreviewItem => item !== null)
      : null;

    const rawProgress = (v?.reward_preview_progress ?? v?.rewardPreviewProgress) as Record<string, unknown> | null;
    const currentPoints = typeof rawProgress?.current_points === "number"
      ? (rawProgress.current_points as number)
      : typeof rawProgress?.currentPoints === "number"
        ? (rawProgress.currentPoints as number)
        : null;
    const nextPoints = typeof rawProgress?.next_points === "number"
      ? (rawProgress.next_points as number)
      : typeof rawProgress?.nextPoints === "number"
        ? (rawProgress.nextPoints as number)
        : null;
    const unitLabel = typeof rawProgress?.unit_label === "string"
      ? (rawProgress.unit_label as string)
      : typeof rawProgress?.unitLabel === "string"
        ? (rawProgress.unitLabel as string)
        : "점";

    const progress: RewardPreviewProgress | null =
      typeof currentPoints === "number" && typeof nextPoints === "number" && nextPoints > 0
        ? { currentPoints, nextPoints, unitLabel }
        : null;

    const remainingLabel = progress
      ? `${Math.max(0, progress.nextPoints - progress.currentPoints).toLocaleString("ko-KR")}${progress.unitLabel}`
      : null;
    const percent = progress
      ? Math.max(0, Math.min(100, Math.round((progress.currentPoints / progress.nextPoints) * 100)))
      : null;

    return { items, progress, remainingLabel, percent };
  }, [ui.data?.value]);

  return (
    <section className="mx-auto w-full max-w-[980px] space-y-6">
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-lg">
        <div className="relative bg-casino-dark px-6 py-6">
          <div className="absolute inset-0 opacity-40">
            <div className="absolute left-6 top-6 h-16 w-16 rounded-full bg-cc-lime/15 blur-2xl" />
            <div className="absolute bottom-6 right-6 h-24 w-24 rounded-full bg-cc-lime/10 blur-2xl" />
          </div>

          <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/70">Vault</p>
              <h1 className="mt-2 text-2xl font-extrabold text-white">내 금고</h1>
              <p className="mt-2 text-sm text-white/70">외부 충전 확인 시 잠긴 금고 금액이 해금되어 보유 머니에 합산됩니다.</p>

              {view.expiresAt ? (
                <div className="mt-3">
                  <CountdownTimer expiresAt={view.expiresAt} />
                </div>
              ) : null}
            </div>

            <div className="flex flex-col gap-2 sm:items-end">
              <div className={`inline-flex items-center rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs font-bold ${view.statusTone}`}>
                {view.statusLabel}
              </div>
              <button
                type="button"
                onClick={() => setVaultModalOpen(true)}
                className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white/90 hover:bg-white/10"
              >
                금고 안내 보기
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          {vault.isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="h-[92px] animate-pulse rounded-2xl border border-white/10 bg-white/5" />
              <div className="h-[92px] animate-pulse rounded-2xl border border-white/10 bg-white/5" />
            </div>
          ) : vault.isError ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-semibold text-white">금고 상태를 불러오지 못했습니다.</p>
              <p className="mt-1 text-xs text-white/60">잠시 후 다시 시도해주세요.</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
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

          {rewardPreview.items?.length ? (
            <div className="mt-4 rounded-2xl border border-white/10 bg-black/25 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-extrabold text-white">금고 미리보기(보상 프리뷰)</p>
                  <p className="mt-1 text-xs text-white/60">실제 획득 가능한 보상을 확인하세요.</p>
                </div>
                {rewardPreview.remainingLabel ? (
                  <p className="text-xs font-semibold text-white/70">다음 보상까지 {rewardPreview.remainingLabel}</p>
                ) : null}
              </div>

              {typeof rewardPreview.percent === "number" ? (
                <div className="mt-3">
                  <div className="h-2 w-full rounded-full bg-white/10">
                    <div className="h-2 rounded-full bg-cc-lime" style={{ width: `${rewardPreview.percent}%` }} />
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-white/55">
                    <span>{rewardPreview.progress?.currentPoints.toLocaleString("ko-KR")}{rewardPreview.progress?.unitLabel ?? "점"}</span>
                    <span>{rewardPreview.progress?.nextPoints.toLocaleString("ko-KR")}{rewardPreview.progress?.unitLabel ?? "점"}</span>
                  </div>
                </div>
              ) : null}

              <div className="mt-3 max-h-[160px] space-y-2 overflow-y-auto pr-1">
                {rewardPreview.items.map((item, idx) => (
                  <div
                    key={`${item.label}-${idx}`}
                    className="flex items-center justify-between gap-3 border-b border-white/10 pb-2 last:border-0 last:pb-0"
                  >
                    <p className="text-sm font-semibold text-white/85">{item.label}</p>
                    {typeof item.amount === "number" ? (
                      <p className="text-sm font-extrabold text-cc-lime">{item.amount.toLocaleString("ko-KR")}{item.unit ?? ""}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

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

            {view.usedAt ? (
              <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-white/90">금고 채우기 사용</p>
                  <p className="text-sm font-bold text-white/80">{formatDateTime(view.usedAt)}</p>
                </div>
              </div>
            ) : null}

            {view.expiresAt ? (
              <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-white/90">만료 예정</p>
                  <p className="text-sm font-bold text-white/80">{formatDateTime(view.expiresAt)}</p>
                </div>
              </div>
            ) : null}

            {!view.usedAt && !view.expiresAt ? (
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
