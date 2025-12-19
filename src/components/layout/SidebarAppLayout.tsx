import React from "react";
import { Outlet } from "react-router-dom";
import SidebarContainer, { SidebarMobileFooter } from "./SidebarContainer";
import HomeShortcutButton from "../common/HomeShortcutButton";

const SidebarAppLayout: React.FC = () => {
  return (
    <div className="min-h-screen w-full bg-black text-white">
      <div className="flex min-h-screen w-full flex-col lg:h-[100dvh] lg:flex-row lg:overflow-hidden">
        <aside className="w-full shrink-0 lg:h-full lg:w-[396px] lg:border-r lg:border-white/10 lg:overflow-hidden">
          <div className="h-full w-full">
            <SidebarContainer />
          </div>
        </aside>

        <main className="min-w-0 flex-1 lg:h-full lg:overflow-y-auto">
          <div className="w-full p-4 md:p-8">
            <div className="mb-4 flex justify-end">
              <HomeShortcutButton />
            </div>
            <Outlet />
          </div>

          {/* Mobile/Tablet footer must come after main content (Figma section order). */}
          <SidebarMobileFooter className="lg:hidden" />
        </main>
      </div>
    </div>
  );
};

export default SidebarAppLayout;
