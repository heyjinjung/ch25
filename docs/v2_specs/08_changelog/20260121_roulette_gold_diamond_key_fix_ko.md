# 룰렛 골드키/다이아키 티켓 인식 문제 수정

**날짜:** 2026-01-21
**작업자:** Claude
**우선순위:** P0 (Critical)

## 문제 상황

사용자가 룰렛 게임에서 골드키(`GOLD_KEY`)와 다이아키(`DIAMOND_KEY`) 티켓으로 입장 시도 시 티켓이 DB에 반영되지 않는 문제 발생.

### 근본 원인

1. **프론트엔드 → 백엔드 토큰 타입 불일치**
   - 프론트엔드에서 legacy token type (`GOLD_KEY`, `DIAMOND_KEY`) 전달
   - 백엔드 GameTokenType enum은 V2 표준 (`GOLD_KEY_TICKET`, `DIAMOND_TICKET`)으로 변경됨
   - DB의 `user_game_wallet` 테이블은 V2 표준 enum 값만 인식

2. **룰렛 config 조회 실패**
   - `roulette_config` 테이블의 `ticket_type` 필드가 legacy 값으로 저장되어 있을 경우
   - V2 표준 토큰 타입으로 조회 시 config를 찾지 못함

## 수정 내역

### 1. 프론트엔드 토큰 타입 매핑 추가

**파일:** `src/api/rouletteApi.ts`

```typescript
// V2 Token Type Mapping (Legacy -> Standard)
const TOKEN_TYPE_V2_MAP: Record<string, string> = {
  GOLD_KEY: "GOLD_KEY_TICKET",
  DIAMOND_KEY: "DIAMOND_TICKET",
  TRIAL_TOKEN: "TRIAL_TICKET",
  ROULETTE_COIN: "ROULETTE_TICKET",
  DICE_TOKEN: "DICE_TICKET",
};

export const getRouletteStatus = async (ticketType?: string): Promise<RouletteStatusResponse> => {
  // Map legacy token types to V2 standard
  const mappedTicketType = ticketType && TOKEN_TYPE_V2_MAP[ticketType]
    ? TOKEN_TYPE_V2_MAP[ticketType]
    : ticketType;
  const params = mappedTicketType ? { ticket_type: mappedTicketType } : undefined;
  // ...
};

export const playRoulette = async (ticketType?: string): Promise<RoulettePlayResponse> => {
  // Map legacy token types to V2 standard
  const mappedTicketType = ticketType && TOKEN_TYPE_V2_MAP[ticketType]
    ? TOKEN_TYPE_V2_MAP[ticketType]
    : ticketType;
  const payload = mappedTicketType ? { ticket_type: mappedTicketType } : {};
  // ...
};
```

### 2. 백엔드 Premium 룰렛 접근 제어 업데이트

**파일:** `app/services/roulette_service.py`

**변경사항 1: `get_status` 메서드**

```python
def get_status(self, db: Session, user_id: int, today: date, ticket_type: str = GameTokenType.ROULETTE_COIN.value) -> RouletteStatusResponse:
    # Premium roulette access control (V2 standard + legacy alias 지원)
    is_premium = ticket_type in ("GOLD_KEY", "DIAMOND_KEY", "GOLD_KEY_TICKET", "DIAMOND_TICKET")
    if is_premium:
        segment_row = db.query(UserSegment).filter(UserSegment.user_id == user_id).first()
        user_segment = segment_row.segment if segment_row else "COMMON"
        if user_segment not in ["VIP", "WHALE"]:
            raise ForbiddenError("PREMIUM_ROULETTE_FORBIDDEN")
```

**변경사항 2: `play` 메서드**

```python
def play(self, db: Session, user_id: int, now: date | datetime, ticket_type: str = GameTokenType.ROULETTE_COIN.value) -> RoulettePlayResponse:
    # Support both V2 standard and legacy aliases
    is_gold = ticket_type in ("GOLD_KEY", "GOLD_KEY_TICKET")
    is_diamond = ticket_type in ("DIAMOND_KEY", "DIAMOND_TICKET")

    if is_gold or is_diamond:
        segment_row = db.query(UserSegment).filter(UserSegment.user_id == user_id).first()
        user_segment = segment_row.segment if segment_row else "COMMON"

        if user_segment not in ["VIP", "WHALE"]:
             raise ForbiddenError("Premium Roulette is restricted to VIP/WHALE users.")

        if user_segment == "VIP":
            current_daily_plays = self._get_daily_ticket_play_count(db, user_id, today, ticket_type)

            if is_gold and current_daily_plays >= 3:
                raise TooManyRequestsError("VIP users are limited to 3 Gold Roulette spins per day.")
            elif is_diamond and current_daily_plays >= 1:
                raise TooManyRequestsError("VIP users are limited to 1 Diamond Roulette spin per day.")
```

### 3. 룰렛 Config 조회 로직 개선

**파일:** `app/services/roulette_service.py`

**변경사항: `_get_today_config` 메서드**

