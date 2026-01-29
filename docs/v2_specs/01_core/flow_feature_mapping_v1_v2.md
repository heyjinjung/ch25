# XMAS 지급/보상 시스템 v1→v2 이관 현황 맵핑 (2026-01-29 기준)

> [!IMPORTANT]
> **Full-stack 관찰(End-to-end Observability)** 기반 재검증 문서입니다.
> 모든 항목은 `app.v2` 네임스페이스 동작 및 실제 E2E 증거(로그/DB) 수렴 여부를 기준으로 관리합니다.

---

## 1. 핵심 서비스 및 게임 엔진 검증 현황

| 도메인 | 기능 (내역) | 상태 | 검증 근거 (테스트/로그) | API / DB 필드 |
| :--- | :--- | :---: | :--- | :--- |
| **가입/인증** | 텔레그램 인증 / Refresh Token / Auth Event | ✅ 완료 | **[2026-01-29]** V2 Telegram Auth SoT 구현 완료 <br> - `tests/v2/test_telegram_auth.py` (14개 유닛 테스트 PASSED) <br> - `tests/v2/test_telegram_auth_api.py` (API 통합 테스트) <br> - Hash 검증 (`app/v2/core/telegram.py`) <br> - Refresh Token 슬라이딩 윈도우 (30일/7일 갱신) <br> - Auth Event 로깅 (LOGIN_SUCCESS/FAILED, TOKEN_REFRESH, LOGOUT, RBAC_DENIED) <br> - DB Migration 완료 (`20260128_1800_add_v2_auth_tables.py`) <br> [상세 문서](docs/v2_specs/00_sot_meta/v2_telegram_auth_sot_ko.md) | `/api/v2/telegram/auth` <br> `/api/v2/auth/refresh` <br> `/api/v2/auth/logout` <br> `v2_user`, `v2_user_auth_event`, `v2_user_refresh_token` |
| **게임진행** | 룰렛 / 주사위 / 복권 | ✅ 완료 | **[2026-01-24] verify_game_engine_e2e.py** <br> Roulette/Dice/Lottery **Status 200** 응답 확인 <br> `pytest -q tests/v2_tests/phase3_game/test_game_ledger_separation.py` (원장 분리 검증) <br> [상세 로그](docs/v2_specs/00_sot_meta/v2_verification_test_logs_20260124.md) | `/api/v2/*/play` <br> `v2_roulette`, `v2_dice`, `v2_lottery` |
| **환경/SoT** | Phase 1 환경/SoT 정합성 | ✅ 완료 | `pytest -q tests/v2_tests/phase1_env/test_environment_sanity.py` <br> `pytest -q tests/v2_tests/phase1_env/test_sot_integrity.py` <br> `pytest -q tests/v2_tests/phase1_env/test_v2_architecture_sot.py` <br> /api/v2/health **200 OK** 확인 <br> [상세 로그](docs/v2_specs/00_sot_meta/v2_verification_test_logs_20260124.md) | `/api/v2/health` <br> `alembic_version` |
| **코어경제** | 금고(Vault) & 장부(Ledger) | ✅ 완료 | `pytest -q tests/v2_tests/phase2_core/test_vault2_service.py tests/v2_tests/phase2_core/test_vault_withdrawal_logic.py` <br> `pytest -q tests/v2_tests/phase2_core/test_v2_vault_withdrawal_tiers.py` <br> /api/v2/vault/status **200 OK** 확인 <br> [상세 로그](docs/v2_specs/00_sot_meta/v2_verification_test_logs_20260124.md) | `/api/v2/vault/status` <br> `user`, `v2_user`, `vault_ledger` |
| **상점** | 상품 조회 / 구매 / 교환 | ✅ 완료 | `tests/v2_tests/phase2_core/test_shop_inventory_logic.py` <br> /api/v2/shop/products, /api/v2/shop/purchase **200 OK** <br> [상세 로그](docs/v2_specs/00_sot_meta/v2_verification_test_logs_20260124.md) | `/api/v2/shop/*` <br> `v2_shop_order`, `v2_inventory` |
| **인벤토리** | 아이템 적립 / 사용 / 잔액 | ✅ 완료 | `tests/v2_tests/phase2_core/test_shop_inventory_logic.py` <br> /api/v2/inventory, /api/v2/inventory/use **200 OK** <br> [상세 로그](docs/v2_specs/00_sot_meta/v2_verification_test_logs_20260124.md) | `/api/v2/inventory/*` |
| **팀배틀** | 랭킹 / 보상 / 조회 | ✅ 완료 | `pytest -q tests/v2_tests/phase5_public/test_team_battle_v2_routes_payload.py` <br> `pytest -q tests/v2_tests/phase1_env/test_v2_architecture_sot.py` <br> [상세 로그](docs/v2_specs/00_sot_meta/v2_verification_test_logs_20260124.md) | `/api/v2/team-battle/*` |
| **미션** | 미션 조회 / 보상 클레임 | ✅ 완료 | `tests/v2_tests/phase2_core/test_v2_mission_service.py` <br> /api/v2/mission/, /api/v2/mission/{mission_id}/claim **200 OK** <br> 중복 클레임 `ALREADY_CLAIMED` 차단 확인 <br> [상세 로그](docs/v2_specs/00_sot_meta/v2_verification_test_logs_20260124.md) | `/api/v2/mission/*` <br> `user_mission_progress`, `mission` |
| **AdminOps** | RBAC / Ops Plans / Shop Config | ✅ 완료 | `python tests/v2_tests/phase4_admin/verify_admin_ops_v2.py` <br> Ops Plan 실행, Shop Config 반영, Inventory Grant 검증 완료 <br> [상세 로그](docs/08_changelog/v2_verification_test_logs_20260124_phase4.md) | `/api/v2/admin/*` <br> `user`, `app_ui_config`, `ops_plan*` |
---

