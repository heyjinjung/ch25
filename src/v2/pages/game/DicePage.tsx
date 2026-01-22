import { useState, useRef, useLayoutEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, useAnimation, AnimatePresence } from "framer-motion";
import gsap from "gsap";
import { getV2DiceStatus, playV2Dice } from "../../api/v1CompatAdapter";
import "./DicePage.css";
import { triggerHaptic, triggerNotification } from "../../utils/haptic";

// 04dice assets
import imgFrame119 from "../../assets/04dice/frame-10000031190.png";
import imgFrame120 from "../../assets/04dice/frame-10000031200.png";
import imgFrame121 from "../../assets/04dice/frame-10000031210.png";
import imgFrame122 from "../../assets/04dice/frame-10000031220.png";
import imgFrame125 from "../../assets/04dice/frame-10000031250.png";

// ============================================================================
// Dice Page Content (with Theme)
// ============================================================================

const DicePageContent = () => {
  const [isRolling, setIsRolling] = useState(false);
  const [userDice, setUserDice] = useState<number[]>([]);
  const [dealerDice, setDealerDice] = useState<number[]>([]);
  const [betAmount, setBetAmount] = useState(100);
  const [history, setHistory] = useState<{ result: 'win' | 'lose' | 'draw', score: string }[]>([]);
  const [showResult, setShowResult] = useState<{ show: boolean, type: 'win' | 'lose' | 'draw' | null }>({ show: false, type: null });

  const queryClient = useQueryClient();
  const userShakeControls = useAnimation();
  const dealerShakeControls = useAnimation();
  const containerRef = useRef<HTMLDivElement>(null);

  // Balance count-up state
  const balanceDisplayRef = useRef<HTMLSpanElement>(null);
  const counterObj = useRef({ value: 0 });

  // ============================================================================
  // API Queries
  // ============================================================================

  const { data, isLoading } = useQuery({
    queryKey: ["v2-dice-status"],
    queryFn: () => getV2DiceStatus(),
    refetchOnWindowFocus: true,
    staleTime: 10000,
  });

  const playMutation = useMutation({
    mutationFn: (amount: number) =>
      playV2Dice({
        bet_amount: amount,
        prediction: null,
      }),
    onError: (error) => {
      console.error("[DicePage] Play failed:", error);
      triggerNotification("error");
    },
  });

  // ============================================================================
  // Effects
  // ============================================================================

  useLayoutEffect(() => {
    if (!data || !balanceDisplayRef.current) return;
    const targetValue = data.token_balance || 0;
    
    gsap.to(counterObj.current, {
      value: targetValue,
      duration: 1,
      ease: "power2.out",
      onUpdate: () => {
        if (balanceDisplayRef.current) {
          balanceDisplayRef.current.innerText = Math.floor(counterObj.current.value).toLocaleString();
        }
      },
    });
  }, [data?.token_balance]);

  // ============================================================================
  // Play Handler
  // ============================================================================

  const handlePlay = async () => {
    if (isRolling || playMutation.isPending) return;
    if (!data || data.token_balance < betAmount) return;

    try {
      triggerHaptic("heavy");
      setShowResult({ show: false, type: null });
      setUserDice([]);
      setDealerDice([]);
      setIsRolling(true);

      const response = await playMutation.mutateAsync(betAmount);
      
      const userDiceResult = response.game_data?.user_dice ?? [1, 1];
      const dealerDiceResult = response.game_data?.dealer_dice ?? [1, 1];
      const resultType = response.result?.toLowerCase() as 'win' | 'lose' | 'draw';

      setTimeout(() => {
        setUserDice(userDiceResult);
        setDealerDice(dealerDiceResult);
        setIsRolling(false);
        
        const userScore = userDiceResult[0] + userDiceResult[1];
        
        setHistory(prev => [{ result: resultType, score: `${userScore}` }, ...prev].slice(0, 10));
        setShowResult({ show: true, type: resultType });
        handleRollComplete(resultType);
      }, 1500);
    } catch (err) {
      console.error("[DicePage] Play error:", err);
      setIsRolling(false);
    }
  };

  const handleRollComplete = (type: string) => {
    if (type === 'win') triggerNotification("success");
    else if (type === 'lose') triggerNotification("error");
    else triggerNotification("warning");
    
    triggerHaptic("heavy");

    dealerShakeControls.start({
      x: [-10, 10, -10, 10, 0],
      transition: { duration: 0.5 },
    });

    userShakeControls.start({
      x: [-10, 10, -10, 10, 0],
      transition: { duration: 0.5 },
    });

    queryClient.invalidateQueries({ queryKey: ["v2-dice-status"] });
  };

  if (isLoading) {
    return (
      <div className="dice-page-v2 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          <p className="text-xs font-bold text-white/40 uppercase tracking-widest">Loading Battle...</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="dice-page-v2">
      <div className="dice-bg-glow" />

      {/* Header */}
      <div className="dice-header">
        <div className="dice-balance-card">
          <span className="balance-label">Available Tickets</span>
          <span className="balance-value">
            <span ref={balanceDisplayRef}>0</span>
            <span className="ml-1 text-xs opacity-50">T</span>
          </span>
        </div>
        <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/60">
          <span className="text-lg">⚙️</span>
        </div>
      </div>

      {/* Battle Area */}
      <div className="_4-dice">
        <div className="dice-container">
          {/* Dealer Dice (Top) */}
          <div className="dice-row">
            <motion.img
              animate={dealerShakeControls}
              className="dice-img"
              src={dealerDice[0] ? `/assets/04dice/dice_${dealerDice[0]}.png` : imgFrame119}
              onError={(e) => (e.currentTarget.src = imgFrame119)}
              alt="Dealer 1"
            />
            <motion.img
              animate={dealerShakeControls}
              className="dice-img"
              src={dealerDice[1] ? `/assets/04dice/dice_${dealerDice[1]}.png` : imgFrame120}
              onError={(e) => (e.currentTarget.src = imgFrame120)}
              alt="Dealer 2"
            />
          </div>

          {/* User Dice (Bottom) */}
          <div className="dice-row">
            <motion.img
              animate={userShakeControls}
              className="dice-img"
              src={userDice[0] ? `/assets/04dice/dice_${userDice[0]}.png` : imgFrame121}
              onError={(e) => (e.currentTarget.src = imgFrame121)}
              alt="User 1"
            />
            <motion.img
              animate={userShakeControls}
              className="dice-img"
              src={userDice[1] ? `/assets/04dice/dice_${userDice[1]}.png` : imgFrame122}
              onError={(e) => (e.currentTarget.src = imgFrame122)}
              alt="User 2"
            />
          </div>
        </div>

        {/* Center Play Button */}
        <div className="dice-center-action" onClick={handlePlay}>
          <motion.img
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="play-btn-asset"
            src={imgFrame125}
            style={{
              opacity: isRolling || (data?.token_balance ?? 0) < betAmount ? 0.5 : 1,
              filter: isRolling ? 'grayscale(1)' : 'none'
            }}
          />
        </div>
      </div>

      {/* Betting Area */}
      <div className="dice-betting-area">
        <div className="chips-container">
          {[100, 500, 1000, 5000].map(amount => (
            <button
              key={amount}
              className={`chip-btn ${betAmount === amount ? 'active' : ''}`}
              onClick={() => setBetAmount(amount)}
            >
              {amount.toLocaleString()}
            </button>
          ))}
        </div>
      </div>

      {/* History Section */}
      <div className="dice-history-section">
        <div className="history-header">
          <span className="history-title">Recent History</span>
          <span className="text-[10px] text-white/20">Last 10 Games</span>
        </div>
        <div className="history-list scrollbar-hide">
          {history.length === 0 && (
            <div className="w-full h-12 flex items-center justify-center text-white/10 text-[10px] font-bold uppercase tracking-widest">
              No History Yet
            </div>
          )}
          {history.map((h, i) => (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              key={i}
              className={`history-item ${h.result}`}
            >
              {h.score}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Result Overlay */}
      <AnimatePresence>
        {showResult.show && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="dice-result-overlay"
            onClick={() => setShowResult({ show: false, type: null })}
          >
            <motion.div
              initial={{ scale: 0.5, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className={`text-6xl font-black uppercase italic tracking-tighter ${
                showResult.type === 'win' ? 'text-emerald-400' :
                showResult.type === 'lose' ? 'text-rose-500' : 'text-white'
              }`}
              style={{ textShadow: '0 0 40px rgba(0,0,0,0.5)' }}
            >
              {showResult.type}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================================================
// Main Page with Theme Provider
// ============================================================================

const DicePage = () => {
  return <DicePageContent />;
};

export default DicePage;
