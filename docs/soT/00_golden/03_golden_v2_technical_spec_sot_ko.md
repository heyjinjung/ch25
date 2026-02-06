# 03. Golden V2 Technical Spec SoT (Master Expansion v2.3)

**문서 타입**: Technical & Engineering Specification (Highest Detail)
**버전**: v2.3 (2026-02-06 - Absolute Maximum Expansion)
**상태**: ✅ Active SoT (Implementation Reference)

---

## 1. 아키텍처 및 시스템 컴포넌트 (Detailed Architecture)

Golden V2는 마이크로서비스 지향의 이벤트 중심 아키텍처를 채택하고 있으며, 실시간성(Latency)과 데이터 무결성(Integrity)을 동시에 보장합니다.

### 1.1 컴포넌트 레이어 상세
1.  **Ingestion Layer**: Redis Stream (`ch25_events`)을 통해 초당 수천 건의 게임 로그를 실시간 수집.
2.  **Logic Layer**: `InterventionWorker` (Python/Celery)가 룰셋을 평가하고 개입 추천 생성.
3.  **Persistence Layer**: PostgreSQL (RDBMS)은 모든 원장과 로그의 최종 권위자(SoT). Redis는 성능 가속을 위한 실시간 캐시.
4.  **Admin CRM**: React/TypeScript 기반 관제 센터. WebSocket을 통한 실시간 데이터 스트리밍 서비스.

---

## 2. 데이터베이스 스키마 및 물리 모델 (Physical Data Model)

### 2.1 핵심 엔티티 상세 명세 (Entity Metadata)

#### 2.1.1 `v2_golden_intervention_log` (개입 감사 로그)
시스템이 유저에게 수행한 모든 개입의 증거를 보존합니다.
| 물리 컬럼명 | 타입 | 제약 요건 | 설명 |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PK, Serial | 대시보드 조회를 위한 고유 식별자. |
| `user_id` | INTEGER | FK (v2_user), Indexed | 개입 대상 유저 식별. |
| `trigger_id` | VARCHAR(50) | Not Null, Indexed | `TRG_LOSE_5`, `TRG_BAL_DROP_50` 등 식별자. |
| `status` | VARCHAR(20) | Default: 'SENT' | `PENDING_APPROVAL`, `APPROVED`, `REJECTED`, `SENT`. |
| `user_balance_before`| FLOAT | Nullable | 개입 발생 직전의 유저 잔액 (Context). |
| `recent_results` | VARCHAR(50) | Nullable | 연패 감지 시의 결과 시퀀스 (예: "L,L,L,L,L"). |
| `created_at` | DATETIME | Default: UTC_NOW | 개입 발생 및 기록 시각. |

#### 2.1.2 `v2_spending_ledger` (지출 통합 원장)
서비스 내/외부의든 지출 활동을 KRW 가치로 정규화하여 기록합니다.
- **Deduplication Strategy**: `spending_source` + `ref_id` 조합의 `transaction_id` 유니크 제약 사용. (예: `HQ_W_12345678`)
- **Operational Date Logic**: `SpendingLoggerService.get_operational_date_kst`를 통해 **오전 09:00 KST**를 기점으로 일자 관리.
- **Conversion Rate**: `POINT_TO_KRW_RATE = 1` 고정 적용.

---

## 3. 백엔드 서비스 명세 (Service Implementation SOT)

### 3.1 `SpendingLoggerService` (Python)
지출 기록의 아토믹(Atomic) 처리를 보장하는 핵심 싱글턴 서비스입니다.
- **`log_hq_withdrawal`**: 본사 환전 데이터를 인서트하며 `transaction_id`를 통해 중복 입력을 원천 차단.
- **`convert_to_krw`**: `CURRENCY_TYPE`에 따른 가치 환산 수행 (KRW, POINT, G_W 등).
- **`get_operational_date_kst`**: 타임존(ZoneInfo: Asia/Seoul) 및 서머타임 변수 고려한 일자 계산.

### 3.2 `LatencySurvivalService` (Python)
- **`submit_evidence`**: 유저의 TX ID 및 금액 증거를 임시 테이블(`v2_user_deposit_evidence`)에 저장.
- **`provisional_grant`**: 인벤토리 서비스 호출을 통해 티켓 즉시 선지급.
- **`recursive_clawback`**: 선지급 시점 이후의 모든 당첨 기록을 분석하여 회수 대상 금액 산출.

---

## 4. API 컨트랙트 상세 (API Specifications)

### 4.1 Golden Intervention (Admin/Internal)
- **`POST /api/v2/golden/intervention/resolve`**
    - **Request Payload**:
        ```json
        {
          "event_type": "LOSS_STREAK",
          "data": { "loss_streak": 5, "balance": 1500 }
        }
        ```
    - **Response Payload**:
        ```json
        {
          "eligible": true,
          "reward_type": "TICKET",
          "reward_amount": 5,
          "roi_percent": 321.5,
          "meta": { "last_game": "DICE" }
        }
        ```

### 4.2 Latency Survival (Public/User)
- **`POST /api/v2/economy/latency/report`**
    - **Request**: `amount: int, date: str, time: str, tx_id: str`
    - **Limit**: 동일 유저 60분 내 3회 초과 시 `429 Too Many Requests` 반환.

---

## 5. Redis 키 및 성능 디자인 (Redis Schema v2)

### 5.1 유저 상태 캐시 (User Health Metrics)
- `golden:v2:user:{id}:session`: 세션 시작 잔액 및 진입 시각 (TTL: 24h).
- `golden:v2:user:{id}:pity`: 보정 확률(Pity Count) 누적치.
- `golden:v2:audit:admin:{id}:last_action`: 관리자별 마지막 승인/거절 시각 (어뷰징 방지용).

### 5.2 글로벌 서킷 브레이커 (Circuit Breaker)
- `golden:v2:cb:global:limit`: 당일 총 보상 지급 한도.
- `golden:v2:cb:global:spent`: 현재까지 소진된 보상액.
- `golden:v2:cb:status`: 시스템 전체 활성/차단 유무 (`ACTIVE` | `HALTED`).

---

## 6. 프론트엔드 연동 맵 (FE Routing Map)

| 기능 | 페이지 컴포넌트 | API 서비스 함수 | 특징 |
| :--- | :--- | :--- | :--- |
| **관제 대시보드** | `GoldenRealTimePage.tsx` | `useGoldenEventStream()` | SSE/WS 실시간 펄스 출력. |
| **개입 승인** | `GoldenCRMPage.tsx` | `approveIntervention()` | 일괄 승인 및 Transaction Rollback 지원. |
| **지연 매칭** | `LatencySurvivalPage.tsx` | `verifyEvidence()` | 최근 24시간 입금 로그와 Cross-Match. |
| **잠재고객 연결** | `ProspectLinkingPage.tsx` | `linkProspectUser()` | 수동 `cc_id` 매핑 및 VIP 매칭 알림. |

---
> [!IMPORTANT]
> 본 문서는 엔지니어링 표준이며, 모든 코드 변경(PR)은 본 명세의 키 명칭과 데이터 타입을 준수해야 합니다. 특히 Redis 키의 TTL 설정 누락은 메모리 부족의 원인이 되므로 엄격히 관리하십시오.
