# Auth Area Learned Context Summary (Integrated Pass 1-3)

## 1. Core Auth Policy (SoT)
- **Pre-Release (DEV)**:
  - `external_id` (cc_id) login enabled for `env in [local, development, dev]`.
  - Password schema does NOT exist in V2.
  - Endpoint: `POST /api/v2/dev/login`.
- **Post-Release (Prod)**:
  - Telegram Bot `/start` code exchange flow.
  - DEV login MUST be disabled/removed.

## 2. API Contract & Schemas
- **Base URL**: All V2 APIs must use `/api/v2/` prefix.
- **Token Endpoint**: `POST /api/auth/token`.
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
  - Auth state changes (e.g., Ban, Level Up) should trigger Redis events on `golden:v2:feed:user:{id}`.

## 5. Automation & Ops Checkpoints
- [ ] **Env Check**: Verify `DEV_LOGIN_ENABLED` is `False` in Production.
- [ ] **Role Check**: Test that `/api/v2/admin/*` endpoints return 403 without `ROLE_ADMIN` claim.
- [ ] **Schema Check**:
  - `v2_user.vault_locked_balance` exists and is NOT NULL.
  - `v2_user.cc_id` has UNIQUE constraint.
- [ ] **Audit Check**: Verify Admin asset changes write to `admin_audit_log` (or `log` table per V1 discrepancy).
- [ ] **Reset Time**: Auth-related daily stats (e.g., Login Streak) must reset at **09:00 KST**.

## 6. Critical Implementation Gaps (Identified 2026-01-26)
- 🔴 **Auth History Logging**: V2 Auth Service and routes do NOT log login events to `UserEventLog` or any other table, unlike V1.
- 🔴 **Activity Ingestion Mock**: `/api/activity/record` (SoT definition) vs `/activity/ingest` (Code mock) discrepancy. No actual DB persistence for activity logs in V2 yet.

