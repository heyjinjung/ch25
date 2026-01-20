# V2 Backend Runtime 트러블슈팅 리포트

**문서 번호**: TR-20260120-03  
**작성일**: 2026-01-20  
**작성자**: GitHub Copilot  
**상태**: 해결됨(Resolved) + 관찰 필요  
**관련**: `app/v2/api/admin_routes.py`, docker compose backend/nginx

---

## 1. 개요
V2 Admin API 연동 과정에서 백엔드가 재시작/런타임 에러를 발생시킨 이슈를 정리한다. 현재 백엔드는 정상 기동 상태이며, 일부 인프라(nginx)는 별도 조치 필요로 기록한다.

---

## 2. 이슈 상세 및 해결

### 2.1 NameError: Body 미정의
- **증상**: backend 컨테이너가 `NameError: name 'Body' is not defined`로 기동 실패
- **원인**: `admin_routes.py`에서 `Body` import 누락
- **해결**: `from fastapi import ... Body` 추가
- **상태**: 해결됨

### 2.2 UnboundLocalError: ticket_balance 미초기화
- **증상**: `/api/v2/admin/users/{id}` 요청 시 `ticket_balance` 참조 에러
- **원인**: `ticket_balance` 초기값 없이 누적 로직 수행
- **해결**: `ticket_balance = 0` 초기화 추가
- **상태**: 해결됨

### 2.3 RouletteSegmentDto reward_type ValidationError
- **증상**: `/api/v2/admin/game/roulette/configs` 요청 시 `reward_type=TICKET_DICE`로 Pydantic ValidationError
- **원인**: 스키마 허용값(`POINT|CREDIT|TICKET|NONE`)과 DB 값 불일치
- **해결**: `reward_type` 정규화 로직 추가 (`TICKET_*` → `TICKET`, 기타 → `NONE`)
- **상태**: 해결됨

### 2.4 NameError: BaseModel 미정의
- **증상**: backend 컨테이너 기동 시 `NameError: name 'BaseModel' is not defined` 발생
- **원인**: 신규 추가된 `admin_routes.py` 내 DTO 클래스들이 `BaseModel`을 상속받고 있으나, 상단에 `from pydantic import BaseModel` 임포트가 누락됨
- **해결**: 파일 상단에 `from pydantic import BaseModel` 추가
- **상태**: 해결됨

### 2.5 라우터 패키지 임포트로 인한 조기 초기화 (Circular/Premature Import)
- **증상**: `BaseModel` 임포트 추가 후에도 V1 shim 라우터 로드 중 에러 발생 가능성 확인.
- **원인**: `app/v2/api/__init__.py`에서 `routes.router`를 성급하게 임포트함에 따라, V1 shim이 V2 모듈 하나를 참조할 때 V2 전체 라우터 트리가 의도치 않게 먼저 빌드되면서 초기화 순서 엉킴 발생.
- **해결**: `app/v2/api/__init__.py` 본문을 비워 패키지 임포트 시 부수 효과(side-effect) 제거. 필요한 경우 개별 모듈에서 명시적으로 임포트하도록 유도.
- **상태**: 해결됨

### 2.6 Docker 볼륨 마운트 누락으로 인한 코드 미반영
- **증상**: 코드를 수정하고 컨테이너를 재시작해도 수정 내용이 반영되지 않고 동일한 에러(ImportError)가 반복됨.
- **원인**: `docker-compose.yml`의 backend 서비스에 로컬 소스 코드(`src` or `app`) 볼륨 마운트가 설정되어 있지 않아, 이미지 빌드 시점의 코드만 실행됨.
- **해결**: `docker-compose.yml`에 `- ./app:/app/app` 볼륨 마운트 추가.
- **상태**: 해결됨

### 2.7 V2 Admin 라우터 경로 매핑 오류 (404/502)
- **증상**: 프론트엔드는 `/api/v2/admin/...` 경로를 호출하나, 백엔드는 `/api/v2/...`로 대기하여 404 발생 (또는 잘못된 경로 매핑).
- **원인**: `app/v2/api/routes.py`에서 `admin_router`를 include할 때 `prefix="/admin"` 설정이 누락됨.
- **해결**: `router.include_router(admin_router, prefix="/admin")`으로 수정.
- **상태**: 해결됨

