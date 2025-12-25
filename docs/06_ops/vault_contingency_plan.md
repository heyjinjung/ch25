# Vault Phase 1 컨틴전시 플랜 (Contingency Plan)

금고 시스템 이슈 발생 시 대응을 위한 비상 대응 절차입니다.

## 1. 긴급 중단 (Kill-Switch)

운영 도중 비정상적인 적립이나 장애가 발생할 경우, `.env` 또는 환경 변수를 통해 즉시 기능을 중단할 수 있습니다.

| 기능 | 환경 변수 (Flag) | 기본값 | 비고 |
| :--- | :--- | :--- | :--- |
| **전체 게임 적립 중단** | `ENABLE_VAULT_GAME_EARN_EVENTS` | `true` | 모든 미니게임 플레이 후 금고 적립 중단 |
| **체험 티켓 적립 중단** | `ENABLE_TRIAL_PAYOUT_TO_VAULT` | `true` | 체험 티켓 보상(Diamond Key 등)의 금고 환산 적립 중단 |
| **이벤트 배수 중단** | `VAULT_ACCRUAL_MULTIPLIER_ENABLED` | `false` | 2배 적립 등의 이벤트 배수 강제 종료 (1.0으로 고정) |

## 2. 데이터 롤백 및 정정 (Data Rollback)

### 2.1 적립 로그(VaultEarnEvent) 정합성
- **SQL 트랜잭션 보장**: 모든 적립은 `User` 잔액 변경과 `VaultEarnEvent` 로그 생성이 단일 DB 트랜잭션 내에서 수행됩니다. commit 실패 시 로그와 잔액 변경 모두 롤백되므로 별도의 "부분 로그"는 남지 않습니다.
- **오지급 정정**: 관리자 도구를 통해 유저의 `vault_locked_balance`를 직접 수정하거나, 정정용 `VaultEarnEvent`를 수동으로 삽입하여 밸런싱할 수 있습니다.

## 3. 설정 복구 (Config Reversion)

어드민 API를 통해 설정한 `unlock_rules_json` 또는 `ui_copy_json`이 문제를 일으킬 경우, 이전 하드코딩된 시스템 기본값으로 되돌리는 방법입니다.

### 3.1 시스템 기본값 강제 적용 방법
- **방법 A (API)**: `PUT /api/admin/vault-programs/{key}/unlock-rules` 호출 시 빈 객체 `{}` 또는 `null`을 전달합니다. 서버는 DB 오버라이드가 없으므로 자동으로 시스템 하드코딩 값(서비스 소스코드 내 정의)을 반환합니다.
- **방법 B (DB)**: `vault_program` 테이블에서 해당 레코드의 `unlock_rules_json` 필드를 `NULL`로 업데이트합니다.

## 4. 고정 배수(1.0) 강제 가드
- 기간 종료(`end_kst` 초과) 또는 플래그 `OFF` 시, 시스템은 즉시 `1.0` 배수를 반환하도록 설계되어 있습니다. 
- `AdminAuditLog`를 통해 누가 배수를 활성화/비활성화했는지 추적 가능합니다.
