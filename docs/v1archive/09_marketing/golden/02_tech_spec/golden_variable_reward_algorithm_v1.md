---
Project: Golden
Type: Tech Spec
Author: NotebookLM & Antigravity
Status: Draft
Last Updated: 2026-01-17
---

# 가변 보상 알고리즘 설계서 (Variable Reward Algorithm)

본 문서는 무료 스핀의 효율을 극대화하고 유저를 '골디락스 존'에 유지하기 위한 가변 보상 스케줄링 시스템의 기술적 설계를 다룹니다.

---

## 1. 핵심 수학적 모델링 (Mathematical Models)

AI 기반 시스템은 유저의 실시간 데이터를 학습하여 보상의 빈도와 가치를 동적으로 조절합니다.

### A. 보상 빈도 모델 (Reward Frequency)
유저의 참여가 길어질수록 보상 간격을 전략적으로 조정합니다.

$$ R(t) = R_0 \cdot e^{\alpha t} $$

*   `R(t)`: 시간 t에서의 보상 확률 또는 빈도
*   `R_0`: 초기 보상 설정값
*   `α`: 인게이지먼트 계수 (유저가 몰입할수록 보상 간격을 늘려 도파민 반응 극대화)

### B. 보상 가치 체감 모델 (Value Decay)
보상 포화(Reward Saturation) 방지를 위한 가치 조절 공식입니다.

$$ V(n) = \frac{V_0}{1 + \beta n} $$

*   `V(n)`: n번째 반복 지급 시의 보상 가치
*   `V_0`: 기준 보상 가치
*   `β`: 수확 체감률 조절 계수

#### 기본 파라미터 (운영 기본값)
- `R_0 = 0.25` (초기 보상 빈도)
- `α = 0.015` (빈도 감쇠 계수)
- `β = 0.10` (가치 체감 계수)

---

## 2. 예측적 개입 로직 (Predictive Intervention)

### A. 리스크 탐지 트리거
*   **연패 임계치**: `current_win_loss_streak` <= -5
*   **자산 급감**: `session_balance_delta` >= 50% (Rapid Depletion)

### B. 보상 타이밍 최적화
*   AI가 유저 행동 패턴을 분석하여 **'결정적 순간(Moment of Truth)'** 포착.
*   단순 랜덤이 아닌, 유저가 이탈 고민을 하는 'Pause' 구간(베팅 간격이 평소보다 1.5배 길어질 때 등)에 개입.

### C. 개인화 가치 산출
*   **보상 규모** = `Predicted_LTV` * `Reward_Ratio_Limit` (예: LTV의 1~5% 이내)

---

## 3. 세그먼트별 전략 (Persona Strategy)

| 세그먼트 | 전략 키워드 | 구체적 보상 형태 |
| :--- | :--- | :--- |
| **고위험 유저 (High-risk)** | **Exclusivity** | VIP 토너먼트 입장권, 고액 캐시백 (High Variance) |
| **캐주얼 유저 (Casual)** | **Achievement** | "3판 더 플레이 시 무료 스핀 10회" (미션형 보상) |

---

## 4. 시스템 아키텍처 요구사항

*   **Real-time Event Bus**: Redis Pub/Sub을 통한 승패 시퀀스 실시간 분석.
*   **WebSocket Push**: 분석 즉시 유저 화면에 인터랙티브 팝업 노출.
    *   *(참조: `golden_realtime_architecture_v1.md`)*

---

