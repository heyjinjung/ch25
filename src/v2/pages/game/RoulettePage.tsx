import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import RouletteWheel from "../../components/game/RouletteWheel";
import RouletteResultModal from "../../components/game/RouletteResultModal";
import {
  getV2RouletteStatus,
  getV2RouletteStatusStrict,
  playV2Roulette,
} from "../../api/v1CompatAdapter";
type RouletteTicketType =
  | "ROULETTE_TICKET"
  | "GOLD_KEY_TICKET"
  | "DIAMOND_TICKET"
  | "TRIAL_TICKET";
// import { useTheme } from "../../contexts/ThemeContext";
import { cn } from "../../lib/utils";
import { Play, Loader2, Trophy, Coins } from "lucide-react";
import { getRewardItemLabel } from "../../constants/rewardItems";

const TICKET_TABS: {
  type: RouletteTicketType;
  label: string;
  color: string;
}[] = [
  {
    type: "ROULETTE_TICKET",
    label: getRewardItemLabel("ROULETTE_TICKET"),
    color: "from-purple-600 to-indigo-600",
  },
  {
    type: "GOLD_KEY_TICKET",
    label: getRewardItemLabel("GOLD_KEY_TICKET"),
    color: "from-amber-500 to-yellow-500",
  },
  {
    type: "DIAMOND_TICKET",
    label: getRewardItemLabel("DIAMOND_TICKET"),
    color: "from-cyan-500 to-sky-500",
  },
  {
    type: "TRIAL_TICKET",
    label: getRewardItemLabel("TRIAL_TICKET"),
    color: "from-zinc-600 to-zinc-800",
  },
];

