# W05 VAULT (금고) Troubleshooting

## 📅 기간: 2026-01-27 ~ 2026-02-02

---

## Issue 1: 어드민 금고 내역 로그 시각화 부재

### 📝 증상
- 어드민 > 유저 디테일 드로우에서 유저의 금고 변동 내역(입출금, 게임, 상점 구매 등)을 확인할 수 없음.
- 단순 총액(`vault_locked_balance`)만 표시되어 구체적인 차감/지급 사유 추적 불가.

### 🔍 원인
- 백엔드에 `VaultLedger`를 유저별로 전체 조회하는 전용 API 부재.
- 프론트엔드 `UserDetailDrawer`에 금고 내역 탭 미구현 (또는 레거시 API 의존).

### 🛠 해결
- **Backend**: `GET /api/v2/admin/users/{user_id}/vault-logs` 엔드포인트 신설. (UserRoutes)
    - `VaultLedger` 테이블을 조회하여 Game, Admin, Shop, Mission 등 모든 `ref_type` 필터링 없이 반환.
- **Frontend**: `UserDetailDrawer` > `Vault History` 탭 구현 및 `useV2Admin` 훅 연결.

### 📅 적용 일자
- 2026-02-01 (Hotfix)

---
