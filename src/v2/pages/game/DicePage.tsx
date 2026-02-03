// src/pages/game/DicePage.tsx
import { useEffect, useMemo, useState, useRef, useLayoutEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getV2DiceStatus, playV2Dice } from "../../api/v2GameAdapter";
import { triggerHaptic, triggerNotification } from "../../utils/haptic";
import { useSound } from "../../../hooks/useSound";
import { useAuth } from "../../../auth/authStore";
import gsap from "gsap";
import "./DiceRedesign.css";
// Import the new 3D component
import ThreeDDice from "../../components/game/ThreeDDice";
import DiceRewardGrid from "../../components/game/DiceRewardGrid";
import DiceResultModal from "../../components/game/DiceResultModal";

const ASSET_PATH = "/v2/assets/03dice";

const DicePage = () => {
  const { user } = useAuth();
  const {
    playDiceShake,
    playDiceThrow,
    playDiceReveal,
    playSmallWin,
    playBigWin,
    playDiceLose,
  } = useSound();
  const [playerDice, setPlayerDice] = useState(1);
  const [opponentDice, setOpponentDice] = useState(1);
  const [isRolling, setIsRolling] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const auroraRef = useRef<HTMLDivElement>(null);

  const queryClient = useQueryClient();

  useLayoutEffect(() => {
    if (!containerRef.current || !auroraRef.current) return;

    const ctx = gsap.context(() => {
      gsap.to(containerRef.current, {
        "--aurora-1": "#ff2a6d",
        "--aurora-2": "#b1002a",
        "--aurora-3": "#120006",
        duration: 10,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });

      gsap.to(".dice-aurora-blob", {
        x: 20,
        y: -20,
        duration: 12,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        stagger: 1,
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const { data } = useQuery({
    queryKey: ["v2-dice-status"],
    queryFn: () => getV2DiceStatus(),
    staleTime: 10000,
    refetchOnWindowFocus: true,
  });

  const playMutation = useMutation({
    mutationFn: () => playV2Dice({ bet_amount: 1 }),
    onError: () => {
      triggerNotification("error");
      setIsRolling(false);
    },
  });

  const isPlayable = useMemo(() => {
    if (!data) return false;
    return (data.token_balance ?? 0) > 0;
  }, [data]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [lastOutcome, setLastOutcome] = useState<
    "WIN" | "LOAD" | "DRAW" | "LOSE" | null
  >(null);
  const [lastVaultEarn, setLastVaultEarn] = useState(0);
  const [currentIsGolden, setCurrentIsGolden] = useState(false);

  useEffect(() => {
    if (data?.is_golden_hour !== undefined) {
      setCurrentIsGolden(data.is_golden_hour);
    }
  }, [data?.is_golden_hour]);


  const rollDice = async () => {
    if (isRolling || !isPlayable) return;
    setIsRolling(true);
    // Removed old badge text update
    // setResultText("ROLLING...");
    triggerHaptic("medium");
    playDiceShake();

    // Note: The rolling animation is now handled internally by the ThreeDDice component
    // based on the isRolling prop.

    try {
      const result = await playMutation.mutateAsync();
      const game = result.game_data;

      playDiceThrow();

      if (game) {
        // Delay slightly to ensure layout update before landing starts if needed,
        // but React state update is usually enough.

        // We set the final values, and turn off rolling.
        // The ThreeDDice component will see isRolling=false + new value, and animate landing.
        setPlayerDice(game.user_dice[0] ?? 1);
        setOpponentDice(game.dealer_dice[0] ?? 1);

        // Let's keep isRolling true for a tiny bit longer if we want guaranteed spin time,
        // but the API latency usually provides that "suspense" time.
        // we prepare the modal data now
        const finalOutcome = game.outcome as "WIN" | "DRAW" | "LOSE";
        setLastOutcome(finalOutcome);
        // vault_earn이 0이면 game.reward_amount를 사용 (금고 적립/차감 표시)
        const displayEarn = result.vault_earn !== 0 ? result.vault_earn : (game.reward_amount ?? 0);
        setLastVaultEarn(displayEarn);
        setCurrentIsGolden(result.is_golden_hour || false);


        // Add 1 second delay for suspense before landing
        setTimeout(() => {
          setIsRolling(false); // This triggers the landing animation in ThreeDDice

          // Sound effects synchronization
          // Land animation takes about 0.8s in ThreeDDice
          setTimeout(() => {
            playDiceReveal();
            if (game.outcome === "WIN") {
              if (displayEarn > 50000) playBigWin();
              else playSmallWin();
            } else if (game.outcome === "LOSE") {
              playDiceLose();
            }

            // Open Modal after reveal animation
            setTimeout(() => {
              setIsModalOpen(true);
            }, 500);
          }, 800);
        }, 1000);
      } else {
        // Fallback for error state
        setIsRolling(false);
      }
      queryClient.invalidateQueries({ queryKey: ["v2-dice-status"] });
      queryClient.invalidateQueries({ queryKey: ["v2-vault-status"] });
      triggerNotification("success");
    } catch {
      setIsRolling(false);
    }
  };

  return (
    <div className="dice-page-v2" ref={containerRef}>
      {/* 잔여 카드 추가: 룰렛과 동일, stat-value만 레드계열 */}
      <div className="roulette-stat-card dice-stat-card">
        <span className="stat-label-small">잔여</span>
        <span className="stat-value text-red-400">
          {data?.token_balance ?? 0}
        </span>
      </div>
      <div className="dice-aurora-bg" ref={auroraRef}>
        <div className="dice-aurora-blob blob-1" />
        <div className="dice-aurora-blob blob-2" />
        <div className="dice-aurora-blob blob-3" />
      </div>

      <div className="branding-watermark">CC</div>

      <div className="dice-main-container">
        {/* Battle Section */}
        <div className="battle-cards-grid">
          {/* Player Card */}
          <div className="battle-card">
            <div className="dice-display">
              <ThreeDDice value={playerDice} isRolling={isRolling} size={80} />
            </div>
            <div className="dice-sub-button">
              <span className="player-nick">{user?.nickname || "YOU"}</span>
            </div>
          </div>

          {/* Opponent Card */}
          <div className="battle-card">
            <div className="dice-display">
              <ThreeDDice
                value={opponentDice}
                isRolling={isRolling}
                size={80}
              />
            </div>
            <div className="dice-sub-button">
              <img
                src={`${ASSET_PATH}/Frame 38.png`}
                alt="opponent"
                className="dice-character-small"
              />
            </div>
          </div>
        </div>

        {/* New Reward Grid - Moved here as requested */}
        {/* New Reward Grid - Explicit Wrapper */}
        <div className="w-full flex flex-col items-center justify-center shrink-0">
          <DiceRewardGrid status={data} />
        </div>

        {/* Action Buttons (Moved Up) */}
        <div className="dice-action-area w-full">
          <button
            className="spin-button-v2 w-full"
            onClick={rollDice}
            disabled={isRolling || !isPlayable}
          >
            {isRolling ? "던지는 중..." : "주사위 굴리기"}
          </button>
        </div>

        {/* Item Board (Preparing) - Moved Down */}
        <div className="w-full mt-2">
          <div className="item-board-card">
            <span className="item-board-text">아이템 준비중...</span>
          </div>
        </div>
      </div>

      {/* Result Modal */}
      <DiceResultModal
        isOpen={isModalOpen}
        outcome={lastOutcome as any}
        vaultEarn={lastVaultEarn}
        isGoldenHour={currentIsGolden}
        onClose={() => setIsModalOpen(false)}
      />

    </div>
  );
};

export default DicePage;
