# 프론트엔드 개요 (User & Admin) 

- 문서 타입: 프론트엔드 개요
- 버전: v1.0
- 작성일: 2025-12-10
- 작성자: 시니어 백엔드/FE 협업 가이드
- 대상 독자: 프론트엔드 개발자, PM, QA, 운영

## 1. 목적 (Purpose)
- 크리스마스 이벤트 SPA(유저)와 어드민 앱의 전체 역할, 범위, 주요 흐름을 한눈에 설명한다. 시즌 기간은 `start_date ~ end_date`로 정의되며 (이번 시즌: 2025-12-09 ~ 2025-12-25), N일 이벤트로 유연하게 운영된다.
- 백엔드(FastAPI)와 연동되는 프론트 구성을 빠르게 이해하고, 구현/QA 시 참고할 수 있는 기초 정보를 제공한다.

## 2. 범위 (Scope)
- Scope: 유저 이벤트 웹앱(모바일 우선)과 관리자 웹앱(데스크톱)을 포함한 프론트 전반의 개요.
- Out of Scope: 백엔드 세부 로직, DevOps 인프라, 디자인 시안(별도 도구) 등은 제외.

## 3. 용어 정의 (Definitions)
- User App: /, /roulette, /dice, /lottery, /ranking, /season-pass 등 유저 전용 SPA.
- Admin App: /admin/* 라우트에서 실행되는 관리자용 SPA.
- Feature Type: ROULETTE, DICE, LOTTERY, RANKING, SEASON_PASS.
- Today Feature: /api/today-feature로 확인되는 금일 활성 이벤트 (payload: {"feature_type", "user_id"}). remaining=0은 백엔드에서 무제한으로 해석되므로 UI 표기 시 "unlimited" 메시지로 변환한다.

## 4. 본문 (개요)
- 프론트 스택: React 18 + TypeScript 5 + Vite 6, React Router, Tailwind 3, TanStack Query v5, Axios, react-hook-form + Zod.
- 앱 구성: 단일 리포 내 User App / Admin App 분리, 라우터 기반 코드 스플릿.
- 모바일 우선: User App은 모바일 화면 최적화, Admin App은 데스크톱 우선.
- 백엔드 연동: 모든 데이터는 FastAPI 백엔드(`/api`, `/admin/api`)를 통해 수신/전송.
- 핵심 플로우: 홈(/) → today-feature 조회 → 해당 게임/랭킹/레벨 페이지로 네비게이션.

## 5. 예시
- 초기 진입: `/` → `/api/today-feature` → feature_type=ROULETTE → `/roulette`로 redirect.
- Admin 설정 변경 후 반영: /admin/roulette에서 6칸 설정 수정 → 저장 → 유저 /roulette 화면 재조회 시 새로운 segment 반영.

## 6. Validation / Checklist
- [ ] User App과 Admin App 라우트 경계가 명확히 분리되어 있는가?
- [ ] today-feature 기반 자동 라우팅 흐름이 개요에 반영되어 있는가?
- [ ] 스택(React/Vite/TS/Tailwind/Query/Axios/RHF+Zod) 명시가 최신 버전으로 기록되었는가?

## 7. 변경 이력 (Changelog)
- v1.0 (2025-12-10): 최초 작성. User/Admin 앱 개요, 스택 요약, 자동 라우팅 개요 추가.
