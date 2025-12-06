// src/api/featureApi.ts
import axios from "axios";
import userApi from "./httpClient";
import { getFallbackTodayFeature } from "./fallbackData";

export interface TodayFeatureResponse {
  readonly feature_type: string;
}

export const getTodayFeature = async (): Promise<TodayFeatureResponse> => {
  try {
    const response = await userApi.get<TodayFeatureResponse>("/today-feature");
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.warn("[featureApi] Falling back to demo data", error.message);
      return getFallbackTodayFeature();
    }
    throw error;
  }
};
