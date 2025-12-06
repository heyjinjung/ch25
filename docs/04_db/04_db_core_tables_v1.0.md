# XMAS 1Week DB 설계 – 공통/시즌패스/게임 테이블

- 문서 타입: DB
- 버전: v1.1
- 작성일: 2025-12-08
- 작성자: 시스템 설계팀
- 대상 독자: 백엔드 개발자, DBA, 데이터 분석가

## 1. 목적 (Purpose)
- 이벤트 시스템의 핵심 테이블 구조와 제약사항을 명확히 정의하여 구현과 마이그레이션을 일관되게 한다.

## 2. 범위 (Scope)
- 공통 테이블(user, feature_schedule, feature_config, user_event_log)
- 시즌패스 테이블(season_pass_config, season_pass_level, season_pass_progress, season_pass_stamp_log, season_pass_reward_log)
- 게임별 테이블 개요(roulette, dice, lottery, ranking)

## 3. 용어 정의 (Definitions)
- Season: 시즌패스 기간 단위 (예: XMAS_1WEEK_2025)
- Feature: ROULETTE / DICE / SEASON_PASS / LOTTERY / RANKING
- Stamp: 시즌패스 도장 1회 기록

## 4. 공통 테이블
### 4-1. user
| 컬럼명 | 타입 | PK/FK | Not Null | 설명 |
|--------|------|-------|----------|------|
| id | INT | PK | Y | 기본키 |
| external_id | VARCHAR(100) |  | Y | 외부 시스템 ID(예: 텔레그램) |
| status | VARCHAR(20) |  | Y | ACTIVE/BLOCKED 등 상태 |
| created_at | DATETIME |  | Y | 생성 시각 |
| updated_at | DATETIME |  | Y | 수정 시각 |

- 인덱스/제약: PK(id), external_id UNIQUE 고려
- 연관: user_event_log, season_pass_progress, 각 게임 로그와 1:N

### 4-2. feature_schedule
| 컬럼명 | 타입 | PK/FK | Not Null | 설명 |
|--------|------|-------|----------|------|
| id | INT | PK | Y | 기본키 |
| date | DATE |  | Y | 해당 일자 |
| feature_type | VARCHAR(30) |  | Y | ROULETTE/DICE/SEASON_PASS/LOTTERY/RANKING |
| is_active | TINYINT |  | Y | 1=활성 |
| created_at | DATETIME |  | Y | 생성 시각 |
| updated_at | DATETIME |  | Y | 수정 시각 |

- 인덱스/제약: UNIQUE(date), is_active 기본 1, feature_type ENUM 권장
- 연관: 없음(조회용), 운영 시 7일치 미리 insert

### 4-3. feature_config
| 컬럼명 | 타입 | PK/FK | Not Null | 설명 |
|--------|------|-------|----------|------|
| id | INT | PK | Y | 기본키 |
| feature_type | VARCHAR(30) |  | Y | Feature 타입 |
| title | VARCHAR(100) |  | Y | 페이지 제목 |
| page_path | VARCHAR(100) |  | Y | 프론트 경로 |
| is_enabled | TINYINT |  | Y | 기능 전체 ON/OFF |
| config_json | JSON |  | N | 공통 설정(daily_limit 등) |
| created_at | DATETIME |  | Y | 생성 시각 |
| updated_at | DATETIME |  | Y | 수정 시각 |

- 인덱스/제약: feature_type UNIQUE, is_enabled default 1
- 연관: 서비스 설정 조회에 사용

### 4-4. user_event_log
| 컬럼명 | 타입 | PK/FK | Not Null | 설명 |
|--------|------|-------|----------|------|
| id | INT | PK | Y | 기본키 |
| user_id | INT | FK(user.id) | Y | 유저 ID |
| feature_type | VARCHAR(30) |  | Y | 이벤트 타입 |
| event_name | VARCHAR(50) |  | Y | ENTER_PAGE/PLAY/RESULT/SEASON_PASS_* |
| meta_json | JSON |  | N | 세부 정보 |
| created_at | DATETIME |  | Y | 생성 시각 |

- 인덱스/제약: IDX user_id+created_at, event_name
- 연관: user

## 5. 시즌패스 테이블
### 5-1. season_pass_config
| 컬럼명 | 타입 | PK/FK | Not Null | 설명 |
|--------|------|-------|----------|------|
| id | INT | PK | Y | 기본키 |
| season_name | VARCHAR(100) |  | Y | 시즌 이름 (예: XMAS_1WEEK_2025) |
| start_date | DATE |  | Y | 시즌 시작일 |
| end_date | DATE |  | Y | 시즌 종료일 |
| max_level | INT |  | Y | 시즌 최대 레벨 |
| base_xp_per_stamp | INT |  | Y | 도장당 기본 XP |
| created_at | DATETIME |  | Y | 생성 시각 |
| updated_at | DATETIME |  | Y | 수정 시각 |

