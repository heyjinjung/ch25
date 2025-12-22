import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { GameTokenType } from "../../types/gameTokens";
import { getUiConfig } from "../../api/uiConfigApi";
import { requestTrialGrant } from "../../api/trialGrantApi";
import { useToast } from "../common/ToastProvider";
import { getVaultStatus } from "../../api/vaultApi";
import VaultModal from "../vault/VaultModal";

type Props = {
  tokenType: GameTokenType;
  onClaimSuccess?: () => void;
};

const DEFAULT_COPY = {
  title: "티켓이 잠깐 부족해요",
  body: "지금 이용하면 바로 이어서 플레이 가능합니다.",
  primaryCta: {
    label: "씨씨카지노 바로가기",
    url: "https://ccc-010.com",
  },
  secondaryCta: {
    label: "실장 텔레 문의",
    url: "https://t.me/jm956",
  },
};

type UiCta = {
  label: string;
  url: string;
};

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

const TicketZeroPanel: React.FC<Props> = ({ tokenType, onClaimSuccess }) => {
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const [vaultModalOpen, setVaultModalOpen] = useState(false);

  const ui = useQuery({
    queryKey: ["ui-config", "ticket_zero"],
    queryFn: () => getUiConfig("ticket_zero"),
    staleTime: 0,
  });

  const vault = useQuery({
    queryKey: ["vault-status"],
    queryFn: getVaultStatus,
    staleTime: 30_000,
    retry: false,
  });

  const config = useMemo(() => {
    const value = ui.data?.value ?? null;
    const v = value as Record<string, any> | null;
    const title = typeof v?.title === "string" ? v.title : DEFAULT_COPY.title;
    const body = typeof v?.body === "string" ? v.body : DEFAULT_COPY.body;

    const primaryLabel =
      typeof v?.primaryCta?.label === "string"
        ? v.primaryCta.label
        : typeof v?.primary_cta_label === "string"
          ? v.primary_cta_label
          : DEFAULT_COPY.primaryCta.label;
    const primaryUrl =
      typeof v?.primaryCta?.url === "string"
        ? v.primaryCta.url
        : typeof v?.primary_cta_url === "string"
          ? v.primary_cta_url
          : DEFAULT_COPY.primaryCta.url;

    const legacySecondaryLabel = typeof v?.cta_label === "string" ? v.cta_label : null;
    const legacySecondaryUrl = typeof v?.cta_url === "string" ? v.cta_url : null;

    const secondaryLabel =
      typeof v?.secondaryCta?.label === "string"
        ? v.secondaryCta.label
        : typeof v?.secondary_cta_label === "string"
          ? v.secondary_cta_label
          : legacySecondaryLabel ?? DEFAULT_COPY.secondaryCta.label;
    const secondaryUrl =
      typeof v?.secondaryCta?.url === "string"
        ? v.secondaryCta.url
        : typeof v?.secondary_cta_url === "string"
          ? v.secondary_cta_url
          : legacySecondaryUrl ?? DEFAULT_COPY.secondaryCta.url;

    const note = typeof v?.note === "string" ? v.note : null;

    const rawItems: unknown[] | null = Array.isArray(v?.reward_preview_items)
      ? (v.reward_preview_items as unknown[])
      : Array.isArray(v?.rewardPreviewItems)
        ? (v.rewardPreviewItems as unknown[])
        : null;

    const rewardPreviewItems: RewardPreviewItem[] | null = rawItems
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

    const rawProgress = (v?.reward_preview_progress ?? v?.rewardPreviewProgress) as Record<string, any> | null;
    const currentPoints = typeof rawProgress?.current_points === "number"
      ? rawProgress.current_points
      : typeof rawProgress?.currentPoints === "number"
        ? rawProgress.currentPoints
        : null;
    const nextPoints = typeof rawProgress?.next_points === "number"
      ? rawProgress.next_points
      : typeof rawProgress?.nextPoints === "number"
        ? rawProgress.nextPoints
        : null;
    const unitLabel = typeof rawProgress?.unit_label === "string"
      ? rawProgress.unit_label
      : typeof rawProgress?.unitLabel === "string"
        ? rawProgress.unitLabel
        : "점";

    const rewardPreviewProgress: RewardPreviewProgress | null =
      typeof currentPoints === "number" && typeof nextPoints === "number" && nextPoints > 0
        ? { currentPoints, nextPoints, unitLabel }
        : null;

    const primaryCta: UiCta = { label: primaryLabel, url: primaryUrl };
    const secondaryCta: UiCta = { label: secondaryLabel, url: secondaryUrl };
    return { title, body, primaryCta, secondaryCta, note, rewardPreviewItems, rewardPreviewProgress };
  }, [ui.data?.value]);

  const formatWon = (amount: number) => `${amount.toLocaleString("ko-KR")}원`;

  const rewardDeltaLabel = useMemo(() => {
    if (!config.rewardPreviewProgress) return null;
    const remaining = Math.max(0, config.rewardPreviewProgress.nextPoints - config.rewardPreviewProgress.currentPoints);
    return `${remaining.toLocaleString("ko-KR")}${config.rewardPreviewProgress.unitLabel}`;
  }, [config.rewardPreviewProgress]);

  const rewardProgressPercent = useMemo(() => {
    if (!config.rewardPreviewProgress) return null;
    const { currentPoints, nextPoints } = config.rewardPreviewProgress;
    if (nextPoints <= 0) return 0;
    return Math.max(0, Math.min(100, Math.round((currentPoints / nextPoints) * 100)));
  }, [config.rewardPreviewProgress]);

  const claimMutation = useMutation({
    mutationFn: () => requestTrialGrant({ token_type: tokenType }),
    onSuccess: (data) => {
      if (data.result === "OK") {
        addToast("체험 티켓 1장 지급 완료", "success");
        onClaimSuccess?.();
        queryClient.invalidateQueries({ queryKey: ["ui-config", "ticket_zero"] });
        return;
      }
      addToast("오늘은 이미 지급받았어요", "info");
      onClaimSuccess?.();
    },
    onError: () => {
      addToast("지급에 실패했어요. 잠시 후 다시 시도해주세요.", "error");
    },
  });

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-[clamp(12px,2.6vw,14px)] text-white/85">
      <div className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-cc-orange/60" />
      <div className="pl-2">
        <p className="font-extrabold text-white/90">{config.title}</p>
        <p className="mt-1 text-white/75">{config.body}</p>

        <div className="mt-2">
          <button
            type="button"
            onClick={() => setVaultModalOpen(true)}
            className="text-xs font-semibold text-slate-200/90 underline underline-offset-4 hover:text-white"
          >
            금고 안내 보기
          </button>
        </div>

        {(vault.data?.vaultBalance ?? 0) > 0 && (
          <div className="mt-3 rounded-xl border border-white/12 bg-white/5 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-extrabold text-white/90">금고 미리보기</p>
              <p className="text-sm font-extrabold text-cc-lime">{formatWon(vault.data?.vaultBalance ?? 0)}</p>
            </div>
            <p className="mt-1 text-[clamp(11px,2.2vw,12px)] text-white/60">
              씨씨카지노 이용 확인 시 잠금 금액이 해금됩니다.
            </p>

            {config.rewardPreviewItems?.length ? (
              <div className="mt-3 rounded-xl border border-white/12 bg-black/20 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-bold text-white/80">실제 획득 가능한 보상</p>
                  {rewardDeltaLabel ? (
                    <p className="text-[11px] font-semibold text-white/60">다음 보상까지 {rewardDeltaLabel}</p>
                  ) : null}
                </div>

                {typeof rewardProgressPercent === "number" ? (
                  <div className="mt-2">
                    <div className="h-2 w-full rounded-full bg-white/10">
                      <div
                        className="h-2 rounded-full bg-cc-lime"
                        style={{ width: `${rewardProgressPercent}%` }}
                        aria-label="다음 보상 진행률"
                      />
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[11px] text-white/55">
                      <span>{config.rewardPreviewProgress?.currentPoints?.toLocaleString("ko-KR") ?? 0}{config.rewardPreviewProgress?.unitLabel ?? "점"}</span>
                      <span>{config.rewardPreviewProgress?.nextPoints?.toLocaleString("ko-KR") ?? 0}{config.rewardPreviewProgress?.unitLabel ?? "점"}</span>
                    </div>
                  </div>
                ) : null}

                <div className="mt-2 max-h-[132px] space-y-2 overflow-y-auto pr-1">
                  {config.rewardPreviewItems.map((item, idx) => (
                    <div key={`${item.label}-${idx}`} className="flex items-center justify-between gap-3 border-b border-white/10 pb-2 last:border-0 last:pb-0">
                      <p className="text-sm font-semibold text-white/85">{item.label}</p>
                      {typeof item.amount === "number" ? (
                        <p className="text-sm font-extrabold text-cc-lime">
                          {item.amount.toLocaleString("ko-KR")}{item.unit ?? ""}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={claimMutation.isPending}
            onClick={() => {
              claimMutation.mutate();
            }}
            className="rounded-xl border border-black/15 bg-cc-lime px-4 py-2 text-sm font-extrabold text-black disabled:cursor-not-allowed disabled:bg-cc-lime/40 disabled:text-black/45"
          >
            {claimMutation.isPending ? "지급 중..." : "체험 티켓 1장 받기"}
          </button>
          {config.primaryCta.url ? (
            <a
              href={config.primaryCta.url}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl border border-white/15 bg-white/8 px-4 py-2 text-sm font-extrabold text-white/90 hover:bg-white/12"
            >
              {config.primaryCta.label}
            </a>
          ) : null}

          {config.secondaryCta.url ? (
            <a
              href={config.secondaryCta.url}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl border border-white/15 bg-white/6 px-4 py-2 text-sm font-bold text-white/80 hover:bg-white/10"
            >
              {config.secondaryCta.label}
            </a>
          ) : null}
        </div>

        {config.note ? (
          <p className="mt-2 text-[clamp(11px,2.2vw,12px)] text-white/55">{config.note}</p>
        ) : null}
      </div>

      <VaultModal open={vaultModalOpen} onClose={() => setVaultModalOpen(false)} />
    </div>
  );
};

export default TicketZeroPanel;
