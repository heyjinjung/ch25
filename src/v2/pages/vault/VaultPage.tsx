import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useV2Vault } from "../../hooks/useV2Vault";
import { useSound } from "../../../hooks/useSound";
import confetti from "canvas-confetti";
import { BackgroundBeamsWithCollision } from "../../components/effects/BackgroundBeamsWithCollision";
import { VaultHero } from "../../components/vault/VaultHero";
import { VaultProgress } from "../../components/vault/VaultProgress";
import { VaultStats } from "../../components/vault/VaultStats";
import { VaultCTA } from "../../components/vault/VaultCTA";
import V2WithdrawalGuideModal from "../../components/vault/V2WithdrawalGuideModal";
import "./VaultRedesign.css";

// const WITHDRAWAL_GOAL = 100000; // Deprecated: Now dynamic from backend

const VaultPage: React.FC = () => {
  const navigate = useNavigate();
  const { useVaultStatus, useWithdraw } = useV2Vault();
  const { playVaultJingle } = useSound();
  const { data: vault, isLoading, error } = useVaultStatus();
  const withdrawMutation = useWithdraw();
  const [showGuideModal, setShowGuideModal] = useState(false);
  const todayEarnings = vault?.today_earnings || 0;
  const withdrawalGoal = vault?.minimum_withdrawal_amount || 100000;

  useEffect(() => {
    if (vault) {
      playVaultJingle();

      // Celebrate if withdrawal is available
      // SoT: vaultBalance = vault_locked_balance (availableBalance is deprecated/0)
      if (vault.eligible && vault.vaultBalance >= withdrawalGoal) {
        setTimeout(() => {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ["#10b981", "#6ee7b7", "#34d399"],
          });
        }, 500);
      }
    }
  }, [vault, playVaultJingle, withdrawalGoal]);

  const handleWithdraw = async () => {
    if (!vault || !vault.eligible) {
      setShowGuideModal(true);
      return;
    }

    if (window.confirm("출금 신청하시겠습니까?")) {
      try {
        // SoT: vaultBalance = vault_locked_balance (availableBalance is deprecated/0)
        await withdrawMutation.mutateAsync({ amount: vault.vaultBalance });

        // Success celebration
        confetti({
          particleCount: 200,
          spread: 100,
          origin: { y: 0.5 },
          colors: ["#10b981", "#6ee7b7", "#34d399", "#059669"],
        });

        alert("출금 신청이 완료되었습니다!");
      } catch (error) {
        console.error("Withdrawal error:", error);
        alert("출금 신청 중 오류가 발생했습니다. 다시 시도해주세요.");
      }
    }
  };

  const handleHomeClick = () => {
    navigate("/v2/home");
  };

  if (isLoading) {
    return (
      <div className="vault-page-container">
        <div className="flex h-full items-center justify-center">
          <div className="w-12 h-12 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !vault) {
    return (
      <div className="vault-page-container">
        <div className="flex h-full items-center justify-center px-6 text-center">
          <p className="text-white/40">
            오류가 발생했습니다. 잠시 후 다시 시도해주세요.
          </p>
        </div>
      </div>
    );
  }

  const vaultBalance = vault.vaultBalance || 0;
  const isEligible =
    vault.eligible &&
    vaultBalance >= (vault.minimum_withdrawal_amount || 100000);

  return (
    <div className="vault-page-container">
      <BackgroundBeamsWithCollision>
        {/* Aurora background for depth */}
        <div className="vault-aurora-bg">
          <div className="vault-aurora-blob blob-1" />
          <div className="vault-aurora-blob blob-2" />
          <div className="vault-aurora-blob blob-3" />
        </div>

        {/* Main content */}
        <div className="vault-content-wrapper">
          {/* Hero section with vault and amount */}
          <VaultHero
            vaultBalance={vaultBalance}
            todayEarnings={todayEarnings}
            goalAmount={withdrawalGoal}
          />

          {/* Progress section */}
          <VaultProgress
            currentAmount={vaultBalance}
            withdrawalCount={vault.withdrawal_count || 0}
            className="mb-4"
          />

          {/* Stats section */}
          <VaultStats userRank={10} averageComparison={15} className="mb-6" />

          {/* CTA section */}
          <VaultCTA
            onWithdraw={handleWithdraw}
            onGuideClick={() => setShowGuideModal(true)}
            onHomeClick={handleHomeClick}
            isWithdrawEnabled={isEligible}
            isLoading={withdrawMutation.isPending}
            className="mt-auto pb-6"
          />
        </div>
      </BackgroundBeamsWithCollision>

      {/* Withdrawal guide modal */}
      <V2WithdrawalGuideModal
        isOpen={showGuideModal}
        onClose={() => setShowGuideModal(false)}
        vaultData={vault}
      />
    </div>
  );
};

export default VaultPage;
