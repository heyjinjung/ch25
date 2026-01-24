import React, { useState } from "react";
import {
  AlertTriangle,
  Send,
  Users,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";

import { adminApi } from "../../api/httpClient";

interface RiskMonitorCardProps {
  riskCount?: number;
}

const RiskMonitorCard: React.FC<RiskMonitorCardProps> = ({ riskCount = 0 }) => {
  const [isNudged, setIsNudged] = useState(false);

  // Nudge Mutation (Send Telegram/Push to At-Risk Users)
  const nudgeMutation = useMutation({
    mutationFn: async () => {
      // API call to trigger retention messages
      const { data } = await adminApi.post("/admin/api/crm/messages", {
        title: "?�별 ?�택 ?�내",
        content: "?�원?�을 ?�한 ?�별???�물???�착?�습?�다. 지�?즉시 ?�인?�세??",
        target_type: "SEGMENT",
        target_value: "CHURN_RISK",
        channels: ["TELEGRAM", "INBOX"],
      });
      return data;
    },
    onSuccess: () => {
      setIsNudged(true);
      setTimeout(() => setIsNudged(false), 5000);
    },
  });

  return (
    <div className="admin-card p-6 border-admin-danger/20 hover:border-admin-danger/40 transition-all duration-300">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-admin-danger/10 text-admin-danger animate-pulse">
            <AlertTriangle size={24} />
          </div>
          <div>
            <h3 className="text-admin-subtitle text-admin-text-primary">
              이탈 위험 관리
            </h3>
            <p className="text-admin-meta text-admin-text-muted">
              Retention Risk Monitor
            </p>
          </div>
        </div>
        <div className="px-3 py-1 rounded-full bg-admin-danger/20 border border-admin-danger/30">
          <span className="text-[10px] font-black text-admin-danger uppercase tracking-tighter">
            Live Alert
          </span>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-end gap-2">
          <span className="text-[42px] font-black leading-none text-admin-text-primary tracking-tighter">
            {riskCount}
          </span>
          <span className="text-admin-body font-bold text-admin-text-muted mb-1.5 underline decoration-admin-danger/40 underline-offset-4">
            명 감지됨
          </span>
        </div>

        <div className="p-4 rounded-xl bg-admin-sidebar/50 border border-admin-border">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-admin-meta font-bold text-admin-text-secondary">
              <Users size={14} />
              대상 그룹: 이탈 위험 (High)
            </div>
            <span className="text-[10px] text-admin-text-muted">
              72h 미접??기�?
            </span>
          </div>
          <p className="text-admin-meta text-admin-text-muted leading-relaxed">
            해당 회원은 최근 활동이 급격히 감소했습니다. 즉각적인 리텐션 액션을
            권장합니다.
          </p>
        </div>

        <button
          onClick={() => nudgeMutation.mutate()}
          disabled={nudgeMutation.isPending || isNudged}
          className={`
            w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all duration-300 active:scale-[0.98]
            ${
              isNudged
                ? "bg-admin-accent/20 text-admin-accent border border-admin-accent/30 cursor-default"
                : "bg-admin-danger text-admin-bg hover:brightness-110 shadow-admin-glow"
            }
          `}
        >
          {nudgeMutation.isPending ? (
            <Loader2 size={18} className="animate-spin" />
          ) : isNudged ? (
            <>
              <CheckCircle2 size={18} />
              ?��? 발송 ?�료
            </>
          ) : (
            <>
              <Send size={18} />
              즉시 ?��? 발송 (Nudge Now)
            </>
          )}
        </button>

        {isNudged && (
          <p className="text-center text-[10px] text-admin-accent font-bold animate-in fade-in slide-in-from-top-2">
            방금 ?�레그램 �??�박?�로 ?�별 ?�퍼가 발송?�었?�니??
          </p>
        )}
      </div>
    </div>
  );
};

export default RiskMonitorCard;
