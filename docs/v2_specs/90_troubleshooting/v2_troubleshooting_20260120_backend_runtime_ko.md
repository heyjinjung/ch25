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
