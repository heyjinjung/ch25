// src/admin/pages/AdminDashboardPage.tsx
import React from "react";
import { Link } from "react-router-dom";
import {
  BadgePercent,
  CalendarRange,
  Dice6,
  Shield,
  Sparkles,
  Swords,
  TicketCheck,
  Trophy,
  Users,
  HardDrive,
} from "lucide-react";
import DailyOpsSummary from "../components/DailyOpsSummary";

const quickLinks = [
  {
    title: "시즌 설정",
    description: "기간/보상/조건 구성",
    to: "/admin/seasons",
    icon: <CalendarRange className="h-5 w-5 text-white" />,
  },
  {
    title: "룰렛 설정",
    description: "보상/확률/연출 세팅",
    to: "/admin/roulette",
    icon: <Sparkles className="h-5 w-5 text-white" />,
  },
  {
    title: "주사위 설정",
    description: "스킨/배율/확률 테이블",
    to: "/admin/dice",
    icon: <Dice6 className="h-5 w-5 text-white" />,
  },
  {
    title: "복권 설정",
    description: "라운드/티어/스토어 연동",
    to: "/admin/lottery",
    icon: <Shield className="h-5 w-5 text-white" />,
  },
  {
    title: "신규회원 판정",
    description: "온보딩 스코어/틱 설정",
    to: "/admin/new-member-dice",
    icon: <BadgePercent className="h-5 w-5 text-white" />,
  },
  {
    title: "티켓 지급",
    description: "지급 정책/사유 템플릿",
    to: "/admin/game-tokens",
    icon: <TicketCheck className="h-5 w-5 text-white" />,
  },
  {
    title: "티켓 로그/회수",
    description: "지갑/플레이/코인 원장",
    to: "/admin/game-token-logs",
    icon: <Trophy className="h-5 w-5 text-white" />,
  },
  {
    title: "랭킹 입력",
    description: "시즌 랭킹/외부 데이터",
    to: "/admin/external-ranking",
    icon: <Swords className="h-5 w-5 text-white" />,
  },
  {
    title: "회원 관리",
    description: "CRUD/필터/팀 배틀",
    to: "/admin/users",
    icon: <Users className="h-5 w-5 text-white" />,
  },
  {
    title: "팀 배틀 관리",
    description: "매칭/스코어/보상",
    to: "/admin/team-battle",
    icon: <Swords className="h-5 w-5 text-white" />,
  },
  {
    title: "금고 관리",
    description: "해금 규칙/적립 배수/지표",
    to: "/admin/vault",
    icon: <HardDrive className="h-5 w-5 text-white" />,
  },
];

const AdminDashboardPage: React.FC = () => {
  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#91F402]">overview</p>
        <h1 className="text-2xl font-bold text-white">운영 대시보드</h1>
        <p className="text-sm text-gray-400">핵심 지표와 자주 수정하는 설정을 한 곳에서 관리하세요.</p>
      </header>

      {/* Daily Operation Summary */}
      <DailyOpsSummary />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {quickLinks.map((link) => (
          <Link
            key={link.title}
            to={link.to}
            className="group rounded-lg border border-[#262626] bg-[#111111] shadow-md transition hover:-translate-y-0.5 hover:border-[#91F402]/70 hover:shadow-[0_12px_24px_rgba(0,0,0,0.4)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#91F402]"
          >
            <div className="flex items-center justify-between bg-[#2D6B3B] px-4 py-3 text-white">
              <h3 className="text-sm font-semibold">{link.title}</h3>
              {link.icon}
            </div>
            <div className="space-y-3 bg-[#171717] px-4 py-4">
              <p className="text-sm text-gray-400">{link.description}</p>
              <span className="inline-flex items-center text-sm font-medium text-[#91F402]">
                관리하기 →
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default AdminDashboardPage;
