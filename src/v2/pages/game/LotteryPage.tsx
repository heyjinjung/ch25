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
  const glowRef2 = useRef<HTMLDivElement>(null);

  const queryClient = useQueryClient();

  // ============================================================================
  // GSAP Animations
  // ============================================================================

  useLayoutEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      // 공 1 (흰색) - 부드러운 부유
      if (ball1Ref.current) {
        gsap.to(ball1Ref.current, {
          y: -15,
          x: 5,
          rotation: 5,
          duration: 2.5,
          repeat: -1,
          yoyo: true,
          ease: "power1.inOut",
        });
      }

      // 공 2 (빨간색) - 다른 리듬의 부유
      if (ball2Ref.current) {
        gsap.to(ball2Ref.current, {
          y: -12,
          x: -8,
          rotation: -8,
          duration: 2,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });
      }

      // 공 3 (초록색) - 작은 공 부유
      if (ball3Ref.current) {
        gsap.to(ball3Ref.current, {
          y: -8,
          scale: 1.05,
          duration: 1.8,
          repeat: -1,
          yoyo: true,
          ease: "power2.inOut",
        });
      }

      // 글로우 효과 1
      if (glowRef1.current) {
        gsap.to(glowRef1.current, {
          opacity: 0.9,
          scale: 1.1,
          duration: 3,
          repeat: -1,
          yoyo: true,
          ease: "power1.inOut",
        });
      }

      // 글로우 효과 2
      if (glowRef2.current) {
        gsap.to(glowRef2.current, {
          opacity: 0.4,
          rotation: 20,
          duration: 4,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });
      }
    }, containerRef);

    return () => ctx.revert();
  }, []);

  // ============================================================================
  // API Queries
  // ============================================================================

  const { data, isLoading, isError } = useQuery({
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
  // Play Handler with Ball Animation
  // ============================================================================

  const handlePlay = async () => {
    if (isPlaying || isRevealed || !data || data.token_balance <= 0) return;

    try {
      triggerHaptic("heavy");
      setIsPlaying(true);

      // 공 흔들림 애니메이션
      const balls = [ball1Ref.current, ball2Ref.current, ball3Ref.current];
      balls.forEach((ball) => {
        if (ball) {
          gsap.to(ball, {
            y: "random(-30, 30)",
            x: "random(-20, 20)",
            rotation: "random(-45, 45)",
            duration: 0.3,
            repeat: 6,
            yoyo: true,
            ease: "power2.inOut",
          });
        }
      });

      const result = await playMutation.mutateAsync();

      // 결과 표시까지 대기
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
              colors: ["#30E3AA", "#14D49E", "#FFD700"],
            });
          } else {
            triggerHaptic("light");
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

  // ============================================================================
  // Render States
  // ============================================================================

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: "#100b24" }}>
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#30E3AA] border-t-transparent" />
          <p className="text-sm font-semibold text-white/80">복권 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex h-screen items-center justify-center p-4" style={{ background: "#100b24" }}>
        <div className="rounded-3xl border border-white/15 bg-white/5 p-6 text-center backdrop-blur max-w-md">
          <p className="text-xl font-bold text-white">데이터를 불러오지 못했습니다</p>
          <p className="mt-2 text-sm text-white/60">잠시 후 다시 시도해주세요.</p>
        </div>
      </div>
    );
  }

  const collection = {
    C1: data.collectionProgress?.C1 ?? 0,
    C2: data.collectionProgress?.C2 ?? 0,
    J: data.collectionProgress?.J ?? 0,
    M: data.collectionProgress?.M ?? 0,
  };

  const canCraft =
    collection.C1 >= 1 && collection.C2 >= 1 && collection.J >= 1 && collection.M >= 1;
  const isOutOfTokens = data.token_balance <= 0;
  const canPlay = !isPlaying && !playMutation.isPending && !isOutOfTokens && !isRevealed;

  return (
    <div
      ref={containerRef}
      className="relative w-full max-w-[400px] min-h-screen mx-auto overflow-hidden"
      style={{ background: "#100b24" }}
    >
      {/* 배경 글로우 효과 1 - 청록색 */}
      <div
        ref={glowRef1}
        className="absolute rounded-full opacity-70 pointer-events-none"
        style={{
          width: "96%",
          height: "50%",
          left: "2%",
          top: "15%",
          background: `linear-gradient(180deg, rgba(0, 0, 0, 0) 20%, rgba(20, 56, 85, 0.14) 100%),
                       linear-gradient(to left, rgba(48, 227, 170, 0.15), rgba(48, 227, 170, 0.15))`,
          mixBlendMode: "hard-light",
          filter: "blur(40px)",
        }}
      />

      {/* 배경 글로우 효과 2 - 그라데이션 원 */}
      <div
        ref={glowRef2}
        className="absolute rounded-full opacity-30 pointer-events-none"
        style={{
          width: "88%",
          height: "46%",
          left: "20%",
          top: "12%",
          background: `linear-gradient(180deg, rgba(255, 244, 244, 1) 0%, rgba(20, 212, 158, 1) 87.5%, rgba(25, 109, 8, 1) 100%)`,
          border: "31px solid rgba(255, 255, 255, 0.3)",
          transform: "rotate(15deg)",
          mixBlendMode: "overlay",
          filter: "blur(20px)",
        }}
      />

      {/* 로고 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="relative z-10 flex justify-center pt-8"
      >
        <img src={lottoLogo} alt="LOTTO" className="h-12 object-contain" />
      </motion.div>

      {/* 공 비주얼 영역 */}
      <div className="relative h-[350px] w-full">
        {/* 흰색 공 (38번) */}
        <motion.img
          ref={ball1Ref}
          src={lottoBall1}
          alt="Lotto Ball"
          initial={{ opacity: 0, scale: 0.5, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6, ease: "backOut" }}
          className="absolute z-20"
          style={{
            width: "280px",
            height: "230px",
            left: "10px",
            top: "120px",
            objectFit: "contain",
            filter: "drop-shadow(0 20px 40px rgba(0,0,0,0.5))",
          }}
        />

        {/* 빨간 공 (41번) */}
        <motion.img
          ref={ball2Ref}
          src={lottoBall2}
          alt="Lotto Ball"
          initial={{ opacity: 0, scale: 0.5, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6, ease: "backOut" }}
          className="absolute z-30"
          style={{
            width: "220px",
            height: "180px",
            left: "100px",
            top: "60px",
            objectFit: "contain",
            filter: "drop-shadow(0 15px 30px rgba(0,0,0,0.4))",
          }}
        />

        {/* 초록 공 (6번) - 작은 공 */}
        <motion.img
          ref={ball3Ref}
          src={lottoBall3}
          alt="Lotto Ball"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.7, duration: 0.5, ease: "backOut" }}
          className="absolute z-10"
          style={{
            width: "60px",
            height: "60px",
            left: "20px",
            top: "80px",
            objectFit: "contain",
            filter: "drop-shadow(0 10px 20px rgba(0,0,0,0.3))",
          }}
        />
      </div>

      {/* 콘텐츠 영역 */}
      <div className="relative z-20 px-4 -mt-4">
        {/* 보유 티켓 & 컬렉션 */}
        <div className="flex items-center gap-3 mb-6">
          <div
            className="flex-1 flex items-center gap-3 rounded-2xl px-4 py-3 backdrop-blur-xl"
            style={{
              background: "rgba(48, 227, 170, 0.1)",
              border: "1px solid rgba(48, 227, 170, 0.2)",
            }}
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: "rgba(48, 227, 170, 0.2)" }}
            >
              <span className="text-lg">🎱</span>
            </div>
            <div>
              <p className="text-[10px] font-bold text-white/50 uppercase tracking-wider">
                보유 티켓
              </p>
              <p className="text-xl font-black text-white">{data.token_balance.toLocaleString()}</p>
            </div>
          </div>

          <button
            onClick={() => setCollectionModalOpen(true)}
            className="relative rounded-2xl px-4 py-3 backdrop-blur-xl transition-all hover:scale-105"
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            <span className="text-sm font-bold text-white/80">컬렉션</span>
            {canCraft && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span
                  className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                  style={{ background: "#30E3AA" }}
                />
                <span
                  className="relative inline-flex rounded-full h-3 w-3"
                  style={{ background: "#30E3AA" }}
                />
              </span>
            )}
          </button>
        </div>

        {/* 결과 표시 */}
        <AnimatePresence>
          {isRevealed && revealedPrize && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: -20 }}
              className="mb-6 rounded-3xl p-6 text-center backdrop-blur-xl"
              style={{
                background:
                  revealedPrize.reward_type !== "NONE"
                    ? "linear-gradient(135deg, rgba(48, 227, 170, 0.2) 0%, rgba(20, 212, 158, 0.1) 100%)"
                    : "rgba(255, 255, 255, 0.05)",
                border: `1px solid ${revealedPrize.reward_type !== "NONE" ? "rgba(48, 227, 170, 0.3)" : "rgba(255,255,255,0.1)"}`,
              }}
            >
              <p className="text-sm text-white/60 mb-2">
                {revealedPrize.reward_type !== "NONE" ? "🎉 축하합니다!" : "아쉬워요..."}
              </p>
              <p className="text-2xl font-black text-white mb-1">{revealedPrize.label}</p>
              {revealedPrize.reward_type !== "NONE" && (
                <p className="text-lg font-bold" style={{ color: "#30E3AA" }}>
                  +{Number(revealedPrize.reward_amount).toLocaleString()}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 티켓 부족 경고 */}
        {isOutOfTokens && (
          <div
            className="mb-4 p-4 rounded-xl text-center text-sm font-bold"
            style={{
              background: "rgba(255, 68, 68, 0.1)",
              border: "1px solid rgba(255, 68, 68, 0.3)",
              color: "#ff6b6b",
            }}
          >
            복권 티켓이 부족합니다!
          </div>
        )}

        {/* 플레이 버튼 */}
        <button
          type="button"
          onClick={() => (isRevealed ? handleReset() : handlePlay())}
          disabled={!canPlay && !isRevealed}
          className="w-full rounded-2xl py-5 text-lg font-black transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
          style={{
            background: canPlay || isRevealed
              ? "linear-gradient(135deg, #30E3AA 0%, #14D49E 50%, #0FA881 100%)"
              : "rgba(255, 255, 255, 0.1)",
            color: canPlay || isRevealed ? "#000" : "rgba(255,255,255,0.5)",
            boxShadow: canPlay || isRevealed ? "0 10px 30px rgba(48, 227, 170, 0.3)" : "none",
          }}
        >
          {isRevealed
            ? "다음 복권 뽑기"
            : isPlaying
              ? "추첨 중..."
              : playMutation.isPending
                ? "준비 중..."
                : "복권 뽑기"}
        </button>

        {/* 경품 리스트 */}
        <div className="mt-8 pb-32">
          <div className="flex items-center justify-between mb-4">
            <h3
              className="text-sm font-black italic tracking-wider uppercase"
              style={{ color: "#30E3AA" }}
            >
              당첨 경품
            </h3>
            <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
              {data.prizes?.length ?? 0} Items
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {data.prizes?.map((prize: Prize, index: number) => (
              <motion.div
                key={prize.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
                className="relative aspect-square overflow-hidden rounded-xl flex flex-col items-center justify-center p-2 text-center transition-all hover:scale-105"
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                }}
              >
                <div className="w-8 h-8 mb-2 flex items-center justify-center">
                  <span className="text-2xl">🎁</span>
                </div>
                <p className="text-[10px] font-bold text-white leading-tight line-clamp-2 mb-1">
                  {prize.label}
                </p>
                <p className="text-[9px] font-bold text-white/50">
                  {prize.reward_type === "NONE"
                    ? "꽝"
                    : `${Number(prize.reward_amount).toLocaleString()}`}
                </p>

                {prize.stock !== null && prize.stock !== undefined && (
                  <div className="absolute top-1 right-1">
                    <span
                      className="text-[8px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{
                        background: "rgba(48, 227, 170, 0.2)",
                        color: "#30E3AA",
                      }}
                    >
                      {prize.stock}
                    </span>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Collection Modal */}
      <LotteryCollectionModal
        open={collectionModalOpen}
        onClose={() => setCollectionModalOpen(false)}
        collection={collection}
        onCraft={async () => {
          console.log("[LotteryPage] Craft puzzle pieces");
          await new Promise((resolve) => setTimeout(resolve, 1000));
          queryClient.invalidateQueries({ queryKey: ["v2-lottery-status"] });
        }}
      />
    </div>
  );
};

export default LotteryPage;
