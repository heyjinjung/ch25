// src/pages/HomePage.tsx
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useTodayFeature } from "../hooks/useTodayFeature";
import { FEATURE_LABELS, normalizeFeature, NO_FEATURE_MESSAGE, type NullableFeatureType } from "../types/features";
import { isDemoFallbackEnabled, isFeatureGateActive } from "../config/featureFlags";

const featureIcons: Record<string, string> = {
  ROULETTE: "🎰",
  DICE: "🎲",
  LOTTERY: "🎫",
  RANKING: "🏆",
  SEASON_PASS: "🎄",
};

const featureColors: Record<string, { border: string; bg: string; glow: string }> = {
  ROULETTE: { border: "border-emerald-500/50", bg: "from-emerald-900/40", glow: "shadow-emerald-500/20" },
  DICE: { border: "border-blue-500/50", bg: "from-blue-900/40", glow: "shadow-blue-500/20" },
  LOTTERY: { border: "border-gold-500/50", bg: "from-gold-900/40", glow: "shadow-gold-500/20" },
  RANKING: { border: "border-purple-500/50", bg: "from-purple-900/40", glow: "shadow-purple-500/20" },
  SEASON_PASS: { border: "border-red-500/50", bg: "from-red-900/40", glow: "shadow-red-500/20" },
};

const HomePage: React.FC = () => {
  const { data, isLoading, isError, refetch } = useTodayFeature();

  const todayLabel = useMemo(() => {
    return new Intl.DateTimeFormat("ko-KR", { dateStyle: "full" }).format(new Date());
  }, []);

  const featureType: NullableFeatureType = normalizeFeature(data?.feature_type);
  const gateActive = isFeatureGateActive && !isDemoFallbackEnabled;

  // featureType이 null이면 오늘 이벤트 없음 (스케줄 row 없음)
  const hasActiveFeature = featureType !== null;

  const features = [
    { key: "ROULETTE" as const, title: "룰렛", description: "행운의 룰렛을 돌려보세요!", path: "/roulette" },
    { key: "DICE" as const, title: "주사위", description: "딜러와 승부하세요!", path: "/dice" },
    { key: "LOTTERY" as const, title: "복권", description: "긁어서 선물을 확인하세요!", path: "/lottery" },
    { key: "RANKING" as const, title: "랭킹", description: "오늘의 챔피언은?", path: "/ranking" },
    { key: "SEASON_PASS" as const, title: "시즌 패스", description: "레벨업하고 보상 받기!", path: "/season-pass" },
  ];

  if (isLoading) {
    return (
      <section className="flex flex-col items-center justify-center rounded-3xl border border-emerald-800/40 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 p-12 shadow-2xl">
        <div className="relative">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl">🎄</span>
        </div>
        <p className="mt-6 text-lg font-semibold text-emerald-200">이벤트를 불러오는 중...</p>
      </section>
    );
  }

  if (isError) {
    return (
      <section className="rounded-3xl border border-red-800/40 bg-gradient-to-br from-red-950 to-slate-900 p-8 text-center shadow-2xl">
        <div className="mb-4 text-6xl">😢</div>
        <p className="text-xl font-bold text-red-100">이벤트 정보를 불러오지 못했습니다.</p>
        <p className="mt-2 text-sm text-red-200/70">네트워크 상태를 확인해주세요</p>
        <button
          type="button"
          className="mt-6 rounded-full bg-emerald-600 px-8 py-3 font-semibold text-white transition hover:bg-emerald-500"
          onClick={() => refetch()}
        >
          다시 시도
        </button>
      </section>
    );
  }

  return (
    <section className="space-y-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl border border-gold-600/30 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 p-8 shadow-2xl">
        <div className="absolute -right-10 -top-10 text-[200px] opacity-5">🎄</div>
        <div className="absolute -left-10 -bottom-10 text-[150px] opacity-5">🎅</div>
        
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-gold-400">{todayLabel}</p>
            <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
              🎄 크리스마스 이벤트 🎄
            </h1>
            <p className="mt-2 text-slate-300">미니게임에 참여하고 시즌 보상을 획득하세요!</p>
          </div>
          <div className="shrink-0">
            <div className={`rounded-full px-5 py-2.5 text-sm font-bold ${
              isDemoFallbackEnabled 
                ? "bg-gradient-to-r from-gold-600 to-gold-500 text-white" 
                : "bg-emerald-800/60 text-emerald-200"
            }`}>
              {isDemoFallbackEnabled ? "🎮 데모 모드" : "🎯 실서비스"}
            </div>
          </div>
        </div>
        
        {gateActive && (
          <div className={`mt-6 rounded-xl border p-4 text-center ${
            hasActiveFeature 
              ? "border-emerald-500/30 bg-emerald-900/30 text-emerald-100" 
              : "border-amber-500/30 bg-amber-900/20 text-amber-200"
          }`}>
            {hasActiveFeature && featureType
              ? `🎉 오늘의 이벤트: ${FEATURE_LABELS[featureType]}` 
              : `📅 ${NO_FEATURE_MESSAGE}`}
          </div>
        )}
      </div>

      {/* Feature Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => {
          // 게이트가 비활성화되거나, 오늘 이벤트가 없거나, 오늘 feature와 일치하면 접근 허용
          const isAllowed = !gateActive || !hasActiveFeature || featureType === feature.key;
          const colors = featureColors[feature.key];
          const icon = featureIcons[feature.key];
          
          if (isAllowed) {
            return (
              <Link
                key={feature.key}
                to={feature.path}
                className={`group relative overflow-hidden rounded-2xl border-2 ${colors.border} bg-gradient-to-br ${colors.bg} to-slate-900/80 p-6 shadow-lg ${colors.glow} transition-all hover:scale-[1.02] hover:shadow-xl`}
              >
                <div className="absolute -right-4 -top-4 text-6xl opacity-10 transition-transform group-hover:scale-125">
                  {icon}
                </div>
                <div className="relative">
                  <div className="mb-3 text-4xl">{icon}</div>
                  <h3 className="text-xl font-bold text-white">{feature.title}</h3>
                  <p className="mt-1 text-sm text-slate-300">{feature.description}</p>
                  <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-emerald-300 transition group-hover:text-emerald-200">
                    참여하기
                    <span className="transition-transform group-hover:translate-x-1">→</span>
                  </div>
                </div>
              </Link>
            );
          }

          return (
            <div
              key={feature.key}
              className="relative overflow-hidden rounded-2xl border-2 border-slate-700/30 bg-slate-900/40 p-6 opacity-50"
            >
              <div className="absolute -right-4 -top-4 text-6xl opacity-10">{icon}</div>
              <div className="relative">
                <div className="mb-3 text-4xl grayscale">{icon}</div>
                <h3 className="text-xl font-bold text-slate-400">{feature.title}</h3>
                <p className="mt-1 text-sm text-slate-500">{feature.description}</p>
                <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-slate-800/60 px-3 py-1 text-xs text-amber-300/80">
                  🔒 오늘은 {featureType ? FEATURE_LABELS[featureType] : "이 이벤트"}만 열립니다
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Info */}
      <div className="rounded-2xl border border-slate-700/40 bg-slate-800/30 p-6 text-center">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-gold-400">💡 이벤트 안내</h3>
        <p className="mt-2 text-sm text-slate-300">
          매일 다른 미니게임이 열리며, 참여할 때마다 시즌패스 경험치가 적립됩니다.
        </p>
        <p className="mt-1 text-xs text-slate-500">
          레벨을 올려 다양한 보상을 수령하세요!
        </p>
      </div>
    </section>
  );
};

export default HomePage;
