// src/pages/DicePage.tsx
import React, { useState } from "react";
import DiceView from "../components/game/DiceView";
import { useDiceStatus, usePlayDice } from "../hooks/useDice";
import FeatureGate from "../components/feature/FeatureGate";
import { tryHaptic } from "../utils/haptics";
import GamePageShell from "../components/game/GamePageShell";
import TicketZeroPanel from "../components/game/TicketZeroPanel";
import Button from "../components/common/Button";
import VaultAccrualModal from "../components/vault/VaultAccrualModal";
import { useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { useSound } from "../hooks/useSound";

const DicePage: React.FC = () => {
  const { data, isLoading, isError } = useDiceStatus();
  const { playDiceShake, playDiceThrow, playToast } = useSound();
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
      playDiceShake(); // Sound: Start Shake
      const response = await playMutation.mutateAsync();

      // Artificial delay for animation feel
      setTimeout(() => {
        setIsRolling(false);
        playDiceThrow(); // Sound: Land/Reveal
        setResult(response.result);
        setUserDice(response.user_dice);
        setDealerDice(response.dealer_dice);
        setInfoMessage(response.message ?? null);
        const rewardValue = response.reward_value ? Number(response.reward_value) : 0;
        const rewardType = response.reward_type ?? "보상";

        // Strict Whitelist for Reward Toast
        const ALLOWED_TYPES = ["TICKET", "COUPON", "KEY", "TOKEN"];
        const isAllowedReward = ALLOWED_TYPES.some(t => rewardType.toUpperCase().includes(t));

        if (response.result === "WIN" && rewardValue > 0 && isAllowedReward) {
          setRewardToast({ value: rewardValue, type: rewardType });
          playToast(); // Sound: Victory/Reward
          setTimeout(() => setRewardToast(null), 3000);
        }

        if ((response.vaultEarn ?? 0) > 0) {
          setVaultModal({ open: true, amount: response.vaultEarn! });
        }

        // Sync all statuses immediately
        queryClient.invalidateQueries({ queryKey: ["dice-status"] });
        queryClient.invalidateQueries({ queryKey: ["vault-status"] });
        queryClient.invalidateQueries({ queryKey: ["season-pass-status"] });
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
      <div className="relative space-y-4 max-w-lg mx-auto">
        {/* Compressed Layout Group */}
        <div className="flex flex-col gap-2">
          {/* Top Ticket Info - Made smaller and integrated */}
          <div className="flex justify-center -mb-4 z-10">
            <div className="flex items-center gap-3 rounded-full border border-white/10 bg-black/60 px-5 py-1 backdrop-blur-md shadow-lg">
              <img src="/assets/icon_dice_silver.png" alt="Dice" className="h-4 w-4 object-contain" />
              <span className="text-xs font-bold text-white">
                {data.token_balance.toLocaleString()} <span className="text-[10px] text-white/40">TICKETS</span>
              </span>
            </div>
          </div>

          {/* Battle Arena - Comact Height */}
          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-black/40 p-1 shadow-2xl backdrop-blur-md">
            <div className="rounded-[1.8rem] bg-gradient-to-b from-white/5 to-transparent p-4 min-h-[320px] flex flex-col justify-center">
              <DiceView userDice={userDice} dealerDice={dealerDice} result={result} isRolling={isRolling} />

              {/* Result Message Overlay */}
              {infoMessage && !isRolling && result && (
                <div className="mt-4 text-center animate-fade-in-up">
                  <p className={clsx(
                    "text-lg font-black tracking-tight drop-shadow-md",
                    result === 'WIN' ? 'text-[#30FF75]' : result === 'LOSE' ? 'text-red-400' : 'text-amber-400'
                  )}>
                    {infoMessage}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Button - Compact */}
        <div className="relative z-20">
          {!!playMutation.error && !isRolling && (
            <div className="mb-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-center text-xs font-bold text-red-200">
              <span className="mr-2">🚨</span> {mapErrorMessage(playMutation.error)}
            </div>
          )}

          {isOutOfTokens && (
            <div className="mb-2">
              <TicketZeroPanel
                tokenType={data.token_type}
                onClaimSuccess={() => queryClient.invalidateQueries({ queryKey: ["dice-status"] })}
              />
            </div>
          )}

          <Button
            type="button"
            disabled={isRolling || playMutation.isPending || (!isUnlimited && data.remaining_plays <= 0) || isOutOfTokens}
            onClick={handlePlay}
            variant="figma-primary"
            fullWidth
            className="rounded-xl py-3 transform active:scale-95 transition-transform"
          >
            <div className="flex items-center justify-center gap-2">
              {isRolling || playMutation.isPending ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  <span className="font-bold text-white text-sm">Rolling...</span>
                </>
              ) : (
                <>
                  <span className="text-base font-black tracking-wider text-white">
                    {result ? "RETRY" : "ROLL DICE"}
                  </span>
                </>
              )}
            </div>
          </Button>
        </div>

        {/* Reward Alert - Adjusted Position */}
        {rewardToast && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] w-full px-4 pointer-events-none">
            <div className="flex flex-col items-center justify-center gap-2 rounded-[2rem] border border-[#30FF75]/30 bg-black/90 px-6 py-6 shadow-[0_0_50px_rgba(48,255,117,0.3)] backdrop-blur-3xl animate-bounce-subtle">
              <img src="/assets/asset_coin_gold.png" alt="Reward" className="w-16 h-16 drop-shadow-[0_0_20px_rgba(255,215,0,0.6)]" />
              <div className="text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#30FF75]">YOU WON</p>
                <p className="text-3xl font-black text-white leading-none mt-1">
                  +{rewardToast.value}
                </p>
                <p className="text-xs font-bold text-white/50">{rewardToast.type}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  })();

  return (
    <FeatureGate feature="DICE">
      <GamePageShell title="주사위 배틀">
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
