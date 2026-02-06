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

### 3.6 어드민 멤버 상세/기여도 관리 (Admin)
- Endpoint: `GET /api/v2/admin/team-battle/teams/{team_id}/members`
	- 팀 멤버 상세 목록 (가입일, 기여도 합산, 최근 기여일)
- Endpoint: `GET /api/v2/admin/team-battle/teams/{team_id}/members/{user_id}/contributions`
	- 멤버 기여도 내역(TeamEventLog)
- Endpoint: `PATCH /api/v2/admin/team-battle/members/{user_id}/joined-at`
	- 멤버 가입일 수정
- Endpoint: `POST /api/v2/admin/team-battle/members/contributions/adjust`
	- 기여도 조정 로그 추가 (기존 로그 수정/삭제 금지)

## 4. 오류 규칙 (Errors)
- `TEAM_NOT_FOUND`
- `ALREADY_JOINED`
- `NOT_JOINED`

## 5. 근거 (Source)
- 팀배틀 SoT: [docs/v2_specs/02_game/v2_team_battle_sot_ko.md](../02_game/v2_team_battle_sot_ko.md#L1)

## 6. 변경 이력
- v1.0 (2026-01-19, GitHub Copilot): 최초 작성
