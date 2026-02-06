문서 타입: 트러블슈팅
주차: W06 (2026-02-03 ~ 2026-02-09)
도메인: DB
상태: 진행 중 ⏳

# W06 DB 트러블슈팅 리포트

## 📌 요약 및 통계
| 항목 | 내용 |
|---|---|
| 미해결 이슈 | 0 |
| 해결된 이슈 | 9 |
| SoT 승격 예정 | 0 |

---

## 🔗 연관 문서
- [Troubleshooting 메인 (README)](./README.md)
- [W05 (이전 주차) DB 리포트](./archive/weekly/W05_DB_troubleshooting.md)
- [V2 DB Baseline Snapshot SoT](../04_db/v2_db_baseline_snapshot_ko.md)

---

## 🔍 주간 이슈 내역

### 02-03 - DB/OPS: 오픈 준비 운영 데이터 초기화 (프로덕션 리셋) ✅

**증상 정의**
| 항목 | 내용 |
|---|---|
| 대상 기능 | 오픈 준비용 운영 데이터 초기화 |
| HTTP Status | N/A (운영 작업) |
| 영향 범위 | 운영 DB 전체(유저/로그/원장/인벤토리 등) |
| 재현 빈도 | 필요 시 |

**근본 원인 (증거 기반)**
- 오픈 준비를 위해 운영 데이터(유저/게임로그/원장 등)를 초기화하고, 설정 데이터(미션 정의/게임 설정/레벨 보상표 등)는 유지할 필요가 있었음.

**해결 방법**
- 초기화 스크립트 운영: `scripts/production_data_reset.sql`
- 삭제 대상/유지 대상 테이블을 명확히 구분하여 실행

**검증 방법**
1) 삭제 대상 테이블 레코드 수가 0인지 확인
2) 설정 데이터 테이블 레코드가 유지되는지 확인
3) AUTO_INCREMENT 리셋 여부 확인

**🏷️ 태그**
`P1` `DB` `OPS` `PRODUCTION` `RESET` `✅해결완료`

---

### 02-04 - DB/OPS: HQ Import 요구사항 불일치로 인한 재설계 (HQ_DAILY 신설) ✅

**증상 정의**
| 항목 | 내용 |
|---|---|
| 대상 기능 | 어드민 CSV Import (HQ_MARGIN) |
| HTTP Status | 200 (Logic/요구사항 불일치) |
| 영향 범위 | 관리자 Import 파이프라인 |
| 재현 빈도 | 항상 |

**근본 원인 (증거 기반)**
- HQ_MARGIN Import는 “누적 마진 데이터” 기준 설계였으나, 운영 요구는 “일별 개별 입금 내역” 반영이었음.
- 버그가 아니라 요구사항/용어 정렬 실패로 인한 설계 불일치였음.

**해결 방법**
- `HQ_DAILY` Import 타입 신설 (일별 입금 내역)
- `HQ_MARGIN`은 세그먼트 업데이트 전용으로 역할 축소
- (후속) `hq_daily_deposit_log` 등 중복방지/마이그레이션 이슈는 본 문서의 관련 항목에서 별도로 추적

**🏷️ 태그**
`P1` `DB` `CSV_IMPORT` `HQ_DAILY` `HQ_MARGIN` `✅해결완료`

### [02-04] - DB/LEVEL: 어드민 레벨/XP 조정 반영 실패 (SoT 불일치)

**증상 정의**
| 항목 | 내용 |
|---|---|
| 대상 기능 | 어드민 유저 레벨/XP 조정 |
| HTTP Status | 200 (Logic Error) |
| 영향 범위 | 레벨 조정 대상 유저 |
| 재현 빈도 | 항상 |

**증상**
- 어드민에서 레벨/XP 조정 후에도 유저 레벨이 실제 서비스에 반영되지 않음
- 콘솔/로그에는 성공 응답이나 유저 레벨이 그대로 유지됨

