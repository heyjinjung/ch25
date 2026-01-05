# Admin User Identity Monitoring (F3)
문서 타입: 운영/모니터링 가이드
작성일: 2026-01-03

## 1. 목적
어드민에서 식별자(resolve) 기반 흐름이 확산되면서, 운영 중에 다음 오류가 얼마나 자주 발생하는지 관측한다.
- 409 `AMBIGUOUS_IDENTIFIER` (중복 매칭/모호성)
- 404 `USER_NOT_FOUND` (미존재)

## 2. 로그 기반 지표(최소 연결)
Resolver는 실패 시 아래 이벤트 로그를 남긴다.
- message: `admin_user_resolve_failed`
- fields (extra):
  - `status_code`: `404` 또는 `409`
  - `error_code`: `USER_NOT_FOUND` 또는 `AMBIGUOUS_IDENTIFIER`
  - `identifier_kind`: `numeric` | `tg_external_id` | `username` | `text`
  - `identifier_fp`: 식별자 원문을 SHA256으로 해시한 10자리 prefix (원문 미노출)

> 주의: `identifier_fp`는 집계/상관분석용이며 PII 원문을 로그에 남기지 않는다.

## 3. 운영에서의 활용 예
### 3.1 빈도 집계
- 404 빈도: `admin_user_resolve_failed` AND `status_code=404`
- 409 빈도: `admin_user_resolve_failed` AND `status_code=409`

### 3.2 원인 분류
- `identifier_kind`별로 나누면 어떤 입력 타입에서 실패가 많은지 확인 가능
  - 예: `text`가 많으면 닉네임 중복/외부ID 혼동 가능성

## 4. 알림(선택)
로그 수집 시스템(예: Loki/ELK/Cloud logging)에서 아래 룰로 간단 알림을 구성할 수 있다.
- 5분 동안 409가 N회 이상이면 운영자에게 알림(중복 데이터 증가/입력 혼선 가능)
- 5분 동안 404가 N회 이상이면 입력 UX/가이드 개선 검토
