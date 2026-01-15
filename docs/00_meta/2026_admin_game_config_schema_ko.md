# 어드민 게임 설정 스키마 SoT (Admin Game Config Schema Standard)

**문서 타입**: API 스키마 / 운영 표준
**버전**: v1.0
**작성일**: 2026-01-16
**상태**: SoT (Source of Truth)

---

## 1. 목적 (Purpose)
- BackOffice(Admin)에서 게임의 확률, 보상, 규칙을 제어하는 설정값들의 표준을 정의한다.
- 신규 기능(피버 게이지, 야수 모드 등) 도입에 따른 설정값 확장 가이드를 제공한다.

## 2. 공통적으로 사용하는 필드 (Common Fields)
게임별 설정 스키마에서 공통적으로 사용되는 필드와 의미는 아래와 같으며, 각 스키마에서 필요한 항목만 사용합니다.

| 필드명 | 타입 | 설명 | 사용 범위 |
| :--- | :--- | :--- | :--- |
| `name` | str | 게임 설정명 (예: "2026 설날 이벤트 룰렛") | 룰렛/주사위/복권 공통 |
| `is_active` | bool | 활성화 여부 | 룰렛/주사위/복권 공통 |
| `ticket_type` | str | 입장 재화 | 룰렛 전용 (`ROULETTE_COIN`, `TRIAL_TOKEN`, `GOLD_KEY`, `DIAMOND_KEY`) |
| `reward_type` | str | 보상 지급 경로 | 룰렛 Segment, 복권 Prize, 주사위 각 결과 |
| `reward_amount` | int | 보상 수량 | 룰렛 Segment, 복권 Prize, 주사위 각 결과 |

---

## 3. 게임별 설정 스키마 (Game Config Schemas)

### 3.1 룰렛 (Roulette)
**파일**: `app/schemas/admin_roulette.py`

#### Config (Master)
```python
class AdminRouletteConfigBase(BaseModel):
    name: str
    ticket_type: str        # 사용 티켓 (기본: ROULETTE_COIN)
    is_active: bool         # 기본값 True
    max_daily_spins: int    # 일일 최대 회전수
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
**파일**: `app/schemas/admin_dice.py`

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
**파일**: `app/schemas/admin_lottery.py`

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

## 4. 확장 가이드 (Extension Guide)

### 4.1 필드 추가 시 주의사항
- 새 필드는 **스키마/모델/서비스/마이그레이션**까지 일괄 반영해야 합니다.
- 업데이트 요청은 현재 `PUT`이지만 부분 업데이트를 허용하므로, `Admin*ConfigUpdate`에도 해당 필드를 `Optional`로 추가해야 반영됩니다.

### 4.2 검증 로직 (Validation)
- 룰렛: 슬롯은 6개 고정(0~5)이며, `slot_index` 또는 `index` 입력을 받아 0~5로 재배치합니다. 부족분은 패딩, 초과분은 잘립니다. `weight`가 0/누락이면 1로 보정됩니다.
- 룰렛: `ticket_type` 허용값은 `ROULETTE_COIN`, `TRIAL_TOKEN`, `GOLD_KEY`, `DIAMOND_KEY`입니다.
- 복권: `label` 중복 금지, `weight`는 0 이상, `stock`은 설정 시 0 이상. 총 가중치 합은 0보다 커야 하며 활성 Prize(`is_active` && `weight` > 0)가 1개 이상 필요합니다.
- 복권: `reward_type`이 `GIFTICON_BAEMIN`일 때 `reward_amount`는 5000/10000/20000만 허용됩니다.
- 주사위: `max_daily_plays`는 음수가 될 수 없습니다.
- 보상 수량 음수에 대한 공통 검증은 스키마/서비스 레벨에 존재하지 않습니다.

---

**작성자**: GitHub Copilot  
**마지막 업데이트**: 2026-01-16
