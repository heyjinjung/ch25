
문서 타입: SoT / 배포 운영 런북
버전: v1.1
작성일: 2026-01-29
최종 수정: 2026-02-06
작성자: GitHub Copilot
대상: DevOps/Backend/운영/QA
상태: SoT

# V2 배포 SoT 마스터 런북 (V2 Deployment SoT Master Runbook)

## 1. 목적 (Purpose)
V2(Golden V2) 운영 서버 배포를 위한 **단일 기준(SoT) 런북**을 제공한다. 본 문서는 서버 셋업, 환경 변수, 배포 절차, 마이그레이션, 헬스 체크, 스모크 검증, 모니터링, 롤백, 트러블슈팅을 통합한다.

## 2. 범위 (Scope)
- 배포 대상: backend/frontend/nginx/db/redis/telegram_bot/celery-worker/celery-beat
- 인프라: Vultr(Seoul), Docker Compose, MySQL, Redis
- 운영 정책: Asia/Seoul(KST) + **09:00 리셋(운영일)**

## 3. SoT 우선순위 및 핵심 원칙 (SoT Priority & Principles)
1) 최신 learned_ 문서/핫픽스와 본 문서가 충돌할 경우 learned_를 우선한다.
2) 모든 비즈니스 로직/운영일 계산은 `Asia/Seoul` 및 **09:00 리셋**을 따른다. (naive datetime 금지)
3) 프로덕션에서 `DEV_LOGIN_ENABLED=false`, `TEST_MODE=false`는 필수다.
4) RBAC은 “SUPERADMIN” 예외 없이 운영 정책에 맞게 정규화한다(과거 문서의 SUPERADMIN 언급은 잔재로 간주).
5) Circuit Breaker 한도는 운영 SoT로 고정한다.
   - `CIRCUIT_LIMIT_VAULT=100000` (시간당 금고 지급 한도, KRW)
   - `CIRCUIT_LIMIT_TICKET=30` (시간당 티켓 지급 한도, 장)

## 4. 사전 준비 (Prerequisites)
### 4.1 서버 사양
- Provider: Vultr (Cloud Compute)
- Location: Seoul (ICN)
- OS: Ubuntu 22.04 LTS
- 권장: 2 vCPU / 4GB RAM / 80GB SSD 이상

### 4.2 도메인/SSL/CORS
- 도메인: `cc-jm.com` (유저 & 어드민 통합)
- SSL: HTTPS 필수(nginx 프록시에서 종료)
- CORS 허용 예시: `https://cc-jm.com`, `https://www.cc-jm.com`, `http://149.28.135.147`

### 4.3 텔레그램 봇
- BotFather에서 `SetWebApp`으로 `https://cc-jm.com` 연결
- 프로덕션 전용 Bot Token 사용(민감정보는 `.env.production`에서 로드)

## 5. 서버 환경 구축 (Server Setup)
```bash
apt-get update && apt-get install -y git docker.io docker-compose-plugin
```

```bash
git clone [Github_Url] /opt/ch25
cd /opt/ch25
```

## 6. 환경 변수(SoT) 설정 (.env)
```bash
cp .env.example .env
nano .env
```

### 6.1 필수 환경 변수
```ini
# Core
ENV=production
TEST_MODE=false
DEV_LOGIN_ENABLED=false
DOMAIN=cc-jm.com

# Timezone (09:00 KST 리셋)
TIMEZONE=Asia/Seoul

# Database (MySQL)
DATABASE_URL=mysql+pymysql://xmasuser:2026@db:3306/xmas_event

# Security (JWT)
JWT_SECRET=${JWT_SECRET}
JWT_ALGORITHM=HS256
V2_ACCESS_TOKEN_EXPIRE_MINUTES=15

# Telegram
TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
TELEGRAM_BOT_USERNAME=ccjm
TELEGRAM_CHANNEL_USERNAME=-1003462656986
TELEGRAM_MINI_APP_URL=https://cc-jm.com

# CORS
CORS_ORIGINS=["https://cc-jm.com","https://www.cc-jm.com","http://149.28.135.147"]

# Redis
REDIS_URL=redis://redis:6379/0

# Golden V2 Safety (Circuit Breaker - SoT)
CIRCUIT_LIMIT_VAULT=100000
CIRCUIT_LIMIT_TICKET=30
```

## 7. 배포 실행 (Execution)
### 7.1 컨테이너 기동
```bash
docker compose up -d --build
```

### 7.2 DB 마이그레이션 (Alembic)
```bash
docker compose exec backend alembic upgrade head
```

### 7.3 초기 데이터 적재 (선택)
```bash
docker compose exec backend python scripts/seed_v2_essential_data.py
```

## 8. 헬스 체크 및 스모크 검증 (Health & Smoke)
### 8.1 표준 헬스 체크 라우트(SoT)
- `GET /health` → `healthy`
- `GET /api/v2/health` → `{ "status": "ok" }`
- `GET /api/v2/health/db` → `{ "status": "ok" }`

### 8.2 Today Feature (선택 인증)
- `GET /api/v2/today-feature`
  - 인증 없음: `feature_type`만
  - 토큰 포함: `user_id` 포함

### 8.3 운영 확인
- Redis: `redis-cli ping` → `PONG`
- DEV 로그인 차단: `POST /api/v2/dev/login` → 404

