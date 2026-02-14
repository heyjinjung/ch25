문서 타입: 운영/검증 가이드
버전: v1.3
작성일: 2026-02-14
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

## 3.2 이벤트 status 운영일 검증 시나리오
- `GET /api/events/valentine-seol/status`는 **현재 운영일(09:00 KST 리셋)** 기준으로 이벤트 미션만 반환해야 한다.
- 09:00 이전 조회는 “전날 운영일”로 계산되어야 한다.

### 3.1 권장 검증 케이스
- 동일 운영일 내 재로그인 시 streak 증가 금지
- 운영일 변경 직후 claim 가능 상태 정상 노출
- 신규 유저 168시간 만료 시 미션 탭 비노출

## 4. 백테스트 결과 요약
- 5개 시나리오 모두 PASS
- 9AM 경계/자정 교차/중복 로그인 안전성 확인

## 5. 스트릭 클레임 버튼 검증
- FE는 claimable_day 기반으로 버튼 표시
- claimable_rewards[0] 사용 금지
- streak_info 스키마 불일치 방지(필드 누락 체크)

## 6. 증상 정의 포맷(보고용)
| 항목 | 내용 |
| --- | --- |
| 대상 기능 | 예: 스트릭 보상 클레임 |
| HTTP Status | 500/400/200 |
| 영향 범위 | 특정 유저 vs 전체 |
| 재현 빈도 | 항상/간헐 |

## 7. 운영 모니터링 지표
- streak.reset 이벤트 급증 여부
- 미션 클레임 실패율(5xx/4xx)
- 9AM 전후 미션/스트릭 문의 빈도

## 8. 이슈 대응 흐름
1) 증상 정의 표로 재현 조건 정리
2) 로그/DB 제약조건으로 원인 확인
3) API/FE/DB 정합성 확인
4) 롤백 또는 핫픽스 결정

## 9. 모니터링/롤백 기준
- streak.reset 급증(24시간 50% 이상 증가) 시 롤백
- 3명 이상 사용자 신고 발생 시 즉시 롤백

## 10. 검증 SQL 예시
```sql
SELECT COUNT(*) AS reset_count
FROM user_event_log
WHERE event_name = 'streak.reset'
	AND created_at >= NOW() - INTERVAL 1 DAY;
```

## 11. 참고 문서(아카이브)
- [docs/SOT/mission/archive/v2_mission_timezone_fix_20260122_ko.md](docs/SOT/mission/archive/v2_mission_timezone_fix_20260122_ko.md)
- [docs/SOT/mission/archive/streak_continuity_verification_guide.md](docs/SOT/mission/archive/streak_continuity_verification_guide.md)
- [docs/SOT/mission/archive/v2_streak_backtest_20260122_ko.md](docs/SOT/mission/archive/v2_streak_backtest_20260122_ko.md)
- [docs/SOT/mission/archive/20260204_streak_claim_button_not_showing.md](docs/SOT/mission/archive/20260204_streak_claim_button_not_showing.md)

## 12. 변경 이력
- v1.3 (2026-02-14, GitHub Copilot): 이벤트 status 운영일 검증 시나리오 추가
- v1.2 (2026-02-07, GitHub Copilot): 이슈 대응 흐름 추가
- v1.1 (2026-02-07, GitHub Copilot): 보고 포맷/모니터링 지표/SQL 예시 확장
- v1.0 (2026-02-07, GitHub Copilot): 운영/검증 기준 통합 정리
