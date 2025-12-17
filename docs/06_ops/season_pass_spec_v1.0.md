# 레벨 XP/보상 스펙 v1.0 (가이드)

## 1. 레벨 요구 XP 및 보상 (7단계)
| 레벨 | 필요 XP | 보상 | 비고 |
|---|---|---|---|
| 1 | 40  | 티켓 1장  | auto-claim 권장 |
| 2 | 100 | 티켓 2장  | auto-claim 가능 |
| 3 | 180 | 티켓 3장  | 수동 클레임 허용 |
| 4 | 300 | 티켓 4장  | 수동 클레임 |
| 5 | 450 | 티켓 5장  | 수동 클레임 |
| 6 | 600 | 티켓 6장  | 수동 클레임 |
| 7 | 1000| 티켓 10장 | 최종 보상 |

- 스탬프당 기본 XP: 20
- 게임별 추가 XP: 각 게임 서비스에서 `xp_bonus=10` 전달 시 합산 (서비스 내부 자동 가산 없음)
- 보상 타입: 티켓(LOTTERY/DICE/ROULETTE 등)으로 실제 지급 타입/수량을 운영 정책에 맞춰 매핑 필요

## 2. XP 적립 규칙 (스탬프 지급 트리거)
- **CC랭킹 TOP10**: 주간 최종 집계 시 순위 10위 이내 → 스탬프 1개(20 XP) 주간 1회
- **CC사이트 일일 이용**: 플레이 수 0→1 달성 시 스탬프 1개(20 XP), 일 1회
- **CC 입금 10만원마다**: 10만원 달성마다 스탬프 1개(20 XP), 일 단위 누적/리셋
- **각종 티켓 게임**: 게임 내부 보상 정책에 따라 스탬프 지급, 필요 시 `xp_bonus=10` 추가

## 3. Reset/중복 방지 정책
- 랭킹: 주간 단위 집계 후 지급, 동일 주간 중복 지급 방지(주간 period_key 필요)
- 일일 이용/입금: 일 단위로 리셋, 동일 일자 중복 지급 방지(일자 period_key)
- 스탬프 로그 유니크: `(user_id, season_id, source_feature_type, period_key)`

## 4. 테이블/서비스 연계 메모
- 테이블: `season_pass_config`, `season_pass_level`, `season_pass_progress`, `season_pass_stamp_log`, `season_pass_reward_log`
- 서비스: `SeasonPassService.add_stamp`가 base XP + xp_bonus를 더해 XP/레벨/보상 로그를 처리
- API: `/api/season-pass/status`, `/stamp`, `/claim`, `/internal-wins`

## 5. 운영 반영 체크리스트
- 시즌/레벨 시드: 위 표대로 `season_pass_level` 1~7단계 삽입
- 보상 타입/수량을 실제 티켓 체계에 맞게 지정 (예: LOTTERY_TICKET/DICE_TOKEN/ROULETTE_COIN)
- 게임 서비스에서 스탬프 지급 시 `period_key` 정책(일/주/회차) 맞춰 `add_stamp` 호출, 필요 시 `xp_bonus=10`
- 프론트/백엔드 UI가 7단계/보상 정보를 올바로 표시하는지 `/api/season-pass/status`로 확인
