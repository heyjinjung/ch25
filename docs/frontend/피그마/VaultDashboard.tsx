import React from 'react';
import { motion } from 'motion/react';
import VaultCard from './VaultCard';
import ActivityLockVault from './ActivityLockVault';

interface VaultDashboardProps {
  userName: string;
  activityDate: Date;
  completionBonus: number;
  vaults: {
    gold: any;
    platinum: any;
    diamond: any;
  };
}

export default function VaultDashboard({ 
  userName, 
  activityDate, 
  completionBonus,
  vaults 
}: VaultDashboardProps) {
  // Calculate completed vault count
  const completedCount = [
    vaults.gold.status === 'CLAIMED', 
    vaults.platinum.status === 'CLAIMED',
    vaults.diamond.status === 'CLAIMED'
  ].filter(Boolean).length;
  
  const isEligibleForBonus = completedCount === 3;
  const expiresAt = new Date(activityDate);
  expiresAt.setDate(expiresAt.getDate() + 7);
  
  const remainingDays = Math.max(0, Math.floor((expiresAt.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)));
  
  // Calculate total gold vault amount
  const goldVaultTotal = vaults.gold.activityLogs.reduce((sum, log) => sum + log.value, 0);
  
  // Create platinum expiry date (72 hours from now)
  const platinumExpiresAt = new Date();
  platinumExpiresAt.setHours(platinumExpiresAt.getHours() + vaults.platinum.expiryHours);
  
  return (
    <div className="w-full max-w-6xl mx-auto">
      <header className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
          {userName}님의 활동 금고
        </h1>
        <p className="text-gray-300">
          최근 활동에 따라 <span className="font-semibold text-[#a9e06e]">자동으로 산정된</span> 보상 금액이 금고에 적립되었습니다.
        </p>
      </header>
      
      {/* Bonus Card */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-8 bg-[#1e1e1e] rounded-2xl p-6 text-white shadow-xl border border-[#3e3e3e]"
      >
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-xl font-bold mb-1">XMAS 이벤트 보너스</h2>
            <p className="text-gray-400 text-sm mb-3">
              모든 금고를 해금하면 추가 보너스가 지급됩니다.
            </p>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">₩{completionBonus.toLocaleString()}</span>
              {isEligibleForBonus && (
                <span className="bg-[#2a3d18] text-xs px-3 py-1 rounded-full font-bold text-[#a9e06e] shadow">
                  수령 가능
                </span>
              )}
            </div>
          </div>
          
          <div className="bg-[#2a2a2a] rounded-xl p-3 ml-auto">
            <div className="text-center mb-1">
              <span className="text-sm text-gray-400">달성률</span>
              <div className="text-2xl font-bold text-white">{completedCount}/3</div>
            </div>
            <div className="w-full bg-[#333333] rounded-full h-2">
              <div 
                className="bg-[#92c95e] h-2 rounded-full" 
                style={{ width: `${(completedCount / 3) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
        
        {isEligibleForBonus && (
          <button className="mt-4 w-full rounded-xl bg-gradient-to-r from-[#5b8a32] to-[#3c5f1b] py-3 text-center font-bold text-white transition hover:opacity-90 focus:ring-2 focus:ring-[#92c95e] focus:ring-offset-2 focus:ring-offset-[#1e1e1e]">
            보너스 받기
          </button>
        )}
      </motion.div>
      
      {/* Vault Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <ActivityLockVault
            title="골드 금고"
            type="gold"
            amount={goldVaultTotal}
            status={vaults.gold.status}
            activityLogs={vaults.gold.activityLogs}
            expiresAt={expiresAt}
          />
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <VaultCard
            title="플래티넘 금고"
            type="platinum"
            amount={31000}
            status={vaults.platinum.status}
            missions={vaults.platinum.conditions}
            expiresAt={platinumExpiresAt}
          />
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <VaultCard
            title="다이아 금고"
            type="diamond"
            amount={100000}
            status={vaults.diamond.status}
            missions={[
              {
                id: "diamond-1",
                type: "accumulate",
                description: "30일간 누적 활동 포인트",
                isComplete: vaults.diamond.currentProgress >= 100,
                progress: vaults.diamond.activityPoints,
                target: vaults.diamond.targetPoints
              }
            ]}
            expiresAt={null}
          />
        </motion.div>
      </div>
      
      {/* Help Section */}
      <div className="mt-10 bg-[#1e1e1e] rounded-xl p-6 border border-[#2a2a2a]">
        <h3 className="text-lg font-bold text-white mb-3">
          금고 시스템 안내
        </h3>
        <ul className="space-y-2 text-sm text-gray-300">
          <li className="flex items-start gap-2">
            <span className="text-[#a9e06e] mt-0.5">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
              </svg>
            </span>
            <span><strong className="text-white">골드 금고</strong>는 이미 달성한 활동을 기준으로 자동 계산됩니다.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[#a9e06e] mt-0.5">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
              </svg>
            </span>
            <span><strong className="text-white">플래티넘 금고</strong>는 제한 시간 내에 조건을 충족하지 않으면 소멸됩니다.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[#a9e06e] mt-0.5">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
              </svg>
            </span>
            <span><strong className="text-white">다이아 금고</strong>는 장기간 활동에 따라 점진적으로 채워집니다.</span>
          </li>
        </ul>
      </div>
    </div>
  );
}