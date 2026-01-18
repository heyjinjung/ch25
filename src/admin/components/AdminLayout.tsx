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
    heading: "대시보드",
    items: [
      { label: "운영 대시보드", path: "/admin", icon: <LayoutDashboard size={18} /> },
      { label: "마케팅 센터", path: "/admin/marketing", icon: <Target size={18} /> },
      { label: "운영계획(플레이북)", path: "/admin/ops", icon: <ShieldCheck size={18} /> },
      { label: "운영 로그", path: "/admin/ops/logs", icon: <ClipboardCheck size={18} /> },
      { label: "운영 로그 CSV 업로드", path: "/admin/ops/import", icon: <UploadCloud size={18} /> },
      { label: "CH25 로데이터 업로드", path: "/admin/ops/raw-logs", icon: <UploadCloud size={18} /> },
    ],
  },
  {
    heading: "관리 및 운영",
    items: [
      { label: "금고 통합 관리", path: "/admin/vault", icon: <Vault size={18} /> },
      { label: "회원 관리", path: "/admin/users", icon: <Users size={18} /> },
      { label: "티켓/토큰 관리", path: "/admin/game-tokens", icon: <Ticket size={18} /> },
      { label: "미션 관리", path: "/admin/missions", icon: <ClipboardCheck size={18} /> },
      { label: "시즌 패스", path: "/admin/seasons", icon: <Trophy size={18} /> },
      { label: "상점 레버", path: "/admin/shop", icon: <Store size={18} /> },
      { label: "세그먼트", path: "/admin/user-segments", icon: <Filter size={18} /> },
      { label: "설문조사", path: "/admin/surveys", icon: <FileQuestion size={18} /> },
      { label: "외부 랭킹 입력", path: "/admin/external-ranking", icon: <Trophy size={18} /> },
    ],
  },
  {
    heading: "설정 및 시스템",
    collapsible: true, // Keep less frequently used items collapsible
    items: [
      { label: "메시지 발송", path: "/admin/messages", icon: <Send size={18} /> },
      { label: "팀 배틀", path: "/admin/team-battle", icon: <Swords size={18} /> },
      { label: "스트릭 보상", path: "/admin/streak-rewards", icon: <Flame size={18} /> },
      { label: "룰렛 설정", path: "/admin/roulette", icon: <CircleDot size={18} /> },
      { label: "주사위 설정", path: "/admin/dice", icon: <Dice6 size={18} /> },
      { label: "복권 설정", path: "/admin/lottery", icon: <Ticket size={18} /> },
      { label: "UI 설정", path: "/admin/ui-config", icon: <Settings size={18} /> },
      { label: "모달 노출 제어", path: "/admin/modal-visibility", icon: <ToggleRight size={18} /> },
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
                      aria-label={`${section.heading} 메뉴 ${isCollapsed ? '펼치기' : '접기'}`}
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
            aria-label="사이드바 열기"
            title="사이드바 열기"
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
              aria-label="알림"
              title="알림"
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
