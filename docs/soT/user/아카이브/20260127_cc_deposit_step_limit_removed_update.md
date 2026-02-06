# CC Deposit XP 스텝 제한 제거 업데이트

**작성일**: 2026-01-27
**상태**: ✅ 적용 완료
**영향 범위**: CC 입금 동기화 → XP 적립 (V2 어드민 누적 입금 경로)

---

## 1. 변경 요약

- CC Deposit XP 적립에서 **일일 스텝 제한(max_steps_per_day) 로직을 완전히 제거**했다.
- 운영에서 설정값을 주더라도 더 이상 XP 적립이 스텝 기준으로 clamp되지 않는다.
- 추가로, 이번 세션에서 임시로 넣었던 **일일 300XP 캡 설정 항목은 폐기**했다.

---

## 2. 증거 기반 RCA (Systematic Debugging)

### 2.1 증상 (Symptom)
- "스텝 제한 없애라" 요구가 있으나, 설정/서비스 로직에서 스텝 상한이 실제 적용되어 XP가 제한됨.

### 2.2 원인 (Evidence)
- XP 적립 계산은 `deposit_steps = total_for_step // step_amount`로 산출됨.
- 이후 `deposit_steps = min(deposit_steps, max_steps_per_day)`로 **하드 clamp**가 존재했음.

### 2.3 해결 (Fix)
- 위 clamp 및 해당 설정값 참조를 제거하여, 스텝 제한이 **로직 레벨에서 존재하지 않도록** 수정.

### 2.4 안전장치 (Safety)
- 단일 요청에서 과도한 XP가 계산되더라도, XP 적립은 `LevelXPService.add_xp()` 내부의 `MAX_SAFE_DELTA` 안전 캡에 의해 1회 최대치가 제한됨.

---

## 3. 변경 파일

- app/v2/services/admin_cc_deposit_service.py
  - `max_steps_per_day` 설정값 참조 제거
  - `deposit_steps` clamp 제거

- app/core/config.py
  - `external_ranking_deposit_max_steps_per_day` 기본값을 0(비활성) 유지
  - 임시 추가했던 일일 XP 캡 설정(`external_ranking_deposit_max_xp_per_day`) 제거

- tests/v2_tests/phase2_core/test_v2_vault_withdrawal_tiers.py
  - DiceLog 30판 시드가 "전체 게임 합산" 활동성 조건을 충족하기 위한 대표 시드임을 주석으로 명확화

---

## 4. 검증 방법

- 단위 테스트:
  - `tests/v2_tests/phase2_core/test_cc_deposit_logic.py`
  - `tests/v2_tests/phase2_core/test_v2_vault_withdrawal_tiers.py`

---

## 변경 이력
- 2026-01-27: CC Deposit XP 스텝 제한 제거 + 문서화
