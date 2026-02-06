# HQ Margin 데이터 연동 상세 설계 - Phase 4: Golden Project 연동 및 정합성

**문서 타입**: Detailed Design / Learned SoT
**도메인**: Golden / Retention / Automation
**작성일**: 2026-01-31
**상태**: 설계 완료

---

## 1. 목적 (Objective)

본사 마진 데이터를 Golden V2 프로젝트의 핵심 로직(골든아워, 개입 서비스)과 완벽히 결합하여 데이터 기반의 '지능적 리텐션' 시스템을 완성함. 또한 V2 Native SOT 원칙을 강화하여 데이터 정합성 에러를 근절함.

---

## 2. 골든 프로젝트 연동 상세 (Golden Integration)

### 2.1 유저 가입 시 자동 혜택 부여 (`AuthService` 연동)
- **매칭 트리거**: `AuthService.register_user` 성공 직후 실행.
- **로직**: `hq_prospective_user`에서 해당 닉네임 조회 -> 존재 시 `V2UserSegment` 부여 및 `is_joined=True`.
- **효과**: 고가치 유저가 가입하자마자 "VIP 환영 골든아워" 등 선제적 개입(Intervention) 실행 가능.

### 2.2 본사 패턴 기반 골든아워 스케줄러 추천
- **연동 데이터**: 본사 SQLite(`charging_data.db`)의 실시간 충전 트렌드.
- **추천 알고리즘**:
  - 최근 30일간의 시간대별 충전량 합산 분석.
  - 충전 피크 타임(Peak Time) 앞뒤 1시간을 골든아워 최적 구간으로 제안.
  - 관리자 대시보드에서 "추천 적용" 버튼 하나로 골든아워 설정 자동화.

---

## 3. 핵심 도메인 보상 및 로그 매핑 (Retention Matrix)

유저의 활동(게임/보상/인벤토리)에 대한 전수 조사가 가능한 SOT 경로입니다.

| 도메인 | 확인 경로 (Admin UI) | 핵심 모델 (DB 원장) | 비고 |
| :--- | :--- | :--- | :--- |
| **레벨/XP 보너스** | 유저관리 > 자산관리 > XP로그 | `UserXPEventLog` | 본사 충전 실적 소급분(10만:20XP) 확인 |
| **인벤토리 변경** | 유저관리 > 인벤토리관리 > 내역로그 | `UserInventoryLedger` | 아이템 차감/지급 사유(`reason`) 추적 |
| **게임 참여 보상** | 게임관리 > 각 게임별 로그 | `V2DiceLog`, `V2RouletteLog` | 어떤 게임에서 어떤 보상을 얻었는지 확인 |
| **티켓 잔액 변동** | 유저관리 > 자산관리 > 티켓로그 | `UserGameWalletLedger` | 게임 참여로 인한 소모 및 보상 연동 |

---

## 3. 기술 설계 및 구현 가이드 (Technical Fail-Safe Guide)

### 3.1 `AuthService` 가입 가로채기 (Interception)
- **대상 파일**: [auth_service.py](file:///c:/Users/JAVIS/ch/ch25/app/v2/services/auth_service.py)
- **추가 로직**: `V2User` 생성 직후 `SegmentService.match_prospect_on_joined(user_id)` 호출.
- **Fail-Safe**: 매칭 로직은 `Try-Except` 블록으로 감싸서, 잠재 데이터 매칭에 실패하더라도 유저의 **가입 자체가 실패하면 안 됨.**

### 3.2 본사 패턴 분석 (SQLite Analyzer)
- **대상 파일**: [golden_scheduler_service.py](file:///c:/Users/JAVIS/ch/ch25/app/v2/services/golden_scheduler_service.py)
- **연동 방식**: `sqlite3.connect(path, uri=True)` (Read-Only 모드 필수).
- **분석 쿼리**:
  ```sql
  SELECT hour, total_amount, row_number() OVER (ORDER BY total_amount DESC) as rank
  FROM (SELECT strftime('%H', date) as hour, sum(amount) as total_amount FROM charges GROUP BY hour)
  ```

### 3.3 트랜잭션 정합성
- **SOT 보장**: `v2_user_segment` 업데이트 시 `with db.begin_nested()`를 사용하여 부분 실패 시 `UserSegment` 생성만 롤백되도록 처리.

---

## 4. 자가 진단 체크리스트 (Self-Correction Checklist)

1.  **[Transaction]** 잠재 고객 매칭 중 에러가 나면 유저 가입이 안 되는가? → **No.** 반드시 독립 트랜잭션 또는 방어 로직 적용.
2.  **[SOT]** 골든아워 설정 시 `v1_config`를 건드리고 있는가? → **No.** 반드시 `V2GameConfig` 모델 또는 `Vault2Service` 설정을 변경해야 함.
3.  **[Security]** SQLite 연동 시 쓰기(Write) 권한을 요구하는가? → **No.** 쿼리 전용 Read-Only 연결 유지.

---

## 5. 단계별 검증 절차 (Verification)

1.  **New Registration Matching Test**: `hq_prospective_user`에 `Tester1`을 등록한 후, 실제 `Tester1` 닉네임으로 가입 시 `v2_user_segment`가 즉시 생성되는지 확인.
2.  **SQLite Error Resilience Test**: `HQ_DB_PATH`가 잘못되었을 때 골든아워 설정 페이지가 먹통이 되지 않고 에러 메시지만 출력되는지 확인.
3.  **Golden Hour Auto-Sync Test**: 추천 스케줄 적용 시 `Vault2Service.DEFAULT_CONFIG` 또는 DB 설정값이 오차 없이 반영되는지 확인.
