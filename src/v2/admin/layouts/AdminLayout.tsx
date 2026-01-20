import { useState, useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  CreditCard,
  Users,
  LayoutDashboard,
  Settings,
  MessageSquare,
  Bell,
  Search,
  LogOut,
  ChevronDown,
  ChevronRight,
  Store,
  Radio,
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

  type NavSectionKey = "OPS" | "CORE" | "GAME" | "SYSTEM";

  const [activeSectionFilter, setActiveSectionFilter] = useState<
    NavSectionKey | "ALL"
  >("ALL");
  const [collapsedSections, setCollapsedSections] = useState<
    Record<NavSectionKey, boolean>
  >(() => {
    try {
      const raw = localStorage.getItem("v2_admin_sidebar_collapsed_sections");
      const parsed = raw
        ? (JSON.parse(raw) as Partial<Record<NavSectionKey, boolean>>)
        : null;
      return {
        OPS: Boolean(parsed?.OPS),
        CORE: Boolean(parsed?.CORE),
        GAME: Boolean(parsed?.GAME),
        SYSTEM: Boolean(parsed?.SYSTEM),
      };
    } catch {
      return { OPS: false, CORE: false, GAME: false, SYSTEM: false };
    }
  });

  // Responsive Check
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        "v2_admin_sidebar_collapsed_sections",
        JSON.stringify(collapsedSections),
      );
    } catch {
      // ignore
    }
  }, [collapsedSections]);

  const navSections: Array<{
    key: NavSectionKey;
    label: string;
    items: Array<{
      icon: any;
      label: string;
      path: string;
      submenu?: Array<{ label: string; path: string }>;
    }>;
  }> = [
    {
      key: "OPS",
      label: "운영",
      items: [
        {
          icon: LayoutDashboard,
          label: "대시보드",
          path: "/v2/admin/dashboard",
          submenu: [
            { label: "Ops 대시보드", path: "/v2/admin/dashboard" },
            { label: "Golden 실시간", path: "/v2/admin/dashboard/golden" },
            { label: "위기 레이더", path: "/v2/admin/dashboard/radar" },
          ],
        },
        {
          icon: MessageSquare,
          label: "연락관리",
          path: "/v2/admin/marketing/messages",
        },
      ],
    },
    {
      key: "CORE",
      label: "코어",
      items: [
        { icon: Users, label: "유저통합", path: "/v2/admin/users" },
        { icon: Settings, label: "레벨관리", path: "/v2/admin/game/level" },
        {
          icon: CreditCard,
          label: "금고현황",
          path: "/v2/admin/economy/vault",
        },
        {
          icon: CreditCard,
          label: "입금관리",
          path: "/v2/admin/economy/deposits",
        },
        {
          icon: CreditCard,
          label: "티켓/토큰관리",
          path: "/v2/admin/inventory/tickets",
        },
        { icon: Store, label: "상점/미션", path: "/v2/admin/economy/shop" },
      ],
    },
    {
      key: "GAME",
      label: "게임관리",
      items: [
        { icon: Settings, label: "룰렛", path: "/v2/admin/game/roulette" },
        { icon: Settings, label: "주사위", path: "/v2/admin/game/dice" },
        { icon: Settings, label: "복권", path: "/v2/admin/game/lottery" },
        { icon: Settings, label: "팀배틀", path: "/v2/admin/game/team-battle" },
        {
          icon: Settings,
          label: "이벤트페이지(골든아워관리)",
          path: "/v2/admin/game/golden-hour",
        },
      ],
    },
    {
      key: "SYSTEM",
      label: "시스템",
      items: [
        { icon: Settings, label: "시스템", path: "/v2/admin/system/health" },
      ],
    },
  ];

  const flatNavItems = navSections.flatMap((s) =>
    s.items.flatMap((item) => {
      // If item has submenu, include all submenu items
      if (item.submenu) {
        return [item, ...item.submenu.map((sub) => ({ ...item, label: sub.label, path: sub.path }))];
      }
      return [item];
    }),
  );

  const activeItemPath = flatNavItems
    .filter((item) => {
      if (location.pathname === item.path) return true;
      return location.pathname.startsWith(`${item.path}/`);
    })
    .sort((a, b) => b.path.length - a.path.length)[0]?.path;

  const toggleSection = (key: NavSectionKey) => {
    setCollapsedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="min-h-screen bg-obsidian-bg text-obsidian-text font-sans selection:bg-obsidian-accent selection:text-white">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <aside className="fixed left-0 top-0 h-screen w-64 border-r border-obsidian-border bg-obsidian-surface p-6">
          <div className="mb-10 flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-obsidian-accent/20 flex items-center justify-center">
              <div className="h-4 w-4 rounded-sm bg-obsidian-accent" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">
              Admin V2
            </span>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-medium text-obsidian-muted mb-2">
              메뉴 필터
            </label>
            <select
              className="w-full rounded-lg bg-obsidian-bg/60 border border-obsidian-border px-2 py-2 text-sm text-white focus:outline-none"
              value={activeSectionFilter}
              onChange={(e) => {
                const next = e.target.value as NavSectionKey | "ALL";
                setActiveSectionFilter(next);
              }}
            >
              <option value="ALL">전체</option>
              <option value="OPS">운영</option>
              <option value="CORE">코어</option>
              <option value="GAME">게임관리</option>
              <option value="SYSTEM">시스템</option>
            </select>
          </div>

          <nav className="space-y-4">
            {navSections
              .filter(
                (section) =>
                  activeSectionFilter === "ALL" ||
                  section.key === activeSectionFilter,
              )
              .map((section) => {
                const isCollapsed = collapsedSections[section.key];
                return (
                  <div key={section.key}>
                    <button
                      type="button"
                      onClick={() => toggleSection(section.key)}
                      className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-xs font-semibold text-obsidian-muted hover:bg-white/5 hover:text-white"
                      aria-label={`${section.label} 섹션 ${isCollapsed ? "펼치기" : "접기"}`}
                      title={`${section.label} ${isCollapsed ? "펼치기" : "접기"}`}
                    >
                      <span>{section.label}</span>
                      {isCollapsed ? (
                        <ChevronRight size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      )}
                    </button>

                    {!isCollapsed && (
                      <div className="mt-2 space-y-2">
                        {section.items.map((item) => (
                          <div key={item.path}>
                            <button
                              type="button"
                              onClick={() => navigate(item.path)}
                              className={cn(
                                "flex w-full items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200",
                                activeItemPath === item.path ||
                                  (item.submenu &&
                                    item.submenu.some(
                                      (sub) => location.pathname === sub.path,
                                    ))
                                  ? "bg-obsidian-accent text-white shadow-lg shadow-obsidian-accent/20"
                                  : "text-obsidian-muted hover:bg-white/5 hover:text-white",
                              )}
                            >
                              <item.icon size={18} />
                              {item.label}
                            </button>

                            {/* Submenu */}
                            {item.submenu && (
                              <div className="mt-1 ml-6 space-y-1">
                                {item.submenu.map((subItem) => (
                                  <button
                                    type="button"
                                    key={subItem.path}
                                    onClick={() => navigate(subItem.path)}
                                    className={cn(
                                      "flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-xs transition-all duration-200",
                                      location.pathname === subItem.path
                                        ? "bg-obsidian-accent/50 text-white font-medium"
                                        : "text-obsidian-muted hover:bg-white/5 hover:text-white",
                                    )}
                                  >
                                    <div className="w-1 h-1 rounded-full bg-current opacity-50" />
                                    {subItem.label}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
          </nav>

          <button
            type="button"
            className="absolute bottom-6 left-6 flex items-center gap-2 text-sm text-obsidian-muted hover:text-red-400"
          >
            <LogOut size={18} />
            로그아웃
          </button>
        </aside>
      )}

      {/* Main Content Area */}
      <main
        className={cn(
          "min-h-screen transition-all duration-300",
          !isMobile ? "pl-64" : "pb-24", // Mobile adds padding for Dock
        )}
      >
        {/* Header (Top Bar) */}
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-obsidian-border bg-obsidian-bg/80 px-6 backdrop-blur-md">
          <div className="flex items-center gap-4">
            {isMobile && (
              <span className="text-lg font-bold text-white">Admin V2</span>
            )}
            {!isMobile && (
              <div className="flex items-center gap-2 rounded-lg bg-obsidian-surface px-2 py-1.5 border border-obsidian-border">
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
            <button
              type="button"
              className="relative rounded-full p-2 text-obsidian-muted hover:bg-white/5 hover:text-white"
              aria-label="알림"
              title="알림"
            >
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
          {flatNavItems.map((item) => (
            <button
              type="button"
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 rounded-xl px-4 py-2 transition-all",
                activeItemPath === item.path
                  ? "bg-white/15 text-white"
                  : "text-white/60 hover:bg-white/5 hover:text-white",
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
