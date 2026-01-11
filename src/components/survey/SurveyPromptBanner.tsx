import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useActiveSurveys } from "../../hooks/useSurvey";
import { X } from "lucide-react";

const SurveyPromptBanner: React.FC = () => {
  const { data, isLoading } = useActiveSurveys();
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);

  const surveys = data || [];

  // Find the most relevant survey (pending first, then any active)
  const primary = useMemo(() => {
    if (surveys.length === 0) return null;
    return surveys.find((s) => s.pending_response_id) || surveys[0];
  }, [surveys]);

  useEffect(() => {
    if (!primary) return;

    // Check if user dismissed this survey in this session
    const storageKey = `survey_dismissed_session_${primary.id}`;
    const dismissed = sessionStorage.getItem(storageKey);

    if (!dismissed) {
      // Small delay for better UX
      const timer = setTimeout(() => setIsVisible(true), 500);
      return () => clearTimeout(timer);
    }
  }, [primary]);

  const handleDismiss = () => {
    if (!primary) return;
    setIsVisible(false);
    sessionStorage.setItem(`survey_dismissed_session_${primary.id}`, "true");
  };

  const handleParticipate = () => {
    if (!primary) return;
    setIsVisible(false);
    navigate(`/surveys/${primary.id}`);
  };

  if (isLoading || !primary || !isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-[#91F402]/30 bg-[#111111] p-0 shadow-2xl shadow-[#91F402]/10 zoom-in-95 duration-300">

        {/* Header Image or Gradient */}
        <div className="relative h-32 w-full bg-gradient-to-br from-[#1A1A1A] to-[#0A0A0A]">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-4xl">📝</div>
          </div>
          <button
            onClick={handleDismiss}
            className="absolute right-3 top-3 rounded-full bg-black/40 p-1 text-gray-400 hover:text-white backdrop-blur-md"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-5 text-center">
          <h3 className="mb-2 text-xl font-bold text-white">
            {primary.title}
          </h3>
          <p className="mb-6 text-sm text-gray-400 leading-relaxed">
            {primary.description || "잠깐! 설문에 참여하고 보상을 받아가세요."}
            <br />
            <span className="text-[#91F402] text-xs mt-1 block">
              (소요시간: 약 1분)
            </span>
          </p>

          <div className="flex flex-col gap-3">
            <button
              onClick={handleParticipate}
              className="w-full rounded-xl bg-[#91F402] py-3.5 text-sm font-bold text-black hover:bg-[#7ED302] active:scale-[0.98] transition-all"
            >
              지금 참여하기
            </button>
            <button
              onClick={handleDismiss}
              className="w-full rounded-xl bg-[#1A1A1A] py-3.5 text-sm font-medium text-gray-400 hover:bg-[#222222] hover:text-white transition-all"
            >
              다음에 하기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SurveyPromptBanner;
