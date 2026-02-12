// src/api/seoMissionApi.ts
import userApi from "./httpClient";

// ============================================================================
// SEO Daily Search Mission API
// ============================================================================

export interface SeoCodeClaimResponse {
  readonly success: boolean;
  readonly reward_amount: number | null;
  readonly message: string | null;
}

export interface SeoMissionStatusResponse {
  readonly has_claimed_today: boolean;
  readonly reward_amount: number | null;
}

export interface SeoPublicHintResponse {
  readonly code: string | null;
  readonly message: string | null;
}

/**
 * SEO 미션 코드 입력 → 보상 수령.
 */
export const claimSeoCode = async (
  code: string,
): Promise<SeoCodeClaimResponse> => {
  try {
    const response = await userApi.post<SeoCodeClaimResponse>(
      "/api/v2/seo-mission/claim",
      { code: code.trim().toUpperCase() },
    );
    return response.data;
  } catch (error) {
    console.error("[seoMissionApi] Failed to claim SEO code", error);
    throw error;
  }
};

/**
 * 오늘의 SEO 미션 상태 조회 (이미 완료했는지).
 */
export const getSeoMissionStatus =
  async (): Promise<SeoMissionStatusResponse> => {
    try {
      const response = await userApi.get<SeoMissionStatusResponse>(
        "/api/v2/seo-mission/status",
      );
      return response.data;
    } catch (error) {
      console.error("[seoMissionApi] Failed to fetch SEO mission status", error);
      throw error;
    }
  };

/**
 * (Public) 오늘의 코드 힌트 조회 — 비인증 엔드포인트.
 */
export const getSeoPublicHint =
  async (): Promise<SeoPublicHintResponse> => {
    try {
      const response = await userApi.get<SeoPublicHintResponse>(
        "/api/v2/seo-mission/public/today-hint",
      );
      return response.data;
    } catch (error) {
      console.error("[seoMissionApi] Failed to fetch public hint", error);
      throw error;
    }
  };
