// src/pages/game/LotteryPage.tsx
import React, { useEffect, useState, useRef, useLayoutEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
import { getV2LotteryStatus, playV2Lottery } from "../../api/v1CompatAdapter";
import { useSound } from "../../../hooks/useSound";
import LotteryCollectionModal from "../../components/lottery/LotteryCollectionModal";
import { triggerHaptic, triggerNotification } from "../../utils/haptic";
import "./LotteryRedesign.css";

const ASSET_PATH = "/assets/04lotto";

const LotteryPage: React.FC = () => {
  const { playLotteryScratch, stopLotteryScratch, playLotteryWin } = useSound();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [revealedPrize, setRevealedPrize] = useState<any | null>(null);
  const [collectionModalOpen, setCollectionModalOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const ball1Ref = useRef<HTMLImageElement>(null);
  const ball2Ref = useRef<HTMLImageElement>(null);
  const ball3Ref = useRef<HTMLImageElement>(null);
  const ball4Ref = useRef<HTMLImageElement>(null);
  const idleTweensRef = useRef<gsap.core.Tween[]>([]);

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
      // Aurora Background Animation
      gsap.to(containerRef.current, {
        "--aurora-1": "#37EBFF",
        "--aurora-2": "#1C6EFF",
        "--aurora-3": "#06102F",
        duration: 10,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });

      gsap.to(".lottery-aurora-blob", {
        x: -20,
        y: 20,
        duration: 15,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        stagger: 0.9,
      });

      const balls = [ball1Ref, ball2Ref, ball3Ref, ball4Ref];
      idleTweensRef.current = balls
        .map((ref, idx) => {
          if (!ref.current) return;

          return gsap.to(ref.current, {
            x: `+=${8 + idx * 2}`,
            y: `-=${6 + idx}`,
            rotation: `+=${12 + idx * 3}`,
            scale: 1.02 + idx * 0.005,
            duration: 1.6 + idx * 0.4,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut",
          });
        })
        .filter(Boolean) as gsap.core.Tween[];
    });

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    idleTweensRef.current.forEach((tween) => tween.paused(isPlaying));
  }, [isPlaying]);

  // ============================================================================
  // Play Handler
  // ============================================================================

  const handlePlay = async () => {
    if (isPlaying || isRevealed || !data || data.token_balance <= 0) return;

    try {
      triggerHaptic("heavy");
      playLotteryScratch();
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
        stopLotteryScratch();
        setIsPlaying(false);
        setIsRevealed(true);

        const prize = result.game_data?.prize;
        if (prize) {
          setRevealedPrize(prize);
          if (prize.reward_type !== "NONE") {
            triggerNotification("success");
            playLotteryWin();
          }
        }

        queryClient.invalidateQueries({ queryKey: ["v2-lottery-status"] });
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
      <div className="lottery-aurora-bg">
        <div className="lottery-aurora-blob blob-1" />
        <div className="lottery-aurora-blob blob-2" />
        <div className="lottery-aurora-blob blob-3" />
      </div>

      {/* Ball Arena Section */}
      <div className="ball-arena-container mt-4">
        <img
          ref={ball1Ref}
          src={`${ASSET_PATH}/Mix balls 3.png`}
          className="mixing-ball ball-1 w-[192px]"
          alt=""
        />
        <img
          ref={ball2Ref}
          src={`${ASSET_PATH}/Mix balls 1.png`}
          className="mixing-ball ball-2 w-[144px]"
          alt=""
        />
        <img
          ref={ball3Ref}
          src={`${ASSET_PATH}/Mix balls 4.png`}
          className="mixing-ball ball-3 w-[88px]"
          alt=""
        />
        <img
          ref={ball4Ref}
          src="/assets/01home/5.png"
          className="mixing-ball ball-4 w-[100px] h-[100px]"
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

      {/* Prize List Section */}
      {data && data.prizes && (
        <div className="lottery-prize-section">
          <div className="lottery-prize-header">
            <h3>?�첨 가??경품 리스??/h3>
            <span className="lottery-prize-count">Total {data.prizes.length} Items</span>
          </div>

          <div className="lottery-prize-grid">
            {data.prizes.slice(0, 12).map((prize: any) => (
              <div
                key={prize.id}
                className={`lottery-prize-item ${prize.is_active === false ? "inactive" : ""}`}
              >
                <div className="prize-item-bg">
                  <img src="/assets/04lotto/Mix balls 1.png" className="w-full h-full object-cover" alt="" />
                </div>

                <div className="prize-icon-container">
                  <img src="/assets/04lotto/Mix balls 2.png" className="prize-icon" alt="" />
                </div>

                <div className="prize-info">
                  <span className="prize-label">{prize.label}</span>
                  <span className="prize-reward">
                    {prize.reward_amount.toLocaleString()} 
                    {prize.reward_type.includes("POINT") ? "P" : " XP"}
                  </span>
                </div>

                {prize.stock !== null && (
                  <div className="prize-stock-badge">
                    <div className="stock-dot" />
                    <span className="stock-count">{prize.stock}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Result Layer */}
      <AnimatePresence>
        {isRevealed && revealedPrize && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none"
          >
            <div className="bg-black/80 backdrop-blur-xl px-10 py-6 rounded-3xl border border-white/10 flex flex-col items-center gap-2">
              <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">
                Game Result
              </span>
              <span className="text-3xl font-black text-white text-center">
                {revealedPrize.label}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
