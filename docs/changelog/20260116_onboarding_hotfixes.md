# Changelog: Onboarding Hotfixes & Vault Logic Alignment

- **Date**: 2026-01-16 (Late Afternoon)
- **Author**: GitHub Copilot
- **Related Issues**: 新규 유저 오지급, 금고 출금 조건 표시 오류, 2일차 미션 조기 달성

## 1. Vault Withdrawal Logic Alignment
- **Problem**: 실제 출금 신청(`request_withdrawal`) 로직은 "최근 3일간 게임 플레이"를 체크하지만, 상태 조회(`status`) API는 "최근 7일"을 체크하여 UI 상에서 조건 충족 여부가 불일치함.
- **Fix**:
    - `app/api/routes/vault.py` 조회 쿼리 수정.
    - `UserEventLog`(7일) → `VaultEarnEvent`(3일, SoT)로 변경.
    - 이제 UI 팝업("최근 3일 이내 30회")과 실제 백엔드 로직이 정확히 일치함.

## 2. New User Mission (Starter) Adjustments
- **Problem 1**: "2일차 출석(내일 또 봐요)" 미션의 목표치(`target_value`)가 1로 설정되어 있어, 신규 유저 가입 당일(1회 접속) 바로 완료되는 버그.
- **Problem 2**: 스타터 미션 보상 금액 조정 필요.
- **Fix (Admin/DB Operation)**:
    - `starter_attendance` (ID 20) Target Value: `1` → `2` 로 수정 (당일 완료 방지).
    - Starter Missions (ID 17~20) Reward Amount: 모두 `2,000 KRW`로 상향 조정.

## 3. Welcome Auto-Claim Logic Patch
- **Problem**: 웰컴 자동 지급(`claim-welcome`) 시, 의도치 않게 스타터 미션까지 포함될 위험 존재.
- **Fix**: 
    - `new_user_onboarding.py` 내 `WELCOME_AUTO_CLAIM_KEYS` 리스트 분리.
    - 가입 즉시 지급은 `NEW_USER_WELCOME_CASH` (ID 10), `NEW_USER_WELCOME_TICKET` (ID 11) 2종만 수행되도록 제한.

## 4. Verification
- **User 114**: `VaultEarnEvent` 기반 게임 플레이 카운트 정상 확인.
- **User 116**: 신규 가입 시 2일차 미션 미완료(0/2 or 1/2) 상태 유지 확인 (목표치 상향 적용됨).
- **DB Check**: 미션 17~20번 보상금 2,000원 적용 확인.
