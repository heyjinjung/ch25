// src/admin/components/AdminLayout.tsx
import React from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import {
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
} from "lucide-react";
import HomeShortcutButton from "../../components/common/HomeShortcutButton";

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

const AdminLayout: React.FC = () => {
  return (
    <div className="flex min-h-screen bg-[#0A0A0A] text-white">
      <aside className="hidden w-[260px] flex-shrink-0 border-r border-[#222222] bg-[#0B0B0B] sm:block">
        <div className="flex items-center justify-between px-4 py-4 border-b border-[#1a1a1a]">
          <div>
            <div className="text-sm font-semibold text-[#d8f8a1]">관리자 메뉴</div>
            <div className="text-[11px] text-gray-500">운영자용</div>
          </div>
          <Link to="/admin" className="rounded px-2 py-1 text-xs font-medium text-black" style={{ backgroundColor: accent }}>
            대시보드
          </Link>
        </div>
        <nav className="space-y-6 px-3 py-4 text-sm">
          {navSections.map((section) => (
            <div key={section.heading} className="space-y-2">
              <div className="flex items-center gap-2 px-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accent }} />
                {section.heading}
              </div>
              <div className="space-y-1">
                {section.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-md px-3 py-2 transition ${
                        isActive
                          ? "border border-[#2D6B3B] bg-[#1A1A1A] text-white"
                          : "text-gray-200 hover:bg-[#111111]"
                      }`
                    }
                  >
                    <span className="text-[#91F402]">{item.icon}</span>
                    <span className="text-sm">{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>
      <main className="flex-1 px-4 py-6 sm:px-8">
        <div className="mb-4 flex justify-end">
          <HomeShortcutButton />
        </div>
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
