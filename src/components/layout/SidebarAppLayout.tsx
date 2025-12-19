import React from "react";
import { Outlet } from "react-router-dom";
import SidebarContainer from "./SidebarContainer";
import HomeShortcutButton from "../common/HomeShortcutButton";

const SidebarAppLayout: React.FC = () => {
  return (
    <div className="min-h-screen w-full bg-black text-white">
      <div className="flex min-h-screen w-full flex-col lg:flex-row">
        <aside className="w-full shrink-0 lg:w-[396px] lg:border-r lg:border-white/10">
          <div className="h-full w-full">
            <SidebarContainer />
          </div>
        </aside>
        <main className="min-w-0 flex-1">
          <div className="h-full w-full p-4 lg:p-8">
            <div className="mb-4 flex justify-end">
              <HomeShortcutButton />
            </div>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default SidebarAppLayout;
