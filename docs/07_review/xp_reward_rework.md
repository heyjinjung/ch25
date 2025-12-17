# XP/보상 재설계 제안서

## 1. 목표
- 게임별 XP 지급을 고정: 기본 5 XP, 주사위 승리만 20 XP, 룰렛/복권은 5 XP.
- 외부랭킹 예치 10만당 20 XP(스텝당 20). play_count로는 XP 미지급.
- 기존 레벨 테이블(1~7레벨: 40/100/180/300/450/600/1000 XP)과 자동 보상 유지.
- 이미 지급된 티켓/쿠폰/XP 로그 초기화 후, 현재 DB 기준으로 XP 재계산 및 보상 재발급.

## 2. 현행 문제
- 외부랭킹 업서트 시 예치/플레이 증분만큼 XP가 그대로 누적되어 “몇백 XP”가 한 번에 지급됨.
- RewardService에서 POINT 보상을 XP로 그대로 더해 과다 지급 가능.
- play_count에도 xp_per_step가 적용되어 사용량 대비 과다 XP 가능.

## 3. 변경 사양 (확정 필요)
### 3.1 XP 지급 규칙
- 기본 플레이 XP: 5.
- 주사위 게임: 승리 시 20 XP, 그 외(패/무승부/일반 플레이) 5 XP.
- 룰렛/복권: 항상 5 XP.
- POINT → XP 전환: 보상 포인트와 무관하게 5 XP로 고정(또는 전환 비활성).

### 3.2 외부랭킹 XP
- step_amount = 100,000 KRW.
- xp_per_step = 20.
- play_count XP: 0(미지급).
- max_steps_per_day: 50(= 예치 1,000,000까지 1,000 XP/일 상한) → 조정 원하면 요청.
- cooldown_minutes: 30분 권장(없애고 싶으면 0).

### 3.3 레벨 테이블(변경 없음)
- 1: 40 XP, 룰렛티켓 1장 (자동)
- 2: 100 XP, 주사위티켓 2장 (자동)
- 3: 180 XP, 복권티켓 2장 (자동)
- 4: 300 XP, 편의점 1만 쿠폰 (수동)
- 5: 450 XP, 룰렛티켓 3장 (자동)
- 6: 600 XP, 복권티켓 3장 (자동)
- 7: 1000 XP, 배민 2만 쿠폰 (수동)

## 4. DB 정리 범위 (초기화)
- XP/레벨/티켓 관련 로그 및 잔액 전체 삭제:
  - user_xp_event_log
  - user_level_reward_log
  - user_game_wallet
  - user_game_wallet_ledger
- 선택(레벨까지 초기화 시): season_pass_stamp_log, season_pass_progress
- external_ranking_data는 유지(재계산 소스).

## 5. 재계산 로직
- 입력: external_ranking_data.deposit_amount
- 스텝 계산: steps = floor(deposit_amount / 100000)
- XP = steps * 20
- play_count는 0 처리(미사용)
- 사용자별 XP를 LevelXPService.add_xp로 반영 → 자동 보상 재발급
- (향후) 게임별 플레이/승리 테이블이 있으면: 플레이당 5 XP, 주사위 승리당 추가 15 XP(총 20)로 후처리 가능

## 6. 필요 정보/확인 방법
1) 내부 게임 플레이/승리 집계 테이블 존재 여부
   - 테이블 목록 확인: `docker compose exec db mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -e "USE xmas_event; SHOW TABLES;"`
   - 플레이 기록 테이블(예: user_event_log, dice_play_log 등)이 있으면 알려주면 후처리 XP에 반영 가능.
2) play_count XP: 0으로 막는 것 동의 여부.
3) max_steps_per_day, cooldown_minutes 최종값.
4) 전체 유저 티켓/XP/레벨 로그 초기화 동의 여부.

## 7. 코드 변경 포인트
- dice_service / roulette_service / lottery_service: XP 상수 적용(기본 5, 주사위 승리 20).
- reward_service: POINT → XP 전환을 5로 clamp 또는 비활성화.
- admin_external_ranking_service: play_count XP 제거, step_amount=100000, xp_per_step=20 고정, 상한/쿨다운 반영.

## 8. 운영 절차 (합의 후)
1) DB 백업: `docker compose exec db sh -c 'mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" xmas_event > /tmp/xmas_event_backup.sql'`
2) 초기화 스크립트 실행(동의 범위에 따라 truncate).
3) 재계산 스크립트 실행(external_ranking_data 기반 XP 적재).
4) 코드 수정 → `docker compose build --no-cache && docker compose up -d`.
5) 샘플 사용자로 XP/레벨/티켓/쿠폰 지급 정상 확인.

## 9. 리스크 및 주의
- 초기화 후 되돌리기 어렵습니다 → 백업 필수.
- play_count를 0 처리하면 과거 플레이 기반 XP는 모두 사라집니다(대신 예치 기반만 반영).
- 쿨다운/상한을 0으로 두면 다시 과다 XP가 가능하므로 조정값을 확정해야 합니다.

## 10. 요청 사항
- 위 6번 질문(1~4)에 대한 확정 답변.
- 쿨다운/상한 최종 수치.
- 플레이 로그 테이블이 있으면 이름/스키마 공유.
