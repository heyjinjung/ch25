# AI 리텐션 시스템 적용 개선안: "골디락스 존(Goldilocks Zone) 구축"

제시해주신 **[골디락스 존], [이탈 예측], [초개인화]** 3대 원칙을 우리 시스템(Dopamine)에 구체적으로 적용하기 위한 기술적 개선안입니다.

---

## 1. 골디락스 존(Goldilocks Zone) 구현: "최적의 몰입 상태"

**목표**: 유저가 **"너무 어렵지도(좌절), 너무 쉽지도(지루함) 않은"** 상태를 유지하도록 시스템이 실시간으로 개입(Intervention)합니다.

### A. 심리 관리 (손실 회피 역이용)
*   **현황**: 현재 게임 결과(`GAME_RESULT`)는 단순 승/패만 기록하며, 시스템은 유저가 10번 연속 져도 모릅니다.
*   **개선안 (System Spec)**:
    *   **`SentimentTracker` (감정 추적기)** 도입:
        *   최근 10판 기준 `승률`과 `자산 변동률`을 메모리에 유지.
        *   **Trigger**: `LossStreak >= 7` (7연패) 또는 `BalanceDrop >= 80%` (자산 급락).
    *   **Action (개입)**:
        *   **"배드 비트(Bad Beat) 보너스"**: "아쉽게 놓치셨군요! 위로금 1,000코인 지급." (즉시 보상)
        *   **"페이백 오퍼"**: "다음 10분간 손실액의 10%를 돌려드립니다." (재도전 유도)

### B. 지루함 방지 (가변 보상 스케줄)
*   **현황**: 룰렛/주사위의 확률과 보상은 고정적입니다.
*   **개선안 (System Spec)**:
    *   **`DynamicRewardEngine` (동적 보상 엔진)**:
        *   유저의 `PlayPattern`이 단조로워질 때(예: 같은 금액, 같은 게임 반복 50회) 발동.
    *   **Action**:
        *   **"피버 타임(Fever Time)"**: 갑자기 "다음 3판 승률 1.2배!" 팝업 노출.
        *   **"미스터리 박스"**: 게임 승리 시 1% 확률로 '히든 아이템' 드롭.

---

---

## 2. 예측형 유기체로의 진화 (Logic-based Predictive Organism)


AI/ML 인프라 없이도, **정교한 데이터 통계와 알고리즘**을 통해 '예측형 시스템'을 구현합니다.

### A. 기술 숙련도 및 상태 예측 (Statistical Trend Analysis)
*   **배경**: 복잡한 텐서 분해 대신, **시계열 데이터의 통계적 추세**를 분석하여 유저의 미래 행동을 예측합니다.
*   **구현 (SQL/Code Logic)**:
    *   **`Skill_Trend_Slope`**: 최근 7일간의 승률과 베팅 적중률의 기울기(Slope)를 계산.
    *   **`Action`**: 기울기가 0에 수렴하거나 하락세로 전환되는 **'정체 구간(Plateau)'** 감지 시, **익일 09시에** 새로운 튜토리얼이나 상위 난이도 도전 과제 자동 제안.

### B. 골든 타임 개입 (Heuristic Churn Scoring)
*   **Churn Score (이탈 위험 지수) 알고리즘**:
    *   ML 모델 대신, **가중치 기반의 룰 엔진(Weighted Rule Engine)**으로 점수 산출.
    *   **공식**: `RiskScore` = (`LogRecency` * 0.5) + (`LossStreak` * 20) + (`AssetDepletionRate` * 100)
    *   **임계점 (Score > 80)**: 유저가 앱을 켜두고 있는 **'세션 중(In-session)'**에 즉시 트리거.
*   **Triggers (Flow Keeper)**:
    *   **좌절 방지 (Anti-Frustration)**: `current_win_loss_streak` <= -5 감지 시, 다음 5판 동안 **'Hidden RTP Boost(승률 5% 보정)'** 로직 활성화. (별도 AI 서버 통신 없이 로컬 로직으로 처리)
    *   **몰입 유지 (Flow Maintenance)**: 유저가 너무 쉽게 승리(5연승)하여 지루함이 예상될 경우, "다음 판 2배 베팅 시 보너스 코인" 제안으로 긴장감 조성.

### C. 재무(RFM) 데이터 시각화
*   데이터베이스에 `user_rfm_stats` 테이블 추가:
    *   `Recency`: 마지막 플레이 경과 시간.
    *   `Frequency`: 주간 평균 접속일.
    *   `Monetary`: 누적 순손실(Net Loss) - *VIP 대우 기준*.

---

## 4. 실행 로드맵 (우선순위)

1.  **Phase 1: 데이터 센서 장착 (Data Collection)**
    *   `ActivityRecord`에 `game_result`, `balance_after`, `bet_ratio` 기록 시작.
    *   유저별 "성향 태그(Risk Profile)" 자동 계산 스크립트 작성.

2.  **Phase 2: 룰 기반 개입 (Rule-Based Intervention)**
    *   AI 모델링 전 단계로, 단순 룰 적용.
    *   IF `LossStreak >= 7` THEN `Send Bailout Message`.
    *   IF `Balance == 0` THEN `Offer Free Spin`.

3.  **Phase 3: 고도화된 휴리스틱 최적화 (Advanced Heuristics)**
    *   `RiskScore` 가중치(Weight) 자동 튜닝 (A/B 테스트 기반).
    *   이탈 점수(`RiskScore`) 기반 세그먼트 자동 이동 시스템 구축.

이 개선안은 시스템이 유저를 **"수치"**가 아닌 **"감정을 가진 게이머"**로 대우하게 만드는 시작점입니다.
