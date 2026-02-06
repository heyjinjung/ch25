문서 타입: 운영 SoT (최종)
버전: v1.1
작성일: 2026-02-07
작성자: GitHub Copilot
대상: 운영/BE/어드민 FE
상태: SoT

## 1. 목적 (Purpose)
붙여넣기 Import(데일리 입금/게임 로그)가 레벨/XP 및 입금 누적 SoT에 미치는 영향을 **운영 관점에서** 최종 정리한다.

## 2. 범위 (Scope)
- 붙여넣기 Import 입력 포맷(데일리 입금 중심)
- Preview/Import API 계약(선택 Import 포함)
- 시간 파싱 및 중복/과거 데이터 스킵 규칙
- 레벨/XP/입금 SoT 연쇄 업데이트 원칙

## 2.1 비목표(Non-Goals)
- 본 문서는 “CSV 파일 업로드 Import” 기능을 다루지 않는다. (붙여넣기 Import만)
- 본 문서는 HQ 원장 데이터의 정합성(입금/환전 실제 여부)을 보장하지 않는다. (운영 입력의 품질은 별도)

## 3. 도메인 연쇄(중요)
붙여넣기 Import(데일리 입금)은 “입금 누적 + XP/레벨 + 미션 + 금고 신호”까지 연쇄적으로 영향을 줄 수 있다.

### 3.1 Import가 직접 저장하는 것(감사/중복방지)
- `hq_daily_deposit_log`에 처리 로그를 남긴다.
  - `dedup_key`(중복 방지) + `status(MATCHED/NOT_FOUND)` + `import_batch_id`

### 3.2 Import가 갱신하는 SoT(입금 누적)
데일리 입금 Import는 최종적으로 CC 입금 누적을 다음 두 곳에 정렬한다.

- Primary(레벨 도메인 SoT 관점): `v2_user.total_charge_amount`
- 운영 랭킹/집계 테이블: `external_ranking_data.deposit_amount`

중요:
- Import는 “증분(+amount)”을 개별 트랜잭션 로그로 쌓는 방식이 아니라,
  **유저별 최종 누적액(total)** 을 계산한 뒤 `upsert`로 저장한다.

### 3.3 Import로 인해 발생할 수 있는 연쇄 업데이트
`external_ranking_data.deposit_amount`가 증가하면, 서비스가 아래 동작을 수행할 수 있다.

- XP 적립 및 레벨 판정(단일 레벨 시스템)
  - `level_xp.add_xp(source='CC_DEPOSIT', meta=...)`
  - 결과적으로 `v2_user.xp`, `v2_user.level` 및 레거시 mirror(`user_level_progress`)가 동기화될 수 있다.
  - 감사 로그: `user_xp_event_log`
  - 보상 로그/멱등성: `user_level_reward_log`
- 금고 언락 신호 처리(입금 증가 시그널)
- 미션 진행 업데이트(액션: `CC_DEPOSIT`)

## 4. 입력 포맷(데일리 입금)
예시:
- 컬럼: 번호 / 소속 / 이름(아이디) / 닉네임 / 신청날짜 / 충전금액 / 입금자명 / 충전날짜 / 상태

### 4.1 지원 형식(2종)
붙여넣기 Import는 데일리 입금에 대해 2가지 형식을 파싱한다.

1) HQ 8~9열(탭 기반)
- `번호\t소속\t이름(아이디)\t닉네임\t신청날짜\t충전금액\t입금자명\t충전날짜\t상태`
- 파서 동작:
  - 닉네임: 4번째 컬럼
  - 금액: 6번째 컬럼
  - 입금자: 7번째 컬럼
  - 일시: `신청날짜`에 시간(`:`)이 있으면 우선, 없으면 `충전날짜`

2) 4열(간이)
- `네임\t금액\t입금일시\t입금자`

공통 규칙:
- 헤더(예: 첫 컬럼에 `번호`, `닉네임`, `네임` 포함)는 스킵한다.
- 금액은 콤마/공백/원/₩를 제거하고 정수 원 단위로 파싱한다.
- 닉네임이 비었거나 금액이 0 이하이면 스킵한다.

## 5. 시간 파싱 규칙
- 시간 정보가 존재하면(예: `:` 포함) 이를 우선 사용한다.
- 00:00:00으로 들어오는 레거시 데이터는 “최신 기록” 판정에 악영향을 줄 수 있으므로, 최신 기준 계산에서 제외하는 보정이 필요할 수 있다.

### 5.1 지원 datetime 포맷(대표)
- `2026/02/04 11:10:09`
- `2026/02/04 11:10`
- `26/02/04 16:00`
- `26/02/04`
- `2026-02-04T00:00:00`
- `2026-02-04 11:10:09`
- `2026-02-04`

### 5.2 DB 최신시간(latest) 산정 규칙
데일리 입금 Import는 “기존 최신 기록 이후만 처리”를 위해 DB의 최신 `deposit_at`을 다음처럼 산정한다.

1) 우선: `deposit_at`의 `hour != 0`인 것만 대상으로 `MAX(deposit_at)`
2) 1) 결과가 없으면: 전체에서 `MAX(deposit_at)`

의도:
- `00:00:00`으로 잘못 저장된 레거시가 최신 판정을 오염시키는 것을 완화한다.

## 6. Preview/Import API 규약
### 6.0 공통 요청 스키마
- `text: string` (붙여넣기 원문)
- `import_type: string` (`DAILY_DEPOSIT` 또는 `GAME_LOG`)
- `selected_indices?: number[] | null`
  - `null`이면 전체 처리
  - 배열이면 해당 인덱스의 행만 처리
  - 인덱스는 **0-based** (preview에서 `enumerate`로 생성된 `index`와 동일)

