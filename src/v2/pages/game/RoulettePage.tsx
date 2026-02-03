import { useMemo, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import RouletteWheel from "../../components/game/RouletteWheel";
import RouletteResultModal from "../../components/game/RouletteResultModal";
import {
  getV2RouletteStatus,
  getV2RouletteStatusStrict,
  playV2Roulette,
} from "../../api/v2GameAdapter";
import "./RouletteRedesign.css";
import { useSound } from "../../../hooks/useSound";
import { Loader2 } from "lucide-react";
import { triggerHaptic } from "../../utils/haptic";

type RouletteTicketType =
  | "ROULETTE_TICKET"
  | "GOLD_KEY_TICKET"
  | "DIAMOND_TICKET"
  | "TRIAL_TICKET";

const TICKET_TABS: {
  type: RouletteTicketType;
  label: string;
  icon: string;
}[] = [
  {
    type: "ROULETTE_TICKET",
    label: "룰렛",
    icon: "/assets/asset_ticket_green.png",
  },
  {
    type: "GOLD_KEY_TICKET",
    label: "골드",
    icon: "/assets/icons/goldkey.png",
  },
  {
    type: "DIAMOND_TICKET",
    label: "다이아",
    icon: "/assets/icons/diakey.png",
  },
  {
    type: "TRIAL_TICKET",
    label: "체험",
    icon: "/assets/asset_ticket_trial.png",
  },
];

export default function RoulettePage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] =
    useState<RouletteTicketType>("ROULETTE_TICKET");
  const [isSpinning, setIsSpinning] = useState(false);
  const [winningSegment, setWinningSegment] = useState<number | null>(null);
  const { startRouletteBgm, startMainBgm } = useSound();

  const [showResultModal, setShowResultModal] = useState(false);
  const [lastWinAmount, setLastWinAmount] = useState(0);
  const [lastWinType, setLastWinType] = useState("POINT");
  const [lastWinLabel, setLastWinLabel] = useState("");

  const { data: status } = useQuery({
    queryKey: ["v2-roulette-status", activeTab],
    queryFn: () => getV2RouletteStatus(activeTab),
  });

  useEffect(() => {
    startRouletteBgm();
    return () => {
      startMainBgm();
    };
  }, [startRouletteBgm, startMainBgm]);

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
      triggerHaptic("medium"); // 스핀 시작 햅틱
      setWinningSegment(data.game_data.segment.slot_index);
      setLastWinAmount(data.game_data.segment.reward_amount);
      setLastWinType(data.game_data.segment.reward_type);
      setLastWinLabel(data.game_data.segment.label);
      setIsSpinning(true);
    },
  });

  const handleSpinComplete = () => {
    triggerHaptic("heavy"); // 스핀 완료 햅틱
    setIsSpinning(false);
    queryClient.invalidateQueries({ queryKey: ["v2-roulette-status"] });
    queryClient.invalidateQueries({ queryKey: ["v2-vault-status"] });
    setShowResultModal(true);
  };

  const handleModalClose = () => {
    setShowResultModal(false);
    setWinningSegment(null);
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
    <div className="roulette-redesign-container">
      {/* Background Layer */}
      <div className="roulette-aurora-bg">
        <div className="roulette-aurora-blob blob-1" />
        <div className="roulette-aurora-blob blob-2" />
        <div className="roulette-aurora-blob blob-3" />
      </div>
      <div className="branding-watermark">CC</div>

      {/* Result Modal */}
      <RouletteResultModal
        isOpen={showResultModal}
        onClose={handleModalClose}
        rewardType={lastWinType}
        rewardAmount={lastWinAmount}
        rewardLabel={lastWinLabel}
      />

      {/* 1. Header Stats: Standardized Glassmorphism */}
      <div className="roulette-stats-row">
        <div className="roulette-stat-card">
          <span className="stat-label-small">잔여</span>
          <span className="stat-value text-emerald-400">
            {status?.token_balance?.toLocaleString() ?? 0}
          </span>
        </div>
        {status?.max_daily_spins && status.max_daily_spins > 0 ? (
          <div className="roulette-stat-card">
            <span className="stat-label-small">오늘</span>
            <span className="stat-value text-amber-400">
              {status.remaining_spins}/{status.max_daily_spins}
            </span>
          </div>
        ) : null}
      </div>

      {/* 2. Wheel Section */}
      <div className="roulette-wheel-wrapper">
        <RouletteWheel
          segments={status?.segments || []}
          isSpinning={isSpinning}
          selectedIndex={winningSegment ?? undefined}
          onSpinEnd={handleSpinComplete}
        />
      </div>

      {/* 3. Logic & Control Panel */}
      <div className="roulette-controls">
        {/* Ticket Selector: Icon-only Neumorphic */}
        <div className="ticket-selector-grid">
          {availableTabs.map((tab) => (
            <button
              key={tab.type}
              onClick={() => setActiveTab(tab.type)}
              className={`ticket-tab-item ${activeTab === tab.type ? "active" : ""}`}
            >
              <img src={tab.icon} className="tab-icon" alt={tab.label} />
              {activeTab === tab.type && (
                <motion.div
                  layoutId="activeDot"
                  className="tab-active-indicator"
                />
              )}
            </button>
          ))}
        </div>

        {/* Premium Action Button */}
        <button
          className="roulette-spin-button"
          onClick={handleSpinClick}
          disabled={
            isSpinning ||
            playMutation.isPending ||
            (status?.token_balance ?? 0) <= 0 ||
            (status?.max_daily_spins !== undefined &&
              status.max_daily_spins > 0 &&
              status.remaining_spins <= 0)
          }
        >
          {playMutation.isPending ? (
            <Loader2 className="w-7 h-7 animate-spin" />
          ) : (
            <span>
              {isSpinning
                ? "돌리는 중..."
                : status?.max_daily_spins &&
                    status.max_daily_spins > 0 &&
                    status.remaining_spins <= 0
                  ? "한도 초과"
                  : "시작하기"}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
