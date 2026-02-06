문서 타입: learned 패치 노트
버전: v1.0
작성일: 2026-01-27
작성자: GitHub Copilot
대상: BE/OPS
상태: SoT 보조(learned_)

# 20260127 Team Battle /team-battle/status Stub 제거

## 1. 목적
V2 공개 API의 `/api/v2/team-battle/status`가 SoT compliance 목적의 **stub**으로 남아 있어, 실제 시즌/내 팀/상위 팀 요약을 반환하도록 연결한다.

## 2. 증상 정의 (Symptom Abstraction)
| 항목 | 내용 |
|---|---|
| 대상 기능 | V2 Team Battle 상태 요약 조회 (`GET /api/v2/team-battle/status`) |
| HTTP Status | 200 (하지만 의미 없는 stub payload) |
| 영향 범위 | 해당 엔드포인트를 사용하는 클라이언트/운영 확인 작업 전반 |
| 재현 빈도 | 항상 |

## 3. 증거 (Evidence)
- 기존 구현이 `{"status":"active"}`를 고정 반환하여 시즌/팀 정보를 제공하지 못함.
- V2 Team Battle의 canonical 데이터 소스는 아래 테이블/모델 기반으로 이미 존재:
  - 시즌: `team_season`
  - 팀/멤버: `team`, `team_member`
  - 점수/기여 로그: `team_score`, `team_event_log`

## 4. 원인 (Root Cause)
- `app/v2/api/routes.py`의 SoT compliance stub 섹션에 `/team-battle/status`가 실제 서비스 호출 없이 placeholder로 유지됨.

## 5. 해결 (Fix)
- `GET /api/v2/team-battle/status`
  - 활성 시즌 조회: `V2TeamBattleService.get_active_season()`
  - 유저 식별자 정합성: `V2UserService.ensure_legacy_user_id()`로 legacy `user.id` 확보
    - 팀배틀 테이블이 legacy `user.id` FK를 사용하므로 변환이 필수
  - 내 팀 요약: `V2TeamBattleService.get_membership_view()`
  - 상위 팀 요약: `V2TeamBattleService.get_leaderboard_view(limit=5)`
  - 응답에 `status` 필드를 유지해 호환성을 보장

## 6. 변경 파일
- Backend
  - `app/v2/api/routes.py` : `/team-battle/status` stub → 실제 요약 응답으로 교체
- Tests
  - `tests/v2_tests/phase5_public/test_team_battle_v2_routes_payload.py` : status 엔드포인트 payload 검증 추가

## 7. 응답 스키마(요약)
성공 시(시즌 활성):
```json
{
  "status": "active",
  "season": {"id": 1, "name": "S1", "start_date": "...", "end_date": "...", "is_active": true},
  "season_name": "S1",
  "has_team": true,
  "my_team": {"id": 1, "name": "RED", "points": 10, "member_count": 3},
  "top_teams": [{"id": 2, "name": "BLUE", "points": 20, "member_count": 2, "rank": 1}]
}
```
시즌 비활성(없음):
```json
{
  "status": "inactive",
  "season": null,
  "season_name": null,
  "has_team": false,
  "my_team": null,
  "top_teams": []
}
```

## 8. 검증 (VERIFY)
- 단위/라우트 페이로드 테스트에 `/api/v2/team-battle/status`를 추가하여 stub 회귀를 방지.

## 9. 운영 메모 (OPS)
- 이 엔드포인트는 대시보드/카드용 요약으로 사용 가능하도록 상위 팀은 `limit=5`로 제한한다.
- 팀배틀 데이터의 유저 키는 legacy `user.id` 기반이므로, v2 토큰 sub(=v2_user.id)만으로는 조회 누락이 발생할 수 있다. 본 패치에서 `ensure_legacy_user_id()`로 정합성을 보장한다.

## 10. 변경 이력
- v1.0 (2026-01-27, GitHub Copilot): `/team-battle/status` stub 제거 및 실데이터 연결
