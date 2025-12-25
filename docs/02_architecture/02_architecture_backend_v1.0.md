# XMAS 1Week 시스템 백엔드 아키텍처
문서 타입: 아키텍처
버전: v1.3
작성일: 2025-12-25
작성자: 시스템 설계팀
대상 독자: 백엔드 개발자, SRE/운영 담당자

## 1. 목적 (Purpose)
- Python 3.11 + FastAPI 기반 백엔드의 구조, 기술 스택, 배포 구성, 디렉터리 레이아웃을 통일한다.
- Season Pass/게임 모듈이 일관된 패턴으로 구현되도록 공통 기준을 제공한다.

## 2. 범위 (Scope)
- 언어/프레임워크/라이브러리, 디렉터리 구조, 배포 컴포넌트(Nginx, Docker, CI/CD)를 다룬다.
- 프론트엔드 세부 구현, 인프라 프로비저닝 스크립트는 범위 밖이다.

## 3. 용어 정의 (Definitions)
- API Router: FastAPI 라우터 묶음(api_router)으로 `/api/*` 엔드포인트를 집계하는 구성.
- Alembic: SQLAlchemy 기반 DB 마이그레이션 도구.
- Reverse Proxy: Nginx로 TLS 종료 및 백엔드 라우팅을 담당하는 계층.

## 4. 아키텍처 개요
- 컴포넌트: Nginx(HTTPS/TLS 종료, `/api` 프록시) → FastAPI(Uvicorn/ASGI) → MySQL, (옵션) Redis 캐시.
- 배포: Docker Compose(backend, db, redis?, nginx, frontend). CI/CD는 lint/test → docker build → deploy.
- 인증: JWT 필수, 모든 게임/레벨/관리자 API는 Authorization 헤더 요구.
- 타임존: Asia/Seoul 기준 처리. DB가 KST일 경우 UTC 혼용 금지(모든 datetime TZ 명시/변환).
- 비동기 원칙: 라우터/서비스/DB 모두 async/await, 동기 DB 접근 금지.

### 4.1 런타임 요청 흐름 (텍스트 다이어그램)
```
Client -> Nginx (/api, TLS) -> FastAPI Router -> Service Layer -> DB/Redis
                                       |-> JWT auth deps
```

### 4.2 주요 의존성
- Python 3.11+, FastAPI, Uvicorn, SQLAlchemy AsyncSession, Alembic.
- MySQL(InnoDB, utf8mb4), Redis(optional for caching/token throttling).
- Infrastructure: Nginx, Docker, GitHub Actions/GitLab CI.

## 5. 디렉터리 레이아웃
```
xmas-1week-event-system/
├── backend/
│   ├── app/
│   │   ├── core/
│   │   ├── config/
│   │   ├── db/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── routes/
│   │   ├── utils/
│   │   ├── main.py
│   │   └── __init__.py
│   ├── alembic/
│   │   ├── versions/
│   │   ├── env.py
│   │   └── script.py.mako
│   ├── tests/
│   ├── requirements.txt
│   ├── alembic.ini
│   └── pyproject.toml
├── frontend/
│   └── src/
├── docker/
├── docker-compose.yml
├── nginx/
└── docs/
```

## 6. 백엔드 모듈 책임 요약
- `app/core/`: JWT 검증(auth.py), 패스워드/토큰 보안(security.py), 타임존 유틸(time_utils.py), 로깅 설정(logging_config.py).
- `app/config/`: 환경 변수 로딩(BaseSettings), DB/Redis URL 등 설정.
- `app/db/`: SessionLocal, Base 정의, Alembic에서 인식할 모델 import.
- `app/models/`: 공통/레벨/게임 SQLAlchemy 모델 정의.
- `app/services/`: FeatureService/SeasonPassService/게임 서비스/RewardService 등 비즈니스 로직 구현.
- `app/routes/`: 인증 의존성을 연결하고 서비스 메서드를 호출하는 얇은 계층.
- `app/schemas/`: Pydantic 스키마로 요청/응답 계약 정의.
- `app/utils/`: 난수/가중치(random_utils), 페이지네이션 등 공통 유틸.

