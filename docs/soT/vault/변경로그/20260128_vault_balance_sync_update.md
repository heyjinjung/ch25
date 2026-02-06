# [2026-01-28] V2User 금고 잔액 동기화 누락 수정 및 시나리오 테스트 보강

## 1. 발생 문제
- **상황**: `V1 VaultService`를 브릿지로 사용하는 게임(Dice 등) 플레이 시, 레거시 `User.vault_locked_balance`만 업데이트되고 `V2User.vault_locked_balance`는 갱신되지 않아 데이터 불일치 발생.
- **증상**: 백엔드 시나리오 테스트(`test_dice_play_vault_deduction`)에서 `assert v2_user.vault_locked_balance == test_user.vault_locked_balance` 실패 (10000 != 9900).

## 2. 해결 방법
- **레거시 브릿지 보강**: `app/v2/services/vault_legacy_bridge.py`의 `record_game_play_earn_event` 및 `handle_deposit_increase_signal` 함수 수정.
    - 레거시 서비스 호출 후 리턴된 델타값이 아닌, DB에서 `User` 테이블의 최종 잔액을 조회하여 `V2User`에 절대값으로 동기화하도록 로직 개선.
- **테스트 코드 개선**: `tests/v2_tests/phase5_scenarios/test_v2_backend_scenario.py`의 `test_dice_play_vault_deduction` 테스트 케이스 보강.
    - 서비스 호출 후 `db.flush()` 및 `db.refresh()`를 명시적으로 수행하여 세션 내 유저 객체의 상태가 최신 상태임을 보장.
    - 주사위 결과에 따라 승리/패배 시의 잔액 변동을 모두 검증할 수 있도록 테스트 로직 정교화.

## 3. 관련 파일
- [vault_legacy_bridge.py](file:///c:/Users/JAVIS/ch/ch25/app/v2/services/vault_legacy_bridge.py): 레거시 서비스 호출 후 V2User 테이블 강제 동기화 로직 추가
- [test_v2_backend_scenario.py](file:///c:/Users/JAVIS/ch/ch25/tests/v2_tests/phase5_scenarios/test_v2_backend_scenario.py): V2User 동기화 검증 및 객체 새로고침 로직 추가

## 4. 검증 결과
- `pytest tests/v2_tests/phase5_scenarios/test_v2_backend_scenario.py` 실행 결과 5개 테스트 케이스 모두 **PASSED**.
- 다이스 플레이 시 `User`와 `V2User` 잔액이 동일하게 차감/증액됨을 확인.
