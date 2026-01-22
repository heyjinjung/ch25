import { Outlet } from "react-router-dom";
import V2MobileBottomNav from "./V2MobileBottomNav";
import V2AppHeader from "./V2AppHeader";
import V2LiveFeedBar from "./V2LiveFeedBar";

export default function V2AppLayout() {
  return (
    <div className="min-h-[100dvh] bg-black flex flex-col w-full overflow-x-hidden">
      {/* 64px Fixed Header */}
      <V2AppHeader />
      
      {/* 32px Fixed Live Feed Bar (follows Header) */}
      <V2LiveFeedBar />
      
      <main className="flex-1 w-full max-w-[391px] mx-auto pt-[96px] pb-[86.87px] flex flex-col">
        <Outlet />
      </main>

      {/* 86.87px Fixed Bottom Navigation */}
      <V2MobileBottomNav />
    </div>
  );
}
