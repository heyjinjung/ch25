문서 타입: 트러블슈팅
주차: W06 (2026-02-03 ~ 2026-02-09)
도메인: GAME
상태: 진행 중 ⏳

# W06 GAME 트러블슈팅 리포트

## 📌 요약 및 통계
| 항목 | 내용 |
|---|---|
| 미해결 이슈 | 0 |
| 해결된 이슈 | 0 |
| SoT 승격 예정 | 0 |

---

## 🔗 연관 문서
- [Troubleshooting 메인 (README)](./README.md)
- [W05 (이전 주차) GAME 리포트](./archive/weekly/W05_GAME_troubleshooting.md)
- [V2 Golden Hour Policy SoT](../07_golden/v2_golden_hour_policy_sot_ko.md)
- [V2 Native Dice Config SoT](../02_game/v2_native_dice_config_ko.md)

---

## 🔍 주간 이슈 내역

### 02-02 - GAME/VAULT: 주사위 패배 금고 차감 미반영 (테스트 실패)

**증상 정의**
| 항목 | 내용 |
|---|---|
| 대상 기능 | V2 주사위 플레이 금고 차감 |
| HTTP Status | 200 (Logic Error) |
| 영향 범위 | 테스트 시나리오(phase5) |
| 재현 빈도 | 항상 |

**근본 원인 (증거 기반)**
- `record_game_play_earn_event`에서 V2User만 갱신되고 레거시 User 동기화가 누락됨.
- 테스트가 레거시 User 기준으로 검증하여 차감 미반영으로 판정.
- 관련 코드: [app/services/vault_service.py](../../app/services/vault_service.py)

**해결 방법**
- 게임 적립/차감 시 `User.vault_locked_balance`를 V2User와 동기화.

**검증 방법**
- `tests/v2_tests/phase5_scenarios/test_v2_backend_scenario.py` 재실행 통과 확인.

---

## 📝 관리 가이드
- 룰렛, 다이스, 복권 당첨 및 골든아워 적용 여부 확인
