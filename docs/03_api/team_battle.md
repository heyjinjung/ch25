# Team Battle API

## Public endpoints (`/api/team-battle`)
- `GET /seasons/active` — returns active season or null.
- `POST /teams/join` — body: `{ "team_id": 1 }`; joins current user to team.
- `POST /teams/leave` — leaves current team.
- `GET /teams/leaderboard?season_id=&limit=&offset=` — lists teams ordered by points.
- `GET /teams/{team_id}/contributors?season_id=&limit=&offset=` — top contributors for a team.

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

## Admin endpoints (`/admin/api/team-battle`)
- `POST /seasons` — create season; body: `{ "name": "S1", "starts_at": "2025-12-01T00:00:00Z", "ends_at": "2025-12-31T23:59:59Z", "is_active": false, "rewards_schema": {"tier": "gold"} }`.
- `POST /seasons/{season_id}/active?is_active=true` — activate/deactivate season.
- `POST /teams?leader_user_id=` — create team; body: `{ "name": "Alpha", "icon": null }`; optional leader assigned.
- `POST /teams/points` — award/adjust points; body: `{ "team_id": 2, "delta": 25, "action": "BONUS", "user_id": 99, "season_id": 10, "meta": {"source": "admin"} }`.

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
