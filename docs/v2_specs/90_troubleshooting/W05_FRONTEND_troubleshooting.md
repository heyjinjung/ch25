# W05 FRONTEND 트러블슈팅 (01-27 ~ 02-02)

## 01-31 - [FRONTEND] 금고 내역에 상점 구매(차감) 안 보임

### 증상
- 유저 상세 드로어 → 금고 탭에서 상점 구매 내역이 안 보임
- 적립(EARN)만 보이고 차감(SPEND)은 누락

### 원인 분석
```
기존 코드: useAdminUserVaultHistory → VaultEarnEvent (적립만 기록)
정상 구조: useVaultUserLedger → VaultLedger (적립+차감 전체)
```

### 해결
1. **훅 교체**: `useAdminUserVaultHistory` → `useVaultUserLedger`
2. **UI 수정**: VaultLedger 응답 구조에 맞게 필드명 변경 (amount, type, ref_type 등)

**수정 파일:**
- `src/v2/admin/pages/users/UserDetailDrawer.tsx`

### 검증
- 금고 탭에서 상점 구매 내역(ref_type='SHOP')이 차감(-)으로 표시되는지 확인

---

## 01-31 - [FRONTEND] 게임 보상 내역 조회 UI 없음

### 증상
- 유저가 다이스/룰렛/복권에서 얻은 보상을 어드민에서 확인할 UI가 없음

### 해결
1. **백엔드 API 추가**: `GET /api/v2/admin/users/{userId}/game-logs`
   - 다이스/룰렛/복권 로그 통합 조회
   - 최신 50건 반환

2. **프론트 훅 추가**: `useUserGameLogs(userId)`

3. **UI 추가**: UserDetailDrawer에 "게임 로그" 탭 추가

**수정 파일:**
- `app/v2/api/admin/user_routes.py` - API 엔드포인트
- `src/v2/api/adminApi.ts` - 타입/함수
- `src/v2/hooks/useV2Admin.ts` - 훅
- `src/v2/admin/pages/users/UserDetailDrawer.tsx` - UI 탭

### 검증
- 유저 상세 → 게임 로그 탭에서 DICE/ROULETTE/LOTTERY 기록 표시

---

## 01-31 - [FRONTEND] 인벤토리 변동 이력(차감/사용) 안 보임

### 증상
- 유저 상세 드로어 → 인벤토리 탭에서 아이템 목록만 보이고 변동 이력이 없음
- 지급(GRANT)/사용(USE)/회수(REVOKE) 로그가 표시되지 않음

### 원인 분석
```
백엔드 API: GET /api/v2/admin/inventory/logs (존재함)
프론트 훅: useAdminInventoryLogs (존재함)
문제: UserDetailDrawer에서 훅 호출 안 함
```

### 해결
1. `useAdminInventoryLogs` import 추가
2. 인벤토리 탭 하단에 "인벤토리 변동 이력" 테이블 추가
   - GRANT: 지급 (초록색)
   - USE: 사용 (빨간색)
   - REVOKE: 회수 (노란색)

**수정 파일:**
- `src/v2/admin/pages/users/UserDetailDrawer.tsx`

### 검증
- 유저 상세 → 인벤토리 탭 하단에서 지급/사용/회수 로그 표시

---

## 변경 이력
| 날짜 | 이슈 | 담당 |
|------|------|------|
| 01-31 | 금고 내역 차감 누락 | Copilot |
| 01-31 | 게임 로그 UI 추가 | Copilot |
| 01-31 | 인벤토리 로그 UI 추가 | Copilot |
