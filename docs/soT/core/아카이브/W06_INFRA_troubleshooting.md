문서 타입: 트러블슈팅
주차: W06 (2026-02-03 ~ 2026-02-09)
도메인: INFRA
상태: 진행 중 ⏳

# W06 INFRA 트러블슈팅 리포트

## 📌 요약 및 통계
| 항목 | 내용 |
|---|---|
| 미해결 이슈 | 0 |
| 해결된 이슈 | 12 |
| SoT 승격 예정 | 0 |

---

## 🔗 연관 문서
- [Troubleshooting 메인 (README)](./README.md)
- [W05 (이전 주차) INFRA 리포트](./archive/weekly/W05_INFRA_troubleshooting.md)
- [V2 Fullstack Deployment Runbook](../00_sot_meta/0000_2026_v2_fullstack_deployment_runbook_ko.md)

---

## 🔍 주간 이슈 내역

### 02-04 - INFRA/OPS: 운영 서버 DB 백업 및 디스크 공간 확보 ✅

**증상 정의**
| 항목 | 내용 |
|---|---|
| 대상 기능 | 운영 서버 DB 백업/정리 |
| HTTP Status | N/A (운영 작업) |
| 영향 범위 | 운영 서버 디스크/배포 안정성 |
| 재현 빈도 | 필요 시 |

**근본 원인 (증거 기반)**
- 운영 서버 디스크 여유 공간 확보 및 백업 스냅샷이 필요했음.

**해결 방법**
- `mysqldump` 백업 생성 (`--no-tablespaces` 옵션으로 권한 이슈 회피)
- Docker prune로 미사용 리소스 정리

**검증 방법**
- 백업 파일 생성 여부 및 크기 확인
- 디스크 사용량 감소 확인

**🏷️ 태그**
`P1` `INFRA` `OPS` `BACKUP` `DOCKER` `✅해결완료`

---

### 02-04 - INFRA/DEV: 로컬 도커 환경 정리 (빌드 캐시/이미지 정리) ✅

**증상 정의**
| 항목 | 내용 |
|---|---|
| 대상 기능 | 로컬 개발 환경 Docker 정리 |
| HTTP Status | N/A |
| 영향 범위 | 로컬 빌드/디스크 |
| 재현 빈도 | 필요 시 |

**해결 방법**
- `docker system prune -f`, `docker image prune -a -f`, `docker builder prune -f` 수행

**🏷️ 태그**
`P2` `INFRA` `DEV` `DOCKER` `CLEANUP` `✅해결완료`

---

### 02-04 - INFRA/SCM: GitHub Push Protection(Secret) 차단 해결 ✅

**증상 정의**
| 항목 | 내용 |
|---|---|
| 대상 기능 | GitHub Push (deploy 브랜치) |
| HTTP Status | N/A (SCM 정책 차단) |
| 영향 범위 | 배포 파이프라인 |
| 재현 빈도 | 항상 |

**근본 원인 (증거 기반)**
- 분석 결과 CSV에 API Key가 포함되어 GitHub Push Protection에 의해 push가 차단됨.

**해결 방법**
- `git filter-branch`로 Git 히스토리에서 해당 파일들을 제거 후 강제 push

**재발 방지**
- 분석 산출물에 민감정보(키/토큰) 포함 금지
- 필요 시 `.gitignore` 패턴 점검

**🏷️ 태그**
`P0` `INFRA` `SCM` `SECURITY` `SECRET` `✅해결완료`

---

### 02-04 - INFRA/DASHBOARD: HQ Margin 세그먼트 카운트 정합성 확인 ✅

**증상 정의**
| 항목 | 내용 |
|---|---|
| 대상 기능 | 통합관제센터 HQ Margin Stats (/api/v2/admin/ops/status) |
| HTTP Status | 200 (데이터 정합성 질의) |
| 영향 범위 | 관리자 대시보드 지표 |
| 재현 빈도 | 항상 |

**근본 원인 (증거 기반)**
- 신규 가입 후 7일 동안 시스템 세그먼트가 `NEW`로 고정되는 정책 때문에 VIP/WHALE/AT_RISK 카운트가 0으로 보이는 것이 정상일 수 있음.

**해결/결론**
- DB 조회 및 서비스 로직을 근거로 화면 표시값이 정책과 정합함을 확인 (오동작 아님)

**🏷️ 태그**
`P3` `INFRA` `DASHBOARD` `SEGMENT` `POLICY_COMPLIANT` `✅검증완료`

---

### 02-04 - INFRA/ARCH: V2 Legacy Purge 및 V1-V2 디커플링 진행 상황 정리 ✅

