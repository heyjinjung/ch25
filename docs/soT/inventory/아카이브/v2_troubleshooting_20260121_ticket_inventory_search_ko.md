문서 타입: 트러블슈팅
버전: v1.1
작성일: 2026-01-21
작성자: GitHub Copilot
대상 독자: FE/BE 개발자, 운영

# V2 티켓/인벤 로그 닉네임 검색 불가 트러블슈팅

## 1. 목적
티켓/인벤토리 로그 화면에서 닉네임 검색이 동작하지 않는 이슈의 원인과 해결책을 기록한다.

## 2. 범위
- V2 Admin UI (티켓/인벤토리 로그 조회)
- V2 Admin API `/api/v2/admin/inventory/logs`

## 3. 증상
- 닉네임 입력 후 조회 시 결과가 필터링되지 않음.
- 특정 유저의 로그가 있어도 조회가 전체/빈 결과로 표시됨.
- 인벤/티켓 로그 목록에서 닉네임이 `-`로 표시됨.
- 티켓/인벤 지급·수정 요청이 500으로 실패(무응답).

## 4. 원인
- 프론트엔드가 camelCase 쿼리 파라미터(`userId`, `startDate`, `endDate`)를 전송.
- 백엔드는 snake_case 파라미터(`user_id`, `start_date`, `end_date`)만 수신하여 필터가 무시됨.
- `TicketLogDto` 응답 필드 불일치(`changeAmount/createdAt`)로 응답 직렬화 실패 → 500.
- 로그 응답에 `nickname` 필드 누락으로 UI에 `-` 표시.

## 5. 해결
- `/api/v2/admin/inventory/logs` 호출 시 쿼리 파라미터를 snake_case로 정렬.
  - `user_id`, `start_date`, `end_date`
- `TicketLogDto` 응답 필드를 `type/amount/timestamp`로 정렬하여 스키마와 일치.
- 로그 응답에 `nickname` 포함(유저 조인 후 채움).

## 5.1 추가 시도 (2026-01-23)
- `/api/v2/admin/inventory/logs`에서 지갑(UserGameWalletLedger)+인벤(UserInventoryLedger) 합산 반환으로 확장.
- 결과: **티켓 로그 검색은 여전히 실패** (UI에서 test002 기준 미표시).

## 5.2 추가 원인 후보
- `getAdminUserList` 검색 성공 → 티켓 지급 모달의 유저 조회와 로그 조회가 **다른 데이터 경로**를 사용.
- `/inventory/logs`가 **중복 라우트**(economy_routes, inventory_routes)로 선언되어 실제 핸들러가 의도와 다르게 선택될 가능성.
- `UserGameWalletLedger`에 **티켓 지급 로그가 기록되지 않는 경로** 존재 가능(지갑 잔액만 갱신).

## 6. 재발 방지
- FE↔BE 파라미터 계약 불일치 시 즉시 통일.
- 라우터 중복 경로 사용 시 실제 매칭 핸들러의 파라미터 규칙 확인.

## 7. 변경 이력
- v1.0 (2026-01-21, GitHub Copilot): 최초 작성
- v1.1 (2026-01-21, GitHub Copilot): 닉네임 표시 누락/티켓 지급 500 원인 및 해결 추가
- v1.2 (2026-01-23, GitHub Copilot): 지갑+인벤 합산 로그 시도 기록 및 추가 원인 후보 정리
