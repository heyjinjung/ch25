import React, { useState } from "react";
import { MessageSquare, Send, Users } from "lucide-react";
import { useToast } from "../../../components/common/ToastProvider";
import { OpsLogCategory } from "../../api/opsLogKeys";
import { useCreateOpsLogEntry } from "../../hooks/useOpsLog";
import { findPiiHits } from "../../utils/piiGuard";

export type OpsLogSurveyDmPanelProps = {
  date: string;
};

const OpsLogSurveyDmPanel: React.FC<OpsLogSurveyDmPanelProps> = ({ date }) => {
  const { addToast } = useToast();
  const createMutation = useCreateOpsLogEntry(date);

  const [targetGroup, setTargetGroup] = useState("ALL_ACTIVE");
  const [message, setMessage] = useState("");

  const handleSubmit = async () => {
    if (!message.trim()) {
      addToast("메시지 내용을 입력해주세요.", "error");
      return;
    }

    const piiHits = findPiiHits(message);
    if (piiHits.length > 0) {
      addToast(`PII 의심 패턴 감지(${piiHits[0].type}): 기록차단`, "error");
      return;
    }

    try {
      await createMutation.mutateAsync({
        payload: {
          date,
          category: OpsLogCategory.CS,
          action_code: "CS_DM_SENT",
          target_model: "USER",
          target_id: targetGroup,
          meta_data: {
            message: message.trim(),
            target_group: targetGroup,
            type: "SURVEY_DM"
          },
          ref_id: `DM-${date}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`
        }
      });
      addToast("DM 발송 로그가 기록되었습니다.", "success");
      setMessage("");
    } catch (err: any) {
      addToast("로그 기록 실패: " + err.message, "error");
    }
  };

  return (
    <div className="admin-card-premium p-6 flex flex-col gap-6">
      <div className="flex items-center gap-2 border-b border-admin-border pb-4">
        <div className="p-2 rounded-lg bg-admin-brand/20 text-admin-brand border border-admin-brand/30">
          <MessageSquare className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-admin-subtitle text-admin-text-primary">설문/DM 로거</h3>
          <p className="text-xs text-admin-text-secondary">설문조사 및 공지 DM 발송 기록</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-1">
          <label className="text-xs font-bold text-admin-text-secondary uppercase tracking-wider flex items-center gap-2">
            <Users className="h-3 w-3" /> 대상 그룹
          </label>
          <select
            id="ops-log-survey-dm-target-group"
            value={targetGroup}
            onChange={(e) => setTargetGroup(e.target.value)}
            className="admin-input w-full"
            aria-label="대상 그룹"
            title="대상 그룹"
          >
            <option value="ALL_ACTIVE">전체 활성 사용자</option>
            <option value="VIP_ONLY">VIP 전용</option>
            <option value="NEW_USERS">신규 사용자 (최근 7일)</option>
            <option value="CHURN_RISK">이탈 위험 세그먼트</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-admin-text-secondary uppercase tracking-wider">
            메시지 내용
          </label>
          <textarea
            id="ops-log-survey-dm-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="발송할 메시지 내용 입력..."
            className="admin-input w-full h-32 resize-none"
            aria-label="메시지 내용"
            title="메시지 내용"
          />
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={handleSubmit}
            disabled={createMutation.isPending || !message.trim()}
            className="btn-admin-primary flex items-center gap-2"
          >
            <Send className="h-4 w-4" />
            <span>설문/DM 로그 기록</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default OpsLogSurveyDmPanel;
