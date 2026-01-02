이 문서는 **서버(배포)에서 필요한 환경변수(.env) 세팅 및 배포 환경**을 빠르게 이해하고, 로컬/서버 차이로 인한 장애를 줄이기 위한 온보딩 문서입니다.

## 0) 프로젝트 배포 지침 (고정)

- **메인 소스**: 본 레포지토리 외에 **다른 깃 계정의 특정 브랜치**가 메인 소스로 동작할 수 있습니다. 작업 시 현재 브랜치와 메인 브랜치의 동기화 여부를 확인하세요.
- **운영 서버**: Singapore 리전에 위치한 Vultr 기반 Ubuntu 서버 (`xmas`)를 사용합니다.

## 1) 로컬 vs 서버: 가장 중요한 차이

- **로컬 개발(Windows/Mac)**: 브라우저가 `localhost`에서 실행되므로 프런트가 백엔드로 직접 호출하려면 `VITE_API_URL=http://localhost:8000/api` 처럼 **localhost 기반**으로 설정해야 합니다.
- **서버 배포(도메인/HTTPS)**: nginx가 `/api`, `/admin/api`를 백엔드로 프록시합니다. 이 경우 프런트는 API URL을 하드코딩하지 않고 **same-origin(상대 경로)** 으로 호출하는 것이 안전합니다.
  - 즉, 서버에서는 보통 `VITE_API_URL`, `VITE_ADMIN_API_URL`을 **비워두고**, nginx 설정으로 `/api`를 백엔드로 라우팅합니다.

## 2) 어떤 파일을 어디에 두나

레포 안에는 다양한 env 파일이 있을 수 있지만, 서버에서 실제로 컨테이너가 읽는 것은 기본적으로 루트의 `.env` 입니다.

- 서버에서 권장 흐름
  - `.env.production` (운영값 템플릿/베이스) → 서버에서 `.env`로 복사해서 사용
  - 예: `Copy-Item -Force .env.production .env` (Windows PowerShell) 또는 `cp .env.production .env` (Linux)

> 주의: `.env`는 Git에 커밋하지 않는 것이 일반적으로 안전합니다(시크릿 포함 가능).

## 3) docker-compose가 실제로 쓰는 값 (중요)

[docker-compose.yml](../../docker-compose.yml)의 `backend`/`telegram_bot` 서비스는 `env_file: .env`를 읽지만, 동시에 `environment:`로 일부 값을 **강제로 덮어씁니다**.

- `backend.environment.DATABASE_URL` → `.env`의 `DATABASE_URL`보다 **우선**
- `backend.environment.XP_FROM_GAME_REWARD` → 현재 compose에 기본값이 들어가 있으면 `.env` 값이 무시될 수 있음

운영에서 이 값을 바꿔야 한다면:
- (1) `.env`만 바꾸는 것으로 해결되지 않을 수 있고,
- (2) `docker-compose.yml`의 `environment:` 쪽도 함께 점검해야 합니다.

## 4) 운영(서버)에서 필수로 확인할 env 키

### 4.1 MySQL (db 컨테이너)
- `MYSQL_ROOT_PASSWORD`
- `MYSQL_DATABASE`
- `MYSQL_USER`
- `MYSQL_PASSWORD`

> db 컨테이너의 초기 계정/DB는 볼륨이 처음 생성될 때만 적용됩니다. 이미 볼륨이 있으면 비밀번호를 바꿔도 즉시 반영되지 않을 수 있습니다.

### 4.2 Backend (FastAPI)
- `ENV=production`
- `JWT_SECRET` (최소 32자 랜덤 권장)
- `CORS_ORIGINS` (예: `["https://example.com","https://www.example.com"]`)
- `TEST_MODE=false` (운영에서는 반드시 false 권장)
- `LOG_LEVEL` (INFO 권장)
- `TIMEZONE=Asia/Seoul`

### 4.3 Frontend (Vite build args)
서버에서 nginx 프록시를 쓰는 경우 권장:
- `VITE_API_URL=` (빈 값)
- `VITE_ADMIN_API_URL=` (빈 값)
- `VITE_API_TIMEOUT_MS`, `VITE_ADMIN_API_TIMEOUT_MS`는 필요 시만

