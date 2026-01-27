# V2 상점 구매가 "오늘 사용 금액"에 반영되지 않는 문제 수정

- 문서 타입: learned_
- 작성일: 2026-01-27
- 상태: ✅ 적용 완료
- 영향 범위: V2 상점 구매 → 금고 출금조건(오늘 사용 금액) 표시/판정

---

## 1. 문제 요약

출금조건 모달의 "오늘 사용 금액"(`daily_vault_spent`)이 **상점에서 실제로 VAULT를 사용했는데도 0으로 유지**되는 현상.

- FE는 `/api/v2/vault/status`의 `daily_vault_spent`를 그대로 표시
- BE는 `daily_vault_spent = User.vault_spent_today`를 반환
- 그런데 V2 상점 구매 경로에서 `vault_spent_today`가 갱신되지 않아, 모달/출금조건이 실제보다 미달로 보임

---

## 2. 증거 기반 RCA

### 2.1 증상(Symptom)
- 상점에서 VAULT 결제(차감) 후에도 출금조건 모달의 "오늘 사용 금액"이 증가하지 않음

### 2.2 원인(Evidence)
- `app/v2/services/vault_service.py`의 `get_vault_info()`는 `daily_vault_spent`를 `User.vault_spent_today`에서 읽음
- `app/v2/services/shop_service.py`의 구매 로직은 `V2VaultService.withdraw()`로 **잔액만 차감**하고,
  - `vault_spent_today`/`vault_spent_total` 누적
  - 운영일(KST 09:00) 기준 일일 리셋
  - 원장(VaultLedger) 기록
  을 수행하지 않았음

---

## 3. 해결(Fix)

### 3.1 백엔드 수정
- `V2VaultService.consume_locked_for_spend()`를 추가하여 "소비"(상점 구매) 시 아래를 원자적으로 수행:
  - `User.vault_locked_balance` 차감
  - `User.vault_spent_total` 누적
  - `User.vault_spent_today` 운영일(KST 09:00) 기준 리셋 + 누적
  - `VaultLedger`에 소비 기록(ref_type=SHOP)
  - `V2User.vault_locked_balance` 미러 동기화

### 3.2 상점 구매 경로 적용
- `V2ShopService.purchase()`에서 VAULT 결제 시 `withdraw()` 대신 `consume_locked_for_spend()`를 사용

---

## 4. 변경 파일

- app/v2/services/vault_service.py
  - `consume_locked_for_spend()` 추가
  - `vault_spent_today` 운영일 리셋 유틸 추가
- app/v2/services/shop_service.py
  - VAULT 결제 시 소비 전용 차감 메서드 사용
- tests/v2_tests/phase2_core/test_shop_inventory_logic.py
  - 상점 구매가 legacy(User) SoT에 반영되고, `vault_spent_today`가 증가하는지 검증 추가

---

## 5. 검증

- pytest: `tests/v2_tests/phase2_core/test_shop_inventory_logic.py` 통과
- 추가로 관련 출금 로직 테스트 일부 통과 확인

---

## 6. 비고

- "오늘"의 기준은 **Asia/Seoul + 오전 9시 리셋(Operational Day)** 정책을 따른다.
- 본 수정은 "필드 전달 누락(키 스네이크/카멜 혼재)"과는 별개의 이슈로, **값 자체가 갱신되지 않는 문제**를 해결한다.
