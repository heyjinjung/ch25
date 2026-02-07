# V2 Admin User UI 트러블슈팅 리포트

**문서 번호**: TR-20260120-03
**작성일**: 2026-01-20
**작성자**: Antigravity Agent
**상태**: 해결됨 (Resolved)
**관련**: `src/v2/admin/pages/users/UserDetailDrawer.tsx`, `src/v2/admin/pages/users/UserListPage.tsx`

---

## 1. 개요 (Overview)
유저 상세 정보 조회(Drawer) 및 리스트 테이블 렌더링 시 발생한 런타임 크래시(`Cannot read properties of undefined (reading 'toLocaleString')`)에 대한 원인 분석과 조치 내용을 기록한다.

## 2. 이슈 상세 및 해결 (Issues & Resolutions)

### 2.1 숫자 포맷팅 함수 호출 시 런타임 에러
*   **증상**: 유저 리스트에서 특정 유저의 상세 정보를 열거나 리스트를 조회할 때 애플리케이션이 흰 화면으로 변하며 크래시 발생. 콘솔에 `TypeError: Cannot read properties of undefined (reading 'toLocaleString')` 출력.
*   **원인**: 백엔드 API로부터 수신한 유저 데이터 객체(`user`)의 일부 숫자형 필드(`totalDeposit`, `currentAssets`, `ticketBalance`, `vaultBalance`)가 `undefined` 또는 `null` 상태로 전달됨. 프론트엔드 코드는 이 필드들이 항상 숫자(`number`)일 것이라 가정하고 `.toLocaleString()` 메서드를 직접 호출함.
*   **해결**: 해당 필드 접근 시 Null Safe 처리 및 기본값(`0`) 할당 로직 추가.
    ```tsx
    // UserDetailDrawer.tsx & UserListPage.tsx

    // Before (위험)
    {user.ticketBalance.toLocaleString()} T
    {user.vaultBalance.toLocaleString()} T

    // After (안전)
    {(user.ticketBalance || 0).toLocaleString()} T
    {(user.vaultBalance || 0).toLocaleString()} T
    ```

## 3. 교훈 및 예방 조치 (Lessons Learned)
1.  **Defensive Programming**: UI 렌더링 시 API 응답 데이터의 무결성을 맹신하지 말고, 항상 `undefined`나 `null` 상황을 대비한 방어적 코딩(Default Value, Optional Chaining)을 적용해야 함.
2.  **Type Safety**: TypeScript 인터페이스 상에서는 `number`로 정의되어 있더라도, 실제 런타임 데이터는 다를 수 있음을 인지하고 데이터 바인딩 시 주의 필요.
