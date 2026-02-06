문서 타입: 게임 정책/로직
버전: v1.2
작성일: 2026-01-19
작성자: Antigravity Agent
대상: 기획/개발 팀
상태: SoT

# Golden V2 Intervention Logic (개입 로직 상세)

## 1. 목적
Golden System의 핵심 엔진인 **Intervention(개입)**의 구체적인 작동 로직, 발동 조건(Trigger), 그리고 실행 액션(Action)을 정의한다.

## 2. 개입 카테고리 (Intervention Categories)

### 2.1. Dynamic Difficulty Adjustment (DDA, 동적 난이도 조절)
유저의 실력과 상태(Flow State)에 맞춰 게임 난이도를 실시간으로 미세 조정한다.
- **Goal**: 몰입(Flow) 상태 유지 (Too hard -> Anxiety, Too easy -> Boredom 방지).
- **Mechanism**:
    - **Winning Streak (연승)**: 난이도 상승 (AI 배율 증가, 함정 추가).
    - **Losing Streak (연패)**: 난이도 하락 (AI 배율 감소, 'Guaranteed Win' 모드 활성화).
- **SoT Rule**: DDA는 유저가 인지하지 못하는 범위(Subtle) 내에서 작동해야 한다.

### 2.2. Variable Reward System (가변 보상 시스템)
예측 불가능한 보상을 통해 도파민 분비를 극대화한다.
- **Rule 1 (Near Miss)**: 아쉬운 실패(한 칸 차이 등) 시 다음 시도에 보상 확률 일시 증가.
- **Rule 2 (Jackpot Pity)**: 일정 횟수 이상 잭팟 미당첨 시 'Pity Timer' 가동하여 확률 보정.
- **Rule 3 (Surprise Gift)**: 예상치 못한 시점에 소액의 무료 재화(Ticket 등) 지급.

### 2.3. Crisis Intervention (위기 개입)
유저가 이탈하거나 파산할 위험이 감지될 때 즉시 개입한다.
- **Trigger**:
    - `Balance / AvgBet < 3` (3판 이하 잔액)
    - `Session Time > 30min` AND `Win Rate < 20%` (오래 했는데 계속 짐)
- **Action**:
    - **Bailout Fund**: "긴급 구호 자금" 팝업 노출 (광고 시청 후 지급 등).
    - **Discount Offer**: 한정 시간 상점 할인 (Time-Limited Deal).

---

## 3. 트리거 로직 (Trigger Logic)

### 3.1. 실시간 트리거 (Real-time Config)
Redis Pub/Sub을 통해 게임 서버에서 발생하는 이벤트를 즉시 구독 및 판단한다.

| Trigger ID | Condition (Pseudocode) | Action | CoolDown |
| :--- | :--- | :--- | :--- |
| `TRG_ZERO_BAL` | `wallet.balance == 0` | `Offer_Zero_Ticket` | 24h |
| `TRG_LOSE_5` | `game.recent_results.last(5).all("LOSE")` | `Trigger_Pity_Win` | 1h |
| `TRG_WHALE_IN` | `deposit.amount >= 100,000` | `Assign_VIP_Manager` | Always |

### 3.2. 상태 기반 트리거 (State-Based)
배치(Batch) 또는 주기적 워커(Schedule)가 유저 상태를 분석하여 발동한다.
- **Dormant User**: `last_login > 7 days` -> `Push_Welcome_Back_Gift`.

---

## 4. 우선순위 및 충돌 경험 (Priority & Conflict Resolution)
동시에 여러 개입 조건이 만족될 경우, 다음 우선순위를 따른다.

1.  **Legal/Security**: 제재, 차단, 셧다운제 (최우선)
2.  **Crisis (위기)**: 파산 방어, 이탈 방어
3.  **Revenue (매출)**: 결제 유도, 상품 제안
4.  **Engagement (재미)**: DDA, 일반 이벤트

**Rule**: 상위 우선순위 개입이 실행되면 하위 개입은 해당 세션에서 취소되거나 대기열(Queue)로 이동한다. (단, Crisis와 Revenue는 상황에 따라 결합 가능)

---

## 5. SoT 확장 (2026-01-28)

### 5.1 Human-in-the-loop 승인 게이트 (Phase 2)

> [!NOTE]
> Golden V2의 실시간 트리거는 **감지 즉시 자동 발송/지급하지 않는다.**
> 감지 즉시 로그를 적재하고 운영자 승인 루프를 통과해야 한다.

| 단계 | 상태(SoT) | 설명 |
| :--- | :--- | :--- |
| 감지 | `PENDING_APPROVAL` | 트리거 감지 후 즉시 적재(승인 대기) |
| 승인 | `APPROVED` | 운영자 승인 완료(발송/지급 가능) |
| 거절 | `REJECTED` | 운영자 거절로 종료 |
| 발송/지급 | `SENT` | 실제 발송/지급까지 완료 |

### 5.2 실시간 이벤트 채널 SoT

| 채널 | 목적 |
| :--- | :--- |
| `golden:v2:events:game` | 게임 이벤트 스트림 |
| `golden:v2:events:intervention` | 개입 이벤트 스트림 |

> [!NOTE]
> 승인 대기열 스트림(`golden:v2:admin:queue`)은 Phase 2(미구현) 항목이며, 현행 구현 SoT에 포함하지 않습니다.

### 5.3 트리거 SoT (운영/구현 기준)

| Trigger ID | 의미 | 비고 |
| :--- | :--- | :--- |
| `TRG_LOSE_5` | 연속 5패 | 실시간 트리거(주요) |
| `TRG_BAL_DROP_50` | 잔액 50% 급감 | 실시간 트리거(주요) |
| `TRG_COHORT_CPR` | 코호트 리텐션 급감 | 워커/집계 기반 |
| `TRG_ZERO_BAL` | 잔액 0 | 정책 유지(필요 시 승인 게이트 적용) |

### 5.4 승인 처리 API SoT

| Method | Endpoint | 설명 |
| :--- | :--- | :--- |
| POST | `/api/v2/admin/crm/approve` | 복수건 일괄 승인/거절 |

---

## 6. 변경 이력
- v1.2 (2026-01-28, GitHub Copilot): 미구현 채널 표기 정정 및 트리거 ID를 현행 구현에 맞게 정합화.
- v1.1 (2026-01-28, GitHub Copilot): 승인 게이트/상태값/채널/승인 API SoT 확장(운영 플로우 정합).
- v1.0 (2026-01-19): 최초 작성. 기존 `02_tech_spec` 내용을 통합/정제.
