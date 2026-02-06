# 02. Golden V2 Logic & Policy SoT (Master Expanded)

**문서 타입**: Business Logic & Policy (Authoritative)
**버전**: v2.1 (2026-02-06)
**상태**: ✅ Active SoT

---

## 1. 개입 트리거 상세 (Intervention Triggers & Rules)

시스템은 유저의 부정적 경험을 포착하기 위해 다음의 표준 트리거 세트를 운영합니다.

### 1.1 표준 개입 트리거 (Standard Triggers)
| 트리거 ID | 조건 (Condition) | 추천 보상 (Reward) | 쿨다운 (Cooldown) |
| :--- | :--- | :--- | :--- |
| **TRG_LOSE_5** | 최근 10게임 중 5회 연속 패배 | 룰렛 티켓 x 3 | 1시간 |
| **TRG_BAL_DROP_50** | 세션 시작 잔액 대비 50% 이상 감소 | 룰렛 티켓 x 5 | 2시간 |
| **TRG_ZERO_BAL** | 잔액이 0.01 미만으로 하락 (파산) | 만능 티켓 x 1 (부활 패키지) | 24시간 |
| **TRG_VIP_JOIN** | 본사 VIP 세그먼트 유저의 첫 가입 | 골든아워 즉시 발동 | 즉시 |

### 1.2 개입 실행 정책
- **Pending Approval**: 모든 자동 트리거는 즉시 지급되지 않고 `PENDING_APPROVAL` 상태로 적재됩니다.
- **Batch Processing**: 운영자는 대시보드에서 여러 건의 개입을 체크하여 일괄 승인(`SENT`)하거나 반려(`REJECTED`)할 수 있습니다.
- **Override**: 운영자가 판단하여 특정 유저에게 수동으로 `CUSTOM_INTERVENTION`을 발령할 수 있습니다.

---

## 2. 골든아워 상세 정책 (Golden Hour Policy)

골든아워는 유저의 보상 기대를 극대화하여 트래픽 정점을 만드는 전략적 부스팅 구간입니다.

### 2.1 활성화 규칙
- **Scheduled (AUTO)**: 매일 **21:30 ~ 22:30 (KST)** 자동 활성화.
- **Manual Control**: 운영자는 언제든 `FORCE_ON` 또는 `FORCE_OFF`로 상태를 강제 전환할 수 있습니다.
- **Gatekeeper Strategy**: 전역 골든아워가 켜져 있더라도, 개별 게임 설정(`enable_golden_hour`)이 `True`여야 실제 보상 배율이 적용됩니다.

### 2.2 보상 배율 (Multiplier)
- **표준 배율**: v2 Dice 기준 기본 **2.0배** 적용.
- **한도(Cap)**: 배율이 적용되더라도 개별 게임의 최대 잭팟 한도를 넘길 수 없습니다.

---

## 3. 통합 지출 및 재화 소모 로직 (Integrated Spending)

여러 경로(본사 입금, 내부 금고, 상점)에서 발생하는 유저 자산을 단일 관점에서 관리합니다.

### 3.1 소모 우선순위 (Consumption Priority)
재화 사용 시 다음 순서에 따라 차감됩니다.
1.  **소멸성 재화 (TRIAL)**: 만료일이 가장 임박한 순서.
2.  **보너스 재화 (ROULETTE_TICKET)**: 획득 역순 (LIFO).
3.  **현금성 재화 (VAULT)**: 유저가 명시적으로 출금하거나 상점에서 사용 시 차감.

### 3.2 음수 잔액 및 회수 (Strict Clawback)
신뢰 기반 선지급 후 부정 수급이 발견될 경우의 강제 조치입니다.
- **원칙**: `Clawback = 선지급액 + (선지급 재화를 사용하여 획득한 모든 당첨금)`.
- **회수 방식**: `force=True` 옵션을 사용하여 유저의 잔액이 부족하더라도 **음수 잔액(Negative Balance)**을 발생시켜 차감합니다.
- **부채 상환**: 음수 잔액인 유저는 추후 입금 시 부채가 먼저 자동으로 변제됩니다.

---

## 4. 입금 지연 생존 전략 (Latency Survival)

외부 데이터 지연(4~12시간)으로 인한 게임 단절을 방지하는 알고리즘입니다.

- **증거 제출**: 유저가 입금액과 시간, TX ID를 시스템에 제출.
- **즉시 선지급**: 검증 전 즉시 `ROULETTE_TICKET x 5` 지급 및 혜택 중단 상태(`Benefits Suspended`)를 최대 24시간 유예.
- **사후 검증**: 운영자가 실제 입금 로그와 대조하여 `VERIFIED` 시 확정, `REJECTED` 시 즉시 **Strict Clawback** 가동.

---
> [!IMPORTANT]
> 모든 정책 변경은 `04. Ops & Marketing SOT`에 정의된 ROI 시뮬레이션을 거쳐 임계치를 승인받아야 합니다.
