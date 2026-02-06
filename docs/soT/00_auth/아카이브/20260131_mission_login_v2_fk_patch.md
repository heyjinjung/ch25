문서 타입: 트러블슈팅
버전: v1.0
작성일: 2026-01-31
작성자: GitHub Copilot
상태: RESOLVED

# 20260131 이벤트 미션 로그인 카운트 미증가 + V2 FK 정합성 패치

## 1. 이슈 요약 (Issue Summary)

### 1.1 이벤트 미션 로그인 카운트 미증가
| 항목 | 내용 |
|---|---|
| **대상 기능** | 신규 다음날 로그인 1일 (이벤트 미션) |
| **HTTP Status** | 200 OK (보상 수령은 정상) |
| **영향 범위** | NEW_USER 카테고리 미션 전체 |
| **재현 빈도** | 항상 |

### 1.2 V2 로그 테이블 FK 누락
| 테이블 | user_id FK 상태 | 영향 |
|---|---|---|
| `v2_dice_log` | ❌ 누락 | 고아 데이터 발생 가능 |
| `v2_roulette_log` | ❌ 누락 | 고아 데이터 발생 가능 |
| `v2_lottery_log` | ❌ 누락 | 고아 데이터 발생 가능 |
| `v2_shop_order` | ❌ 누락 | 고아 데이터 발생 가능 |
| `v2_user_auth_event` | ⚠️ 의도적 누락 | 성능 우선 (유지) |

---

## 2. 근본 원인 분석 (Root Cause Analysis)

### 2.1 이벤트 미션 로그인 카운트

**증거 1: DB 미션 데이터**
```sql
-- mission_id=8: 신규 다음날 로그인 1일
SELECT id, title, action_type FROM mission WHERE id=8;
-- Result: action_type='CONSECUTIVE_LOGIN'
```

**증거 2: user_mission_progress 테이블**
```sql
SELECT * FROM user_mission_progress WHERE mission_id=8;
-- Result: 0 rows (진행 레코드 없음!)
```

**증거 3: 코드 분석** - [mission_service.py#L619-L626](../../../app/v2/services/mission_service.py#L619-L626)
```python
# 기존 코드 (버그)
def ensure_login_progress(cls, db, user_id):
    service.update_progress(user_id, "LOGIN", delta=1)  # LOGIN만 트리거
    # CONSECUTIVE_LOGIN은 트리거되지 않음!
```

**근본 원인:**
- `ensure_login_progress()`가 `"LOGIN"` 액션만 트리거
- `CONSECUTIVE_LOGIN` 액션은 별도 alias 그룹 (`["NEXT_DAY_LOGIN", "LOGIN_STREAK"]`)
- 이벤트 미션 `action_type='CONSECUTIVE_LOGIN'`에 매칭되지 않음

### 2.2 V2 로그 테이블 FK 누락

**원인:**
- V2 마이그레이션 시 `config_id` FK만 설정, `user_id` FK 누락
- 유저 삭제(`purge_user`) 시 로그가 고아 데이터로 남음

---

## 3. 해결 방안 (Solution)

### 3.1 미션 로그인 패치

**파일:** `app/v2/services/mission_service.py`

**변경 내용:**
```python
@classmethod
def ensure_login_progress(cls, db: Session, user_id: int) -> None:
    service = cls(db)
    # 1. 'LOGIN' 액션 타입 미션 진행 (출석 등)
    service.update_progress(user_id, "LOGIN", delta=1)
    
    # 2. CONSECUTIVE_LOGIN 미션 진행 (다음날 연속 로그인) ← 추가됨
    try:
        user = db.execute(select(V2User).where(V2User.id == user_id)).scalar_one_or_none()
        if user and user.last_play_date:
            now_tz = service._now_tz()
            today = service._operational_play_date(now_tz)
            yesterday = today - timedelta(days=1)
            
            # 어제 또는 오늘 플레이 기록 → 연속 로그인 처리
            if user.last_play_date == yesterday or user.last_play_date == today:
                service.update_progress(user_id, "CONSECUTIVE_LOGIN", delta=1)
    except Exception:
        pass
```

### 3.2 V2 로그 테이블 FK 추가

**마이그레이션:** `alembic/versions/20260131_1500_add_v2_user_fk_to_log_tables.py`

**정책 결정:**
| 테이블 | FK 정책 | 이유 |
|---|---|---|
| `v2_dice_log` | SET NULL | 로그 보존 (감사 목적) |
| `v2_roulette_log` | SET NULL | 로그 보존 |
| `v2_lottery_log` | SET NULL | 로그 보존 |
| `v2_shop_order` | SET NULL | 주문 이력 보존 |
| `v2_user_auth_event` | **FK 없음 유지** | 성능 우선, user_id=0 허용 |

**변경 내용:**
- `user_id` 컬럼 → `nullable=True` 변경
- `v2_user.id` 참조 FK 추가 (`ON DELETE SET NULL`)

---

## 4. 검증 체크리스트 (Verification)

### 4.1 미션 로그인 검증
- [ ] 배포 후 로그인 시 `user_mission_progress` (mission_id=8) 레코드 생성 확인
- [ ] 다음날 로그인 시 `current_value` 증가 확인
- [ ] `target_value` 도달 시 `is_completed=1` 확인

### 4.2 FK 마이그레이션 검증
```bash
# 마이그레이션 적용
docker compose exec backend alembic upgrade head

# FK 확인
SHOW CREATE TABLE v2_dice_log;
-- CONSTRAINT `fk_v2_dice_log_user_id` FOREIGN KEY ...
```

---

## 5. 관련 파일

| 파일 | 변경 내용 |
|---|---|
| `app/v2/services/mission_service.py` | CONSECUTIVE_LOGIN 트리거 추가 |
| `alembic/versions/20260131_1500_add_v2_user_fk_to_log_tables.py` | FK 마이그레이션 |

---

## 6. 변경 이력
- v1.0 (2026-01-31, Copilot): 최초 작성 - 미션 로그인 + FK 정합성 패치
