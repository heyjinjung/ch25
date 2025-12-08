# 랭킹 & 시즌패스 초간단 운영 가이드

## 1. 우리가 만들 모드 (1주 테스트 예시)
- 기간:
  - 1차: 12/8 ~ 12/14
  - 2차: 12/15 ~ 12/21
- 포인트/스탬프 지급 규칙(단순화):
  1) 랭킹 1~10위 달성: 시즌패스 레벨 포인트(+XP) 지급
  2) 매일 게임 참여 1회마다: 시즌패스 스탬프(또는 XP) 지급
  3) 외부 플랫폼 입금 기록할 때: 시즌패스 스탬프/XP 지급 (관리자가 수기로 기록)
- 목표: 기간 동안 시즌패스 요구량(예: 스탬프 7개 또는 XP 100)을 채우면 보상 수령 가능.

## 2. 시즌패스 개념 쉽게 보기
- 시즌패스는 “레벨”과 “XP(경험치)”로 진행도를 관리.
- `season_pass_progress`에 현재 XP/레벨 저장, `season_pass_stamp_log`에 스탬프 기록.
- 스탬프를 찍으면 XP가 쌓이고, XP가 기준치를 넘으면 레벨 업.
- 보상은 레벨 단위로 claim(수령)하는 구조.

### 지금 코드에서 쓰는 주요 엔드포인트
- `/season-pass/status`: 현재 레벨/XP/보상 가능 여부 조회.
- `/season-pass/stamp`: 스탬프 추가(게임 플레이, 입금 기록 시 호출 가능).
- `/season-pass/claim`: 레벨 보상 수령.

## 3. 랭킹 개념 쉽게 보기
- 게임 결과/외부 데이터(입금, 횟수)를 합산해 점수/순위를 매김.
- `external_ranking_design.md` 참고: 외부 테이블에 관리자가 값 입력 → `/admin/api/ranking/{date}`로 집계 조회.
- 시즌 종료 시 랭킹별 보상을 지급하고 지급 로그를 남김.

## 4. 구현/운영 절차 (단계별)
### A. 기간 설정
- 시즌/랭킹 기간을 캘린더로 정리(예: 12/8~12/14, 12/15~12/21).
- 필요 시 DB에 시즌패스 시즌(start/end) 세팅(이미 1개가 있다면 재사용 가능).

### B. 지급 규칙에 맞춰 호출 위치 연결
- 게임 참여 1회당 스탬프/XP:
  - 각 게임 play 성공 시 `/season-pass/stamp` 호출(출처 `source_feature_type`에 게임 타입 기록).
- 랭킹 1~10위 보상:
  - 랭킹 집계 후 상위 10명에게 `/season-pass/stamp` 또는 `/reward`(포인트/코인 지급) 실행.
- 외부 입금 기록:
  - 관리자가 외부 랭킹 테이블에 입금액/횟수 입력 → 동일 시점에 `/season-pass/stamp` 호출(입금 1건 = 스탬프 1개처럼 단순 규칙).

### C. 필요 파라미터 예시
- 스탬프 추가: `POST /season-pass/stamp` body `{ "source_feature_type": "DICE", "xp_bonus": 0 }` (게임당 1회 호출)
- 랭킹 집계 확인: `GET /admin/api/ranking/2025-12-14`
- 외부 데이터 입력: 설계 문서 테이블에 `user_id, deposit_amount, play_count` 직접 INSERT/UPDATE

## 5. 검증 체크리스트
- 홈/게임 상태:
  - `/api/roulette|dice|lottery/status` 200 OK, `token_balance` 표시.
- 시즌패스:
  - `/season-pass/status` 호출 시 레벨/XP 확인, 스탬프 찍은 뒤 XP 증가 확인.
  - `season_pass_stamp_log`, `season_pass_progress`에서 DB 값 일치 확인.
- 랭킹:
  - `/admin/api/ranking/{date}` 200 OK, 외부 데이터 반영 여부 확인.
  - 시즌 종료 후 보상 지급 시 지급 로그/지갑 변동 확인.

## 6. 운영 팁
- 테스트 모드일 때 today-feature는 무시되므로 언제든 접근 가능.
- 코인이 부족하면 플레이/스탬프가 막힐 수 있으니 관리자 코인 지급으로 잔액 확보.
- 모든 호출 후 200 OK 응답, DB 로그/지갑까지 확인해 두면 오류를 줄일 수 있음.

## 7. 바로 반영용 DB/테이블 스니펫
- 외부 랭킹 입력 테이블(예시)
```sql
CREATE TABLE IF NOT EXISTS external_ranking_data (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  deposit_amount INT NOT NULL DEFAULT 0,   -- 외부 입금액
  play_count INT NOT NULL DEFAULT 0,       -- 외부 게임 횟수
  memo VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_external_ranking_user (user_id)
);
```
- 외부 보상 지급 로그(예시)
```sql
CREATE TABLE IF NOT EXISTS external_ranking_reward_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  reward_type VARCHAR(50) NOT NULL,   -- POINT, TOKEN 등
  reward_amount INT NOT NULL,
  reason VARCHAR(100) NOT NULL,       -- EXTERNAL_RANKING 등
  season_name VARCHAR(50) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```
- 시즌패스 진행/스탬프 확인 쿼리
```sql
SELECT * FROM season_pass_progress WHERE user_id = 999;
SELECT * FROM season_pass_stamp_log WHERE user_id = 999 ORDER BY created_at DESC LIMIT 5;
```
- 랭킹 API 호출 예시
```bash
curl -s http://localhost:8000/admin/api/ranking/2025-12-14
```

## 8. API 호출 스니펫 (즉시 적용)
- 게임 1회 참여 후 스탬프(또는 XP) 추가
```bash
curl -X POST http://localhost:8000/api/season-pass/stamp \
  -H "Authorization: Bearer <USER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{ "source_feature_type": "DICE", "xp_bonus": 0 }'
```
- 랭킹 1~10위 보상 지급 시 스탬프/XP 추가(관리자 스크립트에서 반복 호출)
```bash
curl -X POST http://localhost:8000/api/season-pass/stamp \
  -H "Authorization: Bearer <USER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{ "source_feature_type": "RANKING_REWARD", "xp_bonus": 50 }'
```
- 외부 입금 기록 + 스탬프 1개 지급(수기 입력)
```sql
INSERT INTO external_ranking_data (user_id, deposit_amount, play_count, memo)
VALUES (999, 50000, 0, '입금 5만원');
```
```bash
curl -X POST http://localhost:8000/api/season-pass/stamp \
  -H "Authorization: Bearer <USER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{ "source_feature_type": "EXTERNAL_DEPOSIT", "xp_bonus": 0 }'
```
