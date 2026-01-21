import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { getV2LotteryStatus, playV2Lottery } from "../../api/v1CompatAdapter";
import LotteryCard from "../../components/game/LotteryCard";
import LotteryCollectionModal from "../../components/lottery/LotteryCollectionModal";
import { ThemeProvider, useTheme } from "../../contexts/ThemeContext";
import { triggerHaptic, triggerNotification } from "../../utils/haptic";
import PremiumParticles from "../../components/effects/PremiumParticles";

// ============================================================================
// Prize Interface
// ============================================================================

interface Prize {
  id: number;
  label: string;
  reward_type: string;
  reward_amount: string | number;
}

// ============================================================================
// Lottery Page Content (with Theme)
// ============================================================================

const LotteryPageContent = () => {
  const { theme } = useTheme();
  const [isScratching, setIsScratching] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [revealedPrize, setRevealedPrize] = useState<Prize | null>(null);
  const [collectionModalOpen, setCollectionModalOpen] = useState(false);

  const queryClient = useQueryClient();

  // ============================================================================
  // API Queries
  // ============================================================================

  const { data, isLoading, isError } = useQuery({
    queryKey: ["v2-lottery-status"],
    queryFn: () => getV2LotteryStatus(),
    refetchOnWindowFocus: true,
    staleTime: 10000,
  });

  const playMutation = useMutation({
    mutationFn: () => playV2Lottery(),
    onError: (error) => {
      console.error("[LotteryPage] Play failed:", error);
      triggerNotification("error");
    },
  });

  // ============================================================================
  // Play Handler
  // ============================================================================

  const handleScratch = async () => {
    if (isScratching || isRevealed || !data || data.token_balance <= 0) return;

    try {
      triggerHaptic("heavy");
      setIsScratching(true);

      const result = await playMutation.mutateAsync();
      console.log("[LotteryPage] Play result:", result);

      // Scratch animation duration
      setTimeout(() => {
        setIsScratching(false);
        setIsRevealed(true);

        const prize = result.game_data?.prize;
        if (prize) {
          setRevealedPrize({
            id: prize.id,
            label: prize.label,
            reward_type: prize.reward_type,
            reward_amount: prize.reward_amount,
          });

          // Trigger effects based on reward
          if (prize.reward_type !== "NONE") {
            triggerNotification("success");
            confetti({
              particleCount: theme.animations.particleCount,
              spread: 70,
              origin: { y: 0.6 },
              colors: [theme.colors.win, theme.colors.accent],
            });
          } else {
            triggerHaptic("light");
          }
        }

        // Refresh data
        queryClient.invalidateQueries({ queryKey: ["v2-lottery-status"] });
      }, 2000);
    } catch (err) {
      console.error("[LotteryPage] Play error:", err);
      setIsScratching(false);
    }
  };

  const handleReset = () => {
    setIsRevealed(false);
    setRevealedPrize(null);
  };

  // ============================================================================
  // Render States
  // ============================================================================

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#30FF75] border-t-transparent" />
          <p className="text-sm font-semibold text-white/80">
            복권 정보를 불러오는 중...
          </p>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex h-screen items-center justify-center bg-black p-4">
        <div className="rounded-3xl border border-white/15 bg-white/5 p-6 text-center backdrop-blur max-w-md">
          <p className="text-xl font-bold text-white">
            데이터를 불러오지 못했습니다
          </p>
          <p className="mt-2 text-sm text-white/60">
            잠시 후 다시 시도하거나 운영자에게 문의하세요.
          </p>
        </div>
      </div>
    );
  }

  const collection = {
    C1: data.collectionProgress?.C1 ?? 0,
    C2: data.collectionProgress?.C2 ?? 0,
    J: data.collectionProgress?.J ?? 0,
    M: data.collectionProgress?.M ?? 0,
  };

  const canCraft =
    collection.C1 >= 1 &&
    collection.C2 >= 1 &&
    collection.J >= 1 &&
    collection.M >= 1;
  const isOutOfTokens = data.token_balance <= 0;
  const canPlay =
    !isScratching && !playMutation.isPending && !isOutOfTokens && !isRevealed;

  return (
    <div
      className="min-h-screen text-white overflow-hidden relative"
      style={{
        background: theme.assets.background
          ? `linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.9)), url(${theme.assets.background})`
          : theme.colors.background,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Background Particles */}
      {theme.assets.particleType !== "default" && (
        <PremiumParticles
          type={theme.assets.particleType === "sparkle" ? "gold" : "diamond"}
          intensity={10}
        />
      )}

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-black text-white tracking-tight mb-2">
            {theme.name} 복권
          </h1>
          <p className="text-sm text-white/60">
            프리미엄 복권을 긁어 보상을 받으세요!
          </p>
        </div>

        {/* Stats Bar */}
        <div className="mb-6 flex items-center gap-4">
          <div className="flex items-center gap-3 rounded-2xl bg-black/50 border border-white/15 px-5 py-3 backdrop-blur flex-1">
            <img
              src="/assets/lottery/icon_lotto_ball.png"
              alt="Lotto Ball"
              className="w-8 h-8 object-contain"
            />
            <div className="flex flex-col leading-none">
              <span className="text-xs font-black uppercase tracking-widest text-white/70">
                복권 티켓
              </span>
              <span className="font-mono text-xl font-bold text-white">
                {data.token_balance.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Collection Button */}
          <button
            onClick={() => setCollectionModalOpen(true)}
            className="relative flex items-center gap-2 rounded-2xl bg-black/50 border border-white/15 px-4 py-3 hover:bg-black/70 transition-colors backdrop-blur"
          >
            <span className="text-sm font-bold text-white/80">컬렉션</span>

            {/* Notification Badge */}
            {canCraft && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span
                  className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                  style={{ backgroundColor: theme.colors.accent }}
                />
                <span
                  className="relative inline-flex rounded-full h-3 w-3"
                  style={{ backgroundColor: theme.colors.accent }}
                />
              </span>
            )}
          </button>
        </div>

        {/* Main Game Area */}
        <div className="mb-6">
          <LotteryCard
            prize={revealedPrize ?? undefined}
            isRevealed={isRevealed}
            isScratching={isScratching}
            onScratch={handleScratch}
          />
        </div>

        {/* Action Button */}
        <div className="max-w-sm mx-auto w-full">
          {isOutOfTokens && (
            <div
              className="mb-4 p-4 rounded-xl border bg-red-500/10 text-center text-sm font-bold"
              style={{
                borderColor: theme.colors.lose + "20",
                color: theme.colors.lose,
              }}
            >
              로또볼이 부족합니다! Vault에서 충전하세요.
            </div>
          )}

          <button
            type="button"
            onClick={() => (isRevealed ? handleReset() : handleScratch())}
            disabled={!canPlay && !isRevealed}
            className="w-full rounded-2xl py-5 text-lg font-black transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 shadow-2xl"
            style={{
              background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.secondary})`,
              color: theme.colors.text,
            }}
          >
            {isRevealed
              ? "다음 복권 확인"
              : isScratching
                ? "결과 확인 중..."
                : playMutation.isPending
                  ? "준비 중..."
                  : "지금 긁기"}
          </button>
        </div>

        {/* Prize List */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3
              className="text-sm font-black italic tracking-[0.2em] uppercase"
              style={{ color: theme.colors.accent }}
            >
              당첨 가능 경품 리스트
            </h3>
            <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">
              Total {data.prizes?.length ?? 0} Items
            </span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {data.prizes?.map((prize) => (
              <motion.div
                key={prize.id}
                className="group relative aspect-square overflow-hidden rounded-xl border transition-all flex flex-col items-center justify-center p-2 text-center bg-white/[0.03] border-white/10"
                whileHover={{
                  scale: 1.05,
                  borderColor: theme.colors.accent + "30",
                }}
              >
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity">
                  <img
                    src="/assets/lottery/gold_foil.jpg"
                    className="w-full h-full object-cover"
                    alt=""
                  />
                </div>

                <div className="relative z-10 w-8 h-8 mb-2 group-hover:scale-110 transition-transform duration-500">
                  <img
                    src="/assets/lottery/icon_gift.png"
                    className="w-full h-full object-contain filter drop-shadow-md"
                    alt=""
                  />
                </div>

                <div className="relative z-10 w-full px-1">
                  <p className="text-xs font-black text-white leading-tight line-clamp-2 mb-1">
                    {prize.label}
                  </p>
                  <p className="text-[10px] font-black text-white/60">
                    {prize.reward_type === "NONE"
                      ? "꽝"
                      : `${Number(prize.reward_amount).toLocaleString()}`}
                  </p>
                </div>

                {prize.stock !== null && (
                  <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5">
                    <span
                      className="w-1 h-1 rounded-full animate-pulse"
                      style={{ backgroundColor: theme.colors.accent }}
                    />
                    <span className="text-[7px] font-black text-white/30 uppercase tracking-widest">
                      {prize.stock}
                    </span>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Collection Modal */}
      <LotteryCollectionModal
        open={collectionModalOpen}
        onClose={() => setCollectionModalOpen(false)}
        collection={collection}
        onCraft={async () => {
          // TODO: Implement craft API call
          console.log("[LotteryPage] Craft puzzle pieces");
          await new Promise((resolve) => setTimeout(resolve, 1000));
          queryClient.invalidateQueries({ queryKey: ["v2-lottery-status"] });
        }}
      />
    </div>
  );
};

// ============================================================================
// Main Page with Theme Provider
// ============================================================================

const LotteryPage = () => {
  return (
    <ThemeProvider>
      <LotteryPageContent />
    </ThemeProvider>
  );
};

export default LotteryPage;
