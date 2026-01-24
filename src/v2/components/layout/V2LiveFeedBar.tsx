import React from "react";

const V2LiveFeedBar: React.FC = () => {
  return (
    <div className="fixed top-[var(--header-offset)] left-0 right-0 z-[49] w-full max-w-[391px] mx-auto h-[40px] px-3 flex items-center bg-[#1a1a1e] border-b border-white/10 text-emerald-400/90 text-sm font-medium overflow-hidden whitespace-nowrap">
      <div className="animate-marquee">
        <span className="tracking-tight">🚀 CC25 업데이트: 고해상도 V2 인터페이스가 적용되었습니다. 💎 게임 보너스 이벤트를 확인하세요! ✨ 미션을 완료하고 특별 티켓을 받아보세요!</span>
      </div>
    </div>
  );
};

export default V2LiveFeedBar;