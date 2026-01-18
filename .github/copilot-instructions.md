# Copilot Instructions (XMAS Event System)

## 큰 구조
- 백엔드: FastAPI 앱은 [app/](app/)에 위치. 미션/스트릭, 금고, 게임, 어드민 도메인이 분리되어 있음. 설정은 [app/core/config.py](app/core/config.py).
- 프론트: React + Vite + TS는 [src/](src/)에 위치. 상태는 Zustand, 데이터는 React Query, UI는 Tailwind. 어드민은 [src/admin/](src/admin/).
- 문서 SoT: 규칙/정책은 [docs/](docs/)가 우선이며 인덱스는 [docs/00_meta/INDEX.md](docs/00_meta/INDEX.md).

## 핵심 데이터/도메인 규칙
- 금고 SoT는 `user.vault_locked_balance`이며 신규 보상은 `cash_balance`로 쓰지 않는다.
- 스트릭 보상은 수동 Claim이며 `claimable_day` 기준으로 UI 버튼이 동작한다.
- 주사위/룰렛/복권 보상은 관리자 설정값을 그대로 적용하고 하드코딩 금지.

## 중요한 파일 위치 예시
- 미션/스트릭: [app/services/mission_service.py](app/services/mission_service.py), [app/api/routes/mission.py](app/api/routes/mission.py), 테스트는 [tests/test_streak_event_spec_midnight.py](tests/test_streak_event_spec_midnight.py)
- 금고/토큰: [app/services/game_wallet_service.py](app/services/game_wallet_service.py), [app/models/game_wallet.py](app/models/game_wallet.py), 어드민 페이지는 [src/admin/pages/](src/admin/pages/)
- 유저 퍼지: [app/api/admin/routes/admin_users.py](app/api/admin/routes/admin_users.py)에서 `AdminUserService.purge_user()` 호출, optional 테이블 가드 필요
- 텔레그램 링크/해제: [app/api/routes/telegram.py](app/api/routes/telegram.py)

## 실행/검증 워크플로
- 백엔드 로컬: .env.local → .env 복사, MySQL 실행, alembic upgrade head, uvicorn app.main:app --reload --port 8000
- 프론트 로컬: npm install, npm run dev -- --host --port 5173, 필요 시 .env.development에서 VITE_API_URL 설정
- 테스트: pytest -q, 스트릭 회귀는 pytest -q tests/test_streak_event_spec_midnight.py
- 유틸 스크립트: [scripts/debug_daily_login_gift.py](scripts/debug_daily_login_gift.py), [scripts/debug_streak_reward_claim.py](scripts/debug_streak_reward_claim.py), [scripts/migrate_cash_balance_to_vault_locked.py](scripts/migrate_cash_balance_to_vault_locked.py)

## 작업 관례
- 문서/정책 변경 전 SoT를 확인하고 최소 diff로만 패치한다.
- purge/maintenance는 optional 테이블 존재 여부를 확인하고 순서(ledger → inventory/wallet → level_xp/segment → vault_status → user)를 유지한다.
- 어드민 파일은 덮어쓰기 금지, 필요한 부분만 최소 수정한다.

## 응답/운영 모드
- 작업 응답은 PLAN → PATCH → VERIFY → SHIP 순서를 따른다.
- 상세 운영 규칙은 [.github/instructions/rule2026.instructions.md](.github/instructions/rule2026.instructions.md)를 따른다.
