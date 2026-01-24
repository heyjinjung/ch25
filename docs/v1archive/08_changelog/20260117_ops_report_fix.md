# 📉 운영 리포트 정합성 개선 및 트랜잭션 수정

**작성일**: 2026-01-17
**작성자**: GitHub Copilot
**관련**: [데일리 운영일지], [DB 정합성], [Game Service Atomicity]

---

## 1. 개요
2026-01-17 운영일지 생성 중 **게임 플레이 횟수 누락(0건)** 현상이 발견되었습니다. 이는 1) 리포트 조회 쿼리의 UTC/KST 시차 문제와 2) 게임 서비스의 트랜잭션 분리(Wallet차감/Log생성)로 인한 로그 유실이 복합적으로 작용한 결과였습니다.
이를 해결하기 위해 **원장(Ledger) 기반의 집계 로직**으로 리포트 스크립트를 전면 수정하고, 게임 서비스의 **트랜잭션 원자성(Atomicity)**을 강화했습니다.

---

## 2. 문제 상황 (Root Cause)

### 2.1 리포트 데이터 누락 (Data Gap)
- **증상**: `UserGameWalletLedger`에는 수십 건의 `ROULETTE_PLAY` 차감 내역이 있으나, 리포트 스크립트는 `roulette_log` 테이블을 조회하여 0건으로 출력.
- **원인 1 (Timezone)**: DB는 UTC(`00:00`) 기준이나, 리포트는 한국 날짜(`2026-01-17`)로 조회.
    - `DATE(created_at) = '2026-01-17'` 조건 사용 시, 한국 시간 00:00~09:00(UTC 전일 15:00~24:00) 데이터가 전날로 잡힘.
- **원인 2 (Log Missing)**: `roulette_service` 등에서 지갑 차감은 성공했으나, 이후 로직(UX/Result) 에러 등으로 롤백되거나 로그 Insert가 누락됨.
    - 결과적으로 "돈은 썼는데 로그는 없는" 상태(Ghost Spend) 발생.

---

## 3. 해결 방안 (Fix)

### 3.1 리포트 집계 로직 변경 (Ops Script update)
- **SoT 변경 (Log → Ledger)**: 보조 테이블인 `game_log` 대신, **돈이 오간 사실이 기록된 `user_game_wallet_ledger`**를 기준으로 플레이 횟수를 집계하도록 변경.
    - 매핑: `ROULETTE_PLAY` → 룰렛, `LOTTERY_PLAY` → 복권, `DICE_PLAY` → 주사위
- **Timezone 보정**: 모든 날짜 비교 쿼리에 `INTERVAL 9 HOUR` 추가.
    - `DATE(DATE_ADD(created_at, INTERVAL 9 HOUR)) = '{target_date}'`

### 3.2 게임 서비스 트랜잭션 강화 (Backend Patch)
- **Auto Commit 비활성화**: `wallet_service.require_and_consume_token` 호출 시 `auto_commit=False` 옵션 사용.
- **단일 트랜잭션 보장**: "재화 차감 + 결과 처리 + 로그 생성"이 하나의 트랜잭션으로 묶이도록 수정.
    - `LotteryService`: 티켓 차감과 로그 생성을 묶음.
    - `RouletteService`: `UserActivity` 등 부가 로직 실패가 메인 트랜잭션을 깨지 않도록 `db.begin_nested()` 적용.

---

## 4. 검증 결과 (Verification)

### 4.1 리포트 데이터 복구
수정된 스크립트(`daily_ops_log_generator.py`)로 2026-01-17 리포트 재생성 결과, 원장 데이터와 일치하는 수치 확보.
- **룰렛**: 9회(로그 기준) → **80회**(원장 기준)
- **복권**: 0회(로그 기준) → **45회**(원장 기준)

### 4.2 운영 가이드 업데이트
- `데일리_운영일지_템플릿.md`에 KST 기준 집계 및 원장 기반 분석 가이드 내용을 추가.
