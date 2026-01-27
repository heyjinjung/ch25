import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import gsap from "gsap";
import confetti from "canvas-confetti";
import { Trophy, Gift, Ticket, Puzzle, Coins, ArrowRight } from "lucide-react";
import { useSound } from "../../../hooks/useSound";
import { EncryptedText } from "../ui/EncryptedText";
import { getRewardItemLabel } from "../../constants/rewardItems";

interface RouletteResultModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly rewardType: string;
  readonly rewardAmount: number;
}

export default function RouletteResultModal({
  isOpen,
  onClose,
  rewardType,
  rewardAmount,
}: RouletteResultModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const shineRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { playRouletteStop, playBigWin, playSmallWin, playDiceLose, playTabTouch } = useSound();

  const rewardLabel = getRewardItemLabel(rewardType);
  const isPoint = rewardType === "POINT" || rewardType === "CC_POINT";
  const isRareTicket = rewardType === "TICKET" && (rewardLabel.toLowerCase().includes("gold") || rewardLabel.toLowerCase().includes("diamond"));
  
  // Tier Classification Logic
  const isBigWin = isPoint || isRareTicket;
  const isFail = rewardType === "NONE" || rewardAmount <= 0;
  const isNormal = !isBigWin && !isFail;

  useEffect(() => {
    if (!modalRef.current || !contentRef.current) return;

    if (isOpen) {
      playRouletteStop();
      const tl = gsap.timeline();

      // 1. Entrance Animation
      tl.to(modalRef.current, {
        opacity: 1,
        pointerEvents: "auto",
        duration: 0.3,
        ease: "power2.out",
      });

      if (isBigWin) {
        // Celestial Reveal (Emerald & Gold)
        tl.fromTo(
          contentRef.current,
          { scale: 0.6, opacity: 0, y: 50 },
          { scale: 1, opacity: 1, y: 0, duration: 0.7, ease: "back.out(1.4)" },
          "-=0.1"
        );

        // 2s Intensive Confetti
        const duration = 2000;
        const end = Date.now() + duration;
        const colors = ["#D2FD9C", "#FFD700", "#FFFFFF"];
        
        const frame = () => {
          confetti({
            particleCount: 4,
            angle: 65,
            spread: 50,
            origin: { x: 0, y: 0.7 },
            colors: colors,
            zIndex: 10000,
          });
          confetti({
            particleCount: 4,
            angle: 115,
            spread: 50,
            origin: { x: 1, y: 0.7 },
            colors: colors,
            zIndex: 10000,
          });
          if (Date.now() < end) requestAnimationFrame(frame);
        };
        frame();

        // GSAP Shine Effect
        if (shineRef.current) {
          gsap.fromTo(
            shineRef.current,
            { x: "-150%", opacity: 0 },
            { x: "150%", opacity: 0.4, duration: 1.8, ease: "power2.inOut", delay: 0.4 }
          );
        }
        tl.add(() => { playBigWin(); }, "-=0.5");
      } else if (isNormal) {
        // Stable Victory (Emerald Chill)
        tl.fromTo(
          contentRef.current,
          { scale: 0.9, opacity: 0, y: 20 },
          { scale: 1, opacity: 1, y: 0, duration: 0.5, ease: "power3.out" },
          "-=0.1"
        );
        tl.add(() => { playSmallWin(); }, "-=0.3");
      } else {
        // FAIL
        tl.fromTo(
          contentRef.current,
          { opacity: 0, y: 10, scale: 0.98 },
          { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: "power2.out" },
          "-=0.1"
        );
        tl.add(() => { playDiceLose(); }, "-=0.2");
      }
    } else {
      // Exit Animation
      gsap.to(contentRef.current, { scale: 0.9, opacity: 0, y: 15, duration: 0.25, ease: "power2.in" });
      gsap.to(modalRef.current, { opacity: 0, pointerEvents: "none", duration: 0.25, delay: 0.1 });
    }
  }, [isOpen, isBigWin, isNormal, isFail, playRouletteStop, playBigWin, playSmallWin, playDiceLose]);

  if (!isOpen) return null;

  const renderIcon = () => {
    if (isBigWin) {
      return (
        <div className="relative mb-6 drop-shadow-[0_0_40px_rgba(210,253,156,0.5)]">
          <Trophy className="w-24 h-24 text-[#D2FD9C] animate-pulse" />
        </div>
      );
    }
    if (rewardType.includes("GIFTICON") || rewardType.includes("VOUCHER")) {
      return <Gift className="w-16 h-16 text-rose-400 mb-6 drop-shadow-[0_0_15px_rgba(251,113,133,0.4)]" />;
    }
    if (rewardType === "TICKET" || rewardType.includes("COIN")) {
      return <Ticket className="w-16 h-16 text-emerald-400 mb-6 drop-shadow-[0_0_15px_rgba(16,185,129,0.4)]" />;
    }
    if (isPoint) {
      return <Coins className="w-16 h-16 text-yellow-400 mb-6 drop-shadow-[0_0_15px_rgba(250,204,21,0.4)]" />;
    }
    return <Puzzle className="w-16 h-16 text-zinc-500 mb-6 grayscale opacity-40" />;
  };

  const titleColor = isBigWin 
    ? "text-[#D2FD9C] drop-shadow-[0_0_15px_rgba(210,253,156,0.6)]" 
    : isNormal 
      ? "text-emerald-400" 
      : "text-zinc-500";

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-lg opacity-0 pointer-events-none"
    >
      <div
        ref={contentRef}
        className={`w-full max-w-[340px] bg-[#121214] border border-white/10 rounded-[44px] p-8 flex flex-col items-center relative overflow-hidden shadow-[0_40px_80px_rgba(0,0,0,0.7)] ${isFail ? "grayscale-[0.4]" : ""}`}
      >
        {/* Decorative Glossy Glow */}
        <div className={`absolute top-0 inset-x-0 h-48 bg-gradient-to-b ${isBigWin ? "from-[#D2FD9C]/10" : isNormal ? "from-emerald-500/10" : "from-zinc-500/5"} to-transparent pointer-events-none`} />
        
        {isBigWin && (
          <div 
            ref={shineRef}
            className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-20 pointer-events-none"
          />
        )}

        {/* Header Section */}
        <div className="flex flex-col items-center gap-1 mb-8 z-10">
          <span className={`text-[10px] font-black uppercase tracking-[0.5em] ${isBigWin ? "text-[#D2FD9C]/60" : "text-zinc-600"}`}>
            Spin Reward
          </span>
          <h2 className={`text-4xl font-black italic tracking-tighter ${titleColor}`}>
            <EncryptedText 
                key={`roulette-title-${isOpen}`} 
                text={isBigWin ? "JACKPOT!" : isNormal ? "WINNER!" : "NEXT TIME"} 
            />
          </h2>
        </div>

        {renderIcon()}

        {/* Reward Section */}
        <div className="flex flex-col items-center z-10 w-full px-4 mb-10">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-2 font-mono">
            {rewardLabel}
          </span>
          <div className={`text-5xl font-black ${isBigWin ? "text-white" : "text-emerald-50"} text-center leading-tight tracking-tighter drop-shadow-xl`}>
            {isPoint ? (
              <div className="flex items-center justify-center gap-1">
                <EncryptedText key={`amount-${rewardAmount}`} text={`+${rewardAmount.toLocaleString()}`} />
                <span className="text-xl text-yellow-500 mt-2 font-black italic">CP</span>
              </div>
            ) : (
              <EncryptedText key={`label-${rewardLabel}`} text={rewardLabel} />
            )}
          </div>
        </div>

        {/* Action Button */}
        <div className="w-full flex flex-col gap-3 z-10">
          <button
            onClick={() => { playTabTouch(); onClose(); }}
            className={`w-full h-16 rounded-[24px] ${isBigWin ? "bg-[#D2FD9C] hover:bg-[#E5FFC4] shadow-[0_0_30px_rgba(210,253,156,0.4)]" : "bg-emerald-500 hover:bg-emerald-400 text-white"} text-black font-black text-xl transition-all active:scale-95 flex items-center justify-center gap-2 group`}
          >
            <span className="tracking-tight">{isBigWin ? "GET REWARD" : "다시 하기"}</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
          
          <button
            onClick={onClose}
            className="w-full h-12 rounded-xl bg-white/5 text-zinc-500 font-bold text-sm hover:text-white hover:bg-white/10 transition-all"
          >
            닫기
          </button>
          
          {isFail && (
            <button
               onClick={() => { playTabTouch(); onClose(); navigate("/"); }}
               className="w-full h-10 rounded-xl bg-white/5 text-zinc-500 font-bold text-xs hover:text-white hover:bg-white/10 transition-all opacity-60 hover:opacity-100"
            >
              다른 게임 하러 가기
            </button>
          )}
        </div>

        {/* Decorative corner glow */}
        {isBigWin && (
          <div className="absolute -top-10 -left-10 w-32 h-32 bg-[#D2FD9C]/10 blur-[60px] pointer-events-none rounded-full" />
        )}
      </div>
    </div>
  );
}
