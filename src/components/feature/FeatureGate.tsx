import React from "react";
import { useTodayFeature } from "../../hooks/useTodayFeature";
import { FeatureType, FEATURE_LABELS, normalizeFeature } from "../../types/features";
import { isDemoFallbackEnabled, isFeatureGateActive } from "../../config/featureFlags";

interface FeatureGateProps {
  readonly feature: FeatureType;
  readonly children: React.ReactNode;
}

const FeatureGate: React.FC<FeatureGateProps> = ({ feature, children }) => {
  const { data, isLoading, isError, refetch } = useTodayFeature();

  if (!isFeatureGateActive || isDemoFallbackEnabled) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <section className="rounded-xl border border-emerald-800/40 bg-slate-900/60 p-6 text-center shadow-lg shadow-emerald-900/30">
        <p className="text-lg font-semibold text-emerald-200">오늘 이용 가능한 이벤트를 확인하는 중입니다…</p>
      </section>
    );
  }

  if (isError || !data) {
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

  const todayFeature = normalizeFeature(data.feature_type);

  if (todayFeature === "NONE") {
    return (
      <section className="rounded-xl border border-red-800/40 bg-red-950/60 p-6 text-center text-red-100 shadow-lg shadow-red-900/30">
        <p className="text-lg font-semibold">오늘은 진행 중인 이벤트가 없습니다.</p>
      </section>
    );
  }

  if (todayFeature !== feature) {
    return (
      <section className="rounded-xl border border-amber-800/40 bg-amber-950/60 p-6 text-center text-amber-100 shadow-lg shadow-amber-900/30">
        <p className="text-lg font-semibold">오늘은 {FEATURE_LABELS[todayFeature]}만 참여할 수 있습니다.</p>
        <p className="text-sm text-amber-200">관리자 설정된 이벤트와 일치하는 링크로 접속해 주세요.</p>
      </section>
    );
  }

  return <>{children}</>;
};

export default FeatureGate;
