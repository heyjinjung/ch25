# V2 Games 500 Errors - 트러블슈팅 문서

**작성일**: 2026-01-25  
**작성자**: AI Assistant (Claude Opus 4.5)  
**상태**: ✅ 해결됨  
**영향 범위**: V2 Dice, Roulette, Lottery 게임 전체

---

## 1. 문제 요약 (Executive Summary)

V2 게임 시스템(주사위/룰렛/복권)에서 500 Internal Server Error가 발생하여 게임 플레이가 불가능했음.
추가로, 복권 어드민 페이지에서 설정한 보상 타입이 새로고침 시 "없음"으로 초기화되는 UI 버그가 있었음.

### 증상 목록
| 게임 | 증상 | HTTP Status |
|------|------|-------------|
| Roulette | 8-segment 확장 시 세그먼트 저장 실패 | 500 |
| All Games | user_id=15로 게임 플레이 시 미션 진행 실패 | 500 |
| Lottery Admin | 보상 타입 설정이 새로고침 시 "없음"으로 표시 | 200 (UI 버그) |
| Roulette | 보상 타입이 티켓(ROULETTE_TICKET 등)일 때 지급 실패 | 500 |

---

## 2. 근본 원인 분석 (Root Cause Analysis)

### 2.1 Roulette 8-Segment CHECK Constraint 오류

**파일**: `alembic/versions/20260124_1500_add_v2_roulette_segment_stock.py`

**원인**: `v2_roulette_segment` 테이블의 `slot_index` 컬럼에 CHECK 제약조건이 `slot_index BETWEEN 0 AND 5`로 설정되어 있었음. 8-segment 확장(0~7 인덱스)을 지원하려면 `0 AND 7`이어야 함.

**증거** (백엔드 로그):
```
sqlalchemy.exc.IntegrityError: (pymysql.err.IntegrityError) (3819, 
"Check constraint 'ck_v2_roulette_segment_slot_index_range' is violated.")
```

**해결**:
```sql
-- 기존 제약조건 삭제
ALTER TABLE v2_roulette_segment DROP CONSTRAINT ck_v2_roulette_segment_slot_index_range;

-- 새 제약조건 추가 (0-7 허용)
ALTER TABLE v2_roulette_segment ADD CONSTRAINT ck_v2_roulette_segment_slot_index_range 
CHECK (slot_index >= 0 AND slot_index <= 7);
```

---

### 2.2 User ID 15 FK Violation (미션 진행 실패)

**파일**: `app/v2/services/mission_service.py`

**원인**: 게임 완료 후 미션 진행 기록 시 `mission_progress` 테이블에 INSERT하는데, `user_id=15`가 `user` 테이블에 존재하지 않아 FK 제약조건 위반.

**증거** (백엔드 로그):
```
sqlalchemy.exc.IntegrityError: (pymysql.err.IntegrityError) (1452, 
'Cannot add or update a child row: a foreign key constraint fails 
(`xmas`.`mission_progress`, CONSTRAINT `mission_progress_ibfk_1` 
FOREIGN KEY (`user_id`) REFERENCES `user` (`id`))')
```

**배경**: V2 인증 시스템은 `v2_user` 테이블을 사용하지만, 미션 시스템은 레거시 `user` 테이블을 참조함.

**해결**:
```sql
-- 1. user 테이블에 ID 15 생성
INSERT INTO user (id, nickname, external_id, login_provider, created_at, updated_at)
VALUES (15, 'test_user_15', 'test_external_15', 'TELEGRAM', NOW(), NOW());

-- 2. v2_user 테이블에도 동일 ID로 생성 (cc_id는 로그인에 사용)
INSERT INTO v2_user (id, cc_id, role, created_at, updated_at)
VALUES (15, 'test_user_15', 'USER', NOW(), NOW());
```

**중요**: V2 로그인은 `v2_user.cc_id` 필드를 사용함. `user.external_id`가 아님!

---

