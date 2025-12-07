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
      throw error;
    }
    throw error;
  }
};
