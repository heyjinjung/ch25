import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import gsap from "gsap";
import confetti from "canvas-confetti";
import { X, Trophy, Coins } from "lucide-react";
import { useSound } from "../../../hooks/useSound";
import { EncryptedText } from "../ui/EncryptedText";
import { cn } from "../../lib/utils";

interface DiceResultModalProps {
  isOpen: boolean;
  outcome: "WIN" | "LOSE" | "DRAW" | null;
  vaultEarn: number;
  onClose: () => void;
  isGoldenHour?: boolean;
}

export default function DiceResultModal({
  isOpen,
  outcome,
  vaultEarn,
  onClose,
  isGoldenHour = false,
}: DiceResultModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const shineRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { playTabTouch, playSmallWin, playDiceLose } = useSound();

  useEffect(() => {
    if (!modalRef.current || !contentRef.current) return;

    if (isOpen) {
      const isWin = outcome === "WIN";
      const isDraw = outcome === "DRAW";
      const isLose = outcome === "LOSE";

      const tl = gsap.timeline();

      // 1. Background Fade In
      tl.to(modalRef.current, {
        opacity: 1,
        pointerEvents: "auto",
        duration: 0.3,
        ease: "power2.out",
      });

      if (isGoldenHour) {
        if (isWin) {
          tl.fromTo(
            contentRef.current,
            { scale: 0.5, opacity: 0, y: 30 },
            {
              scale: 1,
              opacity: 1,
              y: 0,
              duration: 0.5,
              ease: "back.out(1.7)",
            },
            "-=0.1",
          );
          confetti({
            particleCount: 150,
            spread: 80,
            origin: { y: 0.6 },
            colors: ["#FFD700", "#FFFFFF", "#FFA500"],
            zIndex: 10000,
          });
          tl.add(() => {
            playSmallWin();
          }, "-=0.3");
        } else if (isLose) {
          // Golden Hour LOSE: Skeleton Vibration (Smoothed)
          tl.fromTo(
            contentRef.current,
            { scale: 0.95, opacity: 0, x: -6 },
            {
              scale: 1,
              opacity: 1,
              x: 0,
              duration: 0.25,
              repeat: 4,
              yoyo: true,
              ease: "sine.inOut",
            },
            "-=0.1",
          );
          tl.add(() => {
            playDiceLose();
          }, "-=0.2");
        } else {
          tl.fromTo(
            contentRef.current,
            { scale: 0.8, opacity: 0 },
            { scale: 1, opacity: 1, duration: 0.4 },
          );
        }
      } else {
        if (isWin || isDraw) {
          tl.fromTo(
            contentRef.current,
            { scale: 0.95, opacity: 0, y: -20 },
            { scale: 1, opacity: 1, y: 0, duration: 0.6, ease: "power3.out" },
            "-=0.1",
          );
          if (shineRef.current) {
            gsap.fromTo(
              shineRef.current,
              { x: "-100%", opacity: 0 },
              {
                x: "100%",
                opacity: 0.4,
                duration: 1.2,
                ease: "power2.inOut",
                delay: 0.2,
              },
            );
          }
          tl.add(() => {
            playSmallWin();
          }, "-=0.4");
        } else if (isLose) {
          tl.fromTo(
            contentRef.current,
            { opacity: 0, y: 0, filter: "grayscale(1)" },
            {
              opacity: 1,
              y: 15,
              filter: "grayscale(0.5)",
              duration: 0.8,
              ease: "power2.out",
            },
            "-=0.1",
          );
          tl.add(() => {
            playDiceLose();
          }, "-=0.4");
        }
      }
    } else {
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
  }, [isOpen, outcome, isGoldenHour, playSmallWin, playDiceLose]);

  if (!outcome) return null;

  const isWin = outcome === "WIN";
  const isDraw = outcome === "DRAW";
  const isLose = outcome === "LOSE";

  const titleText = isWin ? "승리" : isDraw ? "무승부" : "패배";
  const titleColor = isWin
    ? "text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.6)]"
    : isDraw
      ? "text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.6)]"
      : "text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.6)]";

  const renderIcon = () => {
    if (isWin)
      return (
        <div className="relative mb-4 drop-shadow-[0_0_20px_rgba(52,211,153,0.4)]">
          <Trophy className="w-16 h-16 text-emerald-400 animate-bounce" />
        </div>
      );
    if (isDraw) return <div className="text-6xl mb-4 animate-pulse">🤝</div>;
    if (isGoldenHour && isLose) return <div className="text-6xl mb-4">💀</div>;
    return <div className="text-6xl mb-4 grayscale opacity-60">👻</div>;
  };

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md opacity-0 pointer-events-none transition-opacity duration-300"
    >
      <div
        ref={contentRef}
        className={`w-full max-w-[340px] bg-[#121214] border border-white/10 rounded-[32px] p-8 flex flex-col items-center relative overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] ${!isGoldenHour && isLose ? "grayscale-[0.3]" : ""}`}
      >
        {/* Shine Layer */}
        {!isGoldenHour && (isWin || isDraw) && (
          <div
            ref={shineRef}
            className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 pointer-events-none"
          />
        )}

        {/* Top Gradient */}
        <div
          className={`absolute top-0 inset-x-0 h-32 bg-gradient-to-b ${isWin ? "from-emerald-500/10" : isDraw ? "from-amber-500/10" : "from-red-500/10"} to-transparent pointer-events-none`}
        />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/10 transition-colors z-20"
          aria-label="닫기"
          title="닫기"
        >
          <X className="w-5 h-5" />
        </button>

        {renderIcon()}

        <div className="flex flex-col items-center gap-1 mb-4">
          <span
            className={`text-[10px] font-black uppercase tracking-[0.3em] ${isWin ? "text-emerald-500/60" : "text-zinc-500"}`}
          >
            Dice Battle Result
          </span>
          <h2
            className={`text-4xl font-black italic tracking-tighter ${titleColor}`}
          >
            <EncryptedText
              key={`title-${isOpen}-${outcome}`}
              text={titleText}
            />
          </h2>
        </div>

        <p className="text-zinc-400 text-sm font-medium mb-8 text-center leading-relaxed max-w-[200px]">
          {isWin
            ? "상대를 완벽하게 제압하고 승리했습니다!"
            : isDraw
              ? "막상막하의 대결! 다음엔 꼭 승리하세요."
              : "운이 부족했네요. 다시 도전해보세요."}
        </p>

        {vaultEarn > 0 && (
          <div className="w-full bg-gradient-to-b from-white/[0.08] to-transparent rounded-2xl p-5 mb-8 border border-white/10 flex flex-col items-center relative group">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-emerald-500 text-[10px] font-black text-black rounded-full uppercase tracking-tighter">
              Rewarded
            </div>
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-emerald-400" />
              <div className="text-3xl font-black text-white tracking-tight">
                {vaultEarn.toLocaleString()}
              </div>
              <span className="text-sm font-bold text-zinc-500">P</span>
            </div>
          </div>
        )}

        <div className="w-full flex flex-col gap-3 z-10">
          <button
            onClick={() => {
              playTabTouch();
              onClose();
            }}
            className={cn(
              "w-full h-14 rounded-2xl font-black text-lg transition-all active:scale-95",
              isWin
                ? "bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                : "bg-white hover:bg-zinc-200 text-black",
            )}
          >
            {isWin ? "영광의 확인" : "다시 하기"}
          </button>

          {isLose && (
            <button
              onClick={() => {
                playTabTouch();
                onClose();
                navigate("/"); // Move to home or game list
              }}
              className="w-full h-10 rounded-xl bg-white/5 text-zinc-500 font-bold text-sm hover:text-white hover:bg-white/10 transition-all"
            >
              다른 게임 하기
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
