문서 타입: DB 스키마
버전: v1.1
작성일: 2026-02-07
작성자: GitHub Copilot
대상: BE/DB/운영
상태: SoT

## 1. 목적 (Purpose)
V2 복권 설정/프라이즈/로그 테이블 스키마를 정의한다.

## 2. 범위 (Scope)
- 복권 설정(v2_lottery_config)
- 복권 프라이즈(v2_lottery_prize)
- 복권 로그(v2_lottery_log)

## 3. 테이블 정의 (Schema)
### 3.1 v2_lottery_config
| 컬럼 | 타입 | 제약 | 설명 |
| :--- | :--- | :--- | :--- |
| id | INT | PK | 설정 ID |
| name | VARCHAR(100) | NOT NULL | 설정명 |
| ticket_type | VARCHAR(50) | NOT NULL | 티켓 타입(문서 Enum) |
| is_active | BOOL | NOT NULL | 활성 여부 |
| max_daily_tickets | INT | NOT NULL | 일일 최대 티켓 수(0=무제한) |
| created_at | DATETIME | NOT NULL | 생성 시각 |
| updated_at | DATETIME | NOT NULL | 수정 시각 |

### 3.2 v2_lottery_prize
| 컬럼 | 타입 | 제약 | 설명 |
| :--- | :--- | :--- | :--- |
| id | INT | PK | 프라이즈 ID |
| config_id | INT | FK(v2_lottery_config.id) | 설정 ID |
| label | VARCHAR(100) | NOT NULL | 등수명/라벨 |
| reward_type | VARCHAR(50) | NOT NULL | 보상 타입 |
| reward_amount | INT | NOT NULL | 보상 수량 |
| weight | INT | NOT NULL | 가중치 |
| stock | INT | NULL | 재고(없으면 무제한) |
| is_active | BOOL | NOT NULL | 활성 여부 |
| created_at | DATETIME | NOT NULL | 생성 시각 |
| updated_at | DATETIME | NOT NULL | 수정 시각 |

### 3.3 v2_lottery_log
| 컬럼 | 타입 | 제약 | 설명 |
| :--- | :--- | :--- | :--- |
| id | INT | PK | 로그 ID |
| user_id | INT | NOT NULL | 유저 ID |
| config_id | INT | FK(v2_lottery_config.id) | 설정 ID |
| prize_id | INT | FK(v2_lottery_prize.id) | 프라이즈 ID |
| reward_type | VARCHAR(50) | NOT NULL | 보상 타입 |
| reward_amount | INT | NOT NULL | 보상 수량 |
| created_at | DATETIME | NOT NULL | 생성 시각 |

## 4. 인덱스/제약
- uq_v2_lottery_prize_label(config_id, label)
- ck_v2_lottery_prize_weight_non_negative(weight >= 0)
- ck_v2_lottery_prize_stock_non_negative(stock >= 0)
- ix_v2_lottery_log_user_created_at(user_id, created_at)

## 5. 근거 (Source)
- V2 게임 엔진 SoT: docs/SOT/00_game/아카이브/v2_game_engine_sot_ko.md
- V2 어드민 게임 설정 스키마: docs/SOT/00_game/아카이브/v2_admin_game_config_schema_ko.md

## 6. 변경 이력
- v1.0 (2026-01-19, GitHub Copilot): 최초 작성
- v1.1 (2026-02-07, GitHub Copilot): SoT 경로 갱신
