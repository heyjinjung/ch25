문서 타입: 트러블슈팅 (주간)
주차: W05 (2026-01-27 ~ 2026-02-02)
도메인: INFRA (인프라/배포)
상태: ACTIVE

# W05 INFRA 트러블슈팅

## 요약
| 날짜 | 이슈 | 상태 |
|---|---|---|
| 02-01 | SOT Import 리팩터링 후 누락된 re-export (SurveyQuestionType 외 10개) | ✅ FIXED |
| 01-31 | /api/v2/admin/ops/status 500 (ModuleNotFoundError) | ✅ FIXED (shim 적용) |
| 02-01 | /api/v2/admin/ops/status 500 (hq_prospective_user 테이블 누락) | ⏳ 마이그레이션 생성, 배포필요 |
| 01-31 | Sentry 설정 업데이트 (알림 최적화) | ✅ RESOLVED |
| 01-31 | Sentry Log Monitoring 활성화 | ✅ RESOLVED |
| 01-30 | 배포 검증 리포트 | ✅ RESOLVED |
| 02-01 | /api/v2/admin/users/{id}/purge 500 (V2 게임로그 미삭제) | ✅ RESOLVED |
| 02-01 | CSV Import 한글 헤더 지원 및 Import 오류 수정 | ✅ FIXED |

---

## 02-01 - [INFRA/BACKEND] SOT Import 리팩터링 후 누락된 re-export

**우선순위**: P0
**관련 도메인**: INFRA, BACKEND
**커밋**: `3b6419098c9330cea6b0ed9bc841cb7496d86dad`

### 증상
- 커밋 `3b64190` 배포 후 앱 로딩 실패
- FastAPI 서버 시작 시 `ImportError` 발생

### 증거(로그)
```python
ImportError: cannot import name 'SurveyQuestionType' from 'app.v2.models' 
(C:\Users\JAVIS\ch\ch25\app\v2\models\__init__.py)
```

### 배경
- 커밋 `3b64190`에서 63개 파일에 대해 `from app.models` → `from app.v2.models`로 대량 리팩터링 수행
- 목적: "Pure V2 Native" SOT 규정 준수를 위해 모든 V2 코드가 `app.v2.models`에서 import하도록 통일
- V1 모델들은 `app/v2/models/__init__.py`에서 re-export하여 호환성 유지

### 근본 원인
`app/v2/models/__init__.py`에서 V1 모델 re-export 시 **Enum 클래스 10개 누락**:

| 누락된 항목 | 출처 파일 | 사용처 |
|------------|----------|--------|
| `SurveyQuestionType` | `app.models.survey` | marketing_routes.py |
| `SurveyResponseStatus` | `app.models.survey` | marketing_routes.py |
| `SurveyStatus` | `app.models.survey` | marketing_routes.py |
| `SurveyChannel` | `app.models.survey` | marketing_routes.py |
| `SurveyTriggerType` | `app.models.survey` | - |
| `SurveyRewardStatus` | `app.models.survey` | - |
| `MissionCategory` | `app.models.mission` | routes.py |
| `ApprovalStatus` | `app.models.mission` | user_routes.py |
| `MissionRewardType` | `app.models.mission` | mission_routes.py |
| `UserStreak` | `app.models.mission` | mission_routes.py |

### 해결 방법
#### Immediate Fix
`app/v2/models/__init__.py`에 누락된 항목 추가:

```python
# mission.py - 추가된 항목
from app.models.mission import (
    Mission, UserMissionProgress, MissionCategory, 
    ApprovalStatus, MissionRewardType, UserStreak
)

# survey.py - 추가된 항목
from app.models.survey import (
    Survey, SurveyQuestion, SurveyOption, SurveyTriggerRule,
    SurveyResponse, SurveyResponseAnswer,
    SurveyStatus, SurveyChannel, SurveyQuestionType,
    SurveyTriggerType, SurveyResponseStatus, SurveyRewardStatus,
)
```

#### Long-term Fix
- 대량 import 리팩터링 시 **자동 검증 스크립트** 필수 실행
- `list_sot_violations.py` 스크립트를 CI에 통합
- 새 Enum 추가 시 `__init__.py` 동시 업데이트 체크리스트 추가

### 검증 방법
```bash
# 로컬 검증
python -c "from app.main import app; print('OK: FastAPI app loads')"

# 또는 전체 import 체크
python -c "
from app.v2.api.admin import ops_routes
from app.v2.api.admin import user_routes
from app.v2.api.admin import marketing_routes
from app.v2.api.admin import mission_routes
print('OK: all admin routes import')
"
```

