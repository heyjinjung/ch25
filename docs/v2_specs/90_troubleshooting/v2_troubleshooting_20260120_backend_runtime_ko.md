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
