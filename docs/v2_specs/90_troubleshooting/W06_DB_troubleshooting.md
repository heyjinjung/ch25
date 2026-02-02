문서 타입: 트러블슈팅
주차: W06 (2026-02-03 ~ 2026-02-09)
도메인: DB
상태: 진행 중 ⏳

# W06 DB 트러블슈팅 리포트

## 📌 요약 및 통계
| 항목 | 내용 |
|---|---|
| 미해결 이슈 | 0 |
| 해결된 이슈 | 2 |
| SoT 승격 예정 | 0 |

---

## 🔗 연관 문서
- [Troubleshooting 메인 (README)](./README.md)
- [W05 (이전 주차) DB 리포트](./archive/weekly/W05_DB_troubleshooting.md)
- [V2 DB Baseline Snapshot SoT](../04_db/v2_db_baseline_snapshot_ko.md)

---

## 🔍 주간 이슈 내역

### [02-02] - DB: V2GameLog FK 테이블명 오타로 인한 전체 API 500 에러

#### ❌ 현상
- `/api/v2/admin/ops/status`, `/api/v2/admin/analytics/marketing/campaign-performance`, `/api/v2/admin/analytics/revenue/summary` 등 **전체 Admin API에서 500 에러** 발생
- 에러 메시지:
  ```
  sqlalchemy.exc.InvalidRequestError: Could not determine join condition between 
  parent/child tables on relationship V2User.game_logs - there are no foreign keys 
  linking these tables.
  ```

#### 🔍 원인
- `app/v2/models/v2_game_log.py`에서 FK 정의 시 **테이블명 오타**
- 잘못된 코드: `ForeignKey("v2_users.id", ondelete="CASCADE")` 
- 올바른 코드: `ForeignKey("v2_user.id", ondelete="CASCADE")` (단수형)
- SQLAlchemy ORM 초기화 시 relationship 매핑 실패 → 모든 DB 쿼리 500 에러

#### ✅ 해결
**파일**: `app/v2/models/v2_game_log.py` (Line 43)
```python
# Before (오류)
ForeignKey("v2_users.id", ondelete="CASCADE")

# After (수정)
ForeignKey("v2_user.id", ondelete="CASCADE")
```

#### 📌 재발 방지
1. **신규 모델 생성 시 FK 테이블명 반드시 확인** - `__tablename__` 값과 일치 여부 검증
2. **마이그레이션 파일과 모델 파일 간 FK 정의 일관성 유지**
3. **배포 전 `python -c "from app.v2.models import *"` 실행으로 ORM 초기화 검증**

#### 🏷️ 태그
`P0` `ORM` `FK` `V2GameLog` `SQLAlchemy`

---

### [02-02] - DB: V2UserSegment 모델에 없는 컬럼 참조로 500 에러

#### ❌ 현상
- `/api/v2/admin/ops/status` API에서 500 에러 발생
- 에러 메시지:
  ```
  AttributeError: type object 'V2UserSegment' has no attribute 'inactive_days'
  ```

#### 🔍 원인
- `game_log_analytics_service.py`의 `get_risk_users()` 메서드에서 
- `V2UserSegment.inactive_days`, `V2UserSegment.total_margin` 컬럼 참조
- 실제 `V2UserSegment` 모델에는 해당 컬럼이 없음 (segment, updated_at만 존재)
- 코드와 모델 간 스키마 불일치

#### ✅ 해결
**파일**: `app/v2/services/game_log_analytics_service.py` (Line 430~)

쿼리에서 없는 컬럼 참조 제거하고, `V2User.last_login_at`에서 `inactive_days` 계산:
```python
# Before: V2UserSegment.inactive_days 직접 참조 (오류)
# After: last_login_at과 현재 시간 차이로 계산
inactive_days = (now - last_login).days
```

#### 📌 재발 방지
1. **서비스 코드에서 모델 컬럼 참조 시 실제 스키마 확인**
2. **신규 쿼리 작성 시 해당 모델의 `__table__.columns` 검증**
3. **IDE에서 자동완성 외에도 모델 파일 직접 확인**

#### 🏷️ 태그
`P0` `ORM` `V2UserSegment` `AttributeError`

---

## 📝 관리 가이드
- Alembic 마이그레이션, FK 제약조건, 데이터 정합성 확인
