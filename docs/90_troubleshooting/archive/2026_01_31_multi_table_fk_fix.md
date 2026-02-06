# 트러블슈팅: 다중 테이블 FK v2_user 마이그레이션 (Issue 20)

**문서 타입**: 트러블슈팅  
**작성일**: 2026-01-31  
**상태**: ✅ 해결완료  
**관련 이슈**: Issue 19 확장, Issue 20

---

## 1. 증상 (Symptoms)

### 1.1 사용자 보고
- "레벨 정보를 불러올 수 없습니다" 메시지 표시
- 게임(룰렛/주사위/복권) 플레이 버튼은 작동하나 결과 표시 안됨
- 티켓 차감 안됨
- 금고 관련 기능 오류

### 1.2 에러 로그
```
ERROR: Unhandled SQLAlchemyError on GET /api/level-xp/status
IntegrityError: (1452, 'Cannot add or update a child row: 
a foreign key constraint fails (`xmas_event`.`user_level_progress`, 
CONSTRAINT `user_level_progress_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE)')

IntegrityError: (1452, '...`trial_token_bucket`, 
CONSTRAINT `trial_token_bucket_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE)')
```

### 1.3 영향 범위
- **HTTP Status**: 500 Internal Server Error
- **영향 기능**: 전체 게임, 레벨 조회, 금고 기능
- **영향 유저**: 전체 유저
- **재현 빈도**: 항상

---

## 2. 원인 분석 (Root Cause Analysis)

### 2.1 직접 원인
V2 시스템은 `v2_user` 테이블을 사용하지만, 다수의 테이블이 레거시 `user` 테이블을 FK로 참조

### 2.2 근본 원인
- V1 → V2 마이그레이션 시 모든 FK를 일괄 변경하지 않음
- Issue 18에서 일부 테이블만 수정 (user_activity, user_mission_progress)
- 나머지 테이블은 여전히 레거시 `user` 참조

### 2.3 FK 조회 결과
```
trial_token_bucket: trial_token_bucket_ibfk_1 -> user
user_level_progress: user_level_progress_ibfk_1 -> user
user_xp_event_log: user_xp_event_log_ibfk_1 -> user
user_streak: user_streak_ibfk_1 -> user
user_segment: user_segment_ibfk_1 -> user
user_retention_state: user_retention_state_ibfk_1 -> user
user_level_reward_log: user_level_reward_log_ibfk_1 -> user
user_cash_ledger: user_cash_ledger_ibfk_1 -> user
vault_ledger: vault_ledger_ibfk_1 -> user
vault_status: vault_status_ibfk_2 -> user
vault_earn_event: vault_earn_event_ibfk_1 -> user
vault_withdrawal_request: vault_withdrawal_request_ibfk_1 -> user
v2_retention_roi_log: v2_retention_roi_log_ibfk_1 -> user
v2_user_retention_state: v2_user_retention_state_ibfk_1 -> user
retention_roi_log: retention_roi_log_ibfk_1 -> user
```

---

## 3. 해결 방법 (Solution)

### 3.1 마이그레이션 파일
- **파일**: `alembic/versions/20260131_0300_fix_trial_token_bucket_fk.py`
- **전략**: 
  1. 기존 FK 삭제 (IF EXISTS)
  2. 고아 데이터 삭제 (user_id NOT IN v2_user)
  3. 새 FK 생성 (→ v2_user)

### 3.2 마이그레이션 코드 핵심
```python
tables = [
    ("trial_token_bucket", "trial_token_bucket_ibfk_1", "trial_token_bucket_fk_v2_user"),
    ("user_level_progress", "user_level_progress_ibfk_1", "user_level_progress_fk_v2_user"),
    ("user_xp_event_log", "user_xp_event_log_ibfk_1", "user_xp_event_log_fk_v2_user"),
    # ... 15개 테이블
]

for table_name, old_fk, new_fk in tables:
    _safe_drop_fk(conn, table_name, old_fk)
    _delete_orphans(conn, table_name)
    _safe_create_fk(conn, table_name, new_fk, "v2_user")
```

### 3.3 적용 명령어
```bash
# 서버에서 직접 적용
docker cp /root/ch25_temp/alembic/versions/20260131_0300_fix_trial_token_bucket_fk.py xmas-backend:/app/alembic/versions/
docker exec -w /app xmas-backend alembic upgrade head
```

### 3.4 적용 결과
```
[MIGRATION] Dropped FK trial_token_bucket_ibfk_1 from trial_token_bucket
[MIGRATION] trial_token_bucket: deleted 0 orphan rows
[MIGRATION] Created FK trial_token_bucket_fk_v2_user on trial_token_bucket -> v2_user
[MIGRATION] Dropped FK user_level_progress_ibfk_1 from user_level_progress
[MIGRATION] user_level_progress: deleted 0 orphan rows
[MIGRATION] Created FK user_level_progress_fk_v2_user on user_level_progress -> v2_user
... (15개 테이블 모두 성공)
```

---

## 4. 검증 (Verification)

### 4.1 FK 상태 확인
```bash
docker exec -w /app xmas-backend python check_fk_server.py
```

### 4.2 예상 결과
모든 대상 테이블이 `v2_user` 참조:
```
trial_token_bucket: trial_token_bucket_fk_v2_user -> v2_user
user_level_progress: user_level_progress_fk_v2_user -> v2_user
...
```

### 4.3 기능 테스트
- [ ] 레벨 정보 조회 (`/api/level-xp/status`)
- [ ] 주사위 게임 플레이
- [ ] 룰렛 게임 플레이
- [ ] 복권 게임 플레이
- [ ] 금고 관련 기능

---

## 5. 재발 방지 (Prevention)

### 5.1 단기
- FK 확인 스크립트 정기 실행: `scripts/check_fk_server.py`

### 5.2 장기
- V1 테이블 완전 폐기 계획 수립
- 신규 테이블 생성 시 `v2_user` FK 필수 검증
- CI에 FK 참조 검증 추가

---

## 6. 관련 커밋

| 커밋 | 설명 |
|------|------|
| `e2d13c95` | fix: Issue 19 확장 - 다중 테이블 FK v2_user 마이그레이션 |

---

## 7. 타임라인

| 시각 (KST) | 이벤트 |
|------------|--------|
| 2026-01-31 11:30 | 에러 보고 (레벨 정보 불러오기 실패) |
| 2026-01-31 11:35 | 로그 분석 → user_level_progress FK 에러 확인 |
| 2026-01-31 11:40 | 전체 FK 조회 → 15개 테이블 레거시 user 참조 확인 |
| 2026-01-31 11:50 | 마이그레이션 파일 생성 |
| 2026-01-31 12:00 | 마이그레이션 적용 완료 |
| 2026-01-31 12:05 | 검증 및 문서 업데이트 |

---

## 8. 변경 이력

- 2026-01-31: 최초 작성
