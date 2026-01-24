# 성장 및 프로그레션 스키마 SoT (Progression & Leveling Schema)

**문서 타입**: 데이터 스키마 / 아키텍처 표준
**버전**: v1.0
**작성일**: 2026-01-16
**상태**: SoT (Source of Truth)

---

## 1. 목적 (Purpose)
- 유저의 성장 시스템인 **글로벌 레벨(Global Level)**과 **시즌 패스(Season Pass)** 데이터의 구조를 정의한다.
- 프론트엔드 레벨업 게이지, 보상 수령 상태 등을 그리기 위한 **API 응답 표준**을 제공한다.
- 실제 구현된 Backend Models/Schemas와 100% 일치함을 보장한다.

---

## 2. 시스템 구조 (System Architecture)
이 프로젝트는 두 가지 독립적인 성장 축을 가지고 있습니다.

| 성장 시스템 | 모델 (Table) | 스키마 (API) | 특징 |
| :--- | :--- | :--- | :--- |
| **글로벌 레벨 (Start Level)** | `user_level_progress` | `LevelXPStatusResponse` | 영구 지속. 접속/활동 전반적인 성장 척도. |
| **시즌 패스 (Season Pass)** | `season_pass_progress` | `SeasonProgress` | 기간 한정(예: 1월 시즌). 초기화됨. |

---

## 3. 글로벌 레벨 스키마 (Global Level Schema)

### 3.1 상태 조회 (Status)
**API**: `GET /api/level-xp/status`  
**Schema**: `LevelXPStatusResponse` (`app/schemas/level_xp.py`)

```json
{
  "current_level": 5,           // 현재 레벨
  "current_xp": 1250,           // 현재 누적 XP
  "next_level": 6,              // 다음 도달 레벨 (만렙 시 null)
  "next_required_xp": 2000,     // 다음 레벨업에 필요한 총 XP (절대값)
  "xp_to_next": 750,            // 남은 XP (next - current)
  "rewards": [                  // 수령한 보상 로그
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
**Table**: `user_level_progress`
- `user_id`: PK
- `level`: Integer (Default 1)
- `xp`: Integer (Default 0)

**Table**: `user_level_reward_log`
- `level`: 보상 지급된 레벨
- `reward_type`: 보상 종류
- `reward_payload`: JSON (구체적 보상 내용)

---

## 4. 시즌 패스 스키마 (Season Pass Schema)

### 4.1 시즌 정보 및 진행 (Season Info & Progress)
**API**: `GET /api/season-pass/status`  
**Schema**: `SeasonUserStatusResponse` (`app/schemas/season_pass.py`)

```json
{
  "season": {
    "id": 1,
    "season_name": "2026 New Year Season",
    "start_date": "2026-01-01",
    "end_date": "2026-01-31",
    "max_level": 30,
    "base_xp_per_stamp": 100
  },
  "progress": {
    "current_level": 12,        // 현재 시즌 레벨
    "current_xp": 1200,         // 시즌 누적 XP (레벨업 후 소진되지 않고 계속 누적)
    "total_stamps": 12,         # 찍은 스탬프 수
    "next_level_xp": 1300       # 다음 레벨 도달 XP 임계치
  },
  "levels": [                   // 전체 레벨 트랙 (UI 렌더링용)
    {
      "level": 1,
      "required_xp": 100,
      "reward_type": "ROULETTE_COIN",
      "reward_amount": 1,
      "is_unlocked": true,
      "is_claimed": true,
      "reward_label": "룰렛 티켓 1장"
    },
    {
      "level": 2,
      "required_xp": 200,
      "reward_type": "POINT",
      "reward_amount": 500,
      "is_unlocked": true,      // 도달함
      "is_claimed": false,      // 아직 미수령 (수동 수령인 경우)
      "reward_label": "500P"
    }
  ]
}
```

### 4.2 데이터 모델 (DB Model)
**Table**: `season_pass_progress`
- `current_level`: 현재 레벨
- `current_xp`: 현재 XP

**Table**: `season_pass_level` (Static Data)
- `level`: 레벨
- `required_xp`: 해당 레벨 도달에 필요한 누적 XP
- `reward_type`: 보상 타입
- `reward_amount`: 보상 수량

---

## 5. XP 이벤트 로그 (XP Audit Schema)

XP 변동 내역은 `user_xp_event_log`에 기록되며, 운영툴(Admin)이나 유저 상세 조회 시 사용됩니다.

**Schema**: `UserXpEventLog` (`app/models/level_xp.py`)

| 필드 | 설명 | 예시 |
| :--- | :--- | :--- |
| `source` | XP 획득 원천 | `GAME_PLAY`, `MISSION_CLEAR`, `ADMIN_ADJUST` |
| `delta` | 변동량 (+/-) | `+50`, `-10` |
| `meta` | 상세 문맥 (JSON) | `{"game_id": "123", "result": "WIN"}` |

---

**작성자**: GitHub Copilot  
**마지막 업데이트**: 2026-01-16
