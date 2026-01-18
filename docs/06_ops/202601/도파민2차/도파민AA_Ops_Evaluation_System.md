# 📊 Ops Evaluation System (운영 성과 평가 시스템)

**작성일**: 2026-01-16
**목적**: Ops Plan 실행 결과를 **1일/3일/7일(D+1, D+3, D+7)** 단위로 자동 분석하여, 운영 효율과 경제/리텐션 임팩트를 정량 평가함.

---

## 1. 평가 주기 및 핵심 지표 (Evaluation Cycle)

단순히 시점별로 하나씩 보는 것이 아니라, **반응성/효과성/건전성 3대 축을 매 주기(D+1/3/7)마다 입체적으로 추적**합니다.

| 구분 (Axis) | D+1 (즉각 반응) | D+3 (단기 효과) | D+7 (주간 안착/부작용) |
| :--- | :--- | :--- | :--- |
| **🚨 반응성**<br>(Response) | **초기 수령률 & 에러율**<br>- 오픈런 트래픽, 시스템 오류<br>- "잘 도착했나?" | **지연 수령률**<br>- 뒤늦게 소식 듣고 온 유저<br>- "놓친 유저는 없나?" | **최종 도달률**<br>- 전체 타겟 대비 최종 수령<br>- "목표치 달성했나?" |
| **📈 효과성**<br>(Effectiveness) | **DAU 스파이크**<br>- 이벤트 당일 접속 급증<br>- "이슈몰이 성공?" | **D+3 리텐션**<br>- 보상받고 3일 뒤 또 왔나<br>- "체리피커 vs 찐유저" | **습관 형성 (Sticky)**<br>- 주간 플레이 타임 변화<br>- "게임 패턴이 강화됐나?" |
| **⚖️ 건전성**<br>(Soundness) | **일시적 인플레이션**<br>- 재화 총량 급증 폭<br>- "시장 충격 얼마나?" | **소진 속도 (Burn Rate)**<br>- 받은 돈을 쓰고 있는가<br>- "경제 순환 시작?" | **잔존 밸런스 회귀**<br>- 인플레 해소 및 안정화<br>- "후유증은 없는가?" |

**👉 관리 포인트**:
- **반응성**이 낮으면? → 알림(Push/DM) 채널 문제 체크.
- **효과성**이 낮으면? → 보상이 매력적이지 않거나(Salt), 너무 퍼줌(Cherry-picking).
- **건전성**이 깨지면? → 소각처(Sink) 부족. 다음 이벤트 보상량 축소 필요.

---

## 2. 평가 리포트 UI 설계 (Ops Report Card)

`AdminOpsPlanPage` 내 탭 또는 별도 페이지로 **'운영 성적표'**를 제공합니다.

### 2.1. 리포트 개요 (Summary Card)
*   **Grade**: `A+`, `B`, `C` (지표 기반 자동 산출)
*   **AI 코멘트**: "지난주 골든아워는 D+3 리텐션을 5%p 올렸지만, 다이아 인플레이션이 10% 발생했습니다."

### 2.2. 상세 지표 뷰 (Detail View)

#### [D+1] 실행 퀄리티
*   **Target vs Claim**: 대상자 10,000명 중 8,500명 수령 (85%)
    *   *Good*: 80% 이상
    *   *Warning*: 50% 미만 (알림 오류 의심)
*   **Execution Errors**: 시스템 실패 0건 (성공)

#### [D+3] 리텐션 임팩트 (Cohort Analysis)
*   **Cohort Chart**:
    *   (A) 이벤트 대상 그룹: D+3 잔존율 45%
    *   (B) 비대상 그룹: D+3 잔존율 30%
    *   **Lift**: **+15%p 효과** (성공적인 캠페인)

#### [D+7] 경제 밸런스 (Economy Heatmap)
*   **Currency Flow**:
    *   Source (이벤트 지급): +1,000,000 DIA
    *   Sink (시스템 회수): -800,000 DIA
    *   **Net Change**: +200,000 DIA (시장 통화량 소폭 증가)

---

## 3. 데이터 파이프라인 설계 (Technical Spec)

평가를 위해서는 흩어진 로그를 모아 통계 테이블로 만드는 작업이 필요합니다.

### 3.1. 필요한 테이블 (Schema)
*   **`ops_eval_metrics`**: 일자별/캠페인별 집계 데이터
    ```python
    class OpsEvalMetric(Base):
        __tablename__ = "ops_eval_metrics"
        
        id = Column(Integer, primary_key=True)
        plan_id = Column(Integer, ForeignKey("ops_plans.id")) // 어떤 계획에 대한 평가인가
        eval_type = Column(String) // D1, D3, D7
        
        # Metrics (JSON으로 유연하게 저장)
        metrics_json = Column(JSON) 
        # 예: {"claim_rate": 0.85, "retention_lift": 0.15, "inflation": 0.02}
        
        grade = Column(String) // S, A, B, C, F
        created_at = Column(DateTime)
    ```

### 3.2. 분석 워커 (Analysis Worker)
*   **Daily Job**: 매일 새벽 4시(UTC+9) 실행
*   **Logic**:
    1.  `D-1`, `D-3`, `D-7` 날짜에 실행된 `OpsPlan` 조회.
    2.  `OpsLog` (지급 로그)와 `UserActiveLog` (접속 로그)를 조인.
    3.  수령 유저의 접속 유지율 계산.
    4.  `ops_eval_metrics` 테이블에 결과 적재(Upsert).

---

## 4. 구현 로드맵 (Roadmap)

1.  **Phase 1 (Data)**: `OpsEvalMetric` 모델 생성 및 `Daily Analysis Script` 작성. (통계 데이터 확보)
2.  **Phase 2 (UI)**: Admin 페이지에 성적표 그래프(`Recharts` 활용) 구현.
3.  **Phase 3 (Auto)**: 평가 점수(S~C) 알고리즘 정교화 및 슬랙/텔레그램 알림 연동.

---

## 5. 기대 효과
*   **데이터 기반 의사결정**: "감"으로 운영하던 이벤트를 수치로 증명 가능.
*   **먹튀 방지**: 체리피커(보상만 받고 이탈) 비율을 D+1, D+3 지표로 즉시 파악 가능.
*   **자산 방어**: 과도한 재화 풀림을 D+7 체크로 조기 경보.
