import { useEffect, useRef, useMemo } from "react";
import gsap from "gsap";
import confetti from "canvas-confetti";
import { Skull, Ghost, ArrowRight } from "lucide-react";
import { useSound } from "../../../hooks/useSound";
import { EncryptedText } from "../ui/EncryptedText";
import { BackgroundPaths } from "../effects/BackgroundPaths";
import { cn } from "../../lib/utils";

interface RouletteResultModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly rewardType: string;
  readonly rewardAmount: number;
  readonly rewardLabel: string;
}

export default function RouletteResultModal({
  isOpen,
  onClose,
  rewardType,
  rewardAmount,
  rewardLabel,
}: RouletteResultModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const shineRef = useRef<HTMLDivElement>(null);
  const {
    playRouletteStop,
    playBigWin,
    playSmallWin,
    playDiceLose,
    playTabTouch,
    triggerHapticStrong,
    triggerHapticSuccess,
    triggerHapticFail,
  } = useSound();

  // Tier Classification Logic
  const { isBigWin, isNormal, isFail } = useMemo(() => {
    const isPoint = rewardType === "POINT" || rewardType === "CC_POINT";
    const isRareTicket =
      (rewardType === "TICKET" || rewardType.includes("KEY")) &&
      (rewardLabel.toLowerCase().includes("gold") ||
        rewardLabel.toLowerCase().includes("diamond") ||
        rewardLabel.toLowerCase().includes("dia"));

    if (isPoint || isRareTicket)
      return { isBigWin: true, isNormal: false, isFail: false };
    
    // Fail only if there is absolutely no reward (NONE)
    if (rewardType === "NONE" || rewardAmount <= 0) {
      return { isBigWin: false, isNormal: false, isFail: true };
    }
    
    // Everything else (including small tickets) is Normal/Small Win
    return { isBigWin: false, isNormal: true, isFail: false };
  }, [rewardType, rewardAmount, rewardLabel]);

  useEffect(() => {
    if (!modalRef.current || !contentRef.current) return;

    if (isOpen) {
      playRouletteStop();
      const tl = gsap.timeline();

      tl.to(modalRef.current, {
        opacity: 1,
        pointerEvents: "auto",
        duration: 0.3,
        ease: "power2.out",
      });

      if (isBigWin) {
        tl.fromTo(
          contentRef.current,
          { scale: 0.6, opacity: 0, y: 50 },
          { scale: 1, opacity: 1, y: 0, duration: 0.7, ease: "back.out(1.4)" },
          "-=0.1",
        );

        const duration = 2000;
        const end = Date.now() + duration;
        const colors = ["#FF3B3B", "#FF8A00", "#FF007A", "#FFFFFF"];

        const frame = () => {
          confetti({
            particleCount: 5,
            angle: 60,
            spread: 55,
            origin: { x: 0, y: 0.7 },
            colors: colors,
            zIndex: 10000,
          });
          confetti({
            particleCount: 5,
            angle: 120,
            spread: 55,
            origin: { x: 1, y: 0.7 },
            colors: colors,
            zIndex: 10000,
          });
          if (Date.now() < end) requestAnimationFrame(frame);
        };
        frame();

        if (shineRef.current) {
          gsap.fromTo(
            shineRef.current,
            { x: "-200%", opacity: 0 },
            {
              x: "200%",
              opacity: 0.4,
              duration: 2.2,
              repeat: -1,
              ease: "power2.inOut",
              repeatDelay: 0.8,
            },
          );
        }
        tl.add(() => {
          playBigWin();
          triggerHapticStrong();
        }, "-=0.5");
      } else if (isNormal) {
        tl.fromTo(
          contentRef.current,
          { scale: 0.9, opacity: 0, y: 20 },
          {
            scale: 1,
            opacity: 1,
            y: 0,
            duration: 0.6,
            ease: "elastic.out(1, 0.75)",
          },
          "-=0.1",
        );
        tl.add(() => {
          playSmallWin();
          triggerHapticSuccess();
        }, "-=0.4");
      } else {
        tl.fromTo(
          contentRef.current,
          { opacity: 0, y: -25, scale: 1.05 },
          { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: "bounce.out" },
          "-=0.1",
        );
        tl.add(() => {
          playDiceLose();
          triggerHapticFail();
        }, "-=0.4");
      }
    } else {
      gsap.to(contentRef.current, {
        scale: 0.92,
        opacity: 0,
        y: 15,
        duration: 0.25,
        ease: "power2.in",
      });
      gsap.to(modalRef.current, {
        opacity: 0,
        pointerEvents: "none",
        duration: 0.2,
        delay: 0.1,
      });
    }
  }, [
    isOpen,
    isBigWin,
    isNormal,
    isFail,
    playRouletteStop,
    playBigWin,
    playSmallWin,
    playDiceLose,
    triggerHapticStrong,
    triggerHapticSuccess,
    triggerHapticFail,
  ]);

  if (!isOpen) return null;

  const renderIcon = () => {
    const iconClass = "w-28 h-28 object-contain select-none drop-shadow-2xl";
    if (isBigWin) {
      if (rewardType === "POINT" || rewardType === "CC_POINT") {
        return (
          <img
            src="/assets/asset_coin_gold.webp"
            alt="Points"
            className={iconClass}
          />
        );
      }
      if (rewardLabel.toLowerCase().includes("gold")) {
        return (
          <img
            src="/assets/icons/goldkey.png"
            alt="Gold Key"
            className={iconClass}
          />
        );
      }
      if (
        rewardLabel.toLowerCase().includes("diamond") ||
        rewardLabel.toLowerCase().includes("dia")
      ) {
        return (
          <img
            src="/assets/icons/diakey.png"
            alt="Diamond Ticket"
            className={iconClass}
          />
        );
      }
      return (
        <img
          src="/assets/asset_coin_gold.webp"
          alt="Reward"
          className={iconClass}
        />
      );
    }

    if (isNormal) {
      if (rewardLabel.includes("치킨"))
        return (
          <img
            src="/assets/icons/chiken.png"
            alt="Chicken"
            className={iconClass}
          />
        );
      if (rewardLabel.includes("피자"))
        return (
          <img
            src="/assets/icons/pizza2.png"
            alt="Pizza"
            className={iconClass}
          />
        );
      if (
        rewardLabel.includes("스타벅스") ||
        rewardLabel.includes("커피") ||
        rewardLabel.includes("컵")
      ) {
        return (
          <img
            src="/assets/icons/takeaway-cup-dynamic-color.png"
            alt="Starbucks"
            className={iconClass}
          />
        );
      }
      return <Ghost className="w-24 h-24 text-emerald-400 opacity-70" />;
    }

    return (
      <div className="relative">
        <Skull className="w-24 h-24 text-[#4a5a4a] opacity-70 drop-shadow-[0_0_15px_rgba(0,0,0,0.4)]" />
      </div>
    );
  };

  const cardStyle = cn(
    "w-full max-w-[340px] rounded-[44px] p-8 flex flex-col items-center relative overflow-hidden backdrop-blur-3xl shadow-[0_50px_100px_rgba(0,0,0,0.8)]",
    "animate-shimmer",
    isBigWin &&
      "bg-gradient-to-br from-[#121214] via-[#3d1119] to-[#121214] border-red-500/30",
    isNormal && "bg-[#121214] border-[2px] border-[#FFD700]/50",
    isFail && "bg-gradient-to-b from-[#121412] to-[#09090b] border-zinc-800/50",
  );

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md opacity-0 pointer-events-none transition-all duration-300"
    >
      <BackgroundPaths className="opacity-40" count={8} />

      <div ref={contentRef} className={cardStyle}>
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite] z-0" />

        {isBigWin && (
          <div
            ref={shineRef}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-25 pointer-events-none z-10"
          />
        )}

        <div className="flex flex-col items-center gap-1.5 mb-8 z-20">
          <span
            className={cn(
              "text-[10px] font-black uppercase tracking-[0.45em]",
              isBigWin
                ? "text-red-400/80"
                : isNormal
                  ? "text-amber-500/80"
                  : "text-zinc-600",
            )}
          >
            Spin 결과
          </span>
          <h2
            className={cn(
              "text-4xl font-black italic tracking-tighter",
              isBigWin
                ? "text-white drop-shadow-lg"
                : isNormal
                  ? "text-yellow-400"
                  : "text-zinc-600",
            )}
          >
            <EncryptedText
              key={`res-title-${isOpen}`}
              text={
                isBigWin ? "잭 팟 !" : isNormal ? "축하합니다!" : "다음 기회에"
              }
              loop={isBigWin}
            />
          </h2>
        </div>

        <div className="relative mb-8 z-20 flex justify-center items-center h-32">
          {isBigWin && (
            <div className="absolute inset-0 bg-gradient-to-r from-red-600/20 via-orange-600/20 to-pink-600/20 blur-[60px] animate-pulse rounded-full" />
          )}
          {renderIcon()}
        </div>

        <div className="flex flex-col items-center z-20 w-full px-4 mb-9">
          <span
            className={cn(
              "text-[10px] font-bold uppercase tracking-widest mb-1.5",
              isBigWin ? "text-white/70" : "text-zinc-500",
            )}
          >
            획득 상품
          </span>
          <div
            className={cn(
              "text-2xl font-black text-center drop-shadow-md min-h-[1.5em]",
              isBigWin
                ? "text-white"
                : isNormal
                  ? "text-zinc-100"
                  : "text-zinc-500",
            )}
          >
            {isBigWin ? (
              <EncryptedText
                key={`prize-${rewardLabel}-${isOpen}`}
                text={rewardLabel}
                loop={true}
              />
            ) : (
              <div className="animate-pulse-subtle">{rewardLabel}</div>
            )}
          </div>

          {rewardAmount > 0 && (
            <div className="mt-3 flex items-center gap-2 bg-white/5 px-5 py-2.5 rounded-2xl border border-white/5 shadow-inner">
              <span
                className={cn(
                  "text-3xl font-black",
                  isBigWin ? "text-red-400" : "text-emerald-400",
                )}
              >
                +{rewardAmount.toLocaleString()}
              </span>
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pt-1">
                {rewardType === "TICKET" ? "티켓" : "포인트"}
              </span>
            </div>
          )}
        </div>

        <div className="w-full flex flex-col gap-3.5 z-20">
          <button
            onClick={() => {
              playTabTouch();
              onClose();
            }}
            className={cn(
              "w-full h-16 rounded-[28px] font-black text-xl transition-all active:scale-[0.97] flex items-center justify-center gap-2.5 group shadow-xl",
              isBigWin
                ? "bg-white text-red-600 hover:scale-105"
                : isNormal
                  ? "bg-[#FFD700] text-black hover:bg-amber-400"
                  : "bg-zinc-800 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-300",
            )}
          >
            {isFail ? "다시 하기" : isBigWin ? "확인" : "보상 받기"}
            <ArrowRight
              size={22}
              className="group-hover:translate-x-1.5 transition-transform"
            />
          </button>

          <button
            onClick={onClose}
            className={cn(
              "w-full h-12 rounded-2xl font-bold text-sm transition-all",
              isBigWin
                ? "bg-white/20 text-white hover:bg-white/30"
                : "bg-white/5 text-zinc-500 hover:text-white hover:bg-white/10",
            )}
          >
            닫기
          </button>
        </div>

        {isBigWin && (
          <div className="absolute -top-20 -left-20 w-80 h-80 bg-red-600/10 blur-[120px] pointer-events-none rounded-full" />
        )}
      </div>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          background: linear-gradient(
            to right,
            transparent 0%,
            rgba(255, 255, 255, 0.05) 50%,
            transparent 100%
          );
          background-size: 200% 100%;
          animation: shimmer 3s infinite linear;
        }
        .animate-pulse-subtle {
          animation: pulse-subtle 2s infinite ease-in-out;
        }
        @keyframes pulse-subtle {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(0.98); }
        }
      `}</style>
    </div>
  );
}

