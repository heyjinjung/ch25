# 프론트엔드 스택 스펙

- 문서 타입: 프론트엔드 스택 명세
- 버전: v1.0
- 작성일: 2025-12-10
- 작성자: 시니어 백엔드/FE 협업 가이드
- 대상 독자: 프론트엔드 개발자, 테크 리드, QA

## 1. 목적 (Purpose)
- 프론트엔드에서 사용해야 할 언어/프레임워크/라이브러리 버전을 고정해 개발·QA 시 혼선을 줄인다.
- API 연동/빌드/검증 기준으로 활용할 수 있도록 스택을 명확히 기록한다.

## 2. 범위 (Scope)
- Scope: User/Admin SPA가 공통으로 사용하는 프론트 스택, 버전, 옵션.
- Out of Scope: 디자인 툴, 번들러 커스텀 플러그인, 백엔드 의존성.

## 3. 용어 정의 (Definitions)
- SPA: Single Page Application.
- React Query: TanStack Query v5.
- Admin API: `/admin/api/*` 엔드포인트 전용 Axios 인스턴스.

## 4. 본문 (스택 정의)
- 언어: TypeScript 5.x (strict 모드 ON).
- 프레임워크/런타임: React 18.x, Vite 6.x (HMR, code split 기본값 사용).
- 라우팅: React Router 7.x(또는 최신 안정) – User/Admin 라우트 분리.
- 스타일: Tailwind CSS 3.x.
- 컴포넌트: shadcn/ui + Radix UI 또는 MUI v6 (Admin에서 우선 적용 가능). User App은 Tailwind 커스텀 우선.
- 서버 상태: TanStack Query v5 (staleTime, retry 정책 문서화 필요).
- 로컬 상태: 기본 useState/useReducer, 필요 시 Zustand(선택) 기준 정의.
- HTTP: Axios 최신 안정, `apiClient`(/api)와 `adminApiClient`(/admin/api) 이중 인스턴스.
- 폼/검증: react-hook-form + Zod + zodResolver.
- 번들 설정: Vite 기본 + 환경별 env 파일(.env, .env.stage, .env.prod), source map 옵션 명시.

## 5. 예시 (버전/설정 스니펫)
```json
{
  "dependencies": {
    "react": "^18.3.0",
    "react-router-dom": "^7.0.0",
    "@tanstack/react-query": "^5.0.0",
    "axios": "^1.7.0",
    "tailwindcss": "^3.4.0"
  }
}
```

## 6. Validation / Checklist
- [ ] package.json에 React 18, TS 5, Vite 6, Tailwind 3, Query v5, Axios, RHF+Zod 버전이 반영되었는가?
- [ ] strict TypeScript 옵션이 활성화되어 있는가?
- [ ] Axios 인스턴스 분리가 스펙에 명시되어 있는가?
- [ ] Admin UI용 컴포넌트 라이브러리 선택 기준이 기록되어 있는가?

## 7. 변경 이력 (Changelog)
- v1.0 (2025-12-10): 최초 작성. 핵심 라이브러리 버전, 옵션, 인스턴스 분리 원칙 정의.
