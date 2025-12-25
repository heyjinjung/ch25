import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Modal from "../common/Modal";
import { getTicket0ResolutionCopy } from "../../api/uiCopyApi";
import { parseVaultUnlockRules } from "../../utils/vaultUtils";

type Props = {
  open: boolean;
  onClose: () => void;
  ctaPayload?: Record<string, unknown> | null;
  unlockRulesJson?: Record<string, unknown> | null;
};

const DEFAULT_COPY = {
  title: "티켓이 0이에요 (모두 소진)",
  body: "체험 티켓을 모두 사용하셨네요. 10레벨만 달성해도 Diamond Key를 확정 지급합니다!",
  primary_cta_label: "씨씨카지노 바로가기",
  secondary_cta_label: "실장 텔레 문의",
};

const PRIMARY_URL = "https://ccc-010.com";
const SECONDARY_URL = "https://t.me/jm956";

const VaultModal: React.FC<Props> = ({ open, onClose, ctaPayload, unlockRulesJson }) => {
  const copyQuery = useQuery({
    queryKey: ["ui-copy", "ticket0"],
    queryFn: getTicket0ResolutionCopy,
    enabled: open,
    staleTime: 0,
    retry: false,
  });

  const copy = useMemo(() => {
    const data = copyQuery.data;
    if (!data) return DEFAULT_COPY;
    return {
      title: typeof data.title === "string" && data.title ? data.title : DEFAULT_COPY.title,
      body: typeof data.body === "string" && data.body ? data.body : DEFAULT_COPY.body,
      primary_cta_label:
        typeof data.primary_cta_label === "string" && data.primary_cta_label
          ? data.primary_cta_label
          : DEFAULT_COPY.primary_cta_label,
      secondary_cta_label:
        typeof data.secondary_cta_label === "string" && data.secondary_cta_label
          ? data.secondary_cta_label
          : DEFAULT_COPY.secondary_cta_label,
    };
  }, [copyQuery.data]);

  const rules = useMemo(() => parseVaultUnlockRules(unlockRulesJson), [unlockRulesJson]);
  const isTicketZero = ctaPayload?.reason === "TICKET_ZERO";

  return (
    <Modal title={copy.title} open={open} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-slate-200/90 whitespace-pre-wrap">{copy.body}</p>

        {isTicketZero && (
          <div className="rounded-xl bg-secondary-400/10 p-3 border border-secondary-400/20">
            <p className="text-sm font-bold text-secondary-200 text-center">
              🔥 10레벨 달성 시 Diamond Key 확정!
            </p>
          </div>
        )}

        {rules.length > 0 && (
          <div className="rounded-xl bg-black/30 p-3 text-xs md:text-sm text-white/70 space-y-1">
            <p className="font-bold text-white/90 mb-2">[해금 조건 안내]</p>
            {rules.map((r, i) => <p key={i}>- {r}</p>)}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <a
            href={PRIMARY_URL}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-black/15 bg-cc-lime px-4 py-2 text-sm font-extrabold text-black"
          >
            {copy.primary_cta_label}
          </a>
          <a
            href={SECONDARY_URL}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-white/15 bg-white/8 px-4 py-2 text-sm font-extrabold text-white/90 hover:bg-white/12"
          >
            {copy.secondary_cta_label}
          </a>
        </div>

        {copyQuery.isError ? (
          <p className="text-xs text-white/55">안내 문구를 불러오지 못해 기본 문구로 표시 중입니다.</p>
        ) : null}
      </div>
    </Modal>
  );
};

export default VaultModal;
