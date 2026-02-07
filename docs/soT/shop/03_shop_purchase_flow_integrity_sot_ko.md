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

### 11.2 보관 기간
- 중복 방지 키 보관 기간을 정의한다.
- 운영 정책에 따라 TTL 설정 가능.

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

## 15. API 계약 요약
- GET /api/v2/shop/products
- POST /api/v2/shop/purchase
- GET /api/v2/inventory
- POST /api/v2/inventory/use

## 16. 코드 매핑
- 서비스: app/v2/services/shop_service.py
- 라우트: app/v2/api/routes.py
- 스키마: app/v2/schemas/v2_shop_exchange.py

## 17. DB 매핑
- v2_shop_order: 구매 로그
- vault_ledger: 금고 원장
- user_game_wallet: 지갑 차감/지급
- user_inventory_item: 인벤토리 지급

## 18. 예외 케이스
- 상품 비활성(visible=false)
- 기간 만료(starts_at/ends_at)
- 재고 소진(stock_limit)
- 유저당 제한(purchase_limit_per_user)

## 19. 모니터링 포인트
- 구매 실패율
- INVALID_COST_TYPE 발생
- INSUFFICIENT_BALANCE 발생
- BENEFITS_SUSPENDED 발생

## 20. 시퀀스 요약
1) 요청 수신
2) 상품 스냅샷 확인
3) cost_type 정규화
4) 잔액 검증
5) 차감
6) 로그 기록
7) 지급
8) 응답 반환

## 21. 동시성/성능
- 동일 유저 동시 구매에 대한 락 고려
- 잔액 검증과 차감의 경쟁 조건 방지
- idempotency 키 재사용 방지

## 22. 보안/권한
- 인증된 유저만 구매 가능
- 어드민 전용 상품은 별도 라우트

## 23. 로그 필드 권장
- user_id
- sku
- cost_type
- cost_amount
- reward_type
- reward_amount
- request_id

## 24. 스키마 참조
- v2_shop_order
- v2_exchange_log
- user_game_wallet
- user_inventory_item

## 25. 정규화 케이스
- cost_type=POINT -> VAULT
- cost_type=CC_POINT -> VAULT
- reward_type=ROULETTE_COIN -> ROULETTE_TICKET
- reward_type=DICE_TOKEN -> DICE_TICKET

## 26. QA 체크리스트
- [ ] VAULT 결제 정상
- [ ] DIAMOND 결제 정상
- [ ] 티켓 결제 정상
- [ ] 제재 유저 차단
- [ ] 구매 후 잔액/지급 동기화

## 27. 장애 대응 가이드
1) 요청/응답 로그 확인
2) v2_shop_order 기록 확인
3) 금고/지갑 잔액 확인
4) 보상 지급 경로 확인

## 28. 참고 로그/문서
- v2_fullstack_integration_test_logs_shop_inventory_20260124.md
- v2_verification_test_logs_20260123.md
- 2026_01_31_v2_domain_audit.md
- 2026_01_31_v2_troubleshooting.md

## 29. 관련 문서
- v2_shop_inventory_service_design_ko.md
- v2_inventory_shop_api_contract_ko.md
- 20260127_shop_cost_type_fix.md
- 20260205_shop_cost_type_expansion.md
- v2_strict_vault_policy_sot_ko.md

## 30. 변경 이력
- v1.0 (2026-02-07, GitHub Copilot): Shop/Exchange 통합 SoT 03 작성
