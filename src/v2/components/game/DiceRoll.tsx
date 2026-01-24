import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import gsap from 'gsap';
import { useTheme } from '../../contexts/ThemeContext';

interface DiceRollProps {
  value?: number; // 1-6, undefined = rolling
  isRolling: boolean;
  onRollComplete?: () => void;
  size?: number;
  label?: '?†Ï?' | '?úÎü¨';
}

const DiceRoll = ({ value, isRolling, onRollComplete, size = 80, label }: DiceRollProps) => {
  const { theme } = useTheme();
  const diceRef = useRef<HTMLDivElement>(null);
  const rollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isRolling || !diceRef.current) return;

    const dice = diceRef.current;

    // GSAP Î°§ÎßÅ ?†ÎãàÎ©îÏù¥??    const tl = gsap.timeline({
      onComplete: () => {
        rollTimeoutRef.current = setTimeout(() => {
          onRollComplete?.();
        }, 300);
      },
    });

    tl.to(dice, {
      rotateX: 720,
      rotateY: 720,
      scale: 1.3,
      duration: theme.animations.diceRollDuration / 1000,
      ease: 'power2.out',
    }).to(dice, {
      scale: 1,
      duration: 0.2,
      ease: 'back.out(2)',
    });

    return () => {
      tl.kill();
      if (rollTimeoutRef.current) {
        clearTimeout(rollTimeoutRef.current);
      }
    };
  }, [isRolling, onRollComplete, theme.animations.diceRollDuration]);

  return (
    <div className="flex flex-col items-center gap-2">
      {label && (
        <p className="text-xs font-bold text-white/60 uppercase tracking-widest">{label}</p>
      )}
      <motion.div
        ref={diceRef}
        className="relative flex items-center justify-center rounded-2xl border-2 border-white/20 shadow-2xl"
        style={{
          width: size,
          height: size,
          backgroundColor: isRolling ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.5)',
          borderColor: isRolling ? theme.colors.accent : 'rgba(255,255,255,0.2)',
        }}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* Ï£ºÏÇ¨???¥Î?ÏßÄ */}
        {!isRolling && value && (
          <motion.img
            src={theme.assets.diceIcon}
            alt={`Dice ${value}`}
            className="w-3/4 h-3/4 object-contain drop-shadow-lg"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.4, ease: 'back.out(2)' }}
          />
        )}

        {/* Î°§ÎßÅ Ï§??úÏãú */}
        {isRolling && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <div className="w-3/4 h-3/4 rounded-lg bg-gradient-to-br from-white/20 to-transparent" />
          </motion.div>
        )}

        {/* Í∞??úÏãú (?´Ïûê) */}
        {!isRolling && value && (
          <motion.div
            className="absolute bottom-1 right-1 flex items-center justify-center w-6 h-6 rounded-full bg-black/80 border border-white/30"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, duration: 0.3 }}
          >
            <span className="text-xs font-black text-white">{value}</span>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default DiceRoll;
