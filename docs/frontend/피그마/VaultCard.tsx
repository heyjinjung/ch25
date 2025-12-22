import React from 'react';
import { motion } from 'motion/react';
import CountdownTimer from './CountdownTimer';
import MissionItem from './MissionItem';
import StatusBadge from './StatusBadge';

export type VaultStatus = 'LOCKED' | 'UNLOCKED' | 'CLAIMED' | 'EXPIRED';
export type MissionType = 'channel' | 'attendance' | 'deposit' | 'accumulate' | 'teamBattle' | 'roulette' | 'seasonPass';

export interface Mission {
  id?: string;
  type: MissionType;
  description: string;
  isComplete: boolean;
  progress?: number;
  target?: number;
}

interface VaultCardProps {
  title: string;
  type: 'gold' | 'platinum' | 'diamond';
  amount: number;
  status: VaultStatus;
  missions: Mission[];
  expiresAt: Date | null;
  onClick?: () => void;
}

export default function VaultCard({
  title,
  type,
  amount,
  status,
  missions,
  expiresAt,
  onClick
}: VaultCardProps) {
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
  
  // Custom title for Diamond Vault
  const headerTitle = type === 'diamond' ? 
    <div className="flex flex-col">
      <span className="mr-2">{title}</span>
      <span className="text-xs text-gray-300 font-normal">30일 활동 기준</span>
    </div> : 
    <span className="mr-2">{title}</span>;

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
              {headerTitle}
              <span className="opacity-90 text-xs bg-black/30 px-2 py-0.5 rounded-full text-[#a9e06e] font-medium">
                {type === 'diamond' ? 'Long-term' : 'Premium'}
              </span>
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
          {expiresAt && status !== 'CLAIMED' && status !== 'EXPIRED' && (
            <CountdownTimer expiresAt={expiresAt} />
          )}
          {!expiresAt && type === 'diamond' && (
            <div className="inline-flex items-center text-gray-300 text-sm font-medium">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mr-1">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
              <span>활동 지속 시 적립 증가</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Card Body with refined styling */}
      <div className="bg-[#1e1e1e] p-6">
        <h4 className="text-white font-bold mb-4 flex items-center">
          {type === 'platinum' ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 mr-2 text-[#a9e06e] opacity-80">
                <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
              </svg>
              해금 조건
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 mr-2 text-[#a9e06e] opacity-80">
                <path fillRule="evenodd" d="M10.362 1.093a.75.75 0 0 0-.724 0L2.648 5.066a.75.75 0 0 0-.36.636v8.598a.75.75 0 0 0 .36.636l6.99 3.973a.75.75 0 0 0 .724 0l6.99-3.973a.75.75 0 0 0 .36-.636V5.702a.75.75 0 0 0-.36-.636l-6.99-3.973ZM9 13.5a.75.75 0 0 1 .75-.75h.5a.75.75 0 0 1 0 1.5h-.5A.75.75 0 0 1 9 13.5ZM9 10a.75.75 0 0 1 .75-.75h.5a.75.75 0 0 1 0 1.5h-.5A.75.75 0 0 1 9 10Zm-3 3.5a.75.75 0 0 1 .75-.75h.5a.75.75 0 0 1 0 1.5h-.5a.75.75 0 0 1-.75-.75ZM6 10a.75.75 0 0 1 .75-.75h.5a.75.75 0 0 1 0 1.5h-.5A.75.75 0 0 1 6 10Z" clipRule="evenodd" />
              </svg>
              진행 상황
            </>
          )}
        </h4>
        
        <div className="space-y-4 mb-6">
          {missions.map((mission, index) => (
            <MissionItem key={mission.id || `${type}-mission-${index}`} mission={mission} />
          ))}
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
        
        {status === 'LOCKED' && type === 'platinum' && (
          <div className="mt-6 text-center text-sm font-medium bg-[#2a2a2a] py-3 px-4 rounded-xl text-gray-300">
            <div className="flex items-center justify-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="#a9e06e" className="w-5 h-5">
                <path fillRule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z" clipRule="evenodd" />
              </svg>
              조건 달성 시 해금됩니다
            </div>
          </div>
        )}
        
        {status === 'LOCKED' && type === 'diamond' && (
          <div className="mt-6 text-center text-sm font-medium bg-[#2a2a2a] py-3 px-4 rounded-xl text-gray-300">
            <div className="flex items-center justify-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="#a9e06e" className="w-5 h-5">
                <path d="M15.98 1.804a1 1 0 00-1.96 0l-.24 1.192a1 1 0 01-.784.785l-1.192.238a1 1 0 000 1.962l1.192.238a1 1 0 01.785.785l.238 1.192a1 1 0 001.962 0l.238-1.192a1 1 0 01.785-.785l1.192-.238a1 1 0 000-1.962l-1.192-.238a1 1 0 01-.785-.785l-.238-1.192zM6.949 5.684a1 1 0 00-1.898 0l-.683 2.051a1 1 0 01-.633.633l-2.051.683a1 1 0 000 1.898l2.051.684a1 1 0 01.633.632l.683 2.051a1 1 0 001.898 0l.683-2.051a1 1 0 01.633-.633l2.051-.683a1 1 0 000-1.898l-2.051-.683a1 1 0 01-.633-.633L6.95 5.684z" />
                <path d="M13.949 13.684a1 1 0 00-1.898 0l-.184.551a1 1 0 01-.632.633l-.551.183a1 1 0 000 1.898l.551.183a1 1 0 01.633.633l.183.551a1 1 0 001.898 0l.184-.551a1 1 0 01.632-.633l.551-.183a1 1 0 000-1.898l-.551-.184a1 1 0 01-.633-.632l-.183-.551z" />
              </svg>
              지속적인 활동으로 성장합니다
            </div>
          </div>
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