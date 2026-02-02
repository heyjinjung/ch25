문서 타입: 트러블슈팅 (주간)
주차: W05 (2026-01-27 ~ 2026-02-02)
도메인: INFRA (인프라/배포)
상태: ACTIVE

# W05 INFRA 트러블슈팅

## 요약
| 날짜 | 이슈 | 상태 |
|---|---|---|
| 02-01 | /api/v2/admin/users/{id}/purge 500 (RankingDaily 외 3개 모델 re-export 누락) | ✅ FIXED |
| 02-01 | 502 Bad Gateway (Docker 컨테이너 재시작 후 Nginx DNS 캐시 불일치) | ✅ FIXED |
| 02-01 | SOT Import 리팩터링 후 누락된 re-export (SurveyQuestionType 외 10개) | ✅ FIXED |
| 01-31 | /api/v2/admin/ops/status 500 (ModuleNotFoundError) | ✅ FIXED (shim 적용) |
| 02-01 | /api/v2/admin/ops/status 500 (hq_prospective_user 테이블 누락) | ⏳ 마이그레이션 생성, 배포필요 |
| 01-31 | Sentry 설정 업데이트 (알림 최적화) | ✅ RESOLVED |
| 01-31 | Sentry Log Monitoring 활성화 | ✅ RESOLVED |
| 01-30 | 배포 검증 리포트 | ✅ RESOLVED |
| 02-01 | /api/v2/admin/users/{id}/purge 500 (V2 게임로그 미삭제) | ✅ RESOLVED |
| 02-01 | CSV Import 한글 헤더 지원 및 Import 오류 수정 | ✅ FIXED |
| 02-01 | CSV Import 한글 깨짐 (Mojibake) 및 인코딩 자동 감지 기능 도입 | ✅ FIXED |
| 02-02 | CSV Import 400 Bad Request (확장자 대소문자 구분 문제) | ✅ FIXED |

---

## 02-01 - [INFRA/BACKEND] /api/v2/admin/users/{id}/purge 500 (RankingDaily 외 3개 모델 re-export 누락)

**우선순위**: P1
**관련 도메인**: INFRA, BACKEND, ADMIN

### 증상
- Admin 유저 상세 페이지에서 Purge 버튼 클릭 시 500 에러 발생
- 프론트엔드 콘솔:
  ```
  POST https://cc-jm.com/api/v2/admin/users/8/purge 500 (Internal Server Error)
  ```

### 증상 정의 (Symptom Abstraction)
| 항목 | 내용 |
|---|---|
| **대상 기능** | Admin 유저 Purge (`/api/v2/admin/users/{id}/purge`) |
| **HTTP Status** | 500 (Internal Server Error) |
| **영향 범위** | 어드민 유저 관리 기능 |
| **재현 빈도** | 항상 |

### 증거(로그)
```
ImportError: cannot import name 'RankingDaily' from 'app.v2.models' (/app/app/v2/models/__init__.py)
File "/app/app/v2/services/admin_user_service.py", line 235, in purge_user
    from app.v2.models import (
```

### 근본 원인
- `admin_user_service.py`의 `purge_user` 메서드에서 V1 모델들을 `app.v2.models`에서 import
- `app/v2/models/__init__.py`에 다음 모델들의 re-export가 누락됨:
  - `RankingDaily` (from `app.models.ranking`)
  - `UserActivityEvent` (from `app.models.user_activity_event`)
  - `SeasonPassProgress`, `SeasonPassRewardLog`, `SeasonPassStampLog` (from `app.models.season_pass`)

### 해결 방법
`app/v2/models/__init__.py`에 누락된 re-export 추가:
```python
from app.models.ranking import RankingDaily
from app.models.user_activity_event import UserActivityEvent
from app.models.season_pass import SeasonPassProgress, SeasonPassRewardLog, SeasonPassStampLog
```

### 수정 파일
- `app/v2/models/__init__.py`

### 검증 방법
```bash
python -c "from app.v2.models import RankingDaily, UserActivityEvent, SeasonPassProgress; print('OK')"
python -c "from app.v2.services.admin_user_service import V2AdminUserService; print('OK')"
```

### 예방 가이드라인
1. **`purge_user` 등 복합 서비스 수정 시** 사용하는 모든 모델의 re-export 확인
2. **대량 import 리팩터링 시** `list_sot_violations.py` 스크립트 실행
3. **새 V1 모델을 V2 서비스에서 사용 시** `app.v2.models/__init__.py`에 re-export 추가

