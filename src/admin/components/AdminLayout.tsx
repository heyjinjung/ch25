// src/admin/components/AdminLayout.tsx
import React, { useMemo, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  Bell,
  ChevronDown,
  Home,
  Cog,
  CalendarClock,
  Gift,
  Dice5,
  Percent,
  UserPlus,
  Users,
  UsersRound,
  Ticket,
  Receipt,
  BarChart3,
  UserCog,
  MessageSquare,
  Menu,
  User,
  X,
} from "lucide-react";

const accent = "#91F402";

type NavItem = { label: string; path: string; icon: React.ReactNode };
type NavSection = { heading: string; items: NavItem[] };

const navSections: NavSection[] = [
  {
    heading: "대시보드",
    items: [{ label: "대시보드", path: "/admin", icon: <Home size={18} /> }],
  },
  {
    heading: "게임 관리",
    items: [
      { label: "시즌 설정", path: "/admin/seasons", icon: <Cog size={18} /> },
      { label: "기능 일정", path: "/admin/feature-schedule", icon: <CalendarClock size={18} /> },
      { label: "룰렛 설정", path: "/admin/roulette", icon: <Gift size={18} /> },
      { label: "주사위 설정", path: "/admin/dice", icon: <Dice5 size={18} /> },
      { label: "복권 설정", path: "/admin/lottery", icon: <Percent size={18} /> },
    ],
  },
  {
    heading: "회원 관리",
    items: [
      { label: "신규회원 판정", path: "/admin/new-member-dice", icon: <UserPlus size={18} /> },
      { label: "회원 관리", path: "/admin/users", icon: <Users size={18} /> },
      { label: "팀 배틀 관리", path: "/admin/team-battle", icon: <UsersRound size={18} /> },
    ],
  },
  {
    heading: "티켓 관리",
    items: [
      { label: "티켓 지급", path: "/admin/game-tokens", icon: <Ticket size={18} /> },
      { label: "티켓 기록/회수", path: "/admin/game-token-logs", icon: <Receipt size={18} /> },
    ],
  },
  {
    heading: "데이터 관리",
    items: [
      { label: "랭킹 입력", path: "/admin/external-ranking", icon: <BarChart3 size={18} /> },
      { label: "사용자 분류", path: "/admin/user-segments", icon: <UserCog size={18} /> },
      { label: "설문조사", path: "/admin/surveys", icon: <MessageSquare size={18} /> },
      { label: "UI 문구/CTA", path: "/admin/ui-config", icon: <Cog size={18} /> },
    ],
  },
];

const Sidebar: React.FC<{ mobile?: boolean; closeSidebar?: () => void }> = ({ mobile, closeSidebar }) => {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const section of navSections) initial[section.heading] = true;
    return initial;
  });

  return (
    <div className="flex h-full w-64 flex-col border-r border-[#333333] bg-[#111111] text-white">
      {mobile && (
        <div className="flex items-center justify-between border-b border-[#333333] p-4">
          <h2 className="text-xl font-bold text-[#91F402]">관리자</h2>
          <button
            type="button"
            onClick={closeSidebar}
            className="rounded-md p-1 text-white hover:bg-[#2D6B3B]"
            aria-label="사이드바 닫기"
          >
            <X size={20} />
          </button>
        </div>
      )}

      <div className="flex items-center space-x-3 border-b border-[#333333] p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2D6B3B]">
          <span className="font-bold text-[#91F402]">관</span>
        </div>
        <div>
          <h3 className="font-medium text-[#91F402]">관리자 메뉴</h3>
          <p className="text-xs text-gray-400">운영자용</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-4 px-2">
          {navSections.map((section) => {
            const isOpen = openSections[section.heading] ?? true;
            return (
              <li key={section.heading} className="space-y-1">
                <button
                  type="button"
                  onClick={() => setOpenSections((prev) => ({ ...prev, [section.heading]: !isOpen }))}
                  className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[#91F402] hover:bg-[#1A1A1A]"
                >
                  <span className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accent }} />
                    {section.heading}
                  </span>
                  <ChevronDown
                    size={16}
                    className={`text-[#91F402] transition-transform ${isOpen ? "rotate-0" : "-rotate-90"}`}
                    aria-hidden
                  />
                </button>

                {isOpen && (
                  <div className="space-y-1">
                    {section.items.map((item) => (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        end
                        onClick={() => {
                          if (mobile) closeSidebar?.();
                        }}
                        className={({ isActive }) =>
                          `flex items-center gap-3 rounded-md px-3 py-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#91F402] ${
                            isActive
                              ? "bg-[#2D6B3B] text-white"
                              : "text-gray-300 hover:bg-[#1A1A1A] hover:text-white"
                          }`
                        }
                      >
                        <span className="text-[#91F402]">{item.icon}</span>
                        <span className="text-sm">{item.label}</span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
};

const Header: React.FC<{ toggleSidebar: () => void }> = ({ toggleSidebar }) => {
  return (
    <header className="border-b border-[#333333] bg-[#111111] shadow-sm">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center">
          <button
            type="button"
            onClick={toggleSidebar}
            className="rounded-md p-2 text-white hover:bg-[#2D6B3B] md:hidden"
            aria-label="사이드바 열기"
          >
            <Menu size={24} />
          </button>
          <h1 className="ml-2 text-xl font-semibold text-[#91F402] md:ml-0">관리자 페이지</h1>
        </div>
        <div className="flex items-center space-x-4">
          <button type="button" className="rounded-full p-1 text-[#91F402] hover:bg-[#2D6B3B]" aria-label="알림">
            <Bell size={20} />
          </button>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2D6B3B] text-[#91F402]" aria-label="사용자">
            <User size={18} />
          </div>
        </div>
      </div>
    </header>
  );
};

const AdminLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const toggleSidebar = () => setSidebarOpen((p) => !p);

  const mobileSidebar = useMemo(() => {
    if (!sidebarOpen) return null;
    return (
      <div className="fixed inset-0 z-40 md:hidden">
        <div className="fixed inset-0 bg-black bg-opacity-70" onClick={toggleSidebar} />
        <div className="fixed inset-y-0 left-0 w-64">
          <Sidebar mobile closeSidebar={toggleSidebar} />
        </div>
      </div>
    );
  }, [sidebarOpen]);

  return (
    <div className="flex h-full min-h-screen bg-[#0A0A0A] font-['Noto_Sans_KR'] text-white">
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {mobileSidebar}

      <div className="flex flex-1 flex-col overflow-hidden">
        <Header toggleSidebar={toggleSidebar} />
        <main className="flex-1 overflow-y-auto border-t border-[#222222] bg-[#0A0A0A] p-4 text-white md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
