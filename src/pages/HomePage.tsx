import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/authStore";
import { useSeasonPassStatus } from "../hooks/useSeasonPass";
import { useRouletteStatus } from "../hooks/useRoulette";
import { useDiceStatus } from "../hooks/useDice";
import { useLotteryStatus } from "../hooks/useLottery";
import { GAME_TOKEN_LABELS } from "../types/gameTokens";

interface GameCardProps {
  readonly title: string;
  readonly path: string;
  readonly tokenType?: string;
  readonly tokenBalance?: number | null;
  readonly disabledReason?: string | null;
  readonly state?: "idle" | "loading" | "error";
}

const GameCard: React.FC<GameCardProps> = ({ title, path, tokenType, tokenBalance, disabledReason, state = "idle" }) => {
  const navigate = useNavigate();
  const hasCoins = typeof tokenBalance === "number" && tokenBalance > 0;
  const tokenLabel = tokenType ? GAME_TOKEN_LABELS[tokenType] ?? tokenType : "미지급";
  const statusBadge =
    state === "loading"
      ? "잔액 로딩 중"
      : state === "error"
        ? "잔액 조회 실패 - 코인 지급 후 재시도"
        : undefined;

  return (
    <div className="space-y-3 rounded-2xl border border-slate-700/50 bg-slate-900/50 p-5 shadow-lg shadow-emerald-900/10">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">{title}</h3>
        <span className="text-sm text-slate-300">{tokenLabel}</span>
      </div>
      <p className="text-sm text-slate-400">보유 코인: {hasCoins ? tokenBalance : 0}</p>
      {(disabledReason || statusBadge) && (
        <p className="text-xs text-amber-200">{disabledReason ?? statusBadge}</p>
      )}
      <button
        type="button"
        onClick={() => navigate(path)}
        disabled={!hasCoins}
        className="w-full rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-500 px-4 py-2 text-sm font-bold text-white shadow transition hover:from-emerald-500 hover:to-emerald-400 disabled:cursor-not-allowed disabled:from-slate-700 disabled:to-slate-600"
      >
        {hasCoins ? "바로 입장" : "코인 없음 - 관리자에게 문의"}
      </button>
    </div>
  );
};

const HomePage: React.FC = () => {
  const { user } = useAuth();
  const season = useSeasonPassStatus();
  const roulette = useRouletteStatus();
  const dice = useDiceStatus();
  const lottery = useLotteryStatus();

  const seasonSummary = useMemo(() => {
    if (season.isLoading) return { label: "로딩 중...", detail: "" };
    if (season.isError || !season.data) return { label: "시즌패스 정보를 불러오지 못했습니다.", detail: "" };
    return {
      label: `레벨 ${season.data.current_level} / XP ${season.data.current_xp} / 다음 레벨 ${season.data.next_level_xp}`,
      detail: `최대 레벨 ${season.data.max_level}`,
    };
  }, [season.data, season.isError, season.isLoading]);

  const gameCards: GameCardProps[] = [
    {
      title: "룰렛",
      path: "/roulette",
      tokenType: roulette.data?.token_type,
      tokenBalance: roulette.data?.token_balance ?? null,
      disabledReason: null,
      state: roulette.isLoading ? "loading" : roulette.isError ? "error" : "idle",
    },
    {
      title: "주사위",
      path: "/dice",
      tokenType: dice.data?.token_type,
      tokenBalance: dice.data?.token_balance ?? null,
      disabledReason: null,
      state: dice.isLoading ? "loading" : dice.isError ? "error" : "idle",
    },
    {
      title: "복권",
      path: "/lottery",
      tokenType: lottery.data?.token_type,
      tokenBalance: lottery.data?.token_balance ?? null,
      disabledReason: null,
      state: lottery.isLoading ? "loading" : lottery.isError ? "error" : "idle",
    },
  ];

  const isTestAccount = user?.id === 999 || user?.external_id === "test-qa-999";

  return (
    <section className="space-y-8">
      <div className="rounded-3xl border border-emerald-700/40 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 p-8 shadow-2xl">
        <p className="text-xs uppercase tracking-[0.3em] text-emerald-300">대시보드</p>
        <h1 className="mt-2 text-3xl font-bold text-white">내 정보</h1>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-700/50 bg-slate-900/60 p-4">
            <p className="text-xs text-slate-400">user_id</p>
            <p className="text-lg font-semibold text-white">{user?.id ?? "알 수 없음"}</p>
          </div>
          <div className="rounded-xl border border-slate-700/50 bg-slate-900/60 p-4">
            <p className="text-xs text-slate-400">external_id</p>
            <p className="text-lg font-semibold text-white">{user?.external_id ?? "알 수 없음"}</p>
          </div>
          {isTestAccount && (
            <div className="rounded-xl border border-indigo-600/40 bg-indigo-900/30 p-4 text-indigo-100">
              <p className="text-xs">테스트 계정</p>
              <p className="text-sm">로그/DB 연동 확인용 계정입니다.</p>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-gold-600/30 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 p-8 shadow-2xl">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-gold-400">Season Pass</p>
            <h2 className="text-2xl font-bold text-white">시즌패스 상태</h2>
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-gold-600/40 bg-slate-900/60 p-4">
          <p className="text-sm font-semibold text-emerald-100">{seasonSummary.label}</p>
          {seasonSummary.detail && <p className="text-xs text-slate-400">{seasonSummary.detail}</p>}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-700/50 bg-slate-900/60 p-8 shadow-2xl">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-emerald-300">Games</p>
            <h2 className="text-2xl font-bold text-white">게임 선택</h2>
            <p className="text-sm text-slate-400">코인이 있으면 언제든 입장 가능, 없으면 버튼이 비활성화됩니다.</p>
          </div>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {gameCards.map((card) => (
            <GameCard key={card.title} {...card} />
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-700/40 bg-slate-800/40 p-6 text-center">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-200">최근 보상/플레이 이력</h3>
        <p className="mt-2 text-sm text-slate-400">곧 추가될 예정입니다. DB 로그로 우선 확인해주세요.</p>
      </div>
    </section>
  );
};

export default HomePage;
