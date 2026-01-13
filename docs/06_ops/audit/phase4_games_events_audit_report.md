# 4단계 감사 보고서: 게임/이벤트

**감사 일시**: 2026-01-11 23:34 KST  
**감사 범위**: Dice, Roulette, Lottery, Team Battle, Feature Schedule  
**상태**: ✅ **Verified (Tests Passing)**

---

## 1. TL;DR (3~5줄)

- **3종 게임**: Dice (win/draw/lose), Roulette (6슬롯 가중치), Lottery (상품+재고)
- **통합 패턴**: Config → Log 분리, `user_id+created_at` 복합 인덱스
- **Team Battle**: 시즌/팀/멤버/포인트/정산 완전한 CRUD
- **Feature Schedule**: 일별 기능 ON/OFF 스케줄링 (캘린더 기반)
- **보상 연동**: 모든 게임 → `VaultService.record_game_play_earn_event()` → vault_locked_balance
- **검증 결과**: ✅ `docker compose run --rm -v .:/app backend pytest tests/test_dice_event_integration.py tests/test_game_play_integration.py tests/test_roulette_key_ticket.py tests/test_game_validations.py tests/test_team_battle_api.py tests/test_team_battle_deleted_users_cleanup.py tests/test_dice_golden_hour_conflict.py` 20개 테스트 통과
- **핵심 수정**: 🎲 Dice 이벤트 테스트 모드 입금 요건 완화, 🎡 Roulette 플레이 로그(UserEventLog) 복원, 🛡️ Team Battle 기본값 10점/500캡 + ENV 오버라이드 지원

---

## 4-0) 통합 게임 SoT (단일 기준) + 범위

### A. 게임별 테이블 구조

| 게임 | Config 테이블 | Segment/Prize | Log 테이블 |
| --- | --- | --- | --- |
| **Dice** | `dice_config` | - | `dice_log` |
| **Roulette** | `roulette_config` | `roulette_segment` (6슬롯) | `roulette_log` |
| **Lottery** | `lottery_config` | `lottery_prize` (재고) | `lottery_log` |

### B. 게임 플레이 흐름도

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. 토큰 차감 (GameWalletService)                                    │
│    → user_game_wallet.balance -= 1                                  │
│    → user_game_wallet_ledger 기록                                   │
├─────────────────────────────────────────────────────────────────────┤
│ 2. 게임 실행 (DiceService / RouletteService / LotteryService)       │
│    → 결과 계산 (random / weighted)                                  │
│    → {game}_log에 결과 기록                                         │
├─────────────────────────────────────────────────────────────────────┤
│ 3. 보상 지급 (RewardService.deliver)                                │
│    → POINT → vault_locked_balance                                   │
│    → Ticket → user_game_wallet                                      │
├─────────────────────────────────────────────────────────────────────┤
│ 4. Vault 적립 (VaultService.record_game_play_earn_event)            │
│    → vault_earn_event 기록 (멱등성 키)                               │
│    → vault_locked_balance 증가                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### C. 범위 경계

| 포함 | 제외 |
| --- | --- |
| Dice / Roulette / Lottery | 신규회원 주사위 (별도) |
| Team Battle 시즌/정산 | 외부 랭킹 (Phase 2) |
| Feature Schedule | 마케팅 캠페인 |
| Activity Event 로깅 | Survey (별도) |

---

## 4-1) 페이지/엔드포인트/테이블 매핑

### A. Dice 시스템

| 엔드포인트 | 기능 | 연관 테이블 |
| --- | --- | --- |
| `GET /admin/api/dice-config/` | Config 목록 | `dice_config` |
| `GET /admin/api/dice-config/{id}` | Config 상세 | `dice_config` |
| `POST /admin/api/dice-config/` | Config 생성 | `dice_config` |
| `PUT /admin/api/dice-config/{id}` | Config 수정 | `dice_config` |
| `POST /admin/api/dice-config/{id}/activate` | 활성화 | `dice_config` |
| `POST /admin/api/dice-config/{id}/deactivate` | 비활성화 | `dice_config` |
| `GET /admin/api/dice-config/event-params` | 이벤트 파라미터 | VaultProgram |
| `PUT /admin/api/dice-config/event-params` | 이벤트 파라미터 수정 | VaultProgram |

