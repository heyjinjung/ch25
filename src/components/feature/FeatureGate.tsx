import React, { useMemo } from "react";
import { useTodayFeature } from "../../hooks/useTodayFeature";
import { FeatureType, normalizeFeature } from "../../types/features";
import { isFeatureGateActive } from "../../config/featureFlags";

interface FeatureGateProps {
  readonly feature: FeatureType;
  readonly children: React.ReactNode;
}

// Coin-system always open: we keep the fetch for future gating, but hide mismatch banners.
const FeatureGate: React.FC<FeatureGateProps> = ({ feature, children }) => {
  if (!isFeatureGateActive) {
    return <>{children}</>;
  }

  const { data, isError } = useTodayFeature();

  const infoBanner = useMemo(() => {
    if (isError) return "?´ë²¤???•ë³´ ë¡œë“œ???¤íŒ¨?ˆì?ë§?ê²Œì„ ?´ìš©?€ ê³„ì† ê°€?¥í•©?ˆë‹¤.";
    const activeFeature = normalizeFeature(data?.feature_type);
    if (activeFeature && activeFeature !== feature) return null;
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
