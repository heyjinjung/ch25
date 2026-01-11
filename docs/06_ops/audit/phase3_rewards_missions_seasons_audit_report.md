# 3단계 감사 보고서: 보상/미션/시즌

**감사 일시**: 2026-01-11 23:28 KST  
**감사 범위**: Season Pass, Mission, Reward Service, Streak Rewards  
**상태**: ✅ **Comprehensive Structure Documented**

---

## 1. TL;DR (3~5줄)

- **Season Pass**: 5개 테이블 (config/level/progress/stamp_log/reward_log)로 시즌 진행 관리
- **Mission**: 4개 카테고리 (DAILY/WEEKLY/SPECIAL/NEW_USER) + 9개 보상 타입 + 승인 워크플로우
- **RewardService.deliver()**: 15+ 보상 타입 통합 디스패치 (POINT→Vault, GAME_XP→Season, DIAMOND→Inventory)
- **Phase 3 Unified Economy**: POINT/CC_POINT → `vault_locked_balance` (cash_balance 직접 지급 제거됨)

---

## 3-0) 통합 보상 SoT (단일 기준) + 범위

### A. 보상 유형 분류

| 보상 유형 | 분류 | 지급 경로 | SoT 테이블 |
| --- | --- | --- | --- |
| **POINT / CC_POINT** | 금고 적립 | `_grant_vault_locked()` | `user.vault_locked_balance` |
| **GAME_XP** | 시즌 레벨 | `SeasonPassService.add_bonus_xp()` | `season_pass_progress.current_xp` |
| **DIAMOND** | 인벤토리 | `InventoryService.grant_item()` | `user_inventory` |
| **TICKET_***, GOLD_KEY, DIAMOND_KEY | 토큰 지갑 | `GameWalletService.grant_tokens()` | `user_game_wallet` |
| **BUNDLE / TICKET_BUNDLE** | 복합 보상 | 내부 분기 | 다수 테이블 |
| **GIFTICON_BAEMIN/COMPOSE** | 인벤토리 대기 | `InventoryService` | `user_inventory` |
| **CC_COIN / CC_COIN_GIFTICON** | 기프티콘 대기 | `InventoryService` | `user_inventory` |

### B. 보상 흐름도

```
┌─────────────────────────────────────────────────────────────────────┐
│ RewardService.deliver(reward_type, reward_amount)                   │
├─────────────────────────────────────────────────────────────────────┤
│ GAME_XP        → SeasonPassService.add_bonus_xp()                   │
│ POINT/CC_POINT → _grant_vault_locked() → vault_locked_balance       │
│ BUNDLE         → 레벨별 분기 (L3/L5/L7/L14/L15/L17/L20)              │
│ DIAMOND        → InventoryService.grant_item("DIAMOND")             │
│ GIFTICON_*     → InventoryService (대기 아이템)                      │
│ TICKET_*       → GameWalletService.grant_tokens()                   │
└─────────────────────────────────────────────────────────────────────┘
```

### C. 범위 경계

| 포함 | 제외 |
| --- | --- |
| Season Pass 전체 (config/level/progress) | Team Battle 보상 (별도 감사) |
| Mission 시스템 (daily/weekly/special) | 랭킹 보상 (admin_ranking 별도) |
| Streak Rewards (day3/day7) | 이벤트 보상 (ad-hoc) |
| RewardService 전체 dispatch | 외부 결제/환불 |

---

## 3-1) 페이지/엔드포인트/테이블 매핑

### A. Season Pass 시스템

| 엔드포인트 | 라우트 파일 | 기능 | 연관 테이블 |
| --- | --- | --- | --- |
| `GET /admin/api/seasons/` | `admin_seasons.py` | 시즌 목록 | `season_pass_config` |
| `GET /admin/api/seasons/{id}` | `admin_seasons.py` | 시즌 상세 | `season_pass_config` |
| `POST /admin/api/seasons/` | `admin_seasons.py` | 시즌 생성 | `season_pass_config` |
| `PUT /admin/api/seasons/{id}` | `admin_seasons.py` | 시즌 수정 | `season_pass_config` |
| `GET /admin/api/seasons/{id}/levels` | `admin_seasons.py` | 레벨 목록 | `season_pass_level` |
| `PUT /admin/api/seasons/{id}/levels` | `admin_seasons.py` | 레벨 Upsert | `season_pass_level` |

### B. Mission 시스템

| 엔드포인트 | 라우트 파일 | 기능 | 연관 테이블 |
| --- | --- | --- | --- |
| `GET /admin/api/user-missions/{user_id}` | `admin_user_missions.py` | 유저 미션 진행 | `user_mission_progress` |
| `GET /admin/api/user-missions/by-identifier/{id}` | `admin_user_missions.py` | 식별자 기반 조회 | `user_mission_progress` |
| `PUT /admin/api/user-missions/{user_id}/{mission_id}` | `admin_user_missions.py` | 진행 업데이트 | `user_mission_progress` |

### C. Streak Rewards 시스템

