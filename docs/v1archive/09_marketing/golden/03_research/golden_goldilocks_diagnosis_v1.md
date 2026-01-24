---
Project: Golden
Type: Research
Author: Antigravity (AI) & USER
Status: Approved
Last Updated: 2026-01-17
---

# 골디락스 존(Goldilocks Zone) 진단 및 실시간 감지 전략

본 문서는 유저가 지루함과 좌절 사이의 최적 균형 상태인 '골디락스 존'에 머물게 하기 위한 실시간 감지 필드 분석 및 구현 방안을 다룹니다.

---

## 1. 현재 시스템 데이터 현황 분석

*   **ActivityRecord (활동 기록)**: 게임별 수행 이력이 기록되나, '연속 패배'를 즉시 파악하기 위해 로그 역추적이 필요함 (실시간성 부족).
*   **Game Token Ledgers (토큰 원장)**: 잔액 기록은 있으나 '변화율(Delta)'을 실시간 추적하지 않음.
*   **Bet Size Variations (베팅 변동)**: 급격한 베팅 금액 변화는 심리 변화의 핵심 지표이나 현재 필드화되어 있지 않음.

---

## 2. 실시간 감지를 위한 신규 데이터 필드 제안

유저 테이블 혹은 실시간 세션 테이블에 아래 필드를 추가하여 개입 효율성을 극대화합니다.

### ① 연속 승패 기록 필드 (Streak Tracking)
*   **필드명**: `current_win_loss_streak` (Integer)
*   **용도**: -3(3연패), +2(2연승) 등 상태 기록.
*   **효과**: 로그 스캔 없이 즉각적인 난이도 조정(DDA)이나 보너스 트리거 가능.

### ② 세션 자산 변동폭 필드 (Asset Delta)
*   **필드명**: `session_balance_delta` 또는 `rapid_depletion_flag`
*   **용도**: 세션 시작 대비 자산 급감(예: 50%↓) 모니터링.
*   **효과**: '계정 비우기' 패턴 감지 시 캐시백 등 즉각 개입.

### ③ 유저 심리 상태 태그 (Psychological State)
*   **필드명**: `current_psychological_state` (Enum)
*   **용도**: AI가 분석한 유저 상태 태깅 (Bored, Frustrated, In-flow).
*   **효과**: 상태별 맞춤형 과제(Custom-made Tasks) 동적 할당.

---

## 3. 구현 프로세스: '실시간 개입 엔진'

1.  **데이터 수집**: `ActivityRecord` 원시 데이터 수집.
2.  **필드 업데이트**: 게임 엔진 판정 즉시 `current_win_loss_streak` 등 유저 정보 갱신.
3.  **실시간 트리거**: 특정 임계치(예: 5연패) 도달 시 '좌절' 상태로 간주, 보너스 팝업 즉시 실행.

---

## 4. 결론
유저 테이블에 실시간 심리 지표(`Streak`, `Delta`, `State`)를 직접 반영하고, 이를 이탈 예측 모델과 연동하는 것이 리텐션 극대화를 위한 가장 강력한 기술적 기반입니다.
