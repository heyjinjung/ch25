// src/api/featureApi.ts
import userApi from "./httpClient";

export interface TodayFeatureResponse {
  readonly feature_type: string;
}

export const getTodayFeature = async (): Promise<TodayFeatureResponse> => {
  const response = await userApi.get<TodayFeatureResponse>("/today-feature");
  return response.data;
};
