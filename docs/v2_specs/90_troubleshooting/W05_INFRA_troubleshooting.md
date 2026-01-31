문서 타입: 트러블슈팅 (주간)
주차: W05 (2026-01-27 ~ 2026-02-02)
도메인: INFRA (인프라/배포)
상태: ACTIVE

# W05 INFRA 트러블슈팅

## 요약
| 날짜 | 이슈 | 상태 |
|---|---|---|
| 01-31 | Sentry 설정 업데이트 | ✅ RESOLVED |
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
