export const isDemoFallbackEnabled = import.meta.env.VITE_ENABLE_DEMO_FALLBACK === "true";

// TEST_MODE lets QA hit every game page without today-feature gating.
export const isTestModeEnabled = (import.meta.env.VITE_TEST_MODE ?? "false") === "true";

// Feature gating is on by default. Set VITE_GATE_TODAY_FEATURE="false" to disable.
export const isFeatureGateEnabled = (import.meta.env.VITE_GATE_TODAY_FEATURE ?? "true") !== "false";

// Only gate when explicitly enabled, not in demo fallback, and not in TEST_MODE.
export const isFeatureGateActive = isFeatureGateEnabled && !isDemoFallbackEnabled && !isTestModeEnabled;

// Trial (ticket-zero) grant feature flag. Default OFF.
export const isTrialGrantEnabled = (import.meta.env.VITE_ENABLE_TRIAL_GRANT ?? "false") === "true";
