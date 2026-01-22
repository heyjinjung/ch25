# XMAS 지급/보상 시스템 v1→v2 이관 현황 맵핑 (2026-01-30 기준)

## 1. 전체 기능/플로우 맵핑 (이관상태 표기 없음)

| 도메인/기능         | 세부 항목/설명                | 백엔드 플로우 | DB 필드 | 실제테스트 | API/운영로그 |
|---------------------|------------------------------|---------------|---------|-------------|---------------|
| 가입/인증           | 회원가입/로그인/2FA           | v1: FastAPI OAuth2, JWT, 2FA 모듈 / v2: FastAPI OAuth2, JWT, 2FA(리팩토링, 정책 강화) | v1: user, user_auth, user_2fa 등 / v2: user_v2, user_auth_v2, user_2fa_v2 등 | v1: tests/test_auth.py, tests/test_user.py / v2: tests/v2/test_auth_v2.py, tests/v2/test_user_v2.py | v1: /api/auth/*, /api/user/* / v2: /api/v2/auth/*, /api/v2/user/* |
| 대시보드            | 메인/요약/통계                | (코드/엔드포인트/로직 명칭 미발견) | (DB 필드 미발견) | (테스트 파일 미발견) | (API/운영로그 미발견) |
| 게임진행            | 룰렛4종/주사위/복권<br>주사위 골든아워/복권조각모음 이벤트 | 
v1: app/services/roulette_service.py, dice_service.py, lottery_service.py 등<br>v2: app/v2/services/v2_roulette_service.py, v2_dice_service.py, v2_lottery_service.py 등<br>골든아워: app/services/event_service.py, app/v2/services/v2_event_service.py<br>조각모음: app/services/lottery_piece_service.py 등 | 
v1: roulette, dice, lottery, event, piece 등<br>v2: v2_roulette, v2_dice, v2_lottery, v2_event, v2_piece 등 | 
v1: tests/test_roulette_logic.py, tests/test_dice_integration.py, tests/test_lottery_status.py<br>v2: tests/v2_tests/phase3_game/test_dice_admin_integration.py, tests/v2_tests/phase4_admin/test_admin_game_config_routes_coverage_extended.py, tests/v2_tests/phase3_game/test_dice_event_integration.py, tests/v2_tests/phase3_game/test_dice_golden_hour_conflict.py 등 | 
v1: /api/roulette/*, /api/dice/*, /api/lottery/*, /api/event/*<br>v2: /api/v2/roulette/*, /api/v2/dice/*, /api/v2/lottery/*, /api/v2/event/* |
| 라이브피드          | 실시간 피드                   | (코드/DB/API/테스트 미발견) | (DB 필드 미발견) | (테스트 파일 미발견) | (API/운영로그 미발견) |
| 주사위 골든아워     | 골든아워 이벤트               | v1: (코드/DB/API/테스트 미발견)<br>v2: app/v2/services/v2_dice_service.py, app/v2/services/v2_event_service.py 등 | v1: (DB 미발견)<br>v2: v2_dice_config.enable_golden_hour, v2_dice_config.golden_hour_multiplier 등 | v1: (테스트 미발견)<br>v2: tests/v2_tests/phase3_game/test_dice_admin_integration.py (test_golden_hour_multiplier_applied 등) | v1: (API 미발견)<br>v2: /api/v2/dice/*, /api/v2/event/* | v2: add_golden_hour_columns.py, src/v2/pages/vault/VaultPage.tsx, src/components/layout/AppHeader.tsx, src/components/layout/GoldenHourTimer.tsx 등 | v2: multiplier/enable 필드, 프론트 연동, 실제 배율 적용 테스트 통과 |
| 기타 배팅           | 기타 게임/베팅                | (코드/DB/API/테스트 미발견) | (DB 필드 미발견) | (테스트 파일 미발견) | (API/운영로그 미발견) |
| 게임로직            | 룰/결과/보상                  | v1: app/services/roulette_service.py, dice_service.py, lottery_service.py 등<br>v2: app/v2/services/v2_roulette_service.py, v2_dice_service.py, v2_lottery_service.py 등 | v1: roulette, dice, lottery 등<br>v2: v2_roulette, v2_dice, v2_lottery 등 | v1: tests/test_roulette_logic.py, tests/test_dice_integration.py, tests/test_lottery_status.py<br>v2: tests/v2_tests/phase3_game/test_dice_admin_integration.py, tests/v2_tests/phase4_admin/test_admin_game_config_routes_coverage_extended.py, tests/v2_tests/phase3_game/test_dice_event_integration.py 등 | v1: /api/roulette/*, /api/dice/*, /api/lottery/*<br>v2: /api/v2/roulette/*, /api/v2/dice/*, /api/v2/lottery/* |
| 게임결과            | 결과 집계/노출                | v1: app/services/roulette_service.py, dice_service.py, lottery_service.py 등<br>v2: app/v2/services/v2_roulette_service.py, v2_dice_service.py, v2_lottery_service.py 등 | v1: roulette, dice, lottery 등<br>v2: v2_roulette, v2_dice, v2_lottery 등 | v1: tests/test_roulette_logic.py, tests/test_dice_integration.py, tests/test_lottery_status.py<br>v2: tests/v2_tests/phase3_game/test_dice_admin_integration.py, tests/v2_tests/phase4_admin/test_admin_game_config_routes_coverage_extended.py, tests/v2_tests/phase3_game/test_dice_event_integration.py 등 | v1: /api/roulette/*, /api/dice/*, /api/lottery/*<br>v2: /api/v2/roulette/*, /api/v2/dice/*, /api/v2/lottery/* |
| 상점                | 상품구매/교환                 | (코드/DB/API/테스트 미발견) | (DB 필드 미발견) | (테스트 파일 미발견) | (API/운영로그 미발견) |
| 인벤토리            | 적립/교환/잔액                |               |         |             |               |
| 유저 활동 로그      | 활동/이벤트/로그              |               |         |             |               |
| 골든프로젝트        | 골든아워/특수이벤트           |               |         |             |               |
| 세그먼트            | 유저 그룹/분류                |               |         |             |               |
| 메시지발송          | 알림/DM/푸시                  |               |         |             |               |
| 설문조사            | 설문/피드백                   |               |         |             |               |
| 미션                | 미션/보상                     |               |         |             |               |
| 연속스트릭 오류이슈 | 스트릭/보상/오류              |               |         |             |               |
| 텔레그램 오류이슈   | 연동/해제/오류                |               |         |             |               |
| 이벤트              | 모달/팝업/설계관리            |               |         |             |               |
| cc입금/수동입력     | 입금/수동처리                 |               |         |             |               |
| 레벨시스템          | 레벨/업/보상                  |               |         |             |               |
| 운영계획/로그/마케팅| 운영/로그/마케팅              |               |         |             |               |

---

## 2. 지급/보상 관련 v1→v2 이관 현황 (사실 근거 기반)

| 지급/보상 항목      | v1 | v2 | 이관상태 | 백엔드 플로우 | DB 필드 | 실제테스트 | API/운영로그 | 근거(문서/코드/운영 등) | 변환값/특이사항 메모 |
|---------------------|----|----|---------|---------------|---------|-------------|---------------|-------------------------|---------------------|
| 티켓                | O  | O  | 미확인  |               |         |             |               |                         |                     |
| 깁콘                | O  | O  | 미확인  |               |         |             |               |                         |                     |
| 금고                | O  | O  | 미확인  |               |         |             |               |                         |                     |
| 코인                | O  | O  | 미확인  |               |         |             |               |                         |                     |
| 조각                | O  | O  | 미확인  |               |         |             |               |                         |                     |
| 금고 출금조건       | O  | O  | 미확인  |               |         |             |               |                         |                     |
| 금고 적립조건       | O  | O  | 미확인  |               |         |             |               |                         |                     |
| 금고 관리자수동조정 | O  | O  | 미확인  |               |         |             |               |                         |                     |
| 미션 보상           | O  | O  | 미확인  |               |         |             |               |                         |                     |
| 연속스트릭 보상     | O  | O  | 미확인  |               |         |             |               |                         |                     |
| 게임별 보상         | O  | O  | 미확인  |               |         |             |               |                         |                     |
| 상점 교환           | O  | O  | 미확인  |               |         |             |               |                         |                     |
| 인벤토리 적립/교환  | O  | O  | 미확인  |               |         |             |               |                         |                     |
| 레벨업 보상         | O  | O  | 미확인  |               |         |             |               |                         |                     |

> 각 항목별 이관상태는 실제 코드/DB/운영/문서 등 근거 확인 후 "완료/진행중/미완료/미확인"으로 표기, 근거/메모란에 상세 내용 작성

---

## 3. 변환값/특이사항 메모 테이블

| 항목(지급/보상)     | 변환값/특이사항 메모 |
|---------------------|---------------------|
|                     |                     |
|                     |                     |
|                     |                     |

> 각 항목별 변환값/특이사항은 이 표에 자유롭게 추가/수정