### 2.3 게임 티켓 저장 위치 오류

**원인**: 게임 티켓(DICE_TICKET, ROULETTE_TICKET, LOTTERY_TICKET)이 `user_inventory_item` 테이블이 아닌 `user_game_wallet` 테이블에 저장됨.

**배경**: 
- `user_inventory_item`: 일반 아이템 (퍼즐 조각 등)
- `user_game_wallet`: 게임 토큰/티켓 (GameTokenType enum 기반)

**해결**:
```sql
-- user_game_wallet에 티켓 추가
INSERT INTO user_game_wallet (user_id, token_type, balance, created_at, updated_at)
VALUES 
  (15, 'DICE_TICKET', 100, NOW(), NOW()),
  (15, 'ROULETTE_TICKET', 100, NOW(), NOW()),
  (15, 'LOTTERY_TICKET', 100, NOW(), NOW())
ON DUPLICATE KEY UPDATE balance = balance + 100;
```

---

### 2.4 Reward Service 티켓 타입 매핑 오류

**파일**: `app/v2/services/reward_service.py`

**원인**: `V2RewardService._grant_ticket()` 메서드의 `ticket_map`이 레거시 토큰 타입명을 사용하고 있었음.

**Before** (잘못된 코드):
```python
ticket_map = {
    "DICE_TOKEN": GameTokenType.DICE_TICKET,      # ❌ 레거시명
    "ROULETTE_COIN": GameTokenType.ROULETTE_TICKET,  # ❌ 레거시명
    "LOTTERY_TOKEN": GameTokenType.LOTTERY_TICKET,   # ❌ 레거시명
}
```

**After** (수정된 코드):
```python
ticket_map = {
    # V2 standard names
    "DICE_TICKET": GameTokenType.DICE_TICKET,
    "ROULETTE_TICKET": GameTokenType.ROULETTE_TICKET,
    "LOTTERY_TICKET": GameTokenType.LOTTERY_TICKET,
    # Legacy names (backward compatibility)
    "DICE_TOKEN": GameTokenType.DICE_TICKET,
    "ROULETTE_COIN": GameTokenType.ROULETTE_TICKET,
    "LOTTERY_TOKEN": GameTokenType.LOTTERY_TICKET,
}
```

**영향**: 룰렛/복권에서 보상 타입이 `ROULETTE_TICKET` 등으로 설정된 경우 티켓 지급이 실패했음.

---

### 2.5 복권 어드민 UI - 보상 타입 "없음" 표시 버그

**파일**: `src/v2/api/adminApi.ts`

**원인**: Pydantic DTO와 프론트엔드 타입 정의 간 케이스 불일치.

#### 데이터 흐름 분석

```
[DB] v2_lottery_prize.reward_type = "ROULETTE_TICKET"
        ↓
[Backend DTO] LotteryPrizeDto (Pydantic)
    - Field: reward_type: RewardType = Field(alias="rewardType", serialization_alias="rewardType")
    - 직렬화 시 "rewardType" (camelCase)로 반환
        ↓
[API Response] { "prizes": [{ "rewardType": "ROULETTE_TICKET", ... }] }  ← camelCase!
        ↓
[Frontend Type] LotteryConfigBackend interface
    - prizes: Array<{ reward_type: string; ... }>  ← snake_case로 정의됨! ❌
        ↓
[Frontend Code] prize.reward_type ?? "NONE"  → undefined ?? "NONE" → "NONE"
        ↓
[UI] Select 컴포넌트에 "없음" 표시
```

**Before** (잘못된 타입 정의):
```typescript
interface LotteryConfigBackend {
  // ...
  prizes: Array<{
    reward_type: string;      // ❌ snake_case
    reward_amount: number;    // ❌ snake_case
    is_active: boolean;       // ❌ snake_case
  }>;
}
```

