# 랭킹 + 시즌패스 간단 운영 가이드 (초간단 버전)

## 기간 & 목표
- 테스트 1주차: 12/8 ~ 12/14
- 테스트 2주차: 12/15 ~ 12/21
- 목표: 두 주 동안 외부 랭킹 + 시즌패스가 동시에 작동하는지 검증

## 시즌패스 개념 (두 줄 요약)
- 시즌패스 레벨 = XP 누적량으로 오른다.
- 행동(스탬프)마다 XP가 붙고, 일정 XP마다 레벨업 → 보상.

### 관련 테이블
- season_pass_config, season_pass_level, season_pass_progress, season_pass_stamp_log, season_pass_reward_log

### 주요 API
- GET /api/season-pass/status : 현재 시즌, 내 XP/레벨, 오늘 스탬프 여부
- GET /api/season-pass/internal-wins : 내부 게임 승리 누적/임계치/남은 횟수
- POST /api/season-pass/stamp : 스탬프 1개 + XP 지급 (중복 방지 필요)
- POST /api/season-pass/claim : 보상 수령

## 외부 랭킹 개념 (내부 랭킹 없음)
- 외부 랭킹: 타 플랫폼의 입금액/게임횟수를 합산해 랭킹을 만든다.
- 테이블
  - external_ranking_data(user_id, deposit_amount, play_count, memo, created_at, updated_at)
  - external_ranking_reward_log(user_id, reward_type, reward_amount, reason, season_name, data_id, created_at)
- 엔드포인트 GET /api/ranking/today 응답 예시
```
{
  "date": "2025-12-08",
  "external_entries": [
    { "rank": 1, "user_id": 999, "deposit_amount": 50000, "play_count": 3, "memo": "입금 5만" }
  ],
  "my_external_entry": { "rank": 2, "user_id": 1001, "deposit_amount": 30000, "play_count": 5 },
  "feature_type": "RANKING"
}
```

## 자동 스탬프 지급 규칙(요구사항 반영)
1) 외부 랭킹 TOP10 진입 시 스탬프 1개
2) 외부 사이트 첫 이용(플레이 수 0→1) 시 스탬프 1개
3) 외부 입금액 100,000 단위마다 스탬프 1개 (예: 0→250,000이면 2개)
4) 내부 게임 승리 50회 달성 시 스탬프 1개
   - 기준: 승리 카운트가 50 미만→50 이상으로 처음 넘어갈 때 1회 지급
   - 중복 방지: 동일 조건으로 이미 찍힌 기록이 있으면 추가 지급 안 함
   - 승리 집계: 주사위 WIN + 룰렛/복권 reward_amount > 0 합산

## 구현 상태 점검
- 테이블 존재: external_ranking_*, season_pass_* (OK)
- 랭킹: 내부 랭킹 제거, 외부 랭킹만 사용 (OK)
- 시즌패스: 기본 API/테이블 존재 (OK)
- 자동 스탬프: TOP10/입금/첫 이용/내부 50승 로직 추가
- 내부 승리 진행률 API: GET /api/season-pass/internal-wins 추가 (홈/시즌패스 UI 연동)

## DB/마이그레이션/시드
- Alembic 버전 20251208_0007_add_external_ranking_tables.py (외부 랭킹 테이블 포함)
- 시드: scripts/seed_ranking_seasonpass.sql (필수 기본 데이터)
- 명령
```
docker compose exec backend alembic upgrade head
docker compose exec db mysql -uroot -proot xmas_event_dev < scripts/seed_ranking_seasonpass.sql
```

## 필드/용어 쉬운 설명
- 가중치(weight): 랜덤 뽑기에서 당첨 확률을 결정하는 숫자. 모든 가중치 합 대비 각 항목의 비율이 확률.
- 타입(type): 보상 종류를 구분하는 문자열. 예) POINT, ITEM, TICKET.
- 값(amount/value): 타입에 따라 지급되는 수량. 예) POINT 타입이면 포인트 개수.
- 스탬프(stamp): 시즌패스에서 “행동 1회”를 기록하는 도장. 찍힐 때 XP가 함께 오른다.

## 운영 시나리오(요약)
- 외부 랭킹 입력: /admin/api/external-ranking 에 입금액/게임횟수 upsert
- 홈/시즌패스 화면: GET /api/season-pass/status, GET /api/ranking/today, GET /api/season-pass/internal-wins 로 표시
- 스탬프 자동 지급: 위 4가지 규칙을 코드에 추가한 뒤, 로그가 쌓일 때마다 SeasonPassService를 통해 기록

## 프런트 표시(현재 구현)
- 홈: 시즌패스 요약 + 스탬프 가이드(외부 TOP10/첫 이용/10만 입금/내부 50승 진행률), 외부 랭킹 카드(내 순위/입금/플레이, 상위 3개)
- 시즌패스 페이지: XP 진행도, 다음 보상, 오늘 스탬프 상태, 스탬프 가이드 4카드, 레벨 보상 목록/수령 버튼

## 빠른 점검 체크리스트
- /api/ranking/today 200 OK, external_entries 노출
- /api/season-pass/status 200 OK, 오늘 스탬프/XP 정상 표시
- DB 확인:
```
SELECT * FROM external_ranking_data ORDER BY deposit_amount DESC;
SELECT * FROM season_pass_stamp_log WHERE source_feature_type LIKE 'EXTERNAL_%' OR source_feature_type='INTERNAL_WIN_50';
```

## TODO(이 문서 이후 코드 반영 필요)
- (완료) 외부 랭킹 upsert 시 TOP10/입금/플레이 조건 충족 → 자동 스탬프 + 중복 방지
- (완료) 내부 게임 승리 누적 50회 달성 시 1회 스탬프
- 스탬프 로그 source_feature_type 활용해 중복 차단 검증
