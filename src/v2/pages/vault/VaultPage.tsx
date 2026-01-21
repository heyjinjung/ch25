import React from "react";
import { useV2Vault } from "../../hooks/useV2Vault";
import { VaultBalanceCard } from "../../components/vault/VaultBalanceCard";
import { WithdrawalRulesChecklist } from "../../components/vault/WithdrawalRulesChecklist";
import { motion } from "framer-motion";
import { Crown, AlertCircle, ArrowUpRight, TrendingUp } from "lucide-react";
import { Button } from "../../components/ui/button";

const VaultPage: React.FC = () => {
  const { useVaultStatus } = useV2Vault();
  const { data: vault, isLoading, error } = useVaultStatus();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
        <p className="mt-4 text-white/40 text-sm font-medium">자산을 불러오는 중...</p>
      </div>
    );
  }

  if (error || !vault) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-8 text-center">
        <AlertCircle className="w-16 h-16 text-red-500/50 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">데이터를 불러올 수 없습니다</h2>
        <p className="text-white/40 text-sm">잠시 후 다시 시도해주세요.</p>
      </div>
    );
  }

  const isVip = vault.segment === "VIP";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-md mx-auto px-4 py-6 pb-24 space-y-6"
    >
      {/* Premium Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
            <TrendingUp className="w-5 h-5 text-orange-400" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">금고 센터</h1>
        </div>
        {isVip && (
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-yellow-400/20 to-orange-500/20 border border-yellow-400/30">
            <Crown className="w-4 h-4 text-yellow-400" />
            <span className="text-[10px] font-bold text-yellow-400 tracking-tighter uppercase">VIP Only Benefits</span>
          </div>
        )}
      </div>

      {/* Main Balance Card */}
      <VaultBalanceCard
        balance={vault.vaultBalance}
        available={vault.availableBalance}
        reserved={vault.lockedBalance - vault.availableBalance}
      />

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button className="h-14 rounded-2xl bg-white/5 border-white/10 hover:bg-white/10 transition-all font-black text-white flex gap-2">
          입금하기 <ArrowUpRight className="w-4 h-4 opacity-50" />
        </Button>
        <Button 
          className="h-14 rounded-2xl border-0 shadow-[0_8px_20px_rgba(196,30,58,0.3)] font-black text-white"
          style={{
            background: "linear-gradient(135deg, #D4AF37 0%, #C41E3A 100%)"
          }}
        >
          출금신청
        </Button>
      </div>

      {/* Eligibility Checklist */}
      <div className="bg-white/5 rounded-3xl p-6 border border-white/10">
        <WithdrawalRulesChecklist
          vaultBalance={vault.availableBalance}
          playCount={vault.daily_play_count}
          playTarget={vault.daily_play_target}
          spendAmount={vault.daily_vault_spent}
          spendTarget={vault.daily_vault_spent_target}
          depositConfirmed={vault.daily_deposit_confirmed}
        />
      </div>

    </motion.div>
  );
};

export default VaultPage;
