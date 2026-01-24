import { useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, useAnimation } from "framer-motion";
import confetti from "canvas-confetti";
import gsap from "gsap";
import RouletteWheel from "../../components/game/RouletteWheel";
import CoinShower from "../../components/effects/CoinShower";
import PremiumParticles from "../../components/effects/PremiumParticles";
import { getV2RouletteStatus, playV2Roulette } from "../../api/v1CompatAdapter";
import type { RouletteSegmentDto } from "../../api/gameApi";
import type { GameTokenType } from "../../../types/gameTokens";
import { triggerHaptic, triggerNotification } from "../../utils/haptic";
import { useSound } from "../../../hooks/useSound";

// ============================================================================
// Types
// ============================================================================

interface TicketTab {
  type: GameTokenType;
  label: string;
  activeColors: string;
  icon: string;
  iconImg?: string;
}

const TABS: TicketTab[] = [
  {
    type: "ROULETTE_TICKET",
    label: "?ºÎ∞ò\nÎ£∞Î†õ",
    activeColors: "bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.4)]",
    icon: "?é´Ô∏?,
    iconImg: "/assets/asset_ticket_green.png",
  },
  {
    type: "GOLD_KEY_TICKET",
    label: "Í≥®Îìú\nÎ£∞Î†õ",
    activeColors:
      "bg-gradient-to-br from-[#FFD700] to-[#FFA500] text-black shadow-[0_0_20px_rgba(255,215,0,0.6)]",
    icon: "?óùÔ∏?,
    iconImg: "/assets/icons/goldkey.png",
  },
  {
    type: "DIAMOND_TICKET",
    label: "?§Ïù¥??nÎ£∞Î†õ",
    activeColors:
      "bg-gradient-to-br from-cyan-300 via-blue-400 to-indigo-500 text-white shadow-[0_0_20px_rgba(0,191,255,0.7)]",
    icon: "?íé",
    iconImg: "/assets/icons/diakey.png",
  },
  {
    type: "TRIAL_TICKET",
    label: "Ï≤¥Ìóò\nÎ£∞Î†õ",
    activeColors:
      "bg-gradient-to-br from-gray-400 to-gray-600 text-white shadow-[0_0_15px_rgba(255,255,255,0.2)]",
    icon: "?ß™",
    iconImg: "/assets/asset_ticket_trial.png",
  },
];

// ============================================================================
// Confetti Effects
// ============================================================================

const triggerFireworks = () => {
  const duration = 2500;
  const end = Date.now() + duration;

  const colors = ["#30FF75", "#FFD700", "#00D4AA", "#FF6B9D"];

  const frame = () => {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.6 },
      colors,
    });
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.6 },
      colors,
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  };

  frame();
};

const triggerJackpotExplosion = () => {
  const duration = 3000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

  function randomInRange(min: number, max: number) {
    return Math.random() * (max - min) + min;
  }

  const interval = window.setInterval(() => {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 50 * (timeLeft / duration);
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      colors: ["#FFD700", "#FFA500", "#FFEB1C"],
    });
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      colors: ["#FFD700", "#FFA500", "#FFEB1C"],
    });
  }, 250);
};

// ============================================================================
// Roulette Page Component
// ============================================================================

