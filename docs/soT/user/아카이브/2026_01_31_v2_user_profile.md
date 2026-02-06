# 📋 V2 User & Profile 점검 보고서 (2026-01-31)

## 1. 섹션 2: V2 User & Profile (유저 관리) 검증 결과 ✅

| 항목 | 내용 | 검증 상태 | 근거 및 로그 |
|---|---|---|---|
| **V1 User 분리** | `V2User` 모델 독립성 | ✅ 통과 | `app/v2/models/user.py` 확인 |
| **Unique 제약** | `telegram_id`, `cc_id` 유니크 | ✅ 통과 | DB 제약조건 및 모델 정의 확인 |
| **잔액 SoT** | `vault_locked_balance` 단일화 | ✅ 통과 | `V2User` 잔액 필드 단일화 확인 |
| **Legacy 호환** | `vault_available_balance = 0` | ✅ 통과 | `user_routes.py` 반환값 제거 확인 |
| **유저 마이그레이션** | `get_or_create_v2_user` | ✅ 통과 | `user_service.py` 마이그레이션 로직 로드 |
| **유저 관리 기능** | `delete_user`, `purge_user` | ✅ 통과 | `admin_user_service.py` 구현 확인 |
| **CASCADE 의존성** | 모델 간 관계 정리 | ✅ 통과 | `level_xp.py`, `user.py` 관계 설정 확인 |

---

## 2. 🚨 추가 보고 이슈 분석 및 해결 제안

### A. 입금 후 레벨 XP 미반영
- **현상**: 금고 출금조건 모달에는 입금이 잡히나 XP 가 합산되지 않음.
- **원인**: `V2AdminCCDepositService.upsert_many`에서 `STEP_AMOUNT = 100,000` 상수를 사용함.
    - 현재 10만 포인트당 20 XP를 주도록 고정되어 있어, **10만 미만 소액 입금 시 XP가 적립되지 않는 구조**임.
- **제안**: 소액 입금에도 XP를 비례해서 주거나, 최소 적립 단위를 낮추는 정책 결정 필요.

### B. 주간 CC 입금 미션(0/3) 갱신 실패
- **현상**: 입금 내역이 있음에도 주간 미션 카운트가 올라가지 않음.
- **원인**: `admin_cc_deposit_service.py` 내 입금 처리 로직에서 `mission_service.update_progress` 호출이 누락됨.
- **해결**: `V2AdminCCDepositService.upsert_many` 하단에 미션 진행 트리거 코드 추가 필요.
    ```python
    mission_service = V2MissionService(db)
    mission_service.update_progress(user_id, "CC_DEPOSIT", delta=1)
    ```

### C. 주사위 게임 골든아워 미적용
- **원인 1**: 게임 설정(`v2_dice_config`) 내 `enable_golden_hour` 플래그가 `False`일 가능성.
- **원인 2**: 미션 시스템에서 주사위 플레이 시 공통 `PLAY_GAME`은 트리거되나, `GOLDEN_HOUR_PLAY` 액션 타입이 명시적으로 추가되지 않음.
- **해결**: 어드민에서 주사위 게임의 골든아워 활성화 여부 확인 및 `v2_dice_game_service.py`에서 골든아워 시 추가 액션 트리거 고려.

### D. Sentry Transactions Deprecation 경고
- **내용**: `traces_sample_rate` 대신 신규 필터 사용 권고.
- **해결**: `app/main.py` 내 `sentry_sdk.init` 옵션을 최신 SDK 가이드에 따라 `is_transaction: true` 기반 필터로 업데이트 (운영 지장은 없으나 유지보수 필요).

---

## 3. 에러 트리아지 대응 (2026-01-30/31 기준)
- **Issue 13/14 (컬럼 누락)**: `v2_dice_config.win_probability` 등 누락 컬럼 마이그레이션 완료 확인.
- **Issue 19/20 (Module/FK 에러)**: `v2_user` 오타 수정 및 다중 테이블 FK 마이그레이션이 운영 서버에 성공적으로 반영되어 현재 게임 플레이 및 레벨 조회가 정상화됨.

**검증 완료자**: Antigravity AI
**보고 일시**: 2026-01-31 13:xx (KST)
