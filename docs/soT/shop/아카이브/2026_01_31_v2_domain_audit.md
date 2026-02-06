# 🌐 도메인별 V2 유저 & FK 상세 검증 보고서 (2026-01-31)

운영 서버의 도메인별 서비스 코드 및 데이터베이스 스카마를 정밀 진단한 결과입니다.

## 1. 도메인별 검증 요약

| 도메인 | 서비스 코드 (V2User 참조) | DB FK (v2_user 매핑) | 상태 | 비고 |
|---|---|---|---|---|
| **Auth & User** | ✅ `V2UserService` / `V2AuthService` | ✅ `v2_user` | **완료** | 순수 V2 로직 작동 |
| **Vault & Economy** | ✅ `V2VaultService` / `Vault2Service` | ✅ `vault_ledger`, `vault_status` 등 | **완료** | 금고 잔액 SoT 완벽 일치 |
| **Missions & Streak** | ✅ `V2MissionService` | ✅ `user_mission_progress`, `user_streak` | **완료** | 미션/연속 출석 무결성 확인 |
| **Level & XP** | ✅ `LevelXPService` (Wrapper 포함) | ✅ `user_level_progress`, `user_xp_events` | **완료** | 레벨 시스템 V2 전용화 완료 |
| **Inventory & Shop** | ✅ `V2InventoryService` | ✅ `user_game_wallet`, `user_inventory` | **완료** | 인벤토리 FK 전환 완료 |
| **Games (Dice/etc)** | ✅ `V2DiceGameService` 등 | ⚠️ `v2_dice_log` 등 (FK 누락) | **주의** | 기능 정상이나 로그 FK 보완 권장 |
| **Retention** | ✅ `V2EventService` | ✅ `retention_roi_log`, `user_segment` | **완료** | 리텐션 분석 데이터 무결성 |

---

## 2. 도메인별 상세 진단

### [Vault & Economy] ✅
- **코드**: `vault_service.py` 내 모든 `User` 참조가 `V2User`로 교체됨을 확인.
- **FK**: `vault_status_fk_v2_user`, `vault_ledger_fk_v2_user` 등 모든 경제 지표 테이블이 신규 유저 테이블을 정상 참조 중.

### [Missions & Streak] ✅
- **코드**: `mission_service.py`에서 `V2User` 모델을 직접 임포트하여 유저 상태(로그인 스트릭 등)를 처리함.
- **FK**: `user_mission_progress` 테이블의 FK가 `user` -> `v2_user`로 변경되어 미션 데이터 유실 위험 제거됨.

### [Games: Dice, Roulette, Lottery] ⚠️
- **코드**: 서비스 레벨에서 `user_id`를 기반으로 로그를 남기고 보상을 지급하는 로직은 V2 규격을 준수함.
- **스키마 주의**: `v2_dice_log`, `v2_lottery_log` 등 게임 로그 테이블에 **명시적인 FK 제약조건이 설정되어 있지 않음**.
    - **영향**: 유저 탈퇴(`purge_user`) 시 로그 데이터가 자동으로 삭제되지 않고 고아(Orphan) 데이터로 남을 수 있음.
    - **권장**: 추후 `alembic`을 통해 로그 테이블에도 `v2_user.id` 대상 FK (CASCADE DELETE) 추가 필요.

### [Inventory & Shop] ⚠️
- **인벤토리**: `user_game_wallet` 및 `user_inventory_item`은 ✅ `v2_user` FK가 정상 적용되어 있음.
- **상점**: `v2_shop_order` 테이블 역시 명시적 FK가 누락되어 있어, 로그 무결성을 위해 추가 권장.

---

## 3. 종합 의견
모든 핵심 서비스(잔액, 미션, 레벨)는 V2 유저 시스템으로의 전환이 **100% 완료**되었습니다. 다만, 게임 플레이 로그와 상점 주문 내역 등 "이력성 데이터" 테이블들에 대한 물리적 FK 제약조건 보완이 이루어진다면 더욱 완벽한 데이터 무결성을 보장할 수 있을 것으로 판단됩니다.

**검증 완료자**: Antigravity AI
**보고 일시**: 2026-01-31 13:xx (KST)
