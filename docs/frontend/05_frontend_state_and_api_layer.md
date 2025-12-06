# 프론트엔드 상태 & API 레이어

- 문서 타입: 프론트엔드 상태/데이터 레이어
- 버전: v1.0
- 작성일: 2025-12-10
- 작성자: 시니어 백엔드/FE 협업 가이드
- 대상 독자: 프론트엔드 개발자, 테크 리드

## 1. 목적 (Purpose)
- React Query + Axios 조합으로 서버 상태를 관리하고, 공통 에러/로딩 처리 규칙을 정의한다.

## 2. 범위 (Scope)
- Scope: Axios 인스턴스, React Query 기본 옵션, 주요 훅/모듈 설계, 에러 처리 규칙.
- Out of Scope: 백엔드 비즈니스 로직, UI 컴포넌트 세부 디자인.

## 3. 용어 정의 (Definitions)
- apiClient: `/api/*` 호출용 Axios 인스턴스.
- adminApiClient: `/admin/api/*` 호출용 Axios 인스턴스.
- Query Hook: React Query 기반 데이터 패칭 훅(useQuery/useMutation).

## 4. 본문 (설계)
- Axios 설계:
  - `api/client.ts`: baseURL=/api, interceptors로 토큰 주입/401 핸들링.
  - `admin/api/client.ts`: baseURL=/admin/api, 관리자 인증 토큰 별도 관리.
- React Query 설정:
  - 기본 `staleTime` 5분(요건에 따라 조정), `retry` 1~2회, `suspense` 미사용 기본.
  - QueryClientProvider를 루트에 배치, Devtools는 개발 환경에서만.
- 대표 훅 예시:
  - useTodayFeature, useSeasonPassStatus, useRouletteStatus/Play, useDiceStatus/Play, useLotteryStatus/Play, useRankingToday.
  - Admin: useSeasons, useFeatureSchedule, useRouletteSegments, useDiceConfig, useLotteryPrizes, useRankingAdmin.
- 에러 처리:
  - 401 → 로그인/토큰 만료 처리, User는 로그인 토스트/모달, Admin은 로그인 페이지로 이동.
  - 4xx → API 메시지 표시 + 재시도/홈 이동 옵션.
  - 5xx/네트워크 → 공통 에러 컴포넌트 + 재시도 버튼.

## 5. 예시
```ts
// api/client.ts
export const apiClient = axios.create({ baseURL: "/api" });
apiClient.interceptors.response.use(undefined, (err) => {
  if (err.response?.status === 401) logout();
  return Promise.reject(err);
});
```

## 6. Validation / Checklist
- [ ] apiClient와 adminApiClient가 분리되어 정의되었는가?
- [ ] React Query 기본 옵션(staleTime/retry) 기준이 기록되어 있는가?
- [ ] 주요 도메인별 훅(useTodayFeature 등)이 설계에 나열되어 있는가?
- [ ] 에러/401 처리 규칙이 명시되어 있는가?

## 7. 변경 이력 (Changelog)
- v1.0 (2025-12-10): 최초 작성. Axios/React Query 설계, 훅 목록, 에러 처리 규칙 정의.
