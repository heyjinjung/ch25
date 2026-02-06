문서 타입: SoT (최종)
버전: v1.1
작성일: 2026-02-07
작성자: GitHub Copilot
대상: BE/DB/기획/운영/FE
상태: SoT

## 1. 목적 (Purpose)
V2 레벨 1~20의 **필요 XP/보상 정의/DB 저장 규격/코드 정규화 규칙**을 최종 확정한다.

## 2. 범위 (Scope)
- 레벨 1~20 필요 XP
- 레벨별 보상(아이템 코드/수량/페이로드)
- `v2_level_reward_table` 저장 스키마 해석 및 정규화(서비스 deliver 타입 변환)

## 2.1 비목표(Non-Goals)
- 본 문서는 XP 적립 규칙(입금/미션/게임)을 정의하지 않는다.
- 본 문서는 “레벨 도달 판정(현재 레벨 계산)” 알고리즘을 상세 정의하지 않는다.
- 본 문서는 Vault 재화의 정책을 정의하지 않는다. (다만 일부 번들/보상에서 Vault가 언급될 수 있음)

## 3. 레벨 보상표(SoT) 원본 근거
- 원본 테이블 덤프(2026-01-26): `season_pass_level` 기준
- SoT 문서화(한글 표기): `v2_level_reward_table_sot_ko.md`

## 4. 레벨 1~20 보상표 (최종)
표의 `reward_type`은 DB 저장 시 사용되는 “원천 코드”를 의미하며, 서비스에서 deliver 타입으로 정규화될 수 있다.

| level | required_xp | reward_type (source) | reward_amount | 비고 |
|---:|---:|---|---:|---|
| 1 | 0 | TICKET_ROULETTE | 1 | |
| 2 | 20 | TICKET_DICE | 1 | |
| 3 | 50 | TICKET_ROULETTE | 1 | |
| 4 | 60 | TICKET_LOTTERY | 1 | |
| 5 | 100 | TICKET_DICE | 1 | |
| 6 | 120 | GIFTICON_BAEMIN | 5000 | 배민 5,000원권 |
| 7 | 160 | TICKET_DICE | 2 | |
| 8 | 200 | TICKET_DICE | 3 | |
| 9 | 300 | TICKET_LOTTERY | 1 | |
| 10 | 500 | GOLD_KEY | 1 | |
| 11 | 700 | TICKET_ROULETTE | 3 | |
| 12 | 1000 | GOLD_KEY | 1 | |
| 13 | 1200 | TICKET_DICE | 4 | |
| 14 | 1400 | TICKET_ROULETTE | 4 | |
| 15 | 1800 | TICKET_LOTTERY | 3 | |
| 16 | 2200 | TICKET_LOTTERY | 5 | |
| 17 | 3000 | GOLD_KEY | 3 | |
| 18 | 4000 | DIAMOND_KEY | 1 | |
| 19 | 5000 | DIAMOND_KEY | 2 | |
| 20 | 6000 | DIAMOND_KEY | 5 | |

## 5. DB 저장 규격
### 5.1 테이블
- `v2_level_reward_table`

### 5.2 컬럼 해석
- `level` (PK)
- `required_xp` (NOT NULL)
- `reward_type` (NOT NULL)
  - 본 문서의 `reward_type (source)`를 저장한다.
- `reward_amount` (NOT NULL)
  - 토큰/티켓류: “수량”을 의미한다.
  - 기프티콘류: “표시 금액(원)”을 의미한다.
- `reward_payload` (NULL)
  - 기프티콘/번들 등 확장 메타데이터 저장용

추가 컬럼:
- `created_at`, `updated_at`: 운영 변경 추적용 타임스탬프

### 5.3 `reward_amount` vs `reward_payload` 우선순위
레벨 보상 지급 로직은 `reward_amount`를 1차 값으로 사용한다.

- 원칙: `reward_amount`는 항상 양수로 채운다.
- 예외(방어 로직): `reward_amount`가 0 이하인 경우 `reward_payload.amount` 또는 `reward_payload.tickets`를 fallback으로 사용한다.

따라서 운영/마이그레이션에서 `reward_amount`를 비워두는 형태는 금지한다.

권장 payload 예시:
- `GIFTICON_BAEMIN`:
  - `{ "amount": 5000, "brand": "BAEMIN" }`

## 6. 서비스 정규화(Reward Deliver Type)
레벨 보상 지급 시 서비스는 `reward_type`을 내부 전달 타입으로 정규화할 수 있다.
예:
- `TICKET_ROULETTE` → `ROULETTE_TICKET`
- `TICKET_DICE` → `DICE_TICKET`
- `TICKET_LOTTERY` → `LOTTERY_TICKET`
- `GOLD_KEY` → `GOLD_KEY_TICKET`
- `DIAMOND_KEY` → `DIAMOND_TICKET`

정규화 매핑은 서비스의 type map을 기준으로 한다.

### 6.1 정규화(대표) 근거
- `app/v2/services/level_xp_service.py`의 `MASTER_REWARD_TYPE_MAP`이 1차 정규화 기준이다.
- `app/v2/services/reward_service.py`는 source 타입과 정규화 타입을 **둘 다 수용**하는 ticket map을 가진다.

### 6.2 지급 경로(최종) 매핑표
아래 표는 본 문서의 레벨 1~20 보상표에 등장하는 타입에 대해, 실제 지급 경로를 최종 확정한다.

