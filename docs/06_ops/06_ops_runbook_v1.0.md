# 운영/장애 대응 가이드

- 문서 타입: 운영
- 버전: v1.0
- 작성일: 2025-12-08
- 작성자: 시스템 설계팀
- 대상 독자: 운영/SRE/온콜 담당자

## 1. 목적 (Purpose)
- 1주일 이벤트 기간 동안 안정적 운영을 위한 모니터링, 장애 대응, 긴급 조치 방법을 정의한다.

## 2. 범위 (Scope)
- 가용성 목표, 긴급 중단 절차, 스케줄/캐시 오류 대응, 로깅/모니터링 포인트를 다룬다.
- 인프라 프로비저닝, CI/CD 스크립트 세부 내용은 제외한다.
- 선행 작업: 배포 전 DB에 `alembic upgrade head`를 적용해 스키마를 최신화해야 한다. 절차:
  1) `export DATABASE_URL=...` 또는 환경 변수 설정 (운영 DB 전용).
  2) 가상환경 활성화 후 `alembic upgrade head` 실행.
  3) `SELECT version_num FROM alembic_version;`가 `20241206_0001`인지 확인.

## 3. 용어 정의 (Definitions)
- Feature OFF: `feature_config.is_enabled=0` 으로 전체 Feature를 비활성화하는 운영 스위치.
- Today-feature fallback: 활성 스케줄이 없을 때 `feature_type=NONE`을 반환하는 보호 로직.

## 4. 운영 지표 및 목표
- 가용성: 이벤트 기간(start_date ~ end_date, 이번 시즌: 2025-12-09 ~ 2025-12-25) 중 99% 이상 가용성.
- 성능: `/api/today-feature` < 200ms, 게임 API < 500ms(평균).
- 보안: HTTPS 강제, 서버 사이드에서만 결과/보상 계산.

## 5. 모니터링/알림 포인트
- 4xx/5xx 에러율, API 지연 구간 별 APM 트레이스(Sentry 등) 관찰.
- feature_schedule 누락/비활성 시 알림(오늘 feature_type 없음).
- 레벨 add_stamp 실패율 및 보상 지급 오류 모니터링.

## 6. 장애 대응 플레이북
- 실제 운영 환경에서는 Alembic 마이그레이션, 환경 변수, Docker/Nginx/CI/CD 등 최신 배포/운영 플로우를 반영해야 함.
1) 스케줄 오류: 오늘 활성 스케줄이 없으면 `/api/today-feature`에서 feature_type=NONE 반환 → 프론트 안내. 스케줄 테이블 즉시 보정.
2) 긴급 중단: feature_config.is_enabled=0으로 특정 Feature OFF. 필요 시 Nginx 레벨에서 503 유지보수 페이지 제공.
3) 캐시/세션 장애: Redis 미사용 모드로 폴백하거나, 캐시 무효화 후 DB 조회 경로 사용.
4) 인증 문제: JWT 검증 실패율 증가 시 인증 서버/시크릿 키 로테이션 확인, 만료 정책 점검.

## 7. 로그/감사
- user_event_log 및 게임별 로그로 참여 수, 레벨 분포, 보상 지급 이력 확인.
- 필수 로그: ENTER_PAGE, PLAY, RESULT, SEASON_PASS_STAMP, SEASON_PASS_LEVEL_UP, REWARD_CLAIM.

## 8. 일일 시나리오 예시(운영/QA 체크용)
- **룰렛 Day + 레벨 진행**
  1) `/api/today-feature` → `feature_type=ROULETTE` 확인.
  2) `/api/season-pass/status` → 현재 레벨/XP/오늘 도장 여부 확인.
  3) `/api/roulette/status` → remaining_spins 확인, segment 6칸 유효성 체크.
  4) `/api/roulette/play` → RewardService 지급 + SeasonPassService.add_stamp 호출, 로그 기록.
  5) `/api/season-pass/status` 재조회 → XP/레벨/보상 로그 반영 확인.
- **시즌 종료 후 호출**
  - 시즌 end_date+1일부터 `/api/season-pass/stamp`는 `NO_ACTIVE_SEASON`으로 응답해야 하며, 로그에도 에러 코드가 기록되는지 확인.

## 9. 테스트 케이스 연결 포인트
- feature_schedule 미설정/중복 설정 시 `/api/today-feature`가 `feature_type=NONE` 또는 `INVALID_FEATURE_SCHEDULE`로 안전하게 응답하는지 확인.
- 룰렛/복권의 invalid config(6칸 미만, prize weight 합 0) 요청 시 `INVALID_ROULETTE_CONFIG`/`INVALID_LOTTERY_CONFIG`가 반환되는지 검증.
- Dice/Roulette/Lottery 일일 한도 초과 시 `DAILY_LIMIT_REACHED`가 일관되게 반환되는지 확인.

## 변경 이력
- v1.0 (2025-12-08, 시스템 설계팀)
  - 최초 작성: 운영 지표, 모니터링, 장애 대응 절차 정리
