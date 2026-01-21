import { useLayoutEffect, useRef } from "react";
import { useV2Vault } from "../../hooks/useV2Vault";
import { motion } from "framer-motion";
import { AlertCircle } from "lucide-react";
import gsap from "gsap";

// 이미지 임포트
import vaultDial from "../../assets/03valut/gsap1.png";
import sparkles from "../../assets/03valut/div2.png";

const VaultPage: React.FC = () => {
  const { useVaultStatus } = useV2Vault();
  const { data: vault, isLoading, error } = useVaultStatus();
  const dialRef = useRef<HTMLImageElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  // 금고 다이얼 회전 + 글로우 애니메이션
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      // 다이얼 느린 회전
      if (dialRef.current) {
        gsap.to(dialRef.current, {
          rotation: 360,
          duration: 25,
          repeat: -1,
          ease: "none",
        });
      }

      // 글로우 펄스 효과
      if (glowRef.current) {
        gsap.to(glowRef.current, {
          opacity: 0.4,
          scale: 1.1,
          duration: 2,
          repeat: -1,
          yoyo: true,
          ease: "power1.inOut",
        });
      }
    });

    return () => ctx.revert();
  }, []);

  if (isLoading) {
    return (
      <div className="relative w-[380px] h-[680px] bg-black mx-auto flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
          <p className="text-white/50 text-sm font-medium">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error || !vault) {
    return (
      <div className="relative w-[380px] h-[680px] bg-black mx-auto flex items-center justify-center px-6">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500/50 mx-auto mb-4" />
          <p className="text-white text-lg font-bold mb-2">오류 발생</p>
          <p className="text-white/40 text-sm">잠시 후 다시 시도해주세요</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-[380px] max-w-[380px] h-[680px] max-h-[680px] overflow-hidden bg-black mx-auto">
      {/* 스크롤바 숨기기 스타일 */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* 고정 배경 레이어 */}
      <div className="absolute inset-0 pointer-events-none">
        {/* 배경 글로우 */}
        <div
          ref={glowRef}
          className="absolute top-[5%] left-1/2 -translate-x-1/2 w-[340px] h-[320px] rounded-full opacity-25 pointer-events-none"
          style={{
            background: "rgba(255, 180, 68, 0.15)",
            filter: "blur(40px)",
          }}
        />

        {/* 스파클 이미지 */}
        <img
          src={sparkles}
          alt=""
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[400px] object-contain opacity-60 pointer-events-none"
          style={{ transform: "translateX(-50%) rotate(180deg)" }}
        />
      </div>

      {/* 스크롤 가능한 콘텐츠 레이어 */}
      <div className="absolute inset-0 overflow-y-auto overflow-x-hidden scrollbar-hide">
        {/* 금고 다이얼 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "backOut" }}
          className="relative z-10 flex justify-center pt-8"
        >
        <img
          ref={dialRef}
          src={vaultDial}
          alt="Vault"
          className="w-[280px] h-[280px] object-contain"
          style={{
            filter: "drop-shadow(0 0 60px rgba(255, 180, 68, 0.4))",
          }}
        />
      </motion.div>

      {/* 타이틀 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="relative z-10 text-center mt-4"
      >
        <h1 className="text-5xl font-black text-white tracking-tight">
          CC금고
        </h1>
        {vault.is_golden_hour_active && (
          <div
            className="inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-full"
            style={{
              background: "#ffe4dd",
              border: "1px solid #ff4210",
            }}
          >
            <span className="text-base">🔥</span>
            <span className="text-sm font-bold" style={{ color: "#ff4210" }}>
              골든타임 {vault.golden_hour_multiplier}x
            </span>
          </div>
        )}
      </motion.div>

      {/* 잔액 카드 */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="relative z-10 mx-4 mt-8"
      >
        <div
          className="rounded-3xl p-6 backdrop-blur-xl"
          style={{
            background:
              "linear-gradient(135deg, rgba(255,180,68,0.15) 0%, rgba(255,140,0,0.08) 100%)",
            border: "1px solid rgba(255,180,68,0.25)",
            boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
          }}
        >
          {/* 총 잔액 */}
          <div className="text-center mb-6">
            <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-2">
              Total Balance
            </p>
            <p
              className="text-4xl font-black"
              style={{
                background:
                  "linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #FF8C00 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              {(vault.vaultBalance || 0).toLocaleString()}
              <span className="text-lg ml-1">CC</span>
            </p>
          </div>

          {/* 상세 잔액 */}
          <div className="grid grid-cols-2 gap-3">
            <div
              className="rounded-2xl p-4 text-center"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-wider mb-1">
                Available
              </p>
              <p className="text-xl font-black text-emerald-400">
                {(vault.availableBalance || 0).toLocaleString()}
              </p>
            </div>
            <div
              className="rounded-2xl p-4 text-center"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-wider mb-1">
                Locked
              </p>
              <p className="text-xl font-black text-orange-400">
                {(vault.lockedBalance || 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 액션 버튼 */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.5 }}
        className="relative z-10 mx-4 mt-6 grid grid-cols-2 gap-3"
      >
        <button
          className="h-14 rounded-2xl font-black text-white transition-all active:scale-95"
          style={{
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.15)",
          }}
        >
          입금하기
        </button>
        <button
          className="h-14 rounded-2xl font-black text-black transition-all active:scale-95"
          style={{
            background:
              "linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #FF8C00 100%)",
            boxShadow: "0 8px 25px rgba(255,165,0,0.35)",
          }}
        >
          출금하기
        </button>
      </motion.div>

      {/* 출금 조건 진행률 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9, duration: 0.5 }}
        className="relative z-10 mx-4 mt-6 pb-6"
      >
        <div
          className="rounded-2xl p-4"
          style={{ background: "rgba(255,255,255,0.03)" }}
        >
          <p className="text-[10px] font-bold text-white/30 uppercase tracking-wider mb-3">
            출금 조건
          </p>
          <div className="space-y-3">
            {/* 플레이 횟수 */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-white/60">게임 플레이</span>
                <span className="text-xs font-bold text-white/80">
                  {vault.daily_play_count || 0}/{vault.daily_play_target || 0}
                </span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(((vault.daily_play_count || 0) / (vault.daily_play_target || 1)) * 100, 100)}%`,
                    background:
                      (vault.daily_play_count || 0) >= (vault.daily_play_target || 1)
                        ? "linear-gradient(90deg, #10b981, #34d399)"
                        : "linear-gradient(90deg, #f59e0b, #fbbf24)",
                  }}
                />
              </div>
            </div>

            {/* 소비 금액 */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-white/60">금고 소비</span>
                <span className="text-xs font-bold text-white/80">
                  {(vault.daily_vault_spent || 0).toLocaleString()}/
                  {(vault.daily_vault_spent_target || 0).toLocaleString()}
                </span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(((vault.daily_vault_spent || 0) / (vault.daily_vault_spent_target || 1)) * 100, 100)}%`,
                    background:
                      (vault.daily_vault_spent || 0) >= (vault.daily_vault_spent_target || 1)
                        ? "linear-gradient(90deg, #10b981, #34d399)"
                        : "linear-gradient(90deg, #f59e0b, #fbbf24)",
                  }}
                />
              </div>
            </div>

            {/* 입금 확인 */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/60">오늘 입금</span>
              <span
                className={`text-xs font-bold ${vault.daily_deposit_confirmed ? "text-emerald-400" : "text-white/30"}`}
              >
                {vault.daily_deposit_confirmed ? "✓ 완료" : "미완료"}
              </span>
            </div>
          </div>
        </div>
      </motion.div>
      </div>
    </div>
  );
};

export default VaultPage;
