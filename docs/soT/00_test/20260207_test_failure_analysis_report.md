# 테스트 실패 분석 보고서

**문서 타입**: 트러블슈팅 분석
**작성일**: 2026-02-07
**상태**: 🔴 **분석 진행중**
**관련**: FK 마이그레이션 (user → v2_user), 모델 Import 이슈

---

## 📊 전체 통계

| 구분 | 개수 | 비율 |
|------|------|------|
| ✅ **통과** | 315개 | 51.6% |
| ❌ **실패** | 166개 | 27.2% |
| 🔴 **에러** | 129개 | 21.1% |
| ⏭️ **스킵** | 1개 | 0.2% |
| **총합** | 611개 | 100% |

---

## 🎯 도메인별 실패 분류

### 📋 요약 맵

| 도메인 | 실패 | 에러 | 총 문제 | 주요 원인 | 우선순위 |
|--------|------|------|---------|----------|----------|
| ⚙️ Ops | 15 | 6 | 21 | 모델 Import 누락 | 🔴 **긴급** |
| 🏦 Vault | 28 | 0 | 28 | FK 참조 문제 | 🔴 **긴급** |
| 🎮 Game | 12 | 2 | 14 | Mission 관련 FK | 🟡 **높음** |
| 👤 User | 8 | 0 | 8 | V2User FK 이슈 | 🟡 **높음** |
| 💰 Economy | 20 | 0 | 20 | Spending/Inventory | 🟡 **높음** |
| 🔐 Auth | 9 | 0 | 9 | Auth Event FK | 🟢 **중간** |
| 🎁 Golden | 6 | 1 | 7 | Intervention/Nudge | 🟢 **중간** |
| 👔 Admin | 17 | 12 | 29 | API 미구현 | 🟢 **중간** |
| 🏆 Team Battle | 4 | 1 | 5 | Team FK 문제 | 🟢 **중간** |
| 📈 Analytics | 2 | 0 | 2 | Ledger 관계 | 🟢 **낮음** |

---

## 🔴 1. Ops 도메인 (21개 문제)

### 1.1 실패 테스트 목록

#### ❌ Import 에러 (6개)
- [ ] `test_golden_daily_nudge.py` - **ModuleNotFoundError**
- [ ] `test_ops_hq_daily_deposit_import.py` - **ModuleNotFoundError**
- [ ] `test_ops_hq_margin_import.py` - **ModuleNotFoundError**
- [ ] `test_ops_paste_import_daily_deposit.py` - **ModuleNotFoundError**
- [ ] `test_ops_status_hq_stats.py` - **ModuleNotFoundError**
- [ ] `test_integrated_game_coverage.py` - **ModuleNotFoundError**

#### ❌ 실행 실패 (15개)
- [ ] `test_spending_ledger_hq_w_source` - Relationship 오류
- [ ] `test_spending_ledger_vault_w_source` - Relationship 오류
- [ ] `test_spending_ledger_shop_u_source` - Relationship 오류
- [ ] `test_spending_ledger_duplicate_transaction_id_prevention`
- [ ] `test_spending_ledger_multiple_sources`
- [ ] `test_paste_import_game_log_creates_records`
- [ ] `test_paste_import_game_log_triggers_analysis`
- [ ] `test_paste_import_game_log_batch_insert`
- [ ] `test_paste_import_game_log_deduplication`
- [ ] `test_health_root_endpoint` - API 404
- [ ] `test_health_endpoints_no_auth_required` - API 404
- [ ] `test_smoke_health_check` - API 404
- [ ] `test_smoke_user_me_endpoint` - API 404
- [ ] `test_smoke_core_routes_response_time` - API 404
- [ ] `test_smoke_all_core_routes` - API 404

### 1.2 원인 분석

#### 🔴 **원인 1: 모델 Import 누락**
```python
# 테스트 파일에서 시도한 import
from app.v2.models.v2_hq_daily_deposit import V2HQDailyDeposit  # ❌ 존재하지 않음
from app.v2.models.v2_golden_daily_nudge import V2GoldenDailyNudge  # ❌ 존재하지 않음
```

