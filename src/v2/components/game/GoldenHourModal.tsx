/**
 * 골든아워 알림 모달
 * - 텔레그램 인앱뷰 사이즈에 최적화
 * - 시작 10분 전부터 표시
 * - 골든아워 진행 중에도 표시
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Clock, Zap, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface GoldenHourModalProps {
  isOpen: boolean;
  onClose: () => void;
  isActive: boolean;
  isUpcoming: boolean;
  minutesUntilStart: number | null;
  multiplier: number;
  startTime: string;
  endTime: string;
}

export default function GoldenHourModal({
  isOpen,
  onClose,
  isActive,
  isUpcoming,
  minutesUntilStart,
  multiplier,
  startTime,
  endTime,
}: GoldenHourModalProps) {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(minutesUntilStart ?? 0);

  useEffect(() => {
    if (isUpcoming && minutesUntilStart !== null) {
      setCountdown(minutesUntilStart);
      const interval = setInterval(() => {
        setCountdown((prev) => Math.max(0, prev - 1));
      }, 60000); // 1분마다 업데이트
      return () => clearInterval(interval);
    }
  }, [isUpcoming, minutesUntilStart]);

  const handleGoToGame = () => {
    onClose();
    navigate("/v2/game/dice");
  };

  // 시간 포맷 (HH:MM:SS → HH:MM)
  const formatTime = (time: string) => {
    const parts = time.split(":");
    return `${parts[0]}:${parts[1]}`;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 30 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="relative w-full max-w-[340px] overflow-hidden rounded-[32px] border border-white/10 bg-obsidian-bg shadow-2xl shadow-black/50"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Soft Obsidian Background with very subtle gold glow */}
            <div className="absolute inset-0 bg-[#121214]" />
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-gold-600/5 blur-[80px]" />
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-amber-500/5 blur-[80px]" />

            {/* Subtle Glitzy Sparks */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {[...Array(12)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-0.5 h-0.5 bg-yellow-400/30 rounded-full"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                  }}
                  animate={{
                    opacity: [0, 0.8, 0],
                    scale: [0, 1, 0],
                  }}
                  transition={{
                    duration: 2.5 + Math.random() * 2,
                    repeat: Infinity,
                    delay: Math.random() * 3,
                  }}
                />
              ))}
            </div>

            {/* 닫기 버튼 */}
            <button
              onClick={onClose}
              aria-label="닫기"
              className="absolute top-4 right-4 z-20 p-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 transition-colors"
            >
              <X className="w-4 h-4 text-obsidian-muted" />
            </button>

            {/* 컨텐츠 영역 */}
            <div className="relative z-10 p-8 pt-10 text-center flex flex-col items-center">
              {/* Icon Container with Glass Glow */}
              <div className="relative mb-6">
                <motion.div
                  animate={{
                    filter: ["drop-shadow(0 0 0px rgba(245, 158, 11, 0))", "drop-shadow(0 0 10px rgba(245, 158, 11, 0.4))", "drop-shadow(0 0 0px rgba(245, 158, 11, 0))"]
                  }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="flex items-center justify-center w-20 h-20 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl"
                >
                  {isActive ? (
                    <Zap className="w-10 h-10 text-gold-400 fill-gold-400" />
                  ) : (
                    <Clock className="w-10 h-10 text-obsidian-muted" />
                  )}
                </motion.div>
                {isActive && (
                  <motion.div 
                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute -inset-2 bg-gold-500/10 blur-xl rounded-full -z-10"
                  />
                )}
              </div>

              {/* Status Badge */}
              <div className="mb-4">
                {isActive ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold-500/10 border border-gold-500/20 text-gold-400 font-bold text-xs tracking-wider uppercase">
                    <Sparkles className="w-3 h-3" />
                    LIVE NOW
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-obsidian-muted font-bold text-xs tracking-wider uppercase">
                    <Clock className="w-3 h-3" />
                    UPCOMING
                  </span>
                )}
              </div>

              {/* Title & Multiplier */}
              <h2 className="text-xl font-bold text-white mb-1">골든아워 보상</h2>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-6xl font-black bg-gradient-to-b from-white via-gold-200 to-gold-500 bg-clip-text text-transparent">
                  {multiplier}x
                </span>
                <span className="text-gold-500 font-bold text-lg">UP</span>
              </div>

              {/* Time Badge */}
              <div className="w-full mb-8 p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                <div className="flex items-center justify-center gap-2 text-obsidian-text text-sm mb-1">
                  <Clock className="w-3.5 h-3.5 opacity-60" />
                  <span className="font-medium">
                    {formatTime(startTime)} — {formatTime(endTime)}
                  </span>
                </div>
                
                {isUpcoming && countdown > 0 && (
                  <div className="text-gold-400 font-bold mt-2 flex flex-col">
                    <span className="text-xs opacity-60 uppercase tracking-widest mb-1">Starts in</span>
                    <span className="text-2xl">{countdown} <span className="text-sm font-medium">MIN</span></span>
                  </div>
                )}
              </div>

              {/* Description */}
              <p className="text-obsidian-muted text-sm leading-relaxed mb-8 px-2">
                {isActive
                  ? "지금 게임을 클리어하면 \n압도적인 보상 배율이 적용됩니다."
                  : "특별한 보상이 준비되어 있습니다. \n시작 알림을 놓치지 마세요!"}
              </p>

              {/* CTA Button - High Contrast Gold */}
              <motion.button
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleGoToGame}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-gold-400 to-gold-600 text-obsidian-bg font-bold text-lg shadow-[0_8px_20px_-4px_rgba(245,158,11,0.4)] transition-all"
              >
                {isActive ? "지금 즉시 플레이" : "게임 대기하기"}
              </motion.button>

              {/* Footer text */}
              <p className="mt-6 text-white/20 text-[11px] uppercase tracking-[0.2em]">
                Standard Golden Hour Logic Applied
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
