import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useActiveSurveys } from "../../hooks/useSurvey";
import { useToast } from "../common/ToastProvider";

const SurveyPromptBanner: React.FC = () => {
  const { data, isLoading } = useActiveSurveys();
  const { addToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!data || data.length === 0) return;
    const withPending = data.find((s) => s.pending_response_id);
    if (withPending) {
      addToast(`${withPending.title} 설문을 이어서 진행하세요`, "info");
    }
  }, [data, addToast]);

  if (isLoading || !data || data.length === 0) return null;

  const primary = data[0];
  return (
    <div className="rounded-xl border border-amber-500/50 bg-amber-500/10 px-4 py-3 shadow-md shadow-amber-900/30">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-amber-200">Survey</p>
          <p className="text-sm font-semibold text-amber-50">{primary.title}</p>
          {primary.description && <p className="text-xs text-amber-100/90">{primary.description}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => navigate(`/surveys/${primary.id}`)}
            className="rounded-full bg-amber-400 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-amber-300"
          >
            참여하기
          </button>
          <button
            type="button"
            onClick={() => navigate("/surveys")}
            className="rounded-full border border-amber-300 px-3 py-2 text-xs font-semibold text-amber-100 hover:bg-amber-400/20"
          >
            목록 보기
          </button>
        </div>
      </div>
    </div>
  );
};

export default SurveyPromptBanner;