### 2.8 WebSocket 연결 실패 (404/Connection Failed)
- **증상**: 프론트엔드에서 `/api/ws/events` 연결 시도 시 404 오류 또는 연결 실패. 백엔드 로그에 `GET /api/ws/events HTTP/1.0 404`가 찍힘.
- **원인**:
    1.  사용자가 Nginx Gateway(80)가 아닌 Frontend Container(3000)로 직접 접속하여 프록시 설정 부재. (기존 frontend.conf에 Upgrade Header 누락)
    2.  Nginx Gateway(80) 설정(`nginx.conf`)에서도 `/api/` 블록에 WebSocket Upgrade Header(`Connection: Upgrade`) 설정이 누락되어 있어, WS 요청이 HTTP/1.0 GET으로 다운그레이드되어 백엔드에 전달됨.
- **해결**:
    1.  `nginx.conf` (Gateway 80) 및 `nginx/frontend.conf` (Frontend 3000) 모두 `/api/`, `/admin/api/` 블록에 `proxy_http_version 1.1`, `Upgrade`, `Connection` 헤더 설정 추가 완료.
    2.  **조치**: `docker compose up -d --build frontend` 명령어로 프론트엔드 컨테이너 재빌드/재시작 필요.
- **상태**: 해결됨

### 2.9 Admin User 지갑/금고 수정 500 (wallet/adjust)
- **증상**: `/api/v2/admin/users/{id}/wallet/adjust` 요청이 500으로 실패 (Admin UI: 유저 디테일 드로우 → 지갑/금고 강제 수정)
- **원인**:
    1. `amount == 0` 또는 금고 출금 시 잔액 부족 등으로 `ValueError`가 그대로 전파
    2. 토큰 타입이 `SAEnum(GameTokenType)`에 매핑되지 않아 Enum 변환 예외 발생 가능
- **해결**:
    1. `amount == 0`은 400으로 명확히 거절
    2. `VAULT` deposit/withdraw의 `ValueError`를 400으로 변환(잔액 부족은 별도 코드)
    3. `token_type`은 `GameTokenType`로 안전 변환 후 조회/생성
- **상태**: 해결됨

### 2.10 RouletteConfigDto grade ValidationError (roulette/configs 500)
- **증상**: `/api/v2/admin/game/roulette/configs` 요청이 간헐적으로 500으로 실패
- **원인**: DB의 `roulette_config.grade`가 스키마 허용값(`COMMON|VIP|WHALE|AT_RISK`)과 불일치할 경우, `response_model` 직렬화 단계에서 ValidationError 발생
- **해결**: grade 정규화 로직 추가(legacy 값은 허용 범위로 매핑) + 직렬화 실패 시 `logger.exception`으로 스택 로그 남김
- **상태**: 해결됨(데이터 정합성 관찰 필요)

### 2.11 Admin Mission update rewardType Enum mismatch (missions PUT 500)
- **증상**: `PUT /api/v2/admin/game/missions/{id}` 요청이 500으로 실패
- **원인**: `mission.reward_type(SAEnum)`에 `payload.rewardType` 문자열을 그대로 대입하여 Enum 변환 실패(유효하지 않은 값)
- **해결**: `MissionRewardType`로 사전 검증/변환 후 저장. invalid면 400(`INVALID_REWARD_TYPE`) 반환 + 예외는 `logger.exception`으로 기록
- **상태**: 해결됨

### 2.12 Withdrawal Approve/Reject API 404 에러
- **증상**: Admin Vault 페이지에서 출금 승인/반려 시도 시 `404 Not Found` 에러 발생. 프론트엔드는 `/api/v2/admin/withdrawals/{id}/approve|reject`를 호출하나 백엔드에 해당 엔드포인트 없음.
- **원인**:
    1. 기존 프론트엔드가 사용하는 경로(`/withdrawals/{id}/approve|reject`)에 대한 백엔드 구현이 누락됨
    2. `vault_routes.py`에 잘못된 경로(`/vault/withdrawals/...`)로 구현되어 있었으나, admin router 구조상 실제 경로는 `/api/v2/admin/vault/withdrawals/...`가 되어 프론트와 불일치
