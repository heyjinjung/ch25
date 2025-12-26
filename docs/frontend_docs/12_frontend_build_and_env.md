# 빌드 & 환경변수 가이드

- 문서 타입: 프론트엔드 빌드/환경 가이드
- 버전: v1.0
- 작성일: 2025-12-10
- 작성자: 시니어 백엔드/FE 협업 가이드
- 대상 독자: 프론트엔드 개발자, DevOps, QA

## 1. 목적 (Purpose)
- Vite 기반 빌드 설정, 환경변수 정의, 배포 시 체크리스트를 제공해 환경별 혼선을 줄인다.

## 2. 범위 (Scope)
- Scope: Vite 설정 요약, env 파일 키, 빌드 옵션, 배포 산출물.
- Out of Scope: 백엔드 배포 파이프라인.

## 3. 용어 정의 (Definitions)
- Env File: `.env`, `.env.stage`, `.env.prod` 등 환경별 변수 파일.
- Base URL: API 호출 기본 경로.

## 4. 본문 (설정)
- 필수 환경변수:
  - `VITE_API_BASE_URL` (유저 API), `VITE_ADMIN_API_BASE_URL` (관리자 API)
  - `VITE_ENABLE_MOCK` (선택), `VITE_SENTRY_DSN` (선택)
- Vite 빌드 옵션:
  - sourceMap: dev만 활성, prod는 기본 비활성(필요 시 설정).
  - minify: terser/esbuild 기본.
  - chunk split: React Router 기반 코드 스플릿 유지.
- 배포 산출물: `dist/` 정적 파일, Nginx/Static Hosting에 배포.

## 5. 예시
```env
VITE_API_BASE_URL=https://api.example.com
VITE_ADMIN_API_BASE_URL=https://admin-api.example.com
VITE_SENTRY_DSN=
```

## 6. Validation / Checklist
- [ ] User/Admin API base URL이 분리되어 정의되었는가?
- [ ] 환경별 env 파일 키가 명시되어 있는가?
- [ ] sourceMap/minify 등 빌드 옵션 기준이 기록되어 있는가?
- [ ] 배포 산출물(dist/)과 배포 대상(정적 호스팅)이 명시되었는가?

## 7. 변경 이력 (Changelog)
- v1.0 (2025-12-10): 최초 작성. 환경변수 키, Vite 빌드 옵션, 배포 산출물 정의.
