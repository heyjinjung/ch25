문서 타입: DB 스키마
버전: v1.0
작성일: 2026-01-19
작성자: GitHub Copilot
대상: BE/DB/운영
상태: SoT

## 1. 목적 (Purpose)
V2 주사위 설정/로그 테이블 스키마를 정의한다.

## 2. 범위 (Scope)
- 주사위 설정(v2_dice_config)
- 주사위 로그(v2_dice_log)

## 3. 테이블 정의 (Schema)
### 3.1 v2_dice_config
| 컬럼 | 타입 | 제약 | 설명 |
| :--- | :--- | :--- | :--- |
| id | INT | PK | 설정 ID |
| name | VARCHAR(100) | NOT NULL | 설정명 |
| ticket_type | VARCHAR(50) | NOT NULL | 티켓 타입(문서 Enum) |
| is_active | BOOL | NOT NULL | 활성 여부 |
| max_daily_plays | INT | NOT NULL | 일일 최대 플레이 수(0=무제한) |
| win_reward_type | VARCHAR(50) | NOT NULL | 승리 보상 타입 |
| win_reward_amount | INT | NOT NULL | 승리 보상 수량 |
| draw_reward_type | VARCHAR(50) | NOT NULL | 무승부 보상 타입 |
| draw_reward_amount | INT | NOT NULL | 무승부 보상 수량 |
| lose_reward_type | VARCHAR(50) | NOT NULL | 패배 보상 타입 |
| lose_reward_amount | INT | NOT NULL | 패배 보상 수량(음수 허용) |
| created_at | DATETIME | NOT NULL | 생성 시각 |
| updated_at | DATETIME | NOT NULL | 수정 시각 |

### 3.2 v2_dice_log
| 컬럼 | 타입 | 제약 | 설명 |
| :--- | :--- | :--- | :--- |
| id | INT | PK | 로그 ID |
| user_id | INT | NOT NULL | 유저 ID |
| config_id | INT | FK(v2_dice_config.id) | 설정 ID |
| user_dice_1 | INT | NOT NULL | 유저 주사위 1 |
| user_dice_2 | INT | NOT NULL | 유저 주사위 2 |
| user_sum | INT | NOT NULL | 유저 합 |
| dealer_dice_1 | INT | NOT NULL | 딜러 주사위 1 |
| dealer_dice_2 | INT | NOT NULL | 딜러 주사위 2 |
| dealer_sum | INT | NOT NULL | 딜러 합 |
| result | VARCHAR(10) | NOT NULL | 결과(WIN/LOSE/DRAW) |
| reward_type | VARCHAR(50) | NOT NULL | 보상 타입 |
| reward_amount | INT | NOT NULL | 보상 수량(음수 허용) |
| created_at | DATETIME | NOT NULL | 생성 시각 |

## 4. 인덱스/제약
- ix_v2_dice_log_user_created_at(user_id, created_at)

## 5. 근거 (Source)
- V2 게임 엔진 SoT: docs/v2_specs/02_game/v2_game_engine_sot_ko.md
- V2 어드민 게임 설정 스키마: docs/v2_specs/02_game/v2_admin_game_config_schema_ko.md

## 6. 변경 이력
- v1.0 (2026-01-19, GitHub Copilot): 최초 작성
