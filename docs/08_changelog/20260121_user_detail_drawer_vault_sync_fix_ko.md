# UserDetailDrawer 금고/지갑 연동 및 인벤토리 표시 수정 (Vault Sync & Inventory Filter Fix)

**문서 타입**: Troubleshooting Log / Changelog
**작성일**: 2026-01-21
**작성자**: Antigravity Agent
**대상**: BE/FE 개발팀
**프로젝트**: Golden V2

---

## 1. 배경 (Context)
V2 어드민의 **유저 상세 드로어(User Detail Drawer)** 내 '지갑 관리' 및 '인벤토리' 패널에서 데이터 불일치와 로직 오류가 보고됨.
특히 어드민에서 '금고 포인트'를 지급했으나, 실제 유저의 **출금 가능한 금고 잔액(Vault Balance)에는 반영되지 않는 치명적 문제**가 발생함.

## 2. 문제 상황 (Problem)

### 2.1 금고/지갑 데이터 불일치 (Vault/Wallet Discrepancy)
- **증상**: `UserDetailDrawer`에서 "금고 포인트(VAULT)" 지급 시, 실제 경제 테이블(`User.vault_locked_balance`)이 아닌 `UserInventoryItem` 테이블에 `item_type="VAULT"`라는 더미 아이템으로 적립됨.
- **원인**: `adjust_user_inventory` API가 모든 `itemType`을 단순 인벤토리 아이템으로 처리하도록 구현되어 있었음. V2 SoT의 **자산 분류(Vault vs Wallet vs Inventory)**가 미적용된 상태.

### 2.2 인벤토리 표시 오류 (Inventory Clutter)
- **증상**: 다 쓴 기프티콘이나 소진된 아이템(수량 0)이 인벤토리 목록에 계속 "USED" 상태로 노출되어 시인성을 저해함.
- **원인**: `get_user_inventory` API가 수량과 관계없이 DB의 모든 레코드를 반환함.

## 3. 해결 방안 (Solution)

### 3.1 백엔드 데이터 라우팅 분기 (Logic Separation)
`app/v2/api/admin/user_routes.py`의 `adjust_user_inventory` 함수를 전면 리팩토링하여 자산 타입별로 적절한 Service로 라우팅함.

| 자산 타입 (Asset Type) | 처리 서비스 (Service) | 대상 DB 필드/테이블 | 비고 |
| :--- | :--- | :--- | :--- |
| **VAULT** (금고) | `V2VaultService` | `User.vault_locked_balance` | **실제 현금성 자산 반영** (Strict Policy 적용) |
| **ROULETTE_TICKET** 등 | `GameWalletService` | `UserGameWallet` | `GameTokenType` Enum 기반 자동 판별 |
| **GIFTICON**, etc. | `InventoryService` | `UserInventoryItem` | 일반 아이템 처리 유지 |

### 3.2 인벤토리 필터링 (Inventory Filtering)
`get_user_inventory` API 쿼리 레벨에서 `quantity > 0` 조건을 추가하여 활성 아이템만 반환하도록 수정.

```python
# app/v2/api/admin/user_routes.py

@router.get("/users/{user_id}/inventory", ...)
def get_user_inventory(...):
    # Hide items with 0 quantity (USED or consumed)
    items = db.query(UserInventoryItem).filter(
        UserInventoryItem.user_id == user_id,
        UserInventoryItem.quantity > 0  # [ADDED]
    ).all()
    # ...
```

## 4. 검증 결과 (Verification)

### 4.1 금고 지급 테스트
- **Action**: 어드민 드로어에서 User A에게 50,000 P 지급.
- **Result**:
    - `UserInventoryItem` (x) -> 적립 안 됨 (정상).
    - `User.vault_locked_balance` (o) -> 50,000 증가 확인.
    - `AdminAuditLog` (o) -> `VAULT_ADJUST` 액션 기록 확인.

### 4.2 인벤토리 숨김 테스트
- **Action**: 수량 1개인 기프티콘 사용(차감)하여 0개 생성.
- **Result**: 드로어 인벤토리 목록 조회 시 해당 아이템이 응답 목록에서 제외됨 확인.

## 5. 결론 (Conclusion)
본 수정을 통해 **UserDetailDrawer가 실제 V2 경제 시스템의 컨트롤러 역할**을 올바르게 수행하게 되었으며, "눈에 보이는 수치"와 "실제 보유 자산"의 동기화를(SoT Reference) 달성함.
