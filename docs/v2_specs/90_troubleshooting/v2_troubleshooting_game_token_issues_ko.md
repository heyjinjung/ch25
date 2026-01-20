# V2 게임 토큰 관련 트러블슈팅 가이드

**작성일:** 2026-01-21
**대상:** 백엔드/프론트엔드 개발자, DevOps
**우선순위:** P0 (Critical)

---

## 목차

1. [골드키/다이아키 티켓이 차감되지 않는 문제](#1-골드키다이아키-티켓이-차감되지-않는-문제)
2. [티켓 타입 Enum 오류](#2-티켓-타입-enum-오류)
3. [룰렛 Config 조회 실패](#3-룰렛-config-조회-실패)
4. [Premium 룰렛 접근 제어 오류](#4-premium-룰렛-접근-제어-오류)
5. [예방 가이드라인](#5-예방-가이드라인)

---

## 1. 골드키/다이아키 티켓이 차감되지 않는 문제

### 증상

- 사용자가 골드키 또는 다이아키 룰렛 입장 시도
- 게임은 실행되지만 티켓이 DB에서 차감되지 않음
- 무제한으로 플레이 가능 (의도하지 않은 동작)

### 근본 원인

**프론트엔드 ↔ 백엔드 토큰 타입 이름 불일치**

```
프론트엔드: "GOLD_KEY", "DIAMOND_KEY" (Legacy)
           ↓
백엔드 API: ticket_type 파라미터로 전달
           ↓
백엔드 DB:  "GOLD_KEY_TICKET", "DIAMOND_TICKET" (V2 Standard)
```

`UserGameWallet` 테이블의 `token_type` 컬럼은 enum 타입으로 V2 표준 값만 인식합니다.

### 해결 방법

#### Option 1: 프론트엔드에서 V2 표준으로 매핑 (✅ 권장)

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

export const playRoulette = async (ticketType?: string): Promise<RoulettePlayResponse> => {
  // Map legacy token types to V2 standard
  const mappedTicketType = ticketType && TOKEN_TYPE_V2_MAP[ticketType]
    ? TOKEN_TYPE_V2_MAP[ticketType]
    : ticketType;

  const payload = mappedTicketType ? { ticket_type: mappedTicketType } : {};
  // ...
};
```

**장점:**
- 백엔드 수정 없이 즉시 적용 가능
- 프론트엔드에서 일관된 변환 로직 관리
- DB 마이그레이션 불필요

#### Option 2: 백엔드에서 양방향 호환 처리

**파일:** `app/services/roulette_service.py`

```python
def _get_today_config(self, db: Session, ticket_type: str, user_id: int | None = None):
    # Build list of ticket types to query (V2 standard + legacy alias)
    ticket_types_to_query = [ticket_type]

    legacy_map = {
        "GOLD_KEY_TICKET": "GOLD_KEY",
        "DIAMOND_TICKET": "DIAMOND_KEY",
        # ...
    }

    if ticket_type in legacy_map:
        ticket_types_to_query.append(legacy_map[ticket_type])

    # Query with both naming conventions
    config = db.execute(
        select(RouletteConfig).where(
            RouletteConfig.ticket_type.in_(ticket_types_to_query)
        )
    ).scalars().first()
```

**장점:**
- 레거시 코드와의 호환성 유지
- 점진적 마이그레이션 가능

#### 최종 권장: 두 가지 모두 적용 ✅

현재 구현은 프론트엔드(Option 1)와 백엔드(Option 2)를 모두 수정하여:
- 프론트엔드가 V2 표준으로 전달
- 백엔드가 양방향 호환 지원

### 검증 방법

```bash
# 1. 프론트엔드 빌드 후 룰렛 페이지 접속
npm run dev

# 2. 개발자 도구 Network 탭 확인
# POST /api/roulette/play 요청의 payload 확인:
{
  "ticket_type": "GOLD_KEY_TICKET"  // ✅ V2 표준으로 전달되는지 확인
}

# 3. DB 확인 (티켓 차감 확인)
SELECT token_type, balance
FROM user_game_wallet
WHERE user_id = ? AND token_type = 'GOLD_KEY_TICKET';
```

---

## 2. 티켓 타입 Enum 오류

### 증상

```
ValueError: 'GOLD_KEY' is not a valid GameTokenType
```

### 원인

백엔드에서 `GameTokenType(ticket_type)` 호출 시 enum에 없는 값 전달

### 해결

**파일:** `app/models/game_wallet.py`

```python
class GameTokenType(str, Enum):
    # V2 Standard
    GOLD_KEY_TICKET = "GOLD_KEY_TICKET"
    DIAMOND_TICKET = "DIAMOND_TICKET"

    # Legacy Aliases (Deprecated - For Compatibility)
    GOLD_KEY = "GOLD_KEY"  # [DEPRECATED] Use GOLD_KEY_TICKET
    DIAMOND_KEY = "DIAMOND_KEY"  # [DEPRECATED] Use DIAMOND_TICKET
```

Legacy alias를 enum에 포함시켜 양방향 호환성 확보.

---

## 3. 룰렛 Config 조회 실패

### 증상

```
InvalidConfigError: ROULETTE_CONFIG_MISSING_GOLD_KEY_TICKET
```

### 원인

`roulette_config` 테이블에 `ticket_type`이 legacy 이름으로 저장되어 있을 때, V2 표준 이름으로 조회 시 config를 찾지 못함.

### 해결

#### Immediate Fix: 백엔드 조회 로직 수정

```python
# ticket_type.in_() 을 사용하여 여러 값 동시 조회
config = db.execute(
    select(RouletteConfig).where(
        RouletteConfig.is_active.is_(True),
        RouletteConfig.ticket_type.in_(["GOLD_KEY_TICKET", "GOLD_KEY"])
    )
).scalars().first()
```

#### Long-term Fix: DB 데이터 마이그레이션

```sql
-- roulette_config 테이블 업데이트
UPDATE roulette_config
SET ticket_type = 'GOLD_KEY_TICKET'
WHERE ticket_type = 'GOLD_KEY';

UPDATE roulette_config
SET ticket_type = 'DIAMOND_TICKET'
WHERE ticket_type = 'DIAMOND_KEY';
```

---

## 4. Premium 룰렛 접근 제어 오류

### 증상

- VIP/WHALE 유저가 골드/다이아 룰렛에 접근할 수 없음
- 또는 COMMON 유저가 접근 가능 (보안 취약점)

### 원인

Premium 룰렛 판별 로직이 V2 표준 토큰 타입만 체크

```python
# ❌ 잘못된 코드
if ticket_type == "GOLD_KEY" or ticket_type == "DIAMOND_KEY":
    # Premium roulette logic
```

V2 표준(`GOLD_KEY_TICKET`)으로 전달되면 premium 체크를 건너뜀.

### 해결

```python
# ✅ 올바른 코드
is_premium = ticket_type in ("GOLD_KEY", "DIAMOND_KEY", "GOLD_KEY_TICKET", "DIAMOND_TICKET")
if is_premium:
    segment_row = db.query(UserSegment).filter(UserSegment.user_id == user_id).first()
    user_segment = segment_row.segment if segment_row else "COMMON"

    if user_segment not in ["VIP", "WHALE"]:
        raise ForbiddenError("PREMIUM_ROULETTE_FORBIDDEN")
```

### 검증

```python
# Unit Test
def test_premium_roulette_access_control():
    # Case 1: COMMON 유저 → 403 Forbidden
    with pytest.raises(ForbiddenError):
        service.play(db, user_id=common_user_id, ticket_type="GOLD_KEY_TICKET")

    # Case 2: VIP 유저 → 성공
    result = service.play(db, user_id=vip_user_id, ticket_type="GOLD_KEY_TICKET")
    assert result.result == "OK"
```

---

## 5. 예방 가이드라인

### 5.1 토큰 타입 사용 체크리스트

새로운 게임 티켓 추가 시:

- [ ] `GameTokenType` enum에 V2 표준 이름 정의
- [ ] Legacy alias도 함께 정의 (호환성)
- [ ] 프론트엔드에서 V2 표준 사용
- [ ] 백엔드에서 양방향 호환 처리
- [ ] DB migration script 작성 (필요 시)
- [ ] Unit test 작성

### 5.2 V2 토큰 타입 네이밍 규칙

| Category | V2 Standard Pattern | Example |
|----------|-------------------|---------|
| 게임 티켓 | `{GAME}_TICKET` | `ROULETTE_TICKET`, `DICE_TICKET` |
| Premium 티켓 | `{ITEM}_TICKET` | `GOLD_KEY_TICKET`, `DIAMOND_TICKET` |
| 조각/파편 | `{ITEM}_FRAGMENT` | `GOLD_KEY_FRAGMENT`, `DIAMOND_FRAGMENT` |
| 퍼즐 | `PUZZLE_{CODE}` | `PUZZLE_C1`, `PUZZLE_J` |
| 재화 | 단수형 | `DIAMOND`, `VAULT` |

### 5.3 코드 리뷰 체크포인트

```typescript
// ❌ 나쁜 예: 하드코딩된 토큰 타입
const ticketType = "GOLD_KEY";

// ✅ 좋은 예: Enum/상수 사용
import { GameTokenType } from '@/types/enums';
const ticketType = GameTokenType.GOLD_KEY_TICKET;
```

```python
# ❌ 나쁜 예: 직접 비교
if ticket_type == "GOLD_KEY":
    # ...

# ✅ 좋은 예: 리스트 또는 집합 사용
PREMIUM_TICKETS = {"GOLD_KEY", "DIAMOND_KEY", "GOLD_KEY_TICKET", "DIAMOND_TICKET"}
if ticket_type in PREMIUM_TICKETS:
    # ...
```

### 5.4 마이그레이션 전략

기존 시스템에서 V2 표준으로 전환 시:

**Phase 1: 호환 레이어 추가** (현재 완료)
- 프론트엔드에서 V2 표준으로 변환
- 백엔드에서 양방향 호환 지원

**Phase 2: 점진적 마이그레이션**
- DB 데이터 마이그레이션 (roulette_config, user_game_wallet)
- 프론트엔드 UI 전체에서 V2 표준 사용

**Phase 3: Legacy 제거** (장기)
- Enum에서 legacy alias 제거
- 호환 레이어 제거
- V2 표준만 사용

---

## 참고 문서

- [V2 아이템/인벤토리 SoT](../01_core/v2_item_inventory_sot_ko.md)
- [게임 토큰 표준화 Changelog](../08_changelog/20260121_roulette_gold_diamond_key_fix_ko.md)
- [GameTokenType Enum 정의](../../../app/models/game_wallet.py)

---

## 긴급 대응 절차

### 프로덕션 환경에서 티켓 차감 안 되는 경우

1. **즉시 롤백 (1분 이내)**
   ```bash
   # 이전 버전으로 롤백
   git checkout <previous-stable-commit>
   pm2 restart backend
   ```

2. **임시 수동 처리 (5분 이내)**
   ```sql
   -- 영향받은 유저의 티켓 차감
   UPDATE user_game_wallet
   SET balance = balance - {사용된_횟수}
   WHERE user_id = {user_id}
   AND token_type = 'GOLD_KEY_TICKET';
   ```

3. **로그 확인 (10분 이내)**
   ```bash
   # 룰렛 플레이 로그 확인
   grep "ROULETTE_PLAY" /var/log/app/backend.log | tail -100
   ```

4. **사후 조치 (1시간 이내)**
   - 영향받은 유저 식별 및 보상
   - 근본 원인 분석 및 수정
   - 재발 방지 계획 수립

---

## 문의

- **기술 지원:** DevOps 팀
- **버그 리포트:** [GitHub Issues](https://github.com/your-org/your-repo/issues)
- **긴급 문의:** Slack #dev-emergency