## 2. 지급/보상 항목별 세부 상태 (Architectural V2 Only)

| 보상 항목 | 상태 | 백엔드 (v2) | 근거 / 비고 |
| :--- | :---: | :--- | :--- |
| **티켓** | ✅ 완료 | `V2InventoryService` | Roulette/Dice/Lottery 소모 확인 |
| **금고 포인트(POINT/CC_POINT)** | ✅ 완료 | `V2VaultService` | Vault 상태 응답 및 SoT 반영 확인 ([상세 로그](docs/v2_specs/00_sot_meta/v2_verification_test_logs_20260124.md)) |
| **조각** | ✅ 완료 | `V2InventoryService` | 복권 조각 모음 로직 확인, 룰렛 골드키/다이아키 조각모음 로직확인 |
| **미션 보상** | ✅ 완료 | `V2MissionService` | 클레임 시 즉시 지급 확인 |
| **상점 교환** | ✅ 완료 | `V2ShopService` | 상품권/아이템 교환 로직 확인 |
| **레벨업 보상**| ✅ 완료 | `LevelXPService` + `V2LevelRewardTable` | Phase 5 E2E에서 CC Deposit → XP 적립 → 레벨 보상 로그 확인 ([상세 로그](docs/v2_specs/00_sot_meta/v2_verification_test_logs_20260124.md)) |

---

## 3. 재검증 템플릿 안내 (담당자 필독)

각 항목 업데이트 시 아래 포맷을 권장합니다:
1. **상태**: `✅ 완료`, `🟡 진행중`, `❌ 오류`, `⚪ 미확인`
2. **증거**: `docs/v2_specs/00_sot_meta/v2_verification_test_logs_YYYYMMDD.md`에 로그 스니펫 추가 후 링크
3. **Architectural 기준**: V1 import가 완전히 제거되고 `app.v2` 네임스페이스의 서비스/모델만 사용하는지 확인

---

## 4. 특이사항 및 변환값 메모
- **Timezone**: 모든 로그 및 정산 기준은 `Asia/Seoul (KST)`를 따름.
- **Reset Hour**: 일일 초기화 기준 시간은 `09:00 KST` (시스템 설정값 확인 필요).
- **Vault Shim**: 게임 엔진은 `V2VaultService`의 shim을 통해 V1 의존성 없이 안전하게 위임됨.
- **V1 잔재 정리**: V2 라우트/서비스에서 V1 직접 import 제거 작업 반영(2026-01-24).
- **V2 Auth 독립성**: V2 인증 시스템은 순수 V2 구현 (V1 User 테이블 의존성 없음, 2026-01-29).
- **DEV 로그인 보안**: `DEV_LOGIN_ENABLED` 플래그 기본값 `False`로 PROD 안전 (2026-01-29).
- **V2 Access Token**: 기본 만료 시간 15분 (`V2_ACCESS_TOKEN_EXPIRE_MINUTES`, 2026-01-29).

---

## 5. 변경 이력

| 버전 | 일자 | 작성자 | 내용 |
|------|------|--------|------|
| v1.0 | 2026-01-24 | GitHub Copilot | 최초 작성 (게임 엔진 검증 완료) |
| v1.1 | 2026-01-29 | GitHub Copilot | V2 Telegram Auth SoT 구현 완료 반영 |
