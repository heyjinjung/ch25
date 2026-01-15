# 2026-01-15 개발 로그 - Admin Inventory Operations Center 통합

## 작업 개요
- 기존 `TicketManagerPage`를 **Operations Center**로 확장 개편.
- 관리자가 유저의 인벤토리 현황(Items)과 변동 내역(Ledger)을 조회할 수 있도록 기능 추가.
- `UserAssetDetailModal`을 전면 리팩토링하여 탭 기반(요약/로그/원장/인벤토리)의 상세 조회 뷰 구현.

## 백엔드 (`app/api/admin/routes/admin_inventory.py`)
- **신규 엔드포인트 추가**:
  - `GET /inventory/ledger`: 시스템 전체 인벤토리 변동 내역 조회 (필터: UserID, ItemType, RelatedID).
  - `GET /inventory/items`: 시스템 전체 인벤토리 보유 현황 스냅샷 조회 (필터: UserID, ItemType, MinQty).
  - `GET /users/by-identifier/{identifier}`: 닉네임/Username 등으로 유저 인벤토리 조회 지원 (Legacy 호환).

## 프런트엔드
- **API Client (`src/admin/api/adminInventoryApi.ts`)**:
  - 인벤토리 관련 API 호출 로직 캡슐화.
  - Legacy 컴포넌트(`UserInventoryModal`) 지원을 위한 호환 함수(`fetchAdminUserInventory` 등) export 유지.
- **Admin Page (`src/admin/pages/TicketManagerPage.tsx`)**:
  - **Inventory 탭 추가**: Ledger/Items 서브 뷰 지원.
  - 검색 및 필터링 UI 구현.
- **Modal (`src/admin/components/UserAssetDetailModal.tsx`)**:
  - 기존 단일 뷰에서 **4-Tab 뷰**로 확장.
  - `Summary`, `Play Logs`, `Wallet Ledger`, `Inventory` 탭 구현.
  - React Query를 활용한 탭별 데이터 Lazy Loading 적용.

## 테스트 및 검증
- **빌드 검증**: `npm run build` (TypeScript Type Check + Vite Build) 성공.
- **기능 검증**:
  - 어드민 페이지에서 인벤토리 탭 진입 및 데이터 로딩 확인.
  - 유저 상세 모달에서 인벤토리 및 로그 확인 정상 동작.
  - Legacy 기능(기존 인벤토리 모달) 호환성 유지 확인.

## 특이사항
- 기존 `UserInventoryModal.tsx`가 참조하던 `adminInventoryApi`의 함수 시그니처가 변경되었으나, legacy wrapper를 추가하여 호환성 문제를 해결함.
