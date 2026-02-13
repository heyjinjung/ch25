import React from "react";

const V2LiveFeedBar: React.FC = () => {
  return (
    <div className="fixed top-[var(--header-offset)] left-0 right-0 z-[49] w-full max-w-[391px] mx-auto h-[40px] px-3 flex items-center bg-[#1a1a1e] border-b border-white/10 text-emerald-400/90 text-sm font-medium overflow-hidden whitespace-nowrap">
      <div className="animate-marquee">
        <span className="tracking-tight">✨ 새해 복💰 많이 받으세요! 발렌타인&설 선물 챙기세요! 🎁</span>
      </div>
    </div>
  );
};

export default V2LiveFeedBar;