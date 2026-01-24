# 2026-01-12 — Dice 이벤트 모드 GH 배수 미적용

## 요약
- Dice 이벤트 모드 보상(예: 7777)에 Golden Hour 등 금고 배수가 적용되지 않도록 `VaultService.vault_accrual_multiplier`에서 이벤트 모드 시 배수를 1.0으로 고정.
- 회귀 테스트 `tests/test_dice_golden_hour_conflict.py`를 업데이트하여 GH FORCE_ON + 이벤트 WIN 시 `VaultEarnEvent.amount`가 7,777(배수 없음)임을 검증.
- 감사 보고서(phase4_games_events_audit_report.md) 4-5/4-3 섹션을 최신 정책 및 검증 시나리오로 반영.

## 영향
- 운영 설정 변경 없이도 이벤트 보상은 GH 배수에서 제외됨.
- Dice 일반 모드 및 다른 게임의 배수 로직은 변경 없음.

## 테스트
- `docker compose run --rm -v .:/app backend pytest tests/test_dice_golden_hour_conflict.py`
