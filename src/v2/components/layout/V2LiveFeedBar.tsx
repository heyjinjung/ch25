// src/v2/components/layout/V2LiveFeedBar.tsx
import React from "react";

const V2LiveFeedBar: React.FC = () => {
  return (
    <div className="fixed top-[64px] left-0 right-0 z-[49] w-full max-w-[391px] mx-auto h-[32px] px-[14px] py-[6px] flex items-center justify-center bg-[#8EF695]/25 text-[#1E1E1E] text-sm overflow-hidden whitespace-nowrap">
      <span>for example: 새로운 이벤트가 시작되었습니다!</span>
    </div>
  );
};

export default V2LiveFeedBar;
