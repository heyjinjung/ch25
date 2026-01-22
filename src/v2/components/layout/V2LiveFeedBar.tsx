// src/v2/components/layout/V2LiveFeedBar.tsx
import React from "react";

const V2LiveFeedBar: React.FC = () => {
  return (
    <div className="fixed top-[128px] left-0 right-0 z-[49] w-full max-w-[391px] mx-auto h-[32px] px-[14px] py-[6px] flex items-center bg-[#8EF695]/25 text-[#1E1E1E] text-xs overflow-hidden whitespace-nowrap">
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .live-feed-marquee {
          display: inline-block;
          animation: marquee 15s linear infinite;
          padding-left: 100%;
        }
      `}</style>
      <div className="live-feed-marquee">
        <span>🎉 CC25 신규 업데이트: 고해상도 V2 인터페이스가 적용되었습니다! • 새로운 게임 보너스 이벤트를 확인하세요! • 지금 미션을 완료하고 특별 티켓을 받아보세요!</span>
      </div>
    </div>
  );
};

export default V2LiveFeedBar;
