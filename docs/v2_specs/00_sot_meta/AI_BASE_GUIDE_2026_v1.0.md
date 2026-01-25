문서 타입: 가이드
버전: v1.1
작성일: 2026-01-22
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
### 4.1 일반 원칙
1) 응답은 **항상 한글만** 사용한다.
2) 모든 변경은 **PLAN → PATCH → VERIFY → SHIP** 순서를 지킨다.
3) **Allowed Files**와 **Out of Scope**를 먼저 명시한다.
4) 기존 파일은 **반드시 읽고** 최소 diff로만 수정한다(전체 덮어쓰기 금지).
5) 문서/정책 SoT는 docs/를 우선한다.
6) 추측 금지: 근거가 없으면 1회만 최소 증거(로그/재현/DB row 등)를 요청한다.
7) 이름 질문에는 “GitHub Copilot”로, 모델 질문에는 “GPT-5.2-Codex”로 답한다.
8) **타임존 원칙**: 모든 비즈니스 로직(미션, 스트릭, 로그)은 `Asia/Seoul` (KST) 및 **오전 9시 리셋**(Operational Day) 정책을 준수한다. Naive datetime 사용을 엄금한다.

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

## 8. Troubleshooting Protocol (SoT-based)
복잡한 오류, 특히 500 에러나 데이터 불일치 해결 시 다음 프로세스를 강제한다.

### 8.1 증상 정의 (Symptom Abstraction)
"안돼요" 수준의 보고를 금지하고, 반드시 아래 포맷으로 문제를 재정의한다.

| 항목 | 내용 |
|---|---|
| **대상 기능** | 예: 룰렛 게임 실행, 인벤토리 진입 |
| **HTTP Status** | 500 (Server Error) vs 400 (Bad Request) vs 200 (Logic Error) |
| **영향 범위** | 특정 유저(ID=15) vs 전체 유저 |
| **재현 빈도** | 항상 vs 간헐적 |

### 8.2 증거 기반 원인 분석 (Evidence-Based RCA)
**"그럴 것이다"라는 추측을 절대 금지한다.**
반드시 **로그(Log)**와 **DB 제약조건(Constraint)**을 증거로 제시해야 한다.

- **Stack Trace 분석**: `IntegrityError`, `KeyError` 등 정확한 Exception 확인.
- **DB Constraint 확인**:
    - `CHECK` 제약조건 위반 여부 (예: `slot_index BETWEEN 0 AND 5`)
    - `FOREIGN KEY` 위반 여부 (예: `user_id=15` 등)
- **Code Logic**: "코드는 거짓말을 하지 않는다." DB와 코드의 불일치를 찾는다.

### 8.3 풀스택 검증 (Full-Stack Verification)
단일 레이어 수정 후 해결 선언 금지. 연결된 모든 레이어를 검증한다.

#### 1) DB & Migration
- **Schema**: `alembic current`로 최신 상태 확인.
- **Migration Chain**: `down_revision`이 끊어지지 않았는지 확인.
- **Constraint**: 비즈니스 로직과 DB 제약조건 일치 여부 (예: 8-segment 확장 시 DB도 0~7 허용해야 함).

#### 2) Data Integrity
- 레거시(V1)와 신규(V2) 테이블 간 데이터 동기화 확인 (예: `user` vs `v2_user`).
- Enum 값 매핑 확인 (예: `DICE_TOKEN` vs `DICE_TICKET`).

#### 3) API & Frontend
- **DTO Alias**: Backend Pydantic의 `serialization_alias`와 Frontend Interface 간의 **CamelCase/SnakeCase** 불일치 전수 조사.
- **Type Safety**: 프론트엔드에서 `??` 연산자 등을 사용해 방어적 코딩 적용.

### 8.4 시스템적 해결 (Systemic Fix)
- **Migration 수정**: Alembic 체인이 꼬였다면 중간 파일을 수정해서라도 바로잡는다.
- **기능 폐기(Deprecation)**: 복잡도만 높이고 사용되지 않는 기능(예: 룰렛 Grade)은 과감히 **폐기**하고 문서를 업데이트한다.

### 8.5 디버깅 팁 (Decision Tree)
1. **500 Error** → 백엔드 로그 확인 → DB Constraint/Query 확인.
2. **UI "없음" 표시** → API 응답 JSON 확인 → Pydantic Alias vs Frontend Interface 대조.
3. **로직 불일치** → 소스 코드(`service.py`) vs DB 데이터(`SELECT *`) 대조.

## 9. 운영/검증 (QA)
- [ ] 메타 블록 작성 여부 확인
- [ ] 번호 기반 섹션 구조 유지
- [ ] SoT 우선순위 준수
- [ ] 금고/보상 정책 위반 없음
- [ ] PLAN → PATCH → VERIFY → SHIP 준수

## 10. 변경 이력
- v1.2 (2026-01-25, AI Assistant): Troubleshooting Protocol (SoT-based) 추가
- v1.1 (2026-01-22, GitHub Copilot): 타임존 원칙(Asia/Seoul, 9AM 리셋) 명시.
- v1.0 (2026-01-18, GitHub Copilot): 최초 작성
