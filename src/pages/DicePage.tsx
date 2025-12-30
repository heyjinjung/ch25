// src/pages/DicePage.tsx
import { useState } from "react";
import DiceView from "../components/game/DiceView";
import { useDiceStatus, usePlayDice } from "../hooks/useDice";
import FeatureGate from "../components/feature/FeatureGate";
import AnimatedNumber from "../components/common/AnimatedNumber";
import { tryHaptic } from "../utils/haptics";
import GamePageShell from "../components/game/GamePageShell";
import TicketZeroPanel from "../components/game/TicketZeroPanel";
import Button from "../components/common/Button";
import VaultAccrualModal from "../components/vault/VaultAccrualModal";
import { useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";

const DicePage: React.FC = () => {
  const { data, isLoading, isError } = useDiceStatus();
  const playMutation = usePlayDice();
  const queryClient = useQueryClient();
  const [result, setResult] = useState<"WIN" | "LOSE" | "DRAW" | null>(null);
  const [userDice, setUserDice] = useState<number[]>([]);
  const [dealerDice, setDealerDice] = useState<number[]>([]);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [rewardToast, setRewardToast] = useState<{ value: number; type: string } | null>(null);
  const [vaultModal, setVaultModal] = useState<{ open: boolean; amount: number }>({ open: false, amount: 0 });
  const [isRolling, setIsRolling] = useState(false);

  const mapErrorMessage = (err: unknown) => {
    const code = (err as { response?: { data?: { error?: { code?: string } } } })?.response?.data?.error?.code;
    if (code === "NO_FEATURE_TODAY") return "오늘 설정된 이벤트가 없습니다.";
    if (code === "INVALID_FEATURE_SCHEDULE") return "이벤트 스케줄이 잘못되었습니다. 지민이에게 문의하세요.";
    if (code === "FEATURE_DISABLED") return "이벤트가 비활성화되었습니다.";
    if (code === "DAILY_LIMIT_REACHED") return "오늘 참여 횟수를 모두 사용했습니다.";
    if (code === "NOT_ENOUGH_TOKENS") return "티켓이 부족합니다. 지민이에게 충전해달라고 떼써보세요!";
    return "배틀 준비 중 오류가 발생했습니다. 다시 시도해주세요.";
  };

  const isUnlimited = data?.remaining_plays === 0;
  const isOutOfTokens = typeof data?.token_balance === "number" && data.token_balance <= 0;

  const handlePlay = async () => {
    try {
      tryHaptic(12);
      setInfoMessage(null);
      setResult(null);
      setIsRolling(true);
      const response = await playMutation.mutateAsync();

      // Artificial delay for animation feel
      setTimeout(() => {
        setIsRolling(false);
        setResult(response.result);
        setUserDice(response.user_dice);
        setDealerDice(response.dealer_dice);
        setInfoMessage(response.message ?? null);
        const rewardValue = response.reward_value ? Number(response.reward_value) : 0;
        const rewardType = response.reward_type ?? "보상";
        const isXpReward = rewardType.toUpperCase().includes("XP") || rewardType.includes("레벨");

        if (response.result === "WIN" && rewardValue > 0 && !isXpReward) {
          setRewardToast({ value: rewardValue, type: rewardType });
          setTimeout(() => setRewardToast(null), 3000);
        }

        if ((response.vaultEarn ?? 0) > 0) {
          setVaultModal({ open: true, amount: response.vaultEarn! });
        }

        // Sync all statuses immediately after game results are shown/processed
        queryClient.invalidateQueries({ queryKey: ["lottery-status"] });
        queryClient.invalidateQueries({ queryKey: ["roulette-status"] });
        queryClient.invalidateQueries({ queryKey: ["dice-status"] });
        queryClient.invalidateQueries({ queryKey: ["vault-status"] });
        queryClient.invalidateQueries({ queryKey: ["season-pass-status"] });
        queryClient.invalidateQueries({ queryKey: ["team-leaderboard"] });
        queryClient.invalidateQueries({ queryKey: ["team-membership"] });
      }, 1000);
    } catch (e) {
      setIsRolling(false);
      console.error("Dice play failed", e);
    }
  };

  const content = (() => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center gap-6 py-20">
          <div className="relative h-16 w-16">
            <div className="absolute inset-0 animate-ping rounded-full bg-figma-accent/20" />
            <div className="h-full w-full animate-spin rounded-full border-4 border-figma-accent/70 border-t-transparent" />
          </div>
          <p className="text-lg font-black italic tracking-widest text-white/40 uppercase">전투 데이터 불러오는 중...</p>
        </div>
      );
    }

    if (isError || !data) {
      return (
        <div className="rounded-[2.5rem] border border-white/5 bg-white/5 p-12 text-center backdrop-blur-3xl">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-figma-accent/10">
            <img src="/assets/icon_help.png" className="w-12 h-12 object-contain" alt="Error" />
          </div>
          <p className="text-2xl font-black text-white">데이터 동기화 실패</p>
          <p className="mt-2 text-white/40">통신 상태를 확인하고 다시 입장해주세요.</p>
        </div>
      );
    }

    return (
      <div className="relative space-y-4">

        {/* Reward Alert */}
        {rewardToast && (
          <div className="fixed inset-x-0 top-24 z-[100] flex justify-center px-6 pointer-events-none">
            <div className="flex items-center gap-5 rounded-[2rem] border border-[#30FF75]/30 bg-black/80 px-8 py-5 shadow-[0_20px_60px_rgba(0,0,0,0.8)] backdrop-blur-2xl animate-fade-in-down">
              <img src="/assets/asset_coin_gold.png" alt="Reward" className="w-12 h-12 drop-shadow-[0_0_15px_rgba(255,215,0,0.5)]" />
              <div className="text-left">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#30FF75]">Victory Reward</p>
                <p className="text-2xl font-black text-white">
                  +<AnimatedNumber value={rewardToast.value} from={0} /> <span className="text-white/40">{rewardToast.type}</span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Top Info Bar (Premium Tickets) */}
        <div className="flex justify-center">
          <div className="group relative flex items-center gap-4 rounded-3xl border border-white/10 bg-white/5 px-8 py-2 backdrop-blur-xl transition-all hover:bg-white/10">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-[#30FF75]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <img src="/assets/icon_dice_silver.png" alt="Dice" className="h-7 w-7 object-contain" />
            <div className="flex flex-col">
              <span className="text-[9px] font-black uppercase tracking-widest text-[#30FF75]/70">Available Entries</span>
              <span className="text-lg font-black text-white">
                {data.token_balance.toLocaleString()} <span className="text-white/20 ml-1">TICKETS</span>
              </span>
            </div>
          </div>
        </div>

        {/* Battle Arena Frame */}
        <div className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-black/40 p-1 shadow-2xl backdrop-blur-md">
          {/* Glassy Inner Panel */}
          <div className="rounded-[2.3rem] bg-gradient-to-b from-white/5 to-transparent p-4 sm:p-8">
            <DiceView userDice={userDice} dealerDice={dealerDice} result={result} isRolling={isRolling} />
          </div>
        </div>

        {/* Action Controls */}
        <div className="mx-auto max-w-md space-y-6">
          {!!playMutation.error && !isRolling && (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-6 py-4 text-center text-sm font-bold text-red-200 backdrop-blur-md">
              <span className="mr-2">🚨</span> {mapErrorMessage(playMutation.error)}
            </div>
          )}

          {isOutOfTokens && (
            <TicketZeroPanel
              tokenType={data.token_type}
              onClaimSuccess={() => queryClient.invalidateQueries({ queryKey: ["dice-status"] })}
            />
          )}

          <Button
            type="button"
            disabled={isRolling || playMutation.isPending || (!isUnlimited && data.remaining_plays <= 0) || isOutOfTokens}
            onClick={handlePlay}
            variant="figma-primary"
            fullWidth
            className="rounded-2xl"
          >
            <div className="flex items-center justify-center gap-3">
              {isRolling || playMutation.isPending ? (
                <>
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  <span className="font-bold text-white">결과 확인 중...</span>
                </>
              ) : (
                <>
                  <img src="/assets/icon_dice_silver.png" className="w-6 h-6 object-contain" alt="" />
                  <span className="text-lg font-black tracking-wider text-white">
                    {result || infoMessage ? "다시 대결하기" : "주사위 굴리기"}
                  </span>
                </>
              )}
            </div>
          </Button>

          {infoMessage && !isRolling && result && (
            <div className={`text-center animate-fade-in-up px-6 py-4 rounded-2xl bg-white/5 border border-white/5`}>
              <p className="text-xs font-black uppercase text-white/30 tracking-widest mb-1">전투 기록</p>
              <p className={clsx(
                "text-lg font-black tracking-tight",
                result === 'WIN' ? 'text-[#30FF75]' : result === 'LOSE' ? 'text-red-400' : 'text-amber-400'
              )}>
                {infoMessage}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  })();

  return (
    <FeatureGate feature="DICE">
      <GamePageShell title="주사위 배틀" subtitle="SQUAD BATTLE ARENA">
        <div className="max-w-5xl mx-auto">
          {content}
        </div>
      </GamePageShell>

      <VaultAccrualModal
        open={vaultModal.open}
        amount={vaultModal.amount}
        onClose={() => setVaultModal(p => ({ ...p, open: false }))}
      />
    </FeatureGate>
  );
};

export default DicePage;
