export const isDemoFallbackEnabled = import.meta.env.VITE_ENABLE_DEMO_FALLBACK === "true";

// Feature gating is on by default. Set VITE_GATE_TODAY_FEATURE="false" to disable.
export const isFeatureGateEnabled = (import.meta.env.VITE_GATE_TODAY_FEATURE ?? "true") !== "false";

export const isFeatureGateActive = isFeatureGateEnabled && !isDemoFallbackEnabled;
