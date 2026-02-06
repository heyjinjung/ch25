문서 타입: API 계약
버전: v1.1
작성일: 2026-01-30
작성자: GitHub Copilot
대상: BE/FE/QA/운영
상태: SoT

# V2 System API 계약

## 1. 목적 (Purpose)
시스템 공통 라우트(헬스/기능/메트릭)의 상세 계약(요청/응답/에러/권한)을 정의한다.

## 2. 범위 (Scope)
- Health
- Today Feature
- Metrics

## 3. 공통 규칙
### 3.1 권한/헤더
- Auth: 없음
- 운영 환경에서 `/api/v2/metrics`는 인프라 레벨에서 접근 제어

### 3.2 공통 에러 코드
- 400: 잘못된 요청
- 401: 인증 필요
- 403: 권한 없음
- 422: 유효성 검증 실패
- 500: 서버 오류

## 4. API 상세

### 4.1 헬스 체크
- Method/Path: `GET /api/v2/health`
- Auth: 없음
- Parameters: 없음
- Response Schema: `HealthResponse`
- Example Response:
```json
{ "status": "ok" }
```

### 4.2 DB 헬스 체크
- Method/Path: `GET /api/v2/health/db`
- Auth: 없음
- Parameters: 없음
- Response Schema: `HealthResponse`
- Example Response:
```json
{ "status": "ok" }
```

### 4.3 Today Feature
- Method/Path: `GET /api/v2/today-feature`
- Auth: 선택적 (Bearer 토큰)
- Parameters: 없음
- Response Schema: `TodayFeatureResponse`
- Example Response (인증 없음):
```json
{ "feature_type": null }
```
- Example Response (인증 있음):
```json
{ "feature_type": "DAILY", "user_id": 123 }
```

### 4.4 Metrics
- Method/Path: `GET /api/v2/metrics`
- Auth: 없음
- Parameters: 없음
- Response: Prometheus text format

## 5. 근거 (Source)
- V2 System/Ops SoT: [docs/v2_specs/05_ops/v2_system_ops_sot_ko.md](docs/v2_specs/05_ops/v2_system_ops_sot_ko.md)
- OpenAPI: [docs/v2_specs/03_api/v2_legacy_openapi.yaml](docs/v2_specs/03_api/v2_legacy_openapi.yaml)
- 라우터: [app/v2/api/routes.py](app/v2/api/routes.py)

## 6. 변경 이력
- v1.1 (2026-01-30, GitHub Copilot): 상세 스펙/에러/근거 링크 추가
