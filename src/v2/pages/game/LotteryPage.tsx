import { useState } from "react";
import confetti from "canvas-confetti";
import { Ticket, Trophy } from "lucide-react";

import { useV2LotteryStatus, useV2LotteryPlay } from "../../hooks/useV2Game";
import LotteryCard from "../../components/game/LotteryCard";
import { useTheme } from "../../contexts/ThemeContext";

interface Prize {
  id: number;
  label: string;
  reward_type: string;
  reward_amount: string | number;
}

export default function LotteryPage() {
  const { theme } = useTheme();
  
  const [isScratching, setIsScratching] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [currentPrize, setCurrentPrize] = useState<Prize | undefined>(undefined);

  const { data: status } = useV2LotteryStatus();
  
  const playMutation = useV2LotteryPlay();

  const handlePlay = () => {
    if (playMutation.isPending || isScratching) return;
    
    // Check ticket balance
    if ((status?.token_balance ?? 0) <= 0) {
      alert("티켓이 부족합니다.");
      return;
    }

    playMutation.mutate(undefined, {
      onSuccess: (data) => {
        setIsScratching(true);
        setIsRevealed(false);
        
        // Prepare prize object from response
        // Note: The response structure might need adjustment based on strict API definition,
        // but assuming it returns the won prize details.
        // If data is just success/fail, we might need to parse.
        // Looking at v1CompatAdapter, it returns LotteryPlayResponse which has 'result' and 'reward'
        
        const prizeData = data.result === "WIN" && data.game_data.prize ? {
          id: data.game_data.prize.id,
          label: data.game_data.prize.label,
          reward_type: data.game_data.prize.reward_type,
          reward_amount: data.game_data.prize.reward_amount
        } : undefined;

        setCurrentPrize(prizeData);

        // Simulate scratch delay
        setTimeout(() => {
          setIsScratching(false);
          setIsRevealed(true);
          
          if (data.result === "WIN") {
            confetti({
              particleCount: 150,
              spread: 70,
              origin: { y: 0.6 },
              colors: [theme.colors.primary, theme.colors.accent, '#FFFFFF']
            });
          }
        }, 2000);
      },
      onError: (error) => {
        console.error("Lottery play failed", error);
        alert("게임 진행 중 오류가 발생했습니다.");
      }
    });
  };

  const resetGame = () => {
    setIsRevealed(false);
    setIsScratching(false);
    setCurrentPrize(undefined);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-4 pb-24 flex flex-col items-center">
      {/* Header Stats */}
      <div className="w-full max-w-[500px] grid grid-cols-2 gap-3 mb-8 mt-16">
        <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-4 flex flex-col items-center gap-1 shadow-lg backdrop-blur-md">
           <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center mb-1">
              <Ticket className="w-4 h-4 text-emerald-400" />
           </div>
           <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Available Tickets</span>
           <span className="text-lg font-black font-mono text-emerald-400">
             {status?.token_balance?.toLocaleString() ?? 0}
           </span>
        </div>
        <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-4 flex flex-col items-center gap-1 shadow-lg backdrop-blur-md">
           <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center mb-1">
              <Trophy className="w-4 h-4 text-indigo-400" />
           </div>
           <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Today's Plays</span>
           <span className="text-lg font-black font-mono text-indigo-400">
             {status?.today_tickets ?? 0} / {status?.max_daily_tickets ?? 0}
           </span>
        </div>
      </div>

      {/* Main Card Section */}
      <div className="relative w-full max-w-[400px] flex items-center justify-center mb-8">
        <LotteryCard 
          prize={currentPrize}
          isRevealed={isRevealed}
          isScratching={isScratching}
          onScratch={handlePlay}
        />
      </div>

      {/* Action Button */}
      <div className="w-full max-w-[360px] space-y-4">
        {isRevealed ? (
           <button
             onClick={resetGame}
             className="w-full h-14 rounded-2xl bg-white text-black font-black text-lg tracking-widest uppercase hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)]"
           >
             Play Again
           </button>
        ) : (
           <div className="text-center text-zinc-500 text-sm animate-pulse">
             {isScratching ? "Scratching..." : "Tap card to scratch!"}
           </div>
        )}
        
        <p className="text-center text-[10px] font-bold text-zinc-600 uppercase tracking-widest mt-8">
           Premium Scratch System • V2
        </p>
      </div>
    </div>
  );
}