| DB `reward_type` (source) | 정규화 타입(내부) | `reward_amount` 의미 | 지급 경로(서비스) | 비고 |
|---|---|---:|---|---|
| `TICKET_ROULETTE` | `ROULETTE_TICKET` | 수량 | 티켓 지급(`grant_ticket`, `ROULETTE_TICKET`) | |
| `TICKET_DICE` | `DICE_TICKET` | 수량 | 티켓 지급(`grant_ticket`, `DICE_TICKET`) | |
| `TICKET_LOTTERY` | `LOTTERY_TICKET` | 수량 | 티켓 지급(`grant_ticket`, `LOTTERY_TICKET`) | |
| `GOLD_KEY` | `GOLD_KEY_TICKET` | 수량 | 티켓 지급(`grant_ticket`, `GOLD_KEY_TICKET`) | |
| `DIAMOND_KEY` | `DIAMOND_TICKET` | 수량 | 티켓 지급(`grant_ticket`, `DIAMOND_TICKET`) | |
| `GIFTICON_BAEMIN` | (변경 없음) | 금액(원) | 인벤토리 아이템 지급(`inventory_service.grant_item`) | 아이템 타입: `BAEMIN_GIFTICON_{amount}` |

### 6.3 `GIFTICON_BAEMIN` 금액 제약(중요)
`GIFTICON_BAEMIN`은 서비스에서 허용 금액을 강제한다.

- 허용 금액: 5,000 / 10,000 / 20,000
- 그 외 금액은 설정 오류로 간주(지급 실패)

따라서 보상표 변경 시(운영/마이그레이션), 반드시 위 허용 집합을 준수해야 한다.

## 7. 운영/검증 (QA)
- [ ] DB `v2_level_reward_table` 행이 1~20을 모두 포함하는지
- [ ] required_xp가 본 문서 표와 일치하는지
- [ ] reward 지급 멱등성이 `user_level_reward_log`로 보장되는지

### 7.1 필수 검증 SQL
#### 7.1.1 레벨 1~20 존재성
```sql
SELECT
  MIN(level) AS min_level,
  MAX(level) AS max_level,
  COUNT(*) AS row_count,
  COUNT(DISTINCT level) AS distinct_level_count
FROM v2_level_reward_table;
```

기대:
- `min_level=1`, `max_level=20`, `row_count=20`, `distinct_level_count=20`

#### 7.1.2 required_xp 단조 증가(권장)
```sql
SELECT a.level AS level_a, a.required_xp AS xp_a, b.level AS level_b, b.required_xp AS xp_b
FROM v2_level_reward_table a
JOIN v2_level_reward_table b ON b.level = a.level + 1
WHERE b.required_xp < a.required_xp;
```

기대: 결과 0행

#### 7.1.3 reward_type 허용 집합(본 표 기준)
```sql
SELECT level, reward_type
FROM v2_level_reward_table
WHERE reward_type NOT IN (
  'TICKET_ROULETTE',
  'TICKET_DICE',
  'TICKET_LOTTERY',
  'GOLD_KEY',
  'DIAMOND_KEY',
  'GIFTICON_BAEMIN'
);
```

기대: 결과 0행

#### 7.1.4 기프티콘 금액 제약
```sql
SELECT level, reward_amount
FROM v2_level_reward_table
WHERE reward_type = 'GIFTICON_BAEMIN'
  AND reward_amount NOT IN (5000, 10000, 20000);
```

기대: 결과 0행

### 7.2 멱등성(중복 지급 방지) 기준
레벨 보상은 아래 2중 장치로 멱등성을 보장한다.

- 서비스 레벨: 동일 `(user_id, level)` 로그가 존재하면 지급 스킵
- DB 레벨: `user_level_reward_log`의 UniqueConstraint `uq_user_level_reward`

운영 체크:
- 특정 유저가 같은 레벨 보상을 2번 받았다는 제보가 있으면, 우선 `user_level_reward_log`에 중복 레코드가 가능한지(제약/우회)부터 확인한다.

### 7.3 보상표 변경 프로토콜(운영)
보상표는 SoT(운영 규칙)와 DB(실행 규칙)가 동시에 변하면, 기존 유저의 “과거 레벨 도달 보상”과 충돌할 수 있다.

권장 절차:
1) 변경 전 스냅샷 SQL로 현행 `v2_level_reward_table` 백업(덤프)
2) 변경안을 본 문서 표에 먼저 반영(문서 SoT 선행)
3) DB 변경 적용(마이그레이션 또는 통제된 운영 SQL)
4) 위 7.1 검증 SQL 전체 통과 확인
5) 변경 후에도 `user_level_reward_log` 멱등성으로 “이미 받은 레벨”은 재지급되지 않음을 확인

## 8. 관련 문서 (Sources)
- ../v2_level_reward_table_sot_ko.md
- ../level_reward_table_20260126.md
- ../v2_db_level_reward_table_ko.md

## 9. 변경 이력
- v1.0 (2026-02-07, GitHub Copilot): 보상표(원본 코드/DB 스키마/정규화) 최종 통합
- v1.1 (2026-02-07, GitHub Copilot): 지급 경로 매핑/기프티콘 제약/검증 SQL/운영 변경 프로토콜 보강