**실제 존재하는 모델:**
```python
# app/v2/models/v2_hq_daily_deposit_log.py
class HQDailyDepositLog(Base):  # ✅ 이름이 다름!
    __tablename__ = "hq_daily_deposit_log"
```

#### 🔴 **원인 2: Relationship 설정 오류**
```python
# app/v2/models/v2_spending_ledger.py:61
user = relationship("V2User", back_populates="spending_records")
```

**문제**: `V2User` 모델에 `spending_records` relationship이 없음

### 1.3 SoT 문서 확인

| 문서 | 내용 | 실제 코드 | 상태 |
|------|------|----------|------|
| `2026_02_04_v2_integrated_spending_logic_ko.md` | V2SpendingLedger 정의 | ✅ 구현됨 | 🟢 정합 |
| Line 418 | `user_id = ForeignKey("v2_user.id")` | ✅ 일치 | 🟢 정합 |
| Line 420 | `user = relationship("V2User")` | ❌ back_populates 누락 | 🔴 불일치 |

### 1.4 해결 방안

#### ✅ 즉시 수정 필요
1. **V2User 모델에 relationship 추가**
```python
# app/v2/models/user.py (V2User 클래스 내)
spending_records = relationship("V2SpendingLedger", back_populates="user")
game_logs = relationship("V2GameLog", back_populates="user")
```

2. **테스트 파일의 import 수정**
```python
# 잘못된 import 제거
# from app.v2.models.v2_hq_daily_deposit import V2HQDailyDeposit

# 올바른 import로 교체
from app.v2.models.v2_hq_daily_deposit_log import HQDailyDepositLog
```

---

## 🔴 2. Vault 도메인 (28개 문제)

### 2.1 실패 테스트 목록

#### ❌ Vault Service (15개)
- [ ] `test_vault_sot_locked_only`
- [ ] `test_vault_deposit_increments_locked_balance`
- [ ] `test_vault_info_available_balance_accounts_reserved`
- [ ] `test_get_locked_balance_user_not_found_raises`
- [ ] `test_vault_status_basic`
- [ ] `test_v2_vault_get_locked_balance_user_not_found_raises`
- [ ] `test_v2_vault_deposit_and_withdraw_updates_locked_balance_and_ledger`
- [ ] `test_v2_vault_withdraw_insufficient_raises`
- [ ] `test_v2_vault_deposit_caps_for_suspended_users`
- [ ] `test_v2_vault_is_benefits_suspended_new_user_exempt_unless_manual`
- [ ] `test_v2_vault_consume_locked_for_spend_tracks_daily_reset_kst_9am`
- [ ] `test_vault2_service_is_expiry_enabled`
- [ ] `test_liabilities_sort_and_amount_use_locked_only`
- [ ] `test_get_vault_stats_total_liabilities_equals_total_locked`
- [ ] `test_vault_locked_balance_is_sot`

#### ❌ Vault Policy (13개)
- [ ] `test_deposit_increases_balance`
- [ ] `test_deposit_cap_for_suspended_user`
- [ ] `test_consume_locked_for_spend`
- [ ] `test_new_user_not_suspended`
- [ ] `test_recent_deposit_not_suspended`
- [ ] `test_get_locked_balance`
- [ ] `test_withdrawal_policy_vip`
- [ ] `test_withdrawal_policy_common`
- [ ] `test_withdrawal_policy_new`
- [ ] `test_withdrawal_policy_whale`
- [ ] `test_withdrawal_policy_at_risk`
- [ ] `test_manual_suspension_logic`
- [ ] `test_vault_balance_non_negative`

### 2.2 원인 분석

#### 🔴 **주요 원인: VaultWithdrawalRequest FK 문제**

```python
# 추정: VaultWithdrawalRequest 모델이 여전히 user 테이블 참조
user_id = Column(Integer, ForeignKey("user.id"))  # ❌ 마이그레이션 필요

# 필요한 변경
user_id = Column(Integer, ForeignKey("v2_user.id", ondelete="CASCADE"))  # ✅
```

