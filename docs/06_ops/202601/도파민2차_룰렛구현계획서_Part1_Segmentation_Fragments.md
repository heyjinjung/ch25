# 도파민 2차: 세그먼트 & 파편화 전략 (Dopamine Phase 2: Segmentation & Fragments)

**문서 정보**
- **작성일**: 2026-01-16
- **상태**: Draft (승인 대기)
- **목표**: 유저 그룹별 차별화 경험 제공 (초기 리텐션↑, 고래 만족도↑, 체리피커 방어↑)
- **관련 스키마**: @[docs/00_meta/2026_game_action_schema_ko.md], @[docs/00_meta/2026_progression_schema_ko.md]

---

## 1. 개요 (Executive Summary)

### 1-1. 문제점
- **High RTP 일괄 적용**: 악용 유저가 손쉽게 이득을 취함.
- **Low RTP 일괄 적용**: 신규/고래 유저가 재미없어서 이탈함.

### 1-2. 해결책: "보이지 않는 손" (Invisible Segmentation)
- 유저를 **NEW**, **WHALE**, **COMMON** 등급으로 나누어 **서로 다른 확률표(Config)**를 제공.
- COMMON(Safe Mode) 유저의 박탈감을 해소하기 위해 "꽝" 대신 **"조각(Fragments)"** 보상 도입.

---

## 2. 세그먼트 정의 (Segmentation Rules)

| 등급 | 조건 (Logic) | 적용 모드 | RTP | 비고 |
| :--- | :--- | :--- | :--- | :--- |
| **NEW** | 가입일(`created_at`) < 7일 | **WHALE (High)** | >95% | "허니문 기간" (묻지도 따지지도 않고 혜자) |
| **WHALE** | 누적 입금(`external_ranking.deposit`) > 500만원 | **WHALE (High)** | >95% | "VIP 대우" (기존 설정 유지) |
| **COMMON** | 위 조건 불만족 (일반/체리피커) | **SAFE (Low)** | <90% | "방어 확률" (단, '조각'으로 희망 고문) |

> **Note**: 유저는 자신이 어떤 그룹인지, 어떤 확률인지 절대 알 수 없음 (Server-Side Logic).

---

## 3. 신규 재화: 조각 (Key Fragments)

기존 "꽝" 슬롯을 대체하여, 수집 및 상위 컨텐츠 도전 욕구를 자극하는 재화.

### 3-1. 모델 정의 (`GameTokenType`)
`app/models/game_wallet.py`에 신규 토큰 타입 추가.

| Token Type | 한글명 | 용도 | 수급처 |
| :--- | :--- | :--- | :--- |
| `GOLD_KEY_FRAGMENT` | 황금열쇠 조각 | 10개 → `GOLD_KEY` 1개로 교환 | 룰렛(Safe Mode), 미션 |
| `DIAMOND_KEY_FRAGMENT` | 다이아열쇠 조각 | 30개 → `DIAMOND_KEY` 1개로 교환 | 룰렛(Safe Mode), 이벤트 |

### 3-2. 교환 로직 (Exchange)
신규 API `POST /api/exchange/craft` (가칭)
- 10 `Fragment` -> 1 `Key`
- 교환 시 화려한 연출(크래프팅) 필요 (프론트엔드).

---

## 4. 룰렛 확률 구성안 (Config Plan)

### A. WHALE 모드 (High RTP) - 기존 유지
| Slot | Reward | Weight | 체감 |
| :--- | :--- | :--- | :--- |
| 1 | 꽝 (Next Time) | 24.2% | 가끔 꽝 |
| 2 | 주사위 1개 | 24.2% | |
| 3 | 금고 | 24.2% | |
| 4 | 주사위 1개 | 19.4% | |
| 5 | **배민 5천 (대박)** | **6.8%** | **잘 터짐** |
| 6 | CC 코인 | 1.2% | 희귀 |

### B. SAFE 모드 (Low RTP & Fragments) - 신규
| Slot | Reward | Weight | 체감 |
| :--- | :--- | :--- | :--- |
| 1 | **황금열쇠 조각 (NEW)** | **30%** | **"오, 모으면 금열쇠다!"** |
| 2 | 꽝 (Next Time) | 25% | 자주 꽝 |
| 3 | 주사위 1개 | 20% | |
| 4 | 금고 | 20% | |
| 5 | **배민 5천** | **3.8%** | **잘 안 나옴** |
| 6 | CC 코인 | 1.2% | 희귀 |

