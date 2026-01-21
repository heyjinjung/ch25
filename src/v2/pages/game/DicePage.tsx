import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, useAnimation } from "framer-motion";
import confetti from "canvas-confetti";
import { getV2DiceStatus, playV2Dice } from "../../api/v1CompatAdapter";
import DiceRoll from "../../components/game/DiceRoll";
import { ThemeProvider, useTheme } from "../../contexts/ThemeContext";
import "./GamePages.css";
import { triggerHaptic, triggerNotification } from "../../utils/haptic";
import PremiumParticles from "../../components/effects/PremiumParticles";

// ============================================================================
// Dice Page Content (with Theme)
// ============================================================================

const DicePageContent = () => {
  const { theme, themeType } = useTheme();
  const [isRolling, setIsRolling] = useState(false);
  const [userDice, setUserDice] = useState<number[]>([]);
  const [dealerDice, setDealerDice] = useState<number[]>([]);
  const [result, setResult] = useState<"WIN" | "LOSE" | "DRAW" | null>(null);
  const [rewardAmount, setRewardAmount] = useState(0);

  const queryClient = useQueryClient();
  const userShakeControls = useAnimation();
  const dealerShakeControls = useAnimation();
  const containerRef = useRef<HTMLDivElement>(null);

  // ============================================================================
  // API Queries
  // ============================================================================

  const { data, isLoading, isError } = useQuery({
    queryKey: ["v2-dice-status"],
    queryFn: () => getV2DiceStatus(),
    refetchOnWindowFocus: true,
    staleTime: 10000,
  });

  const playMutation = useMutation({
    mutationFn: () =>
      playV2Dice({
        bet_amount: 100, // 기본 베팅 금액
        prediction: null,
      }),
    onError: (error) => {
      console.error("[DicePage] Play failed:", error);
      triggerNotification("error");
    },
  });

  // ============================================================================
  // Play Handler
  // ============================================================================

  const handlePlay = async () => {
    if (isRolling || playMutation.isPending) return;
    if (!data || data.token_balance <= 0) return;

    try {
      triggerHaptic("heavy");

      setResult(null);
      setUserDice([]);
      setDealerDice([]);
      setIsRolling(true);

      const response = await playMutation.mutateAsync();
      console.log("[DicePage] Play result:", response);

      // 주사위 결과 설정
      const userDiceResult = response.game_data?.user_dice ?? [1, 1];
      const dealerDiceResult = response.game_data?.dealer_dice ?? [1, 1];
      const outcome = response.game_data?.outcome ?? "DRAW";
      const reward = response.game_data?.reward_amount ?? 0;

      setTimeout(() => {
        setUserDice(userDiceResult);
        setDealerDice(dealerDiceResult);
        setIsRolling(false);
        setResult(outcome as "WIN" | "LOSE" | "DRAW");
        setRewardAmount(reward);

        handleRollComplete(outcome as "WIN" | "LOSE" | "DRAW");
      }, theme.animations.diceRollDuration);
    } catch (err) {
      console.error("[DicePage] Play error:", err);
      setIsRolling(false);
    }
  };

  // ============================================================================
  // Result Handler
  // ============================================================================

  const handleRollComplete = (outcome: "WIN" | "LOSE" | "DRAW") => {
    if (outcome === "WIN") {
      triggerNotification("success");
      triggerHaptic("heavy");

      // User wins - shake dealer
      dealerShakeControls.start({
        x: [-10, 10, -10, 10, 0],
        transition: { duration: 0.5 },
      });

      // Confetti
      confetti({
        particleCount: theme.animations.particleCount,
        spread: 70,
        origin: { y: 0.6 },
        colors: [theme.colors.win, theme.colors.accent],
      });
    } else if (outcome === "LOSE") {
      triggerHaptic("light");

      // User loses - shake user
      userShakeControls.start({
        x: [-10, 10, -10, 10, 0],
        transition: { duration: 0.5 },
      });
    } else {
      triggerHaptic("medium");
    }

    // Refresh data
    queryClient.invalidateQueries({ queryKey: ["v2-dice-status"] });
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
            주사위 정보를 불러오는 중...
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

  const userSum = userDice.reduce((a, b) => a + b, 0);
  const dealerSum = dealerDice.reduce((a, b) => a + b, 0);

  return (
    <div
      ref={containerRef}
      className={`game-page dice-page theme-${themeType} min-h-screen text-white overflow-hidden relative`}
    >
      {/* Background Particles */}
      {theme.assets.particleType !== "default" && (
        <PremiumParticles
          type={theme.assets.particleType === "sparkle" ? "gold" : "diamond"}
          intensity={15}
        />
      )}

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-black text-white tracking-tight mb-2">
            {theme.name} 주사위
          </h1>
          <p className="text-sm text-white/60">
            딜러와 주사위 대결! 합이 높은 쪽이 승리합니다
          </p>
        </div>

        {/* Balance */}
        <div className="mb-6 flex justify-center">
          <div className="inline-flex items-center gap-3 rounded-2xl bg-black/50 border border-white/15 px-5 py-3 backdrop-blur">
            <img
              src="/assets/asset_ticket_green.png"
              alt="Tokens"
              className="w-8 h-8 object-contain"
            />
            <div className="flex flex-col leading-none">
              <span className="text-xs font-black uppercase tracking-widest text-white/70">
                {data.token_type}
              </span>
              <span className="font-mono text-xl font-bold text-white">
                {data.token_balance.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Dice Battle Arena */}
        <div className="mb-6 rounded-3xl bg-black/60 border border-white/15 p-6 backdrop-blur shadow-2xl">
          {/* Dealer */}
          <motion.div animate={dealerShakeControls} className="mb-8">
            <div className="flex flex-col items-center gap-4">
              <div className="flex gap-4">
                {isRolling || dealerDice.length > 0 ? (
                  <>
                    <DiceRoll
                      value={dealerDice[0]}
                      isRolling={isRolling}
                      size={70}
                      label="딜러"
                    />
                    <DiceRoll
                      value={dealerDice[1]}
                      isRolling={isRolling}
                      size={70}
                    />
                  </>
                ) : (
                  <div className="flex gap-4">
                    <div className="w-[70px] h-[70px] rounded-2xl border-2 border-dashed border-white/20 flex items-center justify-center">
                      <span className="text-white/40 text-xs">?</span>
                    </div>
                    <div className="w-[70px] h-[70px] rounded-2xl border-2 border-dashed border-white/20 flex items-center justify-center">
                      <span className="text-white/40 text-xs">?</span>
                    </div>
                  </div>
                )}
              </div>
              {dealerDice.length > 0 && (
                <div className="text-center">
                  <p className="text-sm text-white/60">합계</p>
                  <p className="text-2xl font-black text-white">{dealerSum}</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* VS Divider */}
          <div className="relative flex items-center justify-center my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative bg-black/80 px-4 py-2 rounded-full border border-white/20">
              <span className="dice-vs-text text-xl font-black tracking-wider">
                VS
              </span>
            </div>
          </div>

          {/* User */}
          <motion.div animate={userShakeControls}>
            <div className="flex flex-col items-center gap-4">
              <div className="flex gap-4">
                {isRolling || userDice.length > 0 ? (
                  <>
                    <DiceRoll
                      value={userDice[0]}
                      isRolling={isRolling}
                      size={70}
                      label="유저"
                    />
                    <DiceRoll
                      value={userDice[1]}
                      isRolling={isRolling}
                      size={70}
                    />
                  </>
                ) : (
                  <div className="flex gap-4">
                    <div className="w-[70px] h-[70px] rounded-2xl border-2 border-dashed border-white/20 flex items-center justify-center">
                      <span className="text-white/40 text-xs">?</span>
                    </div>
                    <div className="w-[70px] h-[70px] rounded-2xl border-2 border-dashed border-white/20 flex items-center justify-center">
                      <span className="text-white/40 text-xs">?</span>
                    </div>
                  </div>
                )}
              </div>
              {userDice.length > 0 && (
                <div className="text-center">
                  <p className="text-sm text-white/60">합계</p>
                  <p className="text-2xl font-black text-white">{userSum}</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Result Badge */}
          {result && (
            <motion.div
              className="mt-6 text-center"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4, ease: "back.out(2)" }}
            >
              <div
                className={`dice-result-badge inline-flex items-center gap-2 rounded-full px-6 py-3 border-2 shadow-2xl ${
                  result === "WIN"
                    ? "is-win"
                    : result === "LOSE"
                      ? "is-lose"
                      : ""
                }`}
              >
                <span className="text-2xl">
                  {result === "WIN" ? "🎉" : result === "LOSE" ? "😢" : "🤝"}
                </span>
                <span className="text-xl font-black text-white">
                  {result === "WIN"
                    ? "승리!"
                    : result === "LOSE"
                      ? "패배"
                      : "무승부"}
                </span>
              </div>
              {result === "WIN" && rewardAmount > 0 && (
                <p className="mt-3 text-lg font-bold text-white">
                  +{rewardAmount.toLocaleString()} 원
                </p>
              )}
            </motion.div>
          )}
        </div>

        {/* Play Button */}
        <button
          type="button"
          onClick={handlePlay}
          disabled={
            isRolling || playMutation.isPending || data.token_balance <= 0
          }
          className="dice-play-button w-full rounded-2xl py-5 text-lg font-black transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 shadow-2xl"
        >
          {isRolling
            ? "주사위 굴리는 중..."
            : playMutation.isPending
              ? "준비 중..."
              : "주사위 굴리기"}
        </button>

        {/* Game Info */}
        <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
          <div className="rounded-xl bg-black/40 border border-white/10 p-3 backdrop-blur">
            <p className="text-white/60 mb-1">오늘 플레이</p>
            <p className="text-lg font-bold text-white">
              {data.today_plays} / {data.max_daily_plays}
            </p>
          </div>
          <div className="rounded-xl bg-black/40 border border-white/10 p-3 backdrop-blur">
            <p className="text-white/60 mb-1">남은 횟수</p>
            <p className="dice-remaining text-lg font-bold">
              {data.remaining_plays}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Main Page with Theme Provider
// ============================================================================

const DicePage = () => {
  return (
    <ThemeProvider>
      <DicePageContent />
    </ThemeProvider>
  );
};

export default DicePage;
