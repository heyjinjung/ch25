문서 타입: 트러블슈팅
주차: W06 (2026-02-03 ~ 2026-02-09)
도메인: INFRA
상태: 진행 중 ⏳

# W06 INFRA 트러블슈팅 리포트

## 📌 요약 및 통계
| 항목 | 내용 |
|---|---|
| 미해결 이슈 | 1 |
| 해결된 이슈 | 0 |
| SoT 승격 예정 | 0 |

---

## 🔗 연관 문서
- [Troubleshooting 메인 (README)](./README.md)
- [W05 (이전 주차) INFRA 리포트](./archive/weekly/W05_INFRA_troubleshooting.md)
- [V2 Fullstack Deployment Runbook](../00_sot_meta/0000_2026_v2_fullstack_deployment_runbook_ko.md)

---

## 🔍 주간 이슈 내역

### 02-02 - INFRA Redis Consumer Group NOGROUP 에러
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

---

## 📝 관리 가이드
- Docker, Nginx, CI/CD, Sentry 서버 모니터링
