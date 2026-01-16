import React, { memo } from "react";
import { Outlet } from "react-router-dom";
import SidebarContainer, { SidebarMobileFooter } from "./SidebarContainer";
import MobileBottomNav from "./MobileBottomNav";
import AppHeader from "./AppHeader";
import { GuideProvider } from "../../contexts/GuideContext";
import AppGuide from "../guide/AppGuide";
import GuideFloatingButton from "../guide/GuideFloatingButton";

const SidebarAppLayout: React.FC = memo(() => {
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
      </div>
    </GuideProvider>
  );
});

SidebarAppLayout.displayName = "SidebarAppLayout";

export default SidebarAppLayout;
