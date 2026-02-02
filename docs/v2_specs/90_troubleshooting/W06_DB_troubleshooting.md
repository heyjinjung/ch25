문서 타입: 트러블슈팅
주차: W06 (2026-02-03 ~ 2026-02-09)
도메인: DB
상태: 진행 중 ⏳

# W06 DB 트러블슈팅 리포트

## 📌 요약 및 통계
| 항목 | 내용 |
|---|---|
| 미해결 이슈 | 0 |
| 해결된 이슈 | 1 |
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

## 📝 관리 가이드
- Alembic 마이그레이션, FK 제약조건, 데이터 정합성 확인
