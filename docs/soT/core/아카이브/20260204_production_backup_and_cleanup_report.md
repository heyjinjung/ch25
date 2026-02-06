# troubleshooting 리포트: 운영 서버 DB 백업 및 공간 확보 (2026-02-04)

## 📌 요약
| 항목 | 내용 |
|---|---|
| 작업 일시 | 2026-02-04 16:40 KST |
| 도메인 | INFRA / OPS |
| 상태 | ✅ 완료 |
| 확보된 공간 | 약 6.32GB |

---

## 🔍 작업 내역

### 1. DB 백업
- **대상**: `xmas-db` 컨테이너의 `xmas_event` 데이터베이스
- **결과**: `/root/xmas_event_backup_20260204_073547.sql.gz` 파일 생성 (49KB)
- **특이사항**: `mysqldump` 시 `--no-tablespaces` 옵션 적용하여 권한 이슈 해결.

### 2. 디스크 여유 공간 확보
- **작업 전**: 18GB 사용 (40%)
- **작업 후**: 12GB 사용 (26%)
- **조치 내용**:
  - Docker 시스템 프룬 (`docker system prune -f`)
  - 미사용 이미지 전체 삭제 (`docker image prune -a -f`)
- **결과**: 약 6.32GB 공간 회수 완료.

---

## 📝 관리 가이드 업데이트
- 운영 서버의 정기적인 `docker image prune`이 필요함.
- 백업 파일은 `/root/` 경로에 날짜별로 저장됨.