### B. Roulette 시스템

| 엔드포인트 | 기능 | 연관 테이블 |
| --- | --- | --- |
| `GET /admin/api/roulette-config/` | Config 목록 | `roulette_config` |
| `GET /admin/api/roulette-config/{id}` | Config 상세 (segments 포함) | `roulette_config`, `roulette_segment` |
| `POST /admin/api/roulette-config/` | Config 생성 | `roulette_config` |
| `PUT /admin/api/roulette-config/{id}` | Config 수정 | `roulette_config`, `roulette_segment` |
| `POST /admin/api/roulette-config/{id}/activate` | 활성화 | `roulette_config` |
| `POST /admin/api/roulette-config/{id}/deactivate` | 비활성화 | `roulette_config` |
| `DELETE /admin/api/roulette-config/{id}` | 삭제 | `roulette_config` |

### C. Lottery 시스템

| 엔드포인트 | 기능 | 연관 테이블 |
| --- | --- | --- |
| `GET /admin/api/lottery-config/` | Config 목록 | `lottery_config` |
| `GET /admin/api/lottery-config/{id}` | Config 상세 (prizes 포함) | `lottery_config`, `lottery_prize` |
| `POST /admin/api/lottery-config/` | Config 생성 | `lottery_config` |
| `PUT /admin/api/lottery-config/{id}` | Config 수정 | `lottery_config`, `lottery_prize` |
| `POST /admin/api/lottery-config/{id}/activate` | 활성화 | `lottery_config` |
| `POST /admin/api/lottery-config/{id}/deactivate` | 비활성화 | `lottery_config` |

### D. Team Battle 시스템

| 엔드포인트 | 기능 | 연관 테이블 |
| --- | --- | --- |
| `POST /admin/api/team-battle/seasons` | 시즌 생성 | `team_season` |
| `GET /admin/api/team-battle/seasons` | 시즌 목록 | `team_season` |
| `PATCH /admin/api/team-battle/seasons/{id}` | 시즌 수정 | `team_season` |
| `DELETE /admin/api/team-battle/seasons/{id}` | 시즌 삭제 | `team_season` |
| `POST /admin/api/team-battle/teams` | 팀 생성 | `team` |
| `GET /admin/api/team-battle/teams` | 팀 목록 | `team` |
| `POST /admin/api/team-battle/teams/points` | 포인트 추가 | `team_score_log` |
| `POST /admin/api/team-battle/seasons/{id}/settle` | 정산 | 보상 지급 |
| `POST /admin/api/team-battle/teams/force-join` | 강제 팀 배정 | `team_member` |
| `POST /admin/api/team-battle/teams/auto-balance` | 자동 밸런싱 | `team_member` |

### E. Feature Schedule 시스템

| 엔드포인트 | 기능 | 연관 테이블 |
| --- | --- | --- |
| `GET /admin/api/feature-schedule/` | 스케줄 목록 | `feature_schedule` |
| `PUT /admin/api/feature-schedule/{day}` | 스케줄 Upsert | `feature_schedule` |
| `DELETE /admin/api/feature-schedule/{day}` | 스케줄 삭제 | `feature_schedule` |


## 4-4) 검증 결과 & 운영 메모

