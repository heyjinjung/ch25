문서 타입: DB Master SoT
버전: v1.2
작성일: 2026-02-07
작성자: GitHub Copilot
대상: BE/DB/운영
상태: SoT

## 1. 목적 (Purpose)
본 문서는 docs/SOT/00_db 하위의 V2 DB 관련 SoT 문서(스키마/운영정책)를 “최상위 마스터 인덱스”로 통합하여,
- 테이블 역할/관계/무결성 규칙을 한 눈에 파악하고
- 운영/개발 시 어떤 문서를 최종 기준으로 삼아야 하는지
를 명확히 한다.

## 2. 범위 (Scope)
본 문서가 통합/참조하는 SoT는 아래 파일들이다.
- Core(User/Vault): [v2_db_user_ko.md](v2_db_user_ko.md)
- Segment: [v2_db_user_segment_ko.md](v2_db_user_segment_ko.md), [v2_db_segment_rule_ko.md](v2_db_segment_rule_ko.md)
- Game(Roulette/Lottery): [v2_db_roulette_ko.md](v2_db_roulette_ko.md), [v2_db_lottery_ko.md](v2_db_lottery_ko.md)
- Economy/Shop: [v2_db_shop_order_ko.md](v2_db_shop_order_ko.md)
- Ticket Policies & Logs: [v2_db_ticket_conversion_policy_ko.md](v2_db_ticket_conversion_policy_ko.md), [v2_db_ticket_zero_log_ko.md](v2_db_ticket_zero_log_ko.md)
- Ops: [v2_db_ops_execution_result_ko.md](v2_db_ops_execution_result_ko.md)
- DB 운영정책: [v2_db_snapshot_regeneration_policy_ko.md](v2_db_snapshot_regeneration_policy_ko.md)

## 3. SoT 우선순위 및 공통 규칙
### 3.1 우선순위
- 스키마/정책 판단의 1차 기준은 docs/SOT/00_db 내 각 도메인 SoT 문서이다.
- 상위 정책/열거형(예: TicketType, 세그먼트 정책 등)은 docs/SOT 내 해당 SoT를 근거로 한다.
- learned_ 최신 규칙/패치 내역과 충돌하는 경우 learned_를 우선한다(최신/핵심 규칙 우선 원칙).

### 3.2 공통 컬럼/타임존 관례
- 본 문서 범위의 테이블들은 created_at/updated_at/granted_at 같은 시간 컬럼을 사용한다.
- 개별 SoT에서 “KST 기준”을 명시한 경우(예: v2_user), 운영/분석 시 이를 기준으로 해석한다.

## 4. 도메인별 스키마 맵 (Top-level Map)
### 4.1 User & Economy (핵심)
- v2_user: V2 유저 최소 필드 + 금고 SoT(vault_locked_balance)
- v2_shop_order: 상점 구매 로그(비용/보상)

### 4.2 Segment
- v2_user_segment: 유저별 현재 세그먼트 결과
- v2_segment_rule: 세그먼트 판정 규칙(조건 DSL)

### 4.3 Game (Roulette/Lottery)
- Roulette: v2_roulette_config, v2_roulette_segment, v2_roulette_log
- Lottery: v2_lottery_config, v2_lottery_prize, v2_lottery_log

### 4.4 Tickets (정책/로그)
- v2_ticket_conversion_policy: 만능티켓 변환 정책(1:1)
- v2_ticket_zero_log: Ticket Zero(LUCKY SAVE) 지급 로그

### 4.5 Ops
- v2_ops_execution_result: Ops 실행 결과(payload JSON) 저장

## 5. 테이블별 SoT 요약
### 5.1 v2_user (Core User)
- 소스: [v2_db_user_ko.md](v2_db_user_ko.md)
- 핵심:
  - cc_id UNIQUE (외부 식별자)
  - telegram_id UNIQUE (nullable)
  - vault_locked_balance INT NOT NULL (금고 SoT)
  - nickname/telegram_username은 운영 식별 편의를 위한 INDEX 대상

### 5.2 v2_user_segment (User → Segment)
- 소스: [v2_db_user_segment_ko.md](v2_db_user_segment_ko.md)
- 핵심:
  - PK = user_id (1:1 최신 세그먼트)
  - ix_v2_user_segment_segment (segment)
  - 기본값: COMMON

### 5.3 v2_segment_rule (Segment Rule DSL)
- 소스: [v2_db_segment_rule_ko.md](v2_db_segment_rule_ko.md)
- 핵심:
  - name UNIQUE
  - priority는 낮을수록 우선
  - condition_json은 규칙 DSL(JSON)

### 5.4 v2_shop_order (Shop Order Log)
- 소스: [v2_db_shop_order_ko.md](v2_db_shop_order_ko.md)
- 핵심:
  - cost_type 기본: VAULT
  - 비용 차감의 SoT는 v2_user.vault_locked_balance(= 금고 SoT)와 연결되어 해석되어야 한다.

### 5.5 Roulette (Config/Segment/Log)
- 소스: [v2_db_roulette_ko.md](v2_db_roulette_ko.md)
- 테이블:
  - v2_roulette_config: ticket_type 기반으로 구분(grade 컬럼 deprecated)
  - v2_roulette_segment: slot_index 0~7 (8 세그먼트)
  - v2_roulette_log: 유저별 게임 로그
