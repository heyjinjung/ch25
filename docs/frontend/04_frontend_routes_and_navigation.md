# 프론트엔드 라우트 & 내비게이션

- 문서 타입: 프론트엔드 라우팅
- 버전: v1.0
- 작성일: 2025-12-10
- 작성자: 시니어 백엔드/FE 협업 가이드
- 대상 독자: 프론트엔드 개발자, QA, PM

## 1. 목적 (Purpose)
- User/Admin 앱의 모든 경로와 이동 규칙을 명시해 구현/테스트 시 참조 기준을 제공한다.

## 2. 범위 (Scope)
- Scope: React Router 기반 라우트 테이블, 자동 라우팅 플로우, 보호 라우트 패턴.
- Out of Scope: 백엔드 API 세부 로직, UI 디자인.

## 3. 용어 정의 (Definitions)
- Protected Route: 인증 필요 라우트.
- Today Feature Redirect: `/` 진입 시 /api/today-feature 결과에 따라 이동하는 흐름.

## 4. 본문 (라우트 테이블)
- User 라우트:
  - `/` : today-feature 조회 후 feature별 페이지로 redirect.
  - `/roulette` : 룰렛 페이지.
  - `/dice` : 주사위 페이지.
  - `/lottery` : 복권 페이지.
  - `/ranking` : 랭킹 조회 페이지.
  - `/season-pass` : 시즌패스 상세.
- Admin 라우트:
  - `/admin/login` : 관리자 로그인.
  - `/admin` : 대시보드.
  - `/admin/seasons` : 시즌 목록/수정.
  - `/admin/feature-schedule` : 일일 스케줄 관리.
  - `/admin/roulette` : 6칸 슬롯 설정.
  - `/admin/dice` : 주사위 보상/회수 설정.
  - `/admin/lottery` : 상품/확률/재고 설정.
  - `/admin/ranking` : 랭킹 수기 입력.
- 내비게이션 규칙:
  - `/` 진입 시 useTodayFeature → feature_type에 맞춰 navigate(`/roulette` 등).
  - 인증 필요한 Admin 라우트는 PrivateRoute/loader로 토큰 검증 후 접근.
  - 잘못된 feature 호출 시 에러 페이지 혹은 홈으로 복귀.

## 5. 예시
```tsx
// 의사 코드
const { data, isLoading } = useTodayFeature();
useEffect(() => {
  if (!isLoading && data) navigate(featurePathMap[data.feature_type] ?? "/season-pass");
}, [data]);
```

## 6. Validation / Checklist
- [ ] User 라우트와 Admin 라우트가 분리되어 정의되었는가?
- [ ] `/` → today-feature → redirect 플로우가 문서에 명확히 기재되었는가?
- [ ] Admin 보호 라우트 처리 방식이 명시되어 있는가?
- [ ] 존재하지 않는 feature_type에 대한 fallback 동작이 정의되어 있는가?

## 7. 변경 이력 (Changelog)
- v1.0 (2025-12-10): 최초 작성. User/Admin 라우트 테이블 및 자동 라우팅 규칙 정의.
