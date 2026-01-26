import { useEffect, useRef } from "react";
import gsap from "gsap";
import confetti from "canvas-confetti";
import { Trophy, Gift, Ticket, Puzzle } from "lucide-react";
import { useSound } from "../../../hooks/useSound";
import { EncryptedText } from "../ui/EncryptedText";

interface LotteryResultModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly prizeLabel: string;
  readonly rewardType: string;
  readonly rewardAmount: number;
  readonly onReset: () => void;
  readonly isGoldenHour?: boolean;
}

export default function LotteryResultModal({
  isOpen,
  onClose,
  prizeLabel,
  rewardType,
  onReset,
}: LotteryResultModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const shineRef = useRef<HTMLDivElement>(null);
  const { playTabTouch, playBigWin, playSmallWin, playDiceLose } = useSound();

  // Tier Classification Logic (Technical Trigger)
  const isPoint = rewardType === "POINT";
  const isRareTicket = rewardType === "TICKET" && (prizeLabel.toLowerCase().includes("gold") || prizeLabel.toLowerCase().includes("diamond"));
  const isBigWin = isPoint || isRareTicket;
  const isFail = rewardType === "NONE" || prizeLabel.includes("꽝");
  const isNormal = !isBigWin && !isFail;

  useEffect(() => {
    if (!modalRef.current || !contentRef.current) return;

    if (isOpen) {
      const tl = gsap.timeline();

      // 1. Background Fade In
      tl.to(modalRef.current, {
        opacity: 1,
        pointerEvents: "auto",
        duration: 0.3,
        ease: "power2.out",
      });

      if (isBigWin) {
        // Celestial Reveal (Big Win)
        tl.fromTo(
          contentRef.current,
          { scale: 0.5, opacity: 0, y: 40 },
          { scale: 1, opacity: 1, y: 0, duration: 0.6, ease: "back.out(1.5)" },
          "-=0.1"
        );

        // 2s Intense Confetti
        const duration = 2 * 1000;
        const end = Date.now() + duration;
        const frame = () => {
          confetti({
            particleCount: 3,
            angle: 60,
            spread: 55,
            origin: { x: 0, y: 0.65 },
            colors: ["#FFD700", "#FFFFFF", "#FFA500"],
            zIndex: 10000,
          });
          confetti({
            particleCount: 3,
            angle: 120,
            spread: 55,
            origin: { x: 1, y: 0.65 },
            colors: ["#FFD700", "#FFFFFF", "#FFA500"],
            zIndex: 10000,
          });
          if (Date.now() < end) requestAnimationFrame(frame);
        };
        frame();

        // GSAP Shine Effect
        if (shineRef.current) {
          gsap.fromTo(
            shineRef.current,
            { x: "-100%", opacity: 0 },
            { x: "100%", opacity: 0.5, duration: 1.5, ease: "power2.inOut", delay: 0.3 }
          );
        }
        playBigWin();
      } else if (isNormal) {
        // Stable Victory (Normal)
        tl.fromTo(
          contentRef.current,
          { scale: 0.9, opacity: 0, y: 20 },
          { scale: 1, opacity: 1, y: 0, duration: 0.5, ease: "power3.out" },
          "-=0.1"
        );
        playSmallWin();
      } else {
        // FAIL
        tl.fromTo(
          contentRef.current,
          { opacity: 0, y: 10, scale: 0.98 },
          { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: "power2.out" },
          "-=0.1"
        );
        playDiceLose();
      }
    } else {
      // Close Animation
      gsap.to(contentRef.current, { scale: 0.9, opacity: 0, y: 10, duration: 0.2, ease: "power2.in" });
      gsap.to(modalRef.current, { opacity: 0, pointerEvents: "none", duration: 0.2, delay: 0.1 });
    }
  }, [isOpen, isBigWin, isNormal, isFail, playBigWin, playSmallWin, playDiceLose]);

  if (!isOpen) return null;

  const renderIcon = () => {
    if (isBigWin) {
      return (
        <div className="relative mb-6 drop-shadow-[0_0_30px_rgba(255,215,0,0.5)]">
          <Trophy className="w-20 h-20 text-yellow-400 animate-bounce" />
        </div>
      );
    }
    if (rewardType === "GIFTICON" || rewardType === "VOUCHER") {
      return <Gift className="w-16 h-16 text-rose-400 mb-6 drop-shadow-[0_0_15px_rgba(251,113,133,0.4)]" />;
    }
    if (rewardType === "TICKET") {
      return <Ticket className="w-16 h-16 text-sky-400 mb-6 drop-shadow-[0_0_15px_rgba(56,189,248,0.4)]" />;
    }
    if (rewardType === "ITEM" || rewardType === "PUZZLE") {
      return <Puzzle className="w-16 h-16 text-indigo-400 mb-6 drop-shadow-[0_0_15px_rgba(129,140,248,0.4)]" />;
    }
    return <div className="text-7xl mb-6 grayscale opacity-40">👻</div>;
  };

  const titleColor = isBigWin 
    ? "text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.6)]" 
    : isNormal 
      ? "text-sky-400" 
      : "text-zinc-500";

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md opacity-0 pointer-events-none transition-opacity duration-300"
    >
      <div
        ref={contentRef}
        className={`w-full max-w-[340px] bg-[#121214] border border-white/10 rounded-[40px] p-8 flex flex-col items-center relative overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.6)] ${isFail ? "grayscale-[0.5] opacity-90" : ""}`}
      >
        {/* Shine/Glow Layer */}
        {isBigWin && (
          <div 
            ref={shineRef}
            className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 pointer-events-none"
          />
        )}
        
        <div className={`absolute top-0 inset-x-0 h-40 bg-gradient-to-b ${isBigWin ? "from-yellow-500/10" : isNormal ? "from-sky-500/10" : "from-zinc-500/5"} to-transparent pointer-events-none`} />

        {/* Header Section */}
        <div className="flex flex-col items-center gap-1 mb-6 z-10">
          <span className={`text-[10px] font-black uppercase tracking-[0.4em] ${isBigWin ? "text-yellow-500/60" : "text-zinc-500/60"}`}>
            Sweepstakes Result
          </span>
          <h2 className={`text-4xl font-black italic tracking-tighter ${titleColor}`}>
            <EncryptedText key={`res-title-${isOpen}`} text={isFail ? "추첨 완료" : "JACKPOT!"} />
          </h2>
        </div>

        {renderIcon()}

        {/* Prize Name - BIG WIN gets EncryptedText enhancement */}
        <div className="flex flex-col items-center z-10 w-full px-4 mb-8">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 font-mono">
            Winning Prize
          </span>
          <div className="text-2xl font-black text-white text-center leading-tight tracking-tight drop-shadow-md min-h-[1.5em]">
            {isBigWin ? (
              <EncryptedText 
                key={`prize-${prizeLabel}-${isOpen}`}
                text={prizeLabel} 
              />
            ) : (
              prizeLabel
            )}
          </div>
        </div>

        {/* Description */}
        <p className="text-zinc-500 text-xs font-medium mb-10 text-center leading-relaxed max-w-[200px] z-10">
          {isBigWin 
            ? "축하합니다! 엄청난 행운이 찾아왔습니다. 지금 바로 혜택을 확인하세요." 
            : isNormal 
              ? "당첨을 축하드립니다! 다음 판에도 행운이 깃들길 바랍니다." 
              : "아쉽게도 당첨되지 않았습니다. 다시 도전해 보세요!"}
        </p>

        {/* Action Button */}
        <div className="w-full flex flex-col gap-3 z-10">
          <button
            onClick={() => { playTabTouch(); onReset(); onClose(); }}
            className={`w-full h-14 rounded-2xl ${isBigWin ? "bg-yellow-400 hover:bg-yellow-300 shadow-[0_0_25px_rgba(250,204,21,0.4)]" : "bg-white hover:bg-zinc-200"} text-black font-black text-lg transition-all active:scale-95`}
          >
            {isBigWin ? "영광의 확인" : "다시 하기"}
          </button>
          
          <button
            onClick={onClose}
            className="w-full h-10 rounded-xl bg-white/5 text-zinc-500 font-bold text-sm hover:text-white hover:bg-white/10 transition-all"
          >
            닫기
          </button>
        </div>

        {/* Decorative elements for Big Win */}
        {isBigWin && (
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-yellow-500/10 blur-[80px] pointer-events-none rounded-full" />
        )}
      </div>
    </div>
  );
}
