// src/v2/pages/vault/VaultPage.tsx
import { useLayoutEffect, useRef } from "react";
import { useV2Vault } from "../../hooks/useV2Vault";
import gsap from "gsap";
import "./VaultRedesign.css";

const ASSET_PATH = "/v2/assets/05valut";

const VaultPage: React.FC = () => {
  const { useVaultStatus } = useV2Vault();
  const { data: vault, isLoading, error } = useVaultStatus();
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!vault) return;
    const ctx = gsap.context(() => {
      // Any additional animations can go here
    });
    return () => ctx.revert();
  }, [vault]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-black">
        <div className="w-10 h-10 border-2 border-[#9AFFFA] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !vault) {
    return (
      <div className="flex h-full items-center justify-center bg-black px-6 text-center">
        <p className="text-white/40">오류가 발생했습니다. 잠시 후 다시 시도해주세요.</p>
      </div>
    );
  }

  const progressPercent = Math.min(((vault.daily_play_count || 0) / (vault.daily_play_target || 1)) * 100, 100);

  return (
    <div className="vault-redesign-container" ref={containerRef}>
      <img src={`${ASSET_PATH}/valut (1).svg`} className="vault-bg-overlay" alt="" />

      {/* Tiered Safes Display */}
      <div className="vault-safes-arena mt-8">
        <div className="vault-safe-item lv1">
          <img src={`${ASSET_PATH}/Frame 7.png`} className="vault-safe-img" alt="Lv.1 Safe" />
          <span className="vault-label">LV.1</span>
        </div>
        <div className="vault-safe-item lv5">
          <img src={`${ASSET_PATH}/Frame 5.png`} className="vault-safe-img" alt="Lv.5 Safe" />
          <span className="vault-label">LV.5</span>
        </div>
        <div className="vault-safe-item vip">
          <img src={`${ASSET_PATH}/Frame 6.png`} className="vault-safe-img" alt="VIP Safe" />
          <span className="vault-label underline">VIP</span>
        </div>
      </div>

      {/* Progress Section */}
      <div className="vault-progress-section">
        <span className="section-title">valut progress</span>
        
        <div className="vault-progress-card">
          <img src={`${ASSET_PATH}/Button Icon.png`} className="card-header-icon" alt="status" />
          <div className="card-content">
            <div className="progress-labels">
               <span>{vault.daily_play_count?.toLocaleString() || 0}원 / 10,000원</span>
            </div>
            <div className="custom-progress-bar-container">
              <div 
                className="custom-progress-fill" 
                style={{ width: `${progressPercent}%` }} 
              />
            </div>
          </div>
          <img src={`${ASSET_PATH}/Chevron Icon.svg`} className="chevron-icon" alt="more" />
        </div>
      </div>

      {/* Action Footer */}
      <div className="vault-action-footer">
        <img src={`${ASSET_PATH}/Frame 16.png`} className="casino-logo" alt="CC CASINO" />
        <button className="vault-action-button">BUTTON</button>
      </div>
    </div>
  );
};

export default VaultPage;