### 2.3 SoT 문서 확인

| 문서 | 내용 | 코드 확인 필요 |
|------|------|----------------|
| `v2_strict_vault_policy_sot_ko.md` | Vault는 v2_user 참조 | 🟡 검증 필요 |
| `2026_01_31_multi_table_fk_fix.md` Line 58 | `vault_withdrawal_request` FK 수정 대상 | ✅ 마이그레이션 대상 명시됨 |

### 2.4 해결 방안

#### ✅ 확인 및 수정 필요
1. **VaultWithdrawalRequest 모델 확인**
```bash
grep -n "ForeignKey" app/v2/models/*vault*.py
```

2. **FK 마이그레이션 적용**
   - 이미 alembic 마이그레이션이 있다면 재실행
   - 없다면 새로운 마이그레이션 생성

---

## 🟡 3. Game 도메인 (14개 문제)

### 3.1 실패 테스트 목록

#### ❌ Mission 관련 (9개)
- [ ] `test_new_user_within_7_days`
- [ ] `test_new_user_exactly_7_days`
- [ ] `test_old_user_not_new`
- [ ] `test_is_new_user_true`
- [ ] `test_is_new_user_false`
- [ ] `test_new_user_mission_expiration_sot`
- [ ] `test_is_new_user_strict_168h`
- [ ] `test_update_progress_skips_expired_new_user_missions`

#### ❌ Game Service (5개)
- [ ] `test_roulette_get_status_unconfigured_when_no_config`
- [ ] `test_roulette_get_status_fallback_on_invalid_config`
- [ ] `test_roulette_play_happy_path_creates_log_and_consumes_ticket`
- [ ] `test_roulette_play_daily_limit_reached_raises`
- [ ] `test_lottery_play_consumes_ticket_and_decrements_stock`

### 3.2 원인 분석

#### 🔴 **Mission 테이블 FK 이슈**
```python
# app/v2/models/core/mission.py 이미 수정됨
user_id = Column(Integer, ForeignKey("v2_user.id", ondelete="CASCADE"))  # ✅
user = relationship("V2User")  # ✅
```

**문제**: 테스트가 오래된 스키마 기대

### 3.3 SoT 문서 확인

| 문서 | 내용 | 상태 |
|------|------|------|
| `v2_new_user_mission_logic_sot_ko.md` Line 95 | `ForeignKey("v2_user.id")` | ✅ 코드와 일치 |
| `v2_new_user_mission_logic_sot_ko.md` Line 112 | `relationship("V2User")` | ✅ 코드와 일치 |

### 3.4 해결 방안

#### ✅ 테스트 데이터 정리
1. **DB 마이그레이션 재실행**
2. **테스트 fixture 업데이트**

---

## 🟡 4. User 도메인 (8개 문제)

### 4.1 실패 테스트 목록

- [ ] `test_v2_user_has_vault_locked_balance`
- [ ] `test_v2_user_required_fields`
- [ ] `test_v2_user_vault_balance_update`
- [ ] `test_v2_user_cc_id_unique`
- [ ] `test_v2_user_telegram_id_nullable`
- [ ] `test_v2_user_cc_id_unique` (constraint)
- [ ] `test_v2_user_telegram_id_unique`
- [ ] `test_v2_user_segment_pk_user_id_unique`

### 4.2 원인 분석

#### 🟡 **Constraint 테스트 실패**
- DB 마이그레이션이 완료되지 않아 UNIQUE constraint가 적용되지 않음

### 4.3 해결 방안

#### ✅ DB 스키마 동기화
```bash
alembic upgrade head
```

---

## 🟡 5. Economy 도메인 (20개 문제)

### 5.1 실패 테스트 목록

#### ❌ Inventory (12개)
- [ ] `test_grant_item_rejects_non_positive`
- [ ] `test_consume_wallet_insufficient_balance`
- [ ] `test_use_voucher_invalid_type`
- [ ] `test_use_voucher_blocked_when_suspended`
- [ ] `test_vault_routing_point`
- [ ] `test_vault_routing_cc_point`
- [ ] `test_bundle_expansion` (8개 파라미터 케이스)
- [ ] `test_legacy_reward_mapping` (4개)