- 제약: start_date <= end_date, season_name UNIQUE
- 연관: season_pass_level, season_pass_progress, season_pass_stamp_log, season_pass_reward_log

### 5-2. season_pass_level
| 컬럼명 | 타입 | PK/FK | Not Null | 설명 |
|--------|------|-------|----------|------|
| id | INT | PK | Y | 기본키 |
| season_id | INT | FK(season_pass_config.id) | Y | 시즌 참조 |
| level | INT |  | Y | 레벨 번호 |
| required_xp | INT |  | Y | 필요 XP |
| reward_type | VARCHAR(50) |  | Y | POINT/COUPON/ETC |
| reward_amount | INT |  | Y | 보상량 |
| auto_claim | TINYINT |  | Y | 1=자동 지급 |
| created_at | DATETIME |  | Y | 생성 시각 |
| updated_at | DATETIME |  | Y | 수정 시각 |

- 제약: UNIQUE(season_id, level), level 오름차순 보장
- 연관: season_pass_config

### 5-3. season_pass_progress
| 컬럼명 | 타입 | PK/FK | Not Null | 설명 |
|--------|------|-------|----------|------|
| id | INT | PK | Y | 기본키 |
| user_id | INT | FK(user.id) | Y | 유저 참조 |
| season_id | INT | FK(season_pass_config.id) | Y | 시즌 참조 |
| current_level | INT |  | Y | 현재 레벨 |
| current_xp | INT |  | Y | 현재 XP |
| total_stamps | INT |  | Y | 누적 스탬프 |
| last_stamp_date | DATE |  | N | 마지막 도장 일자 |
| created_at | DATETIME |  | Y | 생성 시각 |
| updated_at | DATETIME |  | Y | 수정 시각 |

- 제약: UNIQUE(user_id, season_id)
- 연관: user, season_pass_config, season_pass_stamp_log, season_pass_reward_log

### 5-4. season_pass_stamp_log
| 컬럼명 | 타입 | PK/FK | Not Null | 설명 |
|--------|------|-------|----------|------|
| id | INT | PK | Y | 기본키 |
| user_id | INT | FK(user.id) | Y | 유저 참조 |
| season_id | INT | FK(season_pass_config.id) | Y | 시즌 참조 |
| date | DATE |  | Y | 도장 일자 |
| stamp_count | INT |  | Y | 횟수(기본 1) |
| source_feature_type | VARCHAR(30) |  | Y | 도장 발생 원인 |
| xp_earned | INT |  | Y | 이번 도장으로 적립된 XP |
| created_at | DATETIME |  | Y | 생성 시각 |

- 제약: UNIQUE(user_id, season_id, date)
- 연관: user, season_pass_config

### 5-5. season_pass_reward_log
| 컬럼명 | 타입 | PK/FK | Not Null | 설명 |
|--------|------|-------|----------|------|
| id | INT | PK | Y | 기본키 |
| user_id | INT | FK(user.id) | Y | 유저 참조 |
| season_id | INT | FK(season_pass_config.id) | Y | 시즌 참조 |
| level | INT |  | Y | 보상 레벨 |
| reward_type | VARCHAR(50) |  | Y | 보상 유형 |
| reward_amount | INT |  | Y | 보상량 |
| claimed_at | DATETIME |  | Y | 수령 시각 |
| created_at | DATETIME |  | Y | 생성 시각 |

- 제약: UNIQUE(user_id, season_id, level)
- 연관: user, season_pass_config

## 6. 게임별 테이블 개요
- 룰렛: roulette_config(슬롯/가중치), roulette_segment(6칸 고정), roulette_log(스핀 결과)
- 주사위: dice_config(보상 정책), dice_log(2개 주사위 합계 비교 결과 기록)
- 복권: lottery_config(즉시당첨 설정), lottery_prize(상품/확률/재고), lottery_log(긁기 결과)
- 랭킹: ranking_daily(관리자 입력 랭킹 스냅샷)

### 6-1. roulette_config
| 컬럼명 | 타입 | PK/FK | Not Null | 설명 |
|--------|------|-------|----------|------|
| id | INT | PK | Y | 기본키 |
| name | VARCHAR(100) |  | Y | 룰렛 이름(예: XMAS_BASIC_ROULETTE) |
| is_active | TINYINT |  | Y | 1=활성 |
| max_daily_spins | INT |  | Y | 유저 당 하루 스핀 한도 |
| created_at | DATETIME |  | Y | 생성 시각 |
| updated_at | DATETIME |  | Y | 수정 시각 |