### 예방 가이드라인
1. **대량 import 변경 시 검증 필수**:
   - `python -c "from app.main import app"` 로컬 테스트
   - `list_sot_violations.py` 실행하여 누락 확인
2. **새 Enum/Model 추가 시**:
   - `app.models`에 추가하면 `app.v2.models/__init__.py`에도 re-export 추가
3. **CI 파이프라인에 import 검증 추가 권장**

### 관련 파일
- 수정: `app/v2/models/__init__.py`
- 스크립트: `fix_sot_imports.py`, `list_sot_violations.py`

---

## 01-31 - Sentry 설정 업데이트

### 증상
- Sentry 에러 알림이 과도하게 발생
- 중요하지 않은 에러까지 알림

### 해결
Sentry 설정 최적화:
- `sample_rate` 조정
- 무시할 에러 패턴 추가
- 환경별 분리 (dev/staging/prod)

### 관련 파일
- `app/core/sentry.py`
- `.env` (SENTRY_DSN)

---

## 01-31 - [INFRA/BACKEND] /api/v2/admin/ops/status 500 (ModuleNotFoundError)

**우선순위**: P0
**관련 도메인**: INFRA, BACKEND, ADMIN

### 증상
- Admin Ops Dashboard에서 `GET /api/v2/admin/ops/status` 호출 시 500 발생
- 프론트 콘솔: `ET https://cc-jm.com/api/v2/admin/ops/status 500 (Internal Server Error)`

### 증거(로그)
```
ModuleNotFoundError: No module named 'app.v2.models.v2_admin_audit_log'
File "/app/app/v2/services/hq_margin_stats_service.py", line 14, in <module>
```

### 근본 원인
- 운영 서버 코드에서 `hq_margin_stats_service.py`가 `app.v2.models.v2_admin_audit_log`를 import.
- 해당 모듈이 존재하지 않아 `ModuleNotFoundError` 발생 → `/api/v2/admin/ops/status` 500.

### 해결 방법
#### Immediate Fix
- 호환용 shim 추가: `app/v2/models/v2_admin_audit_log.py`에서 `AdminAuditLog` 재노출.
- 배포 시, 기존 import 경로/신규 경로 모두 정상 동작.

#### Long-term Fix
- 모든 V2 서비스 import 경로를 `app.models.admin_audit_log.AdminAuditLog`로 통일.
- 배포 이미지 최신화로 서버/로컬 코드 정합성 유지.

### 검증 방법
- 운영 서버 재배포 후 `GET /api/v2/admin/ops/status` 200 확인.
- Admin Ops Dashboard 로딩 정상 여부 확인.

### 예방 가이드라인
- 모델 경로 변경 시 호환 shim 추가 또는 릴리스 노트에 명시.
- 배포 전 `ops/status` 헬스 체크를 CI에 포함.

---

## 02-01 - [INFRA/BACKEND] /api/v2/admin/ops/status 500 재발 (진짜 원인 발견!)

**우선순위**: P0
**관련 도메인**: INFRA, BACKEND, ADMIN, DATABASE

### 증상
- Admin Ops Dashboard에서 `GET /api/v2/admin/ops/status` 호출 시 500 지속
- 프론트 콘솔: `Request failed with status code 500` 반복

### 증상 정의 (Symptom Abstraction)
| 항목 | 내용 |
|---|---|
| **대상 기능** | Ops Dashboard 상태 조회 (`/api/v2/admin/ops/status`) |
| **HTTP Status** | 500 (Internal Server Error) |
| **영향 범위** | 어드민 대시보드 전체 |
| **재현 빈도** | 항상 |

### 증거(로그)
- 클라이언트 콘솔: `GET https://cc-jm.com/api/v2/admin/ops/status 500`
- 운영 서버 최근 로그 400줄 기준, `/api/v2/admin/ops/status` 라인 미검출
	- 로그가 `ch25_event_worker_loop_error (NOGROUP)`로 과다 출력되어 필터 필요

### 근본 원인 (**확정!**)
- ~~01-31에 확인된 `ModuleNotFoundError: app.v2.models.v2_admin_audit_log` 패치가 운영에 아직 반영되지 않았을 가능성.~~
- **실제 원인**: `hq_prospective_user` 테이블이 DB에 없음!
- 직접 테스트 스크립트 실행으로 확정:
```
sqlalchemy.exc.ProgrammingError: (pymysql.err.ProgrammingError) (1146, 
"Table 'xmas_event.hq_prospective_user' doesn't exist")
[SQL: SELECT count(hq_prospective_user.id) AS count_1
FROM hq_prospective_user
WHERE hq_prospective_user.segment = %(segment_1)s AND hq_prospective_user.is_joined = false]
```