#### ❌ Shop (4개)
- [ ] `test_purchase_rejects_invalid_cost_type`
- [ ] `test_purchase_rejects_non_positive_cost`
- [ ] `test_purchase_rejects_invalid_reward_amount`
- [ ] `test_purchase_with_diamond_cost`

#### ❌ Reward (4개)
- [ ] `test_deliver_none_is_noop`
- [ ] `test_gifticon_invalid_amount_rejected`
- [ ] `test_deliver_diamond_reward`
- [ ] `test_bundle_reward_amount_7`

### 5.2 원인 분석

#### 🟡 **복합적 원인**
1. V2User FK 참조 문제
2. Inventory Service 로직 변경
3. Bundle 확장 로직 불일치

---

## 🟢 6. Auth 도메인 (9개 문제)

### 6.1 실패 테스트 목록

- [ ] `test_log_auth_event_truncates_user_agent_and_error_message`
- [ ] `test_refresh_access_token_token_not_found`
- [ ] `test_refresh_access_token_token_revoked`
- [ ] `test_refresh_access_token_db_expired_even_if_jwt_valid`
- [ ] `test_refresh_access_token_user_not_found_after_token_checks`
- [ ] `test_revoke_refresh_token_revoke_all`
- [ ] `test_revoke_refresh_token_specific_invalid_token_ignored`
- [ ] `test_get_current_user_id_test_mode_creates_demo_user_when_missing`
- [ ] `test_get_current_user_id_with_token_user_missing_raises`

### 6.2 원인 분석

#### 🟢 **AuthEvent 테이블 FK**
```python
# app/v2/models/auth_event.py 확인 필요
user_id = Column(Integer, ForeignKey("user.id"))  # 🟡 마이그레이션 필요할 수 있음
```

---

## 🟢 7. Golden 도메인 (7개 문제)

### 7.1 실패 테스트 목록

#### ❌ Import 에러 (1개)
- [ ] `test_golden_daily_nudge.py` - **ModuleNotFoundError**

#### ❌ 실행 실패 (6개)
- [ ] `test_golden_circuit_breaker_daily_limit`
- [ ] `test_golden_circuit_breaker_weekly_limit`
- [ ] `test_golden_circuit_breaker_skip_option`
- [ ] `test_golden_circuit_breaker_per_user_limit`
- [ ] `test_golden_intervention_trg_lose_5_detection`
- [ ] `test_golden_intervention_pending_to_sent`

### 7.2 원인 분석

#### 🔴 **Golden Daily Nudge 모델 누락**
```python
# 테스트에서 기대하는 모델
from app.v2.models.v2_golden_daily_nudge import V2GoldenDailyNudge  # ❌ 존재하지 않음
```

**실제**: 해당 모델이 구현되지 않았거나 다른 이름으로 존재

---

## 🟢 8. Admin 도메인 (29개 문제)

### 8.1 실패 테스트 목록

#### ❌ Import/Collection 에러 (12개)
- [ ] `test_admin_game_config_readonly.py` (4개 테스트)
- [ ] 기타 admin 관련 collection 에러

#### ❌ API 404 (17개)
- [ ] 대부분 Admin API 엔드포인트 미구현

### 8.2 원인 분석

#### 🟢 **예상된 실패**
- Admin API 엔드포인트가 아직 구현되지 않음
- 테스트 가드레일에서 404 허용

---

## 🟢 9. Team Battle 도메인 (5개 문제)

### 9.1 실패 테스트 목록

- [ ] `test_ensure_current_season_returns_none_when_missing`
- [ ] `test_log_team_battle_points_skips_when_no_season`
- [ ] `test_log_team_battle_points_writes_score_and_log_when_season_active`
- [ ] `test_add_points_creates_score_row_and_log`
- [ ] `test_team_battle_rankings_alias.py` - **ERROR**

