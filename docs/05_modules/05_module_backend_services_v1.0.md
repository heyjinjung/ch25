# Backend 모듈 기술서 (Services/Routes/Schemas)

- 문서 타입: 모듈
- 버전: v1.1
- 작성일: 2025-12-09
- 작성자: 시스템 설계팀
- 대상 독자: 백엔드 개발자

## 1. 목적 (Purpose)
- FastAPI 백엔드의 핵심 모듈 역할과 책임을 명시하여 구현 방향성을 통일한다.

## 2. 범위 (Scope)
- `backend/app` 이하 core/config/db/models/schemas/services/routes/utils 모듈의 책임과 주요 메서드 흐름을 다룬다.
- 상세 SeasonPassService 흐름은 `docs/05_modules/05_module_season_pass_service_v1.0.md`를 참고한다.
- 코드 상세 구현은 범위 밖이며, API/DB 문서로 상세 계약을 참고한다.

## 3. 용어 정의 (Definitions)
- Service: 비즈니스 로직을 담당하는 계층(예: SeasonPassService, RouletteService).
- Router: FastAPI 엔드포인트를 노출하는 계층.
- Schema: Pydantic 모델로 요청/응답 계약을 표현.

## 4. 주요 모듈 책임
- `app/core/`: 인증(JWT), 시큐리티, 타임존 유틸, 로깅 설정을 제공.
- `app/config/`: 환경설정(Pydantic BaseSettings)과 DB/Redis 설정.
- `app/db/`: AsyncSession 기반 SessionLocal, Base 정의 및 Alembic이 인식할 모델 import. 운영 시 마이그레이션 head `20241206_0001` 적용 여부를 확인한다.
- `app/models/`: 공통/레벨/게임 SQLAlchemy 모델 정의.
- `app/schemas/`: 요청/응답 Pydantic 스키마 정의.
- `app/services/`: 비즈니스 로직 구현. 라우터는 여기 메서드를 호출만 한다.
- `app/routes/`: api_router로 모든 엔드포인트를 묶고, JWT 인증 의존성을 연결한다.
- `app/utils/`: 가중치 랜덤, 페이지네이션 등 공통 유틸.

## 5. 핵심 서비스 요약
### 5-2. GameWalletService (`backend/app/services/game_wallet_service.py`)
- 책임: 게임별 토큰 잔액 조회, 지급/차감, 테스트 모드 자동 충전 등 코인 시스템 비즈니스 로직 담당.
- 주요 메서드:
  - `_get_or_create_wallet(user_id, token_type)`: 지갑 없으면 생성, 있으면 반환
  - `get_balance(user_id, token_type)`: 잔액 조회
  - `require_and_consume_token(user_id, token_type, amount)`: 잔액 부족 시 예외, 테스트 모드에서는 자동 충전
- 정책: 잔액 음수 불가, 지급/차감 트랜잭션 단위 명확화, 테스트 모드 자동 충전
### 5-1. SeasonPassService (`backend/app/services/season_pass_service.py`)
- 책임: 현재 시즌 조회, 진행도 조회/생성, 도장 추가(add_stamp), 상태 조회(get_status), 보상 수령(claim_reward).
- 주요 메서드:
  - `add_stamp(user_id, source_feature_type, xp_bonus=0) -> dict`: 도장 1개 추가 + XP/레벨업 처리, 보상 리스트 반환.
  - `get_status(user_id) -> dict`: 시즌 정보, 진행도, 오늘 도장 여부를 반환.
  - `claim_reward(user_id, level) -> dict`: 특정 레벨 보상 수령 처리.
- 세부 로직: xp_earned 필드 기록, auto_claim 레벨 보상 자동 지급. (자세한 흐름은 전용 모듈 문서 참조)

### 5-2. FeatureService (`backend/app/services/feature_service.py`)
- 책임: 오늘의 활성 Feature 조회, 특정 날짜 조회, feature_config 확인 및 캐시 연동.
- 주요 메서드: `get_today_feature()`, `get_feature_by_date(date)`.
- 활성 규칙:
  - `feature_schedule`의 UNIQUE(date) 전제를 이용해 **한 날짜 하나의 feature_type**만 허용한다.
  - 조회 결과가 0개이면 `feature_type=NONE`을 반환하여 프론트가 “오늘 이벤트 없음”을 안내하도록 한다.
  - 조회 결과가 2개 이상이면 데이터 오류로 간주해 `INVALID_FEATURE_SCHEDULE` 에러 코드를 발생시킨다.
  - `feature_config.is_enabled=0` 상태면 해당 feature를 비활성 처리하여 `NO_FEATURE_TODAY` 또는 403 응답으로 차단한다.

### 5-3. RouletteService / DiceService / LotteryService / RankingService
- 책임: 각 게임 결과 계산, 일일 한도 검증, 레벨 add_stamp 연동, 로그 기록.
- 연동: `SeasonPassService.add_stamp()` 호출하여 XP/레벨 보상 처리.
- 공통 에러 처리: 오늘 feature_type 불일치 시 `NO_FEATURE_TODAY`(feature_config.is_enabled=0 포함), 설정 오류 시 `INVALID_<GAME>_CONFIG`(예: `INVALID_ROULETTE_CONFIG`), 일일 한도 초과 시 `DAILY_LIMIT_REACHED`를 반환한다. max_daily_*=0은 무제한 sentinel로 취급하며 remaining은 0으로 응답하지만 차단하지 않는다.

### 5-4. SeasonPassService 활성 시즌 검증 보강
- `get_current_season(now)`는 `start_date <= today <= end_date`인 시즌이 2개 이상이면 `NO_ACTIVE_SEASON_CONFLICT`(409) 에러를 발생시켜 운영 데이터 오류를 빠르게 탐지한다.

### 5-5. RewardService
- 책임: 포인트/쿠폰 등 보상 지급 로직을 통합, 게임/레벨 서비스에서 호출.

## 6. 라우터 구성
- `app/routes/api_router.py`: feature, season-pass, roulette, dice, lottery, ranking 라우터를 prefix/tag와 함께 등록.
- 각 라우터는 인증 의존성(get_current_user)과 서비스 호출을 얇게 연결.

## 7. 예시 시퀀스 (SeasonPass 도장)
1) 클라이언트가 `/api/season-pass/stamp` 호출 → JWT 인증 통과.
2) Router가 SeasonPassService.add_stamp 호출.
3) Service가 시즌 활성 여부, 오늘 도장 여부 확인 → 진행도 업데이트 → 보상 계산.
4) `season_pass_stamp_log`에 xp_earned 포함해 기록하고, auto_claim 레벨은 reward_log를 생성한다.
5) 결과 JSON을 Router가 응답으로 반환.

## 변경 이력
- v1.1 (2025-12-09, 시스템 설계팀)
  - AsyncSession/Alembic head 확인, JWT 강제 및 max_daily=0 sentinel 무제한 규칙을 명시
  - feature_config.is_enabled=0 시 `NO_FEATURE_TODAY`, `NO_ACTIVE_SEASON_CONFLICT` 409 응답을 책임에 반영
- v1.0 (2025-12-08, 시스템 설계팀)
  - 최초 작성: 백엔드 모듈 책임 및 핵심 서비스/라우터 흐름 정리
  - SeasonPassService 세부 문서 및 xp_earned 기록 포인트를 추가 안내
