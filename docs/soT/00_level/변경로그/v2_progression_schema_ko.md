문서 타입: 데이터 스키마 / 아키텍처 표준
버전: v2.0
작성일: 2026-01-19
작성자: GitHub Copilot
대상: BE/FE/운영
상태: SoT

## 1. 목적 (Purpose)
- V2 성장 시스템의 데이터 구조와 응답 규격을 정의한다.
- 시즌 패스 용어를 제거하고 **레벨/레벨포인트** 중심으로 통일한다.

## 2. 시스템 구조 (System Architecture)
V2는 **단일 레벨 시스템**만 사용한다.

| 성장 시스템 | SoT | 특징 |
| :--- | :--- | :--- |
| 레벨 (Level) | level_point | 영구 지속. 접속/활동 전반 성장 척도. |

## 3. 레벨 스키마 (Level Schema)

### 3.1 상태 조회 (Status)
**Schema**: LevelStatusResponse (V2)

```json
{
  "current_level": 5,
  "current_level_point": 1250,
  "next_level": 6,
  "next_required_point": 2000,
  "point_to_next": 750,
  "rewards": [
    {
      "level": 2,
      "reward_type": "POINT",
      "reward_payload": {"amount": 500},
      "auto_granted": true,
      "granted_at": "2026-01-01T10:00:00"
    }
  ]
}
```

### 3.2 데이터 모델 (DB Model)
**Table**: user_level_progress
- user_id: PK
- level: Integer (Default 1)
- xp: Integer (Default 0) → **level_point로 해석**

**Table**: user_level_reward_log
- level: 보상 지급 레벨
- reward_type: 보상 타입
- reward_payload: JSON (보상 내용)

## 4. 레벨포인트 규칙 (SoT)
- 레벨포인트 SoT: level_point (GAME_XP)
- 레벨포인트는 GAME_XP로만 획득한다.
- 금고포인트와 무관하다.

## 5. 이벤트 로그 (Level Point Audit)
레벨포인트 변동은 user_xp_event_log에 기록한다.

| 필드 | 설명 | 예시 |
| :--- | :--- | :--- |
| source | 레벨포인트 획득 원천 | GAME_PLAY(대기), MISSION_CLEAR(간헐적), ADMIN_ADJUST(주요), CC_DEPOSIT(10만원당 20) |
| delta | 변동량 (+/-) | +20, -10 |
| meta | 상세 문맥 | {"game_id": "123", "result": "WIN"} |

## 6. 폐기/비사용 항목
- 시즌 패스(Season Pass) 구조는 V2에서 사용하지 않는다.

## 7. 운영/검증 (QA)
- [ ] 레벨포인트 필드가 xp로 저장되어도 level_point로 해석되는지 확인
- [ ] 시즌 패스 용어/필드 미사용 확인

## 8. 변경 이력
- v2.0 (2026-01-19, GitHub Copilot): v1 스키마를 V2 레벨 기준으로 이관