브라우저에서 직접 백엔드 포트를 호출하는 구조(권장하지 않음)라면:
- `VITE_API_URL=https://yourdomain.com/api`
- `VITE_ADMIN_API_URL=https://yourdomain.com/admin/api`

## 5) nginx/SSL/Certbot 관련

서버 배포 시 nginx는 일반적으로 80/443을 열고 SSL 인증서(예: Let’s Encrypt)를 마운트합니다.

- nginx 설정 파일: [nginx/nginx.conf](../../nginx/nginx.conf)
- 인증서 마운트(서버에서만 의미 있음)
  - `/etc/letsencrypt:/etc/letsencrypt:ro`
  - `./nginx/ssl:/etc/nginx/ssl:ro`
  - `/var/www/certbot:/var/www/certbot:ro`

로컬(Windows)에서는 위 절대경로 마운트가 깨질 수 있으므로, 로컬에서는 **SSL 없는 nginx 설정/compose 오버레이**를 사용하는 것이 안전합니다.

## 6) Telegram Bot 관련 (옵션)

텔레그램 봇은 `TELEGRAM_BOT_TOKEN`이 없으면 실행되지 않습니다.

- 필수
  - `TELEGRAM_BOT_TOKEN=...`
  - `TELEGRAM_MINI_APP_URL=https://yourdomain.com` (또는 미니앱 URL)

- Webhook 모드(운영 권장)
  - `TELEGRAM_USE_WEBHOOK=true`
  - `TELEGRAM_WEBHOOK_URL=https://yourdomain.com`
  - `TELEGRAM_WEBHOOK_PATH=/telegram/webhook`
  - `TELEGRAM_WEBHOOK_SECRET_TOKEN=...` (선택)

## 7) 서버에서의 실행 체크리스트

- [ ] `.env.production` 기반으로 `.env` 준비(시크릿/도메인/CORS/JWT)
- [ ] `docker compose up -d --build`
- [ ] `docker compose exec backend alembic upgrade head`
- [ ] 헬스 체크: `curl http://127.0.0.1:8000/` (서버 내부)
- [ ] nginx 프록시 체크: `curl https://yourdomain.com/health`

## 9) 운영 서버 상세 (Reference)

| 항목 | 상세 내용 |
| --- | --- |
| **IP Address** | `149.28.135.147` |
| **Username** | `root` |
| **Password** | `2wP?+!Etm8#Qv4Mn` |
| **OS** | Ubuntu 22.04 x64 |
| **Label** | xmas |
| **Location** | Singapore |
| **HW** | 1 vCPU / 2GB RAM / 25GB NVMe |

---
**상태**: 2026-01-02 업데이트 완료 (트러블슈팅 가이드 추가)

## 10) 트러블슈팅 가이드 (빌드/배포 오류 리스트)

### 10.1 502 Bad Gateway (백엔드 접속 불가)
- **증상**: API 호출 시 502 오류 발생.
- **원인 1**: 코드 내 `ImportError` 또는 `NameError` (예: `Boolean`, `get_current_user` 누락).
- **원인 2**: 컨테이너 재빌드 후 Nginx의 Upstream 연결이 만료됨.
- **해결**: 컨테이너 로그 보컬 확인 후 코드 수정 -> `docker compose restart nginx`로 연결 초기화.

### 10.2 500 Internal Server Error (DB 스키마 불일치)
- **증상**: 특정 기능 작동 시 `Unknown column` 에러와 함께 500 오류 발생.
- **원인**: Alembic migration 파일이 Git에 커밋되지 않았거나, 서버에서 `upgrade head`가 실행되지 않음.
- **해결**: 로컬에서 생성된 마이그레이션 파일 확인/커밋 -> 서버에서 `docker compose exec backend alembic upgrade head` 실행.

### 10.3 Docker 실행 실패 (Encoding Error)
- **증상**: Docker 서비스 시작 시 "unexpected character" 오류 발생.
- **원인**: `.env` 파일이 `UTF-16LE` (Windows 기본값) 인코딩으로 저장됨.
- **해결**: `.env` 파일을 `UTF-8` (BOM 없음)로 변환하여 저장.

