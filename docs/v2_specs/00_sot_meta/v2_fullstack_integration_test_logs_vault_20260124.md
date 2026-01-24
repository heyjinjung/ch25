문서 타입: 테스트 로그
버전: v1.0
작성일: 2026-01-24
작성자: GitHub Copilot
대상 독자: BE/FE/QA/운영

# V2 Full-Stack Integration Test Logs - Vault (2026-01-24)

## 1. 목적 (Purpose)
Vault 출금 흐름의 V2 라우팅/엔드포인트/DB 반영을 단일 로그로 기록한다.

## 2. 환경 (Environment)
- 날짜: 2026-01-24
- 타임존: KST
- 환경: local

## 3. 검증 범위 (Scope)
- Vault Withdraw: POST /api/v2/vault/withdraw
- Precondition: 관리자 금고 조정, 게임 플레이(earn event) 생성

## 4. 실행 결과 (Results)
| 항목 | 상태 | 증거 | 비고 |
|---|---|---|---|
| Admin Auth | PASS ✅ | [docs/v2_specs/00_sot_meta/artifacts/20260124/api/admin_auth_token_response_v2_vault_mission.json](docs/v2_specs/00_sot_meta/artifacts/20260124/api/admin_auth_token_response_v2_vault_mission.json) | 관리자 토큰 발급 |
| Admin Wallet Adjust | PASS ✅ | [docs/v2_specs/00_sot_meta/artifacts/20260124/api/admin_wallet_adjust_response_v2_vault_mission.json](docs/v2_specs/00_sot_meta/artifacts/20260124/api/admin_wallet_adjust_response_v2_vault_mission.json) | 금고 잔액 조정 |
| Admin Ticket Grant | PASS ✅ | [docs/v2_specs/00_sot_meta/artifacts/20260124/api/admin_ticket_grant_response_v2_vault_mission.json](docs/v2_specs/00_sot_meta/artifacts/20260124/api/admin_ticket_grant_response_v2_vault_mission.json) | DICE_TICKET 지급 |
| Dice Play | PASS ✅ | [docs/v2_specs/00_sot_meta/artifacts/20260124/api/dice_play_response_v2_vault_mission.json](docs/v2_specs/00_sot_meta/artifacts/20260124/api/dice_play_response_v2_vault_mission.json) | GAME_PLAY 이벤트 생성 |
| Vault Withdraw | PASS ✅ | [docs/v2_specs/00_sot_meta/artifacts/20260124/api/vault_withdraw_response_v2.json](docs/v2_specs/00_sot_meta/artifacts/20260124/api/vault_withdraw_response_v2.json) | 출금 요청 성공 |

## 5. 변경 이력
- v1.0 (2026-01-24, GitHub Copilot): Vault PASS 기록
