문서 타입: API 스키마 / 운영 표준
버전: v2.0
작성일: 2026-01-18
작성자: GitHub Copilot
대상: BE/FE/운영
상태: SoT

## 1. 목적 (Purpose)
- BackOffice(Admin)에서 게임의 확률, 보상, 규칙을 제어하는 설정값들의 표준을 정의한다.
- V2 용어(티켓 Enum/보상 경로) 기준으로 스키마를 통일한다.

## 2. 공통 필드 (Common Fields)
| 필드명 | 타입 | 설명 | 사용 범위 |
| :--- | :--- | :--- | :--- |
| name | str | 게임 설정명 | 룰렛/주사위/복권 공통 |
| is_active | bool | 활성화 여부 | 룰렛/주사위/복권 공통 |
| ticket_type | str | 입장 재화 (`*_TICKET`) | 룰렛/복권/주사위 공통 |
| reward_type | str | 보상 지급 경로 | 룰렛/복권/주사위 공통 |
| reward_amount | int | 보상 수량 | 룰렛/복권/주사위 공통 |

## 3. 게임별 설정 스키마 (V2)

### 3.1 룰렛 (Roulette)
**파일**: app/schemas/admin_roulette.py

#### Config (Master)
```python
class AdminRouletteConfigBase(BaseModel):
    name: str
    ticket_type: str        # 사용 티켓 (기본: ROULETTE_TICKET)
    is_active: bool         # 기본값 True
    max_daily_spins: int    # 일일 최대 회전수
    grade: Optional[str]    # 적용 등급 (COMMON, VIP, WHALE, AT_RISK) - Default "COMMON"
    segments: List[AdminRouletteSegmentBase]  # 6개 고정 슬롯
```

#### Segment (Detail)
```python
class AdminRouletteSegmentBase(BaseModel):
    slot_index: int         # 휠 위치 (0~5)
    label: str              # 노출 텍스트
    weight: int             # 당첨 가중치 (확률)
    reward_type: str
    reward_amount: int
    is_jackpot: bool        # 잭팟 연출 사용 여부 (기본 False)
```

---

### 3.2 주사위 (Dice)
**파일**: app/schemas/admin_dice.py

#### Config
```python
class AdminDiceConfigBase(BaseModel):
    name: str
    is_active: bool         # 기본값 True
    max_daily_plays: int

    # -- 승/무/패 기본 보상 --
    win_reward_type: str
    win_reward_amount: int
    draw_reward_type: str
    draw_reward_amount: int
    lose_reward_type: str
    lose_reward_amount: int
```

---

### 3.3 복권 (Lottery)
**파일**: app/schemas/admin_lottery.py

#### Config (Master)
```python
class AdminLotteryConfigBase(BaseModel):
    name: str
    is_active: bool          # 기본값 True
    max_daily_plays: int     # 요청에서는 max_daily_tickets도 허용(별칭)
    prizes: List[AdminLotteryPrizeBase]
```

#### Prize (Detail)
```python
class AdminLotteryPrizeBase(BaseModel):
    label: str              # 등수명 (1등, 2등...)
    weight: int             # 당첨 가중치
    stock: Optional[int]    # 재고 제한 (None=무제한)
    reward_type: str
    reward_amount: int
    is_active: bool         # 기본값 True
```

---

## 4. 검증 로직 (Validation)
- 룰렛: 슬롯은 6개 고정(0~5)이며, slot_index 또는 index 입력을 받아 0~5로 재배치한다. 부족분은 패딩, 초과분은 잘린다. weight가 0/누락이면 1로 보정한다.
- 룰렛/복권/주사위: ticket_type 허용값은 ROULETTE_TICKET, DICE_TICKET, GOLD_KEY_TICKET, DIAMOND_TICKET, LOTTERY_TICKET, TRIAL_TICKET이다.
- 복권: label 중복 금지, weight는 0 이상, stock은 설정 시 0 이상. 총 가중치 합은 0보다 커야 하며 활성 Prize(is_active && weight > 0)가 1개 이상 필요하다.
- 복권: reward_type이 GIFTICON_*일 때 reward_amount는 해당 브랜드 SoT에 따름.
- 주사위: max_daily_plays는 음수가 될 수 없다.
- 보상 수량은 음수도 허용된다(예: 주사위 패배 시 금고 차감, 골든아워 이벤트의 음수 배수). 공통 음수 검증은 두지 않는다.

## 4.1 Grade(세그먼트) 참고
- 등급 정의/세그먼트 맥락은 V2 등급/세그먼트 SoT를 따른다.
- 관련 문서: docs/v2_specs/01_core/v2_grade_segment_sot_ko.md

## 5. 운영/검증 (QA)
- [ ] V2 티켓 Enum 사용 여부 확인
- [ ] 가중치/재고/중복 검증 로직 확인

## 6. 변경 이력
- v2.1 (2026-01-19, GitHub Copilot): TRIAL_TICKET 허용값 추가
- v2.0 (2026-01-18, GitHub Copilot): v1 문서 기반 V2 SoT 생성
