# XMAS 1Week 시스템 백엔드 아키텍처

- 문서 타입: 아키텍처
- 버전: v1.1
- 작성일: 2025-12-06
- 작성자: 시스템 설계팀
- 대상 독자: 백엔드 개발자, SRE/운영 담당자

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
- 실제 배포 환경(Docker/Nginx/CI/CD), Alembic 마이그레이션, 테스트 모드, 코인 시스템 정책 등 최신 코드와 일치하도록 반영.
- 핵심 스택: Python 3.11+, FastAPI, Uvicorn, SQLAlchemy(AsyncSession), Alembic, (선택) Redis 캐시.
- 인증: JWT 기반, 모든 게임/레벨 API는 Authorization 헤더 필요.
- 타임존: Asia/Seoul 기준으로 날짜/시간 계산.
- 비동기 원칙: 라우터/서비스/DB 접근은 async/await 일관 적용, 동기 DB 접근 금지.
- 배포: Docker 컨테이너로 구성, Nginx가 HTTPS 종단 및 백엔드 리버스 프록시 역할을 수행.

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

## 7. 인프라/배포 고려사항
- Nginx: HTTPS 종단, `/api` 경로를 백엔드로 프록시, 정적 자산 캐시 가능.
- Docker Compose 예시: backend, db(MySQL/PostgreSQL), (옵션) redis, nginx, frontend로 구성.
- CI/CD: GitHub Actions 또는 GitLab CI를 사용해 lint/test → docker build → deploy 단계를 수행.
- 마이그레이션: 배포 전 `alembic upgrade head` 적용 후 `SELECT version_num FROM alembic_version;`가 `20241206_0001`인지 확인.

## 8. 운영 기준
- 장애 시 `feature_config.is_enabled=0`으로 긴급 중단 가능.
- `/api/today-feature`는 활성 스케줄이 없으면 `feature_type=NONE` 반환하여 UI 안내.
- 로깅: Python logging 기반, Sentry 등 APM 연동 권장.

## 변경 이력
- v1.1 (2025-12-06, 시스템 설계팀)
  - 비동기 원칙(AsyncSession/async def)과 JWT 필수, Python 3.11 스택을 재확인
  - 배포 전 Alembic head 버전 확인 절차(20241206_0001) 명시
  - 잘못된 선두 문자 제거
- v1.0 (2025-12-08, 시스템 설계팀)
  - 최초 작성: 백엔드 스택, 레이아웃, 배포/운영 기준 정리
  - Python 3.11, JWT, Uvicorn, SQLAlchemy, Alembic 스택을 명시
