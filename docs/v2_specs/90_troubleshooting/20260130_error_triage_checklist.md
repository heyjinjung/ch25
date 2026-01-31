# 🚨 에러 트리아지 체크리스트 (2026-01-30 ~ 01-31)

## 배포 전 대기 중인 수정사항

| # | 에러 | 영향범위 | 긴급도 | 상태 |
|---|------|----------|--------|------|
| 8 | INVALID_REWARD_TYPE (VAULT) | 어드민 | 🟡 중 | ✅ 코드완료 |
| 9 | FK 500 에러 (티켓/인벤토리 지급) | 유저 | 🔴 높음 | ✅ 코드완료 |
| 10 | FK 마이그레이션 실패 (1091) | 배포 | 🔴 높음 | ✅ 수정완료 |
| 11 | npm build 실패 (TS2307) | 배포 | 🔴 높음 | ✅ 수정완료 |
| 12 | FK IntegrityError (1452) | 배포 | 🔴 높음 | ✅ 옵션A 적용 |
| 13 | v2_dice_config 컬럼 누락 (1054) | 전체 | 🔴 높음 | ✅ 마이그레이션 작성 |
| 14 | v2_lottery_config 컬럼 누락 | 전체 | 🔴 높음 | ✅ 마이그레이션 작성 |
| 15 | external_ranking FK (1452) | 어드민 | 🔴 높음 | ✅ 마이그레이션 작성 |
| 16 | V2User.login_streak AttributeError | 어드민 | 🔴 높음 | ✅ 코드수정 |
| 17 | Sentry 에러 캡처 안됨 | 모니터링 | 🟡 중 | ✅ 코드수정 |
| 18 | telegram/auth FK (1452) | 유저 | 🔴 높음 | ✅ 마이그레이션 적용 |
| 19 | ModuleNotFoundError v2_user | 전체 게임 | 🔴 높음 | ✅ 수정완료 |
| **20** | **다중 테이블 FK v2_user (1452)** | **전체 게임/레벨** | **🔴 높음** | **✅ 마이그레이션 적용** |
| **21** | **/api/v2/admin/ops/status 500 (ModuleNotFoundError)** | **어드민** | **🔴 높음** | **⚠️ 재발(배포필요)** |

**상세 문서**: 
- [2026_01_30_fk_mission_sentry.md](./2026_01_30_fk_mission_sentry.md)
- [2026_01_31_game_module_import.md](./2026_01_31_game_module_import.md)
- [2026_01_31_multi_table_fk_fix.md](./2026_01_31_multi_table_fk_fix.md)

---

## Issue 13 & 14: v2_dice_config / v2_lottery_config 컬럼 누락 (OperationalError 1054)

### 에러
```
OperationalError: (1054, "Unknown column 'v2_dice_config.win_probability' in 'field list'")
```

### 원인
- `20260119_1500_add_v2_game_tables` 마이그레이션에서 `v2_dice_config` 생성 시 확률/골든아워 컬럼 누락
- `v2_lottery_config`의 `puzzle_piece_probability` 컬럼도 누락
- 모델(코드)과 DB 스키마 불일치

### 누락 컬럼 목록
| 테이블 | 누락 컬럼 |
|--------|-----------|
| v2_dice_config | `win_probability`, `draw_probability`, `lose_probability`, `daily_gain_cap`, `enable_golden_hour`, `golden_hour_multiplier` |
| v2_lottery_config | `puzzle_piece_probability` |

### 해결
- 마이그레이션 파일 생성: `alembic/versions/20260130_2000_add_missing_v2_game_columns.py`
- `_safe_add_column()` 헬퍼로 IF NOT EXISTS 방식 적용

---

## Issue 10: FK 마이그레이션 실패 (OperationalError 1091)

### 에러
```
OperationalError: (1091, "Can't DROP 'user_game_wallet_ibfk_1'; check that column/key exists")
```

### 원인
- 운영 DB에 FK가 이미 없거나 다른 이름으로 존재
- 하드코딩된 FK 이름으로 DROP 시도 → 실패

