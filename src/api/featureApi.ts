// src/api/featureApi.ts
import axios from "axios";
import userApi from "./httpClient";
import { isDemoFallbackEnabled } from "../config/featureFlags";
import { getFallbackTodayFeature } from "./fallbackData";
import { NullableFeatureType, normalizeFeature } from "../types/features";

export interface TodayFeatureResponse {
  readonly feature_type: NullableFeatureType;
}

export const getTodayFeature = async (): Promise<TodayFeatureResponse> => {
  try {
    const response = await userApi.get<{ feature_type?: string | null }>("/today-feature");
    return { feature_type: normalizeFeature(response.data.feature_type) };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (isDemoFallbackEnabled) {
        console.warn("[featureApi] Falling back to demo data", error.message);
        return getFallbackTodayFeature();
      }
      // Gracefully degrade when today-feature API is not available (e.g., 404)
      console.warn("[featureApi] today-feature unavailable, defaulting to no feature", error.message);
      return { feature_type: null };
    }
    // Non-axios errors: still avoid throwing to keep UI functional
    console.warn("[featureApi] unexpected error, defaulting to no feature", error);
    return { feature_type: null };
  }
};
