문서 타입: 운영/검증 가이드
버전: v1.0
작성일: 2026-02-07
작성자: GitHub Copilot
대상: 운영/QA/BE/FE
상태: Stable

## 1. 목적
미션/스트릭 운영 이슈를 예방하기 위한 검증 기준을 정의한다.

## 2. 타임존/운영일 규칙
- KST(Asia/Seoul) 기준
- 오전 9시 리셋
- API 레이어에서 날짜 계산 금지(서비스 단일화)

## 3. 스트릭 연속성 수동 검증 시나리오
- 02:00 KST 로그인: 운영일은 전날로 유지되어 스트릭 증가 금지
- 09:01 KST 로그인: 운영일 변경으로 스트릭 증가
- 자정 이후 9AM 이전 로그인: 스트릭 유지
- 하루 건너뛰기: streak.reset 발생

## 4. 백테스트 결과 요약
- 5개 시나리오 모두 PASS
- 9AM 경계/자정 교차/중복 로그인 안전성 확인

## 5. 스트릭 클레임 버튼 검증
- FE는 claimable_day 기반으로 버튼 표시
- claimable_rewards[0] 사용 금지
- streak_info 스키마 불일치 방지(필드 누락 체크)

## 6. 모니터링/롤백 기준
- streak.reset 급증(24시간 50% 이상 증가) 시 롤백
- 3명 이상 사용자 신고 발생 시 즉시 롤백

## 7. 참고 문서(아카이브)
- [docs/SOT/mission/archive/v2_mission_timezone_fix_20260122_ko.md](docs/SOT/mission/archive/v2_mission_timezone_fix_20260122_ko.md)
- [docs/SOT/mission/archive/streak_continuity_verification_guide.md](docs/SOT/mission/archive/streak_continuity_verification_guide.md)
- [docs/SOT/mission/archive/v2_streak_backtest_20260122_ko.md](docs/SOT/mission/archive/v2_streak_backtest_20260122_ko.md)
- [docs/SOT/mission/archive/20260204_streak_claim_button_not_showing.md](docs/SOT/mission/archive/20260204_streak_claim_button_not_showing.md)

## 8. 변경 이력
- v1.0 (2026-02-07, GitHub Copilot): 운영/검증 기준 통합 정리
