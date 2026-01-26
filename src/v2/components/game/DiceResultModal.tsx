import { useEffect, useRef } from "react";
import gsap from "gsap";
import confetti from "canvas-confetti";
import { useSound } from "../../../hooks/useSound";
import { EncryptedText } from "../ui/EncryptedText";

interface DiceResultModalProps {
  isOpen: boolean;
  outcome: "WIN" | "LOSE" | "DRAW" | null;
  vaultEarn: number;
  onClose: () => void;
}

export default function DiceResultModal({
  isOpen,
  outcome,
  vaultEarn,
  onClose,
}: DiceResultModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const { playTabTouch, playBigWin, playSmallWin, playDiceLose } = useSound();

  useEffect(() => {
    if (!modalRef.current || !contentRef.current) return;

    if (isOpen) {
      const isWin = outcome === "WIN";
      const isBigWin = isWin && vaultEarn >= 10000;
      const isLose = outcome === "LOSE";

      const tl = gsap.timeline();

      // 1. Background Fade In
      tl.to(modalRef.current, {
        opacity: 1,
        pointerEvents: "auto",
        duration: 0.3,
        ease: "power2.out",
      });

      // 2. Tiered Content Animation
      if (isLose) {
        // Heavy Drop for Lose
        tl.fromTo(
          contentRef.current,
          { scale: 1.1, opacity: 0, y: -50 },
          { scale: 1, opacity: 1, y: 0, duration: 0.6, ease: "bounce.out" },
          "-=0.1"
        );
        playDiceLose();
      } else if (isBigWin) {
        // Energetic Spin for Big Win
        tl.fromTo(
          contentRef.current,
          { scale: 0.5, opacity: 0, rotationY: 180 },
          { scale: 1, opacity: 1, rotationY: 0, duration: 0.8, ease: "back.out(1.2)" },
          "-=0.1"
        );
        playBigWin();
        
        // Continuous Side Cannons Confetti
        const duration = 3 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 10000 };

        const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

        const interval: any = setInterval(function() {
          const timeLeft = animationEnd - Date.now();
          if (timeLeft <= 0) return clearInterval(interval);

          const particleCount = 50 * (timeLeft / duration);
          confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
          confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
        }, 250);
      } else {
        // Standard Bounce for Small Win/Draw
        tl.fromTo(
          contentRef.current,
          { scale: 0.8, opacity: 0, y: 20 },
          { scale: 1, opacity: 1, y: 0, duration: 0.5, ease: "back.out(1.7)" },
          "-=0.1"
        );
        playSmallWin();

        // One-shot Center Burst
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          zIndex: 10000,
          colors: ["#D2FD9C", "#FFFFFF", "#FFD700"]
        });
      }
    } else {
      // Close Animation
      gsap.to(contentRef.current, {
        scale: 0.9,
        opacity: 0,
        y: 10,
        duration: 0.2,
        ease: "power2.in",
      });
      gsap.to(modalRef.current, {
        opacity: 0,
        pointerEvents: "none",
        duration: 0.2,
        delay: 0.1,
      });
    }
  }, [isOpen, outcome, vaultEarn, playBigWin, playSmallWin, playDiceLose]);

  if (!outcome) return null;

  const isWin = outcome === "WIN";
  const isDraw = outcome === "DRAW";

  // Style Config
  const titleText = isWin ? "승리" : isDraw ? "무승부" : "패배";
  const titleColor = isWin
    ? "text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]"
    : isDraw
      ? "text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]"
      : "text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]";

  // Dynamic Emoji/Icon helper
  const renderIcon = () => {
    if (isWin) return <div className="text-6xl mb-4 animate-bounce">🏆</div>;
    if (isDraw) return <div className="text-6xl mb-4 animate-pulse">🤝</div>;
    return <div className="text-6xl mb-4 grayscale opacity-80">💀</div>;
  };

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm opacity-0 pointer-events-none"
    >
      <div
        ref={contentRef}
        className="w-full max-w-[320px] bg-[#1a1a1e] border border-white/10 rounded-3xl p-6 flex flex-col items-center relative overflow-hidden shadow-2xl"
      >
        {/* Glow Effects */}
        <div
          className={`absolute top-0 inset-x-0 h-[100px] bg-gradient-to-b ${isWin ? "from-emerald-500/20" : isDraw ? "from-amber-500/20" : "from-red-500/20"} to-transparent pointer-events-none`}
        />

        {/* Content */}
        {renderIcon()}

        <h2
          className={`text-3xl font-black ${titleColor} italic tracking-tighter mb-2`}
        >
          <EncryptedText text={titleText} />
        </h2>

        <div className="text-zinc-400 text-sm font-medium mb-6 text-center leading-relaxed">
          {isWin
            ? "축하합니다! 상대를 압도했습니다."
            : isDraw
              ? "무승부입니다! 다시 도전하세요."
              : "아쉽게 패배했습니다."}
        </div>

        {/* Reward Section (Only Positive) */}
        {vaultEarn > 0 && (
          <div className="w-full bg-white/5 rounded-xl p-3 mb-6 border border-white/5 flex flex-col items-center">
            <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-1">
              획득 보상
            </span>
            <div className="text-2xl font-black text-white flex items-center gap-1">
              +{vaultEarn.toLocaleString()}{" "}
              <span className="text-sm font-bold text-zinc-400">포인트</span>
            </div>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={() => {
            playTabTouch();
            onClose();
          }}
          className="w-full h-12 rounded-xl bg-white text-black font-black text-lg hover:scale-105 active:scale-95 transition-transform"
        >
          확인
        </button>
      </div>
    </div>
  );
}
