# 01. Golden V2 System Core SoT (Master Expansion v2.2)

**문서 타입**: System Foundation & Universal Principles (Authoritative)
**버전**: v2.3 (2026-02-07 - Expansion Integration)
**상태**: ✅ Active SoT (Extreme Detail)

---

## 1. 개요 (System Vision & Core Mission)

Golden V2는 단순한 마케팅 엔진을 넘어, **데이터 기반 유기적 리텐션 운영 시스템 (Data-Driven Organic Retention Operations System)**으로 정의됩니다. 본 시스템의 목적은 유저의 모든 활동 로그를 실시간으로 분석하여, 가장 적절한 순간(Golden Moment)에 운영자가 개입(Intervention)함으로써 유저의 이탈을 방지하고 생애 가치(LTV)를 극대화하는 것입니다.

### 1.1 핵심 컴포넌트 구조
1.  **Golden Core**: 적응형 리텐션 엔진 (Adaptive Retention Engine). 실시간 이벤트 처리 및 룰 기반 판단 수행.
2.  **Golden Ops**: 관제 및 개입 시스템 (Operations & Intervention). 관리자가 모니터링하고 개입을 승인하는 CRM 레이어.
3.  **Golden Data**: 증거 기반 의사결정 데이터 파이프라인 (Evidence-based Decision Pipeline). 본사 마진, 게임 로그, 사용자 활동을 통합.

### 1.2 루프 아키텍처 (The Retention Loop)
- **Analyze (분석)**: `ch25_events` 스트림을 구독하여 유저의 '심리적 전조 증상'을 포제.
- **Intervene (개입)**: `InterventionWorker`가 트리거를 감지하고 보상을 추천하며 운영자의 승인을 대기.
- **Measure (평가)**: 개입 후 24시간/7일 수익(Revenue) 및 리텐션 변화를 ROI(%)로 정량화.

### 1.3 V2 핵심 3요소 및 확장 모듈
Golden V2의 운영 원리는 아래 3요소와 4대 확장 모듈을 기준으로 통합한다.

**핵심 3요소 (Core Pillars)**
1) **개입(Intervention)**: 유저 상태를 보고 적절한 타이밍에 개입을 실행.
2) **관제(Operations)**: 운영자의 액션을 기록/추적하고 문제 시 즉시 회수 가능.
3) **증거 수집(Evidence)**: 개입 효과를 ROI로 검증하는 데이터 파이프라인.

**4대 확장 모듈**
- **증거 센터**: ROI 및 데이터 실효성 증명.
- **반자동 CRM**: AI 추천 + 운영자 승인 루프.
- **유연한 케어**: 코호트 방어/배지/스트릭 복구 등 케어 중심 전략.
- **지연 대응**: 입금 지연 시 증거 기반 선지급/사후 검증.

---

## 2. 통합 권위 용어집 (Comprehensive Universal Glossary)

### 2.1 자산 및 경제 주체 (Economy Entities)
| 용어 | 물리명 (Physical) | SoT 경로 (DB/Redis) | 정의 및 상세 정책 |
| :--- | :--- | :--- | :--- |
| **금고포인트** | `Vault Locked` | `user.vault_locked_balance` | 현금성 자산의 최상위 원장. DB가 유일한 진실(SoT)이며 Redis는 성능을 위한 캐시. |
| **금고 사용액** | `Vault Spent` | `user.vault_spent_total` | 상점 구매나 게임 바이인에 사용된 누적액. ROI 계산의 Return 요소. |
| **룰렛티켓** | `ROULETTE_TICKET` | `user_game_wallet` | V2 룰렛 게임 실행 전용 재화. 레거시 `ROULETTE_COIN`의 정통 계승. |
| **만능티켓** | `TICKET` | `InventoryService` | 룰렛, 다이스, 복권 등 모든 게임 티켓으로 1:1 변환 가능한 상위 재화. |
| **TRIAL 티켓** | `TRIAL_TICKET` | `user_game_wallet` | 마케팅용 소멸성 재화. **익일 09:00 KST**에 자동 소각됨 (LIFO 소모). |
| **다이아** | `DIAMOND` | `user_inventory_item` | 유료 결제나 고급 보상을 통해 획득하는 상점 전용 결제 수단. |
| **XP / 레벨** | `GAME_XP` | `V2User.level_point` | 유저의 숙련도 지표. 서비스 체류 시간에 따라 누적되며 등급 산정의 보조 지표. |