- 핵심 제약/인덱스:
  - uq_v2_roulette_segment_slot(config_id, slot_index)
  - ck_v2_roulette_segment_slot_range(slot_index 0~7)
  - ck_v2_roulette_segment_weight_non_negative(weight >= 0)
  - ix_v2_roulette_log_user_created_at(user_id, created_at)

### 5.6 Lottery (Config/Prize/Log)
- 소스: [v2_db_lottery_ko.md](v2_db_lottery_ko.md)
- 테이블:
  - v2_lottery_config: ticket_type, is_active, max_daily_tickets
  - v2_lottery_prize: 가중치/재고 기반 프라이즈
  - v2_lottery_log: 결과 로그
- 핵심 제약/인덱스:
  - uq_v2_lottery_prize_label(config_id, label)
  - ck_v2_lottery_prize_weight_non_negative(weight >= 0)
  - ck_v2_lottery_prize_stock_non_negative(stock >= 0)
  - ix_v2_lottery_log_user_created_at(user_id, created_at)

### 5.7 v2_ticket_conversion_policy (Ticket Conversion Policy)
- 소스: [v2_db_ticket_conversion_policy_ko.md](v2_db_ticket_conversion_policy_ko.md)
- 핵심:
  - target_ticket_type + 1:1 비율(ratio_numerator=1, ratio_denominator=1)
  - 어드민 선택 즉시 반영
  - 스키마(요약):
    - id (PK)
    - target_ticket_type VARCHAR(50) NOT NULL (TicketType SoT)
    - ratio_numerator INT NOT NULL (기본 1)
    - ratio_denominator INT NOT NULL (기본 1)
    - is_active TINYINT(1) NOT NULL
    - created_at/updated_at DATETIME NOT NULL

### 5.8 v2_ticket_zero_log (Ticket Zero Log)
- 소스: [v2_db_ticket_zero_log_ko.md](v2_db_ticket_zero_log_ko.md)
- 핵심:
  - 지급 사유 reason(기본 BAILOUT_GRANT)
  - 쿨다운(24시간) 검증 참고 로그
  - 스키마(요약):
    - id (PK)
    - user_id INT NOT NULL
    - ticket_type VARCHAR(50) NOT NULL
    - ticket_amount INT NOT NULL (기본 1)
    - reason VARCHAR(80) NOT NULL (기본 BAILOUT_GRANT)
    - granted_at DATETIME NOT NULL
    - created_at DATETIME NOT NULL

### 5.9 v2_ops_execution_result (Ops Execution Result)
- 소스: [v2_db_ops_execution_result_ko.md](v2_db_ops_execution_result_ko.md)
- 핵심:
  - payload_json(JSON)로 실행 결과를 저장
  - task_id는 ops_plan_task의 식별자

## 6. 무결성/성능 체크리스트 (DB)
- [ ] UNIQUE 제약(uq_*)이 의미하는 비즈니스 키가 코드/어드민 UI에서 중복 생성되지 않도록 방지됨
- [ ] CHECK 제약(ck_*)이 런타임 입력 검증과 일치함(예: weight/stock 음수 금지, slot_index 범위)
- [ ] 로그 테이블은 조회 패턴(user_id + created_at)에 맞춰 인덱스가 존재함

## 7. 운영 정책: 스냅샷 재생성
- 소스: [v2_db_snapshot_regeneration_policy_ko.md](v2_db_snapshot_regeneration_policy_ko.md)
- 핵심:
  - 대상 DB: v2
  - 기준 리비전: V2 헤드 리비전 고정(예: 20260119_1400)
  - 배포 전, SoT 변경 누적 시에만 clean snapshot 재생성
  - 스냅샷 적용 후 alembic current가 기준 리비전과 일치해야 함
  - 절차(요약):
    1) v2 DB 초기화 또는 clean 스키마 확보
    2) 기준 리비전까지 마이그레이션 적용
    3) 스냅샷 파일 생성 및 04_db 문서 갱신
    4) 스냅샷 적용 테스트 및 헤드 일치 확인
  - 금지/주의:
    - V1 DB에 스냅샷 적용 금지
    - 스냅샷 적용 후 `alembic current`가 기준 리비전과 일치해야 함

## 8. 정합성 메모 (SoT 간 불일치 가능 지점)
- 현재 기준 불일치 없음 (세그먼트 키 NEW/COMMON/VIP/WHALE/AT_RISK/WINNER로 통일 완료)

## 9. 변경 이력
- v1.0 (2026-02-06, GitHub Copilot): 첨부된 docs/SOT/00_db 스키마/정책 SoT를 최상위 인덱스로 통합(v2_db_sot2.md 생성)
- v1.1 (2026-02-06, GitHub Copilot): 티켓 변환 정책/티켓 제로 로그/스냅샷 재생성 정책 섹션을 첨부 SoT 기준으로 구체화하고, docs/SOT/00_db 경로 표기를 정정
- v1.2 (2026-02-07, GitHub Copilot): SoT 경로 원칙 갱신 및 세그먼트 키 정합성 메모 최신화
