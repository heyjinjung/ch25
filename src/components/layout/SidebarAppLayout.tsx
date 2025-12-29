import React, { useEffect, useMemo, useRef, memo } from "react";
import { Outlet } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import SidebarContainer, { SidebarMobileFooter } from "./SidebarContainer";
import { requestTrialGrant } from "../../api/trialGrantApi";
import { useToast } from "../common/ToastProvider";
import type { GameTokenType } from "../../types/gameTokens";
import { isTrialGrantEnabled } from "../../config/featureFlags";
import MobileBottomNav from "./MobileBottomNav";
import AppHeader from "./AppHeader";

const SidebarAppLayout: React.FC = memo(() => {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const didAttemptRef = useRef(false);

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

  const autoGrantKey = useMemo(() => `auto-trial-grant:${kstDayKey}:v1`, [kstDayKey]);

  const autoGrantMutation = useMutation({
    mutationFn: () => requestTrialGrant({ token_type: "ROULETTE_COIN" as GameTokenType }),
    onSuccess: (data) => {
      try {
        if (typeof window !== "undefined" && window.localStorage) {
          window.localStorage.setItem(autoGrantKey, "1");
        }
      } catch {
        // ignore
      }

      if (data.result === "OK") {
        addToast("오늘 체험 티켓 1장 지급 완료", "success");
      }

      queryClient.invalidateQueries({ queryKey: ["roulette-status"] });
      queryClient.invalidateQueries({ queryKey: ["dice-status"] });
      queryClient.invalidateQueries({ queryKey: ["lottery-status"] });
    },
  });

  useEffect(() => {
    if (!isTrialGrantEnabled) return;
    if (didAttemptRef.current) return;
    didAttemptRef.current = true;

    try {
      if (typeof window === "undefined" || !window.localStorage) return;
      const done = window.localStorage.getItem(autoGrantKey) === "1";
      if (done) return;
    } catch {
      // localStorage unavailable; still try once per mount
    }

    autoGrantMutation.mutate();
  }, [autoGrantKey, autoGrantMutation]);

  return (
    <div className="min-h-screen w-full bg-black text-white">
      <div className="flex min-h-screen w-full flex-col lg:h-[100dvh] lg:flex-row lg:overflow-hidden">
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
    </div>
  );
});

export default SidebarAppLayout;