## 7. 데이터/구성 관리
- DB: MySQL InnoDB, utf8mb4, 타임존 명시. 필수 테이블은 `docs/04_db/` 참조.
- 마이그레이션: `alembic upgrade head` 후 `SELECT version_num FROM alembic_version;`가 최신(예: 20241206_0001)인지 검증.
- 구성: `.env`에서 DATABASE_URL, JWT_SECRET, CORS_ORIGINS, REDIS_URL(optional) 설정. 관리자 UI CORS는 코드 레벨에서 `cc-jm.com` 허용 여부를 재확인.
- 캐시: Redis 사용 시 idempotency key, 짧은 TTL 캐시만 허용. 장기 캐시는 DB 소스와 일관성 검증 필요.

## 8. 인프라/배포 고려사항
- Nginx: TLS 종료, `/api` 프록시, 정적 캐시 설정. 헬스엔드포인트 `/health` 노출.
- Compose 예시: backend, db, redis(옵션), nginx, frontend. 리소스: 최소 2vCPU/4GB.
- CI/CD: lint/test → docker build → push → remote deploy. 마이그레이션은 배포 직후 1회 실행.

## 9. 운영 기준
- 장애 시 `feature_config.is_enabled=0`으로 긴급 중단 가능. `ticket_zero` UI-config로 공지 가능.
- today-feature: 2025-12-25 기준 폐기/아카이브. 라우터는 비활성 또는 404/410 반환, 스케줄 기반 활성화 로직 미사용.
- 로깅: Python logging + (권장) Sentry/APM 연동. user_event_log는 필수(ENTER_PAGE/PLAY/RESULT/SEASON_PASS_* 등).

## 10. 시즌 브리지(12/25~12/31 → 1/1 배치)
- 임시 필드: `user_profiles.event_key_count`, `event_pending_points` 누적 후 1/1 배치 지급.
- 이벤트 로그: `season_pass_stamp_log.event_type`에 KEY_DAY_1~7 매핑(`KEY_DAY_1_ROULETTE`, ... , `KEY_DAY_7_LAST_LOGIN`).
- 배치: 1/1에 `event_key_count >= 7 AND is_blocked=0` → 레벨 +1, 예약 포인트 지급, reward_log 멱등 기록.
- API: `/api/season-pass/status` → `event_bridge` 필드로 열쇠 슬롯/카운트다운/pending 포인트 노출.

## 11. 보안/품질/성능 가드레일
- 보안: HTTPS 필수, JWT 만료 단축 검토, 관리자 API 별도 scope `admin`. XSS 대비 CSP 적용(특히 admin/localStorage 토큰 사용 시).
- 입력 검증: Pydantic 스키마 기반, reward/amount 등 비즈니스 룰에 대한 추가 서버 검증 필수.
- 성능: 시즌 패스/게임 API p95 < 500ms. today-feature 지표/인덱스는 제거.
- 타임존: 모든 datetime은 TZ 명시. naive datetime 금지.

## 12. 관측/모니터링
- 메트릭: 요청 latency(p50/p95), error rate, DB slow query 수, Redis hit ratio(사용 시).
- 로그: user_event_log 필수, reward_log/feature_log로 보상/플레이 추적.
- 알람: 5xx 비율 상승, DB 연결 실패, Alembic 버전 불일치.

## 13. QA/운영 체크리스트
- [ ] `alembic upgrade head` 적용, `alembic_version` 최신.
- [ ] today-feature 라우트가 비활성(404/410)이며 호출 잔존 없음.
- [ ] JWT 없는 요청이 보호된 API에서 401/403 반환.
- [ ] reward/amount 비즈니스 규칙 위반 시 4xx/VALIDATION_ERROR 반환.
- [ ] 로그(user_event_log, reward_log) 최신 3건이 저장되는지 확인.

