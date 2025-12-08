import React, { useMemo } from "react";
import { useTodayFeature } from "../../hooks/useTodayFeature";
import { FEATURE_LABELS, FeatureType, normalizeFeature } from "../../types/features";
import { isFeatureGateActive } from "../../config/featureFlags";

interface FeatureGateProps {
  readonly feature: FeatureType;
  readonly children: React.ReactNode;
}

// Always render children. Only fetch today-feature and show a small banner when gating is explicitly active.
const FeatureGate: React.FC<FeatureGateProps> = ({ feature, children }) => {
  if (!isFeatureGateActive) {
    return <>{children}</>;
  }

  const { data, isError } = useTodayFeature();

  const infoBanner = useMemo(() => {
    if (isError) {
      return "오늘 이벤트 정보 로드 실패 (진행은 계속 가능합니다).";
    }
    const activeFeature = normalizeFeature(data?.feature_type);
    if (activeFeature && activeFeature !== feature) {
      return `오늘의 이벤트는 ${FEATURE_LABELS[activeFeature] ?? activeFeature}지만, 테스트용으로 계속 진행합니다.`;
    }
    return null;
  }, [data?.feature_type, feature, isError]);

  return (
    <>
      {infoBanner && (
        <div className="mb-4 rounded-lg border border-amber-600/40 bg-amber-900/30 px-4 py-2 text-sm text-amber-100">
          {infoBanner}
        </div>
      )}
      {children}
    </>
  );
};

export default FeatureGate;
