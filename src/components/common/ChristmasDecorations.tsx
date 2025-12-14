// src/components/common/ChristmasDecorations.tsx
// 크리스마스 아이콘 및 장식 요소 모음
import React from "react";

// 트리 아이콘
export const TreeIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M32 4L8 36H20L10 52H28V60H36V52H54L44 36H56L32 4Z" fill="#22c55e"/>
    <path d="M32 4L20 24H44L32 4Z" fill="#16a34a"/>
    <circle cx="24" cy="32" r="3" fill="#ef4444"/>
    <circle cx="40" cy="40" r="3" fill="#eab308"/>
    <circle cx="32" cy="28" r="2" fill="#3b82f6"/>
    <circle cx="36" cy="44" r="2" fill="#ef4444"/>
    <rect x="28" y="52" width="8" height="8" fill="#92400e"/>
  </svg>
);

// 별 아이콘
export const StarIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M32 4L38 24H58L42 36L48 56L32 44L16 56L22 36L6 24H26L32 4Z" fill="#fbbf24"/>
    <path d="M32 4L36 20H50L38 30L42 46L32 38L22 46L26 30L14 20H28L32 4Z" fill="#fcd34d"/>
  </svg>
);

// 선물 상자 아이콘
export const GiftIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="8" y="24" width="48" height="36" rx="2" fill="#ef4444"/>
    <rect x="8" y="16" width="48" height="12" rx="2" fill="#dc2626"/>
    <rect x="28" y="16" width="8" height="44" fill="#fbbf24"/>
    <path d="M32 16C32 16 24 8 20 12C16 16 24 20 32 16Z" fill="#fbbf24"/>
    <path d="M32 16C32 16 40 8 44 12C48 16 40 20 32 16Z" fill="#fbbf24"/>
  </svg>
);

// 눈사람 아이콘
export const SnowmanIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="32" cy="44" r="16" fill="white"/>
    <circle cx="32" cy="20" r="12" fill="white"/>
    <circle cx="28" cy="18" r="2" fill="#1f2937"/>
    <circle cx="36" cy="18" r="2" fill="#1f2937"/>
    <path d="M32 22L30 26H34L32 22Z" fill="#f97316"/>
    <rect x="20" y="8" width="24" height="4" rx="2" fill="#1f2937"/>
    <rect x="28" y="4" width="8" height="8" rx="1" fill="#1f2937"/>
    <circle cx="32" cy="36" r="2" fill="#1f2937"/>
    <circle cx="32" cy="44" r="2" fill="#1f2937"/>
    <circle cx="32" cy="52" r="2" fill="#1f2937"/>
  </svg>
);

// 지팡이 사탕 아이콘
export const CandyCaneIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M24 56V24C24 16 28 8 40 8C52 8 52 20 52 24" stroke="white" strokeWidth="8" strokeLinecap="round"/>
    <path d="M24 56V24C24 16 28 8 40 8C52 8 52 20 52 24" stroke="#ef4444" strokeWidth="8" strokeLinecap="round" strokeDasharray="8 8"/>
  </svg>
);

// 종 아이콘
export const BellIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M32 8C32 8 36 8 36 12V14C44 16 50 24 50 34V44L54 50H10L14 44V34C14 24 20 16 28 14V12C28 8 32 8 32 8Z" fill="#fbbf24"/>
    <ellipse cx="32" cy="56" rx="6" ry="4" fill="#fbbf24"/>
    <path d="M28 8C28 6 30 4 32 4C34 4 36 6 36 8" stroke="#22c55e" strokeWidth="2"/>
    <circle cx="32" cy="4" r="3" fill="#ef4444"/>
  </svg>
);

// 양말 아이콘
export const StockingIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 4H44V20H20V4Z" fill="white"/>
    <path d="M20 20H44V40L56 52C58 54 58 58 56 60L52 60C50 60 48 58 46 56L36 46H28L20 20Z" fill="#ef4444"/>
    <rect x="20" y="4" width="24" height="8" fill="#22c55e"/>
  </svg>
);

// 리스 아이콘
export const WreathIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="32" cy="32" r="20" stroke="#22c55e" strokeWidth="12"/>
    <circle cx="32" cy="12" r="4" fill="#ef4444"/>
    <circle cx="20" cy="18" r="3" fill="#ef4444"/>
    <circle cx="44" cy="18" r="3" fill="#ef4444"/>
    <circle cx="16" cy="32" r="3" fill="#ef4444"/>
    <circle cx="48" cy="32" r="3" fill="#ef4444"/>
    <path d="M28 8L32 4L36 8L32 6L28 8Z" fill="#fbbf24"/>
    <path d="M26 6H38V10H26V6Z" fill="#ef4444"/>
  </svg>
);

// 크리스마스 장식 배너 컴포넌트
export const ChristmasBanner: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <div className="relative overflow-hidden rounded-2xl border border-emerald-600/40 bg-gradient-to-r from-red-950/40 via-emerald-950/40 to-red-950/40 p-4">
    {/* 상단 장식 */}
    <div className="absolute top-0 left-0 right-0 flex justify-around opacity-60">
      <span className="text-lg">🎄</span>
      <span className="text-lg">⭐</span>
      <span className="text-lg">🎁</span>
      <span className="text-lg">❄️</span>
      <span className="text-lg">🔔</span>
    </div>
    <div className="pt-6">
      {children}
    </div>
  </div>
);

// 크리스마스 카드 래퍼
export const ChristmasCard: React.FC<{ 
  children?: React.ReactNode;
  variant?: "red" | "green" | "gold";
}> = ({ children, variant = "green" }) => {
  const variants = {
    red: "from-red-950/60 to-red-900/40 border-red-600/40",
    green: "from-emerald-950/60 to-emerald-900/40 border-emerald-600/40",
    gold: "from-amber-950/60 to-amber-900/40 border-amber-600/40",
  };

  return (
    <div className={`rounded-2xl border bg-gradient-to-br ${variants[variant]} p-5 shadow-lg relative overflow-hidden`}>
      {/* 코너 장식 */}
      <div className="absolute top-2 right-2 opacity-40">
        <span className="text-2xl">🎄</span>
      </div>
      <div className="absolute bottom-2 left-2 opacity-40">
        <span className="text-xl">❄️</span>
      </div>
      {children}
    </div>
  );
};

export default {
  TreeIcon,
  StarIcon,
  GiftIcon,
  SnowmanIcon,
  CandyCaneIcon,
  BellIcon,
  StockingIcon,
  WreathIcon,
  ChristmasBanner,
  ChristmasCard,
};