## 변경 이력
- v1.3 (2025-12-25, 시스템 설계팀): today-feature 폐기 반영, 성능/운영/QA 항목에서 관련 지표 제거.
- v1.2 (2025-12-25, 시스템 설계팀): 관측/QA/보안 가드레일 추가, 인프라/구성 상세 보강, 시즌 브리지 절차 명확화.
- v1.1 (2025-12-06, 시스템 설계팀): 비동기 원칙, JWT 필수, Alembic head 확인 절차 명시.
- v1.0 (2025-12-08, 시스템 설계팀): 최초 작성(백엔드 스택, 레이아웃, 운영 기준).

## 7. 인프라/배포 고려사항
- Nginx: HTTPS 종단, `/api` 경로를 백엔드로 프록시, 정적 자산 캐시 가능.
- Docker Compose 예시: backend, db(MySQL/PostgreSQL), (옵션) redis, nginx, frontend로 구성.
- CI/CD: GitHub Actions 또는 GitLab CI를 사용해 lint/test → docker build → deploy 단계를 수행.
- 마이그레이션: 배포 전 `alembic upgrade head` 적용 후 `SELECT version_num FROM alembic_version;`가 `20241206_0001`인지 확인.

## 8. 운영 기준 (중단 사항 반영)
- today-feature 라우트는 폐기(비활성/404/410). 스케줄 기반 게이트 사용 금지.
- 장애 시 `feature_config.is_enabled=0`으로 게임/시즌 패스 중단 가능.
- 로깅: Python logging 기반, Sentry 등 APM 연동 권장.

## 9. 시즌 브리지(12/25~12/31 → 1/1 배치) 연동
- 임시 필드: `user_profiles.event_key_count`, `event_pending_points`로 열쇠 진행도/예약 보상 누적 후 1/1 배치 지급.
- 이벤트 로그: `season_pass_stamp_log.event_type`에 KEY_DAY_1~7 매핑(`KEY_DAY_1_ROULETTE`, `KEY_DAY_2_DEPOSIT`, ... , `KEY_DAY_7_LAST_LOGIN`).
- 배치: 1/1에 `event_key_count >= 7 AND is_blocked=0` 대상만 지급(레벨 +1, 예약 포인트 → game_wallet, reward_log 멱등 기록).
- API: `/api/season-pass/status` 응답에 `event_bridge`(열쇠 슬롯, 카운트다운, pending 포인트) 확장.

## 10. 운영/설계 주의사항 (2025-12-25 추가)
- 타임존: DB가 KST인 상태에서 naive datetime을 UTC로 해석해 시즌 만료 오판 사례 발생. TZ 일원화(UTC) 또는 모든 datetime TZ 명시/변환을 강제.
- Vault Phase 1: `user.vault_locked_balance` 단일 기준으로 적립/해금, `vault_balance`는 legacy mirror 용도만 유지. external_ranking은 해금 계산이 아닌 신호만 전달.
- Ticket Zero 운영: `/api/ui-config/{key}`(`ticket_zero`)로 문구/CTA를 실시간 관리, token_balance=0일 때 Panel 노출. 캐시는 SPA shell(index.html) no-cache로 배포 설정 필요.

## 변경 이력
- v1.1 (2025-12-06, 시스템 설계팀)
  - 비동기 원칙(AsyncSession/async def)과 JWT 필수, Python 3.11 스택을 재확인
  - 배포 전 Alembic head 버전 확인 절차(20241206_0001) 명시
  - 잘못된 선두 문자 제거
- v1.0 (2025-12-08, 시스템 설계팀)
  - 최초 작성: 백엔드 스택, 레이아웃, 배포/운영 기준 정리
  - Python 3.11, JWT, Uvicorn, SQLAlchemy, Alembic 스택을 명시
