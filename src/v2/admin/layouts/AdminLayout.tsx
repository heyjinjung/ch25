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
  type LucideIcon,
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

  type NavSectionKey = "OPS" | "CORE" | "GAME" | "SYSTEM" | "USER";

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
        USER: Boolean(parsed?.USER),
      };
    } catch {
      return {
        OPS: false,
        CORE: false,
        GAME: false,
        SYSTEM: false,
        USER: false,
      };
    }
  });

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
      icon: LucideIcon;
      label: string;
      path: string;
      submenu?: Array<{ label: string; path: string }>;
    }>;
  }> = [
    {
      key: "OPS",
      label: "모니터링 & 분석",
      items: [
        {
          icon: LayoutDashboard,
          label: "통합 관제 센터",
          path: "/admin/control",
        },
        {
          icon: LayoutDashboard,
          label: "지표 및 인사이트",
          path: "/admin/analytics",
        },
        {
          icon: Settings,
          label: "시스템 보안 및 CSV",
          path: "/admin/system",
        },
      ],
    },
    {
      key: "USER",
      label: "유저 & 마케팅",
      items: [
        { icon: Users, label: "사용자 통합", path: "/admin/users" },
        { icon: Users, label: "잠재 유저 매칭", path: "/admin/prospect/linking" },
        { icon: Settings, label: "레벨 관리", path: "/admin/game/level" },
        {
          icon: MessageSquare,
          label: "메시지 및 고객 관리",
          path: "/admin/marketing/messages",
        },
      ],
    },
    {
      key: "CORE",
      label: "경제 & 상점",
      items: [
        {
          icon: CreditCard,
          label: "금고 관리",
          path: "/admin/economy/vault",
        },
        {
          icon: CreditCard,
          label: "입금 관리",
          path: "/admin/economy/deposits",
        },
        {
          icon: Store,
          label: "재고/인벤토리",
          path: "/admin/inventory/tickets",
        },
        { icon: Store, label: "상점 & 미션", path: "/admin/economy/shop" },
      ],
    },
    {
      key: "GAME",
      label: "게임 & 콘텐츠",
      items: [
        { icon: Settings, label: "룰렛", path: "/admin/game/roulette" },
        { icon: Settings, label: "주사위", path: "/admin/game/dice" },
        { icon: Settings, label: "복권", path: "/admin/game/lottery" },
        { icon: Settings, label: "팀 배틀", path: "/admin/game/team-battle" },
      ],
    },
  ];

  const flatNavItems = navSections.flatMap((s) =>
    s.items.flatMap((item) => {
      // If item has submenu, include all submenu items
      if (item.submenu) {
        return [
          item,
          ...item.submenu.map((sub) => ({
            ...item,
            label: sub.label,
            path: sub.path,
          })),
        ];
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
    <div className="min-h-screen bg-obsidian-bg text-obsidian-text font-sans selection:bg-obsidian-accent selection:text-white dark">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <aside className="fixed left-0 top-0 h-screen w-64 border-r border-obsidian-border bg-obsidian-surface flex flex-col">
          <div className="p-6 pb-0 flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-obsidian-accent/20 flex items-center justify-center">
              <div className="h-4 w-4 rounded-sm bg-obsidian-accent" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">
              V2 관리자
            </span>
          </div>

          <div className="px-6 py-4">
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
              <option value="OPS">모니터링 & 분석</option>
              <option value="USER">유저 & 마케팅</option>
              <option value="CORE">경제 & 상점</option>
              <option value="GAME">게임 & 콘텐츠</option>
            </select>
          </div>

          <nav className="flex-1 overflow-y-auto px-6 py-4 space-y-4 custom-scrollbar">
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
                              data-testid={`admin-nav:${item.path.split("/").pop() || "dashboard"}`}
                              className={cn(
                                "group relative flex w-full items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-300",
                                activeItemPath === item.path ||
                                  (item.submenu &&
                                    item.submenu.some(
                                      (sub) => location.pathname === sub.path,
                                    ))
                                  ? "text-obsidian-accent"
                                  : "text-obsidian-muted hover:text-white hover:bg-white/5",
                              )}
                            >
                              <item.icon size={18} />
                              <span>{item.label}</span>

                              {/* Minimal Underline Indicator */}
                              {activeItemPath === item.path ||
                              (item.submenu &&
                                item.submenu.some(
                                  (sub) => location.pathname === sub.path,
                                )) ? (
                                <div className="absolute bottom-1.5 left-4 right-4 h-[2px] bg-obsidian-accent/60 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.3)] transition-all duration-300" />
                              ) : (
                                <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-0 h-[2px] bg-obsidian-accent/30 rounded-full transition-all duration-300 group-hover:w-[calc(100%-2rem)]" />
                              )}
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
                                      "group relative flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-xs transition-all duration-200",
                                      location.pathname === subItem.path
                                        ? "text-obsidian-accent font-bold"
                                        : "text-obsidian-muted hover:text-white hover:bg-white/5",
                                    )}
                                  >
                                    <div
                                      className={cn(
                                        "w-1 h-1 rounded-full transition-all duration-300",
                                        location.pathname === subItem.path
                                          ? "bg-obsidian-accent scale-150 rotate-45 rounded-none"
                                          : "bg-obsidian-muted group-hover:bg-white opacity-50",
                                      )}
                                    />
                                    {subItem.label}

                                    {/* Submenu Underline */}
                                    {location.pathname === subItem.path && (
                                      <div className="absolute bottom-0.5 left-6 right-3 h-[1px] bg-obsidian-accent/40" />
                                    )}
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

          <div className="p-6 border-t border-obsidian-border mt-auto">
            <button
              type="button"
              className="flex items-center gap-2 text-sm text-obsidian-muted hover:text-red-400 w-full transition-colors"
            >
              <LogOut size={18} />
              로그아웃
            </button>
          </div>
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
              <span className="text-lg font-bold text-white">V2 관리자</span>
            )}
            {!isMobile && (
              <div className="flex items-center gap-2 rounded-lg bg-obsidian-surface px-2 py-1.5 border border-obsidian-border">
                <Search size={14} className="text-obsidian-muted" />
                <input
                  type="text"
                  placeholder="빠른 검색 (엔터)"
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
              data-testid={`admin-nav-mobile:${item.path.split("/").pop() || "dashboard"}`}
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
