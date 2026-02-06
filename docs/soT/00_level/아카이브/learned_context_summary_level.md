# Learned Context Summary: Level (레벨)

## 1. 레벨 시스템 및 정책 (Level System & Policy)
- **단일 레벨 시스템 (Single Level System)**: V2는 'Season Pass' 용어를 폐기하고 **단일 레벨** 시스템을 사용한다.
- **영구 지속**: 레벨과 포인트는 초기화되지 않고 영구적으로 유지된다.
- **용어 정의**:
    - **레벨포인트 (Level Point)**: 유저 성장의 척도. 내부적으로 `GAME_XP`로 취급된다.
    - **금고포인트와 무관**: 금고(Vault)의 재화와는 완전히 분리된 시스템이다.

## 2. 포인트 획득 원천 (Point Sources)
- **SoT**: `level_point` (GAME_XP)
- **주요 획득 경로**:
    - **CC 입금**: 100,000원 당 **20 Point** 적립 (`v2_level_point_extension_sot_ko.md`)
    - **게임 플레이**: (제안/미구현 상태) 룰렛, 주사위, 복권 등의 플레이를 통한 획득은 현재 '제안 수령' 단계임.
    - GAME_XP 외의 다른 Reward Type으로 레벨포인트를 적립해선 안 된다.

## 3. DB 스키마 및 매핑 (DB Schema & Mapping)
- **Primary SoT (2026-02-04~)**: `v2_user`
    - `level` (Integer, Default 1)
    - `xp` (Integer, Default 0)
- **레거시 Mirror(동기화)**: `user_level_progress`
    - `user_id` (PK)
    - `level` (Integer, Default 1)
    - `xp` (Integer, Default 0) -> 문서상의 **`level_point` 논리명과 매핑됨**
- **로그 테이블**:
    - `user_xp_event_log`: XP 변동 이력 (`source` 예: `CC_DEPOSIT`, `delta`, `meta`)
    - `user_level_reward_log`: 레벨 달성 보상 지급 이력 (`level`, `reward_type`, `payload`)

## 4. 레벨 보상 테이블 (1~20Lv, 1개월 기준)
- **데이터 출처**: `season_pass_level` 테이블 덤프 (2026-01-26 기준)
- **주요 보상**:
    - **티켓**: 룰렛(ROULETTE), 주사위(DICE), 복권(LOTTERY)
    - **키**: 골드키(GOLD_KEY), 다이아키(DIAMOND_KEY)
    - **기타**: 배민 상품권 (Lv 6)
- **보상 예시**:
    - Lv 1: 룰렛티켓 1
    - Lv 10: 골드키 1
    - Lv 20: 다이아키 5

## 5. 검증 체크리스트 (Validation Checkpoints)
- [ ] **용어 폐기 확인**: 코드 내 `Season Pass` 관련 로직이나 용어가 남아있는지 확인 (V2는 단일 레벨).
- [ ] **필드 매핑**: `user_level_progress.xp`가 `level_point`로 정확히 해석되고 사용되는지.
- [ ] **CC 적립**: 입금 시 `GAME_XP` 타입으로 100k당 20포인트가 적립되는 로직 존재 여부.
- [ ] **보상 정합성**: DB의 레벨 테이블 데이터가 SoT(Lv 1~20)와 일치하는지.

---

## 6. API 및 통합 (Phase 2: API & Integration)
- **User Object**: `/api/auth/token` 등에서 반환되는 유저 객체에 기본적으로 `level` (Int) 필드가 포함된다. `season_pass` 객체는 포함되지 않음.
- **Game API Legacy**: `GET /status`, `POST /play` (Roulette/Dice/Lottery) 응답에 `season_pass` 필드가 존재하지만, **항상 `null`을 반환**해야 한다. (Season Pass 폐기 정책 준수)
- **XP Exposure**:
    - **Mission**: `/api/v2/mission/` 응답의 `Mission` 객체에 `xp_reward` 필드가 존재한다 (기본값 0).
    - **Game Play**: 게임 플레이 응답에는 XP 획득량이 명시적으로 포함되어 있지 않음 (`vault_earn`만 존재). 게임 레벨포인트 적립이 '미구현' 상태임과 일치함.
- **Activity Tracking**: `/api/activity/record`는 `event_type`과 `value`를 받지만, 직접적인 XP 적립 응답을 주지는 않음 (비동기 처리 또는 로깅용).

---

## 7. DB 구조 검증 (Phase 3: DB Structure)
- **SoT 통합**: 2026-02-04부터 `v2_user`는 유저 식별 + 금고 + **Level/XP + 입금 누적**까지 포함하는 Primary SoT로 통합되었다.
- **레거시 호환**: `user_level_progress`는 Level/XP의 레거시 Mirror로 유지되며, 신규 판단 기준은 `v2_user`를 따른다.
- **보상 테이블**: `v2_level_reward_table` (`v2_db_level_reward_table_ko.md`)이 존재하며 `level`, `required_xp`, `reward_type`, `reward_amount` 컬럼으로 보상표를 물리적으로 저장한다.
    - `reward_payload` (JSON) 컬럼이 있어 `GIFTICON` 등의 메타데이터 확장이 가능하다.


