import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../../contexts/ThemeContext";

interface Prize {
  readonly id: number;
  readonly label: string;
  readonly reward_type: string;
  readonly reward_amount: string | number;
}

interface LotteryCardProps {
  readonly prize?: Prize;
  readonly isRevealed: boolean;
  readonly isScratching: boolean;
  readonly onScratch: () => void;
}

const LotteryCard: React.FC<LotteryCardProps> = ({
  prize,
  isRevealed,
  isScratching,
  onScratch,
}) => {
  const { theme } = useTheme();
  const primaryGlowClass =
    {
      "#4F46E5": "bg-[#4F46E5]",
      "#D4AF37": "bg-[#D4AF37]",
      "#C41E3A": "bg-[#C41E3A]",
    }[theme.colors.primary] ?? "bg-[#4F46E5]";
  const accentGlowClass =
    {
      "#FACC15": "bg-[#FACC15]",
      "#FFFFFF": "bg-white",
      "#FFD700": "bg-[#FFD700]",
    }[theme.colors.accent] ?? "bg-[#FACC15]";
  const primaryTextClass =
    {
      "#4F46E5": "text-[#4F46E5]",
      "#D4AF37": "text-[#D4AF37]",
      "#C41E3A": "text-[#C41E3A]",
    }[theme.colors.primary] ?? "text-[#4F46E5]";
  const accentTextClass =
    {
      "#FACC15": "text-[#FACC15]",
      "#FFFFFF": "text-white",
      "#FFD700": "text-[#FFD700]",
    }[theme.colors.accent] ?? "text-[#FACC15]";

  const getRewardLabel = (
    rewardType: string,
    amount: string | number,
  ): string => {
    const cleanType = rewardType.toUpperCase();
    if (cleanType.includes("TICKET")) return `${amount} Tickets`;
    if (cleanType === "VAULT" || cleanType === "POINT")
      return `₩${Number(amount).toLocaleString()}`;
    if (cleanType.includes("FRAGMENT")) return `${amount}pcs`;
    if (cleanType.includes("PUZZLE")) return "Puzzle Piece";
    return `${amount} Reward`;
  };

  const getPuzzleCode = (type: string) => {
    return type.replace("PUZZLE_", "");
  };

  return (
    <div className="w-full max-w-[300px] mx-auto">
      <div className="relative aspect-[4/5] w-full rounded-[2.5rem] border border-white/5 bg-zinc-900/40 p-3 shadow-2xl backdrop-blur-md overflow-hidden">
        {/* Decorative elements */}
        <div
          className={`absolute -top-24 -left-24 w-48 h-48 rounded-full blur-[80px] opacity-20 ${primaryGlowClass}`}
        />
        <div
          className={`absolute -bottom-24 -right-24 w-48 h-48 rounded-full blur-[80px] opacity-20 ${accentGlowClass}`}
        />

        <motion.div
          className="relative h-full w-full rounded-[2rem] bg-zinc-950 border border-white/5 overflow-hidden group cursor-pointer"
          onClick={!isRevealed && !isScratching ? onScratch : undefined}
          whileTap={!isRevealed ? { scale: 0.98 } : {}}
        >
          <AnimatePresence mode="wait">
            {!isRevealed ? (
              <motion.div
                key="scratch-cover"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-20"
              >
                {/* Premium Texture Layer */}
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_2px_2px,rgba(255,255,255,0.05)_1px,transparent_0)] bg-[length:16px_16px]" />

                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/10 flex items-center justify-center mb-6 shadow-xl">
                  <motion.div
                    animate={
                      isScratching
                        ? { rotate: [0, -10, 10, -10, 10, 0] }
                        : { y: [0, -5, 0] }
                    }
                    transition={
                      isScratching
                        ? { duration: 0.5, repeat: Infinity }
                        : { duration: 2, repeat: Infinity }
                    }
                    className="text-4xl"
                  >
                    🧤
                  </motion.div>
                </div>
                <h3 className="text-xl font-black text-white/80 tracking-tight uppercase italic mb-2">
                  Scratch Here
                </h3>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-4 py-2 bg-white/5 rounded-full border border-white/5">
                  Gold Pass Edition
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="prize-reveal"
                initial={{ scale: 0.8, opacity: 0, rotateY: 90 }}
                animate={{ scale: 1, opacity: 1, rotateY: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-transparent to-zinc-900/50"
              >
                {prize ? (
                  <div className="flex flex-col items-center">
                    <motion.div
                      key={prize.id}
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="flex flex-col items-center gap-4"
                    >
                      <div className="w-24 h-24 rounded-3xl bg-white/5 border border-white/10 shadow-inner flex items-center justify-center overflow-hidden relative group">
                        <div className="absolute inset-0 bg-white/5 group-hover:bg-white/10 transition-colors" />
                        <span className="text-5xl drop-shadow-lg z-10">
                          {prize.reward_type.includes("PUZZLE")
                            ? "🧩"
                            : prize.reward_type.includes("TICKET")
                              ? "🎟️"
                              : prize.reward_type.includes("VAULT")
                                ? "💰"
                                : "🎁"}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <h4 className="text-xs font-black text-white/40 uppercase tracking-[0.2em]">
                          You Won
                        </h4>
                        <div className="text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow-md">
                          {prize.reward_type.includes("PUZZLE") ? (
                            <span
                              className={`flex items-center gap-2 ${accentTextClass}`}
                            >
                              PUZZLE {getPuzzleCode(prize.reward_type)}
                            </span>
                          ) : (
                            <span className={primaryTextClass}>
                              {getRewardLabel(
                                prize.reward_type,
                                prize.reward_amount,
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 1 }}
                      className="mt-8 flex flex-col items-center"
                    >
                      <div className="h-px w-8 bg-white/10 mb-4" />
                      <p className="text-[10px] font-bold text-zinc-500 uppercase italic">
                        Reward sent to inbox
                      </p>
                    </motion.div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center opacity-50">
                    <span className="text-5xl mb-4">💨</span>
                    <h3 className="text-xl font-black text-white tracking-tight uppercase italic">
                      No Luck
                    </h3>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase">
                      Better luck next time
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Bottom info */}
      <div className="mt-4 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${primaryGlowClass}`} />
          <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">
            Scratch & Win
          </span>
        </div>
        <span className="text-[11px] font-mono font-bold text-white/20">
          2026-V2
        </span>
      </div>
    </div>
  );
};

export default LotteryCard;
