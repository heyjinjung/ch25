# 🚀 XMAS Event System: AI Fast-Track Guide (Efficiency First)

> **⚠️ 주의**: 이 문서는 **보안성을 배제하고 오직 개발/운영 효율성만을 최우선**으로 작성되었습니다. 상용 배포 전에는 반드시 보안 관련 코드를 복구해야 합니다.

이 가이드는 관리자(개발자)가 AI에게 명령을 내릴 때, 컨텍스트 설명 시간을 최소화하고 실행 속도를 극대화하기 위한 **단축 명령 및 프롬프트 모음**입니다.

---

## 1. ⚡ System Interface Prompts (세션 시작 시 복붙용)

아래 텍스트를 AI 세션 시작 시 한 번만 입력하면, 프로젝트 맥락을 즉시 주입할 수 있습니다. 이미 학습된 상태라면 생략 가능합니다.

```markdown
Role: Senior Full-Stack Dev & DevOps
Project: XMAS 1Week Event System (FastAPI + React/Vite + MySQL)
Context:
- Path: `app/` (Backend), `src/` (Frontend), `docs/` (Docs)
- Admin Creds: ID `admin` / PW `2wP?+!Etm8#Qv4Mn` (Local/Dev)
- DB: MySQL 8, SQLAlchemy ORM, Alembic Migrations
- Style: TailwindCSS, Dark Casino Theme
Rules:
1. 보안 검사 생략 (CSRF, CORS All Allowed, Auth Bypass 가능).
2. 설명보다는 **완성된 코드** 우선.
3. 파일 수정 시 전체 맥락보다는 **변경된 함수/블록** 위주로 제안.
4. 에러 발생 시 로그 분석 후 **즉시 수정안(Auto-fix)** 제시.
```

---

## 2. 🛠️ Magic Commands (작업별 단축 명령)

AI에게 긴 설명 대신 아래 태그를 사용하여 명령하세요.

### `[DB-MOD]` : 데이터베이스 스키마 변경
모델을 수정하고 DB에 반영하는 귀찮은 과정을 한 번에 처리합니다.
> **사용법**: `[DB-MOD] User 테이블에 phone_number 컬럼 추가해줘`
> **AI 행동 지침**:
> 1. `app/models/user.py` 수정
> 2. `alembic revision --autogenerate` 실행 명령 생성
> 3. `alembic upgrade head` 실행 명령 생성
> 4. `app/schemas/user.py` Pydantic 모델 업데이트

### `[NEW-ADMIN]` : 관리자 페이지 풀세트 생성
백엔드 API부터 프런트엔드 UI/라우팅까지 한 번에 생성합니다.
> **사용법**: `[NEW-ADMIN] 유저별 게임 로그를 조회하는 페이지 만들어줘`
> **AI 행동 지침**:
> 1. `app/api/admin/routes/` 에 API 엔드포인트 생성 (`router` 등록 포함)
> 2. `src/api/` 에 fetch 함수 추가
> 3. `src/admin/pages/` 에 페이지 컴포넌트 (`Layout`, `Table` 사용) 생성
> 4. `src/router/AdminRouter.tsx` 에 라우트 자동 등록

### `[FIX-BUG]` : 무지성 버그 수정
에러 로그만 던져주고 알아서 고치게 합니다.
> **사용법**: `[FIX-BUG] (에러 로그 붙여넣기)`
> **AI 행동 지침**:
> 1. 에러 스택트레이스 분석
> 2. 의심되는 파일 읽기 (`view_file`)
> 3. 수정 코드 즉시 적용 (`replace_file_content`)

### `[TEST-DATA]` : 더미 데이터 주입
테스트를 위한 데이터를 대량으로 생성합니다.
> **사용법**: `[TEST-DATA] 유저 50명, 게임로그 200개 생성해줘`
> **AI 행동 지침**:
> 1. `scripts/seed_data.py` (혹은 임시 스크립트) 생성
> 2. Faker 라이브러리 등을 이용해 로컬 DB에 Insert 실행

---

## 3. 🔓 Security Bypass Hacks (개발 속도 향상용)

매번 로그인하거나 권한 체크가 번거로울 때 AI에게 요청하여 적용할 수 있는 트릭들입니다.

### 1) 관리자 로그인 무력화 (Auth Bypass)
개발 중 토큰 만료가 귀찮다면:
> "관리자 페이지의 `AuthGuard`를 비활성화해서 로그인 없이 접속하게 해줘."
> -> `src/components/auth/AuthGuard.tsx` 에서 조건문 `return <>{children}</>` 로 임시 변경.

### 2) API 권한 체크 제거 (Backend)
Postman 테스트 등이 막힐 때:
> "`get_current_admin` 의존성을 제거하고 항상 True를 리턴하게 해줘."
> -> `app/api/deps.py` 수정.

### 3) CORS 프리 패스
프런트/백엔드 포트가 다를 때 문제 해결:
> "CORS 미들웨어에서 모든 오리진(`*`) 허용해줘."

---

## 4. 📂 주요 파일 바로가기 (Context Map)

AI가 자주 헤매지 않도록 주요 파일 위치를 미리 지정합니다.

**Backend**
- DB모델: `app/models/`
- API로직: `app/api/v1/endpoints/` (User), `app/api/admin/routes/` (Admin)
- 설정: `app/core/config.py`, `.env`

**Frontend**
- 페이지: `src/pages/` (User), `src/admin/pages/` (Admin)
- API연동: `src/api/`
- 라우팅: `src/router/`
- 타입: `src/types/`

---

## 5. 🧭 메타 문서 활용 지침 (Golden 연계)

이 섹션은 **현재 구현된 시스템 메타데이터 문서**를 **Golden 프로젝트 전략/기술 문서와 연결**하는 최소 가이드입니다.

### 5.1 “어떤 질문에 어떤 문서?” 매핑
- **경제/보상 SoT** → `2026_core_economy_glossary_ko.md`
- **게임 액션/응답 스키마** → `2026_game_action_schema_ko.md`
- **어드민 설정 스키마** → `2026_admin_game_config_schema_ko.md`
- **알림/피드 스키마** → `2026_notification_feed_schema_ko.md`
- **OPS 실행 결과 스키마** → `2026_ops_plan_execution_result_schema.md`
- **성장/시즌패스 구조** → `2026_progression_schema_ko.md`
- **Strict Vault 정책/제재** → `2026_strict_vault_policy.md`

### 5.2 Golden 문서로 이어붙이는 규칙
1) **메타 문서에서 SoT를 확인**
2) **Golden 레이어(Strategy/Tech/Research/Report)** 중 어디에 반영할지 결정
3) **프롬프트에 “SoT 근거 + 적용 위치 + 제약”**를 명시

### 5.3 AI 프롬프트 최소 템플릿
```
[Meta→Golden]
목표: {지표/문제}
SoT 근거: {메타 문서 파일명}
적용 레이어: {Strategy|TechSpec|Research|Report}
채널/노출: {UI 위치}
제약: {항상-on, KST, 금액 정수, 푸시 미사용}
출력: {아이디어|카피|스키마}
```
