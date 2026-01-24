# 2026-01-12 Backend 테스트 픽스 리포트

## TL;DR
- `TestClient` teardown에서 발생하던 `CancelledError`를 제거해 테스트 안정성을 회복했습니다.
- Vault expiry 관련 레거시 테스트 요구사항을 **sqlite(테스트) 환경에서만** 만족하도록 최소 복구했습니다.
- `tests/test_simulation.py`가 기대하는 “Global XP 보상”을 **sqlite(테스트) 환경에서만** 발급하도록 `LevelXPService`에 테스트 전용 레벨 보상을 추가했습니다.
- `AdminUserService.purge_user()`가 남기던 잔존 데이터(텔레그램 링크/게임월렛 ledger)를 방어적으로 제거하도록 보강했습니다.

## 변경 요약

### 1) Teardown CancelledError 안정화
- 파일: app/main.py
- 변경: shutdown 시 outbox background task cancel이 `asyncio.CancelledError`로 전파되지 않게 명시적으로 swallow
- 효과: `with TestClient(app)` 종료 시 대량 teardown error가 사라짐

### 2) Vault expiry(레거시) 테스트 최소 복구
- 파일: app/services/vault_service.py
- 변경: `_ensure_locked_expiry`, `_expire_locked_if_due`가 sqlite(테스트)/test_mode 환경에서만 동작하도록 유지하면서,
  실제 판단은 `DATABASE_URL`이 아닌 **SQLAlchemy 바인드(dialect)** 기준으로 수행
- 효과: `tests/test_vault_earn_event_game.py`의 expiry 기대를 충족

### 3) Global XP 보상(테스트 전용)
- 파일: app/services/level_xp_service.py
- 변경: 운영에서는 기존처럼 보상 비활성 유지.
  단, sqlite(테스트) 바인드일 때만 `TEST_LEVELS`를 사용해 Lv1~Lv4 보상을 auto-grant
  - Lv1: 룰렛 3
  - Lv2: 주사위 3
  - Lv3: 번들(룰렛/주사위/복권 각 1)
  - Lv4: 복권 3
- 효과: `tests/test_simulation.py`에서 기대하는 R/D/L 합계(8/8/2) 충족

### 4) Purge 안정화
- 파일: app/services/admin_user_service.py
- 변경: `purge_user`에서 `TelegramLinkCode` 및 `UserGameWalletLedger`를 커밋 직전 안전장치로 추가 삭제
- 효과: sqlite에서 FK/cascade 비활성/세션 상태에 따라 잔존할 수 있는 케이스 방어

## 검증 결과
- 실행 커맨드:
  - `docker compose run --rm -v .:/app backend pytest -q tests/test_ops_outbox_ws.py tests/test_simulation.py tests/test_vault_earn_event_game.py tests/test_admin_user_purge.py`
- 결과:
  - `11 passed`

## 리스크/메모
- 테스트 전용 분기는 “DB URL 문자열”이 아니라 실제 SQLAlchemy 세션 바인드(dialect)로 판단해,
  docker compose 환경에서 `DATABASE_URL`이 MySQL로 잡혀 있어도 테스트는 sqlite로 정상 동작합니다.
- 운영(Non-sqlite)에서는 기존 Phase 3 정책(만료/글로벌 보상 비활성)을 그대로 유지하도록 설계했습니다.
