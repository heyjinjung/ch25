import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import CountdownTimer from './CountdownTimer';

interface CtaPayload {
  action: string;
  min_amount?: number;
  promo_code?: string;
  unlock_tier?: string;
}

interface UiCopy {
  title: string;
  description: string;
  points: string[];
  cta_text: string;
}

interface UnlockTier {
  deposit: number;
  unlock: number;
  tier: string;
}

interface VaultData {
  lockedBalance: number;
  availableBalance: number;
  expiresAt: Date;
  state?: string;
  unlockTiers?: UnlockTier[];
}

interface VaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAction: () => void;
  uiCopy: UiCopy;
  ctaPayload: CtaPayload;
  vaultData: VaultData;
}

export default function VaultModal({
  isOpen,
  onClose,
  onAction,
  uiCopy,
  ctaPayload,
  vaultData
}: VaultModalProps) {
  if (!isOpen) return null;

  // Get the recommended tier information
  const getRecommendedTier = () => {
    if (!vaultData.unlockTiers || !ctaPayload.unlock_tier) {
      return { deposit: ctaPayload.min_amount || 50000, unlock: 10000 };
    }
    
    const matchedTier = vaultData.unlockTiers.find(tier => tier.tier === ctaPayload.unlock_tier);
    if (matchedTier) {
      return { deposit: matchedTier.deposit, unlock: matchedTier.unlock };
    }
    
    return { deposit: ctaPayload.min_amount || 50000, unlock: 10000 };
  };

  const tierInfo = getRecommendedTier();
  
  // Calculate unlock amount (min of locked balance and tier unlock amount)
  const unlockAmount = Math.min(vaultData.lockedBalance, tierInfo.unlock);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#1e1e1e] rounded-2xl max-w-lg w-full mx-auto overflow-hidden border border-[#3e3e3e] shadow-xl">
              {/* Header */}
              <div className="bg-gradient-to-r from-[#5b8a32] to-[#3c5f1b] p-6 relative">
                {/* Close Button */}
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 text-white/80 hover:text-white"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                  </svg>
                </button>
                
                <h2 className="text-xl font-bold text-white mb-3">{uiCopy.title}</h2>
                <p className="text-white/80 text-sm">{uiCopy.description}</p>
                
                {/* Vault Balance Summary */}
                <div className="mt-4 bg-black/20 rounded-lg p-3 backdrop-blur-sm border border-white/10">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-white/90 text-sm">잠긴 금고:</span>
                    <span className="text-white font-bold">₩{vaultData.lockedBalance.toLocaleString()}</span>
                  </div>
                  
                  {vaultData.availableBalance > 0 && (
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-white/90 text-sm">사용 가능:</span>
                      <span className="text-white font-bold">₩{vaultData.availableBalance.toLocaleString()}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center">
                    {vaultData.expiresAt && vaultData.state !== 'EXPIRED' && (
                      <CountdownTimer expiresAt={vaultData.expiresAt} />
                    )}
                    <span className="text-xs text-white/60 bg-black/30 px-2 py-0.5 rounded-full">24시간 제한</span>
                  </div>
                </div>
              </div>
              
              {/* Content */}
              <div className="p-6">
                <ul className="space-y-3 text-sm text-gray-300 mb-6">
                  {uiCopy.points.map((point, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-[#a9e06e] mt-0.5">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                          <path fillRule="evenodd" d="M16.403 12.652a3 3 0 0 0 0-5.304 3 3 0 0 0-3.75-3.751 3 3 0 0 0-5.305 0 3 3 0 0 0-3.751 3.75 3 3 0 0 0 0 5.305 3 3 0 0 0 3.75 3.751 3 3 0 0 0 5.305 0 3 3 0 0 0 3.751-3.75Zm-2.546-4.46a.75.75 0 0 0-1.214-.883l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
                        </svg>
                      </span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
                
                {/* Unlock Promo */}
                <div className="bg-[#2a3d18]/30 rounded-xl p-4 border border-[#5b8a32]/30 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="bg-[#3c5f1b] rounded-full p-2.5 shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-[#a9e06e]">
                        <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-[#a9e06e] font-bold">해금 조건</h4>
                      <p className="text-gray-300 text-sm">
                        단일 {tierInfo.deposit.toLocaleString()}원 충전 시 {unlockAmount.toLocaleString()}원이 해금됩니다.
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* CTA Buttons */}
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={onAction}
                    className="bg-gradient-to-r from-[#5b8a32] to-[#3c5f1b] text-white py-3 rounded-xl font-bold transition-all hover:opacity-90"
                  >
                    {uiCopy.cta_text}
                  </button>
                  
                  <button 
                    onClick={onClose}
                    className="bg-[#2a2a2a] text-gray-300 py-3 rounded-xl font-medium transition-all hover:bg-[#333333]"
                  >
                    나중에 하기
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}