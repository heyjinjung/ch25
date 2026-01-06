import React from "react";
import { useQuery } from "@tanstack/react-query";
import { getUiConfig } from "../../api/uiConfigApi";
import { ExternalLink, MessageCircle } from "lucide-react";

interface TicketZeroPanelProps {
  tokenType: string;
  onClaimSuccess?: () => void;
}

const TicketZeroPanel: React.FC<TicketZeroPanelProps> = ({ tokenType }) => {
  const { data: configData, isLoading } = useQuery({
    queryKey: ["ui-config", "ticket_zero"],
    queryFn: () => getUiConfig("ticket_zero"),
  });

  if (isLoading) return null;

  const value = (configData?.value as any) || {};
  const title = value.title || `${tokenType}가 부족해요`;
  const body = value.body || "이용해 주셔서 감사합니다. 지금 이용하시면 바로 이어서 플레이 가능합니다.";

  const primaryLabel = value.primaryCta?.label || value.primary_cta_label || "씨씨 홈";
  const primaryUrl = value.primaryCta?.url || value.primary_cta_url || "https://ccc-010.com";

  const secondaryLabel = value.secondaryCta?.label || value.secondary_cta_label || "실장 텔레 문의";
  const secondaryUrl = value.secondaryCta?.url || value.secondary_cta_url || "https://t.me/jm956";

  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 backdrop-blur-sm">
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h4 className="text-sm font-bold text-amber-400">{title}</h4>
            <p className="mt-1 text-xs leading-relaxed text-amber-200/70 whitespace-pre-wrap">
              {body}
            </p>
          </div>
          <div className="shrink-0 rounded-full bg-amber-500/10 p-2">
            <img src="/assets/asset_ticket_zero.png" alt="Zero" className="h-6 w-6" onError={(e) => (e.currentTarget.style.display = 'none')} />
          </div>
        </div>

        <div className="flex gap-2">
          <a
            href={primaryUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-amber-500 py-2 text-xs font-bold text-black transition-all hover:bg-amber-400 active:scale-95"
          >
            <ExternalLink size={12} />
            {primaryLabel}
          </a>
          <a
            href={secondaryUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 py-2 text-xs font-bold text-white transition-all hover:bg-white/10 active:scale-95"
          >
            <MessageCircle size={12} />
            {secondaryLabel}
          </a>
        </div>
      </div>
    </div>
  );
};

export default TicketZeroPanel;
