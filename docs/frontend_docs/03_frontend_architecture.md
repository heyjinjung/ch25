# 프론트엔드 아키텍처

- 문서 타입: 프론트엔드 아키텍처
- 버전: v1.0
- 작성일: 2025-12-10
- 작성자: 시니어 백엔드/FE 협업 가이드
- 대상 독자: 프론트엔드 개발자, 아키텍트, QA

## 1. 목적 (Purpose)
- User/Admin SPA의 폴더 구조와 레이어 역할을 정의해 구현/리뷰/테스트 기준을 제공한다.

## 2. 범위 (Scope)
- Scope: src 폴더 구조, 레이어 책임, 코드 스플릿 전략, API 연동 흐름.
- Out of Scope: 구체적인 UI 디자인, 백엔드 배포/인프라 세부사항.

## 3. 용어 정의 (Definitions)
- Pages/Routes: 라우팅에 직접 연결되는 화면 단위.
- Components: 재사용 가능한 UI 조각.
- Modules: 비즈니스 도메인별 묶음(예: roulette, dice 등).

## 4. 본문 (구조 정의)
- 기본 구조 예시:
```
src/
  main.tsx
  router/
  pages/              # User 화면 라우트
  admin/              # Admin 화면 라우트/페이지
  components/
  api/                # Axios 인스턴스, API 래퍼
  hooks/              # React Query 훅, 커스텀 훅
  modules/            # 도메인별 로직/타입
  styles/             # Tailwind 설정, 전역 스타일
  utils/
```
- 레이어 책임:
  - pages/admin: 화면 구성과 훅/컴포넌트 조합.
  - components: 비즈니스 로직 없는 UI 단위.
  - api: 백엔드 API 호출 함수, 타입 정의.
  - hooks: 데이터 패칭 훅(useQuery/useMutation), 상태 조합.
  - modules: 도메인별 상수/타입/포맷터.
- 코드 스플릿: React Router 기반 라우트 레벨 코드 스플릿(동적 import).
- 에셋 관리: Vite 정적 자원 활용, Tailwind 기반 스타일링.

## 5. 예시
- `/src/router/index.tsx`에서 User/Admin 라우트 트리 분리.
- `api/todayFeature.ts` + `hooks/useTodayFeature.ts`로 API/훅 분리.

## 6. Validation / Checklist
- [ ] User/App 구조가 pages vs admin 디렉터리로 분리되어 있는가?
- [ ] api/hooks/modules 구분이 문서에 명확히 정의되어 있는가?
- [ ] 라우트 단위 코드 스플릿 전략이 기록되어 있는가?
- [ ] Today-feature → 라우트 네비게이션 흐름이 구조에 반영되어 있는가?

## 7. 변경 이력 (Changelog)
- v1.0 (2025-12-10): 최초 작성. src 폴더 구조, 레이어 책임, 코드 스플릿/라우팅 흐름 정의.