**증상 정의**
| 항목 | 내용 |
|---|---|
| 대상 기능 | V2 네이티브 격리(레거시 의존 제거) |
| HTTP Status | N/A (아키텍처 작업) |
| 영향 범위 | 백엔드 런타임/배포/테스트 안정성 |
| 재현 빈도 | 항상(기술부채) |

**해결 방법**
- 모델/스키마를 `app/v2/`로 물리 이전하여 V1 의존 제거
- FastAPI 진입점에서 레거시 라우터/미들웨어 제거, `/api/v2` 단독 운영 체제 확립

**🏷️ 태그**
`P1` `INFRA` `ARCH` `V2_NATIVE` `LEGACY_PURGE` `✅완료`

### 02-04 - INFRA/ADMIN: 통합관제센터 ops/status 응답 정상 수신 확인 ✅

**증상 정의**
| 항목 | 내용 |
|---|---|
| 대상 기능 | 통합관제센터 현황판 데이터 수신 (/api/v2/admin/ops/status) |
| HTTP Status | 200 (OK) |
| 영향 범위 | 관리자 통합관제센터 |
| 재현 빈도 | 반복 확인 |

**근본 원인 (증거 기반)**
- 운영 서버 백엔드 로그에서 `/api/v2/admin/ops/status` 다건 200 OK 확인
- 요청 로그 근거: `docker logs xmas-backend --tail=200`

**검증 방법**
- 운영 서버 로그에서 `/api/v2/admin/ops/status` 200 OK 응답 반복 확인

**비고**
- 통합관제센터는 백엔드 집계 데이터(ops/status)를 폴링 방식으로 수신함

### 02-03 - API: Admin 닉네임 수정 500 에러 (AttributeError: log_action) ✅

**증상 정의**
| 항목 | 내용 |
|---|---|
| 대상 기능 | PATCH /api/v2/admin/users/{id}/nickname |
| HTTP Status | 500 (Internal Server Error) |
| 영향 범위 | 관리자 유저 닉네임 수정 |
| 재현 빈도 | 항상 |

**근본 원인 (증거 기반)**
- Stack Trace: `AttributeError: type object 'V2AdminAuditService' has no attribute 'log_action'`
- `V2AdminAuditService` 클래스에는 `log()` 메서드만 존재, `log_action()` 호출은 잘못됨
- 코드에서 잘못된 메서드명 사용 + 파라미터 순서 불일치

**해결 방법**
- `user_routes.py` 323라인 수정:
  - `V2AdminAuditService.log_action(db, admin_id, "UPDATE_NICKNAME", str(user_id), ...)` 
  - → `V2AdminAuditService.log(db, admin_id, "UPDATE_NICKNAME", target_type="USER", target_id=str(user_id), ...)`