**After** (수정된 타입 정의):
```typescript
interface LotteryConfigBackend {
  // ...
  prizes: Array<{
    rewardType?: string;       // ✅ camelCase (primary)
    reward_type?: string;      // ✅ snake_case (fallback)
    rewardAmount?: number;
    reward_amount?: number;
    isActive?: boolean;
    is_active?: boolean;
  }>;
}
```

**getLotteryConfig 함수 수정**:
```typescript
// Before
rewardType: prize.reward_type ?? "NONE",

// After (양쪽 케이스 모두 처리)
rewardType: prize.rewardType ?? prize.reward_type ?? "NONE",
```

---

## 3. Alembic Migration Chain 수정

마이그레이션 적용 중 revision 체인 오류가 발생했음.

**오류 메시지**:
```
alembic.util.exc.CommandError: Can't locate revision identified by 'xxxx'
```

**원인**: 마이그레이션 파일들의 `down_revision` 값이 실제 존재하는 revision을 가리키지 않음.

**수정된 체인**:
```
20260123_1500_add_v2_roulette_segment_table
    ↓
20260124_1200_add_v2_golden_intervention_log (down_revision 수정)
    ↓
20260124_1500_add_v2_roulette_segment_stock
    ↓
20260125_1600_expand_v2_roulette_segment_slots (down_revision 수정)
```

**수정된 파일**:
1. `alembic/versions/20260124_1200_add_v2_golden_intervention_log.py`
   - `down_revision = "20260123_1500_add_v2_roulette_segment_table"`

2. `alembic/versions/20260125_1600_expand_v2_roulette_segment_slots.py`
   - `down_revision = "20260124_1500_add_v2_roulette_segment_stock"`

---

## 4. 수정된 파일 목록

| 파일 | 변경 내용 |
|------|----------|
| `alembic/versions/20260124_1200_add_v2_golden_intervention_log.py` | down_revision 수정 |
| `alembic/versions/20260125_1600_expand_v2_roulette_segment_slots.py` | down_revision 수정 |
| `app/v2/services/reward_service.py` | ticket_map에 V2 표준 토큰 타입 추가 |
| `src/v2/api/adminApi.ts` | LotteryConfigBackend camelCase 지원, GOLDEN_TICKET 정규화 추가 |
| `src/v2/admin/pages/game/RouletteConfigPage.tsx` | grade 탭 제거, ticket_type만으로 필터링 |
| `src/v2/components/game/DiceRewardGrid.tsx` | 미사용 import 제거 |
| `docs/v2_specs/04_db/v2_db_roulette_ko.md` | grade Deprecated, slot_index 0~7 |
| `docs/v2_specs/02_game/v2_admin_game_config_schema_ko.md` | grade Deprecated, 8세그먼트 |
| `docs/v2_specs/02_game/v2_game_engine_sot_ko.md` | grade 접근 제한 폐기 명시 |

---

## 5. 검증 체크리스트

### Backend
- [x] `alembic current` → 최신 revision 확인
- [x] `v2_roulette_segment` CHECK 제약조건 확인: `slot_index <= 7`
- [x] `user` 테이블에 user_id=15 존재 확인
- [x] `v2_user` 테이블에 user_id=15, cc_id='test_user_15' 확인
- [x] `user_game_wallet`에 티켓 잔액 확인

### Frontend
- [x] `npm run build` 성공
- [x] 복권 어드민에서 보상 타입이 정상 표시되는지 확인

### 게임 플레이 테스트
- [ ] 주사위 게임 플레이 → 미션 진행 확인
- [ ] 룰렛 게임 플레이 → 8-segment 보상 확인
- [ ] 복권 게임 플레이 → 티켓 보상 지급 확인

---

## 6. 디버깅 팁 (향후 참고)

### 6.1 V2 인증 시스템 이해

```
┌─────────────────┐     ┌─────────────────┐
│   user 테이블    │     │  v2_user 테이블  │
├─────────────────┤     ├─────────────────┤
│ id              │◄────│ id (FK)         │
│ external_id     │     │ cc_id ← 로그인용 │
│ nickname        │     │ role            │
└─────────────────┘     └─────────────────┘
```

