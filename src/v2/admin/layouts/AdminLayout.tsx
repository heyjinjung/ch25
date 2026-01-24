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
      label: "?¥ÏòÅ",
      items: [
        {
          icon: LayoutDashboard,
          label: "?Ä?úÎ≥¥??,
          path: "/admin/dashboard",
          submenu: [
            { label: "Ops ?Ä?úÎ≥¥??, path: "/admin/dashboard" },
            { label: "Golden ?§ÏãúÍ∞?, path: "/admin/dashboard/golden" },
            { label: "?ÑÍ∏∞ ?àÏù¥??, path: "/admin/dashboard/radar" },
          ],
        },
        {
          icon: MessageSquare,
          label: "?∞ÎùΩÍ¥ÄÎ¶?,
          path: "/admin/marketing/messages",
        },
      ],
    },
    {
      key: "CORE",
      label: "ÏΩîÏñ¥",
      items: [
        { icon: Users, label: "?†Ï??µÌï©", path: "/admin/users" },
        { icon: Settings, label: "?àÎ≤®Í¥ÄÎ¶?, path: "/admin/game/level" },
        {
          icon: CreditCard,
          label: "Í∏àÍ≥†?ÑÌô©",
          path: "/admin/economy/vault",
        },
        {
          icon: CreditCard,
          label: "?ÖÍ∏àÍ¥ÄÎ¶?,
          path: "/admin/economy/deposits",
        },
        {
          icon: CreditCard,
          label: "?∞Ïºì/?†ÌÅ∞Í¥ÄÎ¶?,
          path: "/admin/inventory/tickets",
        },
        { icon: Store, label: "?ÅÏ†ê/ÎØ∏ÏÖò", path: "/admin/economy/shop" },
      ],
    },
    {
      key: "GAME",
      label: "Í≤åÏûÑÍ¥ÄÎ¶?,
      items: [
        { icon: Settings, label: "Î£∞Î†õ", path: "/admin/game/roulette" },
        { icon: Settings, label: "Ï£ºÏÇ¨??, path: "/admin/game/dice" },
        { icon: Settings, label: "Î≥µÍ∂å", path: "/admin/game/lottery" },
        { icon: Settings, label: "?ÄÎ∞∞Ì?", path: "/admin/game/team-battle" },
        {
          icon: Settings,
          label: "?¥Î≤§?∏Ìéò?¥Ï?(Í≥®Îì†?ÑÏõåÍ¥ÄÎ¶?",
          path: "/admin/game/golden-hour",
          submenu: [
            { label: "Í≥®Îì†?ÑÏõå Í¥ÄÎ¶?, path: "/admin/game/golden-hour" },
            { label: "Î™®Îã¨ ?úÏñ¥", path: "/admin/game/modals" },
          ],
        },
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
        <aside className="fixed left-0 top-0 h-screen w-64 border-r border-obsidian-border bg-obsidian-surface flex flex-col">
          <div className="p-6 pb-0 flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-obsidian-accent/20 flex items-center justify-center">
              <div className="h-4 w-4 rounded-sm bg-obsidian-accent" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">
              Admin V2
            </span>
          </div>

          <div className="px-6 py-4">
            <label className="block text-xs font-medium text-obsidian-muted mb-2">
              Î©îÎâ¥ ?ÑÌÑ∞
            </label>
            <select
              className="w-full rounded-lg bg-obsidian-bg/60 border border-obsidian-border px-2 py-2 text-sm text-white focus:outline-none"
              value={activeSectionFilter}
              onChange={(e) => {
                const next = e.target.value as NavSectionKey | "ALL";
                setActiveSectionFilter(next);
              }}
            >
              <option value="ALL">?ÑÏ≤¥</option>
              <option value="OPS">?¥ÏòÅ</option>
              <option value="CORE">ÏΩîÏñ¥</option>
              <option value="GAME">Í≤åÏûÑÍ¥ÄÎ¶?/option>
              <option value="SYSTEM">?úÏä§??/option>
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
                      aria-label={`${section.label} ?πÏÖò ${isCollapsed ? "?ºÏπòÍ∏? : "?ëÍ∏∞"}`}
                      title={`${section.label} ${isCollapsed ? "?ºÏπòÍ∏? : "?ëÍ∏∞"}`}
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

          <div className="p-6 border-t border-obsidian-border mt-auto">
            <button
              type="button"
              className="flex items-center gap-2 text-sm text-obsidian-muted hover:text-red-400 w-full transition-colors"
            >
              <LogOut size={18} />
              Î°úÍ∑∏?ÑÏõÉ
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
              <span className="text-lg font-bold text-white">Admin V2</span>
            )}
            {!isMobile && (
              <div className="flex items-center gap-2 rounded-lg bg-obsidian-surface px-2 py-1.5 border border-obsidian-border">
                <Search size={14} className="text-obsidian-muted" />
                <input
                  type="text"
                  placeholder="?†Ï? Í≤Ä??(Enter)"
                  className="bg-transparent text-sm text-white placeholder-obsidian-muted focus:outline-none w-64"
                />
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="relative rounded-full p-2 text-obsidian-muted hover:bg-white/5 hover:text-white"
              aria-label="?åÎ¶º"
              title="?åÎ¶º"
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