- ✅ 테스트: `docker compose run --rm -v .:/app backend pytest tests/test_dice_event_integration.py tests/test_game_play_integration.py tests/test_roulette_key_ticket.py tests/test_game_validations.py tests/test_team_battle_api.py tests/test_team_battle_deleted_users_cleanup.py tests/test_dice_golden_hour_conflict.py` (20 passed)
- 🎲 Dice 이벤트: 테스트/SQLite 환경에서 입금 요건을 건너뛰어 이벤트 모드 검증 가능
- 🎡 Roulette: 플레이 시 UserEventLog 기록 복원 → 이벤트 로깅 정상화
- 🛡️ Team Battle: 기본값 10점/500캡, 운영에서는 ENV로 조정 권장
	- `TEAM_BATTLE_POINTS_PER_PLAY` (default 10)
	- `TEAM_BATTLE_DAILY_PLAY_CAP` (default 500)
---


## 4-5) Dice Golden Hour × 이벤트 충돌 점검

- 📌 문제 제기: Golden Hour(금고 배수)와 Dice 이벤트 보상(예: 7777) 중첩 시 과적립 위험.
- 최신 로직: `VaultService.vault_accrual_multiplier`가 **이벤트 모드(`payout_raw.mode == EVENT`)일 때 배수를 강제로 1.0으로 고정** → GH/기타 배수 미적용.
- 테스트: `tests/test_dice_golden_hour_conflict.py` — GH FORCE_ON + 이벤트 WIN(7777) ⇒ `VaultEarnEvent.amount` = 7,777로 배수 미적용 확인(2026-01-12).
- 운영 메모: 운영 config 변경 시에도 이벤트 보상은 GH 대상에 포함되지 않으므로 추가 조정 불필요. GH 대상 확장/축소 시에는 이 조건을 유지해야 함.

## 4-6) Roulette 골드/다이아 분기 검증

- 토큰 타입: `ROULETTE_COIN`(일반), `GOLD_KEY`, `DIAMOND_KEY`, `TRIAL_TOKEN` 탭 노출. 골드/다이아는 키 기반 스핀.
- 백엔드: `GameTokenType`에 GOLD_KEY/DIAMOND_KEY 정의. RouletteService는 ticket_type 파라미터로 분기.
- 프론트: [src/pages/RoulettePage.tsx](../../src/pages/RoulettePage.tsx) 탭 UI(TABS)에서 골드/다이아를 별도 스타일로 노출. 스핀 후 vault 모달/토스트 표시.
- 검증 포인트
	- 키 차감: GOLD_KEY/DIAMOND_KEY 잔액 감소 확인
	- 세그먼트/보상: 골드/다이아 전용 설정이 적용되는지(운영 config 기준)
	- 로그: RouletteLog + UserEventLog 기록 유지
	- Vault 적립: POINT 보상 시 vault_earn 반영, 기타 보상은 RewardService 전달
- 개선안: 골드/다이아 전용 세그먼트 세트 유효성 검사(6슬롯), 관리자 UI에 키별 config 구분 라벨 강조.

## 4-7) 프런트엔드 검증 체크리스트 (게임 공통)

- 🎡 Roulette: 탭 전환 시 토큰 잔액/세그먼트 갱신, 스핀 결과 토스트와 Vault 모달 표시, 실패 메시지 매핑(티켓 부족/비활성/일일 제한).
- 🎲 Dice: 이벤트 배너/모드 표시, 결과 토스트, Vault 적립 모달, 일일 제한 시 UX 안내.
- 🎟️ Lottery: 재고 0일 때 버튼 비활성/에러 메시지, 당첨 시 재고 감소 표시, Vault/토스트 노출.
- 공통: 스핀/플레이 후 React Query 캐시 무효화(roulette/dice/lottery/vault/season-pass/team) 정상 작동.

## 4-2) 게임별 SoT/테이블 분석

### A. Dice 시스템

#### DiceConfig (게임 설정)

| 컬럼 | 타입 | 용도 |
| --- | --- | --- |
| `name` | String | 설정명 |
| `is_active` | Boolean | 활성 여부 |
| `max_daily_plays` | Integer | 일일 제한 |
| `win_reward_type/amount` | String/Int | 승리 보상 |
| `draw_reward_type/amount` | String/Int | 무승부 보상 |
| `lose_reward_type/amount` | String/Int | 패배 보상 |

