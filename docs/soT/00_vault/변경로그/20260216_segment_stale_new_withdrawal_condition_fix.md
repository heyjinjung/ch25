문서 타입: 변경로그
버전: v1.0
작성일: 2026-02-16
작성자: GitHub Copilot
도메인: VAULT / SEGMENT
상태: 적용 완료 (코드 + 운영 DB)

# 세그먼트 만료 미반영으로 인한 출금 조건 오적용 해결

## 1. 증상

| 항목 | 내용 |
|---|---|
| **대상 기능** | 금고 출금 조건 세그먼트별 적용 |
| **HTTP Status** | 200 (Logic Error) |
| **영향 범위** | 가입 7일 초과 유저 24명 (전체 39명 중) |
| **재현 빈도** | 항상 |

- 어드민에서 COMMON으로 분류되어야 할 유저에게 NEW 세그먼트 기준의 출금 조건이 적용됨
- NEW: 플레이 5회/소비 0원 vs COMMON: 플레이 15회/소비 5,000원 → 조건이 너무 쉽게 충족

## 2. 근본 원인 (Root Cause Analysis)

### 2.1 Celery 배치 미실행
- **증거**: 운영서버 Redis가 read-only 상태 (`ReadOnlyError: You can't write against a read only replica`)
- Celery 세그먼트 배치(`execute_segment_batch_task`)가 일 1회 실행되어야 하지만 Redis 장애로 실행 불가
- 결과: 가입 시 NEW로 분류된 유저가 7일 경과 후에도 재분류되지 않음

### 2.2 get_current_segment() 캐시 의존
- `V2SegmentService.get_current_segment()`가 `v2_user_segment` 테이블 값을 무조건 신뢰
- NEW 세그먼트 만료(7일 경과) 검증 로직 부재 → stale 데이터 반환

### 2.3 vault_service 세그먼트 조건 매핑 중복
- `get_vault_info()`와 `request_withdrawal()` 두 곳에 동일한 if-elif 체인 중복
- 유지보수 시 한 쪽만 수정될 위험

## 3. 운영 DB 증거

수정 전 `v2_user_segment` 테이블:
- 전체: 39명
- NEW: 26명 ← 비정상 (실제 7일 이내: 6명)
- COMMON: 10명
- WHALE: 1명

가입일 대비 경과일 (대표 샘플):
| user_id | segment | age_days |
|---------|---------|----------|
| 1       | NEW     | 13일     |
| 8       | NEW     | 13일     |
| 17      | NEW     | 12일     |
| 30      | NEW     | 10일     |

## 4. 수정 내역

### 4.1 코드 수정

| 파일 | 변경 내용 |
|------|---------|
| `app/v2/services/segment_service.py` | `get_current_segment()`에 NEW 만료 자동 보정 로직 추가 — 가입 7일 초과 시 pending_segment 적용 또는 규칙 재평가 후 DB 업데이트 |
| `app/v2/services/vault_service.py` | `SEGMENT_WITHDRAWAL_CONDITIONS` 상수 + `_get_withdrawal_targets()` 헬퍼 메서드 추출 — 중복 if-elif 제거 |

### 4.2 운영 DB 수정
```sql
UPDATE v2_user_segment s
JOIN v2_user u ON s.user_id = u.id
SET s.segment = COALESCE(s.pending_segment, 'COMMON'),
    s.pending_segment = NULL
WHERE s.segment = 'NEW'
  AND DATEDIFF(NOW(), u.created_at) > 7;
```

수정 후 결과:
- NEW: 6명 (실제 7일 이내만)
- COMMON: 24명
- AT_RISK: 3명 (pending_segment 반영)
- VIP: 1명 (pending_segment 반영)
- WHALE: 1명

## 5. 방어 메커니즘 (코드 변경 효과)
- Celery 배치가 실행되지 않더라도 `get_current_segment()` 호출 시점에 NEW 만료를 자동 감지
- 유저가 금고 페이지 접속할 때 `GET /api/v2/vault/status` → `get_vault_info()` → `get_current_segment()` 호출되므로 실시간 보정
- 세그먼트 조건 매핑이 단일 상수(`SEGMENT_WITHDRAWAL_CONDITIONS`)로 관리되어 불일치 방지

## 6. 잔여 문제
- **Redis read-only**: 운영서버 Redis 설정 점검 필요 (Celery 전체에 영향)
- 현재 코드 수정으로 세그먼트 문제는 실시간 보정되지만, 다른 Celery 태스크도 영향받을 수 있음
