// src/components/layout/V2LiveFeedBar.tsx
import React from "react";

const V2LiveFeedBar: React.FC = () => {
  return (
    <div className="fixed top-[100px] left-0 right-0 z-[49] w-full max-w-[391px] mx-auto h-[32px] px-[14px] py-[6px] flex items-center bg-[#8EF695]/25 text-[#1E1E1E] text-xs overflow-hidden whitespace-nowrap">
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
        <span>?‰ CC25 ? ê·œ ?…ë°?´íŠ¸: ê³ í•´?ë„ V2 ?¸í„°?˜ì´?¤ê? ?ìš©?˜ì—ˆ?µë‹ˆ?? ???ˆë¡œ??ê²Œì„ ë³´ë„ˆ???´ë²¤?¸ë? ?•ì¸?˜ì„¸?? ??ì§€ê¸?ë¯¸ì…˜???„ë£Œ?˜ê³  ?¹ë³„ ?°ì¼“??ë°›ì•„ë³´ì„¸??</span>
      </div>
    </div>
  );
};

export default V2LiveFeedBar;
