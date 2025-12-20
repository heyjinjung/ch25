# 시즌패스 단일 레벨/XP 기준(통합)

이 문서는 레벨/진행도를 **시즌패스(Season Pass)** 한 가지로 통합한 기준 문서입니다.

중요: 과거의 글로벌 코어 레벨XP(`LevelXPService`, `/api/level-xp/*`)는 현재 UI/운영 기준에서 사용하지 않으며, 백엔드 라우터 노출도 중단되었습니다.

## 1) 단일 기준(시즌패스) 원칙
- 기준 데이터: `season_pass_level.required_xp`(레벨업 임계치), `season_pass_progress.current_xp/current_level`
- 레벨업 판정: `current_xp >= required_xp`인 레벨들을 달성으로 판단
- 중복 지급 방지: `season_pass_reward_log`의 Unique(`user_id`, `season_id`, `level`)로 1회만 지급
- auto_claim:
  - `auto_claim=true`이면 XP가 추가되는 흐름(스탬프/보너스XP)에서 자동 지급 시도
  - `auto_claim=false`이면 `POST /api/season-pass/claim`로 수동 청구

근거 구현
- 백엔드: `SeasonPassService` ([app/services/season_pass_service.py](../app/services/season_pass_service.py))
- 모델: 시즌패스 테이블/로그 ([app/models/season_pass.py](../app/models/season_pass.py))
- API: 시즌패스 엔드포인트 ([app/api/routes/season_pass.py](../app/api/routes/season_pass.py))

## 2) XP/스탬프 적립 규칙(현행 코드 그대로)

### 2.1 외부랭킹 입금액 기반 보너스 XP
- 경로: 관리자 업서트  예치 증분을 10만원 단위로 환산해 XP 지급
- 기본 상수: `STEP_AMOUNT=100_000`, `XP_PER_STEP=20` (즉 10만원당 20XP)
- Anti-abuse:
  - 사용자별 `deposit_remainder` 누적
  - 일일 baseline(리셋) 고려
  - 쿨다운(minutes) 내 지급 보류 (remainder만 저장)
- 근거 구현: [app/services/admin_external_ranking_service.py](../app/services/admin_external_ranking_service.py)

### 2.2 외부랭킹 TOP10 스탬프(주간 1회)
- 경로: 관리자 업서트에서 TOP10 계산 후 지급
- 기준: ISO week 단위 1회(중복 방지)
- 근거 구현: [app/services/admin_external_ranking_service.py](../app/services/admin_external_ranking_service.py)

### 2.3 내부게임 승리 50회 스탬프(시즌 1회)
- 기준: 주사위 WIN + 룰렛/복권 reward_amount>0 승리 합산이 50회 이상
- 중복 방지: `source_feature_type="INTERNAL_WIN_50"`, `period_key="INTERNAL_WIN_50"`로 1회만 지급
- 근거 구현:
  - [app/services/season_pass_service.py](../app/services/season_pass_service.py) `maybe_add_internal_win_stamp()` / `get_internal_win_progress()`
  - 호출: [app/services/dice_service.py](../app/services/dice_service.py), [app/services/roulette_service.py](../app/services/roulette_service.py), [app/services/lottery_service.py](../app/services/lottery_service.py)

### 2.4 (옵션) 게임 보상 포인트  시즌패스 보너스 XP
- 조건: `XP_FROM_GAME_REWARD=true`일 때만 동작
- 조건: reward_type이 `POINT`이고, meta.reason이 `dice_play|roulette_spin|lottery_play`인 경우
- XP량: `meta.game_xp` 우선, 없으면 5
- 근거 구현: [app/services/reward_service.py](../app/services/reward_service.py)

### 2.5 스탬프 API(직접 호출)
- `POST /api/season-pass/stamp`는 `base_xp_per_stamp * stamp_count + xp_bonus`만큼 XP를 추가하고, 레벨업/보상까지 처리
- 근거 구현: [app/api/routes/season_pass.py](../app/api/routes/season_pass.py)

## 3) 프론트 진행도(%) 계산 공식
프론트는 서버가 퍼센트를 내려주지 않고, `current_xp`와 `levels[].required_xp`로 구간 퍼센트를 계산합니다.

- 구현: [src/components/season-pass/SeasonPassBar.tsx](../src/components/season-pass/SeasonPassBar.tsx), [src/pages/SeasonPassPage.tsx](../src/pages/SeasonPassPage.tsx)
- 규칙:
  - MAX: `current_level >= max_level` 또는 `current_xp >= max(required_xp)`이면 100%
  - 그 외: 현재 XP가 속한 구간(startXp~endXp)의 비율을 `floor()`로 계산하되, 아직 남은 XP가 있으면 99%로 cap

## 4) 레거시(코어 레벨XP) 처리 방침
- 과거 구현물(테이블/서비스)은 DB에 남아있을 수 있으나, 운영 기준/UX 기준에서는 사용하지 않습니다.
- 백엔드에서 `/api/level-xp/*`는 라우팅에서 제외되어 외부 노출을 중단합니다.