- **해결**:
    1. `app/v2/api/admin/economy_routes.py`에 `/withdrawals/{withdrawal_id}/approve` (POST) 추가
    2. `app/v2/api/admin/economy_routes.py`에 `/withdrawals/{withdrawal_id}/reject` (POST) 추가
    3. reject 엔드포인트는 `AdminWithdrawalRejectRequest` 스키마를 사용하여 JSON body로 `reason` 수신
    4. 승인 시 `withdrawal.status = "APPROVED"`, `approved_at`, `approved_by` 설정
    5. 반려 시 `withdrawal.status = "REJECTED"`, `rejected_at`, `rejection_reason` 설정
    6. 모든 변경사항은 `AdminAuditService.log`로 감사 로그 기록
- **프론트엔드 개선**:
    1. `VaultControlPage.tsx`에서 `SlideToApprove` 컴포넌트 제거
    2. 일반 `Button` 컴포넌트로 교체하여 UX 개선 (로딩 상태 표시 추가)
    3. 출금 상세 내역 모달 추가 (금고 통계 카드 클릭 시 PENDING/APPROVED/REJECTED 내역 테이블 표시)
- **상태**: 해결됨

### 2.13 Admin User 디테일 드로우 데이터 표시 이상 (0/Invalid Date)
- **증상**: Admin 유저 디테일 드로우에서 티켓/금고 잔액이 0으로 보이거나, 날짜가 `Invalid Date`로 표시됨.
- **원인**:
    1. 백엔드 응답 필드명이 프론트가 기대하는 계약(camelCase)과 불일치
    2. 레거시 데이터의 NULL/빈 값이 직렬화/파싱 단계에서 예외를 유발
- **해결**:
    1. 백엔드 응답 스키마를 프론트 계약(camelCase)과 정렬(필요 시 alias/serialize alias 적용)
    2. NULL-safe 기본값을 적용하여 response_model 직렬화 및 프론트 파싱 안정화
    3. 날짜/시간 필드는 ISO 형식 문자열로 일관되게 전달
- **상태**: 해결됨(화면 동작 확인)

### 2.14 Admin User 금고(VAULT) 강제 수정 400 (user not found)
- **증상**: Admin UI에서 금고(VAULT) 강제 수정 시 `400 user not found`가 발생.
- **원인**: V2 vault 서비스가 `v2_user` 테이블 row 존재를 전제로 동작하여, 운영 DB에서 v2_user가 미동기화된 경우 실패.
- **해결**: 금고 SoT를 `User.vault_locked_balance`로 고정하고, VAULT 입금/출금이 `User`를 직접 업데이트하도록 서비스 로직 전환.
- **상태**: 해결됨

### 2.15 Admin Mission rewardType 업데이트 400 (INVALID_REWARD_TYPE)
- **증상**: `PUT /api/v2/admin/game/missions/{id}` 요청이 `400 INVALID_REWARD_TYPE`로 실패(미션 관리 화면에서 rewardType 변경 불가).
- **원인**: 프론트에서 전송하는 `rewardType` 값이 백엔드 `MissionRewardType` enum 허용값과 불일치.
- **해결**:
    1. 프론트에서 선택 옵션을 `MissionRewardType` 허용값만 노출/전송하도록 제한(MISSION_REWARD_OPTIONS)
    2. 백엔드는 invalid 입력 시 400을 유지하여 계약 위반을 조기 차단
- **상태**: 해결됨

---

## 3. 관찰 필요 (Known Issues)
- **3.1 nginx 인증서 파일 누락**: `fullchain.pem` 미존재로 nginx 재시작 반복. (인프라 조치 필요)
- **3.2 레거시 라우터 의존성**: `app/api/admin/routes/`의 많은 파일들이 V2를 참조하고 있어, V2 구조 변경 시 상호 영향도 체크 필수.

---

## 4. 재발 방지 체크리스트
- [ ] FastAPI 라우터 추가 시 `Body`/`Query`/`Path`/`BaseModel` 임포트 확인
- [ ] `__init__.py`에서의 과도한 임포트(Side-effects) 지양
- [ ] DTO 변환 전 기본값 초기화 확인
- [ ] Enum/Literal 스키마와 DB 값 불일치 시 정규화 로직 적용
- [ ] V1 Shim 라우터 변경 시 V2 모듈과의 순환 참조 여부 검토
- [ ] V2 Admin 핵심 회귀 테스트 수행: `pytest -q tests/v2_tests/phase4_admin` (최근 실행 결과: 32 passed)
