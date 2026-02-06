문서 타입: 운영/어드민 SoT
버전: v1.2
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

## 4. 빌더 워크플로
1) 프리셋 선택: 카테고리 및 action_type 자동 설정
2) 목표값 입력: logic_key 및 제목 자동 갱신
3) 보상 설정: reward_type/amount/xp_reward 입력
4) 저장 전 검증: logic_key 전역 UNIQUE, 논리적 중복 경고 확인

## 5. 프리셋 확장 요약
- DAILY/WEEKLY/NEW_USER 프리셋이 게임별로 분리됨
- 게임별 action_type: PLAY_DICE, PLAY_ROULETTE, PLAY_LOTTERY
- 공통 게임: PLAY_GAME
- 골든아워: GOLDEN_HOUR_PLAY (logic_key에 golden_hour 포함)

## 6. RewardType 정합성
- FE enum은 백엔드 MissionRewardType 전체를 포함해야 함
- 어드민 드롭다운 값은 백엔드 enum과 매핑 필요
- gifticon/티켓류 누락 시 500 발생 가능

### 6.1 검증 체크
- 저장 직후 DB에 reward_type이 누락 없이 반영되는지 확인
- FE enum 드리프트 발생 시 즉시 동기화

## 7. 어드민 기능(검증 완료)
- POST /api/v2/admin/game/missions/reset-user/{user_id}
- POST /api/v2/admin/streak-rewards/distribute-milestone-reward
- GET /api/v2/admin/users/{user_id}/missions
- GET /api/v2/admin/game/missions/login-verify
- 스트릭 보상 규칙 UI 설정키: streak_reward_rules

### 7.1 스트릭 보상 규칙 JSON 예시
```json
{
  "rules": [
    {
      "day": 3,
      "enabled": true,
      "grants": [{"kind": "WALLET", "token_type": "DICE_TOKEN", "amount": 100}]
    }
  ]
}
```

## 8. 운영 가드레일
- logic_key 충돌 시 저장 금지(전역 UNIQUE)
- category 변경 시 reset_date 포맷 재확인
- reward_type 변경 시 FE enum/아이콘 동기화 확인

## 9. 참고 문서(아카이브)
- [docs/SOT/mission/archive/20260127_mission_admin_builder_rules_update.md](docs/SOT/mission/archive/20260127_mission_admin_builder_rules_update.md)
- [docs/SOT/mission/archive/20260127_mission_builder_auto_logickey_update.md](docs/SOT/mission/archive/20260127_mission_builder_auto_logickey_update.md)
- [docs/SOT/mission/archive/20260127_mission_preset_expansion.md](docs/SOT/mission/archive/20260127_mission_preset_expansion.md)
- [docs/SOT/mission/archive/20260126_mission_rewardType_enum_drift_update.md](docs/SOT/mission/archive/20260126_mission_rewardType_enum_drift_update.md)
- [docs/SOT/mission/archive/20260130_mission_admin_features_update.md](docs/SOT/mission/archive/20260130_mission_admin_features_update.md)
- [docs/SOT/mission/archive/20260127_mission_error_update.md](docs/SOT/mission/archive/20260127_mission_error_update.md)

## 10. 변경 이력
- v1.2 (2026-02-07, GitHub Copilot): 운영 가드레일 추가
- v1.1 (2026-02-07, GitHub Copilot): 빌더 워크플로 및 검증 체크 확장
- v1.0 (2026-02-07, GitHub Copilot): 어드민/빌더/보상 규칙 통합 정리
