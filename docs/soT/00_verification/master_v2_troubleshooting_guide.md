# V2 통합 트러블슈팅 가이드 (V2 Integrated Troubleshooting Guide)

**문서 번호**: TR-20260207-MASTER
**버전**: v1.0
**최종 업데이트**: 2026-02-07
**작성자**: Antigravity (Consolidated)
**대상 독자**: BE/FE Developers, OPS

---

## 1. 개요 (Overview)
본 문서는 V2 Admin 및 Backend 시스템 운영 중 발생한 20여 가지의 주요 이슈(Backend Runtime, Frontend Startup, UI Errors)에 대한 **원인 분석**과 **해결 방법**을 통합 정리한 가이드입니다.

---

## 2. Backend Runtime 이슈 (Backend Runtime Issues)
> 원본: `v2_troubleshooting_20260120_backend_runtime_ko.md`

### 2.1 서버 기동 및 초기화 실패 (Startup & Init Failures)

#### **NameError (Body, BaseModel 미정의)**
*   **증상**: `NameError: name 'Body' is not defined` 또는 `name 'BaseModel' is not defined`.
*   **원인**: FastAPI/Pydantic 모듈 임포트 누락.
*   **해결**: 
    ```python
    from fastapi import Body
    from pydantic import BaseModel
    ```

#### **Circular Import (순환 참조)**
*   **증상**: V1 Shim 라우터 로드 중 V2 모듈이 엮이면서 초기화 에러 발생.
*   **원인**: `app/v2/api/__init__.py` 등에서 패키지 레벨 임포트가 너무 과도하게 이루어짐.
*   **해결**: `__init__.py`를 비우거나, 함수 내부(Local import)에서 임포트하도록 조정하여 초기화 순서 문제 제거.

#### **Docker Code Sync 실패**
*   **증상**: 코드 수정 후 재시작해도 변경 사항 미반영.
*   **원인**: `docker-compose.yml` 볼륨 마운트 누락.
*   **해결**: `- ./app:/app/app` 등 볼륨 마운트 설정 추가.

### 2.2 API 요청/응답 에러 (API Logic Errors)

#### **UnboundLocalError (변수 미초기화)**
*   **증상**: `ticket_balance` 참조 에러.
*   **해결**: 변수 사용 전 `ticket_balance = 0` 등 초기값 명시적 할당.

#### **ValidationError (Enum, Schema Mismatch)**
*   **증상**: Admin API 호출 시 500 에러 (`reward_type`, `grade` Validation Error).
*   **원인**: DB에 저장된 레거시 값(`TICKET_DICE` 등)이 Pydantic 스키마(`TICKET`)와 불일치.
*   **해결**: Response Model 로드 시 DB 값을 Enum 허용값으로 **정규화(Normalize)** 하는 로직 추가.
    *   (예: `TICKET_*` → `TICKET`)

#### **WebSocket 404/Connection Failed**
*   **증상**: `/api/ws/events` 연결 실패.
*   **원인**: Nginx 또는 프론트엔드 프록시 설정에서 `Upgrade` 헤더 누락.
*   **해결**: 
    ```nginx
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    ```
    위 설정을 `nginx.conf` 및 `frontend.conf`에 모두 적용.

#### **Vault API 404 (경로 불일치)**
*   **증상**: `/withdrawals/{id}/approve` 호출 시 404.
*   **원인**: 프론트엔드와 백엔드 간 API 경로 불일치 (Prefix 누락 등).
*   **해결**: `admin/economy_routes.py`에 정확한 경로 매핑 및 `Include Router` 시 `prefix` 확인.

---

## 3. Frontend 구동 및 UI 이슈 (Frontend & UI Issues)
> 원본: `v2_troubleshooting_20260120_frontend_startup_ko.md`, `v2_troubleshooting_20260120_undefined_error_ko.md`

### 3.1 초기 구동 및 연결 (Startup & Connection)

#### **무한 리다이렉트 (Infinite Redirect Loop)**
*   **증상**: `/v2/admin/dashboard` 진입 시 URL 무한 반복.
*   **원인**: 내부 링크(`navigate`)가 V1 경로(`/admin/v2/...`)를 가리켜 라우터 충돌 발생.
*   **해결**: 모든 경로를 V2 표준(`navigate("/v2/admin/...")`)으로 통일.

#### **Connection Refused (Port 5173)**
*   **증상**: 브라우저 접속 불가.
*   **원인**: 실제 Vite 개발 서버 프로세스가 실행되지 않음.
*   **해결**: 
    1. `docker ps` 및 포트 확인.
    2. `npm run dev` 실행 상태 확인.

#### **TypeScript 빌드 에러 (TS6133)**
*   **증상**: `'React' is declared but its value is never read`.
*   **결**: 사용하지 않는 `import React` 구문 제거 (React 17+ JSX Transform).

### 3.2 UI 런타임 크래시 (Runtime Crash)

#### **Unlock `toLocaleString` of undefined**
*   **증상**: 화면이 흰색으로 변하며 멈춤. 콘솔에 `Cannot read properties of undefined (reading 'toLocaleString')` 출력.
*   **원인**: API 응답 내 숫자 필드(`ticketBalance` 등)가 `null` 또는 `undefined`로 왔는데 방어 코드 없이 사용.
*   **해결**: 
    ```tsx
    // Before
    {user.ticketBalance.toLocaleString()}
    
    // After (Safe)
    {(user.ticketBalance || 0).toLocaleString()}
    ```
    또는 Optional Chaining (`user?.metrics?.revenue ?? 0`) 활용.

#### **Invalid Date 표시**
*   **증상**: 날짜 필드가 `Invalid Date`로 표시됨.
*   **원인**: 필드명 불일치(camelCase vs snake_case) 또는 null 값.
*   **해결**: 백엔드 응답 스키마를 프론트엔드 계약(CamelCase)과 일치시키고, Null-safe 처리를 적용.

---

## 4. 예방 및 점검 체크리스트 (Prevention Checklist)

### Backend
- [ ] **Import Check**: 라우터 추가 시 필요한 모듈(`Body`, `Depends`) 임포트 확인.
- [ ] **Enum Validation**: DB의 레거시 값이 New Enum과 호환되는지 확인하고 정규화 로직 적용.
- [ ] **Path Consistency**: `@router.post("path")` 정의 시 URL Prefix 정확성 재확인.

### Frontend
- [ ] **Safe Navigation**: `null`/`undefined` 응답을 가정한 방어적 코딩(`|| 0`, `??`, `?.`) 필수 적용.
- [ ] **Route Standardization**: `navigate()` 호출 시 경로 상수를 사용하거나 V2 표준 경로 확인.
- [ ] **Process Check**: 연결 오류 시 코드 수정 전 `docker ps` 프로세스 상태부터 확인.

### Infrastructure
- [ ] **WebSocket Config**: Nginx Proxy 설정에 `Upgrade` 헤더 포함 여부 확인.
- [ ] **Volume Mount**: 개발 환경(`docker-compose.yml`)의 볼륨 마운트 정상 동작 확인.