## 9. 배포 전 최소 테스트(권장) (Recommended Smoke Tests)
배포 전 아래 테스트 스위트를 실행해 핵심 결함을 차단한다.

### 9.1 백엔드(pytest)
- 아키텍처/SoT 준수: `pytest -v tests/v2_tests/phase1_env/test_v2_architecture_sot.py`
- 인증/권한(RBAC): `pytest -v tests/v2/test_telegram_auth.py tests/v2/test_admin_rbac.py`
- Golden 핵심: `pytest -v tests/v2/test_circuit_breaker.py tests/v2/test_daily_nudge_service.py`
- Vault/Economy/Shop: `pytest -v tests/v2_tests/phase2_core/test_vault_withdrawal_logic.py tests/v2_tests/phase2_core/test_shop_inventory_logic.py`

### 9.2 프론트/어드민(핵심 라우트)
- `GET /api/v2/admin/ops/status`
- `POST /api/v2/admin/csv-import/validate`

## 10. 배포 후 모니터링 (Monitoring)
1) 초기 24시간은 `LOG_LEVEL=INFO`를 권장한다.
2) Sentry 신규 이슈/에러율을 확인한다.
3) Redis Pub/Sub 이벤트(`golden:v2:events:*`) 흐름을 확인한다.
   ```bash
   redis-cli monitor | grep "golden:v2:events"
   ```
4) Circuit Breaker 한도가 반영되었는지 확인한다.

## 11. 롤백 (Rollback)
### 11.1 롤백 판단 기준
1) 텔레그램 인증/토큰 갱신 실패로 유저 진입이 차단됨
2) Circuit Breaker 미발동 상태에서 비정상 재화 지급 발생
3) 마이그레이션 실패로 신규 필드/테이블에 데이터 적재 불가
4) 09:00 KST 리셋(미션/스트릭 등) 장애

### 11.2 롤백 절차(요약)
1) 이전 안정 버전으로 코드 롤백
2) 컨테이너 재기동
3) 필요 시 Alembic downgrade
4) 캐시 초기화
5) `/health`, `/api/v2/health/db` 재검증

## 12. 트러블슈팅(핵심 시나리오) (Troubleshooting)
### 12.1 텔레그램 인증 unauthorized/Invalid Hash
- 원인: `TELEGRAM_BOT_TOKEN` 불일치, initData 인코딩 문제
- 조치: `.env` 토큰 대조, `app/v2/core/telegram.py` 로깅으로 `auth_date` 만료 확인

### 12.2 CircuitBreakerError 대량 발생
- 원인: 한도값 과소/Redis 키 누적
- 조치: status 확인 후 필요 시 reset(운영 API 기준)

### 12.3 Dockerfile/소스 누락 빌드 실패
- 원인: 리포지토리 루트가 아닌 위치에서 실행, SCP 복사 대상 누락
- 조치: `/opt/ch25`에서 실행, 배포 스크립트에서 작업 디렉터리 고정

### 12.4 Celery worker/beat 빌드 실패(requirements.txt not found)
- 원인: 서버에 소스가 없어 로컬 빌드 실패
- 조치: pre-built 이미지 사용 설정

### 12.5 프로덕션 볼륨 마운트 실패(alembic.ini mount error)
- 원인: 프로덕션에 개발용 볼륨 마운트 포함
- 조치: 프로덕션 compose에서 개발용 마운트 제거, override로 분리

## 13. 관련 SoT/세부 문서 (References)
- 서버 셋업 상세: `0000_2026_v2_server_deployment_guide_ko.md`
- 배포 자동화 스크립트 가이드: `v2_deployment_automation_script_ko.md`
- Docker Compose 가이드: `v2_deployment_docker_compose_guide_ko.md`
- 롤백 가이드: `v2_deployment_rollback_script_ko.md`
- System/Ops 라우트 SoT: `v2_system_ops_sot_ko.md`
- 배포 트러블슈팅 리포트: `0000_2026_v2_deployment_troubleshooting_guide_ko.md`
- Golden 운영/관제 로직: `golden_v2_operational_logic_ko.md`
- Ops 실행 스키마: `v2_ops_plan_execution_schema_sot_ko.md`
- Ops 액션 용어집: `v2_ops_action_glossary_sot_ko.md`
- Ops 실행 결과 API 계약: `v2_ops_execution_api_contract_ko.md`
- 운영 메시지 정책: `v2_admin_message_policy_sot_ko.md`
- 상점 상품 UI Config SoT: `v2_shop_products_ui_config_sot_ko.md`

## 14. 운영 서버 검증 기록(참고) (2026-01-30)
본 섹션은 과거 검증 로그의 보관이며, 현재 SoT 검증 기준은 8~11장을 따른다.

### 14.1 컨테이너 상태(요약)
- backend/frontend/db/redis/nginx/telegram_bot/celery-worker/celery-beat: 정상 가동(healthy)

### 14.2 헬스체크(요약)
- `/health` 및 `/api/v2/health`는 정상 응답으로 기록됨
- `/api/v2/health/db`는 환경에 따라 누락/라우팅 이슈가 발생할 수 있으므로, 배포 후 반드시 재검증한다

## 15. 변경 이력
- v1.1 (2026-02-06): 배포 관련 SoT 문서들을 기준으로 마스터 런북 통합(환경변수/헬스체크/롤백/트러블슈팅/참조 링크 정리)
