import React, { useState, useRef, useLayoutEffect, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import gsap from "gsap";
import {
  getV2LotteryStatus,
  playV2Lottery,
  craftPuzzleToGoldKey,
} from "../../api/v2GameAdapter";
import { useSound } from "../../../hooks/useSound";
import LotteryCollectionModal from "../../components/lottery/LotteryCollectionModal";
import LotteryResultModal from "../../components/game/LotteryResultModal";
import { triggerHaptic, triggerNotification } from "../../utils/haptic";
import "./LotteryRedesign.css";

const ASSET_PATH = "/v2/assets/04lotto";

const LotteryPage: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [revealedPrize, setRevealedPrize] = useState<any | null>(null);
  const [collectionModalOpen, setCollectionModalOpen] = useState(false);
  const { startLotteryBgm, startMainBgm, playLottoPlay, stopLottoPlay } =
    useSound();

  const containerRef = useRef<HTMLDivElement>(null);
  // Ref array for multiple balls
  const ballsRef = useRef<HTMLImageElement[]>([]);

  const queryClient = useQueryClient();

  // ============================================================================
  // API Queries
  // ============================================================================

  const { data: status, isLoading } = useQuery({
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
  // GSAP Animations
  // ============================================================================

  useLayoutEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      // Animate all balls in the ref array
      ballsRef.current.forEach((ball, idx) => {
        if (!ball) return;

        // Randomize initial float parameters for more natural look
        const randomDur = 1.5 + Math.random() * 1.5;
        const randomX = 5 + Math.random() * 10;
        const randomY = 3 + Math.random() * 8;

        gsap.to(ball, {
          x: `+=${randomX}`,
          y: `-=${randomY}`,
          rotation: `+=${10 + Math.random() * 20}`,
          duration: randomDur,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          delay: idx * 0.1, // Stagger start
        });
      });
    });

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    return () => {
      stopLottoPlay();
      startMainBgm();
    };
  }, [startMainBgm, stopLottoPlay]);

  // ============================================================================
  // Play Handler
  // ============================================================================

  const handlePlay = async () => {
    if (isPlaying || isRevealed || !status || status.token_balance <= 0) return;

    try {
      triggerHaptic("heavy");
      startLotteryBgm();
      playLottoPlay();
      setIsPlaying(true);

      // Intensive mixing animation for ALL balls
      ballsRef.current.forEach((ball, idx) => {
        if (ball) {
          gsap.to(ball, {
            y: "random(-60, 60)",
            x: "random(-70, 70)",
            rotation: `random(-${120 + idx * 10}, ${120 + idx * 10})`,
            duration: 0.12,
            repeat: 14,
            yoyo: true,
            ease: "power2.inOut",
          });
        }
      });

      const result = await playMutation.mutateAsync();

      setTimeout(() => {
        setIsPlaying(false);
        setIsRevealed(true);
        stopLottoPlay();
        startMainBgm();

        const prize = result.game_data?.prize;
        if (prize) {
          setRevealedPrize(prize);
          if (prize.reward_type !== "NONE") {
            triggerNotification("success");
          }
        }

        queryClient.invalidateQueries({ queryKey: ["v2-lottery-status"] });
        queryClient.invalidateQueries({ queryKey: ["v2-vault-status"] });
      }, 2000);
    } catch (err) {
      console.error("[LotteryPage] Play error:", err);
      setIsPlaying(false);
    }
  };

  const handleReset = () => {
    setIsRevealed(false);
    setRevealedPrize(null);
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-black">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#37EBFF] border-t-transparent" />
      </div>
    );
  }

  const collection = {
    C1: status?.collectionProgress?.C1 ?? 0,
    C2: status?.collectionProgress?.C2 ?? 0,
    J: status?.collectionProgress?.J ?? 0,
    M: status?.collectionProgress?.M ?? 0,
  };

  return (
    <div className="lottery-redesign-container" ref={containerRef}>
      {/* Aurora BG: 전체 배경에만 적용, 버튼 중첩 방지 */}
      <div className="lottery-aurora-bg">
        <div className="lottery-aurora-blob blob-1" />
        <div className="lottery-aurora-blob blob-2" />
        <div className="lottery-aurora-blob blob-3" />
      </div>
      <div className="branding-watermark">CC</div>

      {/* 1. Header Stats: Standardized Glassmorphism */}
      <div className="lottery-stats-row">
        <div className="lottery-stat-card">
          <span className="stat-label-small">잔여</span>
          <span className="stat-value text-sky-400">
            {status?.token_balance?.toLocaleString() ?? 0}
          </span>
        </div>
      </div>

      {/* Ball Arena Section */}
      <div className="ball-arena-container mt-4">
        {/* User Requested Inner Container */}
        <div className="ball-inner-container">
          {/* Balls - Increased to 10 for density */}
          {[
            { src: "Mix balls 3.png", cls: "ball-1 w-[173px] blur-[2px]" },
            { src: "Mix balls 1.png", cls: "ball-2 w-[128px] blur-[2px]" },
            { src: "Mix balls 4.png", cls: "ball-3 w-[77px] blur-[2px]" },
            { src: "Mix balls 2.png", cls: "ball-4 w-[100px] blur-[2px]" },
            { src: "Mix balls 1.png", cls: "ball-5" }, // Extra
            { src: "Mix balls 2.png", cls: "ball-6" }, // Extra
            { src: "Mix balls 3.png", cls: "ball-7" }, // Extra
            { src: "Mix balls 4.png", cls: "ball-8" }, // Extra
            { src: "Mix balls 1.png", cls: "ball-9" }, // Deep Background
            { src: "Mix balls 2.png", cls: "ball-10" }, // Deep Background
          ].map((ball, idx) => (
            <img
              key={`ball-${idx}`}
              ref={(el) => {
                if (el) ballsRef.current[idx] = el;
              }}
              src={`${ASSET_PATH}/${ball.src}`}
              className={`mixing-ball ${ball.cls}`}
              alt=""
            />
          ))}
        </div>
      </div>

      {/* Lotto Logo Area: Grouped with Arena */}
      <div className="lotto-logo-wrapper">
        <img
          src={`${ASSET_PATH}/Lotto_Horizontal 1.png`}
          className="lotto-logo-img"
          alt="LOTTO"
        />
      </div>

      {/* Action Area */}
      <div className="lottery-action-section">
        <div className="flex w-full justify-center px-8">
          <button
            onClick={() => setCollectionModalOpen(true)}
            className="lotto-collection-button"
          >
            View Collection
          </button>
        </div>

        <button
          className={`lotto-play-button ${isPlaying || (status?.token_balance ?? 0) <= 0 ? "disabled" : ""}`}
          onClick={isRevealed ? handleReset : handlePlay}
          disabled={isPlaying}
          /* Aurora 효과 중첩 방지: 버튼 내부 오로라 절대 추가 금지 */
        >
          {isRevealed ? "다음 게임" : isPlaying ? "섞는 중..." : "시작하기"}
        </button>
      </div>

      {/* Result Modal - Using the new component */}
      <LotteryResultModal
        isOpen={isRevealed && !!revealedPrize}
        onClose={handleReset}
        onReset={handleReset}
        prizeLabel={revealedPrize?.label ?? "Try Again"}
        rewardType={revealedPrize?.reward_type ?? "NONE"}
        rewardAmount={revealedPrize?.reward_amount ?? 0}
      />

      <LotteryCollectionModal
        open={collectionModalOpen}
        onClose={() => setCollectionModalOpen(false)}
        collection={collection}
        onCraft={async () => {
          try {
            await craftPuzzleToGoldKey();
            triggerNotification("success");
            // 상태 갱신: 복권 상태 + 금고 잔액
            queryClient.invalidateQueries({ queryKey: ["v2-lottery-status"] });
            queryClient.invalidateQueries({ queryKey: ["v2-vault-status"] });
            queryClient.invalidateQueries({ queryKey: ["v2-user-me"] });
          } catch (error) {
            console.error("[LotteryPage] Craft failed:", error);
            triggerNotification("error");
            throw error;
          }
        }}
      />
    </div>
  );
};

export default LotteryPage;