> **전략**: '꽝'의 비중을 일부 '조각'으로 돌리고, '배민' 확률을 절반으로 줄임.
> 유저는 "꽝 대신 조각을 주네? 혜자인가?"라고 착각하지만, 실제 EV(기대값)는 훨씬 낮음.

---

## 5. 구현 단계 (Implementation Steps)

### Phase 2-0: Meta & Schema Definition (Metadata Sync)
1.  **Glossary Update (`2026_core_economy_glossary_ko.md`)**: [x]
    - `4.4 게임 토큰`: `GOLD_KEY_FRAGMENT`, `DIAMOND_KEY_FRAGMENT` 추가 및 정의.
2.  **Admin Schema Update (`2026_admin_game_config_schema_ko.md`)**: [x]
    - `3.1 룰렛`: `AdminRouletteConfigBase`에 `grade: Optional[str]` 필드 추가 명시.

### Phase 2-1: Backend Core (금일 목표)
1.  **DB Schema Update**: `GameTokenType` Enum 추가 (`GOLD_KEY_FRAGMENT`, `DIAMOND_KEY_FRAGMENT`).
    - `roulette_config` 테이블에 `grade` 컬럼 추가.
      ```sql
      ALTER TABLE roulette_config ADD COLUMN grade VARCHAR(20) DEFAULT 'COMMON' NOT NULL;
      -- Values: 'COMMON', 'WHALE', 'NEW'
      ```

2.  **Segmentation Service**: `RouletteService` 진입 시 유저 등급 판별 로직(NEW/WHALE check) 구현.
    - `RouletteService._get_today_config` 메서드 수정:
      ```python
      # Pseudo Code
      user_segment = segment_service.get_user_segment(user_id) # NEW, WHALE, COMMON
      
      # Priority: Specific Grade Config -> Default(COMMON) Config
      config = db.query(RouletteConfig).filter(
          RouletteConfig.ticket_type == ticket_type,
          RouletteConfig.grade == user_segment, # 핵심: 유저 등급에 맞는 설정 조회
          RouletteConfig.is_active == True
      ).first()
      
      if not config:
          # Fallback to COMMON if specific grade config missing
          config = db.query(RouletteConfig).filter(..., grade='COMMON').first()
      ```

3.  **Config Loader**: 등급에 따라 다른 `RouletteConfig`를 로딩하는 분기 처리.
    - **Admin UI (`RouletteAdminPage.tsx`)**:
        - **리스트(Table)**: `Grade` 컬럼 추가 (Badge 형태로 COMMON/WHALE/NEW 표시).
        - **생성/수정 모달**: `Grade` 선택 드롭다운 (Select) 추가.
        - **필터링**: 등급별로 설정을 모아볼 수 있는 상단 탭 필터 구현.
    - **API**: `POST /api/admin/roulette/config` payload에 `grade` 필드 추가.
ㄴ 이건 어떻게 컨피그 분류해서 인식할건데?? 
ㄴ 어드민에선 이 모드를 어떻게 인식하고 관리할건데? 

4.  **Seed Script**: Safe Mode용 룰렛 설정(`scripts/seed_safe_roulette.py`) 작성 및 실행.

### Phase 2-2: Frontend & Exchange
1.  **Wallet UI**: 나의 '조각' 보유량 표시.

2.  **Roulette UI**: `reward_type`에 따른 이미지 매핑 (기존 로직 활용).
    - `GOLD_KEY_FRAGMENT` -> 황금열쇠 조각 아이콘
    - `DIAMOND_KEY_FRAGMENT` -> 다이아열쇠 조각 아이콘
    - *별도 프론트 로직 개발 없이, 리소스(이미지)만 추가하면 됨.*

ㄴ ??? 슬롯 결과후 조각이 뜨면 조각 이미지가 뜨도록 한다는 말이지??? 
ㄴ 결론적으로 1번 3번만 구현하는게 깔끔한거 아니야? 
3.  **Craft UI**: 조각 10개 모으면 열쇠로 바꾸는 팝업/모달.

---

## 6. 검증 계획 (Verification)
1.  **NEW 유저 테스트**: `created_at`을 오늘로 조작 -> 배민 6.8% 확인.
2.  **COMMON 유저 테스트**: `created_at` 8일 전 + 입금 0원 -> 배민 3.4% + 조각 슬롯 확인.
3.  **WHALE 유저 테스트**: 입금액 600만원 설정 -> 배민 6.8% 확인.