### 수정 시각
- 2026-02-01 12:XX KST

---

## 02-01 - [INFRA/NGINX] 502 Bad Gateway (Docker 컨테이너 재시작 후 Nginx DNS 캐시 불일치)

**우선순위**: P1
**관련 도메인**: INFRA, NGINX, DOCKER

### 증상
- Admin 페이지에서 다수 API 호출 시 502 Bad Gateway 에러 발생
- 프론트엔드 콘솔:
  ```
  GET https://cc-jm.com/api/v2/admin/users/3/game-logs 502 (Bad Gateway)
  GET https://cc-jm.com/api/v2/admin/vault/users/3/ledger 502 (Bad Gateway)
  GET https://cc-jm.com/api/v2/admin/users/3 502 (Bad Gateway)
  GET https://cc-jm.com/api/v2/admin/inventory/logs?limit=50&user_id=3 502 (Bad Gateway)
  GET https://cc-jm.com/api/v2/admin/users/3/inventory 502 (Bad Gateway)
  ```

### 증상 정의 (Symptom Abstraction)
| 항목 | 내용 |
|---|---|
| **대상 기능** | Admin API 전체 (users, vault, inventory 등) |
| **HTTP Status** | 502 (Bad Gateway) |
| **영향 범위** | 어드민 페이지 전체 |
| **재현 빈도** | 항상 (컨테이너 재시작 직후) |

### 증거(로그)
**Nginx 에러 로그:**
```
2026/02/01 12:01:49 [error] connect() failed (111: Connection refused) 
while connecting to upstream, client: 144.48.39.14, server: cc-jm.com, 
request: "GET /api/v2/admin/users/3/game-logs HTTP/1.1", 
upstream: "http://172.19.0.6:8000/..."
```

**Docker 컨테이너 상태:**
- 백엔드 컨테이너: `About a minute ago` (방금 재시작됨)
- 현재 백엔드 IP: `172.19.0.8`
- Nginx가 연결 시도한 IP: `172.19.0.6` (이전 IP)

### 근본 원인
1. `docker compose build --no-cache; docker compose up -d` 명령으로 백엔드 컨테이너 재시작
2. 재시작 과정에서 백엔드 컨테이너가 새로운 IP(`172.19.0.8`)를 할당받음
3. Nginx 프록시 설정에서 `resolver` 캐시가 이전 IP(`172.19.0.6`)를 유지
4. Nginx가 연결 불가능한 이전 IP로 요청 전달 → 502 Bad Gateway

### 해결 방법
#### Immediate Fix (적용 완료)
```bash
# Nginx 재시작으로 DNS 캐시 초기화
docker restart xmas-nginx
```

#### Long-term Fix (✅ 적용 완료)
**배포 스크립트에 Nginx 재시작 단계 추가:**
- `scripts/rebuild_all.sh` - 전체 재빌드 스크립트
- `scripts/update.sh` - 코드 업데이트 스크립트

```bash
# 적용된 흐름:
# 1. docker compose up -d
# 2. sleep 5 (백엔드 헬스체크 대기)
# 3. docker restart xmas-nginx (DNS 캐시 초기화)
# 4. 헬스체크 검증
```

### 검증 방법
```bash
# 1. API 헬스체크
curl -s -o /dev/null -w '%{http_code}' https://cc-jm.com/api/v2/health
# 기대값: 200

# 2. Nginx 에러 로그 확인 (새 에러 없음)
docker exec xmas-nginx cat /var/log/nginx/error.log | tail -5
```

### 예방 가이드라인
1. **배포 스크립트 사용 권장**: `scripts/rebuild_all.sh` 또는 `scripts/update.sh` (Nginx 재시작 포함)
2. **GitHub Actions CI/CD에 이미 반영됨**: `.github/workflows/deploy.yml` (Line 197~204)
3. Docker Compose 네트워크에서 컨테이너명 기반 DNS 사용 시 캐시 주의
4. 운영 모니터링에 502 에러 알림 추가 (Sentry/Prometheus)

### 관련 파일
- CI/CD: `.github/workflows/deploy.yml` (Line 197~204)
- 배포 스크립트: `scripts/rebuild_all.sh`, `scripts/update.sh`
- Nginx 설정: `nginx/nginx.conf`, `nginx/conf.d/default.conf`
- Docker Compose: `docker-compose.yml`

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

