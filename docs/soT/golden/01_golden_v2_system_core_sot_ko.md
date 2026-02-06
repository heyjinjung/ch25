# 01. Golden V2 System Core SoT (Master Expanded)

**문서 타입**: System Foundation & Universal Principles (Authoritative)
**버전**: v2.1 (2026-02-06)
**작성일**: 2026-02-06
**상태**: ✅ Active SoT

---

## 1. 시스템 미션 및 정의 (System Mission & Definition)

Golden V2는 단순한 마케팅 툴을 넘어, **유저 생애 가치(LTV) 극대화와 이탈 방지를 위한 실시간 적응형 리텐션 엔진 (Adaptive Retention Engine)**입니다. 시스템은 유저의 모든 게임 플레이, 입금, 활동 로그를 실시간으로 스트리밍하여 심리적 전조 증상을 포착하고, 운영자가 승인하는 루프를 통해 가장 적절한 순간에 개입(Intervention)합니다.

### 1.1 핵심 가치 제안 (Core Value Proposition)
- **개인화된 실시간 개입**: 특정 유저의 연패나 잔액 급락에 즉각 대응.
- **신뢰 기반 거버넌스**: 지연 입금 등 외부 요인 시 유저 증거를 선신뢰하여 즉각 보상.
- **데이터 투명성**: 모든 개입의 비용과 효과를 ROI로 정량화하여 운영 효율 증명.

---

## 2. 권위 있는 통합 용어집 (Comprehensive Universal Glossary)

본 섹션은 Golden V2 생태계에서 사용되는 모든 핵심 명칭의 공식 정의입니다.

### 2.1 자산 및 경제 주체 (Economy Entities)
| 용어 | 물리명 (Physical) | SoT 경로 | 정의 및 정책 |
| :--- | :--- | :--- | :--- |
| **금고포인트** | `Vault Locked` | `user.vault_locked_balance` | 현금성 자산의 최상위 원장. DB 우선, Redis는 캐시. |
| **룰렛티켓** | `ROULETTE_TICKET` | `user_game_wallet` | V2 룰렛 게임 실행을 위한 전용 재화. |
| **만능티켓** | `TICKET` | `InventoryService` | 룰렛/다이스/복권 등 모든 게임 티켓으로 변환 가능한 상위 재화. |
| **다이아** | `DIAMOND` | `user_inventory_item` | 유료 구매를 통해 획득하는 상점 결제 전용 재화. |
| **TRIAL 티켓** | `TRIAL_TICKET` | `user_game_wallet` | 마케팅용 소멸성 재화. 익일 09:00 KST에 자동 소멸됨. |

### 2.2 운영 및 상태 관리 (Operational States)
| 용어 | 키워드 | 정의 |
| :--- | :--- | :--- |
| **Golden Hour** | `GOLDEN_HOUR` | 지정된 시간에 보상 배율(Multiplier)이 활성화되는 부스팅 상태. |
| **Intervention** | `INTERVENTION` | 시스템이 유저에게 수행하는 개기별 액션(보상 지급, 알람 등). |
| **Clawback** | `CLAWBACK` | 허위 신고 시 선지급된 원금 및 해당 재화로 발생한 파생 이익까지 몰수하는 행위. |
| **Circuit Breaker** | `CIRCUIT_BREAKER` | 보상 지급액이 임계치를 넘을 경우 시스템 경제 보호를 위해 자동 차단하는 기능. |
| **Pending UX** | `ZEIGARNIK` | 입금 확인 중 프로그레스 바를 노출하여 사용자를 서비스에 묶어두는 심리적 장치. |

---

## 3. 핵심 철학 및 아키텍처 (Core Philosophy & Architecture)

### 3.1 4대 운영 원칙
1.  **Speed of Trust**: 유저의 선한 의지를 신뢰하여 선제적으로 대응하되, 사후 검증은 철저히 수행.
2.  **Evidence-based**: 모든 개입 추천은 데이터 트리거(5연패, 잔액 50% 하락 등)에 기반함.
3.  **Human-in-the-loop**: 시스템은 추천하고, 최종 실행은 운영자가 승인하는 안전 제일 주의.
4.  **Integrated View**: 본사 마진 데이터와 V2 내부 활동 로그를 통합하여 유저를 단일 관점에서 파악.

### 3.2 루프 아키텍처 (The Retention Loop)
Golden V2는 다음의 4단계 순환 구조를 통해 운영됩니다.
- **Analyze (감지)**: `ch25_events` 스트림을 구독하여 `golden:v2:events:game`으로 정제.
- **Decide (판단)**: `intervention_worker`가 룰셋(TRG_*)에 따라 개입 여부 및 보상량 결정.
- **Act (실행)**: 운영자 승인 즉시 `V2AdminOpsService`를 통해 유저에게 보상 및 알림 전달.
- **Evaluate (평가)**: `V2RoiAnalysisService`가 개입 후 24시간/7일 지표를 합산하여 성과 보고.

---

## 4. 운영 리셋 및 시간 규격 (Operational Timing)
Golden V2의 모든 "오늘"은 **KST(Asia/Seoul) 오전 09:00**에 시작합니다.
- **Business Day**: 09:00 (T) ~ 08:59:59 (T+1).
- **Daily Expire**: Daily Nudge로 지급된 재화는 다음 영업일 09:00에 자동 소멸.
- **Batch Cycle**: 배치 작업 및 통계 합산은 영업일 종료 직후 수행.

---
> [!IMPORTANT]
> 본 문서는 Golden V2의 최상위 SOT입니다. 모든 기술 명세서(03)와 정책서(02)는 본 문서의 정의를 위반할 수 없습니다. 관련하여 더 상세한 과거 내역은 `Archive/` 폴더의 용어집 및 시스템 정의 문서를 참조하십시오.
