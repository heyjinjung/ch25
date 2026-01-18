# 기술 사양서: 적응형 리텐션 엔진 (Adaptive Retention Engine) v1.0

본 문서는 `system_diagnosis_report_v2.md`에서 제기된 '정적 메카닉'의 한계를 극복하고, 유저의 상태에 실시간으로 반응하는 자동화 엔진의 설계를 다룹니다.

---

## 1. 설계 원칙: "Reactive to Adaptive"
1.  **Event-Driven**: 관리자의 수동 개입이 아닌, 유저의 행위(Event)가 보상을 트리거한다.
2.  **Psychology-Centric**: 손실 회피(Loss Aversion)와 골디락스 존(Goldilocks)을 알고리즘화한다.
3.  **Zero-Latency**: 이탈 결정 순간(Golden Time)을 놓치지 않기 위해 실시간(In-memory)으로 처리한다.

---

## 2. 핵심 모듈 설계

### A. 실시간 감정 센서 (Sentiment Sensor)
*   **신규 데이터 필드 (Schema Update)**:
    *   `current_win_loss_streak`: 현재 연속 승패 기록 (정수형, 예: -3은 3연패). DDA 트리거의 핵심 지표.
    *   `session_balance_delta`: 세션 시작 대비 자산 변동폭. 급감(Rapid Depletion) 감지용.
    *   `current_psychological_state`: AI가 판정한 유저 심리 상태 (Enum: BORED, FRUSTRATED, IN-FLOW).
    *   `churn_probability_score`: AI 연동 이탈 위험 점수 (0~100).
    *   `predicted_ltv`: 고객 생애 가치 예측치 (보상 규모 결정용).
    *   `user_segment_tag`: 유저 페르소나 (Whale, Casual 등).

### B. 적응형 보상 제어기 (Adaptive Reward Controller)
*   **분석 아키텍처**: NetEase의 **SGMTL(Sequential Gate Multi-task Learning)** 구조 도입.
    *   순차적으로 데이터를 필터링하여 유저의 '좌절' 지점을 정확히 포착.
*   **핵심 API**:
    *   **Dynamic Task Trigger API**: 심리 상태가 'FRUSTRATED'일 때 맞춤형 '회복 과제' 자동 노출.
    *   **Adaptive Difficulty API (DDA)**: `current_win_loss_streak`가 특정 임계치 도달 시 승률 보정.

### C. 자동 개입 트리거 (Automated Intervention)
*   **페르소나별 타겟팅 (Targeting by Persona)**:
    *   **고위험 유저 (High-risk)**: `bet_size_variation` > 200% 감지 시 즉시 'VIP 전용 캐시백' 오퍼 트리거.
    *   **안전형 유저 (Safe/Casual)**: 7일 연속 접속 시 '명예의 전당' 배지 부여 및 팀 배틀 초대.
*   **핵심 API**:
    *   **Real-time Intervention API**: `session_balance_delta` 임계치 도달 시 즉시 캐시백 팝업 실행.
    *   **Predictive Re-engagement API**: 이탈 전 유저별 최적 마케팅 채널(Push/SMS) 자동 활성화.

---

## 2.1 현재 구현 범위 (SoT, v1)
- **심리 상태 산출**: 워커가 이벤트 기반으로 계산/저장
    - LOSS_STREAK/ASSET_DEPLETION → `FRUSTRATED`
    - SESSION_END → `BORED`
    - 그 외 기본값 → `IN_FLOW`
- **저장 위치**: Redis `ch25:state:{user}:psych_state`
- **이벤트 payload 포함 필드**: `psychological_state`

---

## 3. 지능형 커머스 설계 (Intelligent Commerce)

### A. 지능형 인벤토리 (Intelligent Inventory)
*   **상태 기반 UI (Context-Aware UI)**:
    *   연패 중인 유저의 인벤토리 상단에 '확률 보정 아이템'이나 '재도전권'을 하이라이트 노출.
*   **보상 가시화 (Milestone Visualizer)**:
    *   시즌 패스 및 레벨업 성취도를 리얼타임 그래프로 시각화하여 수집 의욕 고취.

### B. 동적 지능형 상점 (Dynamic Intelligent Shop)
*   **구호 패키지 (Recovery Kits)**:
    *   자산이 30% 이하로 떨어진 유저에게만 노출되는 '한정판 재기 지원 패키지' 트리거.
*   **초개인화 오퍼 (Targeted Offers)**:
    *   고액 베터에게는 VIP 전용 상품, 신규 유저에게는 첫 구매 유도 상품을 AI가 실시간 배치.
*   **가변 상품 구성 (Gamified Shop)**:
    *   특정 미션 완료 시에만 상점의 히든 아이템이 해금되는 동적 라인업 구축.

---

## 4. 데이터 모델 확장 (스키마 변경안)

### `user_retention_state` (New Table)
| 필드명 | 타입 | 설명 |
| :--- | :--- | :--- |
| `user_id` | INT (FK) | 유저 식별자 |
| `churn_risk_score` | FLOAT | 0~100 사이의 이탈 위험도 |
| `current_loss_streak`| INT | 현재 연속 패배 횟수 |
| `last_event_type` | STRING | 마지막으로 감지된 심리 상태 (예: 'STRESSED', 'BORED') |
| `assigned_cohort` | STRING | AI가 분류한 유저 페르소나 (예: 'Whale', 'Casual') |

---

## 4. 실행 단계 (Implementation Phases)

*   **1단계 (Data Monitoring)**: `ActivityRecord`에 베팅 결과와 잔액 변화를 실시간으로 기록하는 센서 구현.
*   **2단계 (Rule Engine)**: "5연패 시 1,000원 지급"과 같은 Hard-coded 룰 기반의 자동 개입 구현.
*   **3단계 (AI Optimization)**: 유저 반응 데이터를 학습하여 보상 종류와 타이밍을 최적화하는 머신러닝 모델 도입.

---

## 5. 기대 효과
*   **Day 1 리텐션**: 유저 좌절 시점의 즉각 개입으로 이탈률 15% 이상 감소 기대.
*   **운영 효율**: 관리자의 수동 모니터링 및 지급 업무 80% 자동화.
*   **LTV 증대**: 유저별 '골디락스 존' 유지를 통한 평균 체류 시간 및 베팅 활성도 증가.