엔드포인트(라우터 기준 상대 경로):
- Import: `POST /csv-import/paste-import`
- Preview: `POST /csv-import/paste-import/preview`

권한:
- ADMIN 전용 (그 외 403)

### 6.1 상태 분류(Preview)
- `MATCHED`: 유저 매칭됨(Import 가능)
- `NOT_FOUND`: 유저 미등록(Import 불가)
- `DUPLICATE`: 이미 Import됨(Import 불가)
- `SKIPPED_OLD`: DB 최신 기록 이전(Import 불가)

#### 6.1.1 상태 판정 순서(데일리 입금)
Preview는 아래 순서로 상태를 판정한다.

1) `SKIPPED_OLD`
- `latest_in_db`가 존재하고, 입력 `deposit_at`이 존재할 때만 판정한다.
- 입력 `deposit_at`이 00:00:00(시간 정보 없음)인 경우: 날짜만 비교하여 `deposit_at.date() < latest.date()`면 old
- 시간 정보가 있는 경우: `deposit_at <= latest`면 old

2) `DUPLICATE`
- `dedup_key`가 DB에 이미 존재하면 duplicate

3) `MATCHED` / `NOT_FOUND`
- `v2_user.nickname`(case-insensitive exact) 우선
- 없으면 `v2_user.external_nickname`(case-insensitive exact)
- 매칭 실패 시 not_found

### 6.2 선택 Import
`selected_indices`가 null이면 전체 처리, 배열이면 해당 인덱스만 처리한다.

주의:
- Preview에서 제공하는 `index`를 그대로 `selected_indices`로 사용한다(0-based).

### 6.3 Preview 응답(데일리 입금)
Preview 응답은 운영 UI에서 “체크박스 선택”을 위해 `preview` 배열을 전체 반환한다.

주요 필드:
- `latest_in_db`: DB 최신 `deposit_at`(위 5.2 규칙)
- `preview[]` 각 원소:
  - `index`, `nickname`, `amount`, `deposit_at`, `depositor`, `status`, `user_id`

### 6.4 Import 응답(데일리 입금)
Import 성공 시 주요 필드는 아래와 같다.

- `batch_id`: 8자리 배치 식별자
- `total_parsed`: 파싱된 총 행 수
- `processed_count`: 매칭되어 실제 반영된 행 수
- `skipped_old_count`, `duplicate_count`, `not_found_count`
- `total_amount`: 처리된 입금 총합
- `unique_users`: 반영된 유저 수
- `latest_deposit_at_in_db`: Import 시작 시점의 DB latest
- `matched_details`: 일부(최대 20건) 샘플

실패 시:
- `success=false`와 `error` 문자열을 반환할 수 있다.

## 7. 운영 초기화(주의)
운영 DB 초기화 쿼리는 환경/권한에 따라 위험할 수 있으므로, 실행 전 반드시 영향 범위를 검증한다.
(예: 입금 로그 삭제, 유저 레벨/XP 초기화, 지갑 잔액 초기화)

## 8. 운영 체크리스트
- [ ] Preview에서 상태가 기대대로 분류되는지
- [ ] Import 실행 후 중복 기록이 없는지
- [ ] 최신 시간 기준 스킵 정책이 의도대로 작동하는지

추가 필수 체크(레벨/XP 연동 포함):
- [ ] Import 후 `v2_user.total_charge_amount`와 `external_ranking_data.deposit_amount`가 동일한지(동일 유저 기준)
- [ ] Import로 인해 XP가 적립된 경우 `user_xp_event_log.source='CC_DEPOSIT'` 이벤트가 남는지
- [ ] 레벨 보상이 발생한 경우 `user_level_reward_log(uq_user_level_reward)`로 중복 지급이 차단되는지

## 9. 운영 검증 SQL(권장)
### 9.1 배치별 처리량 확인
```sql
SELECT import_batch_id,
       COUNT(*) AS rows,
       SUM(CASE WHEN status='MATCHED' THEN 1 ELSE 0 END) AS matched_rows,
       SUM(CASE WHEN status='NOT_FOUND' THEN 1 ELSE 0 END) AS not_found_rows,
       SUM(amount) AS total_amount
FROM hq_daily_deposit_log
WHERE import_batch_id IS NOT NULL
GROUP BY import_batch_id
ORDER BY import_batch_id DESC;
```

### 9.2 dedup_key 중복(이론상 0건)
```sql
SELECT dedup_key, COUNT(*) AS c
FROM hq_daily_deposit_log
GROUP BY dedup_key
HAVING COUNT(*) > 1;
```

### 9.3 NOT_FOUND 상위(매칭 개선 후보)
```sql
SELECT nickname, COUNT(*) AS c, SUM(amount) AS s
FROM hq_daily_deposit_log
WHERE status = 'NOT_FOUND'
GROUP BY nickname
ORDER BY c DESC
LIMIT 50;
```

## 10. 관련 문서 (Sources)
- ../20260204_paste_import_enhancement.md
- ../20260204_v2_sot_consolidation.md

## 11. 변경 이력
- v1.0 (2026-02-07, GitHub Copilot): 레벨 도메인 기준으로 Paste Import 운영 SoT 정렬
- v1.1 (2026-02-07, GitHub Copilot): API 계약/상태 판정/dedup_key/연쇄 업데이트(XP/미션/금고)/검증 SQL 보강