- 제약: PK(id), is_active default 1
- 연관: roulette_segment 1:N, roulette_log 1:N

### 6-2. roulette_segment (6칸 고정)
| 컬럼명 | 타입 | PK/FK | Not Null | 설명 |
|--------|------|-------|----------|------|
| id | INT | PK | Y | 기본키 |
| config_id | INT | FK(roulette_config.id) | Y | 룰렛 설정 참조 |
| slot_index | INT |  | Y | 0~5 인덱스, 항상 6개가 존재해야 함 |
| label | VARCHAR(50) |  | Y | 칸 이름(예: 꽝, 포인트 1만 등) |
| reward_type | VARCHAR(50) |  | Y | POINT/COUPON/TOKEN/NONE |
| reward_amount | INT |  | Y | 보상 수치(없으면 0) |
| weight | INT |  | Y | 확률 가중치(Σweight>0 필수) |
| is_jackpot | TINYINT |  | N | 선택적 대박 칸 표시 |
| created_at | DATETIME |  | Y | 생성 시각 |
| updated_at | DATETIME |  | Y | 수정 시각 |

- 제약: UNIQUE(config_id, slot_index)로 0~5 관리, Σweight>0 미만이면 비정상 설정으로 간주
- 연관: roulette_config(1:N), roulette_log(1:N)
- 운영 규칙: config_id 당 slot_index 0~5 총 6개가 모두 있어야 정상이며, 관리자 UI는 label/reward_type/reward_amount/weight만 수정

### 6-3. roulette_log
| 컬럼명 | 타입 | PK/FK | Not Null | 설명 |
|--------|------|-------|----------|------|
| id | INT | PK | Y | 기본키 |
| user_id | INT | FK(user.id) | Y | 유저 ID |
| config_id | INT | FK(roulette_config.id) | Y | 사용된 설정 |
| segment_id | INT | FK(roulette_segment.id) | Y | 당첨된 세그먼트 |
| reward_type | VARCHAR(50) |  | Y | 지급된 보상 타입 |
| reward_amount | INT |  | Y | 지급된 보상 수치 |
| created_at | DATETIME |  | Y | 생성 시각 |

- 인덱스: INDEX(user_id, created_at)로 일일 스핀 횟수 계산
- 연관: user, roulette_config, roulette_segment

### 6-4. dice_config (2개 주사위 합계 대결)
| 컬럼명 | 타입 | PK/FK | Not Null | 설명 |
|--------|------|-------|----------|------|
| id | INT | PK | Y | 기본키 |
| name | VARCHAR(100) |  | Y | 설정 이름 |
| is_active | TINYINT |  | Y | 1=활성 |
| max_daily_plays | INT |  | Y | 유저 일일 플레이 한도 |
| win_reward_type | VARCHAR(50) |  | Y | 승리 보상 타입 |
| win_reward_amount | INT |  | Y | 승리 보상 수치 |
| draw_reward_type | VARCHAR(50) |  | Y | 무승부 보상 타입 |
| draw_reward_amount | INT |  | Y | 무승부 보상 수치 |
| lose_reward_type | VARCHAR(50) |  | Y | 패배 보상 타입(대부분 0/NONE) |
| lose_reward_amount | INT |  | Y | 패배 보상 수치 |
| created_at | DATETIME |  | Y | 생성 시각 |
| updated_at | DATETIME |  | Y | 수정 시각 |

- 제약: PK(id), is_active default 1
- 연관: dice_log 1:N

### 6-5. dice_log (유저/딜러 2주사위 합계 기록)
| 컬럼명 | 타입 | PK/FK | Not Null | 설명 |
|--------|------|-------|----------|------|
| id | INT | PK | Y | 기본키 |
| user_id | INT | FK(user.id) | Y | 유저 ID |
| config_id | INT | FK(dice_config.id) | Y | 사용된 설정 |
| user_dice_1 | INT |  | Y | 유저 주사위 1 (1~6) |
| user_dice_2 | INT |  | Y | 유저 주사위 2 (1~6) |
| user_sum | INT |  | Y | 유저 눈 합계 |
| dealer_dice_1 | INT |  | Y | 딜러 주사위 1 (1~6) |
| dealer_dice_2 | INT |  | Y | 딜러 주사위 2 (1~6) |
| dealer_sum | INT |  | Y | 딜러 눈 합계 |
| result | VARCHAR(10) |  | Y | WIN/LOSE/DRAW |
| reward_type | VARCHAR(50) |  | Y | 지급된 보상 타입 |
| reward_amount | INT |  | Y | 지급된 보상 수치 |
| created_at | DATETIME |  | Y | 생성 시각 |