### 원인 분석
- `hq_margin_stats_service.py` Line 50에서 `HQProspectiveUser` 테이블 쿼리
- 모델 파일은 존재: `app/v2/models/hq_prospective_user.py`
- **마이그레이션 파일 누락** → DB에 테이블 미생성

### 해결 방법
#### Immediate Fix
- 마이그레이션 생성: `alembic/versions/20260201_0900_add_hq_prospective_user.py`
- 배포 후 `alembic upgrade head` 실행

#### Long-term Fix
- 새 모델 추가 시 마이그레이션 생성 필수 체크리스트에 포함.
- 배포 전 `ops/status` 헬스체크를 CI에 추가.
- `docker logs` 노이즈 감소(워커 에러 로그 분리)로 신속한 에러 추출 가능하게 개선.

### 배포 절차
```bash
# 1. 커밋 & 푸시
git add -A
git commit -m "fix: Issue 22 - hq_prospective_user 테이블 마이그레이션 추가"
git push origin main

# 2. 서버에서 배포
docker compose build --no-cache
docker compose up -d

# 3. 마이그레이션 적용
docker compose exec backend alembic upgrade head

# 4. 검증
curl -s https://cc-jm.com/api/v2/admin/ops/status -H "Authorization: Bearer $TOKEN"
```

### 검증 방법
- 운영 서버에서 `/api/v2/admin/ops/status` 호출 시 200 응답 확인.
- Admin Ops Dashboard 정상 로딩 확인.

### 예방 가이드라인
- **새 모델 추가 시 마이그레이션 생성 필수!**
- 운영 배포 시 모델/서비스 import 경로 변경 여부 체크리스트에 포함.
- 워커 로그 레벨 조정 또는 별도 로깅 채널 분리.

### 관련 파일
- 모델: `app/v2/models/hq_prospective_user.py`
- 서비스: `app/v2/services/hq_margin_stats_service.py`
- 마이그레이션: `alembic/versions/20260201_0900_add_hq_prospective_user.py`

---

## 01-31 - [INFRA] Sentry Log Monitoring (Logs 탭) 활성화

**우선순위**: P2
**관련 도메인**: INFRA, BACKEND

### 증상
- Sentry 대시보드의 'Logs' 탭에서 실제 백엔드 로그가 인덱싱되지 않고, "Set up the Sentry SDK"라는 온보딩 가이드 화면만 반복적으로 표시됨.

### 근본 원인
- **기술적 원인**: Sentry Python SDK(v2.0+)의 신규 기능인 'Log Monitoring'은 기존의 `LoggingIntegration` 설정만으로는 대시보드 인덱싱이 활성화되지 않음.
- **코드 레벨 분석**: `sentry_sdk.init()` 시 `enable_log_record=True` 옵션이 누락되어 있었으며, 이 옵션이 없으면 로그 데이터가 Sentry 서버로 전송되더라도 'Logs' 저장소로 분류되지 않음.

### 해결 방법
#### Immediate Fix
- `app/main.py`의 `sentry_sdk.init` 설정에 `enable_log_record=True` 파라미터를 추가함.
- `docker compose restart backend`를 수행하여 모든 백엔드 컨테이너에 설정을 적용함.
#### Long-term Fix
- Sentry SDK 버전 업그레이드 시 릴리즈 노트를 정기적으로 검토하여 신규 요구되는 플래그나 인터페이스를 프로젝트 표준 설정 코드(`app/core/sentry.py` 등)에 선제적으로 반영함.

### 검증 방법
- Sentry 대시보드 접속 후 `Explore > Logs` 경로에서 `environment:production` 필터로 실시간 로그 유입 여부 확인.
- 온보딩 화면이 사라지고 로그 리스트가 노출되는 것을 확인 완료.

### 예방 가이드라인
- Sentry 관련 모든 설정은 `app/core/sentry_config.py`(가칭)와 같이 전용 모듈에서 관리하여 `app/main.py`를 간결하게 유지하고 설정 누락을 방지할 것.

---

## 02-01 - [INFRA/ADMIN] 어드민 유저 퍼지 500 (로그 미확인)

**우선순위**: P1
**관련 도메인**: INFRA, ADMIN, BACKEND

### 증상 정의 (Symptom Abstraction)
| 항목 | 내용 |
|---|---|
| **대상 기능** | 유저 강제 퍼지 (`POST /api/v2/admin/users/{user_id}/purge`) |
| **HTTP Status** | 500 (Internal Server Error) |
| **영향 범위** | 어드민 유저 관리(퍼지 기능) |
| **재현 빈도** | 미확인 (사용자 보고 기준) |