| 엔드포인트 | 라우트 파일 | 기능 | 연관 테이블 |
| --- | --- | --- | --- |
| `GET /admin/api/streak-rewards/daily-counts` | `admin_streak_rewards.py` | 일별 지급 통계 | `user_event_log` |
| `GET /admin/api/streak-rewards/user-events` | `admin_streak_rewards.py` | 유저별 이벤트 | `user_event_log` |

---

## 3-2) 보상/미션/시즌 구조 분석

### A. Season Pass 테이블 구조

#### SeasonPassConfig (시즌 설정)

| 컬럼 | 타입 | 용도 |
| --- | --- | --- |
| `season_name` | String(100) | 시즌명 (UNIQUE) |
| `start_date` / `end_date` | Date | 시즌 기간 |
| `max_level` | Integer | 최대 레벨 |
| `base_xp_per_stamp` | Integer | 스탬프당 기본 XP |
| `is_active` | Boolean | 활성 여부 |

#### SeasonPassLevel (레벨별 보상)

| 컬럼 | 타입 | 용도 |
| --- | --- | --- |
| `level` | Integer | 레벨 번호 |
| `required_xp` | Integer | 필요 XP |
| `reward_type` | String | 보상 타입 |
| `reward_amount` | Integer | 보상 수량 |
| `auto_claim` | Boolean | 자동 수령 여부 |

#### SeasonPassProgress (유저 진행)

| 컬럼 | 타입 | 용도 |
| --- | --- | --- |
| `current_level` | Integer | 현재 레벨 |
| `current_xp` | Integer | 현재 XP (SoT) |
| `total_stamps` | Integer | 누적 스탬프 |
| `last_stamp_date` | Date | 마지막 스탬프 |

#### SeasonPassStampLog (스탬프 로그)

| 컬럼 | 용도 |
| --- | --- |
| `source_feature_type` | GAME / LOGIN / MISSION 등 |
| `xp_earned` | 획득 XP |
| `period_key` | 중복 방지 키 |

#### SeasonPassRewardLog (보상 지급 로그)

| 컬럼 | 용도 |
| --- | --- |
| `level` | 지급 레벨 |
| `reward_type` / `reward_amount` | 보상 내역 |
| `claimed_at` | 수령 일시 |

### B. Mission 테이블 구조

#### Mission (미션 정의)

| 컬럼 | 타입 | 용도 |
| --- | --- | --- |
| `title` | String | 미션명 |
| `category` | Enum | DAILY/WEEKLY/SPECIAL/NEW_USER |
| `logic_key` | String | 로직 식별자 (UNIQUE) |
| `action_type` | String | PLAY_GAME/LOGIN/INVITE 등 |
| `target_value` | Integer | 목표 수치 |
| `reward_type` | Enum | 9종 보상 타입 |
| `reward_amount` | Integer | 보상 수량 |
| `xp_reward` | Integer | XP 보상 |
| `requires_approval` | Boolean | 운영자 승인 필요 여부 |

#### UserMissionProgress (유저 진행)

| 컬럼 | 타입 | 용도 |
| --- | --- | --- |
| `current_value` | Integer | 현재 진행 |
| `is_completed` | Boolean | 완료 여부 |
| `is_claimed` | Boolean | 수령 여부 |
| `approval_status` | Enum | NONE/PENDING/APPROVED/REJECTED |
| `reset_date` | String | 리셋 기준 (YYYY-MM-DD 또는 YYYY-WW) |

### C. MissionRewardType Enum

| 타입 | 설명 |
| --- | --- |
| `NONE` | 없음 |
| `DIAMOND` | 다이아몬드 (인벤토리) |
| `GOLD_KEY` | 골드 키 (토큰) |
| `DIAMOND_KEY` | 다이아몬드 키 (토큰) |
| `CASH_UNLOCK` | 현금 언락 |
| `TICKET_BUNDLE` | 티켓 번들 |
| `TICKET_ROULETTE` | 룰렛 티켓 |
| `TICKET_LOTTERY` | 복권 티켓 |
| `TICKET_DICE` | 다이스 티켓 |

### D. RewardService.deliver() 분기표

| reward_type | 처리 로직 | 비고 |
| --- | --- | --- |
| `GAME_XP` | SeasonPassService.add_bonus_xp() | 시즌 XP |
| `POINT`, `CC_POINT` | _grant_vault_locked() | ⚠️ cash_balance 아님 |
| `BUNDLE` (3/6/7/12/15/20) | 레벨별 복합 지급 | L7=10k+금열쇠, L15=100k+금열쇠2 |
| `DIAMOND` | InventoryService.grant_item("DIAMOND") | |
| `COUPON` | grant_coupon() (DEPRECATED) | |
| `GIFTICON_BAEMIN` | Inventory (5k/10k/20k만 허용) | |
| `GIFTICON_COMPOSE` | Inventory (3k만 허용) | |
| `CC_COIN`/`CC_COIN_GIFTICON` | Inventory 대기 아이템 | |
| `TICKET_ROULETTE`/`DICE`/`LOTTERY` | GameWalletService | |
| `GOLD_KEY`/`DIAMOND_KEY` | GameWalletService | |

