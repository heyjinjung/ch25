import React from 'react';
import { motion } from 'motion/react';
import CountdownTimer from './CountdownTimer';
import EventLogItem from './EventLogItem';

// Tier information for unlock rules
interface UnlockTier {
  deposit: number;
  unlock: number;
  tier: string;
}

// Event in progress_json
interface VaultEvent {
  type: string;
  amount: number;
  at: string;
  trigger?: string;
  meta?: Record<string, any>;
  from?: string;
  to?: string;
  expired_amount?: number;
}

interface ProgressJson {
  events?: VaultEvent[];
  available_since?: string;
  [key: string]: any;
}

interface Phase1VaultProps {
  lockedBalance: number;
  availableBalance: number;
  expiresAt: Date | null;
  state: string; // "LOCKED", "AVAILABLE", "EXPIRED"
  programKey: string;
  progressJson?: ProgressJson;
  unlockTiers: UnlockTier[];
  onVaultAction: () => void;
}

export default function Phase1Vault({
  lockedBalance,
  availableBalance,
  expiresAt,
  state,
  programKey,
  progressJson,
  unlockTiers,
  onVaultAction
}: Phase1VaultProps) {
  const hasLockedBalance = lockedBalance > 0;
  const hasAvailableBalance = availableBalance > 0;
  const totalBalance = lockedBalance + availableBalance;
  
  // Get recommended tier for CTA (highest tier the user could unlock)
  const getRecommendedTier = () => {
    if (!hasLockedBalance) return null;
    
    // Sort tiers by deposit amount (ascending)
    const sortedTiers = [...unlockTiers].sort((a, b) => a.deposit - b.deposit);
    
    // Find the highest tier where unlock amount <= lockedBalance
    for (let i = sortedTiers.length - 1; i >= 0; i--) {
      const tier = sortedTiers[i];
      if (tier.unlock <= lockedBalance) {
        return tier;
      }
    }
    
    // If no tier matches, return the lowest tier
    return sortedTiers[0];
  };
  
  const recommendedTier = getRecommendedTier();
  
  // Calculate main action text
  const getActionText = () => {
    if (state === "EXPIRED") {
      return "이미 만료됨";
    }
    
    if (!hasLockedBalance) {
      return "금고 비어있음";
    }
    
    if (recommendedTier) {
      return `${recommendedTier.deposit.toLocaleString()}원 충전하고 해금하기`;
    }
    
    return "충전하고 해금하기";
  };
  
  // Calculate relevant events to show
  const getRelevantEvents = () => {
    if (!progressJson?.events) return [];
    return progressJson.events.slice(0, 3); // Show only the 3 most recent events
  };
  
  return (
    <div className="grid grid-cols-1 gap-6">
      {/* Main Vault Card */}
      <motion.div
        whileHover={{ y: -5, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)' }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="rounded-2xl overflow-hidden shadow-lg border border-[#3e3e3e] shadow-[0_0_15px_rgba(169,224,110,0.3)] bg-[#1e1e1e]"
      >
        <div className="bg-gradient-to-br from-[#5b8a32] to-[#3c5f1b] p-7 relative">
          {/* Decorative elements */}
          <div className="absolute top-0 left-0 w-full h-full opacity-30">
            <div className="absolute top-5 left-5 w-20 h-20 rounded-full bg-[#a9e06e]/20 blur-xl"></div>
            <div className="absolute bottom-5 right-5 w-32 h-32 rounded-full bg-[#a9e06e]/10 blur-xl"></div>
          </div>
          
          <div className="flex justify-between items-start relative z-10 flex-wrap gap-5">
            <div>
              <h3 className="text-white text-lg font-bold mb-1 flex items-center">
                <span className="mr-2">통합 금고 현황</span>
                <span className="opacity-90 text-xs bg-black/30 px-2 py-0.5 rounded-full text-[#a9e06e] font-medium">Phase 1</span>
              </h3>
              <div className="flex items-center">
                <span className="text-white text-3xl font-bold">₩{totalBalance.toLocaleString()}</span>
              </div>
            </div>
            
            {/* Status Badge */}
            <div className={`px-3 py-1 rounded-full text-xs font-bold ${
              state === "LOCKED" ? "bg-[#2a3d18] text-[#a9e06e] border border-[#5b8a32]" : 
              state === "AVAILABLE" ? "bg-[#2a3d18] text-[#a9e06e] border border-[#5b8a32]" :
              "bg-[#2a2a2a] text-gray-400 border border-[#3e3e3e]"
            }`}>
              {state === "LOCKED" ? "잠김" : 
               state === "AVAILABLE" ? "사용 가능" : 
               "만료됨"}
            </div>
            
            {/* Premium Vault Icon/Emoji */}
            <div className="relative ml-auto">
              <div className="h-24 w-24 rounded-full bg-[#2a3d18]/80 flex items-center justify-center backdrop-blur-sm border border-[#a9e06e]/30 shadow-inner">
                <div className="relative flex items-center justify-center">
                  <div className="absolute inset-0 text-6xl flex items-center justify-center opacity-20 blur-sm">
                    💰
                  </div>
                  <span className="text-5xl relative z-10">💰</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-4 relative z-10">
            {hasLockedBalance && expiresAt && state === "LOCKED" && (
              <CountdownTimer expiresAt={expiresAt} />
            )}
          </div>
        </div>
        
        {/* Card Body */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Locked Balance Section */}
            <div className={`rounded-xl p-5 ${hasLockedBalance ? 'bg-[#2a2a2a]' : 'bg-[#1e1e1e] border border-[#2a2a2a]'}`}>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-white font-bold flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 mr-2 text-[#a9e06e] opacity-80">
                    <path fillRule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z" clipRule="evenodd" />
                  </svg>
                  잠긴 금고
                </h4>
                <div className={`text-xs px-2 py-0.5 rounded-full font-bold ${hasLockedBalance ? 'bg-[#2a3d18]/50 text-[#a9e06e]' : 'bg-[#2a2a2a] text-gray-400'}`}>
                  {hasLockedBalance ? '활성' : '비어있음'}
                </div>
              </div>
              
              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">잠긴 금액:</span>
                  <span className="text-white font-bold text-lg">₩{lockedBalance.toLocaleString()}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">해금 조건:</span>
                  <div className="text-right">
                    {unlockTiers.map((tier, index) => (
                      <div key={index} className="text-[#a9e06e] font-medium text-sm">
                        {tier.deposit.toLocaleString()}원 충전 시 {tier.unlock.toLocaleString()}원 해금
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              {hasLockedBalance && state === "LOCKED" && (
                <button 
                  onClick={onVaultAction}
                  className="w-full mt-4 bg-gradient-to-r from-[#5b8a32] to-[#3c5f1b] hover:opacity-90 text-white py-2 rounded-lg font-bold text-sm transition-all"
                >
                  {getActionText()}
                </button>
              )}
              
              {state === "EXPIRED" && (
                <div className="w-full mt-4 bg-[#2a2a2a] text-gray-400 py-2 rounded-lg font-bold text-sm text-center">
                  만료됨
                </div>
              )}
            </div>
            
            {/* Available Balance Section */}
            <div className={`rounded-xl p-5 ${hasAvailableBalance ? 'bg-[#2a3d18]' : 'bg-[#1e1e1e] border border-[#2a2a2a]'}`}>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-white font-bold flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 mr-2 text-white opacity-80">
                    <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.433a.75.75 0 0 0 0-1.5H3.989a.75.75 0 0 0-.75.75v4.242a.75.75 0 0 0 1.5 0v-2.43l.31.31a7 7 0 0 0 11.712-3.138.75.75 0 0 0-1.449-.39Zm1.23-3.723a.75.75 0 0 0 .219-.53V2.929a.75.75 0 0 0-1.5 0V5.36l-.31-.31A7 7 0 0 0 3.239 8.188a.75.75 0 1 0 1.448.389A5.5 5.5 0 0 1 13.89 6.11l.311.31h-2.432a.75.75 0 0 0 0 1.5h4.243a.75.75 0 0 0 .53-.219Z" clipRule="evenodd" />
                  </svg>
                  사용 가능 금고
                </h4>
                <div className={`text-xs px-2 py-0.5 rounded-full font-bold ${hasAvailableBalance ? 'bg-[#a9e06e]/20 text-white' : 'bg-[#2a2a2a] text-gray-400'}`}>
                  {hasAvailableBalance ? '수령 가능' : '비어있음'}
                </div>
              </div>
              
              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center">
                  <span className={hasAvailableBalance ? "text-gray-200 text-sm" : "text-gray-400 text-sm"}>사용 가능 금액:</span>
                  <span className="text-white font-bold text-lg">₩{availableBalance.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className={hasAvailableBalance ? "text-gray-200 text-sm" : "text-gray-400 text-sm"}>상태:</span>
                  <span className="text-white font-medium text-sm">즉시 수령 가능</span>
                </div>
              </div>
              
              {hasAvailableBalance && (
                <button className="w-full mt-4 bg-white hover:bg-gray-100 text-[#3c5f1b] py-2 rounded-lg font-bold text-sm transition-all">
                  지금 받기
                </button>
              )}
            </div>
          </div>
          
          {/* Activity Log */}
          {progressJson?.events && progressJson.events.length > 0 && (
            <div className="mt-6 bg-[#1e1e1e] border border-[#2a2a2a] rounded-lg p-4">
              <h4 className="text-white text-sm font-bold mb-3 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mr-1 text-[#a9e06e]">
                  <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.433a.75.75 0 0 0 0-1.5H3.989a.75.75 0 0 0-.75.75v4.242a.75.75 0 0 0 1.5 0v-2.43l.31.31a7 7 0 0 0 11.712-3.138.75.75 0 0 0-1.449-.39Zm1.23-3.723a.75.75 0 0 0 .219-.53V2.929a.75.75 0 0 0-1.5 0V5.36l-.31-.31A7 7 0 0 0 3.239 8.188a.75.75 0 1 0 1.448.389A5.5 5.5 0 0 1 13.89 6.11l.311.31h-2.432a.75.75 0 0 0 0 1.5h4.243a.75.75 0 0 0 .53-.219Z" clipRule="evenodd" />
                </svg>
                최근 활동 내역
              </h4>
              <div className="space-y-2">
                {getRelevantEvents().map((event, index) => (
                  <EventLogItem 
                    key={index}
                    event={event}
                  />
                ))}
              </div>
            </div>
          )}
          
          <div className="mt-5 text-center text-gray-400 text-sm">
            <p>금고 해금 및 상금은 계정에 즉시 반영됩니다.</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}