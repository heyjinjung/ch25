문서 타입: Learned SoT
버전: v1.0
작성일: 2026-02-06
작성자: GitHub Copilot
대상: V2 Admin (Backend/Frontend/Ops)
상태: SoT

# V2 Admin 감사로그/라우팅 표준 규칙 (Audit & Routing Rules)

## 1. 목적
V2 Admin에서 반복적으로 발생하는 운영 장애/혼선을 줄이기 위해, 아래 2가지 규칙을 **최종 SoT**로 고정한다.

1) Admin 감사로그 기록 호출 표준(메서드/파라미터)
2) Admin API 라우팅 prefix 정합 규칙(프론트-백엔드 경로 불일치 방지)

## 2. 범위
- 백엔드: `app/v2/api/admin/*`, Admin 관련 서비스/미들웨어
- 프론트엔드: `src/v2/admin/*`, `src/v2/api/adminApi.ts`
- Admin API prefix: `/api/v2/admin/*`

## 3. 배경(근거)
### 3.1 감사로그 호출 오타로 인한 500
- 증상: Admin 닉네임 수정에서 500 (`AttributeError: ... has no attribute 'log_action'`)
- 원인: 존재하지 않는 메서드명 호출 및 인자 순서 불일치
- 결론: **감사로그 기록은 표준 메서드/표준 시그니처로만 호출**되어야 한다.

### 3.2 Admin 라우팅 prefix 불일치로 인한 404
- 증상: 붙여넣기 Import preview API가 404
- 원인: 프론트는 `/api/v2/admin/csv-import/...`를 기대했으나 백엔드는 `/api/v2/admin/paste-import/...`로 등록
- 결론: **라우터 prefix와 프론트 경로는 “문자열 1:1 동일”**해야 한다.

## 4. 규칙

## 4.1 Admin 감사로그 호출 표준
### 4.1.1 표준 API
- 허용: `V2AdminAuditService.log(...)`
- 금지: `V2AdminAuditService.log_action(...)` 등 **표준 외 메서드명**

### 4.1.2 표준 시그니처(원칙)
- 필수 입력을 키워드 인자로 명시하여 인자 순서 실수를 방지한다.

예시(표준 호출 예):
```python
# ✅ 표준
V2AdminAuditService.log(
    db,
    admin_id,
    "UPDATE_NICKNAME",
    target_type="USER",
    target_id=str(user_id),
    payload_json={"newNickname": new_nickname},
)
```

### 4.1.3 적용 기준
- Admin에서 유저/자산/설정/운영 데이터에 영향을 주는 모든 변경(POST/PATCH/PUT/DELETE)
- “운영 결과가 남아야 하는” async 작업 시작/완료(가능하면 `v2_ops_execution_result`와 함께 추적)

### 4.1.4 검증 체크
- 엔드포인트 단위로 "감사로그 1건 이상"이 생성되는지 확인
- 500/예외 상황에서도 감사로그가 남아야 하는 케이스는 별도 정책으로 명시(필요 시 outbox 패턴)

## 4.2 Admin API 라우팅 prefix 정합 규칙

### 4.2.1 최상위 prefix
- Admin API는 반드시 `/api/v2/admin` 하위로만 노출한다.

### 4.2.2 서브 prefix는 단일 소스
- 백엔드 라우터 데코레이터의 path와 프론트의 호출 path는 **완전히 동일**해야 한다.
- 경로 설계 시 “리소스 그룹(prefix)”를 먼저 확정하고, 그 아래에 세부 action을 배치한다.

예시(표준 패턴):
- 리소스 그룹: `csv-import`
  - `POST /api/v2/admin/csv-import/paste-import/preview`
  - `POST /api/v2/admin/csv-import/paste-import`

### 4.2.3 금지 패턴
- 프론트는 `csv-import/*`를 호출하는데, 백엔드는 `paste-import/*`를 루트에 직접 매다는 형태
- 동일 기능이 `csv-import`와 `paste-import` 등으로 분산되어 운영자가 경로를 추측해야 하는 형태

### 4.2.4 검증 체크
- 프론트에서 호출하는 모든 Admin API path를 수집하여(예: `adminApi.ts`) 백엔드 라우터와 1:1 매칭
- 404 발생 시 “라우터 미등록”이 아니라 **prefix 불일치** 여부를 먼저 확인

## 5. 운영 가이드(최소)
- 신규 Admin 엔드포인트 추가 시 체크리스트
  1) `/api/v2/admin/*` 하위인지 확인
  2) 프론트 호출 경로와 라우터 path를 문자열로 대조
  3) 변경성 작업이면 `V2AdminAuditService.log(...)`를 표준 시그니처로 호출

## 6. 변경 이력
- v1.0 (2026-02-06, GitHub Copilot): W06 장애 사례를 근거로 감사로그/라우팅 규칙 SoT 승격
