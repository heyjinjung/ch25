# 랭킹 + 시즌패스 초간단 가이드 (읽기 쉬운 버전)

## 기간과 목표
- 테스트 1주차: 12/8 ~ 12/14
- 테스트 2주차: 12/15 ~ 12/21
- 목표: 일주일 동안
  - 랭킹 1~10위 달성 시 시즌패스 포인트(또는 XP) 지급
  - 매일 게임 1회 참여 시 시즌패스 스탬프/XP 지급
  - 타사 플랫폼 입금/게임횟수 기록 시 시즌패스 스탬프/XP 지급(관리자 수동 입력)

## 시즌패스 개념 (아주 간단히)
- 시즌패스 레벨 = XP 누적량으로 올라감.
- 하루에 한 번 도장을 찍을 수 있고, 기본 XP에 추가 보너스(XP)도 붙일 수 있음.
- 표준 테이블: `season_pass_config`, `season_pass_level`, `season_pass_progress`, `season_pass_stamp_log`, `season_pass_reward_log`.
- 이미 구현된 API:
  - `GET /api/season-pass/status` : 현재 시즌, 내 XP/레벨, 오늘 도장 여부 조회
  - `POST /api/season-pass/stamp` : 도장 1개 + XP 적립 (중복 불가)
  - `POST /api/season-pass/claim` : 수동 보상 레벨일 때 보상 수령

## 랭킹 개념 (내부 + 외부)
- 내부 랭킹: `ranking_daily` 테이블에 랭킹과 점수 저장.
- 외부 랭킹: 타 플랫폼의 입금액/게임횟수를 수기로 입력하여 별도 순위 제공.
- 외부 데이터 테이블(신규):
  - `external_ranking_data(user_id, deposit_amount, play_count, memo, created_at, updated_at)`
  - `external_ranking_reward_log(user_id, reward_type, reward_amount, reason, season_name, data_id, created_at)`
- 사용자용 API `GET /api/ranking/today` 응답 예시:
```json
{
  "date": "2025-12-08",
  "entries": [ { "rank": 1, "user_name": "alice", "score": 120 } ],      // 내부 랭킹
  "my_entry": { "rank": 3, "user_name": "me", "score": 80 },
  "external_entries": [ { "rank": 1, "user_id": 999, "deposit_amount": 50000, "play_count": 3, "memo": "입금 5만원" } ],
  "my_external_entry": { "rank": 2, "user_id": 1001, "deposit_amount": 30000, "play_count": 5 },
  "feature_type": "RANKING"
}
```

## 관리자 작업 순서 (한 줄 요약)
1) `/admin/ranking` : 내부 랭킹(점수/순위) 입력
2) `/admin/external-ranking` : 외부 데이터(입금액, 게임횟수) 입력
3) `/admin/game-tokens` : 필요 시 코인 지급/회수
4) `/admin/game-token-logs` : 최근 플레이/코인 로그 확인

## DB/마이그레이션
- Alembic 신규 버전 `20251208_0007_add_external_ranking_tables.py` 로 두 테이블 생성:
  - `external_ranking_data`
  - `external_ranking_reward_log`
- 시드 스크립트: `scripts/seed_ranking_seasonpass.sql`
  - 테이블 생성(안전하게 IF NOT EXISTS)
  - 샘플 INSERT 예제(주석 처리)
- 적용 명령:
```
docker compose exec backend alembic upgrade head
docker compose exec db mysql -uroot -proot xmas_event_dev < scripts/seed_ranking_seasonpass.sql
```

## API 스니펫
- 오늘 랭킹(내부+외부):
  - `curl http://localhost:8000/api/ranking/today`
- 외부 랭킹 입력(배열로 upsert):
```bash
curl -X POST http://localhost:8000/admin/api/external-ranking \
  -H "Content-Type: application/json" \
  -d '[{"user_id":999,"deposit_amount":50000,"play_count":3,"memo":"입금 5만원"}]'
```
- 시즌패스 도장 1회 (게임/입금/랭킹 보상에 맞춰 호출):
```bash
curl -X POST http://localhost:8000/api/season-pass/stamp \
  -H "Authorization: Bearer <USER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{ "source_feature_type": "DICE", "xp_bonus": 0 }'
```

## 점검 체크리스트
- `/api/ranking/today` 200 OK, entries + external_entries 확인
- `/admin/api/external-ranking` GET/POST/PUT/DELETE 200 OK
- `/api/season-pass/status` 200 OK, 오늘 도장 플래그와 XP 증가 확인
- DB 조회 예시:
```sql
SELECT * FROM external_ranking_data ORDER BY deposit_amount DESC;
SELECT * FROM external_ranking_reward_log ORDER BY created_at DESC LIMIT 5;
SELECT * FROM season_pass_stamp_log WHERE user_id = 999 ORDER BY created_at DESC LIMIT 5;
```

## 랭킹/시즌패스 적용 예시 (테스트 주차)
- 1주차(12/8~12/14):
  - 매일 게임 1회 → `POST /season-pass/stamp`
  - 랭킹 1~10위 보상 → 관리자가 XP 보너스 스탬프 추가 또는 보상 지급 로그 적재
  - 외부 입금 기록 → `/admin/external-ranking`에 입력 후 필요 시 스탬프 추가
- 2주차(12/15~12/21): 동일 플로우 반복, 시즌패스 보상 적립 확인

## 용어 초간단 해설
- 랭킹 점수(score): 내부 랭킹에서 사용하는 점수(높을수록 순위 ↑).
- 입금액(deposit_amount): 외부 랭킹에서 정렬에 쓰는 금액(원 단위 정수).
- 게임횟수(play_count): 외부 랭킹 보조 지표(같은 금액일 때 많이 플레이한 사람이 위).
- XP: 시즌패스 경험치. 스탬프를 찍거나 보너스를 주면 오른다.
- 스탬프: 하루 1회 찍는 도장. 찍을 때 XP가 같이 오른다.
