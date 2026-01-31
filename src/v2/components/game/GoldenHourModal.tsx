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
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-[340px] overflow-hidden rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 배경 그라데이션 */}
            <div className="absolute inset-0 bg-gradient-to-br from-amber-600 via-yellow-500 to-orange-500" />

            {/* 반짝이는 효과 */}
            <div className="absolute inset-0 overflow-hidden">
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 bg-white rounded-full"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                  }}
                  animate={{
                    opacity: [0, 1, 0],
                    scale: [0, 1.5, 0],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: Math.random() * 2,
                  }}
                />
              ))}
            </div>

            {/* 닫기 버튼 */}
            <button
              onClick={onClose}
              aria-label="닫기"
              className="absolute top-3 right-3 z-10 p-2 rounded-full bg-black/20 hover:bg-black/40 transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>

            {/* 컨텐츠 */}
            <div className="relative z-10 p-6 pt-8 text-center">
              {/* 아이콘 */}
              <motion.div
                animate={{
                  rotate: [0, 10, -10, 0],
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="inline-flex items-center justify-center w-20 h-20 mb-4 rounded-full bg-white/20 backdrop-blur"
              >
                {isActive ? (
                  <Zap className="w-10 h-10 text-white fill-white" />
                ) : (
                  <Clock className="w-10 h-10 text-white" />
                )}
              </motion.div>

              {/* 상태 배지 */}
              <div className="mb-3">
                {isActive ? (
                  <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white text-amber-600 font-bold text-sm">
                    <Sparkles className="w-4 h-4" />
                    진행 중
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/20 text-white font-bold text-sm backdrop-blur">
                    <Clock className="w-4 h-4" />곧 시작
                  </span>
                )}
              </div>

              {/* 타이틀 */}
              <h2 className="text-2xl font-black text-white mb-2 drop-shadow-lg">
                ⚡ 골든아워
              </h2>

              {/* 배율 표시 */}
              <div className="mb-4">
                <span className="text-5xl font-black text-white drop-shadow-lg">
                  {multiplier}x
                </span>
                <p className="text-white/90 text-sm mt-1">보상 배율 적용</p>
              </div>

              {/* 시간 정보 */}
              <div className="mb-5 px-4 py-3 rounded-2xl bg-black/20 backdrop-blur">
                <div className="flex items-center justify-center gap-2 text-white">
                  <Clock className="w-4 h-4" />
                  <span className="font-bold">
                    {formatTime(startTime)} ~ {formatTime(endTime)}
                  </span>
                </div>

                {isUpcoming && countdown > 0 && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-2 text-white font-bold"
                  >
                    <span className="text-3xl">{countdown}</span>
                    <span className="text-sm ml-1">분 후 시작!</span>
                  </motion.p>
                )}
              </div>

              {/* 설명 */}
              <p className="text-white/80 text-sm mb-5 leading-relaxed">
                {isActive
                  ? "지금 게임을 플레이하면 보상이 2배!"
                  : "골든아워가 곧 시작됩니다. 놓치지 마세요!"}
              </p>

              {/* CTA 버튼 */}
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleGoToGame}
                className="w-full py-4 rounded-2xl bg-white text-amber-600 font-bold text-lg shadow-lg hover:shadow-xl transition-shadow"
              >
                {isActive ? "🎲 지금 게임하기" : "🎲 게임 준비하기"}
              </motion.button>

              {/* 하단 안내 */}
              <p className="mt-4 text-white/60 text-xs">
                매일 {formatTime(startTime)} ~ {formatTime(endTime)} 진행
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
