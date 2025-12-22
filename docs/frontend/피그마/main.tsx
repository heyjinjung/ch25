import React, { useState } from 'react';
import { motion } from 'motion/react';
import { defineProperties } from 'figma:react';
import Phase1Vault from './components/Phase1Vault';
import VaultModal from './components/VaultModal';

export default function VaultApp({ 
  userName = "플레이어123",
  ticketCount = 0
}) {
  const [showVaultModal, setShowVaultModal] = useState(false);
  
  // Mock data for vault status based on Vault 2.0 scaffold structure
  const vaultData = {
    locked_balance: 12400,
    available_balance: 5000,
    expires_at: new Date(Date.now() + 23 * 60 * 60 * 1000), // 23 hours from now
    vault_balance: 12400, // Legacy mirror (read-only) of locked_balance
    state: "LOCKED", // LOCKED, AVAILABLE, or EXPIRED
    program_key: "NEW_MEMBER_VAULT",
    progress_json: {
      events: [
        {
          type: "ACCRUE_LOCKED",
          amount: 10000,
          at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        },
        {
          type: "ACCRUE_LOCKED",
          amount: 2400,
          at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
        }
      ]
    },
    recommended_action: "OPEN_VAULT_MODAL",
    cta_payload: {
      action: "DEPOSIT",
      min_amount: 50000,
      promo_code: "XMAS2025",
      unlock_tier: "B" // Tier B unlocks 10,000
    }
  };
  
  // Example UI copy from app_ui_config
  const uiCopy = {
    title: "금고 시스템 안내",
    description: "활동 기반으로 적립된 보상 금액이 금고에 있습니다. 24시간 내에 해금하지 않으면 소멸됩니다.",
    points: [
      "잠긴 금고는 24시간 내에 해금하지 않으면 자동으로 소멸됩니다.",
      "사용 가능 금고는 해금 조건을 충족하여 즉시 사용 가능한 금액입니다.",
      "단일 5만원 충전 시 잠긴 금고에서 최대 10,000원이 해금됩니다."
    ],
    cta_text: "50,000원 충전하고 해금하기"
  };
  
  const handleVaultAction = () => {
    if (vaultData.recommended_action === "OPEN_VAULT_MODAL") {
      setShowVaultModal(true);
    }
  };
  
  const handleCtaAction = () => {
    // In a real app, this would use the cta_payload to determine action
    console.log("Executing CTA action with payload:", vaultData.cta_payload);
    setShowVaultModal(false);
  };
  
  return (
    <div className="min-h-screen bg-[#121212] p-4 md:p-6 lg:p-8">
      <div className="w-full max-w-6xl mx-auto">
        <header className="flex justify-center mb-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#1e1e1e] shadow-lg rounded-full px-6 py-3 inline-flex items-center border border-[#92c95e]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-[#a9e06e] mr-2">
              <path d="M11.644 1.59a.75.75 0 0 1 .712 0l9.75 5.25a.75.75 0 0 1 0 1.32l-9.75 5.25a.75.75 0 0 1-.712 0l-9.75-5.25a.75.75 0 0 1 0-1.32l9.75-5.25Z" />
              <path d="m3.265 10.602 7.668 4.129a2.25 2.25 0 0 0 2.134 0l7.668-4.13 1.37.739a.75.75 0 0 1 0 1.32l-9.75 5.25a.75.75 0 0 1-.71 0l-9.75-5.25a.75.75 0 0 1 0-1.32l1.37-.738Z" />
              <path d="m10.933 19.231-7.668-4.13-1.37.739a.75.75 0 0 0 0 1.32l9.75 5.25c.221.12.489.12.71 0l9.75-5.25a.75.75 0 0 0 0-1.32l-1.37-.738-7.668 4.13a2.25 2.25 0 0 1-2.134-.001Z" />
            </svg>
            <span className="text-white font-bold">XMAS 이벤트 금고</span>
          </motion.div>
        </header>
        
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
            {userName}님의 활동 금고
          </h1>
          <p className="text-gray-300">
            활동에 따라 <span className="font-semibold text-[#a9e06e]">자동으로 적립된</span> 보상 금액이 금고에 있습니다.
          </p>
        </div>
        
        {/* Phase 1 Vault */}
        <Phase1Vault 
          lockedBalance={vaultData.locked_balance}
          availableBalance={vaultData.available_balance}
          expiresAt={vaultData.expires_at}
          state={vaultData.state}
          programKey={vaultData.program_key}
          progressJson={vaultData.progress_json}
          unlockTiers={[
            { deposit: 10000, unlock: 5000, tier: 'A' },
            { deposit: 50000, unlock: 10000, tier: 'B' }
          ]}
          onVaultAction={handleVaultAction}
        />
        
        {/* Ticket Status (For demonstration of ticket=0 scenario) */}
        {ticketCount === 0 && (
          <div className="mt-8 bg-[#1e1e1e] rounded-xl p-6 border border-[#2a2a2a]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-[#2a2a2a] rounded-full p-2">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-[#a9e06e]">
                    <path fillRule="evenodd" d="M13 3v1.27a.75.75 0 001.5 0V3h2.25A2.25 2.25 0 0119 5.25v2.628a.75.75 0 01-.5.707 1.5 1.5 0 000 2.83c.3.106.5.39.5.707v2.628A2.25 2.25 0 0116.75 17H14.5v-1.27a.75.75 0 00-1.5 0V17H3.25A2.25 2.25 0 011 14.75v-2.628c0-.318.2-.601.5-.707a1.5 1.5 0 000-2.83.75.75 0 01-.5-.707V5.25A2.25 2.25 0 013.25 3H13zm1.5 4.396a.75.75 0 00-1.5 0v1.042a.75.75 0 001.5 0V7.396zm0 4.167a.75.75 0 00-1.5 0v1.041a.75.75 0 001.5 0v-1.041zM6 10.75a.75.75 0 01.75-.75h3.5a.75.75 0 010 1.5h-3.5a.75.75 0 01-.75-.75zm0 2.5a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5h-1.5a.75.75 0 01-.75-.75z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-white font-bold">티켓 부족</h3>
                  <p className="text-gray-400 text-sm">게임을 플레이하려면 티켓이 필요합니다.</p>
                </div>
              </div>
              <button 
                onClick={() => setShowVaultModal(true)}
                className="bg-gradient-to-r from-[#5b8a32] to-[#3c5f1b] text-white px-4 py-2 rounded-lg font-bold text-sm hover:opacity-90 transition-opacity"
              >
                금고 안내 보기
              </button>
            </div>
          </div>
        )}
        
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
              <span><strong className="text-white">잠긴 금고</strong>는 24시간 내에 해금하지 않으면 자동으로 소멸됩니다.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#a9e06e] mt-0.5">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
                </svg>
              </span>
              <span><strong className="text-white">사용 가능 금고</strong>는 해금 조건을 충족하여 즉시 사용 가능한 금액입니다.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#a9e06e] mt-0.5">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
                </svg>
              </span>
              <span>충전 금액에 따라 잠긴 금고가 해금됩니다: <strong className="text-white">1만원</strong> 충전 시 <strong className="text-white">5천원</strong> 해금, <strong className="text-white">5만원</strong> 충전 시 <strong className="text-white">1만원</strong> 해금</span>
            </li>
          </ul>
        </div>
      </div>
      
      {/* Vault Modal */}
      <VaultModal 
        isOpen={showVaultModal}
        onClose={() => setShowVaultModal(false)}
        onAction={handleCtaAction}
        uiCopy={uiCopy}
        ctaPayload={vaultData.cta_payload}
        vaultData={{
          lockedBalance: vaultData.locked_balance,
          availableBalance: vaultData.available_balance,
          expiresAt: vaultData.expires_at,
          state: vaultData.state,
          unlockTiers: [
            { deposit: 10000, unlock: 5000, tier: 'A' },
            { deposit: 50000, unlock: 10000, tier: 'B' }
          ]
        }}
      />
    </div>
  );
}

defineProperties(VaultApp, {
  userName: {
    label: "사용자 이름",
    type: "string",
    defaultValue: "플레이어123"
  },
  ticketCount: {
    label: "티켓 수량",
    type: "number",
    defaultValue: 0
  }
});