const RoulettePage = () => {
  const {
    playRouletteSpin,
    stopRouletteSpin,
    playRouletteStop,
    playSmallWin,
    playBigWin,
    playRouletteLose,
  } = useSound();
  const [activeTab, setActiveTab] = useState<GameTokenType>("ROULETTE_TICKET");
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | undefined>();
  const [rewardToast, setRewardToast] = useState<{
    value: number;
    type: string;
  } | null>(null);
  const [showCoinShower, setShowCoinShower] = useState(false);
  const [coinShowerType, setCoinShowerType] = useState<
    "gold" | "diamond" | "normal"
  >("normal");

  const queryClient = useQueryClient();
  const shakeControls = useAnimation();
  const spinStartRef = useRef<number | null>(null);
  const wheelContainerRef = useRef<HTMLDivElement>(null);

  const SPIN_DURATION_MS = 3000;

  // ============================================================================
  // API Queries
  // ============================================================================

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["v2-roulette-status", activeTab],
    queryFn: () => getV2RouletteStatus(activeTab),
    refetchOnWindowFocus: true,
    staleTime: 10000,
  });

  const playMutation = useMutation({
    mutationFn: (ticketType: GameTokenType) =>
      playV2Roulette({
        ticket_type: ticketType as any,
        bet_multiplier: 1,
      }),
    onError: (error) => {
      console.error("[RoulettePage] Play failed:", error);
    },
  });

  // ============================================================================
  // Segments Mapping
  // ============================================================================

  const segments = useMemo(() => {
    // SoT: 6 segments fixed (slot_index 0~5)
    const incoming = data?.segments ?? [];
    if (incoming.length === 6) return incoming;

    const normalized = incoming
      .slice()
      .sort((a, b) => a.slot_index - b.slot_index)
      .slice(0, 6);

    if (normalized.length === 6) return normalized;

    // fallback if API doesn't provide segments
    const fallback: RouletteSegmentDto[] = Array.from({ length: 6 }).map(
      (_, i) => ({
        id: i,
        slot_index: i,
        label: `Slot ${i + 1}`,
        reward_type: "NONE",
        reward_amount: 0,
        is_fever_reward: false,
      }),
    );

    // fill missing slots deterministically
    const byIndex = new Map<number, RouletteSegmentDto>();
    for (const seg of normalized) byIndex.set(seg.slot_index, seg);
    return fallback.map((seg) => byIndex.get(seg.slot_index) ?? seg);
  }, [data?.segments]);

  // ============================================================================
  // Play Handler
  // ============================================================================

  const handlePlay = async () => {
    if (isSpinning || playMutation.isPending) return;
    if (!data || data.token_balance <= 0) return;

    try {
      // Initial haptic feedback
      triggerHaptic("heavy");

      setRewardToast(null);
      setSelectedIndex(undefined);
      spinStartRef.current = performance.now();

      const result = await playMutation.mutateAsync(activeTab);
      console.log("[RoulettePage] Play result:", result);

      const winIndex = result.game_data?.segment?.slot_index ?? 0;
      setSelectedIndex(winIndex);
      setIsSpinning(true);
      playRouletteSpin();

      // Spin haptic sequence
      const spinHapticInterval = setInterval(() => {
        triggerHaptic("light");
      }, 400);

      setTimeout(() => {
        clearInterval(spinHapticInterval);
      }, SPIN_DURATION_MS - 500);
    } catch (err) {
      console.error("[RoulettePage] Play error:", err);
      triggerNotification("error");
    }
  };

  const handleSpinEnd = () => {
    setIsSpinning(false);
    stopRouletteSpin();
    playRouletteStop();

    if (!playMutation.data) return;

    const result = playMutation.data;
    const rewardValue = result.vault_earn ?? 0;
    const rewardType = result.game_data?.segment?.reward_type ?? "NONE";

    console.log("[RoulettePage] Spin end:", { rewardValue, rewardType });

    if (rewardValue > 0) {
      // Success haptic feedback
      triggerNotification("success");

      setRewardToast({ value: rewardValue, type: rewardType });
      setTimeout(() => setRewardToast(null), 2500);

      // Determine coin shower type based on active tab
      const showerType =
        activeTab === "GOLD_KEY_TICKET"
          ? "gold"
          : activeTab === "DIAMOND_TICKET"
            ? "diamond"
            : "normal";
      setCoinShowerType(showerType);
      setShowCoinShower(true);
      setTimeout(() => setShowCoinShower(false), 2500);

      // Shake animation
      shakeControls.start({
        x: [0, -10, 10, -10, 10, 0],
        transition: { duration: 0.5 },
      });

      // Heavy haptic for big wins
      if (rewardValue >= 50000 || activeTab === "DIAMOND_TICKET") {
        triggerHaptic("heavy");
        setTimeout(() => triggerHaptic("heavy"), 200);
        setTimeout(() => triggerHaptic("heavy"), 400);
      }

      // GSAP wheel glow pulse for premium tiers
      if (
        wheelContainerRef.current &&
        (activeTab === "GOLD_KEY_TICKET" || activeTab === "DIAMOND_TICKET")
      ) {
        gsap.to(wheelContainerRef.current, {
          boxShadow:
            activeTab === "GOLD_KEY_TICKET"
              ? "0 0 100px rgba(255, 215, 0, 0.8)"
              : "0 0 100px rgba(0, 191, 255, 0.8)",
          duration: 0.3,
          yoyo: true,
          repeat: 3,
        });
      }

      // Confetti based on reward value and tier
      if (rewardValue >= 50000 || activeTab === "DIAMOND_TICKET") {
        triggerJackpotExplosion();
        playBigWin();
      } else {
        triggerFireworks();
        playSmallWin();
      }
    } else {
      // Light haptic for no win
      triggerHaptic("light");
      playRouletteLose();
    }

    // Invalidate queries to refresh data
    queryClient.invalidateQueries({ queryKey: ["v2-roulette-status"] });
    queryClient.invalidateQueries({ queryKey: ["v2-vault-status"] });
  };

  // ============================================================================
  // Tab Handler
  // ============================================================================

  const handleTabClick = (tab: GameTokenType) => {
    if (isSpinning || playMutation.isPending) return;
    triggerHaptic("soft");
    setActiveTab(tab);
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
            Î£∞Î†õ ?ïÎ≥¥Î•?Î∂àÎü¨?§Îäî Ï§?..
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
            ?∞Ïù¥?∞Î? Î∂àÎü¨?§Ï? Î™ªÌñà?µÎãà??
          </p>
          <p className="mt-2 text-sm text-white/60">
            ?†Ïãú ???§Ïãú ?úÎèÑ?òÍ±∞???¥ÏòÅ?êÏóêÍ≤?Î¨∏Ïùò?òÏÑ∏??
          </p>
          {error && (
            <p className="mt-4 text-xs text-red-400">
              {error instanceof Error ? error.message : "Unknown error"}
            </p>
          )}
        </div>
      </div>
    );
  }

  // ============================================================================
  // Premium Visual Effects by Ticket Type
  // ============================================================================

  const getPremiumEffects = () => {
    if (activeTab === "GOLD_KEY_TICKET") {
      return {
        containerClass: "from-amber-500/5 to-transparent",
        glowClass: "shadow-[0_0_80px_rgba(255,215,0,0.15)]",
        accentColor: "#FFD700",
        particleType: "gold" as const,
        frameGlow: "shadow-[0_0_60px_rgba(255,215,0,0.4)]",
      };
    }
    if (activeTab === "DIAMOND_TICKET") {
      return {
        containerClass: "from-blue-500/5 to-transparent",
        glowClass: "shadow-[0_0_80px_rgba(0,191,255,0.2)]",
        accentColor: "#00BFFF",
        particleType: "diamond" as const,
        frameGlow: "shadow-[0_0_60px_rgba(0,191,255,0.5)]",
      };
    }
    return {
      containerClass: "from-[#30FF75]/5 to-transparent",
      glowClass: "",
      accentColor: "#30FF75",
      particleType: "none" as const,
      frameGlow: "",
    };
  };

  const effects = getPremiumEffects();

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden relative">
      {/* Background Effects */}
      <div
        className={`absolute inset-0 bg-gradient-to-b ${effects.containerClass} pointer-events-none`}
      />

      {/* Premium Particles */}
      <PremiumParticles type={effects.particleType} intensity={20} />

      {/* Coin Shower Effect */}
      <CoinShower
        active={showCoinShower}
        coinType={coinShowerType}
        duration={2500}
        intensity={40}
      />

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}

        {/* Tabs */}
        <div className="mb-6 flex justify-center">
          <div className="inline-flex flex-wrap justify-center gap-2 rounded-2xl bg-white/5 p-2 backdrop-blur-md">
            {TABS.map((tab) => (
              <button
                key={tab.type}
                type="button"
                onClick={() => handleTabClick(tab.type)}
                className={`group flex items-center justify-center rounded-xl px-4 py-3 text-sm font-bold transition-all duration-300 ${
                  activeTab === tab.type
                    ? tab.activeColors
                    : "text-white/40 hover:bg-white/5 hover:text-white"
                }`}
                disabled={isSpinning || playMutation.isPending}
              >
                {tab.iconImg ? (
                  <img
                    src={tab.iconImg}
                    alt=""
                    className={`h-6 w-6 object-contain transition-transform duration-300 ${
                      activeTab === tab.type && "scale-110"
                    }`}
                  />
                ) : (
                  <span
                    className={`text-lg transition-transform duration-300 ${activeTab === tab.type && "scale-110"}`}
                  >
                    {tab.icon}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="text-center text-sm font-black text-white/80 mb-4">
          {TABS.find((t) => t.type === activeTab)?.label.replace("\n", " ")}
        </div>

        {/* Main Content */}
        <motion.div animate={shakeControls} className="relative">
          {/* Reward Toast */}
          {!isSpinning && rewardToast && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] w-full px-4 pointer-events-none">
              <div className="mx-auto flex max-w-[280px] flex-col items-center justify-center gap-2 rounded-[2rem] border border-[#30FF75]/30 bg-black/90 px-5 py-5 shadow-2xl backdrop-blur-3xl animate-bounce">
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#FFD700]/10 via-transparent to-transparent opacity-50" />

                <div className="relative flex flex-col items-center gap-3">
                  <div className="inline-flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full border border-[#FFD700]/40 bg-[#FFD700]/10 shadow-[0_0_20px_rgba(255,215,0,0.4)] animate-pulse p-2">
                    <img
                      src="/assets/logo_cc_v2.png"
                      alt="Reward"
                      className="h-full w-full object-contain drop-shadow-md"
                    />
                  </div>

                  <div className="text-center">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#FFD700] mb-1 animate-pulse">
                      YOU WON
                    </p>
                    <p className="text-3xl font-black text-white leading-none">
                      {rewardToast.value.toLocaleString()}
                      <span className="text-sm font-bold text-white/50 ml-1">
                        ??
                      </span>
                    </p>
                    <p className="text-xs font-bold text-white/60 mt-1">
                      {rewardToast.type}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-start lg:justify-center lg:gap-10">
            {/* Roulette Wheel */}
            <div
              ref={wheelContainerRef}
              className={`relative flex w-full max-w-[360px] flex-col items-center justify-center lg:w-[360px] lg:flex-shrink-0 cursor-pointer transition-all duration-300 ${effects.glowClass} ${effects.frameGlow}`}
              onClick={handlePlay}
            >
              <RouletteWheel
                segments={segments}
                isSpinning={isSpinning}
                selectedIndex={selectedIndex}
                spinDurationMs={SPIN_DURATION_MS}
                onSpinEnd={handleSpinEnd}
              />
            </div>

            {/* Control Panel */}
            <div className="flex w-full max-w-[360px] flex-col gap-4 lg:w-[360px]">
              <div className="relative overflow-hidden rounded-[2rem] border border-white/15 bg-black/60 p-5 shadow-2xl backdrop-blur">
                {/* Accent Line */}
                <div
                  className={`pointer-events-none absolute inset-x-0 top-0 h-[1px] ${
                    activeTab === "GOLD_KEY_TICKET"
                      ? "bg-gradient-to-r from-transparent via-[#FFD700]/40 to-transparent"
                      : activeTab === "DIAMOND_TICKET"
                        ? "bg-gradient-to-r from-transparent via-[#00BFFF]/40 to-transparent"
                        : "bg-gradient-to-r from-transparent via-[#30FF75]/40 to-transparent"
                  }`}
                />

                {/* Balance Display */}
                <div className="mb-6">
                  <div className="flex items-center gap-4 rounded-3xl border border-white/15 bg-black/50 px-4 py-4 shadow-xl">
                    <img
                      src={
                        TABS.find((t) => t.type === activeTab)?.iconImg ||
                        "/assets/asset_ticket_green.png"
                      }
                      alt="Tickets"
                      className="h-12 w-12 object-contain"
                    />
                    <div className="flex flex-col leading-none">
                      <span className="text-xs font-black uppercase tracking-widest text-[#30FF75]/70">
                        {data.token_type}
                      </span>
                      <span className="font-mono text-2xl font-bold text-white">
                        {(data.token_balance ?? 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Spin Info */}
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/60">?§Îäò ?åÎ†à??/span>
                    <span className="font-bold text-white">
                      {data.today_spins} / {data.max_daily_spins}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">?®Ï? ?üÏàò</span>
                    <span className="font-bold text-[#30FF75]">
                      {data.remaining_spins}
                    </span>
                  </div>
                </div>

                {/* Play Button */}
                <button
                  type="button"
                  onClick={handlePlay}
                  disabled={
                    isSpinning ||
                    playMutation.isPending ||
                    data.token_balance <= 0
                  }
                  className={`mt-6 w-full rounded-xl py-4 text-base font-black transition-all duration-300 ${
                    activeTab === "GOLD_KEY_TICKET"
                      ? "bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-black hover:shadow-[0_0_30px_rgba(255,215,0,0.5)]"
                      : activeTab === "DIAMOND_TICKET"
                        ? "bg-gradient-to-r from-cyan-400 to-blue-500 text-white hover:shadow-[0_0_30px_rgba(0,191,255,0.5)]"
                        : "bg-gradient-to-r from-[#30FF75] to-[#00D4AA] text-black hover:shadow-[0_0_20px_rgba(48,255,117,0.3)]"
                  } disabled:opacity-50 disabled:cursor-not-allowed active:scale-95`}
                >
                  {isSpinning
                    ? "?§Ì? Ï§?.."
                    : playMutation.isPending
                      ? "Ï§ÄÎπ?Ï§?.."
                      : "?§Ì? ?úÏûë"}
                </button>

                {playMutation.isError && (
                  <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-200">
                    ?†Ô∏è ?åÎ†à?¥Ïóê ?§Ìå®?àÏäµ?àÎã§. ?§Ïãú ?úÎèÑ?¥Ï£º?∏Ïöî.
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default RoulettePage;
