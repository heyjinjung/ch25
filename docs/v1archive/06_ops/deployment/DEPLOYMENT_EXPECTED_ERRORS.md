# XMAS Event System - 서버 배포 예상 오류 리스트 (Preflight)
문서 타입: 운영/배포 사전 점검
버전: v1.6
작성일: 2026-01-13
작성자: 시스템 설계팀
대상 독자: 인프라/백엔드/운영 담당자
프로젝트: XMAS 1Week Event System

## 📋 목차
0. [목적·범위·정의](#0-목적범위정의)
1. [현재 배포 구성 요약(근거)](#1-현재-배포-구성-요약근거)
2. [예상 오류 리스트(원인/징후/확인/1차 대응)](#2-예상-오류-리스트원인징후확인1차-대응)
3. [서버 배포 전 최소 점검 커맨드](#3-서버-배포-전-최소-점검-커맨드)
4. [로그 위치/관측 포인트](#4-로그-위치관측-포인트)
5. [이 문서 기반 작업 가이드(Runbook)](#5-이-문서-기반-작업-가이드runbook)
6. [변경 이력](#6-변경-이력)

---

## 0. 목적·범위·정의

- 목적: Vultr(도메인/SSL 포함) 배포 시 자주 발생하는 실패 지점을 **사전에 예측/차단**한다.
- 범위: 현재 레포의 Docker Compose + Nginx + FastAPI + Vite 빌드/프록시 구성에서 “배포 시 깨질 가능성이 높은 포인트”를 정리한다.
- 비범위(Out of scope): 실제 서버 접속/배포 수행, 코드 수정/리팩토링, 보안 정책 재설계.

---

## 1. 현재 배포 구성 요약(근거)

- **Compose(프로덕션/기본)**: `docker-compose.yml`
  - nginx: 80/443 바인딩
  - backend: 8000 바인딩
  - frontend: 3000 바인딩(nginx 별도 프록시 존재)
  - db: 3307 바인딩(MySQL 8)
  - redis: 6379 바인딩
- **Compose(로컬 오버레이)**: `docker-compose.local.yml`
  - nginx는 8080:80으로만 오픈(SSL/Certbot 제외)
- **Compose(E2E 오버레이)**: `docker-compose.e2e.yml`
  - backend `TEST_MODE=true`, frontend `VITE_TEST_MODE=true` 강제(운영 포함 금지)
- **Nginx(프로덕션)**: `nginx/nginx.conf`
  - `cc-jm.com` 서버블록(80→https 리다이렉트)
  - HTTPS 서버블록은 주석 처리 상태
  - IP 직접 접속용 HTTP 서버블록(default_server)은 활성
- **Nginx(로컬)**: `nginx/nginx.local.conf`
  - `/api/`, `/admin/api/`를 backend로 프록시
  - `/`를 frontend로 프록시
  - `/health`는 정적 200
- **Backend 런타임**: `app/main.py`, `app/core/config.py`
  - 필수 env: `DATABASE_URL`, `JWT_SECRET`
  - `ProxyHeadersMiddleware(trusted_hosts="*")` 적용(프록시 뒤 real ip 신뢰)
  - CORS: allow_credentials=true이며 Origin 정확 매칭 필요

---

## 1.1 현황 스냅샷 (2026-01-13)

> 수집 대상: 운영 서버(149.28.135.147) `/opt/xmas-event` 기준

- Docker/Compose
  - `docker compose` 사용 가능 (Docker Compose v2)
  - `docker-compose` 커맨드 없음(배포 스크립트 그대로 실행 시 실패 가능)
- 컨테이너 상태
  - `docker compose ps`: nginx/backend/frontend/db/redis/telegram_bot 모두 Up (backend/frontend/db/redis healthy)
- 도메인/HTTPS
  - `http://cc-jm.com` → 301 → `https://cc-jm.com/`
  - `https://cc-jm.com/` → 200 OK
- 헬스 체크
  - `http://127.0.0.1/health` → 200
  - `http://127.0.0.1/api/health` → 200
- `.env` 필수키
  - `DATABASE_URL`, `JWT_SECRET` 존재(값은 마스킹 확인)

---

## 1.2 GitHub CI 배포 흐름 요약(근거)

> 근거: `.github/workflows/deploy.yml` (Push: `main`, `temp-merge2`)

- 빌드/푸시(Registry=GHCR)
  - backend: `ghcr.io/heyjinjung/xmas-backend:latest`
  - frontend: `ghcr.io/heyjinjung/xmas-frontend:latest`
- 배포(서버=/opt/xmas-event)
  - `docker-compose.yml`, `nginx/*`, `scripts/init.sql`를 SCP로 복사
  - SSH로 원격에서 `docker login ghcr.io` 수행
  - `.env`를 GitHub Secrets 기반으로 자동 생성(서버에서 직접 생성)
  - `docker compose pull` → `docker compose up -d --remove-orphans` → `docker image prune -f`

### 운영 정책(배포 안전 기준)

- Alembic 마이그레이션은 **항상 자동 실행**(배포 파이프라인에 포함)한다.
  - 권장 위치: `docker compose up -d` 직후
  - 실패 시: 배포는 실패 처리(중간 상태 방치 금지)
- 태그 전략은 **2태그 병행**을 표준으로 한다.
  - Push tags: `:latest` + `:${GITHUB_SHA}` (backend/frontend 모두)
  - 목적: 어떤 버전이 배포됐는지 추적 + 즉시 롤백 가능

> 주의(현행 vs 목표)
> - 현행 `.github/workflows/deploy.yml`은 `:latest`만 push한다.
> - 운영 표준은 `:latest + :${GITHUB_SHA}` 병행이다.
> - 전환 전까지는 “SHA 태그 기반 즉시 롤백(3.7)”이 느려질 수 있으므로, 장애 시 롤백 절차에서 **이미지 존재 여부**를 먼저 확인한다.

---

## 1.3 대규모 변경(200+ files) 배포 시 리스크 프로파일

> 아래 항목은 “기능이 많아진 상태에서 한번에 배포하는 경우”에 실제로 자주 터지는 유형이다.
> (특히 admin FE/BE/DB(Alembic) 동시 변경이 포함된 경우)

- DB/마이그레이션 리스크
  - 다중 migration head / 누락된 revision / 순서 충돌
  - 장시간 DDL/락으로 서비스 지연, 배포 타임아웃
- 계약(API) 리스크
  - admin FE가 기대하는 API path/응답 스키마 변경 → 404/422/500
- 배포 산출물/설정 리스크
  - SCP 복사는 “추가/덮어쓰기” 중심이라 서버에 불필요 파일이 남을 수 있음
  - 이미지 `prune`로 이전 이미지가 사라져 “즉시 롤백”이 어려워질 수 있음
- 캐시/정적 자산 리스크
  - 프론트 정적 리소스 캐시로 구버전 JS가 남아 화면이 깨짐(특히 대규모 UI 변경 시)

---

## 2. 예상 오류 리스트(원인/징후/확인/1차 대응)

> 템플릿
> - 증상(징후)
> - 원인
> - 확인(명령/로그)
> - 1차 대응

### 2.1 `docker-compose` 커맨드 미존재로 배포 스크립트 실패
- 증상(징후)
  - `docker-compose: command not found`
  - `scripts/deploy.sh` 실행 중 중단
- 원인
  - `scripts/deploy.sh`는 `docker-compose`(v1) 커맨드를 사용
  - 서버는 `docker compose`(v2 plugin)만 설치된 경우가 흔함
- 확인(명령/로그)
  - `docker compose version`
  - `docker-compose --version`
- 1차 대응
  - 서버에서는 `docker compose`로 수동 배포 진행(또는 스크립트 수정)

### 2.2 Dockerfile 빌드가 BuildKit 미활성/구버전으로 실패
- 증상(징후)
  - 빌드 로그에 `unknown flag: mount` 또는 BuildKit 관련 에러
- 원인
  - `Dockerfile.backend`, `Dockerfile.frontend`에서 `RUN --mount=type=cache` 사용
- 확인(명령/로그)
  - `docker buildx version`
  - 빌드 로그 전체
- 1차 대응
  - BuildKit 활성화(예: `DOCKER_BUILDKIT=1`) 및 docker/buildx 최신화

### 2.3 HTTP 접속이 HTTPS로 강제 리다이렉트되는데 HTTPS 서버가 비활성
- 증상(징후)
  - 브라우저에서 `ERR_SSL_PROTOCOL_ERROR` 또는 `사이트에 연결할 수 없음`
  - `http://도메인` 접속 시 301로 `https://도메인`으로 이동 후 실패
- 원인
  - `nginx/nginx.conf`에서 `cc-jm.com`은 80→https 리다이렉트
  - 443 서버블록이 주석 처리되어 실제로는 HTTPS가 동작하지 않을 수 있음
- 확인(명령/로그)
  - `curl -I http://cc-jm.com`
  - `curl -I https://cc-jm.com`
  - `docker compose logs nginx`
- 1차 대응
  - HTTPS 서버블록 활성화 + 인증서 경로 정합성 확인(아래 2.4 참조)

### 2.4 인증서 경로/볼륨 불일치로 nginx가 기동 실패 또는 SSL 적용 실패
- 증상(징후)
  - nginx 컨테이너 restart loop
  - `cannot load certificate` 류 에러
- 원인
  - compose는 `/etc/letsencrypt` 및 `nginx/ssl`을 마운트
  - 배포 스크립트는 `nginx/ssl/*.pem` 심볼릭 링크를 만들지만,
    nginx 설정은 `/etc/letsencrypt/live/...`를 참조하도록 작성(또는 그 반대)
- 확인(명령/로그)
  - `docker compose logs nginx`
  - `docker compose exec nginx ls -al /etc/letsencrypt/live`
  - `docker compose exec nginx ls -al /etc/nginx`
- 1차 대응
  - nginx 설정이 참조하는 인증서 경로를 “한 가지 방식”으로 통일

### 2.5 도메인 치환(sed)이 적용되지 않아 server_name/리다이렉트가 엉뚱하게 동작
- 증상(징후)
  - 의도한 도메인으로 동작하지 않음
  - 리다이렉트 대상이 잘못됨
- 원인
  - `scripts/deploy.sh`는 `yourdomain.com` 문자열만 치환
  - 현 레포의 nginx 설정은 이미 `cc-jm.com`이 고정일 수 있음
- 확인(명령/로그)
  - `grep -n "server_name" -n nginx/nginx.conf`
- 1차 대응
  - 실제 도메인 기준으로 nginx 설정을 수동/명시적으로 맞춤

### 2.6 `.env` 필수 값 누락으로 backend 컨테이너가 즉시 종료
- 증상(징후)
  - backend 컨테이너 `Exited` / 재시작 반복
  - settings validation 에러(필수 env 누락)
- 원인
  - `DATABASE_URL`, `JWT_SECRET`는 필수
- 확인(명령/로그)
  - `docker compose logs backend`
  - `.env` 내용 확인(서버에서)
- 1차 대응
  - `.env`에 필수값 설정 후 재기동

### 2.7 CORS(allow_credentials)로 인해 프론트에서 로그인/관리자 API 호출이 실패
- 증상(징후)
  - 브라우저 콘솔에 CORS 에러
  - 로그인/관리자 페이지에서 API가 0회 호출되거나 preflight 실패
- 원인
  - backend는 `allow_credentials=True`이므로 `Access-Control-Allow-Origin: *`가 불가
  - Origin이 정확히 allowlist에 들어가야 함
- 확인(명령/로그)
  - 브라우저 네트워크 탭 + 응답 헤더
  - `app/main.py`에서 allowlist 출력 로그
- 1차 대응
  - 운영 도메인(https 포함)을 `CORS_ORIGINS`에 명시

### 2.8 프론트 API URL을 `localhost`로 박아 “사용자 PC의 localhost”로 호출
- 증상(징후)
  - 사용자 브라우저가 `http://localhost:8000/api`로 호출 시도
  - 운영에서는 API가 전부 실패
- 원인
  - 프로덕션 빌드 인자 `VITE_API_URL`/`VITE_ADMIN_API_URL`를 localhost로 설정
  - (주의) `docker-compose.yml`에도 해당 케이스를 경고하는 주석이 존재
- 확인(명령/로그)
  - 브라우저 네트워크 탭 요청 URL
  - 프론트 빌드 시 사용된 build args 확인
- 1차 대응
  - 운영은 same-origin(`/api`, `/admin/api`) + nginx 프록시 기반으로 통일(권장)

### 2.9 DB init.sql이 “처음 1회만” 실행되어 기대한 시드/스키마가 없다고 착각
- 증상(징후)
  - 특정 초기 데이터가 없어 관리자 화면이 비어 보임
- 원인
  - MySQL init 스크립트는 볼륨이 새로 생성될 때만 실행
- 확인(명령/로그)
  - `docker compose exec db sh -lc 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -e "SHOW DATABASES;"'`
  - 필요한 row 존재 여부 확인
- 1차 대응
  - 운영 시드는 idempotent seed 스크립트로 별도 관리/실행

### 2.10 E2E 오버레이가 운영 배포에 섞여 인증/보안/로직이 깨짐
- 증상(징후)
  - 인증 우회/테스트 전용 동작이 운영에 노출
- 원인
  - `docker-compose.e2e.yml`은 `TEST_MODE=true`, `VITE_TEST_MODE=true`를 강제
- 확인(명령/로그)
  - 배포 커맨드/스크립트에서 `-f docker-compose.e2e.yml` 포함 여부 확인
- 1차 대응
  - 운영 배포에는 e2e compose 파일 절대 포함 금지

### 2.11 80/443 포트 충돌(기존 nginx/apache 또는 다른 컨테이너 점유)
- 증상(징후)
  - nginx 컨테이너가 뜨지 않음
  - `bind() to 0.0.0.0:80 failed`
- 원인
  - 호스트에서 80/443을 이미 점유
- 확인(명령/로그)
  - `ss -ltnp | grep -E ":80 |:443 "`
  - `docker compose logs nginx`
- 1차 대응
  - 기존 웹서버 중지 또는 포트 재매핑

### 2.12 Redis 장애/지연이 backend 전체 장애로 전파
- 증상(징후)
  - 특정 요청이 간헐 500/timeout
  - ops outbox/레이트리밋 등 부수 기능에서 에러 발생
- 원인
  - Redis 의존 경로에서 예외 처리 미흡 시 장애 전파 가능
- 확인(명령/로그)
  - `docker compose logs backend`에서 redis 연결/timeout 패턴 확인
  - `docker compose logs redis`
- 1차 대응
  - 장애 시 degrade 전략(허용/차단)을 명시하고 알람/로그로만 남기도록 점검

### 2.13 Alembic 마이그레이션 미실행/실패로 스키마 불일치(배포 직후 500)
- 증상(징후)
  - 배포는 성공했는데 API가 500/422로 급증
  - 로그에 `Unknown column`, `Table ... doesn't exist`, `ProgrammingError` 등 DB 스키마 관련 에러
- 원인
  - 배포 단계에서 `alembic upgrade head`가 누락되었거나 실행은 됐지만 실패
  - 컨테이너가 교체되며 코드만 최신이고 DB가 뒤처진 상태
- 확인(명령/로그)
  - `docker compose exec -T backend alembic current`
  - `docker compose logs --tail=200 backend`
- 1차 대응
  - 즉시 `docker compose exec -T backend alembic upgrade head` 재실행
  - 실패 시 원인 파악 전까지 “추가 배포” 금지, 필요하면 롤백(아래 3.7)

### 2.14 `:latest` 단일 태그 운영으로 배포 추적/롤백이 불가능
- 증상(징후)
  - "어떤 커밋이 운영에 올라갔는지" 추적이 불가
  - 장애 시 이전 버전으로 즉시 되돌릴 방법이 없음(동일 `:latest`가 덮어써짐)
- 원인
  - 이미지 태그를 `:latest`만 사용하면 배포 단위(커밋/빌드)가 식별되지 않음
- 확인(명령/로그)
  - `docker image ls | grep xmas-`
  - `docker image inspect ghcr.io/heyjinjung/xmas-backend:latest --format '{{.Id}}'`
- 1차 대응
  - 운영 표준: backend/frontend를 **`:latest` + `:${GITHUB_SHA}` 2태그로 함께 push**
  - 배포 시점에 사용한 `${GITHUB_SHA}`를 서버에 기록(예: `/opt/xmas-event/DEPLOYED_SHA`)

### 2.15 자동 마이그레이션이 장시간/락으로 배포 타임아웃 또는 서비스 지연
- 증상(징후)
  - 배포 작업이 오래 걸리며 SSH 단계 timeout
  - 배포 직후 일부 요청이 느려지거나 DB lock 대기 증가
- 원인
  - 대용량 테이블 ALTER/인덱스 등으로 MySQL lock이 길게 발생
  - 마이그레이션이 피크 타임에 수행됨
- 확인(명령/로그)
  - `docker compose exec -T backend alembic upgrade head` 출력/에러
  - `docker compose exec -T db sh -lc 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -e "SHOW PROCESSLIST"'`
- 1차 대응
  - 장시간/락 유발 마이그레이션은 쪼개서 단계적 적용(운영 피크 회피)
  - CI timeout을 무작정 늘리기보다, 마이그레이션 설계를 먼저 개선

### 2.16 Alembic 다중 head(merge 누락)로 자동 마이그레이션이 실패
- 증상(징후)
  - `alembic upgrade head` 실행 시 `Multiple head revisions are present` 등으로 실패
  - 배포는 진행되었는데 마이그레이션 단계에서 중단/실패
- 원인
  - 여러 기능 브랜치에서 migration이 병렬로 추가되어 head가 2개 이상이 됨
  - merge migration(mergepoint)이 생성되지 않음
- 확인(명령/로그)
  - `docker compose exec -T backend alembic heads`
  - `docker compose exec -T backend alembic history --verbose | head -n 80`
- 1차 대응
  - 운영 배포 전(또는 CI에서) **head가 1개인지**를 게이트로 확인
  - 다중 head면 merge revision 생성 후 재배포(임시로 특정 head만 지정하는 꼼수는 금지)

### 2.17 Admin FE/BE 계약 불일치로 어드민 기능이 대량으로 404/422/500
- 증상(징후)
  - 어드민 페이지는 뜨지만 특정 탭/기능이 전부 실패
  - 네트워크 탭에서 `/admin/api/...`가 404 또는 422로 반복
- 원인
  - backend 라우트 경로/파라미터/스키마가 변경됐는데 frontend가 구 계약을 호출
  - CORS/프록시/베이스 URL 설정 불일치(특히 same-origin 규칙 위반)
- 확인(명령/로그)
  - 브라우저 네트워크 탭(요청 URL/상태코드)
  - `docker compose logs --tail=200 nginx`
  - `docker compose logs --tail=200 backend`
- 1차 대응
  - 배포 직후 “어드민 스모크 체크(3.9)”를 반드시 수행하여 조기 감지
  - 문제가 계약 불일치면 즉시 롤백(3.7) 또는 hotfix 배포(작은 diff 우선)

### 2.18 SCP 기반 배포로 서버에 불필요/구버전 설정 파일이 잔존
- 증상(징후)
  - 로컬/레포 기준과 다른 nginx 동작(리다이렉트/프록시 경로 불일치)
  - 변경한 설정이 반영되지 않은 것처럼 보임
- 원인
  - SCP는 지정된 파일만 복사하며, 서버에 남아있는 구 파일을 자동으로 삭제하지 않음
  - 설정 파일명이 바뀌거나 디렉토리 구조가 바뀐 경우 잔존 파일이 혼선을 유발
- 확인(명령/로그)
  - `ls -al /opt/xmas-event/nginx`
  - `docker compose logs --tail=200 nginx`
- 1차 대응
  - 설정 구조 변경이 있었으면 배포 전에 `/opt/xmas-event/nginx` 정리(삭제/정합성 확인)
  - nginx 재기동 후 `/health`, `/api/health`로 스모크 체크(3.6)

### 2.19 (배포 성공 후) `/health`는 301인데 `https://cc-jm.com`이 `ERR_CONNECTION_CLOSED` (TLS handshake fail)
- 증상(징후)
  - 브라우저: `ERR_CONNECTION_CLOSED` / "연결이 예기치 않게 종료"
  - HTTP(80): `http://cc-jm.com/health` 는 `301 Location: https://...` 까지는 정상
  - HTTPS(443): `curl -vk https://cc-jm.com/health` 가 핸드셰이크 단계에서 종료(응답 헤더/바디 없이 끊김)
- 원인
  - `nginx/nginx.conf`에서 80→https 리다이렉트만 있고 443 SSL server block이 비활성/오구성
  - 인증서 파일 경로/권한/볼륨 마운트 불일치로 TLS 초기화가 실패
  - (드물게) 443 리스닝은 되지만 실제 TLS 처리를 하지 못하는 상태
- 확인(명령/로그)
  - 클라이언트에서:
    - `curl -v http://cc-jm.com/health`
    - `curl -vk https://cc-jm.com/health`
  - 서버에서(필수):
    - `cd /opt/xmas-event; docker compose exec -T nginx nginx -T | sed -n '1,220p'`
    - `cd /opt/xmas-event; docker compose logs --tail=200 nginx`
  - 인증서 존재 확인:
    - `ls -al /etc/letsencrypt/live/cc-jm.com || true`
- 1차 대응
  - nginx 설정에서 **443 SSL server block 활성화** 및 인증서 경로/마운트 정합성 확보
  - 설정 반영 후: `docker compose restart nginx`
  - 단기 우회(권장 아님): 80 리다이렉트를 임시로 끄고 HTTP로만 점검(서비스 오픈 전까지)

### 2.20 (CI 게이트) Admin smoke 체크가 401(AUTH_REQUIRED)을 실패로 처리
- 증상(징후)
  - 배포/헬스는 통과했는데 CI가 Admin smoke 단계에서 `HTTP 401`로 실패
  - 응답 바디에 `{"detail":"AUTH_REQUIRED"}` 또는 유사 JSON이 표시
- 원인
  - `/admin/api/...` 엔드포인트는 운영 정책상 인증이 필요할 수 있으며, 스모크 목적은 "HTML(index.html)로 빠지는 사고"를 잡는 것
- 확인(명령/로그)
  - `curl -i http://127.0.0.1/admin/api/ui-config/streak_reward_rules`
  - 기대: `Content-Type: application/json` + (200 또는 401)
- 1차 대응
  - 스모크 게이트는 `200(JSON)` 또는 `401(JSON, AUTH_REQUIRED)`를 정상으로 허용
  - 대신 `text/html` 응답이면 프록시/라우팅 문제로 실패 처리(즉시 점검)

### 2.19 프론트 정적 자산 캐시로 “배포했는데 화면이 깨짐/구버전 JS 로드”
- 증상(징후)
  - 특정 브라우저에서만 어드민 UI가 깨짐(흰 화면/콘솔 에러)
  - 강력 새로고침/시크릿 모드에서는 정상
- 원인
  - 브라우저/프록시 캐시로 오래된 JS/CSS가 남아 새 API/새 코드와 조합이 틀어짐
  - 대규모 UI 변경 시 더 자주 발생
- 확인(명령/로그)
  - 브라우저 콘솔/네트워크에서 정적 파일 캐시 히트 여부 확인
- 1차 대응
  - 사용자 대응: 강력 새로고침/캐시 삭제 안내(응급)
  - 운영 대응: 정적 자산 캐시 정책(ETag/Cache-Control) 점검 및 버저닝 전략 유지

### 2.20 `docker image prune -f`로 즉시 롤백에 필요한 이미지가 사라짐
- 증상(징후)
  - 장애가 나서 롤백하려는데 이전 이미지가 로컬에 없음
  - 재태깅/재기동이 느려져 복구 시간이 늘어남
- 원인
  - 배포 후 자동 `docker image prune -f`가 "안 쓰는 이미지"를 정리하면서, 방금 전까지 쓰던 이미지가 제거될 수 있음(환경/타이밍에 따라)
- 확인(명령/로그)
  - `docker image ls | grep xmas-`
  - `docker system df`
- 1차 대응
  - 운영 표준: `:${GITHUB_SHA}` 태그를 유지하고, "정상 SHA"를 기록해두면 재-pull로 복구 가능
  - 복구 시간 단축이 중요하면 prune 정책을 완화/지연(문서화 후 절차로 반영)

### 2.21 비가역(rollback 불가) 마이그레이션으로 장애 시 즉시 롤백이 불가능
- 증상(징후)
  - 배포 후 장애 발생 → `alembic downgrade`가 실패하거나(또는 시도 자체가 위험)
  - 스키마/데이터가 이미 변형되어 “이미지 롤백만으로는” 정상 복구가 안 됨
- 원인
  - 데이터 이동/정규화/삭제/타입 변경 등 비가역 변경이 마이그레이션에 포함
  - `downgrade()`가 구현돼 있지 않거나, 구현돼 있어도 운영 데이터에서는 안전하지 않음
- 확인(명령/로그)
  - `docker compose exec -T backend alembic history --verbose | head -n 80`
  - 배포 직후 리비전 기록(예: `/opt/xmas-event/DEPLOYED_SHA`, `alembic current` 출력) 존재 여부
- 1차 대응
  - 운영 배포 전 **DB 덤프/스냅샷을 필수(3.10)**로 수행
  - 비가역 가능성이 있으면 롤백은 “이미지 태그”가 아니라 “DB 복구(덤프/스냅샷)”를 롤백 플랜으로 간주

### 2.22 데이터 변환/백필(backfill) 실패로 일부 유저/기능만 깨지는 논리 장애
- 증상(징후)
  - 전체 API는 살아있지만 특정 유저/조건에서만 500/잘못된 값
  - 어드민/통계 화면이 비정상(집계가 0, 특정 컬럼 null 등)
- 원인
  - 마이그레이션이 스키마 변경 + 데이터 채우기(backfill)를 포함
  - backfill이 일부 row에서 실패하거나, 재실행(idempotent) 안전성이 없어 중간 상태가 남음
- 확인(명령/로그)
  - `docker compose logs --tail=200 backend`
  - 장애가 난 엔드포인트/테이블 기준으로 샘플 row 점검(운영자가 아는 “대표 유저 1~3명”)
- 1차 대응
  - backfill이 포함된 배포는 “스모크 체크(3.6) + 어드민 스모크(3.9)”를 강화하고, 실패 시 즉시 중단/롤백
  - 재시도는 무작정 반복 금지(부분 적용이 더 꼬일 수 있음) → 원인 확인 후 1회만

### 2.23 제약조건(UNIQUE/FK/NOT NULL) 추가로 `alembic upgrade`가 실패
- 증상(징후)
  - `alembic upgrade head`에서 DDL 에러로 중단
  - 예: duplicate key, foreign key constraint fails, cannot be null 등
- 원인
  - 기존 운영 데이터가 새로운 제약조건을 만족하지 않음
  - 대규모 변경에서 스키마 정합성 규칙이 강화되며 자주 발생
- 확인(명령/로그)
  - `docker compose exec -T backend alembic upgrade head` 출력
  - `docker compose exec -T db sh -lc 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -e "SHOW WARNINGS"'` (가능한 경우)
- 1차 대응
  - 운영 배포 전 DB 덤프/스냅샷 확보(3.10) 후, 제약조건 추가는 “데이터 정리/백필”을 선행하도록 설계
  - 즉시 복구가 필요하면 이미지 롤백 + DB 복구를 함께 고려

### 2.24 GHCR 인증 만료/권한 문제로 `docker compose pull`이 실패
- 증상(징후)
  - 배포 단계에서 이미지 pull이 실패하며 `unauthorized`, `denied`, `pull access denied` 등 메시지
  - 특정 서버에서만 재현(예: 새로 세팅한 서버/계정)
- 원인
  - `docker login ghcr.io` 세션 만료 또는 미로그인 상태
  - 토큰 권한(scope) 부족 또는 토큰/계정이 변경됨
- 확인(명령/로그)
  - `docker login ghcr.io`
  - `docker pull ghcr.io/heyjinjung/xmas-backend:latest`
  - `docker compose logs --tail=200 nginx` (배포 후 기동 실패 시)
- 1차 대응
  - 서버에서 `docker logout ghcr.io` → `docker login ghcr.io` 재수행
  - `${GITHUB_SHA}` 태그를 함께 쓰는 운영 표준(2.14)을 유지하고, 필요 시 “정상 SHA”를 pull하여 복구(3.7)

### 2.25 이미지 아키텍처 불일치로 컨테이너가 즉시 종료(`exec format error`)
- 증상(징후)
  - 컨테이너가 바로 종료되거나 restart loop
  - 로그에 `exec format error`, `no matching manifest for linux/arm64` 등
- 원인
  - 서버 아키텍처(amd64/arm64)와 이미지 빌드 아키텍처가 다름
  - 로컬(arm 맥)에서 빌드한 이미지를 그대로 올리거나 멀티아키텍처 빌드가 누락됨
- 확인(명령/로그)
  - `uname -m`
  - `docker image inspect ghcr.io/heyjinjung/xmas-backend:latest --format '{{.Os}}/{{.Architecture}}'`
- 1차 대응
  - CI에서 `linux/amd64`(운영 서버 기준) 또는 멀티아키텍처 이미지로 빌드/푸시하도록 정리
  - 잘못 올라간 이미지는 정상 SHA 이미지로 롤백(3.7)

### 2.26 `.env` 인코딩/개행/누락으로 런타임 설정이 깨짐
- 증상(징후)
  - backend가 DB/Redis에 연결 실패(초기 기동 실패 또는 `/api/health` 500)
  - 환경변수가 비어있는 것처럼 동작(예: DB host/패스워드 미설정)
- 원인
  - `.env`가 UTF-16(BOM) 또는 잘못된 개행(CRLF/혼합)으로 업로드됨
  - `.env` 내용 누락/오타 또는 따옴표/공백 처리로 파싱이 깨짐
- 확인(명령/로그)
  - `ls -al .env`
  - `sed -n '1,40p' .env` (민감정보 출력 주의)
  - `docker compose logs --tail=200 backend`
- 1차 대응
  - `.env`는 UTF-8 + LF 기준으로 관리(가능하면 서버에서 직접 편집보다 CI/SCP로 원본 반영)
  - 변경 후 `docker compose up -d --remove-orphans`로 재기동

### 2.27 Nginx SPA fallback/우선순위 문제로 `/admin/api`가 `index.html`을 반환
- 증상(징후)
  - 어드민 UI에서 API 응답이 JSON이 아닌 HTML로 내려옴(콘솔에 `Unexpected token <`)
  - 특정 컴포넌트에서 `map/slice` 등 배열 가정 로직이 크래시
- 원인
  - `try_files`/SPA 라우팅 fallback이 `/admin/api`보다 먼저 매칭되어 프록시가 무시됨
  - `/admin/api/` location 누락 또는 location 순서 문제
- 확인(명령/로그)
  - `curl -i http://127.0.0.1/admin/api/health`
  - `docker compose logs --tail=200 nginx`
- 1차 대응
  - nginx에서 `/api/`, `/admin/api/` 프록시 location이 SPA fallback보다 우선 적용되도록 보장
  - nginx reload/재기동 후 `/health`, `/api/health` + 어드민 스모크(3.9)로 재확인

### 2.28 WebSocket 업그레이드 누락으로 실시간 기능/연결이 실패
- 증상(징후)
  - 실시간 피드/구독 기능이 연결되지 않거나 즉시 끊김
  - nginx/backend 로그에 upgrade 관련 경고 또는 400/426 계열 응답
- 원인
  - nginx 프록시에서 `Upgrade`/`Connection` 헤더 전달 누락
  - WebSocket 경로가 프록시 대상에서 빠짐
- 확인(명령/로그)
  - `docker compose logs --tail=200 nginx`
  - `docker compose logs --tail=200 backend`
- 1차 대응
  - nginx에서 WebSocket 경로 프록시 및 업그레이드 헤더 전달 설정 점검(3.11)
  - 변경 후 nginx reload/재기동

### 2.29 디스크 부족/파일시스템 문제로 덤프/로그/컨테이너 갱신이 실패
- 증상(징후)
  - DB 덤프가 0바이트로 생성되거나 로그에 `No space left on device`
  - 컨테이너가 기동은 되지만 일부 쓰기 작업에서 실패
- 원인
  - 디스크 여유 부족, 로그/덤프 누적으로 용량 소진
  - 파일시스템이 일시적으로 read-only가 됨(호스트 이슈)
- 확인(명령/로그)
  - `df -h`
  - `docker system df`
  - `docker compose logs --tail=200 db`
- 1차 대응
  - 용량 확보 후 덤프/로그 재시도(무작정 반복 금지: 원인 없이 반복하면 손상/누락만 늘어남)
  - prune는 롤백 이미지까지 지우지 않도록(2.20) 정책적으로 수행

---

## 3. 서버 배포 전 최소 점검 커맨드

> 아래는 “배포 전에 5분 컷으로 확인 가능한 것들”만 모았습니다.

### 3.1 도커/컴포즈
```bash
docker version
docker compose version
# 선택: 스크립트를 그대로 쓰려면
docker-compose --version || true
```

### 3.2 포트 점유
```bash
ss -ltnp | grep -E ":80 |:443 |:8000 |:3000 |:3307 |:6379 " || true
```

### 3.3 컨테이너 상태/로그
```bash
docker compose ps
# 문제 시
docker compose logs --tail=200 nginx
docker compose logs --tail=200 backend
```

### 3.4 헬스 체크(예시)
```bash
curl -i http://127.0.0.1/health
curl -i http://127.0.0.1/api/health
```

### 3.5 (필수) 마이그레이션: Alembic은 항상 자동 실행

> 운영 표준: 배포 파이프라인에서 아래를 "항상" 수행한다.

```bash
# 배포 직후(컨테이너 최신화 후)
docker compose exec -T backend alembic upgrade head

# 적용 결과 확인
docker compose exec -T backend alembic current
```

### 3.6 (필수) 배포 직후 스모크 체크(성공 판정)

```bash
# nginx 정적 헬스(프록시/기동 여부)
curl -i http://127.0.0.1/health

# API 헬스(backend 라우팅/DB 연결 최소 확인)
curl -i http://127.0.0.1/api/health
```

### 3.7 롤백(2태그 병행 전제: :latest + :${GITHUB_SHA})

> 현재 `docker-compose.yml`은 `:latest`를 참조한다. 따라서 롤백은 "정상 SHA 태그"를 pull 한 뒤 `:latest`로 재태깅해서 복구하는 방식이 가장 단순하다.

```bash
# 1) 정상으로 되돌릴 SHA를 정한다(예: <GOOD_SHA>)

# 2) 정상 SHA 이미지 pull
docker pull ghcr.io/heyjinjung/xmas-backend:<GOOD_SHA>
docker pull ghcr.io/heyjinjung/xmas-frontend:<GOOD_SHA>

# 3) compose가 쓰는 :latest로 재태깅
docker tag ghcr.io/heyjinjung/xmas-backend:<GOOD_SHA> ghcr.io/heyjinjung/xmas-backend:latest
docker tag ghcr.io/heyjinjung/xmas-frontend:<GOOD_SHA> ghcr.io/heyjinjung/xmas-frontend:latest

# 4) 재기동(telegram_bot도 backend:latest를 쓰므로 함께 복구됨)
docker compose up -d --remove-orphans
```

### 3.8 (필수) 마이그레이션 변경이 있는 배포의 추가 게이트(5분)

> Alembic migration이 추가/수정된 배포에서는 아래를 "필수"로 수행한다.
> (다중 head는 자동 마이그레이션이 하드 실패로 끝나는 대표 원인)

```bash
# 1) 마이그레이션 head 단일성(자동 마이그레이션 실패 예방)
docker compose exec -T backend alembic heads

# 2) 현재/예정 리비전 확인(운영에서 추적 가능한 형태로 기록 권장)
docker compose exec -T backend alembic current
```

### 3.9 (필수) 어드민 스모크 체크(대규모 변경 시)

> 목적: “배포 성공”이 아니라 “관리자 운영이 가능한 상태”를 즉시 판정한다.

- 최소 시나리오(5~10분)
  - 어드민 로그인 성공
  - 대시보드 1페이지 로드(요약 카드/리스트 중 1개라도 데이터 호출 성공)
  - 운영/로그 성격 페이지 1개 로드(예: Ops/Logs)
  - 경제/미션 성격 페이지 1개 로드(예: Vault/Mission)
- 실패 판정 기준
  - 특정 페이지 진입 시 404/422/500이 지속적으로 반복
  - `/admin/api/` 요청이 전부 실패(nginx 프록시/라우팅/베이스URL 문제 포함)
- 확인(명령/로그)
  - `docker compose logs --tail=200 nginx`
  - `docker compose logs --tail=200 backend`

### 3.10 (필수) 운영 배포 전 DB 덤프/스냅샷

> 운영 표준: “대규모 변경 + 자동 Alembic” 조합에서는 DB 복구 수단이 없으면 롤백이 사실상 불가능해진다.
> 따라서 배포 직전 반드시 DB 덤프 또는 스냅샷을 남긴다.

- 최소 요구사항
  - 덤프/스냅샷 파일명에 배포 식별자 포함: 날짜 + `${GITHUB_SHA}` 또는 릴리즈명
  - 복구 리허설까지는 아니어도, 최소한 덤프 파일이 생성됐는지/크기가 0이 아닌지 확인

```bash
# (권장) 서버 호스트(/opt/xmas-event) 기준으로 "호스트 파일"로 남긴다.
# - 리다이렉션(>)은 컨테이너가 아니라 "호스트"에서 수행되어야 백업 파일을 쉽게 보관/이관 가능

cd /opt/xmas-event
mkdir -p backups/db

export DEPLOY_SHA="${GITHUB_SHA:-manual_$(date +%Y%m%d_%H%M%S)}"
export DUMP_PATH="backups/db/xmas_event_${DEPLOY_SHA}_$(date +%Y%m%d_%H%M%S).sql.gz"

# 1) 덤프 생성(압축 포함)
docker compose exec -T db sh -lc 'mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --single-transaction --routines --triggers "$MYSQL_DATABASE"' \
  | gzip -c > "$DUMP_PATH"

# 2) 덤프 파일 확인(0바이트/권한/용량)
ls -lh "$DUMP_PATH"

# 3) 무결성 체크(옵션이지만 강력 권장)
sha256sum "$DUMP_PATH" | tee -a backups/db/SHA256SUMS.txt
```

> 주의
> - 덤프 파일에는 민감 데이터가 포함될 수 있으므로 접근 권한/보관 정책을 운영 기준으로 제한한다.
> - 디스크 여유(`df -h`)가 부족하면 덤프가 실패하거나 0바이트 파일이 생길 수 있다.
> - `gzip` 또는 `sha256sum`이 없으면 아래 중 하나로 대체한다.
>   - `gzip` 없음: 압축 없이 `.sql`로 저장(단, 용량/디스크 여유 확인 필수)
>   - `sha256sum` 없음: 무결성 체크는 생략 가능하나, 최소한 `ls -lh`로 0바이트 여부는 반드시 확인

#### (옵션) 복구 리허설 최소 절차(시간이 없을 때)

```bash
# 1) 덤프가 실제 gzip 파일인지 확인
gzip -t "$DUMP_PATH"

# 2) 덤프 헤더 일부만 확인(전체 출력 금지)
zcat "$DUMP_PATH" | head -n 20
```

### 3.11 (권장) 프록시/자원/이미지 사전 게이트(5분)

```bash
# 1) nginx 실제 적용 설정 확인(프록시/try_files/upgrade 헤더)
docker compose exec -T nginx nginx -T

# 2) 디스크 여유(덤프/로그 0바이트 예방)
df -h

# 3) 서버/이미지 아키텍처 일치(Exec format error 예방)
uname -m
docker image inspect ghcr.io/heyjinjung/xmas-backend:latest --format '{{.Os}}/{{.Architecture}}'
docker image inspect ghcr.io/heyjinjung/xmas-frontend:latest --format '{{.Os}}/{{.Architecture}}'
```

---

## 4. 로그 위치/관측 포인트

- nginx: `docker compose logs nginx` 또는 호스트 `./logs/nginx/*`
- backend: `docker compose logs backend` 또는 컨테이너 `/app/logs`
- db: `docker compose logs db`
- redis: `docker compose logs redis`

---

## 5. 이 문서 기반 작업 가이드(Runbook)

> 목표: “배포가 돌아간다”가 아니라, **장애를 피하고(Preflight) 문제가 나면 즉시 복구(롤백/DB복구)**하는 운영 플로우를 고정한다.

### 5.1 배포 전(머지/릴리즈 전) 체크

- 대규모 변경(200+ files)이면 아래를 기본으로 수행
  - DB 변경 여부: Alembic migration 추가/수정 여부 확인
  - 계약 변경 여부: admin FE/BE의 엔드포인트/스키마 변경 여부 확인
  - 운영 영향: 락/대용량 변환(backfill) 가능성(2.15/2.22/2.23)

### 5.2 배포 직전(운영 서버에서) 필수 순서

1) 시스템 상태 점검(3.1~3.3)
2) 헬스 체크로 현재 서비스 정상 확인(3.4)
3) **DB 덤프/스냅샷 필수(3.10)**

### 5.3 배포 수행(현재 GitHub CI 기준)

- 트리거: `main` 또는 `temp-merge2`에 push
- 배포 파이프라인 기본 동작
  - 이미지 push(권장: `:latest` + `:${GITHUB_SHA}` 병행)
  - 서버에 compose/nginx/init.sql 반영(SCP)
  - 서버에서 `docker compose pull` → `docker compose up -d` 수행
  - 운영 정책: **Alebmic은 항상 자동 실행(3.5)**

### 5.4 배포 직후 성공 판정(필수)

1) 스모크 체크(3.6): `/health`, `/api/health`가 200
2) 대규모 변경이면 어드민 스모크 체크(3.9)
3) 마이그레이션 검증(3.5/3.8): `alembic current`, 필요 시 `alembic heads` 단일성 확인

### 5.5 장애 발생 시 대응(결정 트리)

- A) 배포 직후 즉시 500(스키마 관련 로그) → 2.13/2.16/2.23 우선 의심
  - 1차: `alembic upgrade head` 재실행(1회)
  - 재시도 금지 조건(바로 롤백/DB 복구로 전환)
    - `Multiple head revisions are present`(다중 head)
    - duplicate key / FK constraint / NOT NULL 등 제약조건 위반(데이터 정리가 선행돼야 함)
    - downgrade 불가/비가역 마이그레이션(2.21)이 포함된 것으로 판단되는 경우
  - 여전히 실패: “추가 배포” 금지 → 롤백 또는 DB 복구로 전환