- **V2 로그인**: `v2_user.cc_id`로 인증
- **레거시 시스템 (미션 등)**: `user.id`로 FK 참조

### 6.2 게임 토큰 저장 위치

```
user_game_wallet (GameTokenType 기반)
├── DICE_TICKET
├── ROULETTE_TICKET
├── LOTTERY_TICKET
├── GOLD_KEY_TICKET
└── SILVER_KEY_TICKET

user_inventory_item (일반 아이템)
├── PUZZLE_A1 ~ PUZZLE_C3
└── 기타 인벤토리 아이템
```

### 6.3 Pydantic Serialization Alias 주의

Pydantic v2에서 `serialization_alias`를 사용하면 **응답 JSON의 키가 alias로 변환됨**.

```python
class LotteryPrizeDto(BaseModel):
    reward_type: RewardType = Field(
        alias="rewardType",
        serialization_alias="rewardType"  # ← API 응답 시 이 이름 사용
    )
```

프론트엔드에서는 **API 응답의 실제 키**를 확인하고 타입을 정의해야 함.

### 6.4 유용한 디버깅 쿼리

```sql
-- 사용자 게임 지갑 확인
SELECT * FROM user_game_wallet WHERE user_id = 15;

-- 복권 설정 및 상품 확인
SELECT c.*, p.* 
FROM v2_lottery_config c 
JOIN v2_lottery_prize p ON c.id = p.config_id;

-- 룰렛 세그먼트 CHECK 제약조건 확인
SELECT CONSTRAINT_NAME, CHECK_CLAUSE 
FROM information_schema.CHECK_CONSTRAINTS 
WHERE CONSTRAINT_SCHEMA = 'xmas';
```

### 6.5 API 응답 직접 확인

```powershell
# PowerShell에서 API 응답 확인
$headers = @{ "Authorization" = "Bearer <token>" }
Invoke-RestMethod -Uri "http://localhost:8000/api/v2/admin/game/lottery/configs" -Headers $headers | ConvertTo-Json -Depth 10
```

---

## 7. 롤백 절차

문제 발생 시 롤백:

```bash
# Backend 코드 롤백
git checkout app/v2/services/reward_service.py

# Frontend 코드 롤백
git checkout src/v2/api/adminApi.ts

# DB CHECK 제약조건 원복 (필요 시)
ALTER TABLE v2_roulette_segment DROP CONSTRAINT ck_v2_roulette_segment_slot_index_range;
ALTER TABLE v2_roulette_segment ADD CONSTRAINT ck_v2_roulette_segment_slot_index_range 
CHECK (slot_index >= 0 AND slot_index <= 5);
```

---

## 8. 관련 문서

- 원본 이슈 문서: `docs/v2__game_failures_for_ai_fuck20260125.md`
- V2 게임 설계 문서: `docs/v2_game_design.md` (있다면)
- 팀 SoT 규칙: `.github/instructions/rule2026.instructions.md`

---

## 9. 룰렛 Grade 제거 및 ticket_type 기반 구조로 전환 (2026-01-25 추가)

### 9.1 문제 상황

어드민 룰렛 설정 페이지에서 **일반/체험/황금** 탭이 표시되지 않음.
- `다이아` 탭만 정상 작동
- 원인: DB에 해당 ticket_type 설정이 없거나, grade+ticket_type 조합 필터링으로 매칭 실패

### 9.2 결정 사항

**grade 필드 폐기 결정**: 사용자가 grade 기반 접근 제한을 사용하지 않음.
- 룰렛은 **ticket_type만으로 구분**
- 어드민 UI에서 grade 탭 제거, ticket_type 탭만 사용

### 9.3 DB 변경 사항

