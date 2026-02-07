# 20260127_vault_today_spent_shop_purchase_update

- 작성일: 2026-01-27
- 상태: ✅ 적용 완료
- 관련 영역: Vault / Shop / Withdrawal Conditions
- 기술 기준 문서: `docs/v2_specs/00_sot_meta/00_A_sot_code_ops_chk/learned_/*`, `docs/v2_specs/00_sot_meta/00_A_sot_code_ops_chk/*`, `docs/v2_specs/00_sot_meta/00_A_sot_code_ops_chk/learned_/00_con.md`

---

## 1. 문제 요약

출금조건 모달의 **“오늘 사용 금액”**(progress)가 상점에서 VAULT를 실제로 사용했는데도 0으로 유지되는 현상이 발생.

- UI: 오늘 사용 금액이 목표(예: 20,000) 대비 0으로 표시
- API: `GET /api/v2/vault/status`의 `daily_vault_spent` 값이 0

---

## 2. 증거 기반 RCA

### 2.1 증상
- `POST /api/v2/shop/purchase`가 성공해도 출금조건 모달의 “오늘 사용 금액”이 증가하지 않음

### 2.2 원인
- `GET /api/v2/vault/status`는 `daily_vault_spent = User.vault_spent_today`를 반환
- 그런데 V2 상점 구매 경로에서 **잔액 차감만 수행**하고,
  - `User.vault_spent_today` 누적
  - 운영일(Asia/Seoul, 09:00 리셋) 기준 일일 리셋
  - `VaultLedger` 소비 원장 기록
  을 수행하지 않아 값이 계속 0으로 남았음

---

## 3. 해결

### 3.1 백엔드 패치
- V2 소비(상점 구매) 시 아래를 원자적으로 수행하는 메서드 추가:
  - legacy SoT(`User`) 기준으로 `vault_locked_balance` 차감
  - `vault_spent_total`/`vault_spent_today` 누적
  - 운영일 KST 09:00 기준 리셋 적용(`vault_spent_reset_date`)
  - `VaultLedger(ref_type=SHOP)` 기록
  - `V2User.vault_locked_balance` 미러 동기화

### 3.2 상점 구매 경로 적용
- `V2ShopService.purchase()`에서 VAULT 결제 시 위 소비 전용 메서드를 사용하도록 변경

---

## 4. 변경 파일

- Backend
  - `app/v2/services/vault_service.py`
  - `app/v2/services/shop_service.py`
- Tests
  - `tests/v2_tests/phase2_core/test_shop_inventory_logic.py`

---

## 5. 검증

- 컨테이너(backend) 재시작 후, 동일 유저 기준으로 소비를 발생시키면 다음이 확인됨:
  - `daily_vault_spent` 증가
  - `User.vault_spent_today` 증가 및 `vault_spent_reset_date` 세팅
  - `VaultLedger` 소비 원장 1건 이상 생성
  - `V2User.vault_locked_balance`가 legacy SoT와 동기화

---

## 6. 운영 메모

- 본 패치는 서버 프로세스 재시작(또는 핫리로드가 되는 실행 환경) 이후부터 신규 상점 구매에 즉시 반영됨.
- 패치 적용 이전에 발생한 구매 내역을 “오늘 사용 금액”에 소급 반영하려면 별도의 백필(재계산) 작업이 필요함.
