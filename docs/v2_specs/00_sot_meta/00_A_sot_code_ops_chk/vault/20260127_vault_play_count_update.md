# 2026-01-27 금고 출금 조건 플레이 횟수 집계 및 ID 불일치 수정 리포트

## 1. 현상 분석 및 원인 파악
- **플레이 횟수 누락**: 금고 출금 가이드라인(최근 3일 내 플레이 횟수) 계산 시, 금고 포인트 변동 내역(`VaultEarnEvent`)만 참조함. 이로 인해 0포인트 보상(낙첨, 티켓, XP 등)이 발생한 게임 플레이는 카운팅에서 누락되는 현상이 확인됨.
- **ID 불일치**: `request_withdrawal` API에서 V2 유저 ID를 레거시 `User` 테이블 조회에 직접 사용하여, ID 체계가 다른 유저의 경우 `USER_NOT_FOUND` 오류가 발생하거나 잘못된 유저 정보를 참조함.

## 2. 수정 내역
### [V2VaultService] (`app/v2/services/vault_service.py`)
- **플레이 횟수 집계 로직 고도화**:
  - `get_vault_info` 및 `request_withdrawal`에서 `recent_play_count`를 계산할 때, 단순히 금고 이벤트를 세는 대신 실제 게임 로그 테이블을 전수 조사하도록 변경.
  - 리스트: `v2_dice_log`, `v2_lottery_log`, `v2_roulette_log`, `dice_log`, `lottery_log`, `roulette_log`.
- **ID 정합성 확보**:
  - `request_withdrawal` 시작 시 `V2UserService.ensure_legacy_user_id()`를 호출하여 V2 ID에 매칭되는 정확한 레거시 ID를 획득하도록 수정.

## 3. 검증 결과 (`scripts/verify_vault_fix.py`)
- **ID 불일치 테스트**: V2 ID 1번(레거시 7번) 유저로 출금 요청 시, 기존 404 오류 대신 정상적으로 유저 정보를 불러와 밸런스 및 플레이 조건 체크 단계까지 진입함 (성공).
- **0포인트 플레이 카운팅 테스트**: `v2_dice_log`에 금고 보상이 없는(낙첨) 로그를 강제로 삽입한 후 `get_vault_info`를 호출한 결과, `daily_play_count`가 정상적으로 1 증가함 (성공).

## 4. 기대 효과
- 사용자가 금고 보상을 받지 못한 게임(꽝 등)을 하더라도 출금 조건인 플레이 횟수에 정상 반영되어 사용자 경험 개선.
- ID 불일치로 인한 출금 요청 실패 차단.