- 인덱스: INDEX(user_id, created_at)로 일일 플레이 횟수 계산
- 연관: user, dice_config

### 6-6. lottery_config
| 컬럼명 | 타입 | PK/FK | Not Null | 설명 |
|--------|------|-------|----------|------|
| id | INT | PK | Y | 기본키 |
| name | VARCHAR(100) |  | Y | 복권 이름 |
| is_active | TINYINT |  | Y | 1=활성 |
| max_daily_tickets | INT |  | Y | 유저 당 하루 최대 긁기 수 |
| created_at | DATETIME |  | Y | 생성 시각 |
| updated_at | DATETIME |  | Y | 수정 시각 |

- 제약: PK(id), is_active default 1
- 연관: lottery_prize 1:N, lottery_log 1:N

### 6-7. lottery_prize (관리자 편집 가능 상품/확률/재고)
| 컬럼명 | 타입 | PK/FK | Not Null | 설명 |
|--------|------|-------|----------|------|
| id | INT | PK | Y | 기본키 |
| config_id | INT | FK(lottery_config.id) | Y | 복권 설정 참조 |
| label | VARCHAR(100) |  | Y | 상품 이름/표시 텍스트 |
| reward_type | VARCHAR(50) |  | Y | POINT/COUPON/ETC/NONE |
| reward_amount | INT |  | Y | 지급 수치 |
| weight | INT |  | Y | 확률 가중치 (Σweight>0 필요) |
| stock | INT |  | N | 재고(null=무제한, 0이면 추첨 제외) |
| is_active | TINYINT |  | Y | 1=추첨 대상, 0=비활성 |
| created_at | DATETIME |  | Y | 생성 시각 |
| updated_at | DATETIME |  | Y | 수정 시각 |

- 제약: PK(id), is_active default 1, stock=0 또는 is_active=0이면 추첨 대상에서 제외
- 연관: lottery_config(1:N), lottery_log(1:N)

### 6-8. lottery_log
| 컬럼명 | 타입 | PK/FK | Not Null | 설명 |
|--------|------|-------|----------|------|
| id | INT | PK | Y | 기본키 |
| user_id | INT | FK(user.id) | Y | 유저 ID |
| config_id | INT | FK(lottery_config.id) | Y | 사용된 설정 |
| prize_id | INT | FK(lottery_prize.id) | Y | 당첨 상품 |
| reward_type | VARCHAR(50) |  | Y | 지급된 보상 타입 |
| reward_amount | INT |  | Y | 지급된 보상 수치 |
| created_at | DATETIME |  | Y | 생성 시각 |

- 인덱스: INDEX(user_id, created_at)로 일일 티켓 수 계산
- 연관: user, lottery_config, lottery_prize

### 6-9. ranking_daily (관리자 입력 랭킹)
| 컬럼명 | 타입 | PK/FK | Not Null | 설명 |
|--------|------|-------|----------|------|
| id | INT | PK | Y | 기본키 |
| date | DATE |  | Y | 랭킹 날짜 |
| user_id | INT | FK(user.id) | N | 필요 시 유저 참조, 없으면 NULL |
| display_name | VARCHAR(50) |  | Y | 노출용 이름/가명 |
| score | INT |  | Y | 점수(정렬은 rank 기준) |
| rank | INT |  | Y | 사전 계산된 순위(1,2,3...) |
| created_at | DATETIME |  | Y | 생성 시각 |

- 제약: UNIQUE(date, rank)로 중복 순위 방지
- 연관: user (선택적)
- 운영 규칙: 관리자가 직접 입력/업로드하며 API는 조회만 수행

## 변경 이력
- v1.2 (2025-12-09, 시스템 설계팀)
  - 주사위 게임을 유저/딜러 2주사위 합계 비교 구조로 확정하고 dice_log 필드 확장
  - 복권 상품 관리에 is_active 추가, 관리자 편집(라벨/보상/확률/재고) 및 weight>0 검증 규칙 명시
  - 랭킹 데이터를 ranking_daily에 관리자 수기 입력하는 모델로 정의하고 display_name/UNIQUE(date, rank) 추가
- v1.1 (2025-12-08, 시스템 설계팀)
  - 룰렛을 slot_index 0~5의 6칸 고정 구조로 정의하고 roulette_segment/roulette_log 세부 테이블을 명시, Σweight>0 유효성 규칙 추가
- v1.0 (2025-12-08, 시스템 설계팀)
  - 최초 작성: 공통/시즌패스/게임 테이블 구조 및 제약 정리
  - season_pass_stamp_log.xp_earned, reward_log UNIQUE 제약을 명시
