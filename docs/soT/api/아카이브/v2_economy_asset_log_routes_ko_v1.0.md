문서 타입: API
버전: v1.1
작성일: 2026-01-21
작성자: GitHub Copilot
대상 독자: BE/FE/운영

# V2 지갑/금고/인벤토리/레벨보상 로그 라우터 & 보상 상수 적용 요약

## 1. 목적 (Purpose)
지갑(티켓), 금고, 인벤토리, 레벨 보상 영역의 API 루트와 로그 경로를 하나의 문서로 정리하고, 상수 20개 보상값 적용 로직을 짧게 요약한다.

## 2. 범위 (Scope)
- 지갑(티켓)·인벤토리·금고·레벨 보상의 Admin API 라우터 경로
- 각 영역의 로그 조회/관리 경로
- 상수 20개 보상값 적용 로직(요약 블록)

## 3. 용어 정의 (Definitions)
- 지갑(티켓): UserGameWallet 기반의 토큰 잔액
- 인벤토리: UserInventoryItem 기반의 아이템 보유
- 금고: user.vault_locked_balance(SoT) 기반 자산
- 상수 20개: 공통 보상 리스트(게임 티켓/프리미엄/조각/퍼즐/재화/기프티콘 + VAULT/NONE)

## 4. 상수 20개 보상값 적용 로직 (요약 블록)
### 4.1 지갑(티켓)
- SoT 상수: src/v2/constants/rewardItems.ts (storage = UserGameWallet)
- 적용 로직(요약):
```python
# app/v2/api/admin/inventory_routes.py
wallet_token = GameTokenType(payload.ticket_type)
if wallet_token:
    GameWalletService.grant_tokens(...)
else:
    InventoryService.grant_item(...)
# 로그는 UserInventoryLedger에 기록
```

### 4.2 인벤토리
- SoT 상수: src/v2/constants/rewardItems.ts (storage = UserInventoryItem)
- 적용 로직(요약):
```python
# app/v2/api/admin/inventory_routes.py
item = InventoryService.grant_item(...)
# 로그는 UserInventoryLedger에 기록
```

### 4.3 금고
- SoT 상수: VAULT (user.vault_locked_balance)
- 적용 로직(요약):
```python
# app/v2/api/admin/vault_routes.py
VaultLedger에 기록, 응답은 VaultLedgerResponseDto
```

### 4.4 레벨 보상
- SoT 상수: src/v2/constants/rewardItems.ts (공통 20개 + VAULT/NONE)
- 적용 로직(요약):
```python
# app/v2/api/admin/level_routes.py
reward_type 은 공통 상수 20개(+VAULT/NONE)만 사용
```

## 5. API 루트 및 로그 경로
공통 프리픽스: /api/v2/admin

### 5.1 지갑(티켓) 로그/관리
- 로그 조회: GET /inventory/logs
- 티켓 지급(로그 생성): POST /inventory/tickets
- 티켓 로그 수정: PUT /inventory/tickets/{ticket_id}
- 티켓 로그 삭제: DELETE /inventory/tickets/{ticket_id}
- 티켓 통계: GET /inventory/tickets/stats
- 티켓 보유 유저: GET /inventory/tickets/users

### 5.2 인벤토리 로그/관리
- 로그 조회: GET /inventory/logs
- 아이템 지급(로그 생성): POST /inventory/items
- 아이템 로그 수정: PUT /inventory/items/{item_id}
- 아이템 로그 삭제: DELETE /inventory/items/{item_id}
- 인벤 통계: GET /inventory/items/stats
- 인벤 보유 유저: GET /inventory/items/users

### 5.3 금고 로그/관리
- 금고 통계: GET /vault/stats
- 금고 유저 목록: GET /vault/users
- 금고 유저 로그(ledger): GET /vault/users/{user_id}/ledger
- 금고 트렌드: GET /vault/trend
- 금고 강제 조정: POST /vault/force-edit
- 출금 목록(상태별): GET /vault/withdrawals/{status}
- 출금 승인: POST /vault/withdrawals/{withdrawal_id}/approve
- 출금 반려: POST /vault/withdrawals/{withdrawal_id}/reject

### 5.4 레벨 보상 (Admin)
- 레벨 목록: GET /game/levels
- 레벨 전역 설정: PUT /game/levels/config
- 레벨 보상 수정: PUT /game/levels/{level}

## 6. 운영/검증 (QA)
- [ ] 지갑/인벤/금고 로그 UI가 상수 20개 라벨로 표시되는지 확인
- [ ] /inventory/logs 결과가 티켓/인벤 분리 화면에서 올바르게 필터되는지 확인
- [ ] /vault/users/{user_id}/ledger 로그에 VAULT 기준 표시가 적용되는지 확인

## 7. 변경 이력
- v1.1 (2026-01-21, GitHub Copilot): 레벨 보상 섹션 및 라우터 경로 추가
- v1.0 (2026-01-21, GitHub Copilot): 최초 작성
