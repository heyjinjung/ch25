import { useState, useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { 
  CreditCard, 
  Users, 
  LayoutDashboard, 
  Settings, 
  Bell, 
  Search,
  LogOut
} from "lucide-react";
import { cn } from "../../lib/utils";

/**
 * V2 Admin Layout Shell
 * Strategy: Mobile Dock (Bottom) + Desktop Sidebar (Left)
 * Theme: Soft Obsidian (#121214)
 */
export default function AdminLayout() {
  const [isMobile, setIsMobile] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Responsive Check
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const navItems = [
    { icon: LayoutDashboard, label: "대시보드", path: "/v2/admin/dashboard" },
    { icon: Users, label: "유저관리", path: "/v2/admin/users" },
    { icon: CreditCard, label: "금고현황", path: "/v2/admin/economy/vault" },
    { icon: CreditCard, label: "상점관리", path: "/v2/admin/economy/shop" },
    { icon: Settings, label: "게임설정", path: "/v2/admin/game/missions" },
    { icon: Settings, label: "시스템", path: "/v2/admin/system/modals" },
  ];

  return (
    <div className="min-h-screen bg-obsidian-bg text-obsidian-text font-sans selection:bg-obsidian-accent selection:text-white">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <aside className="fixed left-0 top-0 h-screen w-64 border-r border-obsidian-border bg-obsidian-surface p-6">
          <div className="mb-10 flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-obsidian-accent/20 flex items-center justify-center">
              <div className="h-4 w-4 rounded-sm bg-obsidian-accent" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">Admin V2</span>
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200",
                  location.pathname.startsWith(item.path)
                    ? "bg-obsidian-accent text-white shadow-lg shadow-obsidian-accent/20"
                    : "text-obsidian-muted hover:bg-white/5 hover:text-white"
                )}
              >
                <item.icon size={18} />
                {item.label}
              </button>
            ))}
          </nav>

          <button className="absolute bottom-6 left-6 flex items-center gap-3 text-sm text-obsidian-muted hover:text-red-400">
            <LogOut size={18} />
            로그아웃
          </button>
        </aside>
      )}

      {/* Main Content Area */}
      <main 
        className={cn(
          "min-h-screen transition-all duration-300",
          !isMobile ? "pl-64" : "pb-24" // Mobile adds padding for Dock
        )}
      >
        {/* Header (Top Bar) */}
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-obsidian-border bg-obsidian-bg/80 px-6 backdrop-blur-md">
          <div className="flex items-center gap-4">
            {isMobile && <span className="text-lg font-bold text-white">Admin V2</span>}
            {!isMobile && (
              <div className="flex items-center gap-2 rounded-lg bg-obsidian-surface px-3 py-1.5 border border-obsidian-border">
                <Search size={14} className="text-obsidian-muted" />
                <input 
                  type="text" 
                  placeholder="유저 검색 (Enter)"
                  className="bg-transparent text-sm text-white placeholder-obsidian-muted focus:outline-none w-64"
                />
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <button className="relative rounded-full p-2 text-obsidian-muted hover:bg-white/5 hover:text-white">
              <Bell size={20} />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
            </button>
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500" />
          </div>
        </header>

        {/* Content Outlet */}
        <div className="p-6">
          <Outlet />
        </div>
      </main>

      {/* Mobile Dock (Bottom Navigation) */}
      {isMobile && (
        <nav className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-2xl border border-white/10 bg-black/50 p-2 shadow-2xl backdrop-blur-xl">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 rounded-xl px-4 py-2 transition-all",
                location.pathname.startsWith(item.path)
                  ? "bg-white/15 text-white"
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              )}
            >
              <item.icon size={20} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}
