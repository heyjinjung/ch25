문서 타입: 운영/어드민 SoT
버전: v1.0
작성일: 2026-02-07
작성자: GitHub Copilot
대상: 어드민 운영/FE/BE
상태: Stable

## 1. 목적
어드민 미션 관리(빌더/프리셋/보상) 규칙을 통합 정리한다.

## 2. 핵심 개념
- category: 리셋/집계 정책(DAILY/WEEKLY/NEW_USER/SPECIAL)
- action_type: 진행 트리거(update_progress 매칭)
- logic_key: 전역 UNIQUE 식별자(충돌 시 생성 불가)
- condition: 표시용 설명(실제 로직 조건 아님)

## 3. 자동 logic_key 생성 규칙
- 프리셋 + 카테고리 + 목표값을 조합해 자동 생성
- 예시:
  - DAILY + DAILY_PLAY_GENERIC + 1 -> DAILY_DAILY_PLAY_GENERIC_1
  - WEEKLY + DAILY_PLAY_GENERIC + 10 -> WEEKLY_DAILY_PLAY_GENERIC_10
- 논리적 중복 경고: 동일 카테고리 + 동일 action_type + 동일 목표값

## 4. 프리셋 확장 요약
- DAILY/WEEKLY/NEW_USER 프리셋이 게임별로 분리됨
- 게임별 action_type: PLAY_DICE, PLAY_ROULETTE, PLAY_LOTTERY
- 공통 게임: PLAY_GAME
- 골든아워: GOLDEN_HOUR_PLAY (logic_key에 golden_hour 포함)

## 5. RewardType 정합성
- FE enum은 백엔드 MissionRewardType 전체를 포함해야 함
- 어드민 드롭다운 값은 백엔드 enum과 매핑 필요
- gifticon/티켓류 누락 시 500 발생 가능

## 6. 어드민 기능(검증 완료)
- POST /api/v2/admin/game/missions/reset-user/{user_id}
- POST /api/v2/admin/streak-rewards/distribute-milestone-reward
- GET /api/v2/admin/users/{user_id}/missions
- GET /api/v2/admin/game/missions/login-verify
- 스트릭 보상 규칙 UI 설정키: streak_reward_rules

## 7. 참고 문서(아카이브)
- [docs/SOT/mission/archive/20260127_mission_admin_builder_rules_update.md](docs/SOT/mission/archive/20260127_mission_admin_builder_rules_update.md)
- [docs/SOT/mission/archive/20260127_mission_builder_auto_logickey_update.md](docs/SOT/mission/archive/20260127_mission_builder_auto_logickey_update.md)
- [docs/SOT/mission/archive/20260127_mission_preset_expansion.md](docs/SOT/mission/archive/20260127_mission_preset_expansion.md)
- [docs/SOT/mission/archive/20260126_mission_rewardType_enum_drift_update.md](docs/SOT/mission/archive/20260126_mission_rewardType_enum_drift_update.md)
- [docs/SOT/mission/archive/20260130_mission_admin_features_update.md](docs/SOT/mission/archive/20260130_mission_admin_features_update.md)
- [docs/SOT/mission/archive/20260127_mission_error_update.md](docs/SOT/mission/archive/20260127_mission_error_update.md)

## 8. 변경 이력
- v1.0 (2026-02-07, GitHub Copilot): 어드민/빌더/보상 규칙 통합 정리
