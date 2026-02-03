import React from "react";

const V2LiveFeedBar: React.FC = () => {
  return (
    <div className="fixed top-[var(--header-offset)] left-0 right-0 z-[49] w-full max-w-[391px] mx-auto h-[40px] px-3 flex items-center bg-[#1a1a1e] border-b border-white/10 text-emerald-400/90 text-sm font-medium overflow-hidden whitespace-nowrap">
      <div className="animate-marquee">
        <span className="tracking-tight">✨ 지민코드 2월 업데이트 완료! 혜택맛집 오픈! 특별미션이 오빠를 기다려요. 지금 참여하고 모든 혜택을 싹쓸이하세요! 🎁</span>
      </div>
    </div>
  );
};

export default V2LiveFeedBar;