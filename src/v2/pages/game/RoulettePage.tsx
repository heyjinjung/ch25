import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import RouletteWheel from "../../components/game/RouletteWheel";
import { getV2RouletteStatus, playV2Roulette } from "../../api/v1CompatAdapter";
type RouletteTicketType = "ROULETTE_TICKET" | "DICE_TICKET";
import { useTheme } from "../../contexts/ThemeContext";
import { cn } from "../../lib/utils";
import { Play, Loader2, Trophy, Coins } from "lucide-react";

const TICKET_TABS: {
  type: RouletteTicketType;
  label: string;
  color: string;
}[] = [
  {
    type: "ROULETTE_TICKET",
    label: "고급 룰렛",
    color: "from-purple-600 to-indigo-600",
  },
  {
    type: "DICE_TICKET",
    label: "일반 룰렛",
    color: "from-emerald-600 to-teal-600",
  },
];

export default function RoulettePage() {
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] =
    useState<RouletteTicketType>("ROULETTE_TICKET");
  const [isSpinning, setIsSpinning] = useState(false);
  const [winningSegment, setWinningSegment] = useState<number | null>(null);

  const { data: status } = useQuery({
    queryKey: ["v2-roulette-status", activeTab],
    queryFn: () => getV2RouletteStatus(activeTab),
  });

  const playMutation = useMutation({
    mutationFn: () =>
      playV2Roulette({ ticket_type: activeTab, bet_multiplier: 1 }),
    onSuccess: (data) => {
      setWinningSegment(data.game_data.segment.slot_index);
      setIsSpinning(true);
      // Actual wheel spin logic is handled in RouletteWheel component
    },
  });

  const handleSpinComplete = () => {
    setIsSpinning(false);
    setWinningSegment(null);
    queryClient.invalidateQueries({ queryKey: ["v2-roulette-status"] });
    queryClient.invalidateQueries({ queryKey: ["v2-vault-status"] });

    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: [theme.colors.primary, theme.colors.accent, "#FFFFFF"],
    });
  };

  const handleSpinClick = () => {
    if (isSpinning || playMutation.isPending) return;
    if ((status?.token_balance ?? 0) <= 0) {
      alert("티켓이 부족합니다.");
      return;
    }
    playMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-4 pb-24 flex flex-col items-center">
      {/* Header Stats */}
      <div className="w-full max-w-[500px] grid grid-cols-2 gap-3 mb-8 mt-16">
        <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-4 flex flex-col items-center gap-1 shadow-lg backdrop-blur-md">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center mb-1">
            <Coins className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
            Available Tickets
          </span>
          <span className="text-lg font-black font-mono text-emerald-400">
            {status?.token_balance?.toLocaleString() ?? 0}
          </span>
        </div>
        <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-4 flex flex-col items-center gap-1 shadow-lg backdrop-blur-md">
          <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center mb-1">
            <Trophy className="w-4 h-4 text-indigo-400" />
          </div>
          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
            Today's Spins
          </span>
          <span className="text-lg font-black font-mono text-indigo-400">
            {status?.today_spins ?? 0} / {status?.max_daily_spins ?? 0}
          </span>
        </div>
      </div>

      {/* Main Wheel Section */}
      <div className="relative w-full max-w-[400px] aspect-square flex items-center justify-center mb-12">
        <RouletteWheel
          segments={status?.segments || []}
          isSpinning={isSpinning}
          selectedIndex={winningSegment ?? undefined}
          onSpinEnd={handleSpinComplete}
        />

        {/* Center Pointer/Stopper */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-30">
          <div className="w-6 h-8 bg-white rounded-b-full shadow-[0_0_20px_rgba(255,255,255,0.5)] border-2 border-zinc-900 [clip-path:polygon(0%_0%,_100%_0%,_50%_100%)]" />
        </div>
      </div>

      {/* Control Panel */}
      <div className="w-full max-w-[360px] space-y-6">
        <div className="flex bg-zinc-950 rounded-2xl p-1.5 border border-white/5 shadow-inner">
          {TICKET_TABS.map((tab) => (
            <button
              key={tab.type}
              onClick={() => setActiveTab(tab.type)}
              className={cn(
                "flex-1 py-3 px-2 rounded-xl text-xs font-black transition-all duration-300 uppercase tracking-widest",
                activeTab === tab.type
                  ? `bg-gradient-to-br ${tab.color} text-white shadow-lg shadow-black/50`
                  : "text-zinc-500 hover:text-zinc-300",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          onClick={handleSpinClick}
          disabled={
            isSpinning ||
            playMutation.isPending ||
            (status?.token_balance ?? 0) <= 0
          }
          className={cn(
            "w-full h-16 rounded-[2rem] font-black text-lg tracking-[0.2em] uppercase transition-all flex items-center justify-center gap-3 relative overflow-hidden",
            isSpinning ||
              playMutation.isPending ||
              (status?.token_balance ?? 0) <= 0
              ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
              : "bg-white text-black hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_30px_rgba(255,255,255,0.2)]",
          )}
        >
          {playMutation.isPending ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <>
              <Play className="w-5 h-5 fill-current" />
              <span>Spin Now</span>
            </>
          )}

          {/* Button Shine Effect */}
          {!isSpinning && !playMutation.isPending && (
            <motion.div
              animate={{ x: ["-200%", "200%"] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-12"
            />
          )}
        </button>

        <p className="text-center text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
          {status ? "System Online" : "System Maintenance"} • Alpha V2 Build
        </p>
      </div>
    </div>
  );
}
