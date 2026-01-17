---
Project: Golden
Type: TechSpec
Author: Antigravity (AI) & USER
Status: Draft
Last Updated: 2026-01-17
---

# predicted_ltv 기반 보상 자동화 & ROI 증명 (v1)

본 문서는 **predicted_ltv**를 기반으로 사용자별 **최대 마케팅 비용 산정**, **보상 규모 자동 결정**, **ROI 증명 공식**을 정의합니다.

---

## 1) 핵심 목표
- 유저의 가치(LTV)에 비례해 마케팅 비용을 자동 산정
- 과도한 비용 지출 방지(Upper Bound)
- ROI가 **항상 양(+)**이 되도록 보상 규모 통제

---

## 2) 최대 허용 비용 (Cmax) 산출

### 정의
- **predicted_ltv**: AI 모델(perCLTV 등)이 예측한 유저 생애 가치
- **Target_ROI_Ratio**: 권장 LTV:CAC 비율 (기본 3:1)

### 공식
$$
C_{max} = \frac{predicted\_ltv}{Target\_ROI\_Ratio}
$$

### 예시
- predicted_ltv = 100,000원
- Target_ROI_Ratio = 3
- **Cmax = 33,333원**

---

## 3) 보상 규모 자동 결정 로직

### 입력 변수
- $LTV_{pred}$: predicted_ltv
- $P_{churn}$: 이탈 확률 (0~1)
- $R_{base}$: 세그먼트 기본 보상율 (VIP/캐주얼 등)

### 기본 공식
$$
Reward\_Size = LTV_{pred} \times R_{base} \times P_{churn}
$$

### 제약 조건 (필수)
- $$Reward\_Size \le C_{max}$$
- 좌절 상태(연패, 급락 등)일수록 $P_{churn}$ 가중치 상향

---

## 4) ROI 증명 공식

### 정의
- **Marketing_Cost** = 실제 보상 비용 (쿠폰/토큰)
- **Predicted_LTV** = 보존 가능한 가치

### 공식
$$
ROI(\%) = \frac{Predicted\_LTV - Marketing\_Cost}{Marketing\_Cost} \times 100
$$

### 사례 (LTV 100,000원 / 쿠폰 5,000원)
- Predicted_LTV = 100,000
- Marketing_Cost = 5,000

$$
ROI = \frac{100,000 - 5,000}{5,000} \times 100 = 1,900\%
$$

**결론:** ROI가 +1,900%로 매우 효율적

---

## 5) 의사결정 규칙 (Free Spin vs Cashback)

### 기본 원칙
- **캐시백**: 고가치/고액 베팅 유저의 손실 회복에 최적
- **무료 스핀**: 캐주얼/재참여 유저의 몰입 회복에 최적

### 룰 베이스 (Dynamic Rules)
- **신규 유저 (가입 < 7일)**:
    - **LTV 컷 면제**: 기여도 무관하게 초기 정착 지원.
    - **Micro-Reward**: 1~5천 원 소액 위주 (탐색 유도).
- **VIP (LTV 높음 + 급락)**:
    - **Big-Reward**: 손실액 비례 캐시백 (회복 유도).
- **Time-Slot Budget**:
    - `09:00~18:00`: 예산 30% 할당 (Early Bird).
    - `18:00~09:00`: 예산 70% 할당 (Night Owl Focus).

---

## 6) 운영 적용 제언
- **고가 LTV 유저**가 **연패/잔고 급락** 신호 발생 시, 실시간 보상 노출
- 관리자의 수동 쿠폰 설정 없이 **자동 보상 결정**
- WebSocket/인앱 토스트로 즉시 개입 → 골디락스 존 유지

---

## 7) 최소 구현 체크리스트
### 입력 소스/갱신 주기 (운영 확정)
- **predicted_ltv 소스**: `ExternalRankingData.deposit_amount` 기반 임시 계산
- **갱신 주기**: **일 1회 배치** (`scripts/update_predicted_ltv_daily.py`)

### ROI 로그 저장 (신규 테이블)
- 테이블: `retention_roi_log`
- 필드: `user_id`, `predicted_ltv`, `marketing_cost`, `roi_percent`, `event_type`, `reward_type`, `reward_amount`, `created_at`

## 7) 최소 구현 체크리스트
- [x] predicted_ltv 필드 준비
- [ ] churn 위험 점수(P_churn) 계산 로직 준비
- [ ] 세그먼트별 R_base 테이블 정의
- [ ] Reward_Size ≤ Cmax 강제
