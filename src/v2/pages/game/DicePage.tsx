import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, useAnimation } from "framer-motion";
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

  const queryClient = useQueryClient();
  const userShakeControls = useAnimation();
  const dealerShakeControls = useAnimation();
  const containerRef = useRef<HTMLDivElement>(null);

  // ============================================================================
  // API Queries
  // ============================================================================

  const { data, isLoading, isError } = useQuery({
    queryKey: ["v2-dice-status"],
    queryFn: () => getV2DiceStatus(),
    refetchOnWindowFocus: true,
    staleTime: 10000,
  });

  const playMutation = useMutation({
    mutationFn: () =>
      playV2Dice({
        bet_amount: 100, // 기본 베팅 금액
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
    if (!data || data.token_balance <= 0) return;

    try {
      triggerHaptic("heavy");

      setUserDice([]);
      setDealerDice([]);
      setIsRolling(true);

      const response = await playMutation.mutateAsync();
      console.log("[DicePage] Play result:", response);

      const userDiceResult = response.game_data?.user_dice ?? [1, 1];
      const dealerDiceResult = response.game_data?.dealer_dice ?? [1, 1];

      setTimeout(() => {
        setUserDice(userDiceResult);
        setDealerDice(dealerDiceResult);
        setIsRolling(false);

        handleRollComplete();
      }, 1500);
    } catch (err) {
      console.error("[DicePage] Play error:", err);
      setIsRolling(false);
    }
  };

  // ============================================================================
  // Result Handler
  // ============================================================================

  const handleRollComplete = () => {
    triggerNotification("success");
    triggerHaptic("heavy");

    // Shake animations
    dealerShakeControls.start({
      x: [-10, 10, -10, 10, 0],
      transition: { duration: 0.5 },
    });

    userShakeControls.start({
      x: [-10, 10, -10, 10, 0],
      transition: { duration: 0.5 },
    });

    // Refresh data
    queryClient.invalidateQueries({ queryKey: ["v2-dice-status"] });
  };

  // ============================================================================
  // Render States
  // ============================================================================

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#30FF75] border-t-transparent" />
          <p className="text-sm font-semibold text-white/80">
            주사위 정보를 불러오는 중...
          </p>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex h-screen items-center justify-center bg-black p-4">
        <div className="rounded-3xl border border-white/15 bg-white/5 p-6 text-center backdrop-blur max-w-md">
          <p className="text-xl font-bold text-white">
            데이터를 불러오지 못했습니다
          </p>
          <p className="mt-2 text-sm text-white/60">
            잠시 후 다시 시도하거나 운영자에게 문의하세요.
          </p>
        </div>
      </div>
    );
  }


  return (
    <div
      ref={containerRef}
      className="dice-page-v2"
    >
      <div className="_4-dice">
        {/* Background blur */}
        <div className="ellipse-126-dice"></div>
        
        {/* Top-left dice (Dealer 1) */}
        <motion.img
          animate={dealerShakeControls}
          className="frame-1000003119-dice"
          src={isRolling || dealerDice.length > 0 ? imgFrame119 : imgFrame119}
          alt="Dealer Dice 1"
        />
        
        {/* Top-right dice (Dealer 2) */}
        <motion.img
          animate={dealerShakeControls}
          className="frame-1000003120-dice"
          src={isRolling || dealerDice.length > 0 ? imgFrame120 : imgFrame120}
          alt="Dealer Dice 2"
        />
        
        {/* Bottom-left dice (User 1) */}
        <motion.img
          animate={userShakeControls}
          className="frame-1000003121-dice"
          src={isRolling || userDice.length > 0 ? imgFrame121 : imgFrame121}
          alt="User Dice 1"
        />
        
        {/* Bottom-right dice (User 2) */}
        <motion.img
          animate={userShakeControls}
          className="frame-1000003122-dice"
          src={isRolling || userDice.length > 0 ? imgFrame122 : imgFrame122}
          alt="User Dice 2"
        />
        
        {/* Center play button */}
        <img
          className="frame-1000003125-dice"
          src={imgFrame125}
          alt="Play"
          onClick={handlePlay}
          style={{
            opacity: isRolling || playMutation.isPending || data.token_balance <= 0 ? 0.5 : 1,
            pointerEvents: isRolling || playMutation.isPending || data.token_balance <= 0 ? 'none' : 'auto'
          }}
        />
      </div>
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
