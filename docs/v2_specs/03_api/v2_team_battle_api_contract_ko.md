문서 타입: API 계약
버전: v1.0
작성일: 2026-01-19
작성자: GitHub Copilot
대상: BE/FE/기획
상태: SoT

# V2 Team Battle API 계약

## 1. 목적 (Purpose)
팀 배틀 V2 API 계약을 정의한다.

## 2. 범위 (Scope)
- 시즌 조회
- 팀 목록/가입/탈퇴
- 내 팀 정보
- 리더보드

## 3. API 계약 (Contract)
### 3.1 현재 시즌
- Endpoint: `GET /api/v2/team-battle/seasons/active`

### 3.2 팀 목록
- Endpoint: `GET /api/v2/team-battle/teams`

### 3.3 팀 가입/탈퇴
- Endpoint: `POST /api/v2/team-battle/teams/join`
- Request:
```json
{ "team_id": 1 }
```
- Endpoint: `POST /api/v2/team-battle/teams/leave`

### 3.4 내 팀 정보
- Endpoint: `GET /api/v2/team-battle/teams/me`

### 3.5 리더보드
- Endpoint: `GET /api/v2/team-battle/teams/leaderboard`

## 4. 오류 규칙 (Errors)
- `TEAM_NOT_FOUND`
- `ALREADY_JOINED`
- `NOT_JOINED`

## 5. 근거 (Source)
- 팀배틀 SoT: [docs/v2_specs/02_game/v2_team_battle_sot_ko.md](../02_game/v2_team_battle_sot_ko.md#L1)

## 6. 변경 이력
- v1.0 (2026-01-19, GitHub Copilot): 최초 작성
