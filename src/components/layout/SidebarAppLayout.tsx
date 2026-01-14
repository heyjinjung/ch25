import React, { useEffect, useMemo, useRef, memo } from "react";
import { Outlet } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import SidebarContainer, { SidebarMobileFooter } from "./SidebarContainer";
import { useToast } from "../common/ToastProvider";
import { isTrialGrantEnabled } from "../../config/featureFlags";
import MobileBottomNav from "./MobileBottomNav";
import AppHeader from "./AppHeader";
import { GuideProvider } from "../../contexts/GuideContext";
import AppGuide from "../guide/AppGuide";
import GuideFloatingButton from "../guide/GuideFloatingButton";
import { getVaultStatus } from "../../api/vaultApi";
import { fetchInventory } from "../../api/inventoryApi";
import TicketZeroRetentionModal from "../modal/TicketZeroRetentionModal";
import { requestTrialGrant } from "../../api/trialGrantApi";

const SidebarAppLayout: React.FC = memo(() => {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const lastIsTicketZeroRef = useRef<boolean | null>(null);
  const [isTicketZeroModalOpen, setIsTicketZeroModalOpen] = React.useState(false);

  const kstDayKey = useMemo(() => {
    try {
      const formatted = new Intl.DateTimeFormat("sv-SE", {
        timeZone: "Asia/Seoul",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());
      return formatted; // YYYY-MM-DD
    } catch {
      // Fallback: local date (best-effort)
      return new Date().toISOString().slice(0, 10);
    }
  }, []);

  const { data: vault } = useQuery({
    queryKey: ["vault-status"],
    queryFn: getVaultStatus,
    staleTime: 30_000,
    retry: false,
  });

  const { data: inventory } = useQuery({
    queryKey: ["inventory"],
    queryFn: fetchInventory,
    staleTime: 30_000,
    retry: false,
  });

  const todayMaxCount = 3;
  const todayCountKey = useMemo(() => `ticket-zero-modal-count:${kstDayKey}:v1`, [kstDayKey]);

  const getTodayShownCount = () => {
    try {
      const raw = window.localStorage.getItem(todayCountKey);
      const n = Number(raw);
      return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
    } catch {
      return 0;
    }
  };

  const bumpTodayShownCount = () => {
    try {
      const next = Math.min(getTodayShownCount() + 1, 999);
      window.localStorage.setItem(todayCountKey, String(next));
      return next;
    } catch {
      return getTodayShownCount();
    }
  };

  const playableTickets = useMemo(() => {
    const wallet = inventory?.wallet ?? {};

    const base = ["ROULETTE_COIN", "DICE_TOKEN", "LOTTERY_TICKET"]
      .map((k) => Number((wallet as any)?.[k] ?? 0))
      .reduce((a, b) => a + b, 0);
    const trial = Number((wallet as any)?.TRIAL_TOKEN ?? 0);

    // Fallback: if inventory wallet isn't ready, at least use server ticketCount (3종 합)
    const fallbackBase = Number(vault?.ticketCount ?? 0);
    const effectiveBase = base > 0 || trial > 0 ? base : fallbackBase;

    return effectiveBase + trial;
  }, [inventory?.wallet, vault?.ticketCount]);

  const isTicketZero = playableTickets <= 0;
  const vaultBalance = vault?.vaultBalance ?? 0;

  const trialGrantMutation = useMutation({
    mutationFn: () => requestTrialGrant({ token_type: "ROULETTE_COIN" }),
    onSuccess: (data) => {
      if (data.result === "OK") {
        addToast("체험 티켓 지급 완료", "success");
      }
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["vault-status"] });
      queryClient.invalidateQueries({ queryKey: ["roulette-status"] });
      queryClient.invalidateQueries({ queryKey: ["dice-status"] });
      queryClient.invalidateQueries({ queryKey: ["lottery-status"] });
    },
    onError: () => {
      addToast("체험 티켓 지급에 실패했습니다", "error");
    },
  });

  useEffect(() => {
    if (isTicketZeroModalOpen) return;

    // Don't stack on top of welcome modal.
    try {
      if (sessionStorage.getItem("welcome_modal_open") === "1") return;
    } catch {
      // ignore
    }

    const prev = lastIsTicketZeroRef.current;
    lastIsTicketZeroRef.current = isTicketZero;

    // Fire only on transition to ticket-zero (includes initial null -> true)
    if (!isTicketZero) return;
    if (prev === true) return;

    const currentCount = getTodayShownCount();
    if (currentCount >= todayMaxCount) return;

    bumpTodayShownCount();
    setIsTicketZeroModalOpen(true);
  }, [isTicketZero, isTicketZeroModalOpen, todayCountKey, todayMaxCount]);

  return (
    <GuideProvider>
      <div className="min-h-[100dvh] w-full bg-black text-white">
        <div className="flex min-h-[100dvh] w-full flex-col lg:h-[100dvh] lg:flex-row lg:overflow-hidden">
          {/* Desktop Sidebar (Hidden on mobile) */}
          <aside className="hidden shrink-0 lg:block lg:h-full lg:w-[396px] lg:border-r lg:border-white/10 lg:overflow-hidden">
            <div className="h-full w-full">
              <SidebarContainer />
            </div>
          </aside>

          <main className="min-w-0 flex-1 lg:h-full lg:overflow-y-auto pb-20 lg:pb-0">
            <div className="w-full p-4 md:p-8">
              <AppHeader />
              <Outlet />
            </div>

            {/* Legacy Footer: Hidden on mobile now because we use Bottom Nav */}
            <SidebarMobileFooter className="hidden md:block lg:hidden" />
          </main>

          {/* Mobile Bottom Navigation (Visible only on mobile) */}
          <MobileBottomNav />
        </div>

        {/* Guide System */}
        <AppGuide />
        <GuideFloatingButton />

        {isTicketZeroModalOpen && (
          <TicketZeroRetentionModal
            vaultBalance={vaultBalance}
            trialEnabled={isTrialGrantEnabled}
            isRequestingTrial={trialGrantMutation.isPending}
            onClose={() => setIsTicketZeroModalOpen(false)}
            onGoVault={() => {
              setIsTicketZeroModalOpen(false);
              window.location.href = "/vault";
            }}
            onRequestTrial={() => {
              if (!isTrialGrantEnabled) return;
              trialGrantMutation.mutate();
            }}
          />
        )}
      </div>
    </GuideProvider>
  );
});

SidebarAppLayout.displayName = "SidebarAppLayout";

export default SidebarAppLayout;