### 2.2 운영 및 상태 코드 (Operational States)
| 용어 | 키워드 | 정의 및 상세 |
| :--- | :--- | :--- |
| **Golden Hour** | `GOLDEN_HOUR` | 지정된 시간대에 보상 배율이 활성화되는 부인 상태 (21:30~22:30). |
| **Intervention** | `INTERVENTION` | 시스템이 유저에게 수행하는 개기별 액션. 보상 지급, 알림, 수동 케어 포함. |
| **Clawback** | `CLAWBACK` | 허위 신고 발견 시 선지급액과 해당 재화로 얻은 파생 이익까지 모두 몰수하는 행위. |
| **Circuit Breaker** | `CIRCUIT_BREAK` | 보상 지출이 예산을 초과할 경우 시스템 안전을 위해 자동 차단되는 방어 기제. |
| **Pending UX** | `ZEIGARNIK` | 입금 확인 중 프로그레스 바를 노출하여 사용자를 서비스에 묶어두는 심리적 장치. |
| **Pending Approval** | `PENDING_APP` | 개입 트리거 감지 후 운영자 승인 전까지 대기하는 보안 상태. |

---

## 3. 세그먼트 분류 및 관리 (Segment Classification)

Golden V2는 본사 마진 데이터를 기반으로 유저를 4가지 핵심 그룹으로 자동 분류합니다.

### 3.1 분류 로직 (Classification Logic)
| 세그먼트 | 조건 (Classification Rule) | 골든 운영 전략 |
| :--- | :--- | :--- |
| **VIP** | 총 운영 마진 > 1,000,000 KRW | 고배율 골든아워, 최우선 1:1 케어, 전용 개입 룰 적용. |
| **WHALE** | 누적 충전 금액 > 5,000,000 KRW | VIP 승격 유도 캠페인, 고가치 리워드 제안. |
| **AT_RISK** | 미접속 > 7일 AND 마진 > 0 | 자동 리팩 유도 리워드, 복귀 넛지 메시지 발송. |
| **COMMON** | 위 조건에 해당하지 않는 일반 유저 | 표준 룰셋 및 데일리 넛지 위주 운영. |

### 3.2 잠재고객 관리 (Prospective Users)
- **정의**: 본사 데이터에는 존재하나 아직 V2에 가입하지 않은 유저.
- **매칭**: 가입 시 `cc_id` 또는 `nickname`을 통해 자동 매칭되며, 즉시 과거 마진 정보를 상속받음.
- **연동 페이지**: `ProspectLinkingPage.tsx`를 통한 수동/자동 매칭 관리.

---

## 4. 데이터 및 기술 규격 (Technical Specification)

### 4.1 Redis 메시지 버스 및 키 스키마
시스템의 실시간성을 보장하는 핵심 키 및 채널 명세입니다.

#### 4.1.1 Pub/Sub 채널
- `ch25_events`: 원본 게임 이벤트 스트림 (Game → Worker).
- `golden:v2:events:game`: V2 정제 게임 이벤트 스트림 (Gateway → Analytics).
- `golden:v2:events:intervention`: 실시간 개입 알림 스트림 (Worker → Admin Push).

#### 4.1.2 Redis 키 구조
- `golden:v2:user:{user_id}:loss_streak`: 연속 패배 횟수 (Int).
- `golden:v2:user:{user_id}:session_start_balance`: 세션 시작 시점의 잔액 기록.
- `golden:v2:user:{user_id}:psych_state`: 유저의 추정 심리 상태 (예: `FRUSTRATED`, `CHURN_RISK`).
- `golden:v2:cooldown:{trigger_id}:{user_id}`: 개입 트리거별 개별 쿨다운 (TTL).

### 4.2 운영 시간 및 타임라인 (Operational Timing)
- **Business Day**: KST 오전 09:00 시스템 리셋.
- **Golden Hour Window**: 매일 21:30 ~ 22:30 (자동 활성화).
- **Daily Nudge Cycle**: 매일 12:00 (점심), 19:00 (퇴근) 정기 발송.

---

## 5. 핵심 운영 원칙 (Core Principles)

1.  **Speed of Trust**: 유저의 선한 의지를 신뢰하여 지연 입금 시 선지급하되, 사후 검증은 무관용 원칙 적용.
2.  **Evidence-based Intervention**: 모든 개입은 명확한 데이터 트리거(5연패 등)에 기반하며 주관적 개입 지양.
3.  **Human-in-the-loop**: 시스템은 고도의 추천을 수행하되, 비용이 발생하는 모든 액션은 운영자의 명시적 승인 필수.
4.  **Full Transparency (Audit Log)**: 관리자의 모든 승인, 거절, 수동 지급 액션은 `V2AdminAuditService`에 영구 기록됨.

---
> [!IMPORTANT]
> 본 문서는 Golden V2 시스템의 헌법과도 같은 최상위 SOT입니다. 모든 하위 정책서(02)와 기술 명세서(03)는 본 문서의 정의를 엄격히 따라야 하며, 명칭 불일치 시 본 문서를 기준으로 정규화합니다. 상세한 구현 이력은 `Archive/v2_patch_execution_log_ko.md`를 참조하십시오.

---

## 변경 이력
- v2.3 (2026-02-07): 핵심 3요소 및 4대 확장 모듈을 통합 반영.