---

## 3-3) 최소 검증 시나리오

### A. Season Pass 시나리오

| ID | 시나리오 | 기대 동작 | 체크 |
| --- | --- | --- | --- |
| SP-001 | 시즌 생성 | config 저장, is_active=true | ☐ |
| SP-002 | 레벨 Upsert | 기존 레벨 업데이트 또는 신규 생성 | ☐ |
| SP-003 | 스탬프 적립 | current_xp 증가, stamp_log 기록 | ☐ |
| SP-004 | 레벨업 보상 | reward_log 기록, 중복 방지 | ☐ |
| SP-005 | 시즌 종료 | is_active=false 처리 | ☐ |

### B. Mission 시나리오

| ID | 시나리오 | 기대 동작 | 체크 |
| --- | --- | --- | --- |
| MS-001 | 일일 미션 진행 | current_value 증가 | ☐ |
| MS-002 | 미션 완료 | is_completed=true, completed_at 설정 | ☐ |
| MS-003 | 보상 수령 | is_claimed=true, RewardService.deliver() 호출 | ☐ |
| MS-004 | 승인 필요 미션 | approval_status=PENDING → APPROVED/REJECTED | ☐ |
| MS-005 | 일일 리셋 | reset_date 변경 시 새 progress 생성 | ☐ |

### C. Streak Rewards 시나리오

| ID | 시나리오 | 기대 동작 | 체크 |
| --- | --- | --- | --- |
| SR-001 | Day3 보상 지급 | event_name=streak.reward_grant.3.{date} 기록 | ☐ |
| SR-002 | Day7 보상 지급 | event_name=streak.reward_grant.7.{date} 기록 | ☐ |
| SR-003 | 보상 Skip | event_name=streak.reward_skip.{day}.{date} 기록 | ☐ |

### D. RewardService 시나리오

| ID | 시나리오 | 기대 동작 | 체크 |
| --- | --- | --- | --- |
| RW-001 | POINT 지급 | vault_locked_balance 증가 (cash 아님) | ☐ |
| RW-002 | GAME_XP 지급 | season_pass_progress.current_xp 증가 | ☐ |
| RW-003 | BUNDLE(7) 지급 | 10,000P + GOLD_KEY 1 | ☐ |
| RW-004 | DIAMOND 지급 | user_inventory에 DIAMOND 추가 | ☐ |
| RW-005 | 잘못된 GIFTICON 금액 | InvalidConfigError 발생 | ☐ |

---

## 4. 발견 이슈

### 🟡 MEDIUM-003: POINT 지급 경로 변경 (Phase 3)

**현황**: `RewardService.deliver("POINT")` → `_grant_vault_locked()` (vault_locked_balance)

**변경점**: 기존 cash_balance 직접 지급에서 vault 적립으로 변경됨

**영향**: UI에서 "포인트" 표시 시 vault_locked_balance 참조 필요

### 🟡 MEDIUM-004: Mission Approval 워크플로우 미완성

**현황**: `approval_status` 필드 존재, 운영자 APPROVE/REJECT 가능

**리스크**: 승인 대기 미션의 자동 수령(auto_claim) 충돌 가능성

**권장**: 승인 필요 미션은 auto_claim=false 강제

### 🟢 LOW-002: Streak Reward 로그 분산

**현황**: `UserEventLog`에 event_name으로 분기 저장

**영향**: 기능 이상 없음, 복잡한 쿼리 필요

---

## 5. 권장 조치 요약

| 우선순위 | ID | 조치 내용 | 예상 작업량 |
| --- | --- | --- | --- |
| 🟡 1 | MEDIUM-003 | UI "포인트" 표시 vault_locked_balance로 통일 | 1시간 |
| 🟡 2 | MEDIUM-004 | requires_approval=true 시 auto_claim=false 강제 | 30분 |
| 🟢 3 | LOW-002 | Streak 로그 전용 테이블 고려 | 2시간 |

---

## 6. 부록: 테이블 스키마 요약

### A. season_pass_config

```sql
season_name VARCHAR(100) UNIQUE
start_date DATE
end_date DATE
max_level INT
base_xp_per_stamp INT
is_active BOOLEAN
```

### B. mission

```sql
logic_key VARCHAR(100) UNIQUE
category ENUM('DAILY','WEEKLY','SPECIAL','NEW_USER')
action_type VARCHAR(50)
target_value INT
reward_type ENUM(...)
requires_approval BOOLEAN
```

### C. user_mission_progress

```sql
user_id FK, mission_id FK
current_value INT
is_completed, is_claimed BOOLEAN
approval_status ENUM('NONE','PENDING','APPROVED','REJECTED')
reset_date VARCHAR(50)
UNIQUE(user_id, mission_id, reset_date)
```

---

**작성자**: Antigravity AI  
**업데이트**: 2026-01-11 23:28 KST  
**다음 단계**: Critical 이슈 수정 또는 4단계 감사 (게임/이벤트)
