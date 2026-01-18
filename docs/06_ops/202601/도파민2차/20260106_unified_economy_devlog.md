# 개발로그: 통합 경제(Unified Economy) 리팩토링 진행 기록

- 날짜: 2026-01-06
- 범위: 통합 경제 SoT(POINT→금고, GAME_XP 분리, 기프티콘=지급대기/보상함) 프론트/어드민 반영 + 운영 체크리스트(5/6) 근거화 + 서버 재적용 준비
- 관련 체크리스트: [docs/06_ops/202601/20260106_unified_economy_refactoring_checklist.md](docs/06_ops/202601/20260106_unified_economy_refactoring_checklist.md)

---

## 1) 목표(SoT)

- `POINT`/`CC_POINT`: 금고 적립(Vault, `vault_locked_balance` 단일 SoT)
- `GAME_XP`: 시즌 XP(게임/미션에서 XP가 금고로 섞이지 않도록 분리)
- `*_GIFTICON*`: 지급대기/보상함(Inventory/토큰/경품 대기)
- 골든아워 배율: 금고 적립에만 적용(정책상 XP에는 미적용)

---

## 2) 작업 단위 분리(중요)

이번 작업은 크게 2축으로 분리됨.

1) **코드/문서(리포지토리 반영)**
- 프론트/어드민 라벨/표기 통일, 체크리스트/컴포즈 플래그 정리

2) **운영 DB 데이터 교정/마이그레이션(서버에서 실행)**
- 5-2: 운영 DB의 게임 설정(룰렛/복권/미션 등)을 “Unified Economy 기준”으로 교정
- 6-2: `cash_balance → vault_locked_balance` 이관(필요 시)

특히 운영 DB 교정(5-2)과 마이그레이션(6-2)은 **빌드(이미지 생성)와 별개**이며, 최신 서버 DB 기준으로는 “완전 새로 진행”이 필요하다고 정리됨.

---

## 3) 프론트/어드민 반영 요약

### 3-1. 공통 라벨/표기 통일
- 공통 보상 라벨 유틸을 중심으로 게임/금고/미션/시즌패스 화면의 보상 표기를 일관화
- `GAME_XP`는 “시즌 XP” 의미가 명확히 드러나도록 표기 강화

### 3-2. 빌드 확인(로컬)
- 로컬에서 `npm run build` 성공(정적 빌드 관점의 타입/번들링 통과)

### 3-3. 어드민 미션 관리 UI 변경(최근 변경)
- [src/admin/pages/AdminMissionPage.tsx](src/admin/pages/AdminMissionPage.tsx)
  - 미션 보상 타입 드롭다운을 `REWARD_TYPES` 기반으로 렌더링하도록 변경
  - 리스트 표시에서 reward_type에 따라 라벨을 더 읽기 좋게 표시하도록 보강(POINT/GAME_XP/DIAMOND/기타)

---

## 4) 운영 체크리스트/운영 스크립트 정리(근거 중심)

### 4-1. 체크리스트 문서 갱신
- [docs/06_ops/202601/20260106_unified_economy_refactoring_checklist.md](docs/06_ops/202601/20260106_unified_economy_refactoring_checklist.md)
  - 5-1(시드)은 “운영 직접 실행 필수 아님”으로 성격을 명확히 분리
  - 5-2(운영 DB 교정) 및 환경 플래그 확인을 운영 관점에서 기술

> 주의: 체크리스트상 5-2/6-3이 ‘완료’로 표기되어 있어도,
> **서버 최신 DB 기준으로는 5/6을 다시(완전 새로) 진행**해야 한다는 운영 판단이 추가됨.

### 4-2. 운영 DB 교정 스크립트(5-2)
- 스크립트: [scripts/deploy_update_game_config_v3.py](scripts/deploy_update_game_config_v3.py)
- 동작 요약:
  - 활성 roulette_config의 segment를 (slot_index 기준) 업데이트/없으면 INSERT
  - 활성 lottery_config의 prize를 일부 매핑 업데이트 + `GAME_XP` prize가 없으면 추가
  - `mission.logic_key='daily_login_gift'`의 `xp_reward`를 보정

### 4-3. cash→vault 이관 스크립트(6-2)
- 기본 스크립트(ledger + idempotency 기록): [scripts/migrate_cash_to_vault.py](scripts/migrate_cash_to_vault.py)
  - 기본은 dry-run, 적용 시 `--execute`