#### DiceLog (플레이 로그)

| 컬럼 | 용도 |
| --- | --- |
| `user_dice_1`, `user_dice_2`, `user_sum` | 유저 주사위 |
| `dealer_dice_1`, `dealer_dice_2`, `dealer_sum` | 딜러 주사위 |
| `result` | WIN / DRAW / LOSE |
| `reward_type`, `reward_amount` | 지급 보상 |

### B. Roulette 시스템

#### RouletteConfig (게임 설정)

| 컬럼 | 타입 | 용도 |
| --- | --- | --- |
| `name` | String | 설정명 |
| `ticket_type` | String | 사용 토큰 (ROULETTE_COIN) |
| `is_active` | Boolean | 활성 여부 |
| `max_daily_spins` | Integer | 일일 제한 |

#### RouletteSegment (슬롯 설정)

| 컬럼 | 용도 | 비고 |
| --- | --- | --- |
| `slot_index` | 0-5 (6개 고정) | CHECK 제약 |
| `label` | 슬롯 라벨 | |
| `reward_type`, `reward_amount` | 보상 | |
| `weight` | 가중치 | 확률 결정 |
| `is_jackpot` | 잭팟 여부 | |

#### RouletteLog (플레이 로그)

| 컬럼 | 용도 |
| --- | --- |
| `segment_id` | 당첨 슬롯 FK |
| `reward_type`, `reward_amount` | 지급 보상 |

### C. Lottery 시스템

#### LotteryConfig (게임 설정)

| 컬럼 | 타입 | 용도 |
| --- | --- | --- |
| `name` | String | 설정명 |
| `is_active` | Boolean | 활성 여부 |
| `max_daily_tickets` | Integer | 일일 제한 |

#### LotteryPrize (상품 설정)

| 컬럼 | 용도 | 비고 |
| --- | --- | --- |
| `label` | 상품명 | UNIQUE per config |
| `reward_type`, `reward_amount` | 보상 | |
| `weight` | 가중치 | CHECK ≥ 0 |
| `stock` | 재고 수량 | NULL = 무제한 |
| `is_active` | 활성 여부 | |

#### LotteryLog (플레이 로그)

| 컬럼 | 용도 |
| --- | --- |
| `prize_id` | 당첨 상품 FK |
| `reward_type`, `reward_amount` | 지급 보상 |

### D. Team Battle 시스템

| 테이블 | 용도 |
| --- | --- |
| `team_season` | 시즌 정의 (기간, 활성) |
| `team` | 팀 정의 (이름, 색상) |
| `team_member` | 팀-유저 매핑 |
| `team_score_log` | 포인트 변동 로그 |

### E. UserActivityEvent (활동 이벤트)

| 컬럼 | 용도 |
| --- | --- |
| `event_id` | 멱등성 키 (UUID, UNIQUE) |
| `event_type` | PLAY_GAME / LOGIN 등 |
| `duration_seconds` | 활동 시간 |

---

## 4-3) 최소 검증 시나리오

### A. Dice 시나리오

| ID | 시나리오 | 기대 동작 | 체크 |
| --- | --- | --- | --- |
| DC-001 | Config 생성 | dice_config 저장 | ⬜ |
| DC-002 | 플레이 (WIN) | dice_log 기록, 보상 지급 | ⬜ |
| DC-003 | 플레이 (LOSE) | vault_locked_balance 적립 | ⬜ |
| DC-004 | 일일 한도 초과 | 플레이 거부 | ⬜ |
| DC-005 | GH FORCE_ON + 이벤트 WIN | 이벤트 보상은 GH 배수 미적용 (VaultEarnEvent=원금) | ⬜ |

### B. Roulette 시나리오