### 해결
- 마이그레이션을 `IF EXISTS` 방식으로 수정
- `_safe_drop_fk()`, `_safe_create_fk()` 헬퍼 함수 추가
- 파일: `alembic/versions/20260130_1900_migrate_fk_to_v2_user.py`

---

## Issue 18: telegram/auth FK 에러 (IntegrityError 1452) ✅

### 에러
```
POST /api/v2/telegram/auth HTTP/1.1" 500 Internal Server Error
IntegrityError: (1452, 'Cannot add or update a child row: 
a foreign key constraint fails (`xmas_event`.`user_activity`, 
CONSTRAINT `user_activity_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`)...')

IntegrityError: (1452, '...`user_mission_progress`, 
CONSTRAINT `user_mission_progress_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`)...')
```

### 원인
- `user_activity`, `user_mission_progress` 테이블의 FK가 레거시 `user` 테이블 참조
- V2 시스템은 `v2_user` 테이블 사용 → FK 충돌
- 텔레그램 인앱 로그인 시 v2_user.id로 INSERT 시도 → FK 위반

### 해결
- 마이그레이션: `20260130_2500_fix_user_activity_fk.py`
- 대상 테이블: `user_activity`, `user_activity_event`, `user_mission_progress`
- FK를 `user.id` → `v2_user.id`로 변경

### 적용 시각
- 2026-01-30 21:XX KST (운영 서버 직접 적용)

---

## 배포 명령어

```bash
# 1. 커밋 & 푸시
git add -A
git commit -m "fix: Issue 8,9 - VAULT 보상 + FK v2_user 마이그레이션"
git push origin main

# 2. CI/CD 완료 후 마이그레이션 확인 (서버에서)
docker compose exec backend alembic current
# 예상: 20260130_1900_fk_v2_user

# 3. 문제 시 롤백
docker compose exec backend alembic downgrade 20260130_1800_add_v2_user_password_hash
```

---

## Sentry 에러 분류 기준

### ✅ 무시 (배포로 해결됨)
- `INVALID_REWARD_TYPE`
- `IntegrityError: foreign key constraint fails` (user_game_wallet, user_inventory)
- `User` 관련 join 에러

### 🔴 즉시 대응 (배포 후 새로 발생)
- 새로운 500 에러
- 마이그레이션 실패
- 인증 관련 에러

### 🟡 모니터링 (추후 조사)
- 주사위/복권 설정 로드 실패
- 기타 어드민 페이지 에러

---

## 빠른 진단 명령어

```bash
# 현재 마이그레이션 상태
docker compose exec backend alembic current

# 최근 로그 확인
docker compose logs backend --tail=50

# DB 연결 테스트
docker compose exec backend python -c "from app.db.session import SessionLocal; print('DB OK')"

# FK 제약조건 확인
docker compose exec backend python -c "
from sqlalchemy import text
from app.db.session import SessionLocal
db = SessionLocal()
r = db.execute(text('''
  SELECT TABLE_NAME, CONSTRAINT_NAME, REFERENCED_TABLE_NAME 
  FROM information_schema.KEY_COLUMN_USAGE 
  WHERE TABLE_SCHEMA=DATABASE() 
  AND TABLE_NAME IN (\"user_game_wallet\",\"user_inventory_item\")
  AND REFERENCED_TABLE_NAME IS NOT NULL
''')).fetchall()
for x in r: print(x)
"
```

---

## Issue 19: ModuleNotFoundError v2_user (2026-01-31)

### 에러
```
ModuleNotFoundError: No module named 'app.v2.models.v2_user'
POST /api/v2/roulette/play HTTP/1.1" 500 Internal Server Error
POST /api/v2/dice/play HTTP/1.1" 500 Internal Server Error
POST /api/v2/lottery/play HTTP/1.1" 500 Internal Server Error
```

### 원인
- `vault_service.py:186`에서 잘못된 import 경로 사용
- `from app.v2.models.v2_user import V2User` → 파일 없음
- 실제 파일: `app/v2/models/user.py`

### 해결
```python
# Before
from app.v2.models.v2_user import V2User

# After
from app.v2.models.user import V2User
```

### 커밋
- `62158bd2` fix: ModuleNotFoundError v2_user import path (vault_service.py)

