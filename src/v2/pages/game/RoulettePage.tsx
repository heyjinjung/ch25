import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import RouletteWheel from "../../components/game/RouletteWheel";
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
import { useTheme } from "../../contexts/ThemeContext";
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
    <div className="h-screen w-full max-w-[391px] mx-auto bg-[#0A0A0A] text-white flex flex-col items-center overflow-hidden pt-[var(--header-offset)] pb-[var(--nav-offset)] px-4">
      {/* Header Stats */}
      <div className="w-full grid grid-cols-2 gap-3 mb-6">
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

      {/* Main Wheel Section - Fixed for Premium Assets */}
      <div className="relative w-full flex-1 flex items-center justify-center mb-6 min-h-0">
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
      <div className="w-full max-w-[360px] space-y-6">
        <div className="flex bg-zinc-950 rounded-2xl p-1.5 border border-white/5 shadow-inner">
          {availableTabs.map((tab) => (
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
