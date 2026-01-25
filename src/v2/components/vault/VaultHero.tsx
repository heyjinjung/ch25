import React from "react";
import { motion } from "framer-motion";
import { NumberTicker } from "../ui/NumberTicker";
import { TrendingUp } from "lucide-react";

interface VaultHeroProps {
  vaultBalance: number;
  todayEarnings: number;
  goalAmount?: number;
}

export const VaultHero: React.FC<VaultHeroProps> = ({
  vaultBalance,
  todayEarnings,
  goalAmount = 100000,
}) => {
  return (
    <div className="relative flex flex-col items-center justify-center py-8">
      {/* Hero Vault Image */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative mb-6"
      >
        {/* Glowing ring effect */}
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-400/30 to-emerald-500/30 blur-2xl"
        />
        
        {/* Vault image */}
        <motion.img
          src="/assets/vault/vault_closed.webp"
          alt="금고"
          className="relative w-64 h-64 object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
          animate={{
            rotateY: [0, 5, -5, 0],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Today earnings badge */}
        {todayEarnings > 0 && (
          <motion.div
            initial={{ scale: 0, y: -20 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
            className="absolute -top-2 -right-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/50"
          >
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-white" />
              <span className="text-xs font-bold text-white">
                오늘 +₩{todayEarnings.toLocaleString()}
              </span>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Amount display */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.6 }}
        className="flex flex-col items-center gap-2"
      >
        <p className="text-sm font-medium text-white/40">내 금고 잔액</p>
        
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-white via-cyan-100 to-cyan-400 mb-2">
            ₩
          </span>
          <NumberTicker
            value={vaultBalance}
            className="text-6xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white via-cyan-100 to-cyan-400 drop-shadow-lg"
          />
        </div>

        {/* Goal indicator */}
        <p className="text-sm font-medium text-white/50">
          목표 ₩{goalAmount.toLocaleString()}
        </p>
      </motion.div>

      {/* Motivational message */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-4 text-center text-sm text-white/60 max-w-xs"
      >
        이용할수록 <span className="text-emerald-400 font-semibold">더 쌓입니다</span>
      </motion.p>
    </div>
  );
};
