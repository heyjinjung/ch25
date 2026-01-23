# Development Log (2026-01-23) — V2 Admin 유저 생성 및 호환성 보완

문서 타입: 변경 로그
버전: v1.3
작성일: 2026-01-23
작성자: GitHub Copilot
대상 독자: BE 개발자, FE 개발자, 운영

## 1. 목적 (Purpose)
V2 어드민 회원관리의 유저 생성 흐름을 활성화하고, V2 호환성 이슈(표시값/설정 반영)를 최소 수정으로 정리한다.

## 2. 범위 (Scope)
- V2 어드민 회원관리 UI/훅/API에 유저 생성 기능 연결
- 복권 설정 조회/저장 값 반영 누락 수정
- V2 어드민 주사위 설정 페이지 크래시 방지 및 응답 매핑 호환성 보강
- V1 화면의 주사위 표시 안정성(토큰 잔액) 보강
- 티켓/인벤토리 검색 입력 정규화(공백/줄바꿈 제거)
- 유저 드로우 티켓 조정 로그가 티켓관리 로그에 반영되도록 wallet ledger 기록 경로 정리

## 3. 용어 정의 (Definitions)
- V2 어드민: /v2/admin/* 경로로 제공되는 운영 UI
- 호환성 보완: 기존 동작 유지 + 누락/크래시 최소 수정

## 4. 변경 요약 (Summary)
1) V2 어드민 회원관리 ‘회원 등록’ 버튼에 생성 다이얼로그 및 API 호출을 연결.
2) V2 어드민 유저 생성 API(`/api/v2/admin/users`) 추가.
3) 복권 설정 응답에서 `puzzle_piece_probability` 실제 저장값 반환.
4) V1 주사위 화면에서 토큰 잔액 렌더 안정화.
5) 티켓/인벤토리 검색 입력값 trim 정규화 적용.
6) V2 어드민 주사위 설정 페이지에서 `toLocaleString` 크래시 방지 + Dice Config 응답 매핑(camelCase/snake_case) 보강.
7) 유저 드로우(wallet adjust)에서 티켓 지급/회수 시 원장(UserGameWalletLedger) 기록되도록 변경.

## 5. 상세 변경 내용 (Details)
### 5.1 V2 어드민 유저 생성 기능 활성화
- FE: 회원 등록 버튼 → 다이얼로그 → 생성 요청 → 리스트 갱신
- BE: V2 admin user 생성 엔드포인트 추가

**관련 파일**
- 프론트: `src/v2/admin/pages/users/UserListPage.tsx`
- 프론트: `src/v2/hooks/useV2Admin.ts`
- 프론트: `src/v2/api/adminApi.ts`
- 백엔드: `app/v2/api/admin/user_routes.py`

### 5.2 복권 설정 반영 누락 수정
- 복권 설정 응답에서 `puzzle_piece_probability`가 항상 0.0으로 반환되던 문제 수정.

**관련 파일**
- 백엔드: `app/v2/api/admin/game_config_routes.py`

### 5.3 V1 주사위 화면 표시 안정화
- `token_balance` 누락 시 렌더 크래시 방지.

**관련 파일**
- 프론트: `src/api/diceApi.ts`
- 프론트: `src/pages/DicePage.tsx`

### 5.4 티켓/인벤토리 검색 입력 정규화
- 공백/줄바꿈 포함 입력 시에도 유저 조회가 안정적으로 동작하도록 trim 적용.

**관련 파일**
- 프론트: `src/v2/admin/pages/economy/TicketManagementTab.tsx`
- 프론트: `src/v2/admin/pages/economy/TicketInventoryPage.tsx`
- 프론트: `src/v2/admin/pages/economy/InventoryManagementTab.tsx`

### 5.5 V2 어드민 주사위 설정 페이지 크래시 방지 및 응답 매핑 보강
- 증상: V2 어드민 주사위 설정 화면에서 `Cannot read properties of undefined (reading 'toLocaleString')` 크래시 발생.
- 원인: Dice Config 응답 키가 환경/버전에 따라 camelCase vs snake_case로 달라질 수 있는데, 프론트 파서가 snake_case만 가정하여 `dailyGainCap` 등이 `undefined`가 되는 케이스 존재.
- 조치:
	- Dice Config 조회 파서를 camelCase 우선 + snake_case fallback으로 보강하여 호환성 강화.
	- 화면 표시부에서 `dailyGainCap`가 비어도 안전하게 렌더되도록 fallback(0) 처리.

**관련 파일**
- 프론트: `src/v2/api/adminApi.ts`
- 프론트: `src/v2/admin/pages/game/DiceConfigPage.tsx`

### 5.6 유저 드로우 티켓 조정 로그 반영
- 유저관리 드로우에서 티켓 지급/회수 시 wallet balance 직접 수정 대신 `GameWalletService`를 통해 원장 기록.
- 티켓관리 로그 화면에서 동일 지급/회수 내역이 조회되도록 경로 정리.

**관련 파일**
- 백엔드: `app/v2/api/admin/user_routes.py`

## 6. QA/검증 체크리스트
- [ ] V2 어드민 회원관리에서 ‘회원 등록’ 버튼 클릭 시 다이얼로그가 열린다.
- [ ] 필수값 external_id 입력 후 등록 시 유저가 리스트에 반영된다.
- [ ] 복권 설정 저장 후 `puzzle_piece_probability` 값이 유지된다.
- [ ] V2 어드민 주사위 설정 페이지가 크래시 없이 로드된다(특히 일일 누적 획득 한도 표시).
- [ ] V1 주사위 페이지에서 토큰 잔액이 누락되어도 화면이 깨지지 않는다.
- [ ] 티켓/인벤토리 검색에 공백/줄바꿈이 포함되어도 유저 검색이 가능하다.
- [ ] 유저관리 드로우에서 티켓 지급/회수 후 티켓관리 로그에 내역이 표시된다.

## 7. 리스크/주의사항
- V2 게임 상태 API 404는 기능 스케줄/설정 미구성에 의해 발생할 수 있으므로 운영 설정 확인 필요.
- 어드민 유저 생성은 권한 토큰(role) 필요.
- (미해결) V2 어드민 복권 설정에서 500(Internal Server Error) 발생: 백엔드 로그/스택트레이스 확인 후 원인 추적 필요.
- (미해결) V2 어드민 룰렛 설정이 반응 없거나, 4종 룰렛(등급/세그먼트) 설정이 서로 동기화되어 덮어써지는 이슈: 프론트에서 config 식별자(id/grade)별 상태/저장 분리 여부 점검 필요.

## 8. 변경 이력
- v1.3 (2026-01-23, GitHub Copilot): 유저 드로우 티켓 조정 로그 반영 경로 정리
- v1.2 (2026-01-23, GitHub Copilot): V2 주사위 설정 페이지 크래시 방지 및 Dice Config 응답 매핑 호환성 보강 기록 추가
- v1.1 (2026-01-23, GitHub Copilot): 티켓/인벤토리 검색 입력 trim 정규화 추가
- v1.0 (2026-01-23, GitHub Copilot): V2 어드민 유저 생성 기능 연결 및 호환성 보완 기록
