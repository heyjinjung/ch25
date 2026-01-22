import React, { useState, useRef, useLayoutEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import gsap from "gsap";
import { getV2LotteryStatus, playV2Lottery } from "../../api/v1CompatAdapter";
import LotteryCollectionModal from "../../components/lottery/LotteryCollectionModal";
import { triggerHaptic, triggerNotification } from "../../utils/haptic";

// 이미지 임포트
import lottoBall1 from "../../assets/05lotto/lotto1.png";
import lottoBall2 from "../../assets/05lotto/lotto2.png";
import lottoBall3 from "../../assets/05lotto/lotto6.png";
import lottoLogo from "../../assets/05lotto/lotto-horizontal-10.png";

// ============================================================================
// Prize Interface
// ============================================================================

interface Prize {
  id: number;
  label: string;
  reward_type: string;
  reward_amount: string | number;
  stock?: number | null;
}

// ============================================================================
// Lottery Page
// ============================================================================

const LotteryPage: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [revealedPrize, setRevealedPrize] = useState<Prize | null>(null);
  const [collectionModalOpen, setCollectionModalOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const ball1Ref = useRef<HTMLImageElement>(null);
  const ball2Ref = useRef<HTMLImageElement>(null);
  const ball3Ref = useRef<HTMLImageElement>(null);
  const glowRef1 = useRef<HTMLDivElement>(null);

  // Placeholder for recent winners (Simulated for UI)
  const [winners] = useState([
    { name: "test***", prize: "다이아열쇠" },
    { name: "kim2***", prize: "치킨 기프티콘" },
    { name: "lucky***", prize: "10,000 CC" },
  ]);

  const queryClient = useQueryClient();

  // Balance count-up state
  const balanceDisplayRef = useRef<HTMLSpanElement>(null);
  const counterObj = useRef({ value: 0 });

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
      // Background Glow Pulsing
      if (glowRef1.current) {
        gsap.to(glowRef1.current, {
          opacity: 0.8,
          scale: 1.05,
          duration: 3,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });
      }

      // Ball Floating
      [ball1Ref, ball2Ref, ball3Ref].forEach((ref, idx) => {
        if (ref.current) {
          gsap.to(ref.current, {
            y: idx === 0 ? -15 : idx === 1 ? -10 : -5,
            rotation: idx === 0 ? 5 : -5,
            duration: 2 + idx * 0.5,
            repeat: -1,
            yoyo: true,
            ease: "power1.inOut",
          });
        }
      });

      // Balance Count-up
      if (data && balanceDisplayRef.current) {
        const targetValue = data.token_balance || 0;
        gsap.to(counterObj.current, {
          value: targetValue,
          duration: 1,
          ease: "power2.out",
          onUpdate: () => {
            if (balanceDisplayRef.current) {
              balanceDisplayRef.current.innerText = Math.floor(counterObj.current.value).toLocaleString();
            }
          },
        });
      }
    });

    return () => ctx.revert();
  }, [data?.token_balance]);

  // ============================================================================
  // Play Handler
  // ============================================================================

  const handlePlay = async () => {
    if (isPlaying || isRevealed || !data || data.token_balance <= 0) return;

    try {
      triggerHaptic("heavy");
      setIsPlaying(true);

      // Animation for balls
      [ball1Ref, ball2Ref, ball3Ref].forEach((ref) => {
        if (ref.current) {
          gsap.to(ref.current, {
            y: "random(-40, 40)",
            x: "random(-30, 30)",
            rotation: "random(-90, 90)",
            duration: 0.2,
            repeat: 10,
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
          setRevealedPrize({
            id: prize.id,
            label: prize.label,
            reward_type: prize.reward_type,
            reward_amount: prize.reward_amount,
          });

          if (prize.reward_type !== "NONE") {
            triggerNotification("success");
            confetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6 },
              colors: ["#30E3AA", "#FFD700", "#121214"],
            });
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
      <div className="relative w-[380px] h-[680px] bg-[#121214] mx-auto flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#30E3AA] border-t-transparent" />
          <p className="text-xs font-bold text-white/40 uppercase tracking-widest">Loading Lottery...</p>
        </div>
      </div>
    );
  }

  const collection = {
    C1: data?.collectionProgress?.C1 ?? 0,
    C2: data?.collectionProgress?.C2 ?? 0,
    J: data?.collectionProgress?.J ?? 0,
    M: data?.collectionProgress?.M ?? 0,
  };

  const isOutOfTokens = (data?.token_balance ?? 0) <= 0;
  const canPlay = !isPlaying && !playMutation.isPending && !isOutOfTokens && !isRevealed;

  return (
    <div
      ref={containerRef}
      className="relative w-[380px] h-[680px] mx-auto overflow-hidden bg-[#121214]"
    >
      {/* Background Glow */}
      <div
        ref={glowRef1}
        className="absolute top-[-10%] left-[-20%] w-[140%] h-[120%] opacity-40 pointer-events-none"
        style={{
          background: "radial-gradient(circle at 50% 50%, rgba(48, 227, 170, 0.15) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />

      {/* Header */}
      <div className="relative z-30 px-4 pt-6 flex justify-between items-center">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 px-4 py-2 rounded-xl flex flex-col">
          <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-0.5">My Tickets</span>
          <span className="text-lg font-black text-white leading-none">
            <span ref={balanceDisplayRef}>0</span>
            <span className="ml-1 text-xs opacity-40 font-bold">T</span>
          </span>
        </div>
        <img src={lottoLogo} alt="LOTTO" className="h-8 object-contain" />
      </div>

      {/* Winner Ticker */}
      <div className="relative z-30 px-4 mt-4">
        <div className="bg-[#121214]/60 backdrop-blur-md border border-white/5 h-8 rounded-full flex items-center px-4 overflow-hidden">
          <div className="flex animate-marquee whitespace-nowrap gap-8">
            {winners.map((w, idx) => (
              <div key={idx} className="flex gap-2 items-center text-[10px] font-bold">
                <span className="text-white/40">{w.name}</span>
                <span className="text-[#30E3AA]">Win {w.prize}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Visual Area */}
      <div className="relative h-[240px] mt-4">
        <motion.img ref={ball1Ref} src={lottoBall1} className="absolute z-20 w-44 h-44 left-10 bottom-4 pointer-events-none" style={{ filter: "drop-shadow(0 20px 40px rgba(0,0,0,0.4))" }} />
        <motion.img ref={ball2Ref} src={lottoBall2} className="absolute z-30 w-32 h-32 right-12 top-10 pointer-events-none" style={{ filter: "drop-shadow(0 15px 30px rgba(0,0,0,0.3))" }} />
        <motion.img ref={ball3Ref} src={lottoBall3} className="absolute z-10 w-20 h-20 left-32 top-12 pointer-events-none opacity-60" style={{ filter: "blur(1px)" }} />
      </div>

      {/* Action Area */}
      <div className="relative z-30 px-4 mt-[-20px]">
        {/* Jackpot / Remaining Info */}
        <div className="bg-gradient-to-br from-white/10 to-transparent backdrop-blur-2xl border border-white/10 rounded-2xl p-4 mb-4">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Today's Remaining Prizes</p>
              <p className="text-2xl font-black text-white">4,250,500 <span className="text-sm opacity-50">CC</span></p>
            </div>
            <button
                onClick={() => setCollectionModalOpen(true)}
                className="bg-[#30E3AA]/20 border border-[#30E3AA]/30 px-3 py-1.5 rounded-lg text-[10px] font-black text-[#30E3AA] uppercase tracking-wider"
            >
                Collection
            </button>
          </div>
        </div>

        {/* Play Button */}
        <button
          onClick={() => (isRevealed ? handleReset() : handlePlay())}
          disabled={!canPlay && !isRevealed}
          className="w-full relative overflow-hidden h-16 rounded-2xl font-black text-lg transition-all active:scale-95 disabled:opacity-50"
          style={{
            background: isRevealed ? "white" : "linear-gradient(135deg, #30E3AA 0%, #10B981 100%)",
            color: isRevealed ? "#000" : "#000",
            boxShadow: isRevealed ? "0 10px 30px rgba(255,255,255,0.2)" : "0 10px 30px rgba(48, 227, 170, 0.3)",
          }}
        >
          {isRevealed ? "NEXT DRAW" : isPlaying ? "DRAWING..." : "PLAY NOW"}
        </button>

        {/* Result Animation */}
        <AnimatePresence>
          {isRevealed && revealedPrize && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute inset-x-4 top-0 h-16 bg-white rounded-2xl flex items-center justify-center gap-4 z-40 pointer-events-none"
            >
                <span className="text-xs font-black text-black/40 uppercase">You Won</span>
                <span className="text-lg font-black text-black">{revealedPrize.label}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Prize Shelf Overlay (Mini) */}
      <div className="absolute bottom-0 inset-x-0 h-44 bg-gradient-to-t from-[#121214] via-[#121214]/90 to-transparent z-40 px-4 pt-10">
        <div className="flex justify-between items-center mb-4">
            <h4 className="text-[10px] font-black text-white/40 uppercase tracking-widest">Prize Catalog</h4>
            <div className="h-px bg-white/10 flex-1 mx-4" />
        </div>
        <div className="flex gap-3 overflow-x-auto pb-6 scrollbar-hide">
            {data?.prizes?.map((prize: Prize) => (
                <div key={prize.id} className="flex-shrink-0 w-24 h-24 bg-white/5 border border-white/5 rounded-xl p-3 flex flex-col justify-between items-center text-center">
                    <span className="text-2xl">🎁</span>
                    <p className="text-[9px] font-bold text-white/80 line-clamp-1">{prize.label}</p>
                    <span className="text-[8px] font-black text-[#30E3AA]">{prize.reward_type === 'NONE' ? 'TRY' : 'GET'}</span>
                </div>
            ))}
        </div>
      </div>

      <LotteryCollectionModal
        open={collectionModalOpen}
        onClose={() => setCollectionModalOpen(false)}
        collection={collection}
        onCraft={async () => {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          queryClient.invalidateQueries({ queryKey: ["v2-lottery-status"] });
        }}
      />
    </div>
  );
};

export default LotteryPage;
