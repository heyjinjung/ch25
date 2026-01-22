import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { getV2DiceStatus, playV2Dice } from "../../api/v1CompatAdapter";
import "./DiceRedesign.css";
import { triggerHaptic, triggerNotification } from "../../utils/haptic";

const ASSET_PATH = "/src/v2/public/assets/03dice";

const DicePage = () => {
  const [isRolling, setIsRolling] = useState(false);
  const [userDice, setUserDice] = useState<number[]>([]);
  const [dealerDice, setDealerDice] = useState<number[]>([]);
  const [betAmount] = useState(100);
  const [showResult, setShowResult] = useState<{ show: boolean, type: 'win' | 'lose' | 'draw' | null }>({ show: false, type: null });

  const queryClient = useQueryClient();

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
  // Play Handler
  // ============================================================================

  const handlePlay = async () => {
    if (isRolling || playMutation.isPending) return;
    if (!data || (data.token_balance ?? 0) < betAmount) return;

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

      // Animation simulation
      setTimeout(() => {
        setUserDice(userDiceResult);
        setDealerDice(dealerDiceResult);
        setIsRolling(false);
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
    queryClient.invalidateQueries({ queryKey: ["v2-dice-status"] });
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-black">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#BD80FF] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="dice-redesign-container">
      {/* Dice Cards Section (Top) */}
      <div className="dice-card-row">
        <div className="dice-card overflow-visible">
          <span className="absolute top-4 left-4 text-[10px] opacity-40 uppercase font-black">Dealer</span>
          <img 
            src={dealerDice[0] ? `${ASSET_PATH}/img_dice_side_{[${dealerDice[0]}]}.png` : `${ASSET_PATH}/bg_removal [Background removed].png`} 
            className={`dice-icon-display ${isRolling ? 'animate-bounce' : ''}`}
            alt="dice" 
          />
          {dealerDice.length > 0 && <span className="mt-2 text-sm font-bold">{dealerDice[0]} + {dealerDice[1]}</span>}
        </div>
        <div className="dice-card">
           <span className="absolute top-4 left-4 text-[10px] opacity-40 uppercase font-black">User</span>
           <img 
            src={userDice[0] ? `${ASSET_PATH}/img_dice_side_{[${userDice[0]}]}.png` : `${ASSET_PATH}/bg_removal [Background removed].png`} 
            className={`dice-icon-display ${isRolling ? 'animate-bounce' : ''}`}
            alt="dice" 
          />
          {userDice.length > 0 && <span className="mt-2 text-sm font-bold">{userDice[0]} + {userDice[1]}</span>}
        </div>
      </div>

      {/* Mid Action Slots (88x88) */}
      <div className="dice-mid-row">
        <div className="mid-slot">
          <img src={`${ASSET_PATH}/Vector.svg`} alt="" className="w-8 h-8 opacity-40" />
        </div>
        <div className="mid-slot">
          <img src={`${ASSET_PATH}/Frame 36.png`} alt="" className="w-12 h-12" />
        </div>
      </div>

      {/* Action Section */}
      <div className="dice-action-section mt-auto">
        <div className="item-status-box">
          아이템 준비중...
        </div>
        <button 
          className={`play-button-redesign ${isRolling || (data?.token_balance ?? 0) < betAmount ? 'disabled' : ''}`}
          onClick={handlePlay}
          disabled={isRolling}
        >
          {isRolling ? "Rolling..." : "START GAME"}
        </button>
      </div>

      {/* Result Overlay */}
      <AnimatePresence>
        {showResult.show && showResult.type && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none"
          >
            <div className={`text-6xl font-black uppercase italic tracking-tighter ${
              showResult.type === 'win' ? 'text-emerald-400' :
              showResult.type === 'lose' ? 'text-rose-500' : 'text-white'
            }`}
            style={{ textShadow: '0 0 40px rgba(0,0,0,0.8)' }}>
              {showResult.type}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DicePage;
