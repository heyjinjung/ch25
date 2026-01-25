import React, { useState, useRef, useLayoutEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import gsap from "gsap";
import { getV2LotteryStatus, playV2Lottery } from "../../api/v1CompatAdapter";
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

  const containerRef = useRef<HTMLDivElement>(null);
  const ball1Ref = useRef<HTMLImageElement>(null);
  const ball2Ref = useRef<HTMLImageElement>(null);
  const ball3Ref = useRef<HTMLImageElement>(null);
  const ball4Ref = useRef<HTMLImageElement>(null);

  const queryClient = useQueryClient();

  // ============================================================================
  // API Queries
  // ============================================================================

  const { data, isLoading } = useQuery({
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
      const balls = [ball1Ref, ball2Ref, ball3Ref, ball4Ref];
      balls.forEach((ref, idx) => {
        if (!ref.current) return;

        gsap.to(ref.current, {
          x: `+=${8 + idx * 2}`,
          y: `-=${6 + idx}`,
          rotation: `+=${12 + idx * 3}`,
          duration: 1.6 + idx * 0.4,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });
      });
    });

    return () => ctx.revert();
  }, []);

  // ============================================================================
  // Play Handler
  // ============================================================================

  const handlePlay = async () => {
    if (isPlaying || isRevealed || !data || data.token_balance <= 0) return;

    try {
      triggerHaptic("heavy");
      setIsPlaying(true);

      // Intensive mixing animation
      [ball1Ref, ball2Ref, ball3Ref, ball4Ref].forEach((ref, idx) => {
        if (ref.current) {
          gsap.to(ref.current, {
            y: "random(-60, 60)",
            x: "random(-70, 70)",
            rotation: `random(-${120 + idx * 20}, ${120 + idx * 20})`,
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
    C1: data?.collectionProgress?.C1 ?? 0,
    C2: data?.collectionProgress?.C2 ?? 0,
    J: data?.collectionProgress?.J ?? 0,
    M: data?.collectionProgress?.M ?? 0,
  };

  return (
    <div className="lottery-redesign-container" ref={containerRef}>
      {/* Ball Arena Section */}
      <div className="ball-arena-container mt-4">
        <img
          ref={ball1Ref}
          src={`${ASSET_PATH}/Mix balls 3.png`}
          className="mixing-ball ball-1 w-[173px] blur-[2px]"
          alt=""
        />
        <img
          ref={ball2Ref}
          src={`${ASSET_PATH}/Mix balls 1.png`}
          className="mixing-ball ball-2 w-[128px] blur-[2px]"
          alt=""
        />
        <img
          ref={ball3Ref}
          src={`${ASSET_PATH}/Mix balls 4.png`}
          className="mixing-ball ball-3 w-[77px] blur-[2px]"
          alt=""
        />
        <img
          ref={ball4Ref}
          src={`${ASSET_PATH}/Mix balls 2.png`}
          className="mixing-ball ball-4 w-[100px] blur-[2px]"
          alt=""
        />
      </div>

      {/* Lotto Logo Area */}
      <div className="flex flex-col items-center gap-4 mt-4">
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
          className={`lotto-play-button ${isPlaying || (data?.token_balance ?? 0) <= 0 ? "disabled" : ""}`}
          onClick={isRevealed ? handleReset : handlePlay}
          disabled={isPlaying}
        >
          {isRevealed ? "NEXT GAME" : isPlaying ? "MIXING..." : "PLAY NOW"}
        </button>
      </div>

      {/* Result Modal - Using the new component */}
      <LotteryResultModal
        isOpen={isRevealed && !!revealedPrize}
        onClose={handleReset}
        onReset={handleReset}
        prizeLabel={revealedPrize?.label ?? "Try Again"}
      />

      <LotteryCollectionModal
        open={collectionModalOpen}
        onClose={() => setCollectionModalOpen(false)}
        collection={collection}
        onCraft={async () => {
          await new Promise((resolve) => setTimeout(resolve, 800));
          queryClient.invalidateQueries({ queryKey: ["v2-lottery-status"] });
        }}
      />
    </div>
  );
};

export default LotteryPage;
