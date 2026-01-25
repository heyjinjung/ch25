import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, RotateCw, Trophy } from "lucide-react";
import confetti from "canvas-confetti";

interface LotteryResultModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly prizeLabel: string;
  readonly onReset: () => void;
}

export default function LotteryResultModal({
  isOpen,
  onClose,
  prizeLabel,
  onReset,
}: LotteryResultModalProps) {
  useEffect(() => {
    if (isOpen) {
      const end = Date.now() + 1000;
      const colors = ["#FF4D4D", "#FFFFFF", "#D2FD9C"];

      (function frame() {
        confetti({
          particleCount: 4,
          angle: 60,
          spread: 60,
          origin: { x: 0 },
          colors: colors,
        });
        confetti({
          particleCount: 4,
          angle: 120,
          spread: 60,
          origin: { x: 1 },
          colors: colors,
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      })();
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />

          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            className="relative w-full max-w-sm bg-[#121214] border border-white/10 rounded-[32px] p-6 shadow-2xl flex flex-col items-center gap-6 overflow-hidden"
          >
            {/* Glow Effect */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] bg-[#FF4D4D] opacity-15 blur-[80px] pointer-events-none" />

            <div className="absolute top-4 right-4">
              <button
                onClick={onClose}
                aria-label="Close"
                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col items-center gap-2 z-10">
              <span className="text-sm font-bold text-[#FF4D4D] tracking-[0.2em] uppercase drop-shadow-[0_0_10px_rgba(255,77,77,0.5)]">
                Lottery Result
              </span>
              <h2 className="text-3xl font-black text-white italic tracking-wider drop-shadow-lg text-center">
                DRAW COMPLETED
              </h2>
            </div>

            <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-[#1F1F22] to-[#0A0A0B] border border-white/5 flex items-center justify-center shadow-[inset_0_2px_4px_rgba(255,255,255,0.05)]">
              <div className="absolute inset-0 rounded-full border border-white/5 animate-[spin_12s_linear_infinite]" />
              <div className="relative z-10 drop-shadow-[0_0_15px_rgba(255,77,77,0.6)]">
                 {/* Placeholder Icon or Image depending on logic, using Trophy for now */}
                 <Trophy className="w-12 h-12 text-[#FF4D4D]" />
              </div>
            </div>

            <div className="flex flex-col items-center z-10">
              <span className="text-zinc-400 text-sm font-medium uppercase tracking-wide">
                Winning Prize
              </span>
              <span className="text-2xl font-black text-white font-mono tracking-tight mt-1 text-center">
                {prizeLabel}
              </span>
            </div>

            <button
              onClick={() => {
                onReset();
                onClose();
              }}
              className="w-full h-14 bg-[#FF4D4D] hover:bg-[#FF3333] text-white font-black text-lg rounded-2xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,77,77,0.3)] transition-all active:scale-95 z-10"
            >
              <RotateCw className="w-5 h-5" />
              <span className="tracking-wider">PLAY AGAIN</span>
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
