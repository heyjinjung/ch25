import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import gsap from "gsap";
import confetti from "canvas-confetti";
import { Ghost, Skull, X } from "lucide-react";
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
  const {
    playTabTouch,
    playSmallWin,
    playDiceLose,
    triggerHapticLight,
    triggerHapticStrong,
    triggerHapticSuccess,
    triggerHapticFail,
  } = useSound();

  const [typedSubtitle, setTypedSubtitle] = useState("");

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
            colors: ["#FFD700", "#FF8A00", "#FF3B3B", "#FFFFFF"],
            zIndex: 10000,
          });
          tl.add(() => {
            playSmallWin();
            triggerHapticStrong();
          }, "-=0.3");
        } else if (isLose) {
          // Golden Hour LOSE: 패배감 있지만 과하지 않은 애니메이션
          // 1. 먼저 부드럽게 등장
          tl.fromTo(
            contentRef.current,
            { scale: 0.9, opacity: 0, y: 20 },
            {
              scale: 1,
              opacity: 1,
              y: 0,
              duration: 0.35,
              ease: "power2.out",
            },
            "-=0.1",
          );
          // 2. 등장 후 약간의 슬픈 흔들림 (좌우로 천천히)
          tl.to(contentRef.current, {
            x: -4,
            duration: 0.12,
            ease: "sine.inOut",
          });
          tl.to(contentRef.current, {
            x: 4,
            duration: 0.12,
            ease: "sine.inOut",
          });
          tl.to(contentRef.current, {
            x: -2,
            duration: 0.1,
            ease: "sine.inOut",
          });
          tl.to(contentRef.current, {
            x: 0,
            duration: 0.1,
            ease: "sine.out",
          });
          // 3. 마지막에 살짝 아래로 처지는 느낌
          tl.to(contentRef.current, {
            y: 3,
            duration: 0.2,
            ease: "power2.out",
          });
          tl.add(() => {
            playDiceLose();
            triggerHapticStrong();
          }, "-=0.4");
        } else {
          // 골든아워 무승부
          tl.fromTo(
            contentRef.current,
            { scale: 0.8, opacity: 0 },
            { scale: 1, opacity: 1, duration: 0.4 },
          );
          tl.add(() => {
            triggerHapticLight();
          });
        }
      } else {
        if (isWin) {
          // 일반 승리: "살짝 떠오름" 애니메이션 (opacity + translate + scale, 회전 금지)
          tl.fromTo(
            contentRef.current,
            { scale: 0.88, opacity: 0, y: 40 },
            {
              scale: 1.02,
              opacity: 1,
              y: -8,
              duration: 0.45,
              ease: "power2.out",
            },
            "-=0.1",
          );
          // 살짝 위로 떠오른 후 제자리로 착지
          tl.to(contentRef.current, {
            scale: 1,
            y: 0,
            duration: 0.25,
            ease: "power2.inOut",
          });
          if (shineRef.current) {
            gsap.fromTo(
              shineRef.current,
              { x: "-100%", opacity: 0 },
              {
                x: "100%",
                opacity: 0.5,
                duration: 1.0,
                ease: "power2.inOut",
                delay: 0.15,
              },
            );
          }
          tl.add(() => {
            playSmallWin();
            triggerHapticSuccess();
          }, "-=0.5");
        } else if (isDraw) {
          // 무승부: 기존 애니메이션 유지
          tl.fromTo(
            contentRef.current,
            { scale: 0.96, opacity: 0, y: 18 },
            { scale: 1, opacity: 1, y: 0, duration: 0.5, ease: "power3.out" },
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
            triggerHapticLight();
          }, "-=0.4");
        } else if (isLose) {
          tl.fromTo(
            contentRef.current,
            { opacity: 0, y: 0, filter: "grayscale(1)" },
            {
              opacity: 1,
              y: 0,
              filter: "grayscale(0.5)",
              duration: 0.45,
              ease: "power2.out",
            },
            "-=0.1",
          );
          tl.add(() => {
            playDiceLose();
            triggerHapticFail();
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
  }, [isOpen, outcome, isGoldenHour, playSmallWin, playDiceLose, triggerHapticLight, triggerHapticStrong, triggerHapticSuccess, triggerHapticFail]);

  const { subtitleText, isGoldenWin, isGoldenLose, isNormalWin, isNormalLose } =
    useMemo(() => {
      const isWin = outcome === "WIN";
      const isLose = outcome === "LOSE";

      const isGoldenWin = Boolean(isGoldenHour && isWin);
      const isGoldenLose = Boolean(isGoldenHour && isLose);
      const isNormalWin = Boolean(!isGoldenHour && isWin);
      const isNormalLose = Boolean(!isGoldenHour && isLose);

      const subtitleText = isGoldenWin
        ? "2배 적립 축하"
        : isNormalWin
          ? "승리 축하"
          : isGoldenLose
            ? "2배 놓침 ㅠㅠ"
            : isNormalLose
              ? "패배했습니다"
              : outcome === "DRAW"
                ? "무승부"
                : "";

      return {
        subtitleText,
        isGoldenWin,
        isGoldenLose,
        isNormalWin,
        isNormalLose,
      };
    }, [isGoldenHour, outcome]);

  useEffect(() => {
    if (!isOpen) return;
    setTypedSubtitle("");

    if (!subtitleText) return;

    let index = 0;
    const intervalId = window.setInterval(() => {
      index += 1;
      setTypedSubtitle(subtitleText.slice(0, index));
      if (index >= subtitleText.length) {
        window.clearInterval(intervalId);
      }
    }, 45);

    return () => window.clearInterval(intervalId);
  }, [isOpen, subtitleText]);

  if (!outcome) return null;

  const isWin = outcome === "WIN";
  const isDraw = outcome === "DRAW";
  const isLose = outcome === "LOSE";

  const titleText = isWin ? "승리" : isDraw ? "무승부" : "패배";
  const titleColor = isGoldenWin
    ? "bg-gradient-to-r from-[#FFD700] via-[#FFB800] to-[#FFA500] text-transparent bg-clip-text drop-shadow-[0_0_22px_rgba(255,196,0,0.56)]"
    : isNormalWin
      ? "bg-gradient-to-r from-[#22C55E] via-[#4ADE80] to-[#22C55E] text-transparent bg-clip-text drop-shadow-[0_0_18px_rgba(34,197,94,0.45)]"
      : isGoldenLose
        ? "text-zinc-200 drop-shadow-[0_0_18px_rgba(168,85,247,0.30)]"
        : isNormalLose
          ? "text-zinc-200 drop-shadow-[0_0_16px_rgba(0,0,0,0.55)]"
          : isDraw
            ? "text-amber-300 drop-shadow-[0_0_15px_rgba(251,191,36,0.45)]"
            : "text-white";

  const renderIcon = () => {
    if (isWin) {
      return (
        <div
          className={cn(
            "relative mb-5",
            isGoldenWin
              ? "drop-shadow-[0_0_32px_rgba(255,59,59,0.44)]"
              : "drop-shadow-[0_0_22px_rgba(255,59,59,0.22)]",
          )}
        >
          <img
            src="/assets/icon_dice_silver.webp"
            alt="주사위"
            width={74}
            height={74}
            className="h-[74px] w-[74px] select-none"
            draggable={false}
          />
        </div>
      );
    }

    if (isDraw) {
      return (
        <div className="text-6xl mb-4 animate-pulse" aria-hidden>
          🤝
        </div>
      );
    }

    if (isGoldenLose) {
      return (
        <div className="relative mb-5 drop-shadow-[0_0_24px_rgba(168,85,247,0.30)]">
          <Skull className="h-[74px] w-[74px] text-zinc-200" />
        </div>
      );
    }

    return (
      <div className="relative mb-5 drop-shadow-[0_0_20px_rgba(0,0,0,0.55)]">
        <Ghost className="h-[74px] w-[74px] text-zinc-200/90" />
      </div>
    );
  };

  const cardClassName = cn(
    "w-full max-w-[360px] rounded-[32px] p-8 flex flex-col items-center relative overflow-hidden backdrop-blur-xl",
    isGoldenWin &&
      "bg-gradient-to-b from-[#350e17]/70 to-[#0b0b10]/70 ring-1 ring-red-500/62 shadow-[0_0_50px_rgba(255,0,84,0.31)]",
    isNormalWin &&
      "bg-gradient-to-b from-[#0b2a18]/70 to-[#0b0b10]/70 ring-1 ring-emerald-500/40 shadow-[0_0_35px_rgba(16,185,129,0.2)]",
    isGoldenLose &&
      "bg-white/[0.05] ring-1 ring-purple-500/36 shadow-[0_0_48px_rgba(88,28,135,0.22)]",
    isNormalLose &&
      "bg-white/[0.05] ring-1 ring-black/30 shadow-[0_20px_50px_rgba(0,0,0,0.55)]",
    isDraw &&
      "bg-white/[0.06] ring-1 ring-amber-500/25 shadow-[0_20px_50px_rgba(0,0,0,0.55)]",
  );

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md opacity-0 pointer-events-none transition-opacity duration-300"
    >
      <div
        ref={contentRef}
        className={cn(
          cardClassName,
          !isGoldenHour && isLose && "grayscale-[0.15]",
        )}
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

        <div className="flex flex-col items-center gap-2 mb-4 w-full">
          <h2
            className={cn(
              "text-[36px] font-black tracking-tight leading-[1.05] text-center px-2 max-w-[280px] break-keep",
              titleColor,
            )}
          >
            <EncryptedText
              key={`title-${isOpen}-${outcome}`}
              text={titleText}
            />
          </h2>
        </div>

        <p
          className={cn(
            "text-sm font-extrabold mb-7 text-center tracking-tight",
            isGoldenWin && "text-red-100/90",
            isNormalWin && "text-emerald-100/90",
            (isGoldenLose || isNormalLose) && "text-zinc-300/85",
            isDraw && "text-amber-200/85",
          )}
          aria-label={subtitleText}
        >
          {typedSubtitle}
          <span className="inline-block w-[6px]" />
        </p>

        <div className="w-full bg-white/[0.06] rounded-2xl p-5 mb-7 border border-white/10 flex flex-col items-center relative">
          <div className="flex items-center gap-2">
            <img
              src="/assets/asset_coin_gold.webp"
              alt="CC 코인"
              width={20}
              height={20}
              className="h-5 w-5 select-none"
              draggable={false}
            />
            <div
              className={cn(
                "text-3xl font-black tracking-tight",
                vaultEarn >= 0 ? "text-white" : "text-red-400",
              )}
            >
              {vaultEarn >= 0
                ? `+${vaultEarn.toLocaleString()}`
                : vaultEarn.toLocaleString()}
            </div>
            <span className="text-sm font-bold text-zinc-400">P</span>
          </div>
        </div>

        <div className="w-full flex flex-col gap-3 z-10">
          <button
            onClick={() => {
              playTabTouch();
              onClose();
            }}
            className={cn(
              "w-full h-14 rounded-2xl font-black text-lg transition-all active:scale-95",
              isGoldenWin
                ? "bg-gradient-to-r from-[#FF3B3B] to-[#FF8A00] text-black shadow-[0_0_24px_rgba(255,59,59,0.25)]"
                : isNormalWin
                  ? "bg-gradient-to-r from-[#22C55E] to-[#10B981] text-white shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:from-[#16A34A] hover:to-[#059669]"
                  : "bg-white text-black hover:bg-zinc-200",
            )}
          >
            다시하기
          </button>

          <button
            onClick={() => {
              playTabTouch();
              onClose();
              navigate("/game");
            }}
            className="w-full h-12 rounded-2xl bg-white/5 text-zinc-200 font-extrabold text-sm hover:text-white hover:bg-white/10 transition-all"
          >
            다른게임
          </button>

        </div>
      </div>
    </div>
  );
}