- 대안(ledger 미기록, 일괄 UPDATE): [scripts/migrate_cash_balance_to_vault_locked.py](scripts/migrate_cash_balance_to_vault_locked.py)
  - `--dry-run` / `--apply`

---

## 5) 서버/운영 DB 기준 재진행(5/6) 실행 순서(복붙용)

> 전제: 서버에 접속한 bash 셸에서 실행(로컬 PowerShell 원격은 따옴표 이슈가 있었음)

### 5-1. 컨테이너명 확인
- `cd /root/ch25`
- `docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"`

### 5-2. 5-2 운영 DB 교정 실행
- `docker exec -it xmas-backend python scripts/deploy_update_game_config_v3.py`

### 5-3. 5-2 post-check(카운트 확인)
- `docker exec -i xmas-backend python - <<'PY'
from sqlalchemy import text
from app.db.session import SessionLocal

db = SessionLocal()
try:
    cnt_roulette_game_xp = db.execute(text("SELECT COUNT(*) FROM roulette_segment WHERE reward_type='GAME_XP'")).scalar() or 0
    cnt_lottery_game_xp  = db.execute(text("SELECT COUNT(*) FROM lottery_prize   WHERE reward_type='GAME_XP'")).scalar() or 0
    active_roulette_cfg  = db.execute(text("SELECT COUNT(*) FROM roulette_config WHERE is_active=TRUE")).scalar() or 0
    active_lottery_cfg   = db.execute(text("SELECT COUNT(*) FROM lottery_config  WHERE is_active=TRUE")).scalar() or 0

    print("active_roulette_cfg =", active_roulette_cfg)
    print("active_lottery_cfg  =", active_lottery_cfg)
    print("cnt_roulette_game_xp=", cnt_roulette_game_xp)
    print("cnt_lottery_game_xp =", cnt_lottery_game_xp)
finally:
    db.close()
PY`

### 5-4. 6-2 cash→vault dry-run
- `docker exec -it xmas-backend python scripts/migrate_cash_to_vault.py`

### 5-5. 6-2 cash→vault execute
- `docker exec -it xmas-backend python scripts/migrate_cash_to_vault.py --execute`

### 5-6. 6-2 사후 검증(잔여 cash/ledger)
- `docker exec -i xmas-backend python - <<'PY'
from sqlalchemy import text
from app.db.session import SessionLocal

db = SessionLocal()
try:
    row = db.execute(text("""
        SELECT
          SUM(CASE WHEN cash_balance > 0 THEN 1 ELSE 0 END) AS cnt_cash_pos,
          COALESCE(SUM(CASE WHEN cash_balance > 0 THEN cash_balance ELSE 0 END),0) AS sum_cash_pos,
          COALESCE(SUM(vault_locked_balance),0) AS sum_locked
        FROM user
    """)).mappings().one()
    print("cnt_cash_pos =", row["cnt_cash_pos"])
    print("sum_cash_pos =", row["sum_cash_pos"])
    print("sum_locked   =", row["sum_locked"])

    led = db.execute(text("""
        SELECT COUNT(*) FROM user_cash_ledger
        WHERE reason='CASH_TO_VAULT_MIGRATION'
    """)).scalar() or 0
    print("ledger_rows(reason=CASH_TO_VAULT_MIGRATION) =", led)
finally:
    db.close()
PY`

---

## 6) 리스크/주의사항

- 5-2/6-2는 운영 DB를 직접 수정하므로 **실행 전후 출력(캡처/로그) 보관 필수**
- `migrate_cash_to_vault.py`는 유저별 idempotency가 있으면 스킵하므로, “cash_balance가 남아있는데 스킵” 같은 비정상 케이스는 별도 조사 필요
- 서버에서 Docker 빌드가 동시에 진행될 수 있으나, DB 교정/이관은 “컨테이너 기동/헬스 확인 후” 수행하는 게 안전

---

## 7) 현재 상태 요약(2026-01-06 기준)

- 체크리스트 문서가 최신 기준으로 갱신됨(5-1/5-2/6/테스트 섹션 표기 변경 포함)
- 어드민 미션 페이지에서 보상 타입/표기 로직이 `REWARD_TYPES` 기반으로 정리됨
- 서버 기준으로는 5/6을 “최신 DB 기준으로 완전 새로” 진행하는 것이 목표이며,
  실행 순서는 **5-2 → post-check → 6-2(dry-run) → 6-2(execute) → 사후 검증**으로 고정
