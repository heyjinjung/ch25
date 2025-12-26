// src/admin/pages/AdminDashboardPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  BadgePercent,
  CalendarRange,
  Clock3,
  Dice6,
  LayoutDashboard,
  Shield,
  Sparkles,
  Swords,
  Ticket,
  TicketCheck,
  Trophy,
  Users,
  HardDrive,
} from "lucide-react";
import { fetchDashboardMetrics, DashboardMetricsResponse } from "../api/adminDashboardApi";

const baseAccent = "#91F402";

const formatNumber = (value: number | null | undefined) => {
  if (value === null || value === undefined) return "--";
  return value.toLocaleString();
};

const formatDuration = (seconds: number | null | undefined) => {
  if (!seconds || seconds <= 0) return "--";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
};

const formatChange = (diff: number | null | undefined) => {
  if (diff === null || diff === undefined) return "--";
  const sign = diff > 0 ? "+" : "";
  return `${sign}${diff.toFixed(1)}% (전일)`;
};

const isPositive = (diff: number | null | undefined) => {
  if (diff === null || diff === undefined) return true;
  return diff >= 0;
};


type StatCard = {
  title: string;
  value: string;
  change: string;
  isPositive: boolean;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
};

const quickLinks = [
  {
    title: "시즌 설정",
    description: "기간/보상/조건 구성",
    to: "/admin/seasons",
    icon: <CalendarRange className="h-5 w-5 text-white" />,
  },
  {
    title: "기능 일정",
    description: "이벤트/배포 캘린더 관리",
    to: "/admin/feature-schedule",
    icon: <LayoutDashboard className="h-5 w-5 text-white" />,
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
  const [data, setData] = useState<DashboardMetricsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchDashboardMetrics(24);
      setData(res);
    } catch (err) {
      setError("지표를 불러오지 못했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const stats: StatCard[] = useMemo(() => {
    const d = data;
    return [
      {
        title: "활성 사용자",
        value: formatNumber(d?.active_users.value),
        change: formatChange(d?.active_users.diff_percent),
        isPositive: isPositive(d?.active_users.diff_percent),
        icon: <Users className="h-5 w-5" style={{ color: baseAccent }} />,
        color: "bg-[#1F3D24]",
      },
      {
        title: "게임 참여",
        value: formatNumber(d?.game_participation.value),
        change: formatChange(d?.game_participation.diff_percent),
        isPositive: isPositive(d?.game_participation.diff_percent),
        icon: <Activity className="h-5 w-5" style={{ color: baseAccent }} />,
        color: "bg-[#1F3D24]",
        subtitle: d?.unique_players?.value !== undefined ? `유니크 ${formatNumber(d?.unique_players.value)}명` : undefined,
      },
      {
        title: "티켓 사용량",
        value: formatNumber(d?.ticket_usage.value),
        change: formatChange(d?.ticket_usage.diff_percent),
        isPositive: isPositive(d?.ticket_usage.diff_percent),
        icon: <Ticket className="h-5 w-5" style={{ color: baseAccent }} />,
        color: "bg-[#1F3D24]",
      },
      {
        title: "평균 체류 시간",
        value: formatDuration(d?.avg_session_time_seconds.value),
        change: formatChange(d?.avg_session_time_seconds.diff_percent),
        isPositive: isPositive(d?.avg_session_time_seconds.diff_percent),
        icon: <Clock3 className="h-5 w-5" style={{ color: baseAccent }} />,
        color: "bg-[#1F3D24]",
      },
    ];
  }, [data]);

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#91F402]">overview</p>
        <h1 className="text-2xl font-bold text-white">운영 대시보드</h1>
        <p className="text-sm text-gray-400">핵심 지표와 자주 수정하는 설정을 한 곳에서 관리하세요.</p>
      </header>

      {error && (
        <div className="rounded-lg border border-[#3A1F1F] bg-[#1A0D0D] p-4 text-sm text-red-200">
          <div className="flex items-center justify-between">
            <span>{error}</span>
            <button
              type="button"
              onClick={load}
              className="rounded border border-red-300 px-3 py-1 text-red-100 hover:bg-red-800/40"
            >
              다시 불러오기
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.title}
            className="rounded-lg border border-[#262626] bg-[#111111] p-5 shadow-md"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs text-gray-400">{stat.title}</p>
                <h3 className="text-2xl font-bold text-white">{stat.value}</h3>
                {stat.subtitle ? <p className="text-[11px] text-gray-400">{stat.subtitle}</p> : null}
                <p className={`text-xs ${stat.isPositive ? "text-[#91F402]" : "text-[#F97935]"}`}>
                  {stat.change}
                </p>
              </div>
              <div className={`rounded-full p-3 ${stat.color}`} aria-hidden>
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="rounded-lg border border-[#262626] bg-[#111111] p-5 shadow-md">
            <p className="text-sm text-gray-400">지표 로딩 중...</p>
          </div>
        )}
      </div>

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
