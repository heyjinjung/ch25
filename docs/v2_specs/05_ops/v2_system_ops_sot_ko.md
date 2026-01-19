문서 타입: SoT
버전: v1.0
작성일: 2026-01-19
작성자: GitHub Copilot
대상: BE/운영/QA
상태: SoT

# V2 System/Ops SoT (Health/Today-Feature/Metrics)

## 1. 목적 (Purpose)
V2 시스템/운영(System/Ops) 라우트의 **기준 응답/정책**을 정의한다.

## 2. 범위 (Scope)
- Health 체크
- Today Feature 조회
- Metrics 노출

## 3. 용어 정의 (Definitions)
- Health: 서비스 정상 여부를 확인하는 최소 상태 응답
- Today Feature: 금일 활성 기능/이벤트 타입
- Metrics: Prometheus 형식의 메트릭 출력

## 4. SoT: V2 System/Ops 라우트

### 4.1 Health
- Endpoint: `GET /api/v2/health`
- Auth: 없음
- Response (JSON):
```json
{ "status": "ok" }
```

### 4.2 Today Feature
- Endpoint: `GET /api/v2/today-feature`
- Auth: 선택적 (Bearer 토큰이 있으면 user_id 포함)
- Response (JSON):
```json
{ "feature_type": "<string>|null", "user_id": 123 }
```
- 규칙:
  - 스케줄이 없으면 `feature_type: null` 반환
  - 인증이 없으면 `user_id` 필드 제외

### 4.3 Metrics
- Endpoint: `GET /api/v2/metrics`
- Auth: 없음 (운영 환경에서 외부 접근은 인프라 레벨에서 제어)
- Response: Prometheus text format

## 5. 운영/검증 (QA)
- [ ] `/api/v2/health`가 200 OK + `{status: ok}` 반환
- [ ] `/api/v2/today-feature`가 200 OK + feature_type 반환
- [ ] 토큰 포함 호출 시 user_id 포함 여부 확인
- [ ] `/api/v2/metrics`가 Prometheus 포맷 응답

## 6. 변경 이력
- v1.0 (2026-01-19, GitHub Copilot): 최초 작성