---
 
## 02-01 - [INFRA/BACKEND] CSV Import 한글 깨짐 (Mojibake) 해결 및 인코딩 자동 감지 도입
 
**우선순위**: P1
**관련 도메인**: BACKEND, ADMIN, DATA_OPS
 
### 증상
- 한국형 엑셀(MS Excel)에서 저장한 CSV 파일을 업로드할 때 한글이 알아볼 수 없게 깨짐 (예: `?대쫫 (?꾩씠디??`)
- 기존 시스템이 `UTF-8` 또는 `UTF-8-sig`만 강제하고 있어, `CP949(EUC-KR)` 인코딩을 인식하지 못함.
 
### 근본 원인
- **브라우저/서버 인코딩 불일치**: 엑셀의 인코딩 표준인 `CP949`와 웹 표준인 `UTF-8` 간의 매칭 실패.
- **감지 로직 부재**: 파일 내용을 읽기 전 인코딩을 명시적으로 확인하지 않고 하드코딩된 인코딩으로 파싱 시도.
 
### 해결 조치
1.  **chardet 라이브러리 도입**: 파일의 바이트 패턴을 분석하여 인코딩을 추정하는 기능 추가.
2.  **스마트 폴백(Smart Fallback) 적용**:
    - 인코딩 감지 결과가 낮거나 아스키(ASCII)일 경우 한국어 특성상 `CP949`로 우선 시도.
    - 실패 시 `UTF-8-sig`로 폴백하여 범용성 확보.
