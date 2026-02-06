# Auth Area Learned Context Summary (Integrated Pass 1-3)

- 최종 검토일: 2026-02-06
- 기준: 코드(app/main.py + app/v2/api/*) 우선, learned_ 문서 상호 정렬

## 1. Core Auth Policy (SoT)
- **Pre-Release (DEV)**:
  - `external_id` (cc_id) login enabled for `env in [local, development, dev]`.
  - 비밀번호 기반 로그인은 선택적(기본 미사용)이며, `v2_user.password_hash` 컬럼은 존재.
  - Endpoint(의도): `POST /api/v2/dev/login`.
  - ⚠️ 주의: 현재 코드 기준 `app/v2/api/dev_login.py` 라우터가 `app/v2/api/routes.py`에 include되지 않아, 실제 배포에서는 엔드포인트가 비활성(404)일 수 있음.
- **Post-Release (Prod)**:
  - Telegram Bot `/start` code exchange flow.
  - DEV login MUST be disabled/removed.

## 2. API Contract & Schemas
- **Base URL**: All V2 APIs must use `/api/v2/` prefix.
- **Token Endpoint (V2 SoT)**: `POST /api/v2/auth/token`.
- **Headers**: 
  - Standard: `Authorization: Bearer <token>`.
  - Admin: Requires valid JWT with `ROLE_ADMIN` or specific RBAC tags.
- **JWT Claims**:
  - `sub`, `iat`, `exp` (Standard).
  - `role` (String), `roles` (Array) -> Critical for Admin Middleware verification.
- **System Ops APIs**:
  - `GET /api/v2/today-feature`: Optional Auth. Returns `user_id` if token present.
  - `GET /api/v2/health`: Public.

## 3. DB Schema Integration
- **User Table (`v2_user`)**:
  - `id` (PK, INT)
  - `cc_id` (VARCHAR(100), UNIQUE, NOT NULL): External Identity Key.
  - `nickname` (VARCHAR, NULL): Primary Ops Identifier.
  - `vault_locked_balance` (INT, NOT NULL): **The ONLY allowed Vault SoT** in V2.
  - `telegram_id` (BIGINT, UNIQUE, NULL).
- **Admin Message (`v2_admin_message`)**:
  - `sender_admin_id`: 0 for System.
  - `target_type`: Used for targeting specific user groups.

## 4. Implementation & Integration
- **Admin Ops**:
  - Middleware MUST verify `ROLE_ADMIN`.
  - **Audit Trail**: Any asset modification API (`PUT /users/{id}/assets`) MUST log `admin_id` and `reason`.
- **Global Sync**:
  - Auth state changes (e.g., Ban, Level Up) Redis 이벤트(`golden:v2:feed:user:{id}`)는 도메인 연동 정책(ops/golden)에서 결정(현재 auth SoT의 강제사항은 아님).

## 5. Automation & Ops Checkpoints
- [ ] **Env Check**: Verify `DEV_LOGIN_ENABLED` is `False` in Production.
- [ ] **Role Check**: Test that `/api/v2/admin/*` endpoints return 403 without `ROLE_ADMIN` claim.
- [ ] **Schema Check**:
  - `v2_user.vault_locked_balance` exists and is NOT NULL.
  - `v2_user.cc_id` has UNIQUE constraint.
- [ ] **Audit Check**: Verify Admin asset changes write to `admin_audit_log` (or `log` table per V1 discrepancy).
- [ ] **Reset Time**: Auth-related daily stats (e.g., Login Streak) must reset at **09:00 KST**.

## 6. Critical Implementation Gaps (Identified 2026-01-26, Updated 2026-02-06)
- ✅ **Auth History Logging**: `v2_user_auth_event` 기반 Auth Event 로깅 구현됨.
- 🔴 **Activity Path Mismatch**: BE는 `/api/v2/activity/record`(별칭)만 제공하나, FE(`src/api/activityApi.ts`)는 `/api/activity/record`를 호출 중.
  - 해결 옵션 A(권장): FE를 `/api/v2/activity/record`로 변경
  - 해결 옵션 B: BE에 `/api/activity/record` 별칭 라우터 추가
- ✅ **Config Flag**: `DEV_LOGIN_ENABLED` 플래그는 `app/core/config.py`에 존재.

