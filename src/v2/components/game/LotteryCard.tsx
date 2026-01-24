import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import clsx from 'clsx';
import { useTheme } from '../../contexts/ThemeContext';

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

// ============================================================================
// Lottery Card Component
// ============================================================================

const LotteryCard = ({ prize, isRevealed, isScratching, onScratch }: LotteryCardProps) => {
  const { theme } = useTheme();
  const cardRef = useRef<HTMLDivElement>(null);
  const disabled = isScratching || isRevealed;

  // GSAP Animation for unrevealed state glow
  useEffect(() => {
    if (!isRevealed && cardRef.current) {
      const glow = gsap.timeline({ repeat: -1, yoyo: true });
      glow.to(cardRef.current, {
        boxShadow: '0 0 40px rgba(255, 215, 0, 0.3)',
        duration: 2,
        ease: 'sine.inOut',
      });
      return () => {
        glow.kill();
      };
    }
  }, [isRevealed]);

  // Format reward display
  const formatRewardText = (rewardType: string, amount: string | number): string => {
    const upper = rewardType.toUpperCase();
    const val = Number(amount) || 0;

    if (upper.includes('POINT') || upper === 'CASH' || upper === 'CURRENCY') {
      return `${val.toLocaleString()} ??;
    }
    if (upper.includes('GAME_XP')) {
      return `${val.toLocaleString()} XP`;
    }
    if (upper.includes('TICKET')) {
      return `${val.toLocaleString()} ?∞Ïºì`;
    }
    return `${val.toLocaleString()}`;
  };

  const isPuzzlePiece = prize?.reward_type.startsWith('PUZZLE_');
  const isNoReward =
    prize?.reward_type === 'NONE' ||
    (Number(prize?.reward_amount) === 0 && prize?.reward_type.includes('POINT'));

  return (
    <div className="relative mx-auto w-full max-w-sm">
      {/* Premium Outer Frame */}
      <div
        ref={cardRef}
        className="relative overflow-hidden rounded-[2.25rem] border bg-black/60 p-2 shadow-2xl backdrop-blur-3xl group transition-all duration-500"
        style={{
          borderColor: isRevealed
            ? theme.colors.primary + '40'
            : 'rgba(255, 255, 255, 0.2)',
        }}
      >
        {/* Animated Background Glows */}
        <div
          className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full blur-[100px] animate-pulse"
          style={{ backgroundColor: theme.colors.accent + '10' }}
        />
        <div
          className="pointer-events-none absolute -right-20 -bottom-20 h-64 w-64 rounded-full blur-[100px]"
          style={{ backgroundColor: theme.colors.secondary + '05' }}
        />

        {/* The Card Body */}
        <div className="relative aspect-[5/6] sm:aspect-[4/5] w-full rounded-[2rem] border border-white/10 bg-gradient-to-br from-slate-900 to-black overflow-hidden shadow-2xl">
          <motion.div
            className={clsx(
              'relative h-full w-full flex flex-col items-center justify-center transition-all duration-700 focus:outline-none',
              !disabled && 'cursor-pointer hover:scale-[1.02]',
              disabled && 'cursor-default'
            )}
            role="button"
            tabIndex={0}
            onClick={() => {
              if (!disabled) onScratch();
            }}
            whileHover={!disabled ? { scale: 1.02 } : undefined}
            whileTap={!disabled ? { scale: 0.98 } : undefined}
          >
            {/* 1. UNREVEALED STATE (Gold Foil) */}
            <AnimatePresence>
              {!isRevealed && (
                <motion.div
                  className="absolute inset-0 z-20"
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0, scale: 1.1 }}
                  transition={{ duration: 0.5 }}
                >
                  <img
                    src="/assets/lottery/gold_foil.jpg"
                    className="h-full w-full object-cover brightness-110 saturate-[1.2]"
                    alt="Gold Foil"
                  />
                  {/* Overlay Text */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[1px]">
                    <motion.div
                      className="w-16 h-16 rounded-full bg-white/10 border border-white/20 flex items-center justify-center mb-3 backdrop-blur-md"
                      animate={
                        isScratching
                          ? { scale: [1, 1.1, 1], rotate: [0, 360] }
                          : { y: [0, -10, 0] }
                      }
                      transition={{
                        duration: isScratching ? 1 : 2,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                    >
                      <img
                        src="/assets/lottery/icon_lotto_ball.png"
                        className="w-12 h-12 object-contain filter drop-shadow-lg"
                        alt=""
                      />
                    </motion.div>
                    <h3 className="text-white text-2xl font-black italic tracking-tighter uppercase drop-shadow-lg">
                      {isScratching ? '?¥Î¶¨??Ï§?..' : '??ïò???ïÏù∏'}
                    </h3>
                    <p className="mt-1.5 text-amber-200/90 text-[9px] font-black tracking-[0.2em] uppercase drop-shadow-md">
                      {theme.name} PREMIUM TICKET
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 2. REVEALED PRIZE STATE */}
            <AnimatePresence>
              {isRevealed && prize && (
                <motion.div
                  className="relative z-10 w-full h-full flex flex-col items-center justify-center p-4 text-center"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, ease: 'backOut' }}
                >
                  {/* Simplified Visual Effects */}
                  <div
                    className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-transparent opacity-50"
                    style={{
                      backgroundImage: `linear-gradient(to bottom, ${theme.colors.accent}10, transparent, ${theme.colors.primary}10)`,
                    }}
                  />

                  <div className="relative z-20 flex flex-col items-center">
                    <motion.span
                      className="inline-block px-3 py-1 rounded-full border text-[10px] font-black tracking-widest uppercase mb-4 shadow-lg"
                      style={{
                        backgroundColor: theme.colors.win + '20',
                        borderColor: theme.colors.win + '30',
                        color: theme.colors.win,
                      }}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
                    >
                      Ï∂ïÌïò?©Îãà??
                    </motion.span>

                    {/* No Reward */}
                    {isNoReward ? (
                      <>
                        <motion.span
                          className="text-6xl mb-4"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 }}
                        >
                          ?í®
                        </motion.span>
                        <h2 className="text-white text-2xl font-black tracking-tight uppercase italic">
                          {prize.label}
                        </h2>
                        <p className="mt-2 text-white/40 font-bold uppercase tracking-widest text-[10px]">
                          ?§Ïùå Í∏∞Ìöå??
                        </p>
                      </>
                    ) : (
                      <motion.div
                        className="flex flex-col items-center"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                      >
                        <h2 className="text-white font-black tracking-tight uppercase mb-2 text-2xl sm:text-3xl italic">
                          {prize.label}
                        </h2>

                        {/* Puzzle Piece Render */}
                        {isPuzzlePiece && (
                          <motion.div
                            className="my-2 relative"
                            initial={{ rotateY: -180, scale: 0 }}
                            animate={{ rotateY: 0, scale: 1 }}
                            transition={{ delay: 0.5, duration: 0.8, type: 'spring' }}
                          >
                            <div
                              className="relative w-20 h-24 rounded-xl flex items-center justify-center text-5xl font-black shadow-2xl bg-gradient-to-br from-amber-300 via-amber-500 to-amber-700 text-white"
                              style={{
                                boxShadow:
                                  '0 10px 20px rgba(0,0,0,0.5), inset 0 2px 0 rgba(255,255,255,0.4), inset 0 -4px 0 rgba(0,0,0,0.2)',
                              }}
                            >
                              <span className="drop-shadow-md pb-1">
                                {prize.reward_type.replace('PUZZLE_', '')}
                              </span>
                            </div>
                          </motion.div>
                        )}

                        {/* Standard Reward */}
                        {!isPuzzlePiece && (
                          <motion.div
                            className="flex flex-col items-center"
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.5, type: 'spring' }}
                          >
                            <div
                              className="text-2xl sm:text-3xl font-black tracking-tight"
                              style={{ color: theme.colors.accent }}
                            >
                              {formatRewardText(prize.reward_type, prize.reward_amount)}
                            </div>
                          </motion.div>
                        )}
                      </motion.div>
                    )}

                    <div className="h-px w-12 bg-white/20 mx-auto my-4" />

                    <p
                      className="text-[10px] font-black tracking-[0.3em] uppercase opacity-70"
                      style={{ color: theme.colors.accent }}
                    >
                      {isNoReward ? 'TRY AGAIN' : 'ÏßÄÍ∏??ÑÎ£å'}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 3. EMPTY STATE */}
            <AnimatePresence>
              {isRevealed && !prize && (
                <motion.div
                  className="flex flex-col items-center text-center p-5"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <span className="text-5xl mb-4">?å™Ô∏?/span>
                  <h3 className="text-white text-xl sm:text-2xl font-black tracking-tight uppercase italic">
                    ?§Ïùå???§Ïãú!
                  </h3>
                  <p className="mt-2 text-white/40 font-bold text-sm">?¥Ïù¥ ?∞Î•¥ÏßÄ ?äÏïò?§Ïöî.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Bottom Card Info */}
        <div className="mt-3 flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: theme.colors.accent }}
            />
            <span className="text-[10px] font-black text-white/30 tracking-widest uppercase">
              Premium System
            </span>
          </div>
          <span className="text-[10px] font-black text-white/30 tracking-widest uppercase">
            V2-2026-{theme.name.toUpperCase()}
          </span>
        </div>
      </div>
    </div>
  );
};

export default LotteryCard;
