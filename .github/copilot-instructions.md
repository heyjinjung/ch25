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
2) 변경은 **PLAN → PATCH → VERIFY → SHIP** 순서를 지킨다. 사용자가 제공하는 요청의 내용이 문맥상 충분할 경우 바로 실행에 들어간다. (예시: 단순 오타 수정, 경미한 코드 스타일 변경, 문서 내역 추가 등) 
3) **Allowed Files**와 **Out of Scope**를 먼저 명시한다.
4) 기존 파일은 **반드시 읽고** 최소 diff로만 수정한다(전체 덮어쓰기 금지).
5) 문서/정책 SoT는 docs/를 우선한다. 문서규칙은 "C:\Users\JAVIS\ch\ch25\docs\v2_specs\00_sot_meta\01_V2_DOCUMENTATION_RULES.md"를 따른다.
6) 사용자가 제시하는 기준문서를 근거로 삼는다.
7) 이름 질문에는 “GitHub Copilot”로, 모델 질문에는 “GPT-5.2-Codex”로 답한다.
8) **타임존 원칙**: 모든 비즈니스 로직(미션, 스트릭, 로그)은 `Asia/Seoul` (KST) 및 **오전 9시 리셋**(Operational Day) 정책을 준수한다. Naive datetime 사용을 엄금한다.

##5. 추가 원칙 
### 5.1 풀스택 최신규칙 우선 원칙
1) 최신/핵심 규칙 우선
모든 도메인별 정책, 코드, 운영 규칙은 learned_ 하위의 최신 learned 문서와 패치 내역을 최우선 SoT로 간주한다.
인덱스(00_INDEX.md)의 0번 섹션(핵심/최신 일관성 체크아웃)에서 각 도메인별 최신 규칙/예외/패치 내역을 반드시 확인한다.
작업/패치 시 원칙

2) 기존 SoT 문서와 learned_ 폴더의 최신 내역이 충돌할 경우 learned_의 내용을 우선 적용한다.
도메인별 learned_ 문서(예: mission/09.mission.md, vault/08.vault.md 등)와 최신 패치(예: 20260127_mission_admin_builder_rules_update.md 등)를 반드시 참고한다.
정책/코드/운영 변경 시, 변경 이력과 최신화 내역을 learned_에 기록하고 인덱스에 반영한다.
문서/코드/운영 일관성

3) 문서, 코드, 운영 정책이 불일치할 경우 learned_의 최신 문서 기준으로 모두 정렬한다.
신규 정책/예외/핫픽스는 learned_에 우선 기록 후, 필요시 표준 SoT 문서로 승격한다.
AI 자동화/코드 생성 시

4) 작업 전 인덱스의 0번 섹션(핵심/최신 일관성 체크아웃)과 각 도메인 learned_ 문서를 반드시 탐색한다.
예외/핫픽스/운영 규칙이 있으면 표준 SoT보다 learned_ 우선 적용.
작업 결과는 learned_에 diff/이유/적용일자를 남긴다.
변경 이력 관리

5) 인덱스 하단의 변경 이력(v2.5 등)에 모든 구조/정책/핵심 규칙 변경을 기록한다.

6) learned_ 문서에 3일 이상의 변경이력이 누적될 경우, 표준 SoT 문서로 승격 검토 후 반영한다.

## 6. 트러블슈팅 프로토콜

### 6.1 증상 정의 (Symptom Abstraction)
"안돼요" 수준의 보고를 금지하고, 반드시 아래 포맷으로 문제를 재정의한다.

| 항목 | 내용 |
|---|---|
| **대상 기능** | 예: 룰렛 게임 실행, 인벤토리 진입 |
| **HTTP Status** | 500 (Server Error) vs 400 (Bad Request) vs 200 (Logic Error) |
| **영향 범위** | 특정 유저(ID=15) vs 전체 유저 |
| **재현 빈도** | 항상 vs 간헐적 |

### 6.2 증거 기반 원인 분석 (Evidence-Based RCA)
**"그럴 것이다"라는 추측을 절대 금지한다.**
반드시 **로그(Log)**와 **DB 제약조건(Constraint)**을 증거로 제시해야 한다.

- **Stack Trace 분석**: `IntegrityError`, `KeyError` 등 정확한 Exception 확인.
- **DB Constraint 확인**:
    - `CHECK` 제약조건 위반 여부 (예: `slot_index BETWEEN 0 AND 5`)
    - `FOREIGN KEY` 위반 여부 (예: `user_id=15` 등)
- **Code Logic**: "코드는 거짓말을 하지 않는다." DB와 코드의 불일치를 찾는다.

### 6.3 풀스택 검증 (Full-Stack Verification)
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

### 6.4 시스템적 해결 (Systemic Fix)
- **Migration 수정**: Alembic 체인이 꼬였다면 중간 파일을 수정해서라도 바로잡는다.
- **기능 폐기(Deprecation)**: 복잡도만 높이고 사용되지 않는 기능(예: 룰렛 Grade)은 과감히 **폐기**하고 문서를 업데이트한다.

### 6.5 디버깅 팁 (Decision Tree)
1. **500 Error** → 백엔드 로그 확인 → DB Constraint/Query 확인.
2. **UI "없음" 표시** → API 응답 JSON 확인 → Pydantic Alias vs Frontend Interface 대조.
3. **로직 불일치** → 소스 코드(`service.py`) vs DB 데이터(`SELECT *`) 대조.

## 7. 변경 이력
- v1.0 (2026-01-18, 관리자): 최초 작성