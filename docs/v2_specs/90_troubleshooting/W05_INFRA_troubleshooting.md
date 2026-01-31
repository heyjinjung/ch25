문서 타입: 트러블슈팅 (주간)
주차: W05 (2026-01-27 ~ 2026-02-02)
도메인: INFRA (인프라/배포)
상태: ACTIVE

# W05 INFRA 트러블슈팅

## 요약
| 날짜 | 이슈 | 상태 |
|---|---|---|
| 01-31 | /api/v2/admin/ops/status 500 (ModuleNotFoundError) | ✅ FIXED (배포대기) |
| 01-31 | Sentry 설정 업데이트 (알림 최적화) | ✅ RESOLVED |
| 01-31 | Sentry Log Monitoring 활성화 | ✅ RESOLVED |
| 01-30 | 배포 검증 리포트 | ✅ RESOLVED |

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
