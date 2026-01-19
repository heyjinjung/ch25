문서 타입: 운영/DB 정책
버전: v1.0
작성일: 2026-01-19
작성자: GitHub Copilot
대상: BE/DB/운영
상태: SoT

## 1. 목적 (Purpose)
V2 전용 DB 스냅샷 재생성 기준과 절차를 정의한다.

## 2. 범위 (Scope)
- 배포 전 clean snapshot 생성 기준
- 스냅샷 생성/적용 절차
- 기준 리비전 고정 규칙

## 3. 기준 (Criteria)
- **대상**: `v2` 데이터베이스
- **기준 리비전**: V2 헤드 리비전(예: `20260119_1400`) 고정
- **시점**: 배포 전(릴리즈 후보 확정 후)
- **조건**: 스키마/정책 SoT 변경이 누적된 경우에만 재생성

## 4. 절차 (Procedure)
1) `v2` DB 초기화 또는 clean 스키마 확보
2) 기준 리비전까지 마이그레이션 적용
3) 스냅샷 파일 생성 및 04_db 문서 갱신
4) 스냅샷 적용 테스트 및 헤드 일치 확인

## 5. 금지/주의 사항
- V1 DB에 스냅샷 적용 금지
- 스냅샷 적용 후 `alembic current`가 기준 리비전과 일치해야 함

## 6. 근거 (Source)
- V2 DB 베이스라인 스냅샷: [docs/v2_specs/04_db/v2_db_baseline_snapshot_ko.md](../04_db/v2_db_baseline_snapshot_ko.md#L1)
- 마이그레이션 플랜: [docs/v2_specs/00_sot_meta/00_v2_migration_plan.md](../00_sot_meta/00_v2_migration_plan.md#L1)

## 7. 변경 이력
- v1.0 (2026-01-19, GitHub Copilot): 최초 작성
