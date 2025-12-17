# XMAS 1Week Daily Feature & Season Pass System – 총괄

- 문서 타입: 총괄
- 버전: v1.1
- 작성일: 2025-12-06
- 작성자: 시스템 설계팀
- 대상 독자: 백엔드/프론트엔드 개발자, 운영 담당자

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
- 실제 코드 기준 오늘의 Feature, 홈 카드 always-on, 코인 시스템 정책, 관리자 지급/차감, 장애 대응 정책 등 최신 흐름 반영.
- 기간: 크리스마스 시즌(예: 2025-12-09 ~ 2025-12-25) 동안 하루에 한 페이지만 활성화한다. 시즌 기간은 `season_pass_config.start_date ~ end_date`로 설정되는 N일 시즌이다.
- 하루에 한 페이지 활성화: Asia/Seoul 기준 날짜로 오늘의 `feature_type`을 결정하고, 비활성 페이지는 "오늘은 이용 불가" 처리한다.
- 핵심 기능:
  - 오늘의 이벤트 유형 조회 및 해당 UI만 노출
  - 룰렛/주사위/레벨/복권/랭킹 게임 로직 처리
  - 레벨 도장, XP, 레벨, 보상 관리
  - 전 플레이/결과/레벨 변화 DB 로깅(ENTER_PAGE/PLAY/RESULT/SEASON_PASS_* 등 user_event_log 필수)
- 보안/성능 목표:
  - HTTPS 필수, 서버에서만 결과/보상 계산
  - `/api/today-feature` < 200ms, 게임 API < 500ms 평균 응답

## 5. 주요 플로우 요약
1) 클라이언트가 `/api/today-feature`로 오늘 활성 Feature 타입과 페이지 정보를 조회한다.
2) 활성 Feature에 따라 해당 게임/레벨 API를 호출한다.
3) 서비스 로직은 인증(JWT) 검증 후 결과 계산, 레벨 연동(`add_stamp`), 로그 저장을 수행한다.
4) 운영자는 `feature_config.is_enabled` 플래그로 긴급 ON/OFF가 가능하며, 스케줄 오류 시 `feature_type=NONE`을 반환한다.
5) 일일 한도 max_daily가 0인 경우 remaining=0은 “무제한” 의미로 UI/BE 모두 차단 없이 플레이 가능하다.

## 6. 예시
- 오늘 활성 Feature 조회 응답 예시:
```json
{
  "date": "2025-12-24",
  "feature_type": "ROULETTE",
  "title": "크리스마스 룰렛 Day",
  "page_path": "/roulette"
}
```

## 변경 이력
- v1.1 (2025-12-06, 시스템 설계팀)
  - max_daily=0을 “무제한”으로 명시하고 remaining=0 의미를 UI/BE 공통으로 규정
  - user_event_log 필수 이벤트 예시(ENTER_PAGE/PLAY/RESULT/SEASON_PASS_*)를 총괄 개요에 반영
  - 운영 스위치(feature_config.is_enabled)와 today-feature 폴백 흐름을 재확인
- v1.0 (2025-12-08, 시스템 설계팀)
  - 최초 작성: 전체 이벤트 시스템 개요와 운영 원칙 정리
  - 시즌 기간을 start_date/end_date 기반 N일 시즌으로 정의 (이번 시즌: 2025-12-09 ~ 2025-12-25)
