# 트러블슈팅: FK/Mission/Sentry 이슈 (2026-01-30)

## 📋 요약

| 항목 | 내용 |
|------|------|
| 작성일 | 2026-01-30 |
| 영향범위 | Admin Economy, Mission, Monitoring |
| 긴급도 | 🔴 높음 |
| 상태 | ✅ 해결됨 |

---

## Issue 15: external_ranking FK 에러 (IntegrityError 1452)

### 증상
```
POST https://cc-jm.com/api/v2/admin/economy/deposits 500 (Internal Server Error)
```

### 에러 로그
```
sqlalchemy.exc.IntegrityError: (pymysql.err.IntegrityError) (1452, 
'Cannot add or update a child row: a foreign key constraint fails 
(`xmas_event`.`external_ranking_daily_deposit_delta`, 
CONSTRAINT `external_ranking_daily_deposit_delta_ibfk_1` 
FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE)')
```

### 원인 분석
| 항목 | 내용 |
|------|------|
| 대상 기능 | Admin Economy - Deposit 기록 |
| HTTP Status | 500 (DB FK 제약조건 위반) |
| 영향 범위 | 모든 V2 유저의 deposit 기록 |
| 재현 빈도 | 항상 (V2 유저 대상 시) |

- `external_ranking_daily_deposit_delta.user_id`가 레거시 `user.id`를 FK로 참조
- V2 시스템은 `v2_user` 테이블만 사용
- V2 유저의 ID가 `user` 테이블에 없으면 FK 에러 발생

### 해결
**마이그레이션 파일**: `alembic/versions/20260130_2400_fix_external_ranking_fk.py`

```python
# FK 변경 대상 테이블
- external_ranking_daily_deposit_delta
- external_ranking_data
- external_ranking_reward_log

# 작업
1. 기존 FK (user.id 참조) DROP
2. 새 FK (v2_user.id 참조) CREATE
```

### 검증
```bash
docker exec xmas-backend alembic upgrade head
# [FK] Dropped external_ranking_daily_deposit_delta.external_ranking_daily_deposit_delta_ibfk_1
# [FK] Created external_ranking_daily_deposit_delta.external_ranking_daily_deposit_delta_fk_v2_user -> v2_user.id
```

---

## Issue 16: V2User.login_streak AttributeError

### 증상
```
GET https://cc-jm.com/api/v2/admin/game/missions/login-verify 500 (Internal Server Error)
```

### 에러 로그
```
AttributeError: 'V2User' object has no attribute 'login_streak'
```

### 원인 분석
| 항목 | 내용 |
|------|------|
| 대상 기능 | Admin Mission - 로그인 미션 검증 |
| HTTP Status | 500 (AttributeError) |
| 영향 범위 | 어드민 미션 관리 페이지 |
| 재현 빈도 | 항상 |

- `app/v2/api/admin/mission_routes.py`에서 `user.login_streak` 직접 접근
- `login_streak`는 레거시 `User` 모델에만 존재
- `V2User` 모델에는 해당 컬럼 없음

### 해결
**수정 파일**: `app/v2/api/admin/mission_routes.py`

```python
# Before
login_streak=int(user.login_streak or 0),

# After
login_streak=_get_user_login_streak(db, user.id),

# 헬퍼 함수 추가
def _get_user_login_streak(db: Session, user_id: int) -> int:
    """user_streak 테이블에서 로그인 스트릭 조회 (없으면 0)"""
    streak = db.query(UserStreak).filter(UserStreak.user_id == user_id).first()
    return streak.current_streak if streak else 0
```

### 관련 SoT
- `docs/v2_specs/00_sot_meta/00_A_sot_code_ops_chk/learned_/mission/09.mission.md`
- V2User와 레거시 User 모델 분리 원칙

---

## Issue 17: Sentry 에러 캡처 안됨

### 증상
- 프로덕션에서 500 에러 발생
- Sentry 대시보드에 아무것도 안 잡힘
- 로그: `✅ Sentry initialized (env=production)` 정상 출력

