문서 타입: 트러블슈팅
주차: W06 (2026-02-03 ~ 2026-02-09)
도메인: GAME
상태: 진행 중 ⏳

# W06 GAME 트러블슈팅 리포트

## 📌 요약 및 통계
| 항목 | 내용 |
|---|---|
| 미해결 이슈 | 0 |
| 해결된 이슈 | 3 |
| SoT 승격 예정 | 1 (V1→V2 토큰 타입 매핑) |

---

## 🔗 연관 문서
- [Troubleshooting 메인 (README)](./README.md)
- [W05 (이전 주차) GAME 리포트](./archive/weekly/W05_GAME_troubleshooting.md)
- [V2 Golden Hour Policy SoT](../07_golden/v2_golden_hour_policy_sot_ko.md)
- [V2 Native Dice Config SoT](../02_game/v2_native_dice_config_ko.md)

---

## 🔍 주간 이슈 내역

### 02-04 - GAME/REWARD: Reward/Season/XP 서비스 V2 네이티브 전환 및 의존성 정리 ✅

**증상 정의**
| 항목 | 내용 |
|---|---|
| 대상 기능 | 보상 지급/시즌 XP/레벨 XP |
| HTTP Status | N/A (리팩토링) |
| 영향 범위 | 보상 지급 전반 |
| 재현 빈도 | 항상(기술부채/의존성) |

**근본 원인 (증거 기반)**
- 레거시 보상 서비스가 V1 모델/경로에 얽혀 있어 V2 네이티브 격리 정책과 충돌 가능성이 있었음.
- 시즌/레벨 XP 등 진행도 서비스가 분산되어 순환참조/기동 이슈 위험이 존재.

**해결 방법**
- V2 전용 보상 서비스로 전환: `app/v2/services/reward_service.py`
- 시즌/레벨 XP 서비스 분리: `season_pass_service.py`, `level_xp_service.py`
- 서비스 export는 lazy import로 순환참조 리스크 완화: `app/v2/services/__init__.py`

**🏷️ 태그**
`P1` `GAME` `REWARD` `XP` `V2_NATIVE` `✅완료`

### [02-03] - GAME/REWARD: V1 토큰 타입이 레벨 보상에 지급되는 문제 ⭐ SoT 승격 예정

**증상 정의**
| 항목 | 내용 |
|---|---|
| 대상 기능 | 레벨업 보상 지급 (v2_level_reward_table) |
| HTTP Status | 200 (Logic Error - 잘못된 토큰 타입 지급) |
| 영향 범위 | 전체 유저 |
| 재현 빈도 | 항상 (레벨업 시) |

**증거 기반 RCA**
- `v2_level_reward_table`에는 V2 토큰 타입(`ROULETTE_TICKET`, `DICE_TICKET`)으로 설정됨
- 하지만 실제 지급 로그에 V1 타입(`DICE_TOKEN`, `ROULETTE_COIN`)이 기록됨
- **근본 원인**: `reward_service.py`의 `ticket_map`과 BUNDLE 처리 로직에서 V1 Enum을 사용

```python
# 문제 코드 (Before)
ticket_map = {
    "ROULETTE_TICKET": GameTokenType.ROULETTE_COIN,  # ← V1 Enum
    "DICE_TICKET": GameTokenType.DICE_TOKEN,          # ← V1 Enum
}
```

**해결 방법**
1. `ticket_map` 매핑을 V2 Enum으로 전환
2. BUNDLE 처리 로직도 V2 Enum 사용

```python
# 수정 코드 (After)
ticket_map = {
    "ROULETTE_TICKET": GameTokenType.ROULETTE_TICKET,  # ← V2 Enum
    "DICE_TICKET": GameTokenType.DICE_TICKET,          # ← V2 Enum
    # V1 호환: V1 입력도 V2 출력으로 변환
    "ROULETTE_COIN": GameTokenType.ROULETTE_TICKET,
    "DICE_TOKEN": GameTokenType.DICE_TICKET,
}
```

**수정 파일**
- `app/services/reward_service.py` (ticket_map, BUNDLE 처리)

**검증 방법**
- `tests/v2/test_reward_v2_token_type.py` 15개 테스트 통과 확인
- 레벨업 보상 지급 후 `user_game_wallet.token_type`이 V2 타입인지 확인

**🏷️ 태그**
`P0` `REWARD` `TOKEN_TYPE` `V1_V2_MIGRATION` `SoT승격예정`

---

### [02-03] - GAME/DATA: 민똘이 V1 토큰 잔액 회수/사용 불가 (긴급 수동 마이그레이션)

**증상 정의**
| 항목 | 내용 |
|---|---|
| 대상 기능 | 어드민 토큰 조정 (wallet/adjust) |
| HTTP Status | 400 (`INSUFFICIENT_TOKEN_BALANCE`) |
| 영향 범위 | 특정 유저 (user_id=10, 민똘이) |
| 재현 빈도 | 항상 |

**증거 기반 RCA**
프로덕션 DB 조회 결과:
```
token_type        | balance
------------------|--------
ROULETTE_COIN     | 9      ← V1 (사용 불가)
DICE_TOKEN        | 11     ← V1 (사용 불가)
ROULETTE_TICKET   | 0      ← V2 (시스템 조회 대상)
DICE_TICKET       | 0      ← V2 (시스템 조회 대상)
```

- 시스템은 V2 타입(`ROULETTE_TICKET`)만 조회
- 유저 잔액은 V1 타입(`ROULETTE_COIN`)에 저장됨
- **결과**: 잔액 9개가 있지만 "잔액 부족" 에러 발생

**해결 방법**
프로덕션 DB 수동 마이그레이션 실행:
```sql
-- V1 → V2 토큰 병합
UPDATE user_game_wallet SET balance = balance + 9, updated_at = NOW() 
  WHERE user_id = 10 AND token_type = 'ROULETTE_TICKET';
UPDATE user_game_wallet SET balance = 0, updated_at = NOW() 
  WHERE user_id = 10 AND token_type = 'ROULETTE_COIN';

UPDATE user_game_wallet SET balance = balance + 11, updated_at = NOW() 
  WHERE user_id = 10 AND token_type = 'DICE_TICKET';
UPDATE user_game_wallet SET balance = 0, updated_at = NOW() 
  WHERE user_id = 10 AND token_type = 'DICE_TOKEN';
```

**검증 결과**
```
token_type        | balance | updated_at
------------------|---------|--------------------
ROULETTE_TICKET   | 9       | 2026-02-03 15:59:17  ✅
DICE_TICKET       | 11      | 2026-02-03 15:59:17  ✅
ROULETTE_COIN     | 0       | 2026-02-03 15:59:17
DICE_TOKEN        | 0       | 2026-02-03 15:59:17
```

**후속 조치 (권장)**
1. 프로덕션 전체 유저 대상 V1→V2 일괄 마이그레이션 검토
2. `GameWalletService`에 V1/V2 호환성 레이어 추가 고려

**🏷️ 태그**
`P0` `PRODUCTION` `DATA_FIX` `V1_V2_MIGRATION` `MANUAL`

---

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
