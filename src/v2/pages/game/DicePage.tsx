// src/v2/pages/game/DicePage.tsx
import { useMemo, useState, useRef, useLayoutEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getV2DiceStatus, playV2Dice } from "../../api/v1CompatAdapter";
import { triggerHaptic, triggerNotification } from "../../utils/haptic";
import { useSound } from "../../../hooks/useSound";
import { useAuth } from "../../../auth/authStore";
import gsap from "gsap";
import "./DiceRedesign.css";

const ASSET_PATH = "/v2/assets/03dice";

const DicePage = () => {
  const { user } = useAuth();
  const { playDiceShake, playDiceThrow, playDiceReveal, playSmallWin, playBigWin, playDiceLose } = useSound();
  const [playerDice, setPlayerDice] = useState(1);
  const [opponentDice, setOpponentDice] = useState(1);
  const [isRolling, setIsRolling] = useState(false);
  const [resultText, setResultText] = useState("WAITING...");

  const playerDiceRef = useRef<HTMLImageElement>(null);
  const opponentDiceRef = useRef<HTMLImageElement>(null);
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

  const getDiceImage = (val: number) =>
    `${ASSET_PATH}/img_dice_side_{[${val}]}.png`;

  const rollDice = async () => {
    if (isRolling || !isPlayable) return;
    setIsRolling(true);
    setResultText("ROLLING...");
    triggerHaptic("medium");
    playDiceShake();

    // GSAP Animation Sequence
    const tl = gsap.timeline({ repeat: -1 });
    tl.to([playerDiceRef.current, opponentDiceRef.current], {
      rotation: "+=360",
      y: -20,
      scale: 1.1,
      duration: 0.15,
      ease: "power1.inOut",
      onRepeat: () => {
        setPlayerDice(Math.floor(Math.random() * 6) + 1);
        setOpponentDice(Math.floor(Math.random() * 6) + 1);
      },
    });

    try {
      const result = await playMutation.mutateAsync();
      const game = result.game_data;

      tl.kill(); // Stop the fast rolling
      playDiceThrow();

      if (game) {
        // Final "Land" Animation
        gsap.to([playerDiceRef.current, opponentDiceRef.current], {
          rotation: 0,
          y: 0,
          scale: 1,
          duration: 0.4,
          ease: "back.out(1.7)",
          onComplete: () => {
            playDiceReveal();
            setPlayerDice(game.user_dice[0]);
            setOpponentDice(game.dealer_dice[0]);
            setResultText(
              game.outcome === "WIN"
                ? "WIN"
                : game.outcome === "DRAW"
                  ? "DRAW"
                  : "LOSE",
            );
            
            if (game.outcome === "WIN") {
              if (result.vault_earn > 50000) playBigWin();
              else playSmallWin();
            } else if (game.outcome === "LOSE") {
              playDiceLose();
            }
          },
        });
      } else {
        setResultText("NO RESULT");
      }
      queryClient.invalidateQueries({ queryKey: ["v2-dice-status"] });
      triggerNotification("success");
    } catch {
      tl.kill();
      setResultText("ERROR");
    } finally {
      setIsRolling(false);
    }
  };

  return (
    <div className="dice-page-v2" ref={containerRef}>
      <div className="dice-aurora-bg" ref={auroraRef}>
        <div className="dice-aurora-blob blob-1" />
        <div className="dice-aurora-blob blob-2" />
        <div className="dice-aurora-blob blob-3" />
      </div>

      <div className="dice-main-container">
        {/* Battle Section */}
        <div className="battle-cards-grid">
          {/* Player Card */}
          <div className="battle-card">
            <div className="dice-display">
              <img
                ref={playerDiceRef}
                src={getDiceImage(playerDice)}
                alt="player dice"
                className="dice-img"
              />
            </div>
            <div className="dice-sub-button">
              <span className="player-nick">{user?.nickname || "YOU"}</span>
            </div>
          </div>

          {/* Opponent Card */}
          <div className="battle-card">
            <div className="dice-display">
              <img
                ref={opponentDiceRef}
                src={getDiceImage(opponentDice)}
                alt="opponent dice"
                className="dice-img"
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

        {/* Status/Outcome Display */}
        <div className="dice-outcome-badge">{resultText}</div>

        {/* Action Buttons */}
        <div className="dice-action-area">
          <button
            className="spin-button-v2"
            onClick={rollDice}
            disabled={isRolling || !isPlayable}
          >
            {isRolling ? "ROLLING..." : "SPIN"}
          </button>

          <div className="item-board-card">
            <span className="item-board-text">아이템 준비중</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DicePage;