### 원인 분석
| 항목 | 내용 |
|------|------|
| 대상 기능 | 에러 모니터링 |
| HTTP Status | N/A (Sentry 전송 실패) |
| 영향 범위 | 전체 에러 추적 |
| 재현 빈도 | 항상 |

- `app/core/error_handlers.py`의 커스텀 예외 핸들러가 에러를 잡음
- 핸들러가 JSONResponse 반환 후 종료 → Sentry에 전송 안됨
- FastAPI의 기본 예외 처리 우회됨

### 해결
**수정 파일**: `app/core/error_handlers.py`

```python
# Sentry import 추가
try:
    import sentry_sdk
    SENTRY_AVAILABLE = True
except ImportError:
    SENTRY_AVAILABLE = False

# SQLAlchemyError 핸들러에 capture_exception 추가
@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_exception_handler(request, exc):
    logger.error(...)
    
    # Report to Sentry
    if SENTRY_AVAILABLE:
        sentry_sdk.capture_exception(exc)
    
    return JSONResponse(status_code=500, ...)

# Generic Exception 핸들러 추가 (catch-all)
@app.exception_handler(Exception)
async def generic_exception_handler(request, exc):
    logger.error(...)
    
    if SENTRY_AVAILABLE:
        sentry_sdk.capture_exception(exc)
    
    return JSONResponse(status_code=500, ...)
```

---

## 📊 user 테이블 FK 참조 현황

프로덕션 DB에서 `user` 테이블을 FK로 참조하는 테이블 목록 (40개+):

| 상태 | 테이블 | 비고 |
|------|--------|------|
| ✅ 해결 | external_ranking_daily_deposit_delta | v2_user로 변경 |
| ✅ 해결 | external_ranking_data | v2_user로 변경 |
| ✅ 해결 | external_ranking_reward_log | v2_user로 변경 |
| ✅ 기해결 | user_game_wallet | 20260130_1900 마이그레이션 |
| ✅ 기해결 | user_inventory_item | 20260130_1900 마이그레이션 |
| 🟡 모니터링 | admin_user_profile | FK check 비활성화로 우회 |
| ⬜ 미사용 | dice_log, lottery_log, roulette_log | V1 레거시 |
| ⬜ 미사용 | ranking_daily, team_member 등 | V1 레거시 |

---

## 🔧 배포 명령어

```bash
# 1. 커밋 & 푸시
git add -A
git commit -m "fix: Issue 15-17 FK/Mission/Sentry 에러 수정"
git push origin main

# 2. CI/CD 완료 대기

# 3. 마이그레이션 확인
docker exec xmas-backend alembic current
# 예상: 20260130_2400_fix_external_ranking_fk

# 4. 검증
curl -s http://localhost:8000/api/v2/admin/economy/deposits  # 401 (인증필요=정상)
curl -s http://localhost:8000/api/v2/admin/game/missions/login-verify  # 401 (인증필요=정상)
```

---

## 📝 Lessons Learned

1. **V2 마이그레이션 시 FK 전수 조사 필수**
   - `user` 테이블 참조 FK가 40개+ 존재
   - 새 기능 추가 시 FK 참조 테이블 확인

2. **V2User vs User 모델 속성 차이**
   - `login_streak`: User에만 존재
   - `play_streak`: V2User에 존재
   - 코드에서 모델 속성 접근 전 확인 필요

3. **커스텀 예외 핸들러와 Sentry 통합**
   - 핸들러가 예외를 삼키면 Sentry 미전송
   - `sentry_sdk.capture_exception(exc)` 명시적 호출 필요

4. **SCP 임시 배포 금지**
   - Git 충돌 위험
   - 정식 CI/CD 배포만 사용

---

## 관련 문서

- [에러 트리아지 체크리스트](./20260130_error_triage_checklist.md)
- [배포 트러블슈팅 가이드](../00_sot_meta/0000_2026_v2_deployment_troubleshooting_guide_ko.md)
- [Mission SoT](../00_sot_meta/00_A_sot_code_ops_chk/learned_/mission/09.mission.md)