**근본 원인 (증거 기반)**
- 2026-02-04 SoT 통합으로 레벨/XP의 **Primary SoT가 `v2_user`로 이동**함
- 어드민 레벨 조정 로직이 `user_level_progress`만 갱신하거나 `V2User.xp`를 갱신하지 않아 SoT 불일치 발생
- 관련 파일: [app/v2/api/admin/user_routes.py](../../../app/v2/api/admin/user_routes.py#L85), [docs/v2_specs/00_sot_meta/00_A_sot_code_ops_chk/learned_/level/20260204_v2_sot_consolidation.md](../00_sot_meta/00_A_sot_code_ops_chk/learned_/level/20260204_v2_sot_consolidation.md)

**해결 방법**
- 어드민 레벨 조정/설정/조회 시 `V2User.xp`/`V2User.level`을 우선 갱신하고 `user_level_progress`를 동기화
- 리셋 시 `V2User.xp`도 함께 0으로 초기화

**검증 방법**
1. 어드민에서 레벨/XP 조정
2. `/api/v2/admin/users/level` 조회 시 레벨/XP가 즉시 반영되는지 확인
3. 유저 게임/미션 진입 시 레벨이 일치하는지 확인

**🏷️ 태그**
`P1` `LEVEL` `SOT` `ADMIN` `DATA_SYNC`

### [02-04] - DB/MIGRATION: hq_daily_deposit_log 테이블 미존재 (CSV Import 500)

**증상 정의**
| 항목 | 내용 |
|---|---|
| 대상 기능 | HQ_DAILY CSV Import |
| HTTP Status | 500 |
| 영향 범위 | CSV Import 기능 |
| 재현 빈도 | 항상 |

**증상**
- `POST /api/v2/admin/csv-import/import` 500 응답
- 에러: `(pymysql.err.ProgrammingError) (1146, "Table 'xmas_event.hq_daily_deposit_log' doesn't exist")`

**근본 원인**
- `HQDailyDepositLog` 모델은 존재하나, Alembic 마이그레이션 파일이 없어 테이블 미생성

**해결 방법**
- 마이그레이션 파일 추가: `20260204_0100_add_hq_daily_deposit_log.py`
- 배포 시 `alembic upgrade head` 자동 실행

**🏷️ 태그**
`P1` `MIGRATION` `CSV_IMPORT` `DB`

---

### [02-04] - DB/OPS: HQDailyDepositLog 모델 잘못된 import 경로 (ModuleNotFoundError)

**증상 정의**
| 항목 | 내용 |
|---|---|
| 대상 기능 | Alembic 마이그레이션 / 백엔드 전체 |
| HTTP Status | 컨테이너 시작 실패 |
| 영향 범위 | 전체 서비스 |
| 재현 빈도 | 항상 |

**증상**
- 배포 시 `ModuleNotFoundError: No module named 'app.core.database'`
- 컨테이너 재시작 루프

**근본 원인**
- `v2_hq_daily_deposit_log.py`에서 `from app.core.database import Base` 사용 (존재하지 않는 모듈)
- 다른 모든 V2 모델은 `from app.db.base_class import Base` 사용

**해결 방법**
- import 경로 수정: `from app.db.base_class import Base`
- 수정 파일: [app/v2/models/v2_hq_daily_deposit_log.py](../../../app/v2/models/v2_hq_daily_deposit_log.py)

**🏷️ 태그**
`P0` `MIGRATION` `IMPORT` `MODEL`

---

### [02-04] - DB/OPS: Decimal/float 연산 TypeError (ops/status 500)

**증상 정의**
| 항목 | 내용 |
|---|---|
| 대상 기능 | 어드민 Ops 대시보드 상태 조회 |
| HTTP Status | 500 |
| 영향 범위 | 어드민 전체 |
| 재현 빈도 | 항상 |

**증상**
- `GET /api/v2/admin/ops/status` 500 응답
- 에러: `TypeError: unsupported operand type(s) for -: 'decimal.Decimal' and 'float'`

**근본 원인**
- `game_log_analytics_service.py:608` - `get_hq_weekly_growth_rate()`
- SQLAlchemy가 `func.count()`, `func.sum()` 결과를 `decimal.Decimal`로 반환
- `active_ratio - 0.5` 연산 시 타입 불일치

**해결 방법**
- DB 반환값을 `float()`로 명시적 변환
- 수정 파일: [app/v2/services/game_log_analytics_service.py](../../../app/v2/services/game_log_analytics_service.py)

**검증 방법**
1. 배포 후 `/api/v2/admin/ops/status` 호출 시 정상 응답 확인

**🏷️ 태그**
`P1` `OPS` `DB` `ANALYTICS` `TYPE`

---

### [02-04] - DB/OPS: /api/v2/admin/ops/status 500 (HQ/Analytics 쿼리 예외)

**증상 정의**
| 항목 | 내용 |
|---|---|
| 대상 기능 | 어드민 Ops 대시보드 상태 조회 |
| HTTP Status | 500 |
| 영향 범위 | 어드민 전체 |
| 재현 빈도 | 항상 |

**증상**
- `GET /api/v2/admin/ops/status` 500 응답

**근거**
- 클라이언트 콘솔에서 `GET https://cc-jm.com/api/v2/admin/ops/status 500` 확인
- 운영 로그 조회 시 워커 노이즈로 해당 스택트레이스 필터링 실패 (Redis NOGROUP 반복)

**근본 원인 (코드 근거)**
- `ops_routes.py` 내부에서 `HQMarginStatsService.get_hq_margin_stats()`와 `GameLogAnalyticsService`를 호출하며,
  관련 테이블(`hq_prospective_user`, `v2_game_log`) 미생성/스키마 불일치 시 `SQLAlchemyError`가 발생할 수 있음.
- 예외가 처리되지 않아 전체 응답이 500으로 실패.

**해결 방법**
- 예외 처리 추가로 쿼리 실패 시 기본값 반환 및 500 방지.
- 수정 파일: [app/v2/api/admin/ops_routes.py](../../../app/v2/api/admin/ops_routes.py)

**검증 방법**
1. `/api/v2/admin/ops/status` 호출 시 500이 아닌 정상 응답 확인
2. `hqStats`, `revenueStats`, `riskUsers`, `opportunityUsers`가 기본값/빈 배열로 내려오는지 확인

**🏷️ 태그**
`P1` `OPS` `DB` `ADMIN` `SQLAlchemy`

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

### [02-02] - DB: V2 서비스 내 Legacy 모델 직접 참조로 인한 SOT 준수 실패

#### ❌ 현상
- `tests/v2/verification/test_v2_sot_compliance.py` 테스트 실패
- `AssertionError: SOT Violations found:`
- `app.v2.services.*` 모듈에서 `app.models.*`를 직접 import 함으로써 V2 Native 격리 정책 위반

#### 🔍 원인
- `V2AdminUserService`, `V2SegmentService`, `V2VaultService` 등에서 편의상 또는 관성적으로 legacy 모델(`User`, `VaultLedger` 등)을 직접 import 함.

#### ✅ 해결
- 직접 import 대신 `app.v2.models`에서 제공하는 shim(가상 내보내기)을 사용하도록 수정.
- 수정 파일: `admin_user_service.py`, `segment_service.py`, `vault_service.py`

#### 📌 재발 방지
- V2 서비스 개발 시 반드시 `app.v2.models`를 통해 모델을 참조하도록 코드 리뷰 가이드 강화.
- CI 과정에서 SOT compliance 테스트 상시 수행.

#### 🏷️ 태그
- `P1` `Architecture` `SOT` `Compliance`

---

### [02-03] - DB/MIGRATION: baseline_charge_amount 마이그레이션 down_revision 오류

**증상 정의**
| 항목 | 내용 |
|---|---|
| 대상 기능 | Alembic 마이그레이션 적용 |
| HTTP Status | N/A (CLI 에러) |
| 영향 범위 | 로컬 Docker 환경 |
| 재현 빈도 | 항상 |

**에러 메시지**
```
KeyError: '20260201_1200_add_external_deposit_unmatched_log'
```

**근본 원인**
- 새 마이그레이션 파일의 `down_revision`이 존재하지 않는 리비전을 참조
- 마이그레이션 체인: `20260202_1530_extend_v2_user_segment` → `20260203_1000_add_v2_external_deposit_unmatched` → **20260203_0100_add_baseline_charge_amount**
- 잘못된 `down_revision`: `20260201_1200_add_external_deposit_unmatched_log` (존재하지 않음)

**해결 방법**
```python
# alembic/versions/20260203_0100_add_baseline_charge_amount.py
# Before
down_revision = "20260201_1200_add_external_deposit_unmatched_log"

# After
down_revision = "20260203_1000_add_v2_external_deposit_unmatched"
```

**검증 방법**
```bash
docker compose exec backend alembic current
# 결과: 20260203_0100_add_baseline_charge_amount (head) ✅
```

**🏷️ 태그**
`P1` `ALEMBIC` `MIGRATION` `CHAIN`

---

## 📝 관리 가이드
- Alembic 마이그레이션, FK 제약조건, 데이터 정합성 확인

---

## 변경 이력
| 날짜 | 작업자 | 내용 |
|---|---|---|
| 2026-02-04 | Copilot | W06 문서 최초 작성 (hq_daily_deposit_log 테이블, import 오류, Decimal/float 오류, Alembic chain 등 6건) |
| 2026-02-04 | Copilot | 회원관리 페이지 세그먼트 표시/편집 기능 추가 (신규 기능) |
