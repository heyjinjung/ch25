---
Project: Golden
Type: Research
Author: Antigravity (AI) & USER
Status: Approved
Last Updated: 2026-01-17
---

# 글로벌 리텐션 사례 대비 시스템 격차 분석 (Gap Analysis)

본 문서는 NetEase와 Tapas의 '초개인화된 개입' 모델과 현재 ch25 시스템의 기술적 격차를 분석하고 필요한 확장 요소를 정의합니다.

---

## 1. 현재 구조 분석 및 한계 (As-Is)

### A. ActivityRecord (활동 기록)의 한계
*   **현황**: 유저 행동(주사위, 토큰 획득 등)의 단순 나열 및 정적 로그 저장.
*   **격차**: 실시간 심리 상태(연패 분노, 지루함 등)를 추론하고 '이탈 위험군'으로 분류하는 **예측 엔진(Predictive Engine)** 결여.

### B. SeasonPass (시즌 패스)의 한계
*   **현황**: 모든 유저에게 동일하게 적용되는 선형적 마일스톤(Static Milestone).
*   **격차**: 이탈이 임박한 '결정적 순간'에 해당 유저만을 위해 동적으로 생성되는 **'맞춤형 과제(Custom-made Tasks)'** 로직 부재.

---

## 2. 글로벌 우수 사례 분석 (Benchmarking)

| 기업/시스템 | 핵심 전략 (The Core) | 우리 시스템 적용 포인트 |
| :--- | :--- | :--- |
| **NetEase (perCLTV)** | 이탈 위험도(Churn)와 가치(LTV) 동시 예측. | 로그인 트리거 시 최적화 미션 즉시 노출. |
| **Tapas (Ink 보상)** | 온보딩 퍼널 단계별 이탈 추적. | 머뭇거리는 지점(Stall Point)에서 자동 보너스 지급. |

---

## 3. 리텐션 엔진 확장 리스트 (To-Be)

### A. 데이터 필드 확장 (User/Activity Schema)
1.  **churn_probability_score**: AI가 계산한 이탈 위험도 (0~100).
2.  **predicted_ltv**: 유저 가치 기반 보상 규모 결정 기준.
3.  **user_segment_tag**: 성향 분류 (Whale, Casual, Tournament-driven 등).
4.  **last_win_loss_streak**: 실시간 승패 흐름 및 분노 수치 감지용 필드.

### B. 핵심 API 및 백엔드 로직
1.  **Dynamic Task Trigger API**: 고위험 유저 로그인 시 '특별 복귀 미션' 교체 발송.
2.  **Real-time Intervention API**: 자산 고갈/활동 급감 시 즉시 오퍼 발송.
3.  **Adaptive Difficulty API (DDA)**: 숙련도/승률에 따른 미세 조정 (골디락스 존 유지).
4.  **Predictive Re-engagement API**: 과거 반응이 좋았던 채널로 개인화 혜택 전송.

---

## 4. 결론
현재 ch25는 기록(Record)과 보상(Reward) 기능은 견고하나, 이를 지능적으로 연결하는 **'예측 및 트리거'** 로직이 실질적인 격차임. 위 확장 리스트를 우선적으로 반영하여 '살아있는 리텐션 엔진'으로 진화해야 함.