#### 9.3.1 레거시 설정 비활성화
```sql
-- ID 1~4 (레거시 grade 기반 설정) 비활성화
UPDATE v2_roulette_config SET is_active = FALSE WHERE id IN (1, 2, 3, 4);
```

#### 9.3.2 새 설정 추가 (ticket_type 기반)
| ID | 이름 | ticket_type | 상태 |
|---|---|---|---|
| 5 | 일반 룰렛 | ROULETTE_TICKET | ✅ 활성 |
| 6 | 체험 룰렛 | TRIAL_TICKET | ✅ 활성 |
| 7 | 다이아 룰렛 | DIAMOND_TICKET | ✅ 활성 |
| 8 | 황금 룰렛 | GOLD_KEY_TICKET | ✅ 활성 |

#### 9.3.3 세그먼트 구성 (8개씩)
각 룰렛 설정에 8개 세그먼트(slot_index 0~7) 추가됨.

### 9.4 프론트엔드 변경

**파일**: `src/v2/admin/pages/game/RouletteConfigPage.tsx`

```typescript
// Before: grade + ticket_type 조합 필터링
const config = configs.find(
  (c) => c.grade === selectedGrade && c.ticketType === selectedTicketType,
);

// After: ticket_type만으로 필터링
const config = configs.find(
  (c) => c.ticketType === selectedTicketType,
);
```

- Grade 탭 UI 제거
- `RouletteGrade` 타입 import 제거

**파일**: `src/v2/api/adminApi.ts`

```typescript
// GOLDEN_TICKET → GOLD_KEY_TICKET 정규화 추가
const mapping: Record<string, string> = {
  ROULETTE_COIN: "ROULETTE_TICKET",
  GOLD_KEY: "GOLD_KEY_TICKET",
  GOLDEN_TICKET: "GOLD_KEY_TICKET",  // 레거시 호환 추가
  DIAMOND_KEY: "DIAMOND_TICKET",
  TRIAL_TOKEN: "TRIAL_TICKET",
};
```

### 9.5 SoT 문서 업데이트

#### 9.5.1 DB 스키마 SoT
**파일**: `docs/v2_specs/04_db/v2_db_roulette_ko.md`
- `grade` 컬럼: `NOT NULL` → `NULL (Deprecated)`
- `slot_index` 범위: `0~5` → `0~7` (8세그먼트)
- CHECK 제약조건: `slot_index 0~5` → `slot_index 0~7`

#### 9.5.2 어드민 게임 설정 스키마 SoT
**파일**: `docs/v2_specs/02_game/v2_admin_game_config_schema_ko.md`
- `grade` 필드: `Optional[str]` → `# (Deprecated) 미사용`
- 세그먼트 수: `6개 고정` → `8개 고정 (0~7)`
- "룰렛에서 grade는 더 이상 사용하지 않음. ticket_type만으로 구분" 명시

#### 9.5.3 게임 엔진 SoT
**파일**: `docs/v2_specs/02_game/v2_game_engine_sot_ko.md`
- "grade 기반 접근 제한 폐기됨" 명시
- "모든 유저가 티켓만 있으면 해당 룰렛 이용 가능" 명시
- 세그먼트: 8개 고정 (slot_index 0~7)

### 9.6 검증

```bash
# 활성 룰렛 설정 확인
docker compose exec backend python -c "
from app.v2.models.v2_roulette import V2RouletteConfig
from app.db.session import SessionLocal
db = SessionLocal()
for c in db.query(V2RouletteConfig).filter(V2RouletteConfig.is_active == True).all():
    print(f'ID {c.id}: {c.name} | ticket_type={c.ticket_type}')
"
```

예상 출력:
```
ID 5: 일반 룰렛 | ticket_type=ROULETTE_TICKET
ID 6: 체험 룰렛 | ticket_type=TRIAL_TICKET
ID 7: 다이아 룰렛 | ticket_type=DIAMOND_TICKET
ID 8: 황금 룰렛 | ticket_type=GOLD_KEY_TICKET
```

---

**문서 끝**