- 관련 파일: [app/v2/api/admin/user_routes.py](../../../app/v2/api/admin/user_routes.py#L323-L331)

**검증 방법**
- 관리자 페이지에서 유저 닉네임 수정 → 200 OK 응답 확인
- `docker logs xmas-backend --tail=50`에서 AttributeError 없음 확인

---

### 02-02 - INFRA Redis Consumer Group NOGROUP 에러 (mission_workers)
| 항목 | 내용 |
|---|---|
| 대상 기능 | Celery / Redis Stream Consumer |
| 영향 범위 | 미션 정산 / 백그라운드 태스크 |
| 재현 빈도 | 항상 (운영 서버 로그) |

**증상**
- 운영 서버 로그 (`docker logs xmas-backend`)에서 지속적인 Redis 에러 발생
- `redis.exceptions.ResponseError: NOGROUP No such key 'mission_workers' in XREADGROUP with GROUP option`

**원인 분석**
- Redis Stream `mission_workers` 키는 존재하나, Consumer Group이 생성되지 않았거나 삭제됨.
- Celery 워커가 존재하지 않는 그룹 명으로 읽기를 시도함.

**상태 업데이트 (02-02)**
- 현재 운영 서버 로그 확인 결과 해당 에러 더 이상 발생하지 않음 (안정화됨).
- 관리 수동 조치 완료 추정.

**해결 방법**
- 관리자가 직접 Redis CLI에서 그룹 생성 필요:
  `XGROUP CREATE mission_workers mission_group $ MKSTREAM`

**상태 업데이트 (02-02)**
- 운영 Redis에서 `mission_workers` 그룹 생성/확인 완료
- `docker exec xmas-redis redis-cli XINFO GROUPS mission_workers`로 `mission_group` 확인
- 운영 로그 재확인 기준 NOGROUP 미발생

---

### 02-02 - INFRA Redis Stream NOGROUP 에러 (stream:raw_logs)
| 항목 | 내용 |
|---|---|
| 대상 기능 | 이벤트 워커 / Redis Stream Consumer |
| 영향 범위 | 리텐션 워커 로그 스트림 소비 |
| 재현 빈도 | 항상 (운영 서버 로그) |

**증상**
- 운영 서버 로그에서 지속적인 에러 반복 확인
- `redis.exceptions.ResponseError: NOGROUP No such key 'stream:raw_logs' or consumer group 'group:retention_workers' in XREADGROUP with GROUP option`

**근본 원인 (증거 기반)**
- 스트림 키 `stream:raw_logs` 또는 컨슈머 그룹 `group:retention_workers` 미생성
- 워커가 존재하지 않는 그룹으로 `XREADGROUP` 호출
- 근거 로그: 운영 서버 `docker logs xmas-backend --tail=200`

**해결 방법**
- 관리자가 직접 Redis CLI에서 그룹 생성 (멱등):
  `XGROUP CREATE stream:raw_logs group:retention_workers $ MKSTREAM`

**검증 방법**
- 운영 서버에서 로그 재확인:
  `docker logs xmas-backend --tail=200`

**상태 업데이트 (02-02)**
- 운영 Redis `XINFO GROUPS stream:raw_logs`에서 `group:retention_workers` 확인
- 운영 로그 재확인 결과 NOGROUP 미발생

---

### 02-04 - API: Paste Import Preview 404 Not Found ✅

**증상 정의**
| 항목 | 내용 |
|---|---|
| 대상 기능 | POST /api/v2/admin/csv-import/paste-import/preview |
| HTTP Status | 404 (Not Found) |
| 영향 범위 | 관리자 붙여넣기 Import 미리보기 |
| 재현 빈도 | 항상 |

**근본 원인 (증거 기반)**
- 프론트엔드(`adminApi.ts`): `/api/v2/admin/csv-import/paste-import/preview` 호출
- 백엔드(`csv_import_routes.py`): `@router.post("/paste-import/preview")` → 실제 경로 `/api/v2/admin/paste-import/preview`
- **경로 프리픽스 불일치**: 프론트엔드는 `/csv-import/` 하위 경로를 기대, 백엔드는 `/paste-import/`로 직접 등록

**해결 방법**
- `csv_import_routes.py`에서 라우터 경로 수정:
  - `@router.post("/paste-import")` → `@router.post("/csv-import/paste-import")`
  - `@router.post("/paste-import/preview")` → `@router.post("/csv-import/paste-import/preview")`
- 관련 파일: [app/v2/api/admin/csv_import_routes.py](../../../app/v2/api/admin/csv_import_routes.py#L225-L268)

**검증 방법**
```bash
# 로컬 백엔드 라우트 확인
docker compose exec backend python -c "from app.main import app; routes = [(r.methods, r.path) for r in app.routes if 'paste-import' in str(r.path)]; print(routes)"
# 결과: ({'POST'}, '/api/v2/admin/csv-import/paste-import'), ({'POST'}, '/api/v2/admin/csv-import/paste-import/preview')
```

---

### 02-05 - INFRA: 백엔드 헬스체크 실패 (ModuleNotFoundError: app.schemas) ✅

**증상 정의**
| 항목 | 내용 |
|---|---|
| 대상 기능 | GET /api/v2/health (컨테이너 헬스체크) |
| HTTP Status | 500 (Internal Server Error) |
| 영향 범위 | 백엔드 컨테이너 기동/헬스체크 실패 |
| 재현 빈도 | 항상 |

**근본 원인 (증거 기반)**
- Stack Trace: `ModuleNotFoundError: No module named 'app.schemas'`
- `app/core/kst_response.py`가 `app.schemas.base`를 import
- 실제 코드베이스에 `app/schemas/` 패키지가 존재하지 않음

**해결 방법**
- `app/core/kst_response.py`의 import 경로를 V2 스키마 유틸로 변경
- 관련 파일:
  - [app/core/kst_response.py](../../../app/core/kst_response.py)
  - [app/v2/schemas/base.py](../../../app/v2/schemas/base.py)

**검증 방법**
- 백엔드 컨테이너 재기동 후 `/api/v2/health` 200 OK 확인
- `docker compose logs backend --tail=50`에서 ModuleNotFoundError 미발생 확인

---

## 📝 관리 가이드
- Docker, Nginx, CI/CD, Sentry 서버 모니터링
