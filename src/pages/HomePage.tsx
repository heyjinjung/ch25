// src/pages/HomePage.tsx
import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { useTodayFeature } from "../hooks/useTodayFeature";
import { FEATURE_LABELS, normalizeFeature } from "../types/features";
import { isDemoFallbackEnabled, isFeatureGateActive } from "../config/featureFlags";

const HomePage: React.FC = () => {
  const { data, isLoading, isError, refetch } = useTodayFeature();

  const todayLabel = useMemo(() => {
    return new Intl.DateTimeFormat("ko-KR", { dateStyle: "full" }).format(new Date());
  }, []);

  const featureType = normalizeFeature(data?.feature_type);
  const gateActive = isFeatureGateActive && !isDemoFallbackEnabled;

  const features = [
    { key: "ROULETTE" as const, title: "룰렛", description: "룰렛 게임으로 이동", path: "/roulette" },
    { key: "DICE" as const, title: "주사위", description: "주사위 게임 플레이", path: "/dice" },
    { key: "LOTTERY" as const, title: "복권", description: "복권 추첨 참여", path: "/lottery" },
    { key: "RANKING" as const, title: "랭킹", description: "오늘의 랭킹 확인", path: "/ranking" },
    { key: "SEASON_PASS" as const, title: "시즌 패스", description: "시즌 패스 진행 상황", path: "/season-pass" },
  ];

  if (isLoading) {
    return (
      <section className="flex flex-col items-center justify-center rounded-xl border border-emerald-800/40 bg-slate-900/60 p-6 text-center shadow-lg shadow-emerald-900/30">
        <p className="text-lg font-semibold text-emerald-200">오늘 이용 가능한 이벤트를 불러오는 중입니다…</p>
        <div className="mt-4 h-10 w-10 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" aria-label="loading" />
      </section>
    );
  }

  if (isError) {
    return (
      <section className="space-y-4 rounded-xl border border-red-800/40 bg-red-950/60 p-6 text-center text-red-100 shadow-lg shadow-red-900/30">
        <p className="text-lg font-semibold">이벤트 정보를 불러오지 못했습니다.</p>
        <button
          type="button"
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
          onClick={() => refetch()}
        >
          다시 시도
        </button>
      </section>
    );
  }

  const isAnyEventActive = featureType !== "NONE";

  return (
    <section className="space-y-5">
      <div className="rounded-xl border border-emerald-800/40 bg-slate-900/60 p-6 shadow-lg shadow-emerald-900/30">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-emerald-300">{todayLabel}</p>
            <h2 className="text-2xl font-bold text-emerald-100">지민코드 크리스마스 시즌 패스</h2>
            <p className="text-sm text-slate-300">관리자 링크로 접속한 사용자를 위한 오늘의 이벤트 허브</p>
          </div>
          <div className="rounded-full border border-emerald-700/40 bg-emerald-900/50 px-4 py-2 text-xs font-semibold text-emerald-100">
            {isDemoFallbackEnabled ? "테스트 모드 (모든 기능 체험)" : "실서비스 모드 (하루 한 개 이벤트)"}
          </div>
        </div>
        {gateActive && (
          <p className="mt-3 text-sm text-amber-200">
            오늘은 {isAnyEventActive ? `${FEATURE_LABELS[featureType]}만 참여할 수 있습니다.` : "진행 중인 이벤트가 없습니다."}
          </p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => {
          const isAllowed = !gateActive || featureType === "NONE" || featureType === feature.key;
          if (isAllowed) {
            return (
              <Link
                key={feature.key}
                to={feature.path}
                className="rounded-lg border border-emerald-800/40 bg-slate-900/70 p-4 text-slate-100 transition hover:border-emerald-500"
              >
                <h3 className="text-lg font-semibold">{feature.title}</h3>
                <p className="text-sm text-slate-300">{feature.description}</p>
              </Link>
            );
          }

          return (
            <div
              key={feature.key}
              className="rounded-lg border border-slate-800/60 bg-slate-950/40 p-4 text-slate-100 opacity-60"
            >
              <h3 className="text-lg font-semibold">{feature.title}</h3>
              <p className="text-sm text-slate-300">{feature.description}</p>
              {gateActive && isAnyEventActive && (
                <p className="mt-2 text-xs text-amber-200">오늘은 {FEATURE_LABELS[featureType]}만 열립니다.</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default HomePage;