### 9.2 원인 분석

#### 🟡 **Team Battle FK**
```python
# app/v2/models/core/team_battle.py 확인 필요
# SoT 문서에서 충돌 명시됨
# docs/soT/00_game/v2_team_battle_sot_ko.md:48
# 🔴 정책/구현 충돌: team_battle.py는 여전히 ForeignKey("user.id")로 정의
```

---

## 📌 우선순위 액션 플랜

### 🔴 P0: 즉시 수정 (1-2시간)

1. **V2User 모델에 relationship 추가**
```python
# app/v2/models/user.py
class V2User(Base):
    # ... 기존 코드 ...

    # 추가 필요
    spending_records = relationship("V2SpendingLedger", back_populates="user")
    game_logs = relationship("V2GameLog", back_populates="user")
```

2. **테스트 파일 Import 수정**
   - [ ] `test_ops_hq_daily_deposit_import.py`
   - [ ] `test_ops_hq_margin_import.py`
   - [ ] `test_ops_paste_import_daily_deposit.py`
   - [ ] `test_ops_status_hq_stats.py`

### 🟡 P1: 당일 수정 (2-4시간)

3. **Vault FK 확인 및 수정**
   - [ ] VaultWithdrawalRequest
   - [ ] VaultLedger
   - [ ] VaultStatus

4. **Team Battle FK 수정**
   - [ ] TeamBattleMember
   - [ ] TeamBattleScore

### 🟢 P2: 주간 수정 (1-2일)

5. **AuthEvent FK 수정**
6. **누락된 모델 구현 또는 대체**
   - V2GoldenDailyNudge
   - HQDailyDeposit 네이밍 통일

---

## 📊 SoT 문서 vs 코드 매핑 표

| 모델 | SoT 문서 FK | 실제 코드 FK | 상태 | 조치 |
|------|-------------|--------------|------|------|
| V2SpendingLedger | `v2_user.id` | `v2_user.id` | ✅ | relationship 추가 필요 |
| V2GameLog | `v2_user.id` | `v2_user.id` | ✅ | relationship 추가 필요 |
| UserActivity | `v2_user.id` | `v2_user.id` | ✅ | 완료 |
| UserIdentityHistory | `v2_user.id` | `v2_user.id` | ✅ | 완료 |
| Mission (UserMissionProgress) | `v2_user.id` | `v2_user.id` | ✅ | 완료 |
| VaultWithdrawalRequest | `v2_user.id` | `user.id`? | 🔴 | **확인 및 수정 필요** |
| TeamBattleMember | `v2_user.id` | `user.id` | 🔴 | **SoT 충돌 명시됨** |
| AuthEvent | `v2_user.id`? | `user.id`? | 🟡 | 확인 필요 |

---

## 🎯 예상 효과

### 수정 후 예상 테스트 통과율

| 단계 | 조치 | 예상 통과 증가 | 누적 통과율 |
|------|------|----------------|-------------|
| 현재 | - | - | **51.6%** |
| P0 완료 | V2User relationship | +35개 | **57.3%** |
| P1 완료 | Vault/TeamBattle FK | +40개 | **63.9%** |
| P2 완료 | Auth FK + 모델 정리 | +20개 | **67.2%** |
| **목표** | 전체 완료 | - | **70%+** |

---

## 📝 변경 이력

- v1.0 (2026-02-07): 초기 분석 완료
  - 166개 실패 + 129개 에러 분석
  - 도메인별 분류 및 우선순위 설정
  - SoT 문서 매핑 확인

---

## 🔗 관련 문서

- `docs/soT/00_user/아카이브/2026_01_31_multi_table_fk_fix.md` - FK 마이그레이션 가이드
- `docs/soT/00_user/변경로그/v2_new_user_mission_logic_sot_ko.md` - Mission SoT
- `docs/soT/00_user/아카이브/2026_02_04_v2_integrated_spending_logic_ko.md` - Spending Ledger SoT
- `docs/soT/00_game/v2_team_battle_sot_ko.md` - Team Battle SoT (충돌 명시)
