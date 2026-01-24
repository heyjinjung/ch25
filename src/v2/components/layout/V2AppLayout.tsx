import { Outlet } from "react-router-dom";
import V2MobileBottomNav from "./V2MobileBottomNav";
import V2AppHeader from "./V2AppHeader";
import V2LiveFeedBar from "./V2LiveFeedBar";
import V2SparkleBackground from "../effects/V2SparkleBackground";

export default function V2AppLayout() {
  return (
    <div className="min-h-[100dvh] bg-black flex flex-col w-full overflow-x-hidden relative">
      {/* Global Background Particles */}
      <V2SparkleBackground />

      {/* 64px Fixed Header */}
      <V2AppHeader />
      
      {/* 32px Fixed Live Feed Bar (follows Header) */}
      <V2LiveFeedBar />
      
      {/* 100px Header + 32px Live Feed Bar Gap */}
      <main className="flex-1 w-full max-w-[391px] mx-auto px-2 pt-[calc(var(--header-offset)+32px)] pb-[var(--nav-offset)] flex flex-col relative z-20">
        <Outlet />
      </main>

      {/* 86.87px Fixed Bottom Navigation */}
      <V2MobileBottomNav />
    </div>
  );
}
