import React from 'react';
import { motion } from 'motion/react';
import CountdownTimer from './CountdownTimer';
import ActivityLogItem from './ActivityLogItem';
import StatusBadge from './StatusBadge';
import type { VaultStatus, MissionType } from './VaultCard';

interface ActivityLog {
  type: MissionType;
  description: string;
  value: number;
}

interface ActivityLockVaultProps {
  title: string;
  type: 'gold' | 'platinum' | 'diamond';
  amount: number;
  status: VaultStatus;
  activityLogs: ActivityLog[];
  expiresAt: Date;
  onClick?: () => void;
}

export default function ActivityLockVault({
  title,
  type,
  amount,
  status,
  activityLogs,
  expiresAt,
  onClick
}: ActivityLockVaultProps) {
  // Dark mode gradient backgrounds
  const bgColors = {
    gold: 'from-[#5b8a32] to-[#3c5f1b]',
    platinum: 'from-[#4d7429] to-[#2a4314]',
    diamond: 'from-[#3f5e21] to-[#1f3011]'
  };

  // Glow colors for enhanced premium feel
  const glowColors = {
    gold: 'shadow-[0_0_15px_rgba(169,224,110,0.3)]',
    platinum: 'shadow-[0_0_15px_rgba(149,204,90,0.3)]',
    diamond: 'shadow-[0_0_15px_rgba(129,184,70,0.3)]'
  };

  // Premium vault emoticons
  const vaultEmojis = {
    gold: '💰',
    platinum: '🏆',
    diamond: '💎'
  };

  return (
    <motion.div
      whileHover={{ y: -5, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)' }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={`rounded-2xl overflow-hidden shadow-lg w-full h-full border border-[#3e3e3e] ${glowColors[type]}`}
      onClick={onClick}
    >
      {/* Premium Card Header */}
      <div className={`bg-gradient-to-br ${bgColors[type]} p-7 relative`}>
        {/* Decorative elements for premium feel */}
        <div className="absolute top-0 left-0 w-full h-full opacity-30">
          <div className="absolute top-5 left-5 w-20 h-20 rounded-full bg-[#a9e06e]/20 blur-xl"></div>
          <div className="absolute bottom-5 right-5 w-32 h-32 rounded-full bg-[#a9e06e]/10 blur-xl"></div>
        </div>
        
        {/* Status badge */}
        <StatusBadge status={status} />
        
        <div className="flex justify-between items-start relative z-10">
          <div>
            <h3 className="text-white text-lg font-bold mb-1 flex items-center">
              <span className="mr-2">{title}</span>
              <span className="opacity-90 text-xs bg-black/30 px-2 py-0.5 rounded-full text-[#a9e06e] font-medium">정산 완료</span>
            </h3>
            <div className="flex items-center">
              <span className="text-white text-3xl font-bold">₩{amount.toLocaleString()}</span>
            </div>
          </div>
          
          {/* Premium Vault Icon/Emoji */}
          <div className="relative">
            <div className="h-24 w-24 rounded-full bg-[#2a3d18]/80 flex items-center justify-center backdrop-blur-sm border border-[#a9e06e]/30 shadow-inner">
              <div className="relative flex items-center justify-center">
                <div className="absolute inset-0 text-6xl flex items-center justify-center opacity-20 blur-sm">
                  {vaultEmojis[type]}
                </div>
                <span className="text-5xl relative z-10">{vaultEmojis[type]}</span>
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 h-8 w-8 bg-[#1e1e1e] rounded-full flex items-center justify-center shadow-lg text-[#a9e06e] border border-[#3e3e3e]">
              {type === 'gold' && <span className="text-sm font-bold">G</span>}
              {type === 'platinum' && <span className="text-sm font-bold">P</span>}
              {type === 'diamond' && <span className="text-sm font-bold">D</span>}
            </div>
          </div>
        </div>
        
        <div className="mt-4 relative z-10">
          {status !== 'CLAIMED' && status !== 'EXPIRED' && (
            <CountdownTimer expiresAt={expiresAt} />
          )}
        </div>
      </div>
      
      {/* Card Body with refined styling */}
      <div className="bg-[#1e1e1e] p-6">
        <h4 className="text-white font-bold mb-4 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 mr-2 text-[#a9e06e] opacity-80">
            <path fillRule="evenodd" d="M10.362 1.093a.75.75 0 0 0-.724 0L2.648 5.066a.75.75 0 0 0-.36.636v8.598a.75.75 0 0 0 .36.636l6.99 3.973a.75.75 0 0 0 .724 0l6.99-3.973a.75.75 0 0 0 .36-.636V5.702a.75.75 0 0 0-.36-.636l-6.99-3.973ZM9 13.5a.75.75 0 0 1 .75-.75h.5a.75.75 0 0 1 0 1.5h-.5A.75.75 0 0 1 9 13.5ZM9 10a.75.75 0 0 1 .75-.75h.5a.75.75 0 0 1 0 1.5h-.5A.75.75 0 0 1 9 10Zm-3 3.5a.75.75 0 0 1 .75-.75h.5a.75.75 0 0 1 0 1.5h-.5a.75.75 0 0 1-.75-.75ZM6 10a.75.75 0 0 1 .75-.75h.5a.75.75 0 0 1 0 1.5h-.5A.75.75 0 0 1 6 10Z" clipRule="evenodd" />
          </svg>
          활동 정산 내역
        </h4>
        
        <div className="space-y-4 mb-6">
          {activityLogs.map((log, index) => (
            <ActivityLogItem key={`${type}-activity-${index}`} log={log} />
          ))}
          <div className="pt-2 border-t border-[#2a2a2a] mt-3 flex justify-between items-center text-[#a9e06e] font-bold">
            <span>총 적립액</span>
            <span>₩{amount.toLocaleString()}</span>
          </div>
        </div>
        
        {status === 'UNLOCKED' && (
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full mt-4 bg-gradient-to-r from-[#5b8a32] to-[#3c5f1b] hover:opacity-90 text-white py-3 rounded-xl font-bold transition-all shadow-md focus:ring-2 focus:ring-[#92c95e] focus:ring-offset-2 focus:ring-offset-[#1e1e1e]"
          >
            지금 받기
          </motion.button>
        )}
        
        {status === 'CLAIMED' && (
          <div className="mt-6 text-center text-sm font-medium bg-[#2a3d18] py-3 px-4 rounded-xl text-[#a9e06e]">
            <div className="flex items-center justify-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M16.403 12.652a3 3 0 0 0 0-5.304 3 3 0 0 0-3.75-3.751 3 3 0 0 0-5.305 0 3 3 0 0 0-3.751 3.75 3 3 0 0 0 0 5.305 3 3 0 0 0 3.75 3.751 3 3 0 0 0 5.305 0 3 3 0 0 0 3.751-3.75Zm-2.546-4.46a.75.75 0 0 0-1.214-.883l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
              </svg>
              성공적으로 수령했습니다
            </div>
          </div>
        )}
        
        {status === 'EXPIRED' && (
          <div className="mt-6 text-center text-sm font-medium bg-[#2a2a2a] py-3 px-4 rounded-xl text-gray-500">
            <div className="flex items-center justify-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z" clipRule="evenodd" />
              </svg>
              만료되었습니다
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}