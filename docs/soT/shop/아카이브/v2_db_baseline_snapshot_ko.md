문서 타입: DB 스키마/마이그레이션
버전: v1.0
작성일: 2026-01-19
작성자: GitHub Copilot
대상: BE/DB/운영
상태: SoT

## 1. 목적 (Purpose)
V2 완전 리셋 배포를 위한 **베이스라인 스냅샷 마이그레이션**의 기준을 정의한다.

## 2. 범위 (Scope)
- V2 신규 DB(v2) 기준 초기 스키마
- 스냅샷 이후 누적 마이그레이션 전략

## 3. 스냅샷 기준 (Baseline)
- DB 이름: `v2`
- 스냅샷 마이그레이션: `20260119_0904_3bc52f37e0c0_baseline_v2_snapshot`
- 기존 히스토리 마이그레이션은 `alembic/versions_archive/`로 아카이브

## 4. 핵심 데이터 무결성 규칙 (Integrity Rules)

주간 트러블슈팅(W05) 결과에 따라 아래 테이블의 `user_id` FK 제약조건을 표준화한다.

| 대상 테이블 | FK 기준 테이블 | 제약조건 (Action) | 비고 |
| :--- | :--- | :--- | :--- |
| `v2_dice_log` | `v2_user.id` | `ON DELETE SET NULL` | 유저 삭제 시에도 로그 보존 |
| `v2_roulette_log` | `v2_user.id` | `ON DELETE SET NULL` | 유저 삭제 시에도 로그 보존 |
| `v2_lottery_log` | `v2_user.id` | `ON DELETE SET NULL` | 유저 삭제 시에도 로그 보존 |
| `v2_shop_order` | `v2_user.id` | `ON DELETE SET NULL` | 주문 내역 보존 |

---

## 5. 운영/검증 (QA)
- [ ] v2 DB가 빈 상태에서 스냅샷 적용으로 전체 스키마 생성되는지 확인
- [ ] 이후 변경은 누적 마이그레이션으로만 추가

## 6. 변경 이력
- v1.1 (2026-02-02, Antigravity Agent): W05 트러블슈팅 기반 게임로그/주문 테이블 FK 표준(`ON DELETE SET NULL`) 추가
- v1.0 (2026-01-19, GitHub Copilot): 최초 작성
