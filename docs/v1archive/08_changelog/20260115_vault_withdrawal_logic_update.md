# 2026-01-15 개발 로그 - 금고 출금 조건 로직 및 UI 개편

## 작업 개요
- 금고 출금 조건을 백엔드 로직(티어별 조건, 7일 기준)과 프론트엔드 표기가 일치하도록 수정.
- 출금 조건 모달(UI)을 Neon Lime 테마로 리프레시하여 시인성 개선.
- 관련 로직 검증을 위한 테스트 케이스 추가 및 검증 완료.

## 백엔드
- `app/api/routes/vault.py`
  - `/status` 엔드포인트 응답 로직 수정.
  - 고정값(30회/1만원) 대신 유저 세그먼트(Common, VIP, Whale, At Risk)에 따른 동적 목표값 반환.
  - 플레이 횟수 및 입금액 집계 기간을 '오늘'에서 '최근 7일'로 변경 (`UserSegmentService` 로직과 일치).
    - **Whale**: 7일 입금 300만 이상 → 조건 면제 (0회/0원).
    - **VIP**: 7일 입금 50만 이상 → 15회 / 5,000원.
    - **Common**: 기본 → 30회 / 10,000원.
    - **At Risk**: 위험군 → 100회 / 30,000원.

## 프론트엔드 (Vault Withdrawal Modal)
- `src/components/modal/WithdrawalConditionsModal.tsx`
  - 텍스트 수정: "오늘 게임 30회" → "최근 7일 게임 {target}회".
  - 디자인 변경: Emerald 테마 → **Neon Lime (`lime-500`)** 테마 적용.
  - 다크 글래스모피즘 + 라임색 글로우 효과로 가시성 확보.

## 테스트 및 검증
- 검증 테스트 작성 (`tests/test_vault_withdrawal_conditions_v2.py` - 검증 후 삭제됨).
  - 유저 티어별(Common, VIP, Whale) 목표값 반환 로직 검증 완료.
  - 7일 입금 이력에 따른 자동 등급 분류 및 조건 완화 동작 확인.
  - **결과**: 모든 시나리오 통과 (Success).