### 10.4 SSL/HTTPS 접속 불가 (ERR_CONNECTION_CLOSED)
- **증상**: HTTPS 접속 시 브라우저에서 즉시 연결 종료.
- **원인**: Nginx 설정에 443 포트 블록 누락 또는 Let's Encrypt 경로 불일치.
- **해결**: `nginx/nginx.conf` 내 SSL 블록 확인 및 인증서 경로 유효성 점검.

### 10.5 404 Not Found (API 라우팅 오류)
- **증상**: API 호출 경로가 존재하지 않음.
- **원인**: 프론트엔드 API 클라이언트와 백엔드 라우터 간의 프리픽스(`prefix="/api"`) 불일치.
- **해결**: `api.ts`와 백엔드 라우터 설정을 동일하게 교정.

### 10.6 텔레그램 봇 응답 없음
- **증상**: `/start` 명령 등에 봇이 무반응.
- **원인**: `.env` 내 `TELEGRAM_BOT_TOKEN` 또는 `TELEGRAM_MINI_APP_URL` 오기입.
- **해결**: 올바른 토큰 적용 후 `telegram_bot` 서비스 재시작.

## 11) Nginx 상세 트러블슈팅 (Frequent Nginx Errors)

Nginx는 서비스의 관문으로, 백엔드나 프론트엔드가 정상이어도 Nginx 설정 문제로 전체 서비스가 중단될 수 있습니다.

### 11.1 502 Bad Gateway (Upstream Connection)
- **증상**: 웹사이트 접속 시 502 에러 화면이 나타남.
- **원인**: Nginx가 요청을 전달할 `backend`, `frontend`, `telegram_bot` 컨테이너와 연결할 수 없음.
- **해결**: 
    1. `docker compose ps`로 모든 컨테이너가 `Up` 상태인지 확인.
    2. 컨테이너가 재시작된 경우 Nginx가 예전 IP를 기억할 수 있으므로 `docker compose restart nginx` 실행.

### 11.2 413 Request Entity Too Large (용량 제한)
- **증상**: 파일 업로드나 대량 데이터 전송 시 413 오류 발생.
- **원인**: `client_max_body_size` 설정값이 전송 데이터보다 작음 (기본값 20M).
- **해결**: `nginx/nginx.conf`에서 `client_max_body_size` 값을 늘려주고 Nginx 재시작.

### 11.3 정적 자원(CSS/JS) 404 또는 로딩 실패
- **증상**: 페이지는 뜨는데 스타일이 깨지거나 JS 기능이 작동 안 함.
- **원인**: `frontend` 컨테이너의 빌드 결과물(`dist/`)이 비어있거나, Nginx의 캐싱 설정(`location ~* \.(?:ico|css|js...`) 오류.
- **해결**: `docker compose logs frontend`로 빌드 성공 여부 확인 및 Nginx `/` 경로 프록시 설정 점검.

### 11.4 504 Gateway Timeout
- **증상**: 요청 처리 중 한참 기다리다가 504 오류 발생.
- **원인**: 백엔드 처리가 Nginx의 기본 타임아웃(60초)보다 오래 걸림 (대량 데이터 처리 등).
- **해결**: `proxy_read_timeout`, `proxy_connect_timeout` 값을 Nginx 설정에 명시적으로 추가.

### 11.5 SSL Certificate 관련 (Handshake 실패)
- **증상**: HTTPS 접속 시 보안 경고가 뜨거나 접속 불가.
- **원인**: Let's Encrypt 인증서 만료 또는 `/etc/nginx/ssl/` 경로에 인증서 파일 누락.
- **해결**: 서버 내 인증서 파일 경로 확인 및 `certbot renew` 수동 실행 후 Nginx 리로드.

## 8) 보안/운영 주의사항

- `.env`/시크릿(토큰/비밀번호/JWT)은 Git에 커밋하지 않는 것을 권장합니다.
- 이미 커밋/공유된 시크릿이 있다면 **즉시 회전(rotating)** 하세요.
- 운영에서 `TEST_MODE=true`는 인증/토큰/게임 토큰 소비 동작에 영향을 줄 수 있으므로 금지 권장.