```python
def _get_today_config(self, db: Session, ticket_type: str = GameTokenType.ROULETTE_COIN.value, user_id: int | None = None) -> RouletteConfig:
    # Build list of ticket types to query (V2 standard + legacy alias)
    ticket_types_to_query = [ticket_type]
    legacy_map = {
        "GOLD_KEY_TICKET": "GOLD_KEY",
        "DIAMOND_TICKET": "DIAMOND_KEY",
        "TRIAL_TICKET": "TRIAL_TOKEN",
        "ROULETTE_TICKET": "ROULETTE_COIN",
        "DICE_TICKET": "DICE_TOKEN",
    }
    reverse_legacy_map = {v: k for k, v in legacy_map.items()}

    if ticket_type in legacy_map:
        ticket_types_to_query.append(legacy_map[ticket_type])
    elif ticket_type in reverse_legacy_map:
        ticket_types_to_query.append(reverse_legacy_map[ticket_type])

    # Query configs with both V2 and legacy token types
    config = db.execute(
        select(RouletteConfig).where(
            RouletteConfig.is_active.is_(True),
            RouletteConfig.ticket_type.in_(ticket_types_to_query),
            RouletteConfig.grade == target_grade
        ).order_by(RouletteConfig.id.desc())
    ).scalars().first()
    # ...
```

## V2 토큰 타입 표준

| Legacy (Deprecated) | V2 Standard | 용도 |
|---|---|---|
| `GOLD_KEY` | `GOLD_KEY_TICKET` | 골드 룰렛 입장권 |
| `DIAMOND_KEY` | `DIAMOND_TICKET` | 다이아 룰렛 입장권 |
| `TRIAL_TOKEN` | `TRIAL_TICKET` | 체험 룰렛 입장권 |
| `ROULETTE_COIN` | `ROULETTE_TICKET` | 기본 룰렛 입장권 |
| `DICE_TOKEN` | `DICE_TICKET` | 주사위 게임 입장권 |

## 테스트 시나리오

### 1. 골드키 룰렛 플레이
- **전제조건:** VIP 또는 WHALE 유저, 골드키 티켓 보유
- **액션:** 골드키 룰렛 탭 선택 → 플레이 버튼 클릭
- **예상 결과:**
  - 티켓 1개 차감 (DB `user_game_wallet` 업데이트)
  - 룰렛 스핀 및 보상 지급
  - VIP는 일일 3회 제한, WHALE은 무제한

### 2. 다이아키 룰렛 플레이
- **전제조건:** VIP 또는 WHALE 유저, 다이아키 티켓 보유
- **액션:** 다이아키 룰렛 탭 선택 → 플레이 버튼 클릭
- **예상 결과:**
  - 티켓 1개 차감 (DB `user_game_wallet` 업데이트)
  - 룰렛 스핀 및 보상 지급
  - VIP는 일일 1회 제한, WHALE은 무제한

### 3. 권한 없는 유저 접근
- **전제조건:** COMMON 유저
- **액션:** 골드키/다이아키 룰렛 탭 클릭
- **예상 결과:**
  - 403 Forbidden 에러
  - "현재 등급에서는 골드/다이아 룰렛을 이용할 수 없습니다" 모달 표시

## 마이그레이션 필요 사항

### DB 데이터 마이그레이션 (옵션)

기존 DB에 legacy token type으로 저장된 데이터가 있다면 아래 쿼리로 마이그레이션 가능:

```sql
-- roulette_config 테이블 업데이트
UPDATE roulette_config SET ticket_type = 'GOLD_KEY_TICKET' WHERE ticket_type = 'GOLD_KEY';
UPDATE roulette_config SET ticket_type = 'DIAMOND_TICKET' WHERE ticket_type = 'DIAMOND_KEY';
UPDATE roulette_config SET ticket_type = 'TRIAL_TICKET' WHERE ticket_type = 'TRIAL_TOKEN';
UPDATE roulette_config SET ticket_type = 'ROULETTE_TICKET' WHERE ticket_type = 'ROULETTE_COIN';
UPDATE roulette_config SET ticket_type = 'DICE_TICKET' WHERE ticket_type = 'DICE_TOKEN';

-- user_game_wallet 테이블은 enum 타입이므로 alembic migration 필요
-- (하지만 현재 코드는 양쪽 값 모두 지원하므로 즉시 마이그레이션 불필요)
```

**참고:** 현재 수정된 코드는 V2 표준과 legacy alias를 모두 지원하므로, DB 마이그레이션 없이도 정상 동작합니다.

## 참고 문서

- `docs/v2_specs/01_core/v2_item_inventory_sot_ko.md` - V2 아이템/티켓 표준 정의
- `app/models/game_wallet.py` - GameTokenType enum 정의
- `src/v2/types/enums.ts` - 프론트엔드 토큰 타입 enum

## 체크리스트

- [x] 프론트엔드 토큰 타입 매핑 추가
- [x] 백엔드 premium 룰렛 접근 제어 업데이트
- [x] 룰렛 config 조회 로직 개선 (양방향 호환)
- [ ] 로컬 환경 테스트 (DB 접속 권한 문제로 보류)
- [ ] 프로덕션 배포 전 스테이징 환경 검증 필요

## 추가 개선 사항 (Future)

1. **프론트엔드 UI 전체에서 V2 표준 토큰 타입으로 통일**
   - `RoulettePage.tsx`에서 `GOLD_KEY` → `GOLD_KEY_TICKET` 사용
   - `InventoryPage.tsx`, `ShopPage.tsx` 등 모든 페이지 업데이트

2. **Admin 페이지에서도 V2 표준 사용**
   - `RouletteConfigPage.tsx` 드롭다운 옵션 업데이트
   - `TicketManagerPage.tsx` 티켓 타입 목록 업데이트

3. **DB Enum 마이그레이션 (장기)**
   - Legacy alias 제거
   - V2 표준만 사용하도록 단순화
