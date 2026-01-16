# Changelog: Vault Withdrawal Logic Update (Phase 2 Strict Rules)

- **Date**: 2026-01-16
- **Author**: GitHub Copilot (on behalf of JAVIS)
- **Status**: Applied & Verified

## 1. Overview
금고 출금(환전) 신청 시 "어뷰징 방지" 및 "실사용 유도"를 위해 출금 조건을 대폭 강화했습니다. UI에서의 안내뿐만 아니라 백엔드 API 레벨에서 강력한 검증 로직이 추가되었습니다.

## 2. Changes

### Backend (`app/services/vault_service.py`)
- `request_withdrawal` 메서드에 다음 3가지 필수 조건을 추가했습니다 (기존 1만원 최소 금액 조건 유지).
    1. **게임 30회 이상 플레이**: 최근 3일(72시간) 이내 `VaultEarnEvent` (type=GAME_PLAY) 카운트 30회 이상.
    2. **당일 금고 사용 1만원 이상**: 오늘 00:00 이후 `VaultLedger` 음수 변동액 합계 10,000원 이상.
    3. **당일 입금 이력**: `UserActivity.last_charge_at`이 오늘 날짜여야 함.

### Frontend (`src/components/vault/VaultMainPanel.tsx`, `src/utils/vaultUtils.ts`)
- `parseVaultUnlockRules` 유틸리티 함수 업데이트:
    - 룰렛/출석 등 레거시 텍스트 대신, 확정된 4가지 조건을 명시.
- `VaultMainPanel` 연동:
    - 서버 에러 메시지(`MIN_PLAY_COUNT_30_REQUIRED` 등)에 대응하는 사용자지향 메시지 처리 로직은 기존 `vaultUtils.ts` 포맷을 따름.

### Tests (`tests/test_vault_withdrawal_rules_2026.py`)
- **Coverage**:
    - 입금 이력 없음 / 날짜 지남 → 실패 검증
    - 게임 횟수 29회 → 실패 검증
    - 사용 금액 5000원 → 실패 검증
    - 모든 조건 충족 → 성공 검증
- **Configuration**:
    - `pytest.ini`: Pydantic V2 관련 Deprecation Warning을 무시하도록 필터 설정 추가 (`ignore::pydantic.warnings.PydanticDeprecatedSince20`).

## 3. Impact & Risk
- **Risk**: 기존에 출금 가능했던 라이트 유저들이 출금을 못 하게 될 수 있음 (기획 의도).
- **Follow-up**: 운영팀에 해당 조건 변경 사항 전파 필요 ("왜 출금 안되나요?" CS 대비).
