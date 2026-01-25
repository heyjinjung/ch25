import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Coins, X, RotateCw } from "lucide-react";
import confetti from "canvas-confetti";
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
  useEffect(() => {
    if (isOpen) {
      const end = Date.now() + 1000;
      const colors = ["#D2FD9C", "#FFFFFF", "#FFD700"];

      (function frame() {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: colors,
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: colors,
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      })();
    }
  }, [isOpen]);

  const getRewardIcon = (type: string) => {
    void type;
    // You can expand this with more specific icons based on type
    return <Coins className="w-12 h-12 text-[#D2FD9C]" />;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />

          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            className="relative w-full max-w-sm bg-[#121214] border border-white/10 rounded-[32px] p-6 shadow-2xl flex flex-col items-center gap-6 overflow-hidden"
          >
            {/* Glow Effect Background */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] bg-[#D2FD9C] opacity-20 blur-[80px] pointer-events-none" />

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
              <span className="text-sm font-bold text-[#D2FD9C] tracking-[0.2em] uppercase drop-shadow-[0_0_10px_rgba(210,253,156,0.5)]">
                Congratulation
              </span>
              <h2 className="text-3xl font-black text-white italic tracking-wider drop-shadow-lg">
                YOU WIN!
              </h2>
            </div>

            <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-[#1F1F22] to-[#0A0A0B] border border-white/5 flex items-center justify-center shadow-[inset_0_2px_4px_rgba(255,255,255,0.05)]">
              {/* Inner Glow Circle */}
              <div className="absolute inset-0 rounded-full border border-white/5 animate-[spin_10s_linear_infinite]" />
              <div className="relative z-10 drop-shadow-[0_0_15px_rgba(210,253,156,0.6)]">
                {getRewardIcon(rewardType)}
              </div>
            </div>

            <div className="flex flex-col items-center z-10">
              <span className="text-zinc-400 text-sm font-medium">
                {getRewardItemLabel(rewardType)}
              </span>
              <span className="text-4xl font-black text-white font-mono tracking-tight mt-1">
                +{rewardAmount.toLocaleString()}
              </span>
            </div>

            <button
              onClick={onClose}
              className="w-full h-14 bg-[#D2FD9C] hover:bg-[#B8EA81] text-black font-black text-lg rounded-2xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(210,253,156,0.3)] transition-all active:scale-95 z-10"
            >
              <RotateCw className="w-5 h-5" />
              <span className="tracking-wider">SPIN AGAIN</span>
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
