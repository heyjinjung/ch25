// src/components/guide/GuideFloatingButton.tsx
import React from "react";
import { HelpCircle } from "lucide-react";
import { useGuide } from "../../contexts/GuideContext";
import { tryHaptic } from "../../utils/haptics";

const GuideFloatingButton: React.FC = () => {
  const { startGuide, isGuideRunning } = useGuide();
  const dismissKey = "guide_floating_button_dismissed";
  const [isDismissed, setIsDismissed] = React.useState(() => sessionStorage.getItem(dismissKey) === "1");

  if (isGuideRunning || isDismissed) return null;

  return (
    <button
      onClick={() => {
        tryHaptic(10);
        startGuide();
      }}
      className="fixed bottom-[calc(80px+env(safe-area-inset-bottom))] right-4 z-[9998] lg:bottom-6
        relative flex items-center gap-2 rounded-full px-4 py-3
        bg-white/10 hover:bg-white/20 text-white text-sm font-black
        border border-white/20 shadow-lg shadow-black/30 backdrop-blur-md
        transition-all active:scale-95"
      aria-label="사용법 가이드 시작"
    >
      <HelpCircle className="w-5 h-5" />
      <span className="hidden sm:inline">처음이세요?</span>
      <span className="sm:hidden">?</span>

      <span
        role="button"
        tabIndex={0}
        aria-label="가이드 버튼 닫기"
        onClick={(e) => {
          e.stopPropagation();
          sessionStorage.setItem(dismissKey, "1");
          setIsDismissed(true);
        }}
        onKeyDown={(e) => {
          if (e.key !== "Enter" && e.key !== " ") return;
          e.preventDefault();
          e.stopPropagation();
          sessionStorage.setItem(dismissKey, "1");
          setIsDismissed(true);
        }}
        className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full
          bg-black/30 hover:bg-black/40 border border-white/20 text-white/90 text-xs font-black"
      >
        ×
      </span>
    </button>
  );
};

export default GuideFloatingButton;
