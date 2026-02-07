문서 타입: SoT
버전: v1.0
작성일: 2026-02-07
작성자: GitHub Copilot
대상: BE/FE/운영
상태: SoT

# V2 Shop/Exchange 통합 SoT 03 - 구매 플로우/정합성

## 1. 목적
- 상점 구매 플로우를 단일 트랜잭션 기준으로 정리한다.
- 금고 SoT 및 CostType 확장을 반영한다.
- 정합성 체크 항목을 제공한다.

## 2. 범위
- 구매 트랜잭션
- 결제 타입 정규화
- 구매 로그
- 보상 지급

## 3. 핵심 원칙
- Vault SoT는 `user.vault_locked_balance` 단일 기준.
- 구매는 차감 -> 로그 -> 지급 순서.
- 실패 시 롤백.

### 3.1 금고 단일 기준
- `vault_locked_balance`만 사용한다.
- `vault_available_balance` 합산 금지.

### 3.2 트랜잭션 요구사항
- 구매는 하나의 DB 트랜잭션.
- 로그와 지급의 원자성 보장.

## 4. 구매 입력
- sku (product_id)
- Idempotency-Key (선택)

### 4.1 입력 검증
- sku 누락 시 400
- sku 미존재 시 404 또는 400
- idempotency 키는 헤더로 전달

## 5. 결제 타입 정규화
- POINT/CC_POINT -> VAULT
- VAULT는 금고에서 차감
- 게임 토큰은 GameWallet에서 차감

### 5.1 정규화 규칙
- cost_type 미지정 시 VAULT 기본
- reward_type은 `_TICKET` 표준 준수

## 6. 구매 플로우(상세)
1) 상품 스냅샷 확정
2) cost_type 정규화
3) 잔액 검증
4) 결제 차감
5) v2_shop_order 기록
6) reward 지급
7) 응답 반환

### 6.1 잔액 검증
- VAULT: `user.vault_locked_balance >= cost_amount`
- GameWallet: 토큰 수량 확인

### 6.2 결제 차감
- VAULT: VaultService.withdraw 사용
- GameWallet: consume_wallet_tokens 사용

### 6.3 지급 경로
- GameWallet: 토큰 증가
- Inventory: 아이템 적재
- Vault: 금고 적립

## 7. 트랜잭션 보장
- 차감/로그/지급은 단일 트랜잭션
- 실패 시 전체 롤백

### 7.1 롤백 대상
- 금고 차감
- 지갑 차감
- 주문 로그
- 보상 지급

## 8. 로그 기록
- v2_shop_order: 구매 로그
- 금고 원장: vault ledger 기록

### 8.1 v2_shop_order 필드
- user_id
- sku
- name
- cost_type
- cost_amount
- reward_type
- reward_amount
- created_at

## 9. 제재 정책
- benefits_suspended=True 차단
- 서비스 레이어 강제

### 9.1 에러 반환
- HTTP 403
- detail: BENEFITS_SUSPENDED_7D_NO_DEPOSIT

## 10. 오류 코드
- MISSING_SKU
- INVALID_COST_TYPE
- INSUFFICIENT_BALANCE
- BENEFITS_SUSPENDED

### 10.1 오류 매핑(예시)
- 400: MISSING_SKU
- 400: INVALID_COST_TYPE
- 400: INSUFFICIENT_BALANCE
- 403: BENEFITS_SUSPENDED

## 11. Idempotency
- 동일 키 중복 요청은 1회만 처리
- 구매 로그에 중복 방지 키 포함 가능

### 11.1 권장 동작
- 동일 키 요청은 동일 응답
- 중복 차감 금지

## 12. 정합성 체크
- 금고 잔액 즉시 반영
- 구매 로그 누락 없음
- reward 지급 누락 없음

### 12.1 정합성 포인트
- 금고/지갑 수량 감소 일치
- 보상 지급 수량 일치
- 로그와 지급의 SKU 매칭

## 13. 테스트 포인트
- 잔액 부족 실패
- 제재 유저 차단
- cost_type 확장 결제
- idempotency 중복 요청

### 13.1 테스트 예시
- VAULT 결제 성공
- DIAMOND 결제 성공
- ROULETTE_TICKET 결제 성공
- BENEFITS_SUSPENDED 차단

## 14. 운영 점검
- 구매 후 UI 잔액 갱신 확인
- 구매 기록이 admin에서 조회되는지 확인
- 공백 상품 구매 방지 확인

## 15. 관련 문서
- v2_shop_inventory_service_design_ko.md
- v2_inventory_shop_api_contract_ko.md
- 20260127_shop_cost_type_fix.md
- 20260205_shop_cost_type_expansion.md
- v2_strict_vault_policy_sot_ko.md

## 16. 변경 이력
- v1.0 (2026-02-07, GitHub Copilot): Shop/Exchange 통합 SoT 03 작성
