# 프론트엔드 라우트 & 내비게이션

- 문서 타입: 프론트엔드 라우팅
- 버전: v1.1
- 작성일: 2025-12-25
- 작성자: 시니어 백엔드/FE 협업 가이드
- 대상 독자: 프론트엔드 개발자, QA, PM

## 1. 목적 (Purpose)
- User/Admin 앱의 모든 경로와 이동 규칙을 명시해 구현/테스트 시 참조 기준을 제공한다.

## 2. 범위 (Scope)
- Scope: React Router 기반 라우트 테이블, 자동 라우팅 플로우, 보호 라우트 패턴.
- Out of Scope: 백엔드 API 세부 로직, UI 디자인.

## 3. 용어 정의 (Definitions)
- Protected Route: 인증 필요 라우트.
- Today Feature Redirect: (폐기) `/api/today-feature` 기반 리다이렉트는 사용하지 않음.

## 4. 본문 (라우트 테이블)
- User 라우트:
  - `/` : 홈 카드 항상 노출( today-feature 조회 없음).
  - `/roulette` : 룰렛 페이지.
  - `/dice` : 주사위 페이지.
  - `/lottery` : 복권 페이지.
  - `/ranking` : 랭킹 조회 페이지.
  - `/season-pass` : 레벨 상세.
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
  - `/` 진입 시 홈 카드 렌더( today-feature 호출 없음), 사용자가 게임 선택.
  - 인증 필요한 Admin 라우트는 PrivateRoute/loader로 토큰 검증 후 접근.
  - 잘못된 feature 호출 시 에러 페이지 혹은 홈으로 복귀.

## 5. 예시
```tsx
// 의사 코드 (홈 카드 선택)
const navigateTo = (path: string) => navigate(path);
```

## 6. Validation / Checklist
- [ ] User 라우트와 Admin 라우트가 분리되어 정의되었는가?
- [ ] `/` 홈 카드 always-on, today-feature 의존 없는 라우팅이 정의되었는가?
- [ ] Admin 보호 라우트 처리 방식이 명시되어 있는가?
- [ ] 존재하지 않는 feature_type에 대한 fallback 동작이 정의되어 있는가?

## 7. 변경 이력 (Changelog)
- v1.1 (2025-12-25): today-feature 리다이렉트 폐기, 홈 카드 always-on 흐름으로 수정.
- v1.0 (2025-12-10): 최초 작성. User/Admin 라우트 테이블 및 자동 라우팅 규칙 정의.
