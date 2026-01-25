import React from "react";
import { motion } from "framer-motion";
import { Wallet, HelpCircle, Home, Loader2 } from "lucide-react";

interface VaultCTAProps {
  onWithdraw: () => void;
  onGuideClick: () => void;
  onHomeClick: () => void;
  isWithdrawEnabled: boolean;
  isLoading?: boolean;
  className?: string;
}

export const VaultCTA: React.FC<VaultCTAProps> = ({
  onWithdraw,
  onGuideClick,
  onHomeClick,
  isWithdrawEnabled,
  isLoading = false,
  className = "",
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className={`w-full px-4 space-y-3 ${className}`}
    >
      {/* Main withdraw button */}
      <motion.button
        onClick={onWithdraw}
        disabled={!isWithdrawEnabled || isLoading}
        whileHover={isWithdrawEnabled ? { scale: 1.02 } : {}}
        whileTap={isWithdrawEnabled ? { scale: 0.98 } : {}}
        className={`
          relative w-full h-16 rounded-[32px] overflow-hidden
          font-bold text-lg
          transition-all duration-300
          ${
            isWithdrawEnabled
              ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/50"
              : "bg-white/5 text-white/30 cursor-not-allowed"
          }
        `}
      >
        {/* Pulsating glow effect when enabled */}
        {isWithdrawEnabled && !isLoading && (
          <>
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-cyan-400"
              animate={{
                opacity: [0.5, 0.8, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            <motion.div
              className="absolute inset-0"
              animate={{
                boxShadow: [
                  "0 0 20px rgba(16, 185, 129, 0.4)",
                  "0 0 60px rgba(16, 185, 129, 0.8)",
                  "0 0 20px rgba(16, 185, 129, 0.4)",
                ],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </>
        )}

        {/* Button content */}
        <div className="relative z-10 flex items-center justify-center gap-2">
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>처리 중...</span>
            </>
          ) : (
            <>
              <Wallet className="w-5 h-5" />
              <span>
                {isWithdrawEnabled ? "지금 출금하기" : "조건 충족 시 출금 가능"}
              </span>
            </>
          )}
        </div>
      </motion.button>

      {/* Secondary action buttons */}
      <div className="flex gap-3">
        {/* Home button */}
        <motion.button
          onClick={onHomeClick}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex-1 h-12 rounded-[24px] bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-colors flex items-center justify-center gap-2 text-sm font-semibold text-white/70"
        >
          <Home className="w-4 h-4" />
          <span>홈으로</span>
        </motion.button>

        {/* Guide button */}
        <motion.button
          onClick={onGuideClick}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex-1 h-12 rounded-[24px] bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-colors flex items-center justify-center gap-2 text-sm font-semibold text-white/70"
        >
          <HelpCircle className="w-4 h-4" />
          <span>출금 조건</span>
        </motion.button>
      </div>

      {/* Hint text */}
      {!isWithdrawEnabled && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center text-xs text-white/40"
        >
          출금 조건을 확인하고 게임을 즐기세요
        </motion.p>
      )}
    </motion.div>
  );
};
