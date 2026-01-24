import React, { useMemo, useEffect, useState } from "react";
import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Shield, Swords } from "lucide-react";

interface DiceViewProps {
  readonly userDice: number[];
  readonly dealerDice: number[];
  readonly result: "WIN" | "LOSE" | "DRAW" | null;
  readonly isRolling?: boolean;
}



const DiceFace: React.FC<{ value: number; isRolling?: boolean; delay?: string }> = ({ value, isRolling, delay = "0s" }) => {
  return (
    <div className={clsx(
      "relative h-16 w-16 sm:h-20 sm:w-20 flex items-center justify-center transition-all duration-500",
      isRolling && "animate-[bounce_0.5s_infinite_alternate]"
    )} style={{ animationDelay: delay }}>

      <img
        src={isRolling ? "/assets/dice/dice_1.png" : `/assets/dice/dice_${value || 1}.png`}
        alt={`Dice ${value}`}
        className={clsx(
          "h-full w-full object-contain filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.6)] transition-all duration-300",
          isRolling && "animate-[spin_0.3s_linear_infinite] scale-110 rotate-12"
        )}
      />
    </div>
  );
};

const DiceView: React.FC<DiceViewProps> = ({ userDice, dealerDice, result, isRolling }) => {
  const userSum = userDice.reduce((a, b) => a + b, 0);
  const dealerSum = dealerDice.reduce((a, b) => a + b, 0);

  // Battle State
  const [showAttack, setShowAttack] = useState(false);
  const [shake, setShake] = useState<"USER" | "DEALER" | null>(null);

  // Reset Battle when rolling starts
  useEffect(() => {
    if (isRolling) {
      setShowAttack(false);
      setShake(null);
    }
  }, [isRolling]);

  // Handle Result Logic (HP Damage & Effects)
  useEffect(() => {
    if (!isRolling && result) {
      // Small Delay for dramatic effect after dice reveal
      const timer = setTimeout(() => {
        if (result === "WIN") {
          setShowAttack(true); // User Attacks
          setTimeout(() => {
            setShake("DEALER");
          }, 400); // Hit timing
        } else if (result === "LOSE") {
          setShowAttack(true); // Dealer Attacks
          setTimeout(() => {
            setShake("USER");
          }, 400);
        } else {
           // Draw - maybe clash effect?
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [result, isRolling]);

  const resultConfig = useMemo(() => {
    if (!result) return { text: "?„íˆ¬ ì¤€ë¹?, color: "text-white/40", bg: "bg-white/5", icon: Swords };
    switch (result) {
      case "WIN":
        return { text: "?¹ë¦¬", color: "text-[#30FF75]", bg: "bg-emerald-500/10", icon: Shield };
      case "LOSE":
        return { text: "?¨ë°°", color: "text-red-500", bg: "bg-red-500/10", icon: Heart };
      case "DRAW":
        return { text: "ë¬´ìŠ¹ë¶€", color: "text-amber-400", bg: "bg-amber-500/10", icon: Swords };
    }
  }, [result]);

  return (
    <div className="space-y-6 relative">
      {/* Attack Projectile Animation */}
      <AnimatePresence>
        {showAttack && result === "WIN" && (
           <motion.div 
             className="absolute left-1/4 top-1/2 w-8 h-8 rounded-full bg-emerald-400 blur-md z-50 pointer-events-none"
             initial={{ x: 0, y: "-50%", opacity: 1, scale: 0.5 }}
             animate={{ x: 200, opacity: 0, scale: 2 }}
             transition={{ duration: 0.4, ease: "circIn" }}
           />
        )}
        {showAttack && result === "LOSE" && (
           <motion.div 
             className="absolute right-1/4 top-1/2 w-8 h-8 rounded-full bg-red-500 blur-md z-50 pointer-events-none"
             initial={{ x: 0, y: "-50%", opacity: 1, scale: 0.5 }}
             animate={{ x: -200, opacity: 0, scale: 2 }}
             transition={{ duration: 0.4, ease: "circIn" }}
           />
        )}
      </AnimatePresence>

      {/* Battle Arena */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 relative h-full">

        {/* VS Badge */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none">
          <motion.div 
            animate={isRolling ? { scale: [1, 1.2, 1], rotate: [0, 180, 360] } : {}}
            transition={{ duration: 0.5 }}
            className="w-12 h-12 rounded-full bg-black border-2 border-white/10 flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.1)]"
          >
            <span className="text-sm font-black italic text-zinc-500">VS</span>
          </motion.div>
        </div>

        {/* User Card (Left) */}
        <motion.div 
          animate={shake === "USER" ? { x: [-10, 10, -10, 10, 0], color: ["#fff", "#f87171", "#fff"] } : {}}
          transition={{ duration: 0.4 }}
          className={clsx(
            "relative rounded-[2rem] border p-5 transition-all duration-700 shadow-2xl overflow-hidden group",
            result === "WIN" ? "bg-emerald-900/20 border-emerald-500/50" : "bg-black/40 border-white/5"
          )}
        >
          {/* Spotlight user */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent opacity-50" />
          
          <div className="relative z-10 flex flex-col items-center">
            {/* Dice Area */}
            <div className="flex justify-center gap-3 my-4">
              {userDice.length > 0 || isRolling ? (
                (isRolling ? [1, 1] : userDice).map((val, i) => (
                  <DiceFace key={i} value={val} isRolling={isRolling} delay={`${i * 0.1}s`} />
                ))
              ) : (
                <div className="flex gap-3 opacity-30">
                   <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-white/10" />
                   <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-white/10" />
                </div>
              )}
            </div>

            {/* Score */}
            <div className="mt-2 text-center">
              <span className={clsx(
                "text-4xl sm:text-5xl font-black tracking-tighter transition-colors duration-300",
                result === "WIN" ? "text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.6)]" : "text-white"
              )}>
                {isRolling ? "?" : (userDice.length > 0 ? userSum : "-")}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Dealer Card (Right) */}
        <motion.div 
          animate={shake === "DEALER" ? { x: [-10, 10, -10, 10, 0], filter: ["brightness(1)", "brightness(2)", "brightness(1)"] } : {}}
          transition={{ duration: 0.4 }}
          className={clsx(
            "relative rounded-[2rem] border p-5 transition-all duration-700 shadow-2xl overflow-hidden",
            result === "LOSE" ? "bg-red-900/20 border-red-500/50" : "bg-black/40 border-white/5"
          )}
        >
          {/* Spotlight dealer */}
          <div className="absolute inset-0 bg-gradient-to-bl from-red-500/5 via-transparent to-transparent opacity-50" />

          <div className="relative z-10 flex flex-col items-center">
             {/* Dice Area */}
             <div className="flex justify-center gap-3 my-4">
              {dealerDice.length > 0 || isRolling ? (
                (isRolling ? [1, 1] : dealerDice).map((val, i) => (
                  <DiceFace key={i} value={val} isRolling={isRolling} delay={`${i * 0.15}s`} />
                ))
              ) : (
                <div className="flex gap-3 opacity-30">
                   <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-white/10" />
                   <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-white/10" />
                </div>
              )}
            </div>

             {/* Score */}
             <div className="mt-2 text-center">
              <span className={clsx(
                "text-4xl sm:text-5xl font-black tracking-tighter transition-colors duration-300",
                result === "LOSE" ? "text-red-400 drop-shadow-[0_0_15px_rgba(248,113,113,0.6)]" : "text-white"
              )}>
                {isRolling ? "?" : (dealerDice.length > 0 ? dealerSum : "-")}
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Result Status Bar */}
      <AnimatePresence mode='wait'>
        {!isRolling && result && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={clsx(
              "rounded-2xl border p-4 text-center shadow-xl backdrop-blur-xl relative overflow-hidden",
              resultConfig.bg,
              resultConfig.color === "text-[#30FF75]" ? "border-emerald-500/30" : resultConfig.color === "text-red-500" ? "border-red-500/30" : "border-white/10"
            )}
          > 
             {result === "WIN" && <div className="absolute inset-0 bg-emerald-400/10 animate-pulse" />}
             {result === "LOSE" && <div className="absolute inset-0 bg-red-500/10 animate-pulse" />}

             <div className="relative z-10 flex items-center justify-center gap-3">
                <resultConfig.icon size={24} className={resultConfig.color} />
                <span className={clsx(
                  "text-2xl font-black tracking-widest italic uppercase drop-shadow-sm",
                  resultConfig.color
                )}>
                  {resultConfig.text}
                </span>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DiceView;
