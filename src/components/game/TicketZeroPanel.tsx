import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { GameTokenType } from "../../types/gameTokens";
import { getUiConfig } from "../../api/uiConfigApi";
import { requestTrialGrant } from "../../api/trialGrantApi";
import { useToast } from "../common/ToastProvider";

type Props = {
  tokenType: GameTokenType;
  onClaimSuccess?: () => void;
};

const DEFAULT_COPY = {
  title: "티켓이 부족합니다",
  body: "오늘은 체험 티켓 1장으로 바로 시작할 수 있어요.",
  cta_label: "충전 문의",
  cta_url: "",
};

const TicketZeroPanel: React.FC<Props> = ({ tokenType, onClaimSuccess }) => {
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const ui = useQuery({
    queryKey: ["ui-config", "ticket_zero"],
    queryFn: () => getUiConfig("ticket_zero"),
    staleTime: 0,
  });

  const config = useMemo(() => {
    const value = ui.data?.value ?? null;
    const title = typeof value?.title === "string" ? value.title : DEFAULT_COPY.title;
    const body = typeof value?.body === "string" ? value.body : DEFAULT_COPY.body;
    const ctaLabel = typeof value?.cta_label === "string" ? value.cta_label : DEFAULT_COPY.cta_label;
    const ctaUrl = typeof value?.cta_url === "string" ? value.cta_url : DEFAULT_COPY.cta_url;
    return { title, body, ctaLabel, ctaUrl };
  }, [ui.data?.value]);

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
          {config.ctaUrl ? (
            <a
              href={config.ctaUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl border border-white/15 bg-white/8 px-4 py-2 text-sm font-bold text-white/90 hover:bg-white/12"
            >
              {config.ctaLabel}
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default TicketZeroPanel;
