# 02. Golden V2 Logic & Policy SoT (Master Expansion v2.2)

**문서 타입**: Business Logic & Policy (Authoritative)
**버전**: v2.3 (2026-02-07 - Policy Integration)
**상태**: ✅ Active SoT (Extreme Detail)

---

## 1. 개입 트리거 및 로직 상세 (Intervention Master Rules)

시스템은 유저의 실시간 활동을 바탕으로 부정적 경험을 상쇄하기 위한 트리거를 운영합니다.

### 1.1 표준 개입 트리거 세트 (Trigger Specification)
| 트리거 ID | 상세 감지 로직 (Logic) | 표준 보상 (Reward) | 쿨다운 (Cooldown) |
| :--- | :--- | :--- | :--- |
| **TRG_LOSE_5** | `loss_streak >= 5` 도달 시 1회 발생. | `ROULETTE_TICKET` x 3 | 1시간 |
| **TRG_BAL_DROP_50** | 세션 시작 잔액 대비 당일 손실 > 50% | `ROULETTE_TICKET` x 5 | 2시간 |
| **TRG_ZERO_BAL** | `wallet_balance < 100` 원 이하 도달 (파산) | `TICKET` x 1 (부활 패키지) | 24시간 |
| **TRG_ABUSE_DET** | 동일 패턴 10회 반복 또는 비정상 승률 | **개입 차단 및 경고 알림** | 즉시 |
| **VIP_WELCOME** | VIP 잠재고객 가입 즉시 매칭 시 | `GOLDEN_HOUR` 즉시 발동 | 1회 |

### 1.2 개입 프로세스 규격
1.  **Detection**: `InterventionWorker`가 Redis 스트림에서 이벤트 수신.
2.  **State Check**: 해당 트리거의 쿨다운(`golden:v2:cooldown:*`) 여부 확인.
3.  **Staging**: `v2_golden_intervention_log` 테이블에 `PENDING_APPROVAL` 상태로 인서트.
4.  **Admin Action**: 관리자가 CRM 대시보드에서 `SENT` (승인) 또는 `REJECTED` (거절) 처리.
5.  **Execution**: `SENT` 시 즉시 유저 인벤토리 지급 및 Push 발송.

---

## 2. 통합 지출 및 재화 소목 정책 (Integrated Spending Policy)

본사 환전, 금고 출금, 상점 구매를 통합하여 유저의 '진짜 지출'을 관리합니다.

### 2.1 지출 소스 정의 (Spending Sources)
| 소스 코드 | 명칭 | 데이터 출처 | 처리 우선순위 |
| :--- | :--- | :--- | :--- |
| **HQ_W** | HQ 환전 | 본사 환전 CSV 붙여넣기 | 1순위 (실제 현금) |
| **VAULT_W** | 금고 출금 | V2 관리자 출금 승인 | 2순위 (포인트 출금) |
| **SHOP_U** | 상점 사용 | V2 상점 아이템 구매 | 3순위 (비캐시성 지출) |

### 2.2 재화 소모 우선순위 (FIFO/LIFO Rules)
1.  **TRIAL 재화**: 만료 시간이 가장 빠른 것부터 소모 (FIFO).
2.  **보너스 티켓**: 최근에 얻은 것부터 소모 (LIFO).
3.  **원금/포인트**: 최종 유료 자산 소모.

---

## 3. 입금 지연 생존 전략 (Latency Survival v4.1)

외부 데이터 지연 시 유저의 게임 경험이 단절되지 않도록 하는 신뢰 기반 정책입니다.

### 3.1 증거 제출 및 선지급 (Provisional Grant)
- **증거 요건**: 금액, 입금 날짜(오늘/어제), 시간, TX ID 필수 제출.
- **즉시 지급**: 검증 전 `ROULETTE_TICKET x 3` 즉시 지급 및 혜택 한도 유예.
- **제한(Rate Limit)**: 유저당 **시간당 최대 3회**까지만 신고 가능.

### 3.2 사후 검증 및 강력한 회수 (Strict Clawback)
- **검증**: 관리자가 실제 입금 로그와 대조하여 `VERIFIED` 또는 `REJECTED` 처리.
- **회수 공식**: `Total Clawback = 선지급액 + (선지급 재화를 사용하여 획득한 모든 당첨금)`.
- **음수 잔액 (Negative Balance)**: 회수 시 잔액이 부족하면 음수(-)로 처리하여 추후 입금 시 자동 변제.
- **부채 상태**: 회수 후 음수 잔액 유저는 `DEBTOR` 상태로 관리.

### 3.3 제재 예외 (Benefit Suspension Bypass)
- 최근 24시간 내 `PENDING` 또는 `PROVISIONAL` 증거가 존재하면 제재를 일시 해제.

---

## 4. 고도화된 ROI 및 분석 모델 (Performance Metrics)

모든 운영 액션의 정당성은 ROI 수치로 증명되어야 합니다.

### 4.1 ROI 계산 상세 공식
$$ROI (\%) = \frac{(Actual Return - Intervention Cost)}{Intervention Cost} \times 100$$
- **Cost (비용)**: 지급된 티켓/포인트의 설정 원가 (예: 티켓 1장 = 100원).
- **Return (수수료/매출)**: 개입 후 24시간 내 발생한 `Vault Spent` + 리텐션 기여 가치.

### 4.2 가치 변환 환산표 (Value Conversion)
- **로그인 성공**: 50원 (DAU 가여도).
- **광고 시청**: 10원 (eCPM 환산).
- **게임 플레이 (1회)**: 5원 (네트워크 활성 가치).

---

## 5. 골든아워 운영 세부 규칙 (Golden Hour Detail)

### 5.1 활성화 모드
- **AUTO**: 시스템 설정된 시간(21:30~22:30)에 자동 트리거.
- **FORCE_ON / FORCE_OFF**: 운영 긴급 상황 시 수동 강제 제어.

### 5.2 게이트키퍼 전략 (Gatekeeper)
전역 골든아워가 활성화되더라도, 개별 게임의 `enable_golden_hour` 설정이 `False`인 경우 해당 게임에서는 배율 혜택이 적용되지 않습니다. (점진적 적용 가능)

---
> [!CAUTION]
> **음수 잔액(Negative Balance)** 발생 시 유저는 입금 전까지 모든 혜택 수령이 차단되며, 시스템은 이를 `DEBTOR` 상태로 관리합니다. 회수 로직 수정 시 반드시 `LatencySurvivalService`의 재귀적 당첨금 추적 로직을 검증하십시오.

---

## 변경 이력
- v2.3 (2026-02-07): Latency Survival 선지급/제재 예외 정책 최신화.
