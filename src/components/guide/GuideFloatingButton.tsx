// src/components/guide/GuideFloatingButton.tsx
import React from "react";
import { HelpCircle } from "lucide-react";
import { useGuide } from "../../contexts/GuideContext";
import { tryHaptic } from "../../utils/haptics";

const GuideFloatingButton: React.FC = () => {
  const { startGuide, isGuideRunning } = useGuide();

  if (isGuideRunning) return null;

  return (
    <button
      onClick={() => {
        tryHaptic(10);
        startGuide();
      }}
      className="fixed bottom-[calc(80px+env(safe-area-inset-bottom))] right-4 z-[9998] lg:bottom-6
        flex items-center gap-2 bg-emerald-600/90 hover:bg-emerald-500 
        text-white text-sm font-black px-4 py-3 rounded-full
        shadow-lg shadow-emerald-900/40 backdrop-blur-sm
        transition-all active:scale-95 border border-emerald-400/30"
      aria-label="사용법 가이드 시작"
    >
      <HelpCircle className="w-5 h-5" />
      <span className="hidden sm:inline">처음이세요?</span>
      <span className="sm:hidden">?</span>
    </button>
  );
};

export default GuideFloatingButton;