3.  **서비스 코드 업데이트**: 
    - [HQMarginImportService](file:///C:/Users/JAVIS/ch/ch25/app/v2/services/hq_margin_import_service.py)
    - [CSVImportService](file:///C:/Users/JAVIS/ch/ch25/app/v2/services/csv_import_service.py)
 
### 검증 방법
- `CP949`로 저장된 본사 마진 데이터를 업로드하여 한글 컬럼(`이름 (아이디)`, `총 운영 마진` 등)이 올바르게 인식되는지 확인.
- `excel-calc` 도구의 파싱 로직과 정합성 대조 완료.
 
### 예방 가이드라인
- CSV 파싱 로직 작성 시 항상 `chardet`을 통한 인코딩 선감지 패턴을 표준으로 채택할 것.
 
---
 
## 변경 이력
- 2026-01-31: W05 INFRA 문서 생성, 기존 분산 문서 통합
- 2026-02-01: 02-01 에러 진짜 원인 발견 및 수정 - hq_prospective_user 테이블 누락
- 2026-02-01: SOT Import 리팩터링 후 re-export 누락 이슈 추가 (커밋 3b64190)
- 2026-02-01: Issue #24 purge 500 에러 - V2 게임로그 미삭제 원인 확정 및 수정완료
- 2026-02-01: CSV Import 한글 헤더 지원(Localization) 및 서비스 호출 오타 수정
- 2026-02-01: CSV Import 한글 깨짐(Mojibake) 해결 및 인코딩 자동 감지 로직 적용
- 2026-02-01: **502 Bad Gateway 이슈 추가 - Docker 컨테이너 재시작 후 Nginx DNS 캐시 불일치**
- 2026-02-02: **일별 포유율 추이(Retention Trend) 최신화 수정 - 집계 기준일 변경 (D30 → Yesterday)**
- 2026-02-02: **Full Stack Integrity Check (Frontend Build/Type + Backend Syntax) - ALL PASS**

---

## 02-02 - [INFRA/OPS] Full Stack Integrity Verification (System Health Check)

**우선순위**: P2
**관련 도메인**: INFRA, FRONTEND, BACKEND

### 목적
- 주요 리팩터링 및 기능 추가(Retention Trend 등) 이후 시스템 전체 무결성 검증.
- 타입/빌드/구문 에러 전수 검사.

### 검증 항목 및 결과
1. **Frontend Type Check**
   - 명령: `npx tsc --noEmit`
   - 결과: **PASSED** (No Type Errors)
2. **Frontend Build Check**
   - 명령: `npm run build`
   - 결과: **PASSED** (Production Build Success)
3. **Backend Syntax Check**
   - 명령: `python -m compileall app/v2`
   - 결과: **PASSED** (No Syntax Errors)
4. **Critical Import Check**
   - 명령: `python -c "from app.v2.models import v2_admin_audit_log; print('Shim OK')"`
   - 결과: **PASSED** (Shim Works)

### 결론
- 현재 시스템(V2)은 빌드 및 런타임 시작 관점에서 **Clean State**입니다.


## 02-02 - [INFRA/ADMIN] 일별 포유율 추이(Retention Trend) 최신화 수정

**우선순위**: P2
**관련 도메인**: INFRA, BACKEND, ADMIN, FRONTEND

### 증상
- 어드민 분석 대시보드(Retention Trend)에서 최근 30일간의 데이터가 조회되지 않음.
- 가장 최근 데이터가 31일 전 데이터로 표시됨.

### 근본 원인 (증거 기반)
- **코드 로직 제한**: `analytics_routes.py`에서 D30(30일차 잔존율) 측정이 가능한 시점(`today - 31`)까지만 데이터를 조회하도록 `period_end`가 하드코딩 되어 있었음.
- **D1/D7 미표출**: D30이 아직 도래하지 않았지만 D1, D7 데이터는 확정된 최근 가입자(예: 어제 가입자)의 데이터조차 조회 범위 제한으로 인해 노출되지 않음.

### 해결 조치
1. **백엔드 (`analytics_routes.py`)**:
   - 집계 종료일(`period_end`)을 `today - 31`에서 **`today - 1` (어제)** 로 변경.
   - 최근 데이터까지 조회되도록 쿼리 범위 확장.
2. **프론트엔드 (`AnalyticsDashboard.tsx`)**:
   - 도래하지 않은 기간(Pending)에 대한 표시 로직 추가.
   - `0.0%` (실패로 오인 가능) 대신 `-` (집계 대기)으로 표기하여 혼동 방지.

### 검증 방법
- **테스트 코드**: `tests/v2/admin/test_analytics_retention_20260202.py`
  - 어제 가입자(`User1D`)가 트렌드 데이터에 포함되는지 검증 (PASSED).
  - 미래의 D7, D30 데이터가 `0.0`으로 안전하게 반환되는지 검증 (PASSED).
- **화면 확인**: 어드민 대시보드에서 어제 날짜 데이터가 노출되고, D1 잔존율이 정상 표기됨을 확인.

### 관련 파일
- Backend: `app/v2/api/admin/analytics_routes.py`
- Frontend: `src/v2/admin/pages/ops/AnalyticsDashboard.tsx`
- Test: `tests/v2/admin/test_analytics_retention_20260202.py`

---

## 02-02 - [INFRA/BACKEND] CSV Import 400 Bad Request (확장자 대소문자 구분 문제)

**우선순위**: P1
**관련 도메인**: BACKEND, ADMIN, INFRA

### 증상
- 파일명 끝이 대문자인 CSV 파일(예: `.CSV`) 업로드 시 400 에러 발생
- 에러 메시지: `detail: "Only CSV files are allowed"`

### 증상 정의 (Symptom Abstraction)
| 항목 | 내용 |
|---|---|
| **대상 기능** | CSV 파일 업로드 (`/api/v2/admin/csv-import/upload`) |
| **HTTP Status** | 400 (Bad Request) |
| **영향 범위** | 어드민 CSV 임포트 기능 전체 |
| **재현 빈도** | 항상 (대문자 확장자 사용 시) |

### 근본 원인
- 백엔드 코드에서 `file.filename.endswith(".csv")` 형식을 사용하여 대소문자를 엄격하게 구분함.
- 윈도우 환경이나 특정 엑셀 내보내기에서 확장자가 `.CSV`로 생성될 경우 필터링에 걸림.

### 해결 조치
- 확장자 체크 시 `.lower()`를 추가하여 대소문자 구분 없이 인식하도록 수정.
- 대상 파일: `app/v2/api/admin/csv_import_routes.py`, `app/api/admin/routes/admin_crm.py`

```python
# Before
if not file.filename.endswith(".csv"):

# After
if not file.filename.lower().endswith(".csv"):
```

### 검증 방법
- `.CSV` 확장자를 가진 파일로 업로드 테스트 수행 시 정상적으로 200 OK 반환 확인.

### 예방 가이드라인
- 모든 파일 업로드 라우터에서 확장자 검증 시 반드시 `.lower()`를 사용하여 케이스 케어(Case Care)를 수행할 것.

---