- B) 어드민만 대량 실패(404/422/500) → 2.17 우선 의심
  - 1차: nginx/backend 로그로 경로/스키마/프록시 문제 분류
  - 계약 불일치면: hotfix(작은 diff) 또는 롤백(3.7)
- C) 비가역/데이터 변환이 꼬임(2.21/2.22) → 이미지 롤백만으로 부족할 수 있음
  - 1차: 즉시 DB 덤프/스냅샷 기반 복구 플랜을 가동(3.10에서 만든 덤프가 핵심)

### 5.6 배포 기록(필수)

- 최소 기록 항목(어딘가에 남기기)
  - 배포 시각
  - `${GITHUB_SHA}`
  - DB 덤프 파일명 + sha256
  - 배포 직후 스모크 체크 결과(/health, /api/health)

---

## 6. 변경 이력

- v1.6 (2026-01-13, 시스템 설계팀): 배포 예상 오류 2.24~(GHCR pull/auth, arch mismatch, .env, SPA fallback, WebSocket, 디스크) 추가 및 3.11 사전 게이트(nginx -T/df -h/arch) 보강.
- v1.5 (2026-01-13, 시스템 설계팀): 현행 CI 태그(`:latest`)와 운영 표준(2태그 병행) 불일치 주의 추가, migration head 게이트(3.8) 필수화, 덤프 유틸 의존 대체 루트/재시도 금지 조건 보강.
- v1.4 (2026-01-13, 시스템 설계팀): DB 덤프를 서버 호스트에 남기는 실무 절차(압축/무결성) 보강 및 Runbook(작업 가이드) 섹션 추가.
- v1.3 (2026-01-13, 시스템 설계팀): DB 데이터 마이그레이션/비가역(rollback 불가) 시나리오 추가 및 운영 배포 전 DB 덤프/스냅샷 필수화.
- v1.2 (2026-01-13, 시스템 설계팀): 대규모 변경(200+ files) 배포 리스크 프로파일 및 추가 시나리오/게이트/어드민 스모크 체크 확장.
- v1.1 (2026-01-13, 시스템 설계팀): GitHub CI 배포 기준(2태그 병행), Alembic 자동 실행(항상), 배포 직후 스모크 체크/롤백 절차 추가.
- v1.0 (2026-01-13, 시스템 설계팀): 최초 작성. 현재 레포 구성 기준 배포 예상 오류/사전 점검 항목 정리.
