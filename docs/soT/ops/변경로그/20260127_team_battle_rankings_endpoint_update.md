문서 타입: learned 패치 노트
버전: v1.0
작성일: 2026-01-27
작성자: GitHub Copilot
대상: BE/OPS
상태: SoT 보조(learned_)

# 20260127 Team Battle /team-battle/rankings Stub 제거

## 1. 목적
V2 공개 API의 `/api/v2/team-battle/rankings`가 SoT compliance 목적의 **stub**으로 남아 있어, 실제 랭킹(리더보드) 데이터를 반환하도록 연결한다.

## 2. 증상 정의 (Symptom Abstraction)
| 항목 | 내용 |
|---|---|
| 대상 기능 | V2 Team Battle 랭킹 조회 (`GET /api/v2/team-battle/rankings`) |
| HTTP Status | 200 (하지만 의미 없는 stub payload) |
| 영향 범위 | 랭킹/리더보드 요약을 사용하는 클라이언트 및 운영 확인 작업 |
| 재현 빈도 | 항상 |

## 3. 증거 (Evidence)
- 기존 구현이 `[]` 고정 반환이라 시즌 점수/순위 데이터 제공 불가.
- 동일 목적의 canonical API가 이미 존재:
  - `GET /api/v2/team-battle/teams/leaderboard`

## 4. 원인 (Root Cause)
- `app/v2/api/routes.py`의 SoT compliance stub 섹션에서 `/team-battle/rankings`가 placeholder로 유지됨.

## 5. 해결 (Fix)
- `/api/v2/team-battle/rankings`를 **leaderboard view alias**로 정의.
  - 내부적으로 `V2TeamBattleService.get_leaderboard_view()`를 호출
  - 기본 파라미터 제공: `season_id?`, `limit=20`, `offset=0`
  - 안전 제한: `limit <= 100`, `offset >= 0`

## 6. 변경 파일
- Backend
  - `app/v2/api/routes.py` : `/team-battle/rankings` stub → leaderboard alias로 교체
- Tests
  - `tests/v2_tests/phase5_public/test_team_battle_v2_routes_payload.py` : rankings payload smoke 검증 추가

## 7. 응답 스키마(요약)
`GET /api/v2/team-battle/rankings`는 `GET /api/v2/team-battle/teams/leaderboard`와 동일한 형식을 반환한다.

## 8. 검증 (VERIFY)
- 라우트 페이로드 테스트에 `/api/v2/team-battle/rankings`를 추가하여 stub 회귀를 방지.

## 9. 운영 메모 (OPS)
- 실질적으로 leaderboard alias이므로, 클라이언트는 가능하면 canonical endpoint(`/teams/leaderboard`) 사용을 권장.

## 10. 변경 이력
- v1.0 (2026-01-27, GitHub Copilot): `/team-battle/rankings` stub 제거 및 leaderboard alias 연결
