import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../auth/authStore";
import { useQuery } from "@tanstack/react-query";
import type { VaultStatusResponse } from "../../api/gameApi";
import { getV2VaultStatus } from "../../api/v2GameAdapter";
import AnimatedNumber from "../common/AnimatedNumber";
import { useV2Missions } from "../../hooks/useV2Mission";
import { useModalVisibility } from "../../hooks/useModalVisibility";
import V2StreakModalContainer from "../mission/V2StreakModalContainer";

const V2AppHeader: React.FC = () => {
  const { user } = useAuth();

  const { data: vault } = useQuery<VaultStatusResponse>({
    queryKey: ["v2-vault-status"],
    queryFn: getV2VaultStatus,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  const { data: missionsData } = useV2Missions("DAILY");
  const { attendance_streak_enabled } = useModalVisibility();
  const [isStreakModalOpen, setIsStreakModalOpen] = useState(false);

  const streakInfo = missionsData?.streak_info;
  const claimableDay = streakInfo?.claimable_rewards?.[0] ?? null;
  const hasClaimable = (streakInfo?.claimable_rewards?.length ?? 0) > 0;

  const showModalOverride = vault?.showModalOverride ?? null;
  const streakModalKey = useMemo(() => {
    if (showModalOverride === "STREAK_ATTENDANCE") {
      return `forced_modal_${showModalOverride}`;
    }
    if (claimableDay) {
      return `v2_streak_claim_shown_${claimableDay}`;
    }
    return null;
  }, [showModalOverride, claimableDay]);

  useEffect(() => {
    if (!attendance_streak_enabled) return;

    if (showModalOverride === "STREAK_ATTENDANCE") {
      if (!streakModalKey) return;
      if (!sessionStorage.getItem(streakModalKey)) {
        setIsStreakModalOpen(true);
        sessionStorage.setItem(streakModalKey, "true");
      }
      return;
    }

    if (hasClaimable && claimableDay && streakModalKey) {
      if (!sessionStorage.getItem(streakModalKey)) {
        setIsStreakModalOpen(true);
        sessionStorage.setItem(streakModalKey, "true");
      }
    }
  }, [
    attendance_streak_enabled,
    showModalOverride,
    hasClaimable,
    claimableDay,
    streakModalKey,
  ]);

  const vaultBalance = vault?.vaultBalance ?? 0;
  const ticketCount = vault?.ticketCount ?? 0;
  const segment = (user?.segment || "common").toLowerCase();

  const getGlowClass = (seg: string) => {
    switch (seg) {
      case "whale":
        return "border-purple-400/50 shadow-[0_0_10px_rgba(168,85,247,0.3)]";
      case "vip":
        return "border-amber-400/50 shadow-[0_0_10px_rgba(251,191,36,0.3)]";
      default:
        return "border-cc-lime/50 shadow-[0_0_10px_rgba(210,253,156,0.2)]";
    }
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 h-[var(--header-offset)] bg-[#121214] border-b border-white/5 z-50 flex items-center justify-center p-0">
        <div className="w-full max-w-[391px] px-2 flex items-center justify-between gap-3 h-full pt-[env(safe-area-inset-top)] pb-1">
          {/* User Profile - Standard Row */}
          <div className="flex items-center gap-2.5">
            <div
              className={`w-11 h-11 rounded-full border-2 p-0.5 bg-zinc-900 overflow-hidden ${getGlowClass(segment)}`}
            >
              <div className="w-full h-full rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden">
                {user?.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt="P"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center text-xs text-zinc-400 font-black">
                    CC
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-[14px] font-black text-white truncate max-w-[80px]">
                {user?.nickname || "Guest"}
              </span>
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter mt-1">
                LEVEL 1
              </span>
            </div>
          </div>

          {/* Asset Panel (60px Target Depth) */}
          <div className="flex-1 max-w-[210px] flex items-center justify-around bg-white/5 border border-white/10 rounded-2xl h-10 px-2.5 gap-1 backdrop-blur-sm">
            {/* Vault */}
            <div className="flex items-center gap-2 flex-1 justify-center">
              <img
                src="/assets/asset_coin_gold.png"
                alt="P"
                className="w-[18px] h-[18px] object-contain"
              />
              <div className="flex flex-col items-start leading-none gap-0.5">
                <span className="text-[8px] text-zinc-500 font-black uppercase">
                  금고
                </span>
                <div className="flex items-baseline gap-0.5">
                  <AnimatedNumber
                    value={vaultBalance}
                    className="text-[14px] font-black text-[#F59E0B] font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="w-[1px] h-6 bg-white/10" />

            {/* Tickets */}
            <div className="flex items-center gap-2 flex-1 justify-center">
              <img
                src="/assets/asset_ticket_bundle.png"
                alt="T"
                className="w-[18px] h-[18px] object-contain"
              />
              <div className="flex flex-col items-start leading-none gap-0.5">
                <span className="text-[8px] text-zinc-500 font-black uppercase">
                  티켓
                </span>
                <div className="flex items-baseline gap-0.5">
                  <AnimatedNumber
                    value={ticketCount}
                    className="text-[14px] font-black text-[#D2FD9C] font-mono"
                  />
                  <span className="text-[9px] text-[#D2FD9C]/80 font-bold">
                    장
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>
      {attendance_streak_enabled && isStreakModalOpen && streakInfo && (
        <V2StreakModalContainer
          open={isStreakModalOpen}
          onClose={() => setIsStreakModalOpen(false)}
          currentStreak={streakInfo.current_streak ?? 0}
          claimableDay={claimableDay}
        />
      )}
    </>
  );
};

export default V2AppHeader;
