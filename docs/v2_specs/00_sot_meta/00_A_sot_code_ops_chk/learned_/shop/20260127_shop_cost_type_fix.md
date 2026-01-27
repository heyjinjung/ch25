# V2 상점 구매 오류/차감 불일치 수정

**작성일**: 2026-01-27  
**상태**: ✅ 해결됨  
**영향 범위**: V2 상점(룰렛티켓, 치킨 기프티콘) 구매

---

## 1. 문제 요약

### 1.1 룰렛티켓 구매 400 오류
- API: `POST /api/v2/shop/purchase`
- 에러: `INVALID_COST_TYPE`

### 1.2 치킨 구매 후 금고 잔액 미반영
- 구매 성공, 재구매 시 잔액 부족 메시지
- 앱헤더/금고 화면 잔액 표시 갱신 안 됨

---

## 2. 근본 원인

### 2.1 cost_type 불일치 (룰렛티켓)
- UI Config의 `cost_type=POINT`
- API는 `VAULT`/`DIAMOND`만 허용 → `INVALID_COST_TYPE`

### 2.2 금고 차감 대상 테이블 불일치 (치킨)
- 구매 로직이 `v2_user.vault_locked_balance`만 차감
- 금고 UI/SoT는 `user.vault_locked_balance`
- 결과: UI 잔액 미변경, 서버는 잔액 부족 처리

---

## 3. 해결 내용

### 3.1 cost_type 정규화
- `POINT/CC_POINT/VAULT` → `VAULT`로 통일

### 3.2 상점 차감 로직 통합
- `V2VaultService.withdraw()` 사용
- legacy `user` + `v2_user` 동시 갱신
- 잔액 부족 시 `INSUFFICIENT_BALANCE` 유지

---

## 4. 수정 파일

- `app/v2/api/routes.py`
  - shop products 반환 시 cost_type 정규화
  - purchase 시 cost_type 재정규화
- `app/v2/services/shop_service.py`
  - VAULT 차감 시 `V2VaultService.withdraw()` 사용

---

## 5. 검증 체크리스트

- [x] 룰렛티켓 cost_type → VAULT 정규화 확인
- [x] 룰렛티켓 구매 400 에러 제거
- [x] 치킨 구매 시 금고 잔액 즉시 차감
- [x] 재구매 시 잔액 부족 메시지 정상

---

## 6. 참고

- UI Config (`v2_shop_products`) 에서 `cost_type=POINT`는 허용하되 API에서는 `VAULT`로 해석
- 금고 SoT는 `user.vault_locked_balance`

---

**문서 끝**
