import React from 'react';
import { motion } from 'motion/react';
import type { VaultStatus } from './VaultCard';

interface StatusBadgeProps {
  status: VaultStatus;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  let bgColor = 'bg-[#1e1e1e]';
  let textColor = 'text-[#a9e06e]';
  let text = '보관 중';
  let borderColor = 'border-[#3e3e3e]';
  
  if (status === 'UNLOCKED') {
    bgColor = 'bg-[#2a3d18]';
    textColor = 'text-[#a9e06e]';
    text = '해금됨';
    borderColor = 'border-[#5b8a32]';
  } else if (status === 'CLAIMED') {
    bgColor = 'bg-[#2a3d18]';
    textColor = 'text-[#a9e06e]';
    text = '수령 완료';
    borderColor = 'border-[#5b8a32]';
  } else if (status === 'EXPIRED') {
    bgColor = 'bg-[#2a2a2a]';
    textColor = 'text-gray-400';
    text = '만료됨';
    borderColor = 'border-[#3e3e3e]';
  }
  
  return (
    <motion.div 
      className={`absolute top-3 right-3 ${bgColor} ${textColor} text-xs px-3 py-1 rounded-full font-bold shadow-md border ${borderColor}`}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.1 }}
    >
      {text}
    </motion.div>
  );
}