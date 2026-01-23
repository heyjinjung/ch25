// src/v2/pages/vault/VaultPage.tsx
import { useLayoutEffect, useRef, useState } from "react";
import { useV2Vault } from "../../hooks/useV2Vault";
import { useSound } from "../../../hooks/useSound";
import gsap from "gsap";
import "./VaultRedesign.css";
import V2WithdrawalGuideModal from "../../components/vault/V2WithdrawalGuideModal";

const ASSET_PATH = "/v2/assets/05valut";

const VaultPage: React.FC = () => {
  const { useVaultStatus, useWithdraw } = useV2Vault();
  const { playVaultJingle } = useSound();
  const { data: vault, isLoading, error } = useVaultStatus();
  const withdrawMutation = useWithdraw();
  const containerRef = useRef<HTMLDivElement>(null);
  const progressFillRef = useRef<HTMLDivElement>(null);
  const auroraRef = useRef<HTMLDivElement>(null);
  const [showGuideModal, setShowGuideModal] = useState(false);

  useLayoutEffect(() => {
    if (!vault) return;
    playVaultJingle();
    const percent = Math.min(((vault.vaultBalance || 0) / 10000) * 100, 100);
    if (progressFillRef.current) {
      progressFillRef.current.style.width = `${percent}%`;
    }
    if (!containerRef.current || !auroraRef.current) return;

    const ctx = gsap.context(() => {
      gsap.to(containerRef.current, {
        "--aurora-1": "#1a6e50",
        "--aurora-2": "#158a62",
        "--aurora-3": "#125c48",
        duration: 10,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });

      gsap.to(".vault-aurora-blob", {
        x: -24,
        y: 20,
        duration: 13,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        stagger: 0.7,
      });
    }, containerRef);
    return () => ctx.revert();
  }, [vault]);

  const handleWithdraw = () => {
    if (window.confirm("출금을 신청하시겠습니까?")) {
      withdrawMutation.mutate({ amount: vault?.availableBalance || 0 });
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[760px] w-[390px] mx-auto items-center justify-center bg-black">
        <div className="w-10 h-10 border-2 border-[#9AFFFA] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !vault) {
    return (
      <div className="flex h-[760px] w-[390px] mx-auto items-center justify-center bg-black px-6 text-center">
        <p className="text-white/40">
          오류가 발생했습니다. 잠시 후 다시 시도해주세요.
        </p>
      </div>
    );
  }

  return (
    <div className="vault-redesign-container" ref={containerRef}>
      <div className="vault-aurora-bg" ref={auroraRef}>
        <div className="vault-aurora-blob blob-1" />
        <div className="vault-aurora-blob blob-2" />
        <div className="vault-aurora-blob blob-3" />
      </div>
      <img
        src={`${ASSET_PATH}/valut (1).svg`}
        className="vault-bg-overlay"
        alt=""
      />

      <div className="vault-main-area">
        {/* Tiered Safes Display */}
        <div className="vault-safes-arena">
          <div className="vault-safe-item lv1">
            <img
              src={`${ASSET_PATH}/Frame 7.png`}
              className="vault-safe-img"
              alt="Lv.1 Safe"
            />
            <span className="vault-label">LV.1</span>
          </div>
          <div className="vault-safe-item lv5">
            <img
              src={`${ASSET_PATH}/Frame 6.png`}
              className="vault-safe-img"
              alt="Lv.5 Safe"
            />
            <span className="vault-label">LV.5</span>
          </div>
          <div className="vault-safe-item vip">
            <img
              src={`${ASSET_PATH}/Frame 5.png`}
              className="vault-safe-img"
              alt="VIP Safe"
            />
            <span className="vault-label underline">VIP</span>
          </div>
        </div>

        {/* Progress Section */}
        <div className="vault-progress-section">
          <span className="section-title">valut progress</span>
          <div className="vault-progress-card">
            <img
              src={`${ASSET_PATH}/Button Icon.png`}
              className="card-header-icon"
              alt="status"
            />
            <div className="card-content">
              <div className="progress-labels">
                <span className="text-[12px] opacity-80">
                  {vault.vaultBalance?.toLocaleString() || 0}원 / 10,000원
                </span>
              </div>
              <div className="custom-progress-bar-container">
                <div className="custom-progress-fill" ref={progressFillRef} />
              </div>
            </div>
            <img
              src={`${ASSET_PATH}/Chevron Icon.svg`}
              className="chevron-icon"
              alt="more"
            />
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="vault-action-footer">
        <div className="footer-top-row">
          <a href="/v2/home" className="vault-footer-btn vault-home-link">
            <img
              src={`${ASSET_PATH}/Frame 16.png`}
              className="casino-logo"
              alt="CC CASINO"
            />
          </a>
          <button
            className="vault-footer-btn vault-guide-button"
            onClick={() => setShowGuideModal(true)}
          >
            출금안내 조건
          </button>
        </div>
        <button
          className="vault-footer-btn vault-withdraw-main-btn"
          onClick={handleWithdraw}
          disabled={withdrawMutation.isPending}
        >
          {withdrawMutation.isPending ? "처리중..." : "금고 출금하기"}
        </button>
      </div>

      <V2WithdrawalGuideModal
        isOpen={showGuideModal}
        onClose={() => setShowGuideModal(false)}
        vaultData={vault}
      />
    </div>
  );
};

export default VaultPage;
