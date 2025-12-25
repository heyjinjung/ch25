# Team Battle API

## Public endpoints (`/api/team-battle`)
- `GET /seasons/active` — returns active season or null.
- `POST /teams/join` — body: `{ "team_id": 1 }`; joins current user to team.
- `POST /teams/auto-assign` — assigns current user to the team with the fewest members within the 2h selection window ("미스터리 팀").
- `GET /teams/me` — returns current membership `{ team_id, role, joined_at }` or `null`.
- `POST /teams/leave` — leaves current team.
- `GET /teams/leaderboard?season_id=&limit=&offset=` — lists teams ordered by points.
- `GET /teams/{team_id}/contributors?season_id=&limit=&offset=` — top contributors for a team.

### Scoring/limits (enforced by API)
- Game play yields **10 points per play**; only `action=GAME_PLAY` uses this automatic value.
- Per-user cap: **500 points/day** (50 plays). Excess is rejected with `DAILY_POINT_CAP_REACHED`.
- Team selection window: join/auto-assign allowed only within **24 hours after season start** (mystery auto-assign). 이후에는 `TEAM_SELECTION_CLOSED/TEAM_LOCKED`.
- Usage gate: `GAME_PLAY` points require **same-day usage** recorded in external ranking data; otherwise `USAGE_REQUIRED_TODAY`.

### Example: join and leaderboard
Request:
```json
POST /api/team-battle/teams/join
{ "team_id": 2 }
```
Response:
```json
{ "team_id": 2, "user_id": 1, "role": "member" }
```

Request:
```json
GET /api/team-battle/teams/leaderboard?limit=3
```
Response:
```json
[
  { "team_id": 2, "team_name": "Alpha", "points": 120 },
  { "team_id": 3, "team_name": "Beta", "points": 95 }
]
```

## 응답 필드 업데이트
- Contributors: `nickname` 필드 포함 (`null` 가능) — API가 User JOIN으로 채워 반환.
- 타임존 주의: 시즌 시작/종료 시각은 KST/UTC 혼선에 민감하므로 DB/애플리케이션 TZ를 일관되게 설정하거나 모든 datetime에 TZ를 명시해야 한다.

## Admin endpoints (`/admin/api/team-battle`)
- `POST /seasons` — create season; body: `{ "name": "S1", "starts_at": "2025-12-01T00:00:00Z", "ends_at": "2025-12-31T23:59:59Z", "is_active": false, "rewards_schema": {"tier": "gold"} }`.
- `POST /seasons/{season_id}/active?is_active=true` — activate/deactivate season.
- `POST /teams?leader_user_id=` — create team; body: `{ "name": "Alpha", "icon": null }`; optional leader assigned.
- `POST /teams/points` — award/adjust points; body: `{ "team_id": 2, "delta": 25, "action": "BONUS", "user_id": 99, "season_id": 10, "meta": {"source": "admin"} }`.
- `POST /teams/force-join` — force-join any user to a team (ignores 2h selection window); body: `{ "team_id": 1, "user_id": 100 }`.
- `POST /teams/auto-balance` — 균형 배정(어제 데이터 기반) 미리보기/적용. body 예:
  ```json
  {
    "target_date": "2025-12-12",    // 비우면 어제(KST)
    "season_id": 1,                  // 비우면 활성 시즌
    "apply": true,                   // true면 즉시 팀 배정 반영
    "weight_deposit": 0.6,
    "weight_play": 0.4
  }
  ```
  - 조건: 활성 팀이 정확히 2개일 때만 실행
  - 대상: target_date 하루 동안 입금/플레이가 발생한 사용자
  - 로직: 점수 = 0.6·입금정규화 + 0.4·플레이정규화, 상위부터 팀 총점이 낮은 쪽에 순차 배정(동점 구간은 셔플)
  - 응답: `{ season_id, target_date, teams: [t1, t2], totals: [score1, score2], team1_count, team2_count }`

### Example: award points
Request:
```json
POST /admin/api/team-battle/teams/points
{ "team_id": 2, "delta": 50, "action": "MATCH_WIN", "user_id": 99, "season_id": 10, "meta": {"match_id": 44} }
```
Response:
```json
{ "team_id": 2, "season_id": 10, "points": 150 }
```
