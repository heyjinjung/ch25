import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Modal from "../common/Modal";
import { getTicket0ResolutionCopy } from "../../api/uiCopyApi";

type Props = {
  open: boolean;
  onClose: () => void;
};

const DEFAULT_COPY = {
  title: "티켓이 0이에요",
  body: "체험 티켓을 받거나, 외부 충전 확인 후 금고 잠금이 해금됩니다.",
  primary_cta_label: "씨씨카지노 바로가기",
  secondary_cta_label: "실장 텔레 문의",
};

const PRIMARY_URL = "https://ccc-010.com";
const SECONDARY_URL = "https://t.me/jm956";

const VaultModal: React.FC<Props> = ({ open, onClose }) => {
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

  return (
    <Modal title={copy.title} open={open} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-slate-200/90">{copy.body}</p>

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