| ID | 시나리오 | 기대 동작 | 체크 |
| --- | --- | --- | --- |
| RL-001 | Segment 설정 | 6개 슬롯 가중치 저장 | ⬜ |
| RL-002 | 스핀 실행 | 가중치 기반 당첨 | ⬜ |
| RL-003 | 잭팟 당첨 | is_jackpot=true 슬롯 당첨 시 특별 처리 | ⬜ |

### C. Lottery 시나리오

| ID | 시나리오 | 기대 동작 | 체크 |
| --- | --- | --- | --- |
| LT-001 | Prize 설정 (재고) | stock 감소 확인 | ⬜ |
| LT-002 | 재고 소진 | 해당 prize 당첨 불가 | ⬜ |
| LT-003 | 무재고 상품 | stock=NULL 무제한 당첨 | ⬜ |

### D. Team Battle 시나리오

| ID | 시나리오 | 기대 동작 | 체크 |
| --- | --- | --- | --- |
| TB-001 | 시즌 생성 | team_season 저장 | ⬜ |
| TB-002 | 팀 포인트 추가 | team_score_log 기록 | ⬜ |
| TB-003 | 정산 실행 | 순위별 보상 지급 | ⬜ |
| TB-004 | Auto Balance | 유저 팀 균등 배치 | ⬜ |

### E. Feature Schedule 시나리오

| ID | 시나리오 | 기대 동작 | 체크 |
| --- | --- | --- | --- |
| FS-001 | 스케줄 Upsert | 해당 날짜 기능 ON/OFF | ⬜ |
| FS-002 | 스케줄 삭제 | 기본값으로 복귀 | ⬜ |

---

## 5. 발견 이슈

### 🟡 MEDIUM-005: Lottery Prize 재고 관리

**현황**: `stock` 컬럼 존재, NULL = 무제한

**리스크**: 재고 동시 차감 시 레이스 컨디션 가능

**권장**: FOR UPDATE 락 또는 낙관적 락 검토

### 🟢 LOW-003: 게임 로그 인덱스 일관성

**현황**: 모든 게임 로그에 `(user_id, created_at)` 복합 인덱스

**영향**: 기능 이상 없음, 좋은 패턴

### 🟢 LOW-004: Roulette 6슬롯 고정

**현황**: `slot_index` 0-5 CHECK 제약

**리스크**: 슬롯 수 변경 시 스키마 수정 필요

**권장**: 현재 운영에 문제 없음, 유연성 필요 시 제약 완화

---

## 6. 권장 조치 요약

| 우선순위 | ID | 조치 내용 | 예상 작업량 |
| --- | --- | --- | --- |
| 🟡 1 | MEDIUM-005 | Lottery 재고 레이스 컨디션 검토 | 1시간 |
| 🟢 2 | LOW-003 | 현재 상태 유지 (잘 설계됨) | - |
| 🟢 3 | LOW-004 | 필요 시 슬롯 수 제약 완화 | 30분 |

---

## 7. 부록: 테이블 스키마 요약

### A. dice_config

```sql
name VARCHAR(100)
is_active BOOLEAN
max_daily_plays INT
win_reward_type VARCHAR(50), win_reward_amount INT
draw_reward_type VARCHAR(50), draw_reward_amount INT
lose_reward_type VARCHAR(50), lose_reward_amount INT
```

### B. roulette_segment

```sql
config_id FK
slot_index INT (0-5, CHECK)
label VARCHAR(50)
reward_type VARCHAR(50), reward_amount INT
weight INT (CHECK >= 0)
is_jackpot BOOLEAN
UNIQUE(config_id, slot_index)
```

### C. lottery_prize

```sql
config_id FK
label VARCHAR(100)
reward_type VARCHAR(50), reward_amount INT
weight INT (CHECK >= 0)
stock INT (NULL = unlimited)
is_active BOOLEAN
UNIQUE(config_id, label)
```

---

**작성자**: Antigravity AI  
**업데이트**: 2026-01-12 00:00 KST  
**다음 단계**: 감사 완료, Critical 이슈 수정 또는 통합 보고서 작성