### 증거(클라이언트)
- 브라우저 콘솔: `POST https://cc-jm.com/api/v2/admin/users/8/purge 500 (Internal Server Error)`

### 증거(서버 로그)
- 운영 서버 `docker logs xmas-backend --tail=1000` 및 시간대 필터 로그에서 `/purge` 요청 라인 **미검출**.
- 동일 시간대에 **다른 500 로그(게임 로그 조회)** 가 다수 존재하여 노이즈 가능성 있음.

### 근본 원인 (증거 기반)
- ✅ **코드 분석으로 원인 확정**: `admin_user_service.py`의 `purge_user()` 함수가 V2 게임 로그를 삭제하지 않음.
- 레거시 게임 로그(DiceLog, RouletteLog, LotteryLog)만 삭제하고 **V2 게임 로그(V2DiceLog, V2RouletteLog, V2LotteryLog)는 누락**.
- V2 게임 로그에 해당 user_id 레코드가 남아있으면 v2_user 삭제 시 FK 에러 가능.

### 해결 조치
- 파일: `app/v2/services/admin_user_service.py`
- V2 게임 로그 import 추가:
```python
from app.v2.models.v2_dice import V2DiceLog
from app.v2.models.v2_roulette import V2RouletteLog
from app.v2.models.v2_lottery import V2LotteryLog
```
- V2 게임 로그 삭제 로직 추가:
```python
# Game Logs (V2)
db.query(V2DiceLog).filter(V2DiceLog.user_id == user_id).delete(synchronize_session=False)
db.query(V2RouletteLog).filter(V2RouletteLog.user_id == user_id).delete(synchronize_session=False)
db.query(V2LotteryLog).filter(V2LotteryLog.user_id == user_id).delete(synchronize_session=False)
```

### 검증 방법
- 퍼지 요청 재현 시 204 No Content 확인.
- 백엔드 로그에서 `User {user_id} purged by admin` 메시지 확인.

### 수정 시각
| 02-01 | 어드민 유저 퍼지 500 에러 | Copilot |
| 02-01 | CSV 한글 헤더 지원 및 임포트 오타 수정 | Copilot |

---

## 02-01 - [INFRA/BACKEND] CSV Import 한글 헤더 지원 및 Import 오류 수정

**우선순위**: P1
**관련 도메인**: BACKEND, ADMIN, DATA_OPS

### 증상
- 운영진이 엑셀에서 추출한 한글 헤더 CSV 업로드 시 `KeyError` 발생 및 임포트 중단
- `CSVToRedisService` 호출 시 `ImportError` 또는 `AttributeError` (오타 때문)

### 근본 원인
1. **Localization 부재**: `CSV_FIELD_MAP`이 영문 필드명만 지원함.
2. **서비스 호출 오타**: `csv_import_service.py`에서 `CSVToRedisService`를 `csv_to_redis_service`로 잘못 참조함.

### 해결 조치
1. **한글 에일리어스 추가**: `v2_csv_import.py` 모델의 `CSV_FIELD_MAP`에 한글 별칭(예: `유저 ID`, `배팅 금액`) 대량 추가.
2. **오타 수정**: `csv_import_service.py` 내 대소문자 및 네이밍 미스매치 수정.

### 검증 방법
- 한글 헤더가 포함된 [sample_game_log.csv](../CSV_Samples/sample_game_log.csv) 업로드 시 정상 매핑 확인.

---

## 01-30 - 배포 검증 리포트

### 점검 항목
1. ✅ Docker 컨테이너 상태: 모든 서비스 healthy
2. ✅ DB 마이그레이션: `alembic current` 최신 확인
3. ✅ API 헬스체크: `/health` 200 OK
4. ✅ 프론트엔드 빌드: 정상 서빙

### 서비스 상태
```
xmas-backend      Up (healthy)
xmas-frontend     Up (healthy)
xmas-db           Up (healthy)
xmas-redis        Up (healthy)
xmas-celery-*     Up (healthy)
```

### 관련 파일
- `docs/v2_specs/90_troubleshooting/20260130_deployment_verification_report.md`

---

## 변경 이력
- 2026-01-31: W05 INFRA 문서 생성, 기존 분산 문서 통합
- 2026-02-01: 02-01 에러 진짜 원인 발견 및 수정 - hq_prospective_user 테이블 누락
- 2026-02-01: SOT Import 리팩터링 후 re-export 누락 이슈 추가 (커밋 3b64190)
- 2026-02-01: Issue #24 purge 500 에러 - V2 게임로그 미삭제 원인 확정 및 수정완료
- 2026-02-01: CSV Import 한글 헤더 지원(Localization) 및 서비스 호출 오타 수정
