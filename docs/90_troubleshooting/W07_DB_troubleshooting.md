문서 타입: 트러블슈팅
주차: W07 (2026-02-10 ~ 2026-02-16)
도메인: DB
상태: 진행 중 ⏳

# W07 DB 트러블슈팅 리포트

## 📌 요약 및 통계
| 항목 | 내용 |
|---|---|
| 미해결 이슈 | 0 |
| 해결된 이슈 | 1 |
| SoT 승격 예정 | 0 |

---

## 🔗 연관 문서
- [Troubleshooting 메인 (README)](./README.md)
- [W06 (이전 주차) DB 리포트](./W06_DB_troubleshooting.md)
- [V2 DB Legacy 트러블슈팅](../SOT/00_db/v2_troubleshooting_20260120_alembic_legacy_ko.md)

---

## 🔍 주간 이슈 내역

### 02-12 - DB/MIGRATION: alembic upgrade head 실패 (DATETIME TZ / mission 스키마 불일치) ✅

**증상 정의**
| 항목 | 내용 |
|---|---|
| 대상 기능 | 배포/CI 마이그레이션 (`alembic upgrade head`) |
| HTTP Status | N/A (마이그레이션 단계 실패) |
| 영향 범위 | 백엔드 컨테이너 시작/배포 파이프라인 전체 |
| 재현 빈도 | 항상 (해당 리비전 적용 시) |

**증상(로그 근거)**
- MySQL 에러 1: `Incorrect datetime value: '2026-02-14 23:59:59+09'` (`expires_at` DATETIME)
- MySQL 에러 2: `Unknown column 'visible' in 'field list'` (mission seed INSERT)
- 재시도 중 일부 DDL만 적용되어 `Table 'event_secret_code' already exists`로 2차 실패 발생

**근본 원인 (증거 기반)**
- `event_secret_code.expires_at` 컬럼 타입이 `DATETIME`인데, seed SQL이 `+09` 타임존 오프셋 문자열을 삽입하여 MySQL이 파싱 실패.
- `mission` 테이블에 `visible` 컬럼이 없는 환경에서 seed SQL이 `visible`을 포함하여 실패.
- Alembic 재시도/재실행 시, 이전 시도에서 테이블이 생성된 상태가 남아 DDL이 반복 적용되며 실패.

**해결 방법**
- 마이그레이션 파일을 재실행 안전(idempotent)하게 수정:
  - `expires_at` 값에서 `+09` 제거 (DATETIME 호환)
  - 테이블/인덱스 생성은 존재 여부를 확인 후 수행
  - `event_secret_code`/`mission` seed는 `ON DUPLICATE KEY UPDATE` 또는 스키마 기반 동적 UPSERT 적용
- 수정 파일: [alembic/versions/20260214_1000_event_valentine_seol_missions.py](../../alembic/versions/20260214_1000_event_valentine_seol_missions.py)

**검증 방법**
1) `docker compose exec backend alembic upgrade head`
2) `docker compose exec backend alembic current`가 `20260214_1000 (head)`인지 확인

**🏷️ 태그**
`P0` `DB` `MIGRATION` `CI` `✅해결완료`
