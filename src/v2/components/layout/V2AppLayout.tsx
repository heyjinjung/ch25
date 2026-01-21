import { Outlet } from "react-router-dom";
import V2MobileBottomNav from "./V2MobileBottomNav";
import V2AppHeader from "./V2AppHeader";

export default function V2AppLayout() {
  return (
    <div className="min-h-[100dvh] bg-black flex flex-col">
      <V2AppHeader />
      <main className="flex-1 min-h-0">
        <Outlet />
      </main>
      <V2MobileBottomNav />
    </div>
  );
}
