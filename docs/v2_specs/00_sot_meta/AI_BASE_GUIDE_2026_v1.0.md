문서 타입: 가이드
버전: v1.0
작성일: 2026-01-18
작성자: GitHub Copilot
대상: AI 코딩 에이전트
상태: SoT

## 1. 목적 (Purpose)
XMAS Event System에서 AI가 지속적으로 개발 작업을 수행할 때, 동일한 규칙과 품질 기준을 보장하기 위한 기본 지침을 정의한다.

## 2. 범위 (Scope)
- 백엔드(FastAPI + MySQL/Alembic)
- 프론트엔드(React + Vite + TypeScript + Tailwind)
- 문서(SoT/운영 규칙)
- 운영 정책(금고/보상/Rate Limit 등)

## 3. 용어 정의 (Definitions)
- SoT(Source of Truth): 변경 및 판단의 기준이 되는 문서/데이터
- 금고 SoT: user.vault_locked_balance
- PLAN/PATCH/VERIFY/SHIP: 작업 응답 순서 규칙

## 4. 기본 원칙 (필수)
1) 응답은 **항상 한글만** 사용한다.
2) 모든 변경은 **PLAN → PATCH → VERIFY → SHIP** 순서를 지킨다.
3) **Allowed Files**와 **Out of Scope**를 먼저 명시한다.
4) 기존 파일은 **반드시 읽고** 최소 diff로만 수정한다(전체 덮어쓰기 금지).
5) 문서/정책 SoT는 docs/를 우선한다.
6) 추측 금지: 근거가 없으면 1회만 최소 증거(로그/재현/DB row 등)를 요청한다.
7) 이름 질문에는 “GitHub Copilot”로, 모델 질문에는 “GPT-5.2-Codex”로 답한다.

## 5. 프로젝트 규칙 (핵심 SoT)
### 5.1 경제/보상 SoT
- sot 문서를 준수한다

### 5.2 프록시/Rate Limit/안전
- Real IP 신뢰가 필수(ProxyHeadersMiddleware + Nginx 전달).
- Rate Limit 기본 목표는 오탐 방지(1000 RPS 정책).
- Redis 장애 시 Fail-Open(요청 허용).

### 5.3 UX/정책
- 스트릭 보상은 수동 Claim(자동 지급 금지).
- 웰컴 모달 정책 B: 전 유저 노출 + 4개 미션 완료 전까지 유지.

## 6. 코드 변경 규칙
1) 범위 파악 후 필요한 파일만 수정한다.
2) 새로운 파일 생성 시 최소한의 내용으로 시작한다.
3) 외부 라이브러리 사용 시 설치/의존성 변경을 명시한다.
4) 문서 변경 시 DOCUMENTATION_RULES.md 형식을 따른다.

## 7. 품질/검증 기준
- 변경 사항이 있는 경우, backend/frontend/DB 기준으로 검증 체크리스트를 제공한다.
- 가능하면 기존 테스트/스크립트를 우선 사용한다.

## 8. 운영/검증 (QA)
- [ ] 메타 블록 작성 여부 확인
- [ ] 번호 기반 섹션 구조 유지
- [ ] SoT 우선순위 준수
- [ ] 금고/보상 정책 위반 없음
- [ ] PLAN → PATCH → VERIFY → SHIP 준수

## 9. 변경 이력
- v1.0 (2026-01-18, GitHub Copilot): 최초 작성
