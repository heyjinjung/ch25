# 시즌패스 테이블 설계

- 문서 타입: DB
- 버전: v1.0
- 작성일: 2025-12-08
- 작성자: 시스템 설계팀
- 대상 독자: 백엔드 개발자, DBA, 데이터 분석가

## 1. 목적 (Purpose)
- 시즌패스(도장, XP, 레벨, 보상) 관련 테이블의 컬럼, 제약, 관계를 상세히 정의하여 SQLAlchemy/Alembic 구현을 일관되게 한다.

## 2. 범위 (Scope)
- season_pass_config, season_pass_level, season_pass_progress, season_pass_stamp_log, season_pass_reward_log 테이블을 포함한다.
- 보상 지급/레벨업 로직은 모듈 문서를 참고한다.

## 3. 용어 정의 (Definitions)
- Season: 7일 단위 시즌 기간 (예: XMAS_1WEEK_2025).
- XP: 레벨 상승에 사용하는 경험치.
- Stamp: 일 1회 적립 가능한 시즌패스 도장.

## 4. season_pass_config
### 4-1. 용도
- 시즌 기간, 이름, 최대 레벨, 기본 XP 등 시즌 전체 메타 정보를 저장한다.

### 4-2. 스키마
| 컬럼명            | 타입          | PK/FK | Not Null | 설명                              |
|-------------------|---------------|-------|----------|-----------------------------------|
| id                | INT           | PK    | Y        | 기본키                            |
| season_name       | VARCHAR(100)  |       | Y        | 시즌 이름 (예: XMAS_1WEEK_2025)  |
| start_date        | DATE          |       | Y        | 시즌 시작일                       |
| end_date          | DATE          |       | Y        | 시즌 종료일                       |
| max_level         | INT           |       | Y        | 시즌 최대 레벨                    |
| base_xp_per_stamp | INT           |       | Y        | 도장당 기본 XP                    |
| created_at        | DATETIME      |       | Y        | 생성 시각                         |
| updated_at        | DATETIME      |       | Y        | 수정 시각                         |

### 4-3. 인덱스/제약사항
- PK: (id)
- UNIQUE: season_name
- 제약: start_date <= end_date

### 4-4. 관련 테이블
- `season_pass_level` (1:N)
- `season_pass_progress` (1:N)
- `season_pass_stamp_log` (1:N)
- `season_pass_reward_log` (1:N)

## 5. season_pass_level
### 5-1. 용도
- 레벨별 필요 XP 및 보상 정책을 정의한다.

### 5-2. 스키마
| 컬럼명        | 타입         | PK/FK | Not Null | 설명                      |
|---------------|--------------|-------|----------|---------------------------|
| id            | INT          | PK    | Y        | 기본키                    |
| season_id     | INT          | FK    | Y        | 시즌 참조                 |
| level         | INT          |       | Y        | 레벨 번호                 |
| required_xp   | INT          |       | Y        | 필요 XP                   |
| reward_type   | VARCHAR(50)  |       | Y        | POINT/COUPON/ETC          |
| reward_amount | INT          |       | Y        | 보상량                    |
| auto_claim    | TINYINT      |       | Y        | 1=레벨업 시 자동 지급     |
| created_at    | DATETIME     |       | Y        | 생성 시각                 |
| updated_at    | DATETIME     |       | Y        | 수정 시각                 |

### 5-3. 인덱스/제약사항
- UNIQUE(season_id, level)
- level 오름차순 관리 권장

### 5-4. 관련 테이블
- `season_pass_config` (N:1)
- `season_pass_reward_log` (1:N)

## 6. season_pass_progress
### 6-1. 용도
- 유저별 시즌 진행 상태(레벨, XP, 스탬프, 마지막 도장 일자)를 보관한다.

### 6-2. 스키마
| 컬럼명          | 타입     | PK/FK | Not Null | 설명              |
|-----------------|----------|-------|----------|-------------------|
| id              | INT      | PK    | Y        | 기본키            |
| user_id         | INT      | FK    | Y        | 유저 참조         |
| season_id       | INT      | FK    | Y        | 시즌 참조         |
| current_level   | INT      |       | Y        | 현재 레벨         |
| current_xp      | INT      |       | Y        | 현재 XP           |
| total_stamps    | INT      |       | Y        | 누적 스탬프        |
| last_stamp_date | DATE     |       | N        | 마지막 도장 일자   |
| created_at      | DATETIME |       | Y        | 생성 시각         |
| updated_at      | DATETIME |       | Y        | 수정 시각         |

### 6-3. 인덱스/제약사항
- UNIQUE(user_id, season_id)

### 6-4. 관련 테이블
- `user` (N:1)
- `season_pass_config` (N:1)
- `season_pass_stamp_log` (1:N)
- `season_pass_reward_log` (1:N)

## 7. season_pass_stamp_log
### 7-1. 용도
- 일 단위 도장 적립 이력과 적립 XP를 기록한다.

### 7-2. 스키마
| 컬럼명            | 타입     | PK/FK | Not Null | 설명                           |
|-------------------|----------|-------|----------|--------------------------------|
| id                | INT      | PK    | Y        | 기본키                         |
| user_id           | INT      | FK    | Y        | 유저 참조                      |
| season_id         | INT      | FK    | Y        | 시즌 참조                      |
| date              | DATE     |       | Y        | 도장 일자                      |
| stamp_count       | INT      |       | Y        | 횟수(기본 1)                   |
| source_feature_type | VARCHAR(30) |   | Y        | 도장 발생 원인(ROULETTE 등)    |
| xp_earned         | INT      |       | Y        | 이번 도장으로 적립된 XP        |
| created_at        | DATETIME |       | Y        | 생성 시각                      |

### 7-3. 인덱스/제약사항
- UNIQUE(user_id, season_id, date)  — 일 1회 도장 정책을 enforcing

### 7-4. 관련 테이블
- `user` (N:1)
- `season_pass_config` (N:1)

## 8. season_pass_reward_log
### 8-1. 용도
- 레벨 달성 시 지급/수령된 보상 내역을 저장한다.

### 8-2. 스키마
| 컬럼명        | 타입     | PK/FK | Not Null | 설명                   |
|---------------|----------|-------|----------|------------------------|
| id            | INT      | PK    | Y        | 기본키                 |
| user_id       | INT      | FK    | Y        | 유저 참조              |
| season_id     | INT      | FK    | Y        | 시즌 참조              |
| level         | INT      |       | Y        | 보상 레벨              |
| reward_type   | VARCHAR(50) |     | Y        | 보상 유형              |
| reward_amount | INT      |       | Y        | 보상량                 |
| claimed_at    | DATETIME |       | Y        | 수령 시각              |
| created_at    | DATETIME |       | Y        | 생성 시각              |

### 8-3. 인덱스/제약사항
- UNIQUE(user_id, season_id, level) — 레벨별 중복 수령 방지

### 8-4. 관련 테이블
- `user` (N:1)
- `season_pass_config` (N:1)

## 변경 이력
- v1.0 (2025-12-08, 시스템 설계팀)
  - 최초 작성: 시즌패스 5개 테이블 스키마/제약/관계 정의
