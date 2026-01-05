import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import type { GameTokenType } from "../../types/gameTokens";
import { getUiConfig } from "../../api/uiConfigApi";
import { isTrialGrantAllowedTokenType, requestTrialGrant } from "../../api/trialGrantApi";
import { useToast } from "../common/ToastProvider";
import { getVaultStatus } from "../../api/vaultApi";

type Props = {
  tokenType: GameTokenType;
  onClaimSuccess?: () => void;
};

const DEFAULT_COPY = {
  title: "체험판: 다이아 채굴 기회!",
  body: "체험 티켓으로 다이아를 모아 코인으로 교환하세요.",
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

const TicketZeroPanel: React.FC<Props> = ({ tokenType, onClaimSuccess }) => {
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const canRequestTrialGrant = useMemo(() => isTrialGrantAllowedTokenType(tokenType), [tokenType]);

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
    // ... (keep existing implementation) ...
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

    const primaryCta: UiCta = { label: primaryLabel, url: primaryUrl };
    const secondaryCta: UiCta = { label: secondaryLabel, url: secondaryUrl };
    return { title, body, primaryCta, secondaryCta };
  }, [ui.data?.value]);

  const formatWon = (amount: number) => `${amount.toLocaleString("ko-KR")}원`;

  const claimMutation = useMutation({
    mutationFn: () => {
      if (!isTrialGrantAllowedTokenType(tokenType)) {
        return Promise.reject(new Error("NOT_TRIAL_GRANTABLE_TOKEN_TYPE"));
      }
      return requestTrialGrant({ token_type: tokenType });
    },
    onSuccess: (data) => {
      if (data.result === "OK") {
        addToast("체험 티켓 3장 지급 완료! 체험 탭으로 이동합니다.", "success");
        onClaimSuccess?.();
        queryClient.invalidateQueries({ queryKey: ["ui-config", "ticket_zero"] });
        // Auto-switch via URL param or local state if parent controller provided callback. 
        // For now, simpler: we assume the parent re-renders or user sees the new tab.
        // Actually, let's be smarter: dispatch a custom event or use the callback to switch tabs.
        // But TicketZeroPanel props are generic. The user mentioned "User gets annoyed".
        // Let's modify the Parent (RoulettePage) to pass a "onSwitchTab"
        return;
      }
      if (data.balance > 0) {
        addToast("이미 체험 티켓이 남아있어요. 먼저 사용해주세요.", "info");
        onClaimSuccess?.();
        return;
      }
      addToast("이미 오늘 체험 티켓을 수령했어요.", "info");
      onClaimSuccess?.();
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "";
      if (message === "NOT_TRIAL_GRANTABLE_TOKEN_TYPE") {
        addToast("이 티켓은 체험 지급 대상이 아니에요.", "info");
        return;
      }

      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        const detail = (err.response?.data as any)?.detail;
        const detailText = typeof detail === "string" ? detail : "";

        // 백엔드가 '이미 수령'을 4xx로 보내는 케이스가 생겨도 UX가 일관되게 동작하도록 방어.
        if (status === 409 || /already|이미\s*수령|이미\s*지급/i.test(detailText)) {
          addToast("이미 오늘 체험 티켓을 수령했어요.", "info");
          return;
        }

        if (status === 401 || status === 403) {
          addToast("로그인이 필요해요.", "info");
          return;
        }
      }

      addToast("체험 티켓 지급 중 오류가 발생했어요. 잠시 후 다시 시도해주세요.", "error");
    },
  });

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-[clamp(12px,2.6vw,14px)] text-white/85">
      <div className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-cc-orange/60" />
      <div className="pl-2">
        <p className="font-extrabold text-white/90">{config.title}</p>
        <p className="mt-1 text-white/75">{config.body}</p>

        <div className="mt-3 rounded-xl border border-white/12 bg-white/5 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-extrabold text-white/90">금고 미리보기</p>
            <p className="text-sm font-extrabold text-cc-lime">
              {formatWon(vault.data?.vaultBalance ?? 0)}
            </p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <button
            type="button"
            disabled={claimMutation.isPending}
            onClick={() => {
              if (!canRequestTrialGrant) {
                addToast("이 티켓은 체험 지급 대상이 아니에요.", "info");
                return;
              }
              claimMutation.mutate();
            }}
            className="h-9 w-full rounded-lg border border-black/15 bg-cc-lime px-2 text-xs font-extrabold text-black disabled:cursor-not-allowed disabled:bg-cc-lime/40 disabled:text-black/45"
          >
            체험
          </button>
          <a
            href={config.primaryCta.url}
            target="_blank"
            rel="noreferrer"
            className="flex h-9 w-full items-center justify-center rounded-lg border border-white/15 bg-white/8 px-2 text-xs font-extrabold text-white/90 hover:bg-white/12"
          >
            씨씨
          </a>
          <a
            href={config.secondaryCta.url}
            target="_blank"
            rel="noreferrer"
            className="flex h-9 w-full items-center justify-center rounded-lg border border-white/15 bg-white/6 px-2 text-xs font-extrabold text-white/80 hover:bg-white/10"
          >
            실장
          </a>
        </div>
      </div>
    </div>
  );
};

export default TicketZeroPanel;