export default function RoulettePage() {
  // const { theme } = useTheme(); // Removed unused
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] =
    useState<RouletteTicketType>("ROULETTE_TICKET");
  const [isSpinning, setIsSpinning] = useState(false);
  const [winningSegment, setWinningSegment] = useState<number | null>(null);
  
  // Modal State
  const [showResultModal, setShowResultModal] = useState(false);
  const [lastWinAmount, setLastWinAmount] = useState(0);
  const [lastWinType, setLastWinType] = useState("POINT");

  const { data: status } = useQuery({
    queryKey: ["v2-roulette-status", activeTab],
    queryFn: () => getV2RouletteStatus(activeTab),
  });

  const { data: tabStatuses } = useQuery({
    queryKey: ["v2-roulette-status-tabs"],
    queryFn: async () => {
      const results = await Promise.all(
        TICKET_TABS.map(async (tab) => {
          try {
            const data = await getV2RouletteStatusStrict(tab.type);
            return { tab, data };
          } catch {
            return null;
          }
        }),
      );
      return results.filter(Boolean) as Array<{
        tab: (typeof TICKET_TABS)[number];
        data: Awaited<ReturnType<typeof getV2RouletteStatusStrict>>;
      }>;
    },
    staleTime: 1000 * 30,
  });

  const availableTabs = useMemo(() => {
    if (!tabStatuses || tabStatuses.length === 0) {
      return TICKET_TABS.slice(0, 1);
    }
    return tabStatuses.map((item) => item.tab);
  }, [tabStatuses]);

  const playMutation = useMutation({
    mutationFn: () =>
      playV2Roulette({ ticket_type: activeTab, bet_multiplier: 1 }),
    onSuccess: (data) => {
      setWinningSegment(data.game_data.segment.slot_index);
      
      // Store win data for modal
      setLastWinAmount(data.game_data.segment.reward_amount);
      setLastWinType(data.game_data.segment.reward_type);

      setIsSpinning(true);
    },
  });

  const handleSpinComplete = () => {
    setIsSpinning(false);
    queryClient.invalidateQueries({ queryKey: ["v2-roulette-status"] });
    queryClient.invalidateQueries({ queryKey: ["v2-vault-status"] });

    // Open Modal
    setShowResultModal(true);
    
    // Reset segment logic is handled after modal or next spin, 
    // but usually we keep the highlight until next spin.
    // setWinningSegment(null); 
  };

  const handleModalClose = () => {
    setShowResultModal(false);
    setWinningSegment(null); // Reset highlight when user closes modal to start fresh
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
    <div className="h-tg w-full max-w-[391px] mx-auto bg-[#121214] text-white flex flex-col items-center overflow-hidden pt-[var(--header-offset)] pb-[var(--nav-offset)] px-4">
      {/* Result Modal */}
      <RouletteResultModal 
        isOpen={showResultModal}
        onClose={handleModalClose}
        rewardType={lastWinType}
        rewardAmount={lastWinAmount}
      />

      {/* Header Stats - Premium Glassmorphism */}
      <div className="w-full grid grid-cols-2 gap-3 mb-6">
        <div className="bg-[#1C1C1E]/60 border border-white/5 rounded-[24px] p-4 flex flex-col items-center gap-2 shadow-xl backdrop-blur-md relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="w-10 h-10 rounded-full bg-[#1A2E26] border border-emerald-500/20 flex items-center justify-center mb-1">
            <Coins className="w-5 h-5 text-emerald-400" />
          </div>
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
            Available Tickets
          </span>
          <span className="text-xl font-black font-mono text-white tracking-tight drop-shadow-md">
            {status?.token_balance?.toLocaleString() ?? 0}
          </span>
        </div>
        <div className="bg-[#1C1C1E]/60 border border-white/5 rounded-[24px] p-4 flex flex-col items-center gap-2 shadow-xl backdrop-blur-md relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="w-10 h-10 rounded-full bg-[#1E1B2E] border border-indigo-500/20 flex items-center justify-center mb-1">
            <Trophy className="w-5 h-5 text-indigo-400" />
          </div>
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
            Today's Spins
          </span>
          <span className="text-xl font-black font-mono text-white tracking-tight drop-shadow-md">
            {status?.today_spins ?? 0} <span className="text-zinc-600 text-sm">/</span> {status?.max_daily_spins ?? 0}
          </span>
        </div>
      </div>

      {/* Main Wheel Section - Fixed Aspect Ratio */}
      <div className="relative w-full flex-1 flex items-center justify-center mb-4 min-h-0">
        <div className="w-full max-w-[320px] aspect-[292/293]">
          <RouletteWheel
            segments={status?.segments || []}
            isSpinning={isSpinning}
            selectedIndex={winningSegment ?? undefined}
            onSpinEnd={handleSpinComplete}
          />
        </div>
      </div>

      {/* Control Panel */}
      <div className="w-full max-w-[360px] space-y-5">
        {/* Ticket Selector - Neumorphic Depth */}
        <div className="flex bg-[#0A0A0A] rounded-[20px] p-1.5 border border-white/5 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]">
          {availableTabs.map((tab) => (
            <button
              key={tab.type}
              onClick={() => setActiveTab(tab.type)}
              className={cn(
                "flex-1 py-3 px-2 rounded-[16px] text-[11px] font-black transition-all duration-300 uppercase tracking-wider relative overflow-hidden",
                activeTab === tab.type
                  ? `bg-gradient-to-br ${tab.color} text-white shadow-lg`
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5",
              )}
            >
              {tab.label}
              {activeTab === tab.type && (
                <motion.div
                  layoutId="activeTabGlow"
                  className="absolute inset-0 bg-white/20 mix-blend-overlay"
                />
              )}
            </button>
          ))}
        </div>

        {/* Spin Button - Premium Action */}
        <button
          onClick={handleSpinClick}
          disabled={
            isSpinning ||
            playMutation.isPending ||
            (status?.token_balance ?? 0) <= 0
          }
          className={cn(
            "w-full h-[68px] rounded-[24px] font-black text-xl tracking-[0.15em] uppercase transition-all flex items-center justify-center gap-3 relative overflow-hidden group",
            isSpinning ||
              playMutation.isPending ||
              (status?.token_balance ?? 0) <= 0
              ? "bg-[#1C1C1E] text-zinc-600 cursor-not-allowed border border-white/5"
              : "bg-[#D2FD9C] hover:bg-[#B8EA81] text-[#0A0A0A] hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_20px_rgba(210,253,156,0.15)]",
          )}
        >
          {playMutation.isPending ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <>
              <div className="w-8 h-8 rounded-full bg-black/10 flex items-center justify-center">
                 <Play className="w-4 h-4 fill-current ml-0.5" />
              </div>
              <span>Spin Now</span>
            </>
          )}

          {/* Button Shine Effect - Only when active */}
          {!isSpinning && !playMutation.isPending && (status?.token_balance ?? 0) > 0 && (
            <div className="absolute inset-0 overflow-hidden rounded-[24px]">
               <div className="absolute top-0 left-[-100%] w-[50%] h-full bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-[-20deg] animate-[shimmer_3s_infinite]" />
            </div>
          )}
        </button>

        <p className="text-center text-[10px] font-bold text-zinc-600 uppercase tracking-widest flex items-center justify-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          System Online • Alpha V2 Build
        </p>
      </div>
    </div>
  );
}
