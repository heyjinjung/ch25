// src/components/vault/V2WithdrawalGuideModal.tsx
import React from "react";
import { X, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { WithdrawalRulesChecklist } from "./WithdrawalRulesChecklist";
import { VaultStatusResponse } from "../../api/vaultApi";

interface V2WithdrawalGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  vaultData: VaultStatusResponse;
}

const V2WithdrawalGuideModal: React.FC<V2WithdrawalGuideModalProps> = ({
  isOpen,
  onClose,
  vaultData,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-[340px] bg-[#1a1c1e] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl"
          >
            {/* Header / Accent */}
            <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-[#25AD82]/20 to-transparent pointer-events-none" />
            
            <div className="relative pt-8 pb-4 px-6">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-white/40 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>

              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-[#25AD82]/10 border border-[#25AD82]/20 flex items-center justify-center shadow-[0_0_20px_rgba(37,173,130,0.2)]">
                  <ShieldCheck size={28} className="text-[#25AD82]" />
                </div>
                <h2 className="text-xl font-bold text-white text-center">
                  출금 ?�비???�내
                </h2>
                <p className="text-sm text-white/40 text-center leading-relaxed">
                  금고 ?�액???�전?�게 출금?�기 ?�해<br />
                  ?�음??조건??먼�? ?�성??주세??
                </p>
              </div>
            </div>

            {/* Checklist Content */}
            <div className="px-5 pb-8">
              <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 overflow-y-auto max-h-[400px]">
                <WithdrawalRulesChecklist
                  vaultBalance={vaultData.vaultBalance}
                  playCount={vaultData.daily_play_count}
                  playTarget={vaultData.daily_play_target}
                  spendAmount={vaultData.daily_vault_spent}
                  spendTarget={vaultData.daily_vault_spent_target}
                  depositConfirmed={vaultData.daily_deposit_confirmed}
                />
              </div>
            </div>
            
            {/* Footer Tip */}
            <div className="px-6 py-4 bg-white/[0.02] border-t border-white/5 flex items-center justify-center gap-2">
                <span className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Secure Withdrawal System</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default V2WithdrawalGuideModal;