### 상세 문서
- [2026_01_31_game_module_import.md](./2026_01_31_game_module_import.md)

---

## Issue 20: 다중 테이블 FK v2_user 마이그레이션 (2026-01-31)

### 에러
```
IntegrityError: (1452, 'Cannot add or update a child row: 
a foreign key constraint fails (`xmas_event`.`trial_token_bucket`, 
CONSTRAINT `trial_token_bucket_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`)...')

IntegrityError: (1452, '...`user_level_progress`, 
CONSTRAINT `user_level_progress_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`)...')
```

### 영향 범위
- 전체 게임 (dice/roulette/lottery) 플레이 불가
- 레벨 정보 조회 불가 ("레벨 정보를 불러올 수 없습니다")
- 금고 관련 기능 오류

### 원인
- V2 시스템은 `v2_user` 테이블 사용
- 다수의 테이블이 여전히 레거시 `user` 테이블을 FK로 참조
- `v2_user.id`로 INSERT 시도 → FK 제약조건 위반

### 대상 테이블 (15개)
| 테이블 | 기존 FK | 신규 FK |
|--------|---------|---------|
| trial_token_bucket | trial_token_bucket_ibfk_1 → user | trial_token_bucket_fk_v2_user → v2_user |
| user_level_progress | user_level_progress_ibfk_1 → user | user_level_progress_fk_v2_user → v2_user |
| user_xp_event_log | user_xp_event_log_ibfk_1 → user | user_xp_event_log_fk_v2_user → v2_user |
| user_streak | user_streak_ibfk_1 → user | user_streak_fk_v2_user → v2_user |
| user_segment | user_segment_ibfk_1 → user | user_segment_fk_v2_user → v2_user |
| user_retention_state | user_retention_state_ibfk_1 → user | user_retention_state_fk_v2_user → v2_user |
| user_level_reward_log | user_level_reward_log_ibfk_1 → user | user_level_reward_log_fk_v2_user → v2_user |
| user_cash_ledger | user_cash_ledger_ibfk_1 → user | user_cash_ledger_fk_v2_user → v2_user |
| vault_ledger | vault_ledger_ibfk_1 → user | vault_ledger_fk_v2_user → v2_user |
| vault_status | vault_status_ibfk_2 → user | vault_status_fk_v2_user → v2_user |
| vault_earn_event | vault_earn_event_ibfk_1 → user | vault_earn_event_fk_v2_user → v2_user |
| vault_withdrawal_request | vault_withdrawal_request_ibfk_1 → user | vault_withdrawal_request_fk_v2_user → v2_user |
| v2_retention_roi_log | v2_retention_roi_log_ibfk_1 → user | v2_retention_roi_log_fk_v2_user → v2_user |
| v2_user_retention_state | v2_user_retention_state_ibfk_1 → user | v2_user_retention_state_fk_v2_user → v2_user |
| retention_roi_log | retention_roi_log_ibfk_1 → user | retention_roi_log_fk_v2_user → v2_user |

### 해결
- 마이그레이션: `20260131_0300_fix_trial_token_bucket_fk.py`
- 전략: Drop old FK → Delete orphan data → Create new FK to v2_user

### 커밋
- `e2d13c95` fix: Issue 19 확장 - 다중 테이블 FK v2_user 마이그레이션

### 적용 시각
- 2026-01-31 12:XX KST (운영 서버 직접 적용)

### 상세 문서
- [2026_01_31_multi_table_fk_fix.md](./2026_01_31_multi_table_fk_fix.md)

---

## 에러 발생 시 대응 플로우

```
새 에러 발생
    ↓
Sentry에서 확인
    ↓
┌─────────────────────────────────────┐
│ Q: 위 "무시" 목록에 있는 에러인가?   │
└─────────────────────────────────────┘
    ↓ Yes          ↓ No
 무시 (배포 대기)   즉시 조사
                      ↓
              트러블슈팅 문서에 기록
                      ↓
              수정 → 커밋 → 배포
```

---

## 변경 이력
- 2026-01-30: 최초 작성 (Issue 8, 9 대응)
- 2026-01-31: Issue 19 수정완료, Issue 20 추가 (다중 테이블 FK 마이그레이션)
