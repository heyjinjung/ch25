import { useEffect, useMemo, useRef, useState } from "react";
// TODO: [VERIFY] When playing with Gold/Diamond Key, ensure UI shows Vault Accrual animation, NOT XP.
// TODO: [VERIFY] If Ticket Reward is won, ensure it flies to Wallet/Header.
import RouletteWheel from "../components/game/RouletteWheel";
import { usePlayRoulette, useRouletteStatus } from "../hooks/useRoulette";
import FeatureGate from "../components/feature/FeatureGate";
import { GAME_TOKEN_LABELS, GameTokenType } from "../types/gameTokens";
import { getRouletteStatus } from "../api/rouletteApi";
import type { RoulettePlayResponse } from "../api/rouletteApi";
import AnimatedNumber from "../components/common/AnimatedNumber";
import { tryHaptic } from "../utils/haptics";
import GamePageShell from "../components/game/GamePageShell";
import TicketZeroPanel from "../components/game/TicketZeroPanel";
import VaultAccrualModal from "../components/vault/VaultAccrualModal";
import { useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { useSound } from "../hooks/useSound";
import { formatRewardLine, isGifticonRewardType, parseGifticonRewardType } from "../utils/rewardLabel";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const FALLBACK_SEGMENTS = Array.from({ length: 12 }).map((_, idx) => ({
  label: `BONUS ${idx + 1}`,
  weight: 1,
  isJackpot: idx === 0,
}));

const TABS: { type: GameTokenType; label: string; activeColors: string; icon: string; iconImg?: string }[] = [
  {
    type: "ROULETTE_COIN",
    label: "일반\n룰렛",
    activeColors: "bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.4)]",
    icon: "🎟️",
    iconImg: "/assets/asset_ticket_green.png"
  },
  {
    type: "GOLD_KEY",
    label: "골드\n룰렛",
    activeColors: "bg-black text-amber-400 border border-amber-400 shadow-[0_0_20px_rgba(255,215,0,0.5)]",
    icon: "🗝️",
    iconImg: "/assets/icons/goldkey.png"
  },
  {
    type: "DIAMOND_KEY",
    label: "다이아\n룰렛",
    activeColors: "bg-gradient-to-br from-cyan-300 via-blue-400 to-indigo-500 text-white shadow-[0_0_20px_rgba(0,191,255,0.5)] border-blue-300",
    icon: "💎",
    iconImg: "/assets/icons/diakey.png"
  },
  {
    type: "TRIAL_TOKEN",
    label: "체험\n룰렛",
    activeColors: "bg-gradient-to-br from-gray-400 to-gray-600 text-white shadow-[0_0_15px_rgba(255,255,255,0.2)] border-gray-400",
    icon: "🧪",
    iconImg: "/assets/asset_ticket_trial.png" // Placeholder or reuse existing
  },
];

const RoulettePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<GameTokenType>("ROULETTE_COIN");
  const { data, isLoading, isError, error } = useRouletteStatus(activeTab);
  const playMutation = usePlayRoulette();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { playRouletteStop, stopRouletteSpin, playBigWin } = useSound();
  const [selectedIndex, setSelectedIndex] = useState<number | undefined>();
  const SPIN_DURATION_MS = 3000;
  const [isSpinning, setIsSpinning] = useState(false);
  const [rewardToast, setRewardToast] = useState<{ value: number; type: string } | null>(null);
  const [vaultModal, setVaultModal] = useState<{ open: boolean; amount: number }>({ open: false, amount: 0 });
  const [premiumBlockedModal, setPremiumBlockedModal] = useState<{ open: boolean; message?: string }>({
    open: false,
  });
  const pendingResultRef = useRef<RoulettePlayResponse | null>(null);
  const spinStartAtRef = useRef<number | null>(null);
  const transitionEndAtRef = useRef<number | null>(null);
  const spinHapticIntervalRef = useRef<number | null>(null);
  const spinHapticTimeoutsRef = useRef<number[]>([]);

  const segments = useMemo(() => {
    const resolved = (data?.segments ?? []).map((segment) => ({
      label: segment.label,
      weight: segment.weight,
      isJackpot: segment.isJackpot,
    }));
    return resolved.length > 0 ? resolved : FALLBACK_SEGMENTS;
  }, [data?.segments]);

  const usingFallbackSegments = useMemo(() => (data?.segments ?? []).length === 0, [data?.segments]);

  const mapErrorMessage = (err: unknown) => {
    if (axios.isAxiosError(err)) {
      const status = err.response?.status;
      const detail = err.response?.data?.detail;
      const code =
        (typeof detail === "string" && detail) ||
        (err.response?.data as { error?: { code?: string } } | undefined)?.error?.code;

      if (status === 403) return "현재 등급에서는 골드/다이아 룰렛을 이용할 수 없습니다.";
      if (status === 429) return "오늘 참여 횟수를 모두 사용했습니다.";

      if (code === "NO_FEATURE_TODAY") return "오늘 활성화된 이벤트가 없습니다.";
      if (code === "INVALID_FEATURE_SCHEDULE") return "이벤트 일정이 맞지 않습니다. 운영자에게 문의하세요.";
      if (code === "FEATURE_DISABLED") return "이벤트가 비활성화되었습니다.";
      if (code === "DAILY_LIMIT_REACHED") return "오늘 참여 횟수를 모두 사용했습니다.";
      if (code === "NOT_ENOUGH_TOKENS") return "티켓이 부족합니다. 충전 후 다시 시도하세요.";

      return "룰렛 정보를 불러오지 못했습니다.";
    }
    return "룰렛 정보를 불러오지 못했습니다.";
  };

  const errorMessage = useMemo(() => (error ? mapErrorMessage(error) : undefined), [error]);
  const playErrorMessage = useMemo(
    () => (playMutation.error ? mapErrorMessage(playMutation.error) : undefined),
    [playMutation.error]
  );

  const tokenBalance = useMemo(() => {
    if (typeof data?.token_balance !== "number") return null;
    return data.token_balance;
  }, [data?.token_balance]);

  const tokenLabel = useMemo(() => {
    if (!data) return "-";
    const typeLabel = data.token_type ? (GAME_TOKEN_LABELS[data.token_type as GameTokenType] ?? data.token_type) : "-";
    return typeLabel;
  }, [data]);

  const handleTabClick = async (nextTab: GameTokenType) => {
    if (isSpinning) return;
    if (nextTab === activeTab) return;

    // Pre-check premium roulette access on tab click.
    if (nextTab === "GOLD_KEY" || nextTab === "DIAMOND_KEY") {
      try {
        await getRouletteStatus(nextTab);
        setActiveTab(nextTab);
        return;
      } catch (e) {
        if (axios.isAxiosError(e) && e.response?.status === 403) {
          setPremiumBlockedModal({
            open: true,
            message: "현재 등급에서는 골드/다이아 룰렛을 이용할 수 없습니다. CC카지노에서 충전 후 다시 이용해보세요.",
          });
          return;
        }
        // Non-403 errors: fall back to normal tab switch so the page can show its error state.
        setActiveTab(nextTab);
        return;
      }
    }

    setActiveTab(nextTab);
  };

  const isUnlimited = data?.remaining_spins === 0;
  const isOutOfTokens = typeof data?.token_balance === "number" && data.token_balance <= 0;

  const handlePlay = async () => {
    try {
      tryHaptic([10, 35, 10]);

      pendingResultRef.current = null;
      setSelectedIndex(undefined);
      setRewardToast(null);

      const requestAt = performance.now();
      console.log("[Roulette] play start", { requestAt });

      const result = await playMutation.mutateAsync(activeTab);
      const resultAt = performance.now();
      console.log("[Roulette] result received", {
        label: result.segment?.label,
        reward: result.reward_value,
        selectedIndex: result.selected_index,
        latencyMs: resultAt - requestAt,
      });

      pendingResultRef.current = result;
      setSelectedIndex(result.selected_index);
      setIsSpinning(true);
      // playRouletteSpin(); // [USER REQUEST] Spin sound muted during spin
      spinStartAtRef.current = performance.now();
    } catch (e) {
      // Premium roulette access denied: show retention CTA instead of crashing/redirecting.
      if (axios.isAxiosError(e)) {
        const status = e.response?.status;
        if (status === 403 && (activeTab === "GOLD_KEY" || activeTab === "DIAMOND_KEY")) {
          const rawDetail = e.response?.data?.detail;
          const detailText = typeof rawDetail === "string" ? rawDetail : undefined;

          setPremiumBlockedModal({
            open: true,
            message:
              detailText ||
              "현재 등급에서는 골드/다이아 룰렛을 이용할 수 없습니다. CC카지노에서 충전 후 다시 이용해보세요.",
          });
          return;
        }
      }
      console.error("Roulette play failed", e);
    }
  };

  const handleSpinEnd = () => {
    if (!pendingResultRef.current) return;

    transitionEndAtRef.current = performance.now();
    console.log("[Roulette] wheel transitionend", {
      spinMs:
        spinStartAtRef.current && transitionEndAtRef.current
          ? transitionEndAtRef.current - spinStartAtRef.current
          : "n/a",
    });

    const result = pendingResultRef.current;
    pendingResultRef.current = null;

    setIsSpinning(false);
    // stopRouletteSpin(); // [USER REQUEST] Sound logic moved to result

    const rewardValue = result?.reward_value ? Number(result.reward_value) : 0;
    const rewardType = result?.reward_type ?? "NONE";

    // Strict Whitelist
    const ALLOWED_TYPES = ["POINT", "CC_POINT", "TICKET", "COUPON", "KEY", "TOKEN", "GAME_XP", "GIFTICON"];
    const upperRewardType = rewardType.toUpperCase();
    const isAllowedReward = ALLOWED_TYPES.some((t) => upperRewardType.includes(t));
    const isGifticonReward = isGifticonRewardType(rewardType);
    const gifticonMeta = isGifticonReward ? parseGifticonRewardType(rewardType) : null;
    const toastValue = rewardValue > 0 ? rewardValue : (gifticonMeta?.faceValue ?? 0);

    if (rewardType !== "NONE" && isAllowedReward && (rewardValue > 0 || isGifticonReward)) {
      setRewardToast({ value: toastValue, type: rewardType });
      window.setTimeout(() => setRewardToast(null), 2500);
      tryHaptic([18, 50, 18]);
      playRouletteStop(); // Clack sound
      playBigWin(); // [USER REQUEST] Big Win Jingle on Result
    } else {
      tryHaptic(12);
    }

    // Sync all statuses
    queryClient.invalidateQueries({ queryKey: ["lottery-status"] });
    queryClient.invalidateQueries({ queryKey: ["roulette-status"] });
    queryClient.invalidateQueries({ queryKey: ["dice-status"] });
    queryClient.invalidateQueries({ queryKey: ["vault-status"] });
    queryClient.invalidateQueries({ queryKey: ["season-pass-status"] });
    queryClient.invalidateQueries({ queryKey: ["team-leaderboard"] });
    queryClient.invalidateQueries({ queryKey: ["team-membership"] });

    const applyAt = performance.now();
    console.log("[Roulette] result applied", {
      delayAfterTransitionMs: transitionEndAtRef.current ? applyAt - transitionEndAtRef.current : "n/a",
      totalMs: spinStartAtRef.current ? applyAt - spinStartAtRef.current : "n/a",
    });
  };

  useEffect(() => {
    return () => {
      pendingResultRef.current = null;
      spinStartAtRef.current = null;
      transitionEndAtRef.current = null;

      if (spinHapticIntervalRef.current) {
        window.clearInterval(spinHapticIntervalRef.current);
        spinHapticIntervalRef.current = null;
      }
      spinHapticTimeoutsRef.current.forEach((t) => window.clearTimeout(t));
      spinHapticTimeoutsRef.current = [];
    };
  }, []);

  // Stop sound on unmount
  useEffect(() => {
    return () => {
      stopRouletteSpin();
    };
  }, [stopRouletteSpin]);

  useEffect(() => {
    const canHaptic = (() => {
      if (typeof window === "undefined") return false;
      if (typeof navigator === "undefined") return false;
      if (!("vibrate" in navigator)) return false;
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return false;

      // Prefer haptics on mobile-like pointers only.
      if (typeof window.matchMedia === "function") {
        if (!window.matchMedia("(pointer: coarse)").matches) return false;
      }
      return true;
    })();

    if (!isSpinning || !canHaptic) {
      if (spinHapticIntervalRef.current) {
        window.clearInterval(spinHapticIntervalRef.current);
        spinHapticIntervalRef.current = null;
      }
      spinHapticTimeoutsRef.current.forEach((t) => window.clearTimeout(t));
      spinHapticTimeoutsRef.current = [];
      return;
    }

    // Rate-limited spin haptics: short pulses, slightly faster near the end.
    const maxPulses = 6;
    let pulses = 0;

    spinHapticIntervalRef.current = window.setInterval(() => {
      if (!spinStartAtRef.current) return;
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;

      const elapsed = performance.now() - spinStartAtRef.current;
      if (elapsed < 350) return; // let the wheel start visually

      pulses += 1;
      const intensity = Math.min(14, 6 + pulses);
      tryHaptic(intensity);

      if (pulses >= maxPulses) {
        if (spinHapticIntervalRef.current) {
          window.clearInterval(spinHapticIntervalRef.current);
          spinHapticIntervalRef.current = null;
        }
      }
    }, 420);

    // Final accent close to the stop (kept short to avoid over-vibration).
    const finalAccentAt = Math.max(0, SPIN_DURATION_MS - 220);
    spinHapticTimeoutsRef.current.push(
      window.setTimeout(() => {
        if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
        tryHaptic([12, 35, 12]);
      }, finalAccentAt)
    );

    return () => {
      if (spinHapticIntervalRef.current) {
        window.clearInterval(spinHapticIntervalRef.current);
        spinHapticIntervalRef.current = null;
      }
      spinHapticTimeoutsRef.current.forEach((t) => window.clearTimeout(t));
      spinHapticTimeoutsRef.current = [];
    };
  }, [SPIN_DURATION_MS, isSpinning]);

  const content = (() => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 py-16">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-cc-lime/70 border-t-transparent" />
          <p className="text-[clamp(14px,3vw,18px)] font-semibold text-white/85">룰렛 정보를 불러오는 중...</p>
        </div>
      );
    }

    if (isError || !data) {
      return (
        <div className="rounded-3xl border border-white/15 bg-white/5 p-6 text-center backdrop-blur">
          <p className="text-[clamp(16px,3.2vw,20px)] font-bold text-white">{errorMessage ?? "데이터를 불러오지 못했습니다."}</p>
          <p className="mt-2 text-sm text-white/60">잠시 후 다시 시도하거나 운영자에게 문의하세요.</p>
        </div>
      );
    }

    return (
      <div className="relative mx-auto max-w-4xl space-y-6">

        {!isSpinning && rewardToast && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center pointer-events-none p-6">
            <div className="pointer-events-auto relative min-w-[300px] overflow-hidden rounded-3xl border border-white/20 bg-black/95 px-8 py-6 text-white shadow-[0_0_50px_rgba(255,215,0,0.2)] backdrop-blur-2xl animate-bounce-in">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-cc-gold/10 via-transparent to-transparent opacity-50" />
              <div className="pointer-events-none absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-cc-gold via-yellow-300 to-cc-orange shadow-[0_0_15px_rgba(255,215,0,0.5)]" />
              
              <div className="relative flex items-center gap-5 pl-2">
                <span className="inline-flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border border-cc-gold/40 bg-cc-gold/10 text-2xl shadow-[0_0_20px_rgba(255,215,0,0.4)] animate-pulse">
                  🪙
                </span>
                <div className="flex flex-col">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cc-gold mb-0.5 animate-pulse">Rewards</p>
                  <p className="text-sm font-bold text-white/90">획득 보상</p>
                  <div className="flex flex-wrap items-baseline gap-2 mt-1">
                    <span className="text-3xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                      <AnimatedNumber value={rewardToast.value} from={0} />
                    </span>
                    <span className="text-base font-bold text-white/60">
                      {(() => {
                        const upper = rewardToast.type.toUpperCase();
                        const normalized = upper.includes("GAME_XP") ? "GAME_XP" : upper.includes("POINT") ? "POINT" : rewardToast.type;
                        if (upper.includes("GAME_XP")) return "시즌 XP";
                        if (upper.includes("POINT")) return "원";
                        if (upper.includes("GIFTICON")) return "기프티콘";
                        // 만약 formatRewardLine 결과에 text가 있으면 그것을, 아니면 타입을 노출
                        // 여기서는 단순 단위(원/장/개)가 아니라 전체 텍스트가 올 수 있으므로 조정
                        const line = formatRewardLine(normalized, 0);
                        // formatRewardLine은 "금고 적립 100원" 형태이므로, 여기서는 "원" 같은 단위만 떼기 어렵습니다.
                        // 기존 로직 유지하되 "금고 적립" 등 중복 텍스트 주의.
                        // 위에서 POINT -> "원" 으로 처리했으므로, 나머지는 그대로 둡니다.
                        return line?.text.replace(/[0-9,\s]/g, "") || rewardToast.type; 
                      })()}
                    </span>
                  </div>
                  {rewardToast.type.toUpperCase().includes("GIFTICON") && (
                    <span className="mt-1 text-xs font-bold text-cc-gold/80 flex items-center gap-1">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-cc-gold" />
                      보상함에서 확인하세요
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col items-center gap-4 lg:flex-row lg:items-center lg:justify-center lg:gap-10">
          {/* Roulette Wheel */}
          <div
            className="relative flex w-full max-w-[360px] flex-col items-center justify-center lg:w-[360px] lg:flex-shrink-0 cursor-pointer"
            onClick={() => {
              if (!playMutation.isPending && !isSpinning && (isUnlimited || (data?.remaining_spins ?? 0) > 0) && !isOutOfTokens) {
                handlePlay();
              }
            }}
          >
            <RouletteWheel
              segments={segments}
              isSpinning={isSpinning}
              selectedIndex={selectedIndex}
              spinDurationMs={SPIN_DURATION_MS}
              onSpinEnd={handleSpinEnd}
            />
          </div>

          {usingFallbackSegments && (
            <div className="mt-4 flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/5 px-4 py-1.5 text-sm font-medium text-red-200">
              <span className="block h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
              라이브 데이터 연결 실패 (데모 모드)
            </div>
          )}

          {/* Controls & Info */}
          <div className="flex w-full max-w-[360px] flex-col gap-4 lg:w-[360px]">
            {/* Control Panel Card */}
            <div className="relative overflow-hidden rounded-[2rem] border border-white/15 bg-black/60 p-5 shadow-2xl">
              {/* Top Accent Line */}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#30FF75]/40 to-transparent" />

              {/* Status Badges */}
              <div className="mb-6">
                <div className="flex items-center gap-4 rounded-3xl border border-white/15 bg-black/50 px-[14px] py-[14px] shadow-xl">
                  <img
                    src={TABS.find(t => t.type === activeTab)?.iconImg || "/assets/asset_ticket_green.png"}
                    alt="Tickets"
                    className="h-12 w-12 object-contain"
                  />
                  <div className="flex flex-col leading-none">
                    <span className="text-xs font-black uppercase tracking-widest text-[#30FF75]/70">{tokenLabel}</span>
                    <span className="font-mono text-2xl font-bold text-white">
                      {tokenBalance !== null ? <AnimatedNumber value={tokenBalance} /> : "-"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Area */}
              <div className="space-y-4">
                {playErrorMessage && (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-200">
                    ⚠️ {playErrorMessage}
                  </div>
                )}

                {isOutOfTokens && (
                  <TicketZeroPanel
                    tokenType={data.token_type}
                    onClaimSuccess={() => {
                      queryClient.invalidateQueries({ queryKey: ["roulette-status"] });
                      setActiveTab("TRIAL_TOKEN");
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  })();

  return (
    <FeatureGate feature="ROULETTE">
      <GamePageShell title="럭셔리 CC룰렛" px="p-2 sm:p-4">
        <div className="mb-2 flex justify-center">
          <div className="inline-flex flex-wrap justify-center gap-2 rounded-2xl bg-white/5 p-2 backdrop-blur-md">
            {TABS.map((tab) => (
              <button
                key={tab.type}
                onClick={() => {
                  void handleTabClick(tab.type);
                }}
                className={clsx(
                  "group flex items-center justify-center rounded-xl px-3 py-2 text-sm font-bold transition-all duration-300",
                  activeTab === tab.type
                    ? tab.activeColors
                    : "text-white/40 hover:bg-white/5 hover:text-white"
                )}
                aria-label={tab.label.replace("\n", " ")}
                title={tab.label.replace("\n", " ")}
              >
                {tab.iconImg ? (
                  <img
                    src={tab.iconImg}
                    alt=""
                    className={clsx(
                      "h-6 w-6 object-contain transition-transform duration-300",
                      activeTab === tab.type && "scale-110"
                    )}
                  />
                ) : (
                  <span className={clsx("text-lg transition-transform duration-300", activeTab === tab.type && "scale-110")}>{tab.icon}</span>
                )}
              </button>
            ))}
          </div>
        </div>
        <div className="mb-3 text-center text-sm font-black text-white/80">
          {TABS.find((t) => t.type === activeTab)?.label.replace("\n", " ")}
        </div>
        {content}
      </GamePageShell>

      <VaultAccrualModal
        open={vaultModal.open}
        onClose={() => setVaultModal((prev) => ({ ...prev, open: false }))}
        amount={vaultModal.amount}
      />

      {premiumBlockedModal.open && (
        <div className="fixed inset-0 z-[10060] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#0A0A0A] shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-b from-amber-500/10 via-transparent to-transparent pointer-events-none" />

            <div className="relative p-6">
              <div className="text-[10px] font-black tracking-widest uppercase text-white/40">Premium Roulette</div>
              <h2 className="mt-1 text-2xl font-black text-white tracking-tight">이용이 제한되어 있어요</h2>

              <p className="mt-4 text-sm font-medium text-white/70 whitespace-pre-wrap leading-relaxed">
                {premiumBlockedModal.message ?? "현재 등급에서는 골드/다이아 룰렛을 이용할 수 없습니다."}
              </p>

              <div className="mt-6 space-y-2">
                <a
                  href="https://ccc-010.com"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="block w-full rounded-xl bg-amber-500/20 py-3 text-center text-sm font-black text-amber-200 border border-amber-500/30 hover:bg-amber-500/30 active:scale-[0.99] transition"
                >
                  CC 충전하러 가기
                </a>

                <button
                  type="button"
                  onClick={() => {
                    setPremiumBlockedModal({ open: false });
                    navigate("/landing", { replace: true });
                  }}
                  className="w-full rounded-xl bg-white/5 py-3 text-sm font-black text-white/80 border border-white/10 hover:bg-white/10 active:scale-[0.99] transition"
                >
                  메인(홈)으로 돌아가기
                </button>

                <button
                  type="button"
                  onClick={() => setPremiumBlockedModal({ open: false })}
                  className="w-full rounded-xl py-3 text-sm font-black text-white/50 hover:text-white/70 transition"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </FeatureGate>
  );
};

export default RoulettePage;
