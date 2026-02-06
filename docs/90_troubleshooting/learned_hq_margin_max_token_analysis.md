# HQ 마진 CSV 임포트 및 분석: 심층 분석 (최대 토큰 학습)

**작성일**: 2026-02-02
**상태**: 학습 참조 (Learned Reference)
**컨텍스트**: "최대 토큰 분석기" 요청 대응 및 **Phase 2~4 + Cross-Domain 확장 반영**

## 1. 시스템 개요 (System Overview)

**HQ 마진 CSV 임포트(HQ Margin CSV Import)** 기능은 본사(HQ)의 재무 데이터(Excel/CSV)와 V2 골든 시스템(Golden System)을 연결하는 **재무적 척추(Financial Backbone)**입니다.
단순한 데이터 적재를 넘어, `@이해.md`에서 정의한 **"관제(Observe) → 판단(Judge) → 개입(Intervene)"**의 골든 루프(Golden Loop)에서 **"판단"의 핵심 기준**을 제공합니다.

### 핵심 역할
1.  **유저 분류 (Classify)**: `VIP`, `WHALE` 등 재무적 가치 기반 세그먼트 부여.
2.  **신뢰 기준 (Trust Baseline)**: `Latency Survival` 등의 신뢰 기반 서비스에서 유저의 신용도(Credit)를 보증.
3.  **LTV 예측 (LTV Prediction)**: `ROI Analysis`에서 마케팅 비용 집행의 근거가 되는 유저 가치 산출.

---

## 2. 상세 데이터 흐름 & Phase 확장

### 2.1 Core Flow (Ingestion & Match)
1.  **수집 (Ingestion)**: `CSVImportPage` → `HQMarginImportService`.
2.  **검증 (Validation)**: 인코딩(`cp949`/`utf-8`) 및 필수 컬럼(`총 운영 마진` 등) 확인.
3.  **매칭 (Matching)**: `cc_id` (1순위) > `nickname` (2순위).
4.  **액션 (Action)**: `V2UserSegment` 업데이트 또는 `HQProspectiveUser` 생성.

### 2.2 Phase 2: 운영 대시보드 (Ops Dashboard)
*   **통합 뷰**: `OpsHQMarginStatsDto`를 통해 `VIP`, `WHALE`, `AT_RISK` 규모를 실시간 시각화.
*   **기회 포착**: 아직 가입하지 않은 고액 유저(`HQProspectiveUser`)를 "잠재 VIP"로 표시하여 마케팅 타겟 제공.

### 2.3 Phase 3: 잠재 고객 관리 (Prospective Users)
*   **Shadow Table**: 미가입 유저를 `hq_prospective_user`에 저장.
*   **On-Join Hook**: `AuthService` 가입 시점에 닉네임 매칭을 통해 즉시 VIP 혜택 적용. (가입 경험 극대화)

### 2.4 Phase 4: 골든 프로젝트 정렬 (Golden Alignment)
*   **Intervention Trigger**: VIP 등급 부여 시 "Golden Welcome" 이벤트 자동 트리거.
*   **Golden Hour**: 본사 충전 패턴(`charging_data.db`)을 분석하여 최적의 골든아워 시간대 추천.

---

## 3. 크로스 도메인 통합 분석 (Cross-Domain Integration)

본사 마진 데이터는 단순한 정적 데이터가 아니라, V2의 다른 동적 시스템들과 결합될 때 진정한 가치를 발휘합니다.

### 3.1 vs ROI Analysis (마케팅 효율)
*   **개념**: `ROI = (Predicted LTV / Marketing Cost) * 100`
*   **연동**: HQ 마진 데이터는 `Predicted LTV`의 가장 강력한 근거입니다.
    *   과거에 1,000만 원 이상 마진을 남긴 유저(`VIP`)에게는 10만 원 상당의 `Targeted Grant`를 지급해도 ROI가 `10,000%`로 산출되어 **과감한 개입 정당성**을 부여합니다.

### 3.2 vs Game Log (행동 분석)
*   **상호보완**:
    *   **HQ Margin**: 정적(Static), 장기적(Long-term), 재무적(Financial) 데이터.
    *   **Game Log**: 동적(Dynamic), 실시간(Real-time), 행동적(Behavioral) 데이터.
*   **통합 인사이트**:
    *   **진정한 위험군(True Risk)**: `HQ Margin > 0` (가치 있음) + `Game Log Loss Streak > 5` (현재 고통받음) = **최우선 개입 대상**.
    *   단순히 돈을 잃는 유저가 아니라, "우리에게 돈을 벌어다 주는 유저가 지금 잃고 있을 때" 개입합니다.

### 3.3 vs Latency Survival (지연 입금 생존)
*   **신뢰 모델**: "돈은 보냈지만 아직 안 들어온" 유저에게 선지급을 할 때, 누구를 믿을 것인가?
*   **적용**: `HQ Margin`이 높은 VIP 유저는 이미 신뢰가 증명된 유저입니다.
    *   VIP: 선지급 한도 증액, 심사 패스(Auto-Approve).
    *   Newbie: 기본적인 Rate Limit 적용.

---

## 4. 세그먼트 분류 로직 (Segmentation Logic)

| 우선순위 | 세그먼트 | 조건 | 비즈니스 로직 및 Fail-Safe |
| :--- | :--- | :--- | :--- |
| 1 | **Explicit** | 컬럼 `세그먼트` 존재 | 본사 수동 지정 최우선 (오타 허용) |
| 2 | **VIP** | `Margin > 1,000,000` | 핵심 자산. Latency Survival 등 모든 신뢰 서비스의 VIP 대우. |
| 3 | **AT_RISK** | `Inactive > 7` & `Margin > 0` | "돈 되는 유저가 떠나고 있음". 복귀 캠페인 타겟. |
| 4 | **WHALE** | `Charge > 5,000,000` | 잠재 VIP. 충전액은 크지만 마진이 낮음(따거나 본전). |
| 5 | **COMMON** | 나머지 | 일반 운영 대상. |

---

## 5. 트러블슈팅 포인트 (Troubleshooting)

### 5.1 데이터 정합성
*   **인코딩**: 한국어 CSV(`cp949`, `euc-kr`) 자동 감지 실패 시 `utf-8-sig`로 변환 후 재업로드 권장.
*   **중복/모호함**: 동명이인(Nickname Duplication) 발생 시 시스템은 **안전하게 Skip**하고 Audit Log에 기록합니다. (잘못된 혜택 지급 방지)

### 5.2 성능 이슈
*   **Bulk Insert**: 10만 건 이상 데이터 처리 시 `SQLAlchemy core insert` 또는 `bulk_save_objects` 사용 필수. (현재는 Row-by-Row)

### 5.3 운영 실수 방지
*   **Audit Trail**: 누가(`admin_id`), 언제, 몇 명을 업데이트했는지 `AdminAuditLog`에 영구 기록되어 롤백/추적 가능.

## 6. 결론 (Conclusion)

HQ 마진 데이터는 골든 V2 시스템의 **혈액**과 같습니다.
- **Ops Dashboard**를 통해 흐름을 보여주고 (가시성),
- **Prospective User**를 통해 새로운 피를 수혈하며 (획득),
- **ROI/Game Log/Latency**와 결합하여 유기적으로 순환합니다 (리텐션).

이 시스템은 단순한 "파일 업로드"가 아니라, **"증거 기반(Evidence-based)의 자동화된 운영"**을 가능케 하는 핵심 인프라입니다.
