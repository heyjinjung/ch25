import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getVaultStatus } from "../../api/vaultApi";
import { getUiConfig } from "../../api/uiConfigApi";
import VaultModal from "./VaultModal";
import { useAuth } from "../../auth/authStore";
import AnimatedCountdown from "../common/AnimatedCountdown";

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
  const [isWarning, setIsWarning] = useState(false);

  useEffect(() => {
    const calculate = () => {
      const difference = expiresAt.getTime() - new Date().getTime();
      if (difference <= 0) {
        setIsWarning(false);
        return;
      }

      setIsWarning(difference < 60 * 60 * 1000);
      return;
    };

    calculate();
    const timer = setInterval(() => calculate(), 1000);
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
      <AnimatedCountdown
        targetMs={expiresAt.getTime()}
        warnUnderMs={60 * 60 * 1000}
        expiredText="00시간 00분 00초"
        suffix="후 소멸"
        className={isWarning ? "font-bold" : ""}
        showDays={false}
      />
    </div>
  );
};

const VaultDoorVisual: React.FC<{ stateLabel: string; accentTone?: "active" | "idle" }> = ({
  stateLabel,
  accentTone = "idle",
}) => {
  const accentRing = accentTone === "active" ? "border-secondary-300/70" : "border-white/15";
  const accentGlow = accentTone === "active" ? "animate-pulse-glow" : "";
  const accentText = accentTone === "active" ? "text-secondary-200" : "text-white/70";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-dark-200/80 to-dark-100">
      <div className="absolute inset-0 opacity-60">
        <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-secondary-400/10 blur-3xl" />
        <div className="absolute -bottom-12 -right-12 h-52 w-52 rounded-full bg-white/8 blur-3xl" />
        <img
          src="/images/coin.svg"
          alt=""
          className="absolute -right-6 -top-10 h-40 w-40 rotate-12 opacity-[0.08]"
          loading="lazy"
          aria-hidden="true"
        />
      </div>

      <div className="relative z-10 flex items-center justify-between gap-4 p-5">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/60">Premium Vault</p>
          <p className="mt-1 text-sm font-extrabold text-white">활동 금고</p>
          <p className={`mt-1 inline-flex items-center gap-2 text-xs font-bold ${accentText}`}>
            <span className="inline-block h-2 w-2 rounded-full bg-secondary-300/80" />
            {stateLabel}
          </p>
        </div>

        <div className="relative h-[92px] w-[92px] shrink-0">
          <div className={`absolute inset-0 rounded-full border ${accentRing} ${accentGlow}`} />
          <div className="absolute inset-[6px] rounded-full border border-white/10 bg-dark-50" />
          <div className="absolute inset-[14px] rounded-full border border-white/10 bg-black/30" />

          <div className="absolute inset-[18px] rounded-full border border-white/15 bg-dark-100">
            <div className="absolute inset-0 animate-spin-slow rounded-full">
              {[...Array(10)].map((_, idx) => (
                <div
                  key={idx}
                  className="absolute left-1/2 top-1/2 h-8 w-[2px] -translate-x-1/2 -translate-y-1/2 bg-white/15"
                  style={{ transform: `translate(-50%, -50%) rotate(${idx * 36}deg) translateY(-30px)` }}
                />
              ))}
            </div>
            <div className="absolute inset-[18px] rounded-full border border-white/15 bg-black/35" />
            <div className="absolute inset-[28px] rounded-full bg-secondary-400/12" />
            <div className="absolute inset-[34px] rounded-full bg-black/40" />
          </div>

          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative">
              <div className="h-4 w-4 rounded-full bg-secondary-300/80 shadow" />
              <img
                src="/images/dia.svg"
                alt=""
                className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 opacity-80"
                loading="lazy"
                aria-hidden="true"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 px-5 pb-5">
        <div className="grid grid-cols-6 gap-2">
          {[...Array(12)].map((_, idx) => (
            <div key={idx} className="h-2 rounded-full bg-white/5" />
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between text-[11px] text-white/50">
          <span>보안 금고 잠금</span>
          <span className="font-semibold text-white/65">Vault Door</span>
        </div>
      </div>
    </div>
  );
};

const VaultMainPanel: React.FC = () => {
  const [vaultModalOpen, setVaultModalOpen] = useState(false);
  const { user } = useAuth();

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
      <div className="rounded-3xl border border-white/10 bg-dark-200/60 p-6 shadow-lg backdrop-blur">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-secondary-300/35 bg-black/25 px-5 py-2 text-sm font-extrabold text-secondary-200">
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/10">
                <img
                  src="/images/coin.svg"
                  alt=""
                  className="h-4 w-auto max-w-4 object-contain invert brightness-200 contrast-125"
                  loading="lazy"
                  aria-hidden="true"
                />
              </span>
              XMAS 이벤트 금고
            </div>
          </div>

          <div>
            <h1 className="text-2xl font-extrabold text-white sm:text-3xl">
              {(user?.nickname || user?.external_id || "플레이어").toString()}님의 활동 금고
            </h1>
            <p className="mt-2 text-sm text-white/70">
              활동에 따라 <span className="font-semibold text-secondary-200">자동으로 적립된</span> 보상 금액이 금고에 있습니다.
            </p>

            <div className="mt-4 rounded-2xl border border-white/10 bg-black/25 p-4 text-white/75">
              <p className="text-[12px] font-bold uppercase tracking-[0.22em] text-white/70">금고 해금 규칙</p>
              <ul className="mt-2 space-y-1 text-[clamp(13px,2.6vw,14px)]">
                <li>
                  <span className="font-semibold text-white/85">대상</span>: 신규 회원 프로모션 대상(상태가 “해금 대기”로 표시됩니다)
                </li>
                <li>
                  <span className="font-semibold text-white/85">해금 금액</span>: “잠긴 금고” 금액 <span className="font-semibold text-secondary-200">전액</span>
                </li>
                <li>
                  <span className="font-semibold text-white/85">해금 조건</span>: 씨씨카지노 이용 확인(충전/입금) 후 보유 머니로 합산
                </li>
              </ul>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <div className="rounded-2xl border border-white/10 bg-dark-100 shadow-[0_0_15px_rgba(255,255,255,0.03)]">
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-cc-olive/70 to-cc-moss/70 p-6">
                      <div className="absolute inset-0 opacity-55">
                        <div className="absolute left-6 top-6 h-16 w-16 rounded-full bg-secondary-200/35 blur-2xl" />
                        <div className="absolute bottom-6 right-6 h-28 w-28 rounded-full bg-secondary-100/25 blur-2xl" />
                        <img
                          src="/images/money.svg"
                          alt=""
                          className="absolute -right-8 -top-10 h-44 w-44 rotate-12 opacity-[0.08]"
                          loading="lazy"
                          aria-hidden="true"
                        />
                      </div>

                      <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-3 py-1 text-xs font-bold text-white/85">
                            <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/10">
                              <img
                                src="/images/wallet.svg"
                                alt=""
                                className="h-4 w-auto max-w-4 object-contain invert brightness-200 contrast-125"
                                loading="lazy"
                                aria-hidden="true"
                              />
                            </span>
                            통합 금고 현황
                            <span className="rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-[10px] font-extrabold text-white/70">Phase 1</span>
                          </div>
                          <p className="mt-3 text-3xl font-extrabold text-white">{formatWon(view.vaultBalance)}</p>
                          {view.expiresAt ? (
                            <div className="mt-2">
                              <CountdownTimer expiresAt={view.expiresAt} />
                            </div>
                          ) : (
                            <p className="mt-2 text-sm text-white/60">만료 정보 없음</p>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <div className={`rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs font-extrabold ${view.statusTone}`}>
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

                      <div className="relative z-10 mt-5">
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="rounded-xl border border-white/10 bg-black/30 p-5">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/10">
                                <img
                                  src="/images/coin.svg"
                                  alt=""
                                  className="h-4 w-auto max-w-4 object-contain invert brightness-200 contrast-125"
                                  loading="lazy"
                                  aria-hidden="true"
                                />
                              </span>
                              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">잠긴 금고</p>
                            </div>
                            <p className="mt-2 text-2xl font-extrabold text-secondary-200">{formatWon(view.vaultBalance)}</p>
                            <p className="mt-1 text-xs text-white/60">해금 전까지 금액은 잠금 상태입니다.</p>
                          </div>
                          <div className="rounded-xl border border-white/10 bg-black/30 p-5">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/10">
                                <img
                                  src="/images/wallet.svg"
                                  alt=""
                                  className="h-4 w-auto max-w-4 object-contain invert brightness-200 contrast-125"
                                  loading="lazy"
                                  aria-hidden="true"
                                />
                              </span>
                              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">보유 머니</p>
                            </div>
                            <p className="mt-2 text-2xl font-extrabold text-white">{formatWon(view.cashBalance)}</p>
                            <p className="mt-1 text-xs text-white/60">해금된 금액은 보유 머니에 합산됩니다.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <VaultDoorVisual stateLabel={view.statusLabel} accentTone={view.eligible ? "active" : "idle"} />
                </div>
              </div>
            </div>

            <aside className="rounded-2xl border border-white/10 bg-dark-100 p-5">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/10">
                  <img
                    src="/images/tele.svg"
                    alt=""
                    className="h-6 w-auto max-w-6 object-contain invert brightness-200 contrast-125"
                    loading="lazy"
                    aria-hidden="true"
                  />
                </span>
                <div>
                  <p className="text-sm font-extrabold text-white">티켓이 부족해요</p>
                  <p className="mt-1 text-xs text-white/60">씨씨카지노 이용 확인 후 금고 해금이 진행됩니다.</p>
                </div>
              </div>

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
                <p className="text-[16px] font-semibold text-white/80">금고 시스템 안내</p>
                <ul className="mt-2 space-y-1 text-[16px] text-white/60">
                  <li>- 1만원 충전 확인: 5,000원 해금</li>
                  <li>- 5만원 충전 확인: 전액 해금</li>
                  <li>- 반영이 늦으면 관리자에게 문의해주세요</li>
                </ul>
              </div>
            </aside>
          </div>
        </div>

        <div className="mt-6">
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
          ) : null}

          {rewardPreview.items?.length ? (
            <div className="mt-4 rounded-2xl border border-white/10 bg-black/25 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/10">
                      <img
                        src="/images/direction.svg"
                        alt=""
                        className="h-5 w-5 opacity-90"
                        loading="lazy"
                        aria-hidden="true"
                      />
                    </span>
                    <p className="text-sm font-extrabold text-white">금고 미리보기(보상 프리뷰)</p>
                  </div>
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
                      <p className="text-sm font-extrabold text-secondary-200">{item.amount.toLocaleString("ko-KR")}{item.unit ?? ""}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <section className="grid gap-3">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/10">
                  <img
                    src="/images/flag.svg"
                    alt=""
                    className="h-5 w-auto max-w-5 object-contain invert brightness-200 contrast-125"
                    loading="lazy"
                    aria-hidden="true"
                  />
                </span>
                <p className="text-[20px] font-extrabold text-white">최근 활동 내역</p>
              </div>
              <p className="mt-1 text-[16px] text-white/60">금고와 관련된 최근 상태를 확인합니다.</p>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[18px] font-semibold text-white/90">외부 충전 확인 상태</p>
                <p className={view.eligible ? "text-[18px] font-bold text-secondary-200" : "text-[18px] font-bold text-white/90"}>
                  {view.eligible ? "확인됨" : "미확인"}
                </p>
              </div>
              <p className="mt-1 text-[16px] text-white/60">확인되면 잠긴 금고 금액이 일부/전액 해금됩니다.</p>
            </div>

            {view.usedAt ? (
              <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[18px] font-semibold text-white/90">금고 채우기 사용</p>
                  <p className="text-[18px] font-bold text-white/90">{formatDateTime(view.usedAt)}</p>
                </div>
              </div>
            ) : null}

            {view.expiresAt ? (
              <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[18px] font-semibold text-white/90">만료 예정</p>
                  <p className="text-[18px] font-bold text-white/90">{formatDateTime(view.expiresAt)}</p>
                </div>
              </div>
            ) : null}

            {!view.usedAt && !view.expiresAt ? (
              <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
                <p className="text-[18px] font-semibold text-white/90">표시할 내역이 아직 없어요</p>
                <p className="mt-1 text-[16px] text-white/60">금고 이벤트 참여 후 내역이 표시됩니다.</p>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <VaultModal open={vaultModalOpen} onClose={() => setVaultModalOpen(false)} />
    </section>
  );
};

export default VaultMainPanel;
