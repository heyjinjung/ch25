문서 타입: SoT
버전: v1.0
작성일: 2026-01-19
작성자: GitHub Copilot
대상: BE/FE/운영
상태: SoT

## 1. 목적 (Purpose)
V2 팀배틀(Team Battle)의 게임 규칙, 데이터 모델, API 스키마를 단일 기준으로 확정한다.

## 2. 범위 (Scope)
- 팀배틀 시즌/팀/멤버십/점수/이벤트 로그
- 팀배틀 공개 API 및 응답 스키마
- 점수 산정/정산 규칙(보상 포함)

## 3. 용어 정의 (Definitions)
- 팀배틀 시즌(TeamSeason): 팀배틀 이벤트의 진행 기간
- 팀(Team): 유저가 소속되는 대항 팀
- 멤버십(TeamMember): 유저-팀 소속 관계
- 팀 점수(TeamScore): 시즌별 팀 누적 포인트
- 팀 이벤트 로그(TeamEventLog): 포인트 변경 이력

## 4. SoT: 데이터 모델/필드 매핑
**DB 모델 기준**: [app/models/team_battle.py](../../../app/models/team_battle.py#L10-L92)

| 엔티티 | 테이블 | 핵심 필드 | 설명 |
| :--- | :--- | :--- | :--- |
| 시즌 | team_season | id, name, starts_at, ends_at, is_active, rewards_schema | 시즌 정의 및 보상 스키마(JSON) |
| 팀 | team | id, name, icon, is_active | 팀 메타 데이터 |
| 멤버십 | team_member | user_id, team_id, role, joined_at | 유저의 팀 소속 |
| 점수 | team_score | team_id, season_id, points, updated_at | 시즌별 팀 점수 |
| 이벤트 로그 | team_event_log | team_id, user_id, season_id, action, delta, meta, created_at | 점수 변경 이력 |

## 5. SoT: API 스키마 (Public)
**라우트 기준**: [app/api/routes/team_battle.py](../../../app/api/routes/team_battle.py#L1-L121)
**스키마 기준**: [app/schemas/team_battle.py](../../../app/schemas/team_battle.py#L10-L132)

### 5.1 시즌
- `GET /api/team-battle/seasons/active` → `TeamSeasonResponse | None`

### 5.2 팀 소속
- `POST /api/team-battle/teams/join` → `TeamJoinRequest`
- `POST /api/team-battle/teams/auto-assign`
- `GET /api/team-battle/teams/me` → `TeamMembershipResponse | None`
- `POST /api/team-battle/teams/leave`

### 5.3 순위/기여도
- `GET /api/team-battle/teams/leaderboard` → `list[LeaderboardEntry]`
- `GET /api/team-battle/teams/{team_id}/contributors` → `list[ContributorEntry]`
- `GET /api/team-battle/teams/{team_id}/contributors/me` → `ContributorEntry | None`
- `GET /api/team-battle/teams` → `list[TeamResponse]`

## 6. SoT: 핵심 규칙
**서비스 기준**: [app/services/team_battle_service.py](../../../app/services/team_battle_service.py#L17-L205)

- 팀 선택 가능 시간: 시즌 시작 후 24시간(`TEAM_SELECTION_WINDOW_HOURS = 24`).
- 팀 최대 인원: 7명(`TEAM_MAX_MEMBERS = 7`).
- 시즌 활성화 우선순위: DB에서 `is_active=true`인 시즌이 있으면 이를 우선 사용.
- 활성 시즌이 없으면 **롤링 시즌(2일)**을 자동 생성하여 사용.
- 팀 가입은 당일 사용 조건을 만족해야 가능(ExternalRankingData 기준).

## 7. SoT: 포인트/정산(보상)
**설정값 기준**: [app/core/config.py](../../../app/core/config.py#L509-L514)
**정산 로직 기준**: [app/services/team_battle_service.py](../../../app/services/team_battle_service.py#L521-L636)

### 7.1 포인트 규칙
- 기본 포인트: `TEAM_BATTLE_POINTS_PER_PLAY` 설정값.
- 일일 포인트 캡: `TEAM_BATTLE_DAILY_PLAY_CAP` 설정값.
- 최소 보상 참여 기준: 300점(`MIN_POINTS_FOR_REWARD = 300`).

### 7.2 보상 정산 (현행)
- 팀배틀 보상은 **수동 지급(Manual)** 기준이다.
- 정산 결과는 `manual_coupon` 금액으로 반환된다.
- 랭크 보상(현행): 1등 300000, 2등 200000, 3등 50000.

### 7.3 보상 타입 표준화 원칙
- 팀배틀 보상이 자동 지급으로 전환될 경우, RewardType 표준 SoT와 보상 매핑 SoT를 따른다.
- 관련 문서: [RewardType 표준 SoT](../01_core/v2_reward_type_standard_sot_ko.md), [보상 매핑 SoT](../01_core/v2_reward_mapping_sot_ko.md)

## 8. 운영/검증 (QA)
- [ ] 팀 선택 윈도우(24h) 제한 동작 확인
- [ ] 팀 최대 인원(7명) 제한 동작 확인
- [ ] 포인트 캡/최소 보상 기준 적용 확인
- [ ] 정산 결과가 수동 지급 전제로 반환되는지 확인

## 9. 변경 이력
- v1.0 (2026-01-19, GitHub Copilot): 최초 작성
