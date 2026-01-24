import React, { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Vault,
  Store,
  Ticket,
  Trophy,
  ClipboardCheck,
  Send,
  CircleDot,
  Dice6,
  Target,
  Filter,
  FileQuestion,
  Flame,
  Swords,
  Settings,
  ShieldCheck,
  Menu,
  ChevronRight,
  ChevronDown,
  Bell,
  ToggleRight,
  UploadCloud
} from "lucide-react";

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

interface NavSection {
  heading: string;
  items: NavItem[];
  collapsible?: boolean;
}

const navSections: NavSection[] = [
  {
    heading: "?Ä?úÎ≥¥??,
    items: [
      { label: "?¥ÏòÅ ?Ä?úÎ≥¥??, path: "/admin", icon: <LayoutDashboard size={18} /> },
      { label: "ÎßàÏ????ºÌÑ∞", path: "/admin/marketing", icon: <Target size={18} /> },
      { label: "?¥ÏòÅÍ≥ÑÌöç(?åÎ†à?¥Î∂Å)", path: "/admin/ops", icon: <ShieldCheck size={18} /> },
      { label: "?¥ÏòÅ Î°úÍ∑∏", path: "/admin/ops/logs", icon: <ClipboardCheck size={18} /> },
      { label: "?¥ÏòÅ Î°úÍ∑∏ CSV ?ÖÎ°ú??, path: "/admin/ops/import", icon: <UploadCloud size={18} /> },
      { label: "CH25 Î°úÎç∞?¥ÌÑ∞ ?ÖÎ°ú??, path: "/admin/ops/raw-logs", icon: <UploadCloud size={18} /> },
    ],
  },
  {
    heading: "Í¥ÄÎ¶?Î∞??¥ÏòÅ",
    items: [
      { label: "Í∏àÍ≥† ?µÌï© Í¥ÄÎ¶?, path: "/admin/vault", icon: <Vault size={18} /> },
      { label: "?åÏõê Í¥ÄÎ¶?, path: "/admin/users", icon: <Users size={18} /> },
      { label: "?∞Ïºì/?†ÌÅ∞ Í¥ÄÎ¶?, path: "/admin/game-tokens", icon: <Ticket size={18} /> },
      { label: "ÎØ∏ÏÖò Í¥ÄÎ¶?, path: "/admin/missions", icon: <ClipboardCheck size={18} /> },
      { label: "?úÏ¶å ?®Ïä§", path: "/admin/seasons", icon: <Trophy size={18} /> },
      { label: "?ÅÏ†ê ?àÎ≤Ñ", path: "/admin/shop", icon: <Store size={18} /> },
      { label: "?∏Í∑∏Î®ºÌä∏", path: "/admin/user-segments", icon: <Filter size={18} /> },
      { label: "?§Î¨∏Ï°∞ÏÇ¨", path: "/admin/surveys", icon: <FileQuestion size={18} /> },
      { label: "?∏Î? ??Çπ ?ÖÎ†•", path: "/admin/external-ranking", icon: <Trophy size={18} /> },
    ],
  },
  {
    heading: "?§Ï†ï Î∞??úÏä§??,
    collapsible: true, // Keep less frequently used items collapsible
    items: [
      { label: "Î©îÏãúÏßÄ Î∞úÏÜ°", path: "/admin/messages", icon: <Send size={18} /> },
      { label: "?Ä Î∞∞Ì?", path: "/admin/team-battle", icon: <Swords size={18} /> },
      { label: "?§Ìä∏Î¶?Î≥¥ÏÉÅ", path: "/admin/streak-rewards", icon: <Flame size={18} /> },
      { label: "Î£∞Î†õ ?§Ï†ï", path: "/admin/roulette", icon: <CircleDot size={18} /> },
      { label: "Ï£ºÏÇ¨???§Ï†ï", path: "/admin/dice", icon: <Dice6 size={18} /> },
      { label: "Î≥µÍ∂å ?§Ï†ï", path: "/admin/lottery", icon: <Ticket size={18} /> },
      { label: "UI ?§Ï†ï", path: "/admin/ui-config", icon: <Settings size={18} /> },
      { label: "Î™®Îã¨ ?∏Ï∂ú ?úÏñ¥", path: "/admin/modal-visibility", icon: <ToggleRight size={18} /> },
    ],
  },
];

const AdminLayout: React.FC = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const location = useLocation();

  const navTestId = (path: string) => {
    const trimmed = path.startsWith("/admin") ? path.slice("/admin".length) : path;
    const slug = trimmed.replace(/^\//, "");
    return `admin-nav:${slug || "dashboard"}`;
  };

  const toggleSidebar = () => setSidebarOpen(!isSidebarOpen);
  const toggleSection = (heading: string) => {
    setCollapsedSections(prev => ({ ...prev, [heading]: !prev[heading] }));
  };

  const isPathActive = (path: string) => {
    if (path === "/admin") return location.pathname === "/admin";
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex min-h-screen bg-admin-bg font-sans text-admin-text-primary selection:bg-admin-brand/30">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 transform bg-admin-sidebar border-r border-admin-border transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        <div className="flex h-full flex-col">
          {/* Logo Section */}
          <div className="flex h-16 items-center px-6 border-b border-admin-border">
            <div className="h-7 w-7 rounded-lg bg-admin-brand shadow-admin-glow flex items-center justify-center">
              <span className="text-white font-black text-lg">C</span>
            </div>
            <span className="ml-2.5 text-lg font-black tracking-tighter text-admin-brand">
              CH25 ADMIN
            </span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto custom-scrollbar px-3 py-4">
            {navSections.map((section, idx) => {
              const isCollapsed = collapsedSections[section.heading];
              const hasActiveItem = section.items.some(item => isPathActive(item.path));

              return (
                <div key={idx} className="mb-4">
                  {section.collapsible ? (
                    <button
                      type="button"
                      onClick={() => toggleSection(section.heading)}
                      className="w-full px-3 mb-2 flex items-center justify-between text-[11px] font-bold text-admin-text-muted uppercase tracking-wider hover:text-admin-text-secondary transition-colors"
                      aria-label={`${section.heading} Î©îÎâ¥ ${isCollapsed ? '?ºÏπòÍ∏? : '?ëÍ∏∞'}`}
                    >
                      <span className="flex items-center gap-1.5">
                        {hasActiveItem && <span className="w-1 h-1 rounded-full bg-admin-brand" />}
                        {section.heading}
                      </span>
                      <ChevronDown size={12} className={`transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                    </button>
                  ) : (
                    <h3 className="px-3 mb-2 text-[11px] font-bold text-admin-text-muted uppercase tracking-wider flex items-center gap-1.5">
                      {hasActiveItem && <span className="w-1 h-1 rounded-full bg-admin-brand" />}
                      {section.heading}
                    </h3>
                  )}

                  {(!section.collapsible || !isCollapsed) && (
                    <div className="space-y-0.5">
                      {section.items.map((item) => {
                        const isActive = isPathActive(item.path);
                        return (
                          <Link
                            key={item.path}
                            to={item.path}
                            onClick={() => setSidebarOpen(false)}
                            data-testid={navTestId(item.path)}
                            className={`
                              group relative flex items-center px-3 py-2.5 rounded-lg transition-all duration-200
                              ${isActive
                                ? "bg-admin-brand/10 text-admin-brand"
                                : "text-admin-text-secondary hover:bg-admin-hover hover:text-admin-text-primary"}
                            `}
                          >
                            {/* Left Accent Bar */}
                            {isActive && (
                              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-admin-brand" />
                            )}
                            <span className={`transition-colors duration-200 ${isActive ? "text-admin-brand" : "text-admin-text-muted group-hover:text-admin-brand"}`}>
                              {item.icon}
                            </span>
                            <span className="ml-2.5 font-medium text-[13px]">
                              {item.label}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Bottom Profile - Simplified */}
          <div className="p-3 border-t border-admin-border">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-admin-bg/50">
              <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-admin-brand to-admin-accent p-[2px]">
                <div className="h-full w-full rounded-full bg-admin-sidebar flex items-center justify-center text-[10px] font-bold">
                  ADM
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-admin-text-primary truncate">MASTER ADMIN</p>
                <div className="flex items-center text-[10px] text-admin-accent">
                  <span className="h-1.5 w-1.5 rounded-full bg-admin-accent mr-1 animate-pulse" />
                  ONLINE
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-20 flex items-center justify-between px-8 bg-admin-bg/50 backdrop-blur-md border-b border-admin-border z-30">
          <button
            type="button"
            className="lg:hidden p-2 text-admin-text-secondary hover:bg-admin-hover rounded-lg transition-colors"
            onClick={toggleSidebar}
            aria-label="?¨Ïù¥?úÎ∞î ?¥Í∏∞"
            title="?¨Ïù¥?úÎ∞î ?¥Í∏∞"
          >
            <Menu size={24} />
          </button>

          <div className="hidden lg:flex items-center text-admin-meta space-x-2 text-admin-text-muted">
            <span>Admin</span>
            <ChevronRight size={14} />
            <span className="text-admin-text-primary font-semibold capitalize">
              {location.pathname.split("/").pop() || "Dashboard"}
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <button
              type="button"
              aria-label="?åÎ¶º"
              title="?åÎ¶º"
              className="p-2.5 text-admin-text-secondary hover:bg-admin-hover hover:text-admin-brand rounded-full transition-all relative"
            >
              <Bell size={20} />
              <div className="absolute top-2 right-2 w-2 h-2 bg-admin-danger rounded-full border-2 border-admin-bg" />
            </button>
            <div className="h-8 w-px bg-admin-border mx-2" />
            <div className="flex items-center gap-3 pl-2">
              <div className="text-right hidden sm:block">
                <p className="text-admin-meta font-bold">CC Jimin</p>
                <p className="text-[10px] text-admin-text-muted">Director of Ops</p>
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 overflow-y-auto custom-scrollbar bg-admin-bg">
          <div className="admin-page-container">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
