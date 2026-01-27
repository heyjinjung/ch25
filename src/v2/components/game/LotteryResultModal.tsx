import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import gsap from "gsap";
import confetti from "canvas-confetti";
import { useSound } from "../../../hooks/useSound";
import { EncryptedText } from "../ui/EncryptedText";

interface LotteryResultModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly prizeLabel: string;
  readonly rewardType: string;
  readonly rewardAmount: number;
  readonly onReset: () => void;
}

export default function LotteryResultModal({
  isOpen,
  onClose,
  prizeLabel,
  rewardType,
  rewardAmount,
  onReset,
}: LotteryResultModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const shineRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { playTabTouch, playBigWin, playSmallWin, playDiceLose } = useSound();

  // Tier Classification Logic (Technical Trigger)
  const safePrizeLabel = prizeLabel || "";
  const isPoint = rewardType === "POINT";
  const isTicket = rewardType === "TICKET";

  // Improve prize name specificity
  const displayPrizeName = (() => {
    if (isPoint) return `${rewardAmount.toLocaleString()} 포인트`;
    if (isTicket) return `티켓 ${rewardAmount}장`;
    return safePrizeLabel;
  })();

  // Updated: FAIL includes 1-5 tickets (as consolation) or NONE
  const isFail =
    rewardType === "NONE" ||
    (isTicket && rewardAmount >= 1 && rewardAmount <= 5) ||
    safePrizeLabel.includes("꽝");

  const isRareTicket =
    isTicket &&
    !isFail &&
    (safePrizeLabel.toLowerCase().includes("gold") ||
      safePrizeLabel.toLowerCase().includes("diamond"));

  // Refined: Points are only BigWin if >= 2000
  const isBigWin = (isPoint && rewardAmount >= 2000) || isRareTicket;
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

      // Helper for Telegram Haptic to avoid type errors
      const triggerHaptic = (style: "heavy" | "medium" | "light" | "error") => {
        try {
          const haptic = (window as any).Telegram?.WebApp?.HapticFeedback;
          if (haptic) {
            if (style === "error") haptic.notificationOccurred("error");
            else
              haptic.impactOccurred(
                style === "light"
                  ? "light"
                  : style === "medium"
                    ? "medium"
                    : "heavy",
              );
          }
        } catch {
          /* silent fail */
        }
      };

      if (isBigWin) {
        // Celestial Reveal (Big Win)
        triggerHaptic("heavy");

        tl.fromTo(
          contentRef.current,
          {
            scale: 0.5,
            opacity: 0,
            y: 40,
            background:
              "linear-gradient(135deg, #FF3B3B 0%, #FF8A00 50%, #FF0054 100%)",
          },
          { scale: 1, opacity: 1, y: 0, duration: 0.6, ease: "back.out(1.5)" },
          "-=0.1",
        );

        // 2s Intense Confetti
        const duration = 2 * 1000;
        const end = Date.now() + duration;
        const frame = () => {
          confetti({
            particleCount: 5,
            angle: 60,
            spread: 55,
            origin: { x: 0, y: 0.65 },
            colors: ["#FF3B3B", "#FFD700", "#FF0054"],
            zIndex: 10000,
          });
          confetti({
            particleCount: 5,
            angle: 120,
            spread: 55,
            origin: { x: 1, y: 0.65 },
            colors: ["#FF3B3B", "#FFD700", "#FF0054"],
            zIndex: 10000,
          });
          if (Date.now() < end) requestAnimationFrame(frame);
        };
        frame();

        // GSAP Shine Effect (Enhanced)
        if (shineRef.current) {
          gsap.fromTo(
            shineRef.current,
            { x: "-150%", opacity: 0 },
            {
              x: "150%",
              opacity: 0.8,
              duration: 2,
              ease: "power2.inOut",
              repeat: -1,
            },
          );
        }
        tl.add(() => {
          playBigWin();
        }, "-=0.4");
      } else if (isNormal) {
        // Stable Victory (Normal)
        triggerHaptic("medium");

        tl.fromTo(
          contentRef.current,
          { scale: 0.85, opacity: 0, y: 20 },
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
        }, "-=0.3");
      } else {
        // FAIL
        triggerHaptic("error");

        tl.fromTo(
          contentRef.current,
          { opacity: 0, y: -20, scale: 1.05 },
          { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: "power4.out" },
          "-=0.1",
        );
        tl.add(() => {
          playDiceLose();
        }, "-=0.2");
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
  }, [
    isOpen,
    isBigWin,
    isNormal,
    isFail,
    playBigWin,
    playSmallWin,
    playDiceLose,
  ]);

  if (!isOpen) return null;

  const renderIcon = () => {
    if (isBigWin) {
      const assetPath = isPoint
        ? "/assets/asset_coin_gold.webp"
        : safePrizeLabel.toLowerCase().includes("gold")
          ? "/assets/icons/goldkey.png"
          : "/assets/icons/diakey.png";
      return (
        <div className="relative mb-6 drop-shadow-[0_0_50px_rgba(255,0,84,0.31)] scale-125">
          <img
            src={assetPath}
            alt="Prize"
            className="w-24 h-24 object-contain"
          />
        </div>
      );
    }

    // Normal Icon Logic
    if (isNormal) {
      const pKey = safePrizeLabel.toUpperCase();
      let normalAsset = "/assets/lottery/icon_gift.webp"; // Fallback

      if (isPoint) {
        normalAsset = "/assets/asset_coin_gold.webp";
      } else if (isTicket) {
        normalAsset = "/assets/asset_ticket_green.webp";
      } else {
        // Item Mapping
        if (pKey.includes("치킨")) normalAsset = "/assets/icons/chiken.png";
        else if (pKey.includes("피자"))
          normalAsset = "/assets/icons/pizza2.png";
        else if (pKey.includes("버거") || pKey.includes("햄버거"))
          normalAsset = "/assets/icons/burgerset.png";
        else if (pKey.includes("배민") || pKey.includes("배달"))
          normalAsset = "/assets/icons/baemin.png";
        else if (pKey.includes("스타벅스") || pKey.includes("커피"))
          normalAsset = "/assets/icons/takeaway-cup-dynamic-color.png";
      }

      return (
        <div className="relative mb-6 drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]">
          <img
            src={normalAsset}
            alt="Prize"
            className="w-20 h-20 object-contain"
          />
        </div>
      );
    }

    // Tier 3: FAIL (Skull Icon)
    return (
      <div className="flex flex-col items-center gap-2 mb-6 opacity-60 grayscale">
        <span className="text-7xl">💀</span>
      </div>
    );
  };

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md opacity-0 pointer-events-none transition-opacity duration-300"
    >
      <div
        ref={contentRef}
        className={`w-full max-w-[340px] rounded-[40px] p-8 flex flex-col items-center relative overflow-hidden transition-all duration-500
          ${
            isBigWin
              ? "bg-gradient-to-br from-[#FF3B3B]/70 via-[#FF8A00]/70 to-[#FF0054]/70 ring-2 ring-red-500/62 shadow-[0_0_50px_rgba(255,0,84,0.31)]"
              : isNormal
                ? "bg-[#121214] border-2 border-yellow-500/50 shadow-[0_0_30px_rgba(234,179,8,0.2)]"
                : "bg-white/5 backdrop-blur-xl border border-white/10 grayscale-[0.8] mix-blend-luminosity"
          }`}
      >
        {/* Shine/Glow Layer */}
        {isBigWin && (
          <div
            ref={shineRef}
            className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 pointer-events-none z-20"
          />
        )}

        <div
          className={`absolute top-0 inset-x-0 h-40 bg-gradient-to-b ${isBigWin ? "from-white/20" : isNormal ? "from-yellow-500/10" : "from-emerald-900/10"} to-transparent pointer-events-none`}
        />

        {/* Header Section */}
        <div className="flex flex-col items-center gap-1 mb-6 z-10 relative">
          <span
            className={`text-[10px] font-black uppercase tracking-[0.4em] ${isBigWin ? "text-white" : isNormal ? "text-yellow-500/80" : "text-zinc-500/60"}`}
          >
            당첨 결과
          </span>
          <h2
            className={`text-4xl font-black italic tracking-tighter ${isBigWin ? "text-white drop-shadow-lg" : isNormal ? "text-yellow-400" : "text-zinc-600"}`}
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

        {renderIcon()}

        {/* Prize Name - BIG WIN gets EncryptedText enhancement */}
        <div className="flex flex-col items-center z-10 w-full px-4 mb-8">
          <span
            className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 font-mono ${isBigWin ? "text-white/70" : "text-zinc-500"}`}
          >
            획득 상품
          </span>
          <div
            className={`text-2xl font-black text-center leading-tight tracking-tight drop-shadow-md min-h-[1.5em] ${isBigWin ? "text-white" : isNormal ? "text-zinc-100" : "text-zinc-500"}`}
          >
            {isBigWin ? (
              <EncryptedText
                key={`prize-${displayPrizeName}-${isOpen}`}
                text={displayPrizeName}
                loop={true}
              />
            ) : (
              <div className="animate-pulse-subtle">{displayPrizeName}</div>
            )}
          </div>
        </div>

        {/* Action Button */}
        <div className="w-full flex flex-col gap-3 z-10">
          <button
            onClick={() => {
              playTabTouch();
              onReset();
              onClose();
            }}
            className={`w-full h-14 rounded-2xl font-black text-lg transition-all active:scale-95 shadow-xl
              ${
                isBigWin
                  ? "bg-white text-red-600 hover:scale-105"
                  : isNormal
                    ? "bg-yellow-400 text-black hover:bg-yellow-300"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}
          >
            {isBigWin ? "확인" : "다시 하기"}
          </button>

          <button
            onClick={onClose}
            className={`w-full h-10 rounded-xl font-bold text-sm transition-all
              ${isBigWin ? "bg-white/20 text-white hover:bg-white/30" : "bg-white/5 text-zinc-500 hover:text-white hover:bg-white/10"}`}
          >
            닫기
          </button>

          {isFail && (
            <button
              onClick={() => {
                playTabTouch();
                onClose();
                navigate("/");
              }}
              className="w-full h-9 rounded-xl bg-white/5 text-zinc-500 font-bold text-xs hover:text-white hover:bg-white/10 transition-all opacity-60 hover:opacity-100"
            >
              다른 게임 하러 가기
            </button>
          )}
        </div>

        {/* Decorative elements for Big Win */}
        {isBigWin && (
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-yellow-500/10 blur-[80px] pointer-events-none rounded-full" />
        )}
      </div>
    </div>
  );
}
