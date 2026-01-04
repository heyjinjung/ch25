// src/admin/pages/AdminDashboardPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  BadgePercent,
  CalendarRange,
  Clock3,
  Dice6,
  Shield,
  Sparkles,
  Swords,
  Ticket,
  TicketCheck,
  Trophy,
  Users,
  HardDrive,
} from "lucide-react";
import {
  fetchDashboardMetrics,
  fetchStreakMetrics,
  DashboardMetricsResponse,
  StreakMetricsResponse,
} from "../api/adminDashboardApi";

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
  const [streakData, setStreakData] = useState<StreakMetricsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [streakError, setStreakError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    setStreakError(null);
    try {
      const [res, streakRes] = await Promise.all([
        fetchDashboardMetrics(24),
        fetchStreakMetrics(7),
      ]);
      setData(res);
      setStreakData(streakRes);
    } catch {
      setError("지표를 불러오지 못했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  const loadStreakOnly = async () => {
    setStreakError(null);
    try {
      const streakRes = await fetchStreakMetrics(7);
      setStreakData(streakRes);
    } catch {
      setStreakError("스트릭 지표를 불러오지 못했습니다. 다시 시도해주세요.");
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
            className="group/card relative rounded-lg border border-[#262626] bg-[#111111] p-5 shadow-md hover:border-[#91F402]/30 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-xs text-gray-400">{stat.title}</p>
                  <div className="relative group/tooltip">
                    <span className="cursor-help text-xs text-gray-600 hover:text-gray-300">?</span>
                    <div className="absolute left-0 top-full z-50 mt-2 hidden w-48 rounded bg-[#1A1A1A] p-2 text-[10px] text-gray-300 shadow-xl border border-[#333] group-hover/tooltip:block">
                      {stat.title === "활성 사용자" && "오늘 로그인하거나 게임을 플레이한 유니크 사용자 수입니다."}
                      {stat.title === "게임 참여" && "룰렛, 주사위 등 모든 게임의 총 플레이 횟수입니다."}
                      {stat.title === "티켓 사용량" && "오늘 소모된 총 티켓 수량입니다."}
                      {stat.title === "평균 체류 시간" && "사용자당 평균 세션 지속 시간입니다."}
                    </div>
                  </div>
                </div>
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

      <div className="rounded-lg border border-[#262626] bg-[#111111] p-5 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#91F402]">streak</p>
            <h2 className="text-lg font-bold text-white">스트릭 관측성 (최근 7일, KST)</h2>
            <p className="text-xs text-gray-400">승급/리셋, 보너스 지급, 금고 배율 적용/제외 사유 (이벤트 운영용)</p>
          </div>
          <button
            type="button"
            onClick={loadStreakOnly}
            className="rounded border border-[#333] px-3 py-1 text-sm text-gray-200 hover:bg-[#171717]"
          >
            새로고침
          </button>
        </div>

        {streakError ? (
          <div className="mt-4 rounded-lg border border-[#3A1F1F] bg-[#1A0D0D] p-4 text-sm text-red-200">
            <div className="flex items-center justify-between">
              <span>{streakError}</span>
              <button
                type="button"
                onClick={loadStreakOnly}
                className="rounded border border-red-300 px-3 py-1 text-red-100 hover:bg-red-800/40"
              >
                다시 불러오기
              </button>
            </div>
          </div>
        ) : null}

        <div className="mt-4 space-y-2">
          <div className="rounded border border-[#262626] bg-[#0F0F0F] p-3 text-xs text-gray-300">
            <div className="flex flex-wrap gap-x-6 gap-y-1">
              <span>
                <span className="text-gray-400">표 시간대:</span> {streakData?.timezone ?? "Asia/Seoul"}
              </span>
              <span>
                <span className="text-gray-400">집계 기준:</span> {streakData?.calendar_bucket ?? "KST calendar day"}
              </span>
              <span>
                <span className="text-gray-400">스트릭 증가 트리거:</span> {streakData?.streak_trigger ?? "PLAY_GAME"}
              </span>
              <span>
                <span className="text-gray-400">운영일 리셋:</span> 매일 {String(streakData?.operational_reset_hour_kst ?? 9).padStart(2, "0")}:00 KST
              </span>
            </div>
            {streakData?.notes?.length ? (
              <ul className="mt-2 list-disc pl-4 text-[11px] text-gray-400">
                {streakData.notes.slice(0, 4).map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#262626] text-xs text-gray-400">
                <th className="py-2 pr-3">날짜(KST)</th>
                <th className="py-2 pr-3">승급</th>
                <th className="py-2 pr-3">리셋</th>
                <th className="py-2 pr-3">Day4~5 티켓 지급</th>
                <th className="py-2 pr-3">금고 보너스 적용(로그)</th>
                <th className="py-2 pr-3">금고 기본플레이(200)</th>
                <th className="py-2 pr-3">금고 보너스 적용(정산)</th>
                <th className="py-2 pr-3">제외: 주사위 모드</th>
                <th className="py-2">제외: 티켓 타입</th>
              </tr>
            </thead>
            <tbody>
              {(streakData?.items || []).map((row) => (
                <tr key={row.day} className="border-b border-[#1F1F1F] text-gray-200">
                  <td className="py-2 pr-3 text-gray-300">{row.day}</td>
                  <td className="py-2 pr-3">{formatNumber(row.promote)}</td>
                  <td className="py-2 pr-3">{formatNumber(row.reset)}</td>
                  <td className="py-2 pr-3">{formatNumber(row.ticket_bonus_grant)}</td>
                  <td className="py-2 pr-3">{formatNumber(row.vault_bonus_applied)}</td>
                  <td className="py-2 pr-3">{formatNumber(row.vault_base_plays)}</td>
                  <td className="py-2 pr-3">{formatNumber(row.vault_bonus_applied_via_earn_event)}</td>
                  <td className="py-2 pr-3">{formatNumber(row.excluded_by_dice_mode)}</td>
                  <td className="py-2">{formatNumber(row.excluded_by_token_type)}</td>
                </tr>
              ))}
              {!streakData?.items?.length ? (
                <tr>
                  <td colSpan={9} className="py-6 text-center text-sm text-gray-400">
                    {loading ? "스트릭 지표 로딩 중..." : "표시할 데이터가 없습니다."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
          </div>
        </div>
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
