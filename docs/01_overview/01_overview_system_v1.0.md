# XMAS 1Week Daily Feature & Season Pass System – 총괄
문서 타입: 총괄
버전: v1.3
작성일: 2025-12-25
작성자: 시스템 설계팀
대상 독자: 백엔드/프론트엔드 개발자, 운영 담당자

## 1. 목적 (Purpose)
- 크리스마스 이벤트(Daily Feature & Season Pass)의 전체 목표, 흐름, 핵심 기능을 한눈에 전달한다. 시즌 기간은 `start_date ~ end_date`로 정의되며, 이번 시즌은 2025-12-09 ~ 2025-12-25이다.
- 향후 상세 아키텍처, API, DB 설계 문서로 빠르게 이동할 수 있는 상위 안내서 역할을 한다.

## 2. 범위 (Scope)
- 이벤트 기간, 활성화 정책, 주요 기능(Feature/Season Pass/게임), 비기능 목표를 포함한 전체 개요를 다룬다.
- 세부 코드 구현, 인프라 배포 절차, 엔드포인트 파라미터 상세는 별도 하위 문서에서 다룬다.

## 3. 용어 정의 (Definitions)
- Season: DB의 `start_date ~ end_date`로 정의되는 시즌 기간 (예: XMAS_2025, 이번 시즌은 2025-12-09 ~ 2025-12-25). 시즌 이름에 '1WEEK'가 포함되어 있더라도 실제 기간은 start_date/end_date로 결정된다.
- Feature: ROULETTE / DICE / SEASON_PASS / LOTTERY / RANKING 등 이벤트 타입
- XP: Season Pass 레벨 상승에 사용하는 경험치
- Stamp: 레벨 도장 1회 기록

## 4. 시스템 개요
- 상태: Daily Feature(`today-feature`) 기능은 2025-12-25 기준 폐기 및 아카이브됨. 시즌 패스/게임 모듈만 유지.
- 목적: 본 문서의 Daily Feature 관련 내용은 역사적 기록용으로만 유지하며, 신규 구현/배포에 사용하지 않는다.
- 영향: 클라이언트 호출 제거, 스케줄 테이블/플래그 비활성, 관련 알람/모니터링도 해제.
- 로깅/추적: 기존 user_event_log, reward_log 정책은 시즌 패스·게임 흐름에 한정하여 유지.

## 5. 폐기/중단 공지
- 중단 일자: 2025-12-25. `today-feature` API 및 일별 Feature 활성 로직은 운영/빌드에서 제거.
- API 상태: 게이트웨이/백엔드에서 404 또는 410 반환하도록 설정, 캐시 무효화 포함.
- 데이터: 관련 스케줄 테이블/플래그 비활성(읽기 전용으로 보존 가능), 새 시즌 구성 시 사용 금지.
- 클라이언트: FE/앱에서 해당 호출·UI·CTA 제거. 남은 호출이 없도록 트래픽 확인.
- 모니터링: 알람/대시보드는 시즌 패스·코어 게임 지표만 유지, today-feature 관련 알람은 해제.

## 6. 사용자 흐름(요약)
- 현재 Daily Feature 전용 플로우는 제공하지 않는다. 이하 내용은 역사적 참고용이다.
- 시즌 패스/게임 공용 흐름은 각 모듈 문서 참고(아키텍처/모듈/API 문서 연결).

## 7. 주요 정책/제약
- Daily Feature: 신규 사용 금지. 기존 스케줄/플래그는 읽기 전용 아카이브로 유지.
- 일일 한도: 시즌 패스/게임에 한정. `max_daily=0`은 무제한, remaining=0이면 무제한 의미.
- 타임존: 모든 서비스 TZ 명시(KST 기준). UTC 혼용 금지.
- 보상 계산: 서버 전담, 클라이언트 계산 금지.

## 8. 비기능 목표/KPI
- 성능: 시즌 패스/게임 API p95 < 500ms, 오류율 < 0.5%.
- 리텐션: 시즌 브리지(열쇠 7일)로 D7 유지, Ticket Zero로 빈 지갑 사용자 복귀.
- 관측성: user_event_log 필수, 알람은 5xx 비율 상승/DB 연결 실패/마이그레이션 불일치에 설정.

## 9. 릴레이션/의존 문서
- 아키텍처: [docs/02_architecture/02_architecture_backend_v1.0.md](../02_architecture/02_architecture_backend_v1.0.md)
- API: [docs/03_api/](../03_api)
- DB: [docs/04_db/](../04_db)
- 모듈 상세: [docs/05_modules/](../05_modules)
- 운영/런북: [docs/06_ops/](../06_ops)

## 10. 운영/리스크 메모 (2025-12-25)
- 시즌 브리지: 12/25~12/31 열쇠 7개 → 1/1 금고 배치 지급. `event_bridge` 응답 필드에 진행도/카운트다운/pending 포인트 노출.
- 금고 설계: trial → vault 적립, 1만 원 자동 해금은 미구현(설계만). `unlock_rules_json` 카피 사용 권장.
- Vault Phase 1: `vault_locked_balance` 단일 기준, `vault_balance`는 legacy mirror.
- Ticket Zero: `/api/ui-config/{key}`(`ticket_zero`)로 문구/CTA 운영, token_balance=0일 때 Panel 노출. SPA shell는 no-cache 배포.
- 스탬프 판정: `YYYY-MM-DD` 키만 today.stamped=true. 타 키는 미완료로 취급.
- TZ 사고 방지: 팀배틀 만료 오판 사례 존재 → TZ 일원화 또는 모든 datetime에 TZ 명시.

## 11. QA/검증 체크리스트
- [ ] `today-feature` 엔드포인트가 404/410으로 응답하며 클라이언트 호출이 남아 있지 않음.
- [ ] JWT 없는 요청이 보호된 API에서 401/403.
- [ ] 시즌 패스/게임에서 max_daily=0 설정 시 remaining=0이어도 차단 없이 플레이.
- [ ] user_event_log, reward_log 최근 3건 저장 확인.
- [ ] 운영 UI/설정에서 today-feature 관련 토글/스케줄 노출이 제거되었거나 비활성.

## 변경 이력
- v1.3 (2025-12-25, 시스템 설계팀): Daily Feature(today-feature) 폐기 사실 반영, 플로우/정책/QA를 중단 상태로 수정.
- v1.2 (2025-12-25, 시스템 설계팀): 사용자 흐름/비기능 KPI/운영 리스크/QA 체크리스트 추가, 관련 문서 링크 보강.
- v1.1 (2025-12-06, 시스템 설계팀): 무제한 규칙, 로그/운영 스위치, 폴백 흐름 반영.
- v1.0 (2025-12-08, 시스템 설계팀): 최초 작성(시즌 개요/운영 원칙).